import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../libs/prisma.js";
import redis from "../libs/redis.js";
import { logger } from "../utils/logger.js";

interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export class AiService {
    private static async getConfig(companyId: number) {
        return await prisma.companyAIConfig.findUnique({
            where: { companyId }
        });
    }

    private static async getHistory(ticketId: number): Promise<ChatMessage[]> {
        const historyRaw = await redis.get(`ai_history:${ticketId}`);
        if (historyRaw) {
            return JSON.parse(historyRaw);
        }
        return [];
    }

    private static async saveHistory(ticketId: number, history: ChatMessage[]) {
        // Mantém apenas as últimas 15 mensagens para não estourar o limite de contexto
        const limitedHistory = history.slice(-15);
        await redis.set(`ai_history:${ticketId}`, JSON.stringify(limitedHistory), "EX", 3600 * 24); // 24h
    }

    public static async getResponse(
        companyId: number,
        ticketId: number,
        userMessage: string,
        systemPrompt: string = "Você é um assistente prestativo."
    ): Promise<string> {
        try {
            const config = await this.getConfig(companyId);

            if (!config || !config.active) {
                return "Configuração de IA não encontrada ou inativa para esta empresa.";
            }

            const history = await this.getHistory(ticketId);
            const messages: ChatMessage[] = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: userMessage }
            ];

            let aiResponse = "";

            if (config.provider === "openai" || config.provider === "groq") {
                const openai = new OpenAI({
                    apiKey: config.apiKey,
                    baseURL: config.url || undefined // Permite usar Groq ou OpenRouter
                });

                const completion = await openai.chat.completions.create({
                    model: config.model || "gpt-3.5-turbo",
                    messages: messages as any,
                    temperature: 0.7,
                });

                aiResponse = completion.choices[0]?.message?.content || "";
            } else if (config.provider === "gemini") {
                const genAI = new GoogleGenerativeAI(config.apiKey);
                const model = genAI.getGenerativeModel({ model: config.model || "gemini-pro" });

                // Gemini precisa de um formato diferente
                const chat = model.startChat({
                    history: history.map(h => ({
                        role: h.role === "user" ? "user" : "model",
                        parts: [{ text: h.content }],
                    })),
                });

                const result = await chat.sendMessage(userMessage);
                const response = await result.response;
                aiResponse = response.text();
            }

            // Atualiza histórico
            history.push({ role: "user", content: userMessage });
            history.push({ role: "assistant", content: aiResponse });
            await this.saveHistory(ticketId, history);

            return aiResponse;
        } catch (error: any) {
            logger.error(`[AiService] Error: ${error.message}`);
            return "Desculpe, ocorreu um erro ao processar sua solicitação com a IA.";
        }
    }
}
