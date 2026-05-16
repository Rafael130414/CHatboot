import prisma from "../libs/prisma.js";
import { getSession } from "./WhatsAppService.js";
import { logger } from "../utils/logger.js";
import redis from "../libs/redis.js";
import { AiService } from "./AiService.js";
import { IxcService } from "./IxcService.js";

// ── Tipagem do Contexto de Conversa ──────────────────
interface FlowContext {
    phone: string;
    name: string;
    ticketId: number;
    variables: Record<string, string>;
}

// ── Substitui variáveis em uma string ─────────────────
const interpolate = (text: string, ctx: FlowContext): string => {
    return text
        .replace(/\{\{nome\}\}/gi, ctx.name || "Cliente")
        .replace(/\{\{telefone\}\}/gi, ctx.phone || "")
        .replace(/\{\{ticket_id\}\}/gi, String(ctx.ticketId || ""))
        .replace(/\{\{(\w+)\}\}/g, (_, key) => ctx.variables[key] || "");
};

// ── Carrega contexto do Redis ─────────────────────────
const loadContext = async (ticketId: number): Promise<FlowContext> => {
    const raw = await redis.get(`flowCtx:${ticketId}`);
    if (raw) return JSON.parse(raw);
    return { phone: "", name: "", ticketId, variables: {} };
};

// ── Salva contexto no Redis (TTL: 24h) ───────────────
const saveContext = async (ticketId: number, ctx: FlowContext) => {
    await redis.set(`flowCtx:${ticketId}`, JSON.stringify(ctx), "EX", 86400);
};

// ── Chamada HTTP externa ──────────────────────────────
const httpRequest = async (url: string, method: string, headers: Record<string, string>, body?: string) => {
    try {
        const opts: RequestInit = { method: method || "GET", headers };
        if (body && method !== "GET") opts.body = body;
        const resp = await fetch(url, opts);
        return await resp.text();
    } catch (e) {
        logger.error("[Flow] HTTP Request failed:", e);
        return null;
    }
};

// ── Engine Principal ──────────────────────────────────
export const processFlow = async (ticketId: number, companyId: number, whatsappId: number, body: string, remoteJid: string) => {
    try {
        const activeFlows = await prisma.flow.findMany({
            where: { active: true, companyId, OR: [{ whatsappId }, { whatsappId: null }] }
        });

        if (activeFlows.length === 0) return false;
        const activeFlow = activeFlows.find(f => f.whatsappId === whatsappId) || activeFlows[0];

        const nodes = JSON.parse(activeFlow.nodes || "[]");
        const edges = JSON.parse(activeFlow.edges || "[]");
        if (nodes.length === 0) return false;

        const socket = getSession(whatsappId);
        if (!socket) return false;

        const stateKey = `flowState:${ticketId}`;
        const currentNodeId = await redis.get(stateKey) || "start";

        // Carrega dados do contato para o contexto
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { contact: true } });
        const ctx = await loadContext(ticketId);
        if (ticket?.contact) {
            ctx.phone = ticket.contact.number || remoteJid.split("@")[0];
            ctx.name = ticket.contact.name || "Cliente";
            ctx.ticketId = ticketId;
        }

        // Executa os nós recursivamente
        const executeNode = async (nodeId: string, inputMsg?: string): Promise<string | null> => {
            logger.info(`[Flow] Executing node: ${nodeId}`);

            // Incrementar estatística de uso do nó
            prisma.flowNodeInteraction.upsert({
                where: { flowId_nodeId: { flowId: activeFlow.id, nodeId } },
                update: { count: { increment: 1 } },
                create: { flowId: activeFlow.id, nodeId, count: 1 }
            }).catch(e => logger.error(`[FlowStats] Error: ${e}`));

            const node = nodes.find((n: any) => n.id === nodeId);

            if (!node) return null;

            // ── MENSAJE NODE ─────────────────────────────────
            if (node.type === "messageNode") {
                const text = interpolate(node.data.message || "", ctx);
                await socket.sendPresenceUpdate("composing", remoteJid);
                await new Promise(r => setTimeout(r, Math.min(text.length * 25, 2000)));
                await socket.sendMessage(remoteJid, { text });
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── IMAGE NODE ───────────────────────────────────
            if (node.type === "imageNode") {
                const url = interpolate(node.data.url || "", ctx);
                const caption = interpolate(node.data.caption || "", ctx);
                if (url) {
                    await socket.sendMessage(remoteJid, { image: { url }, caption });
                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── AUDIO NODE ───────────────────────────────────
            if (node.type === "audioNode") {
                const url = interpolate(node.data.url || "", ctx);
                if (url) {
                    await socket.sendMessage(remoteJid, { audio: { url }, mimetype: "audio/mp4", ptt: node.data.ptt ?? true });
                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── DOCUMENT NODE ────────────────────────────────
            if (node.type === "documentNode") {
                const url = interpolate(node.data.url || "", ctx);
                const fileName = interpolate(node.data.fileName || "arquivo", ctx);
                if (url) {
                    await socket.sendMessage(remoteJid, { document: { url }, fileName, mimetype: node.data.mimeType || "application/pdf" });
                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── MENU NODE ────────────────────────────────────
            if (node.type === "menuNode") {
                const opts: string[] = node.data.options || [];

                if (inputMsg) {
                    const msgTrim = inputMsg.trim();

                    // 1️⃣ Tenta seleção por NÚMERO (ex: "1", "2", "3")
                    const byNumber = Number(msgTrim) - 1;
                    if (!isNaN(byNumber) && byNumber >= 0 && byNumber < opts.length) {
                        const edge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === `option-${byNumber}`);
                        if (edge) {
                            await redis.del(`menuAttempts:${ticketId}:${nodeId}`);
                            logger.info(`[Flow] MenuNode: selecionou opção ${byNumber + 1} por número`);
                            return await executeNode(edge.target);
                        }
                    }

                    // 2️⃣ Tenta seleção por TEXTO (correspondência parcial, case-insensitive)
                    const msgLower = msgTrim.toLowerCase();
                    const textMatchIndex = opts.findIndex((opt: string) =>
                        opt.toLowerCase().includes(msgLower) || msgLower.includes(opt.toLowerCase())
                    );
                    if (textMatchIndex !== -1) {
                        const edge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === `option-${textMatchIndex}`);
                        if (edge) {
                            await redis.del(`menuAttempts:${ticketId}:${nodeId}`);
                            logger.info(`[Flow] MenuNode: selecionou opção ${textMatchIndex + 1} por texto ("${msgTrim}")`);
                            return await executeNode(edge.target);
                        }
                    }

                    // 3️⃣ Entrada inválida — controla quantas vezes já errou
                    const attemptsKey = `menuAttempts:${ticketId}:${nodeId}`;
                    const attemptsRaw = await redis.get(attemptsKey);
                    const attempts = attemptsRaw ? parseInt(attemptsRaw) : 0;
                    await redis.set(attemptsKey, String(attempts + 1), "EX", 3600);

                    if ((attempts + 1) % 3 === 0) {
                        // A cada 3 tentativas: reexibe o menu completo
                        let text = `*${interpolate(node.data.message || "Escolha uma opção:", ctx)}*`;
                        opts.forEach((opt: string, i: number) => { text += `\n${i + 1}. ${opt}`; });
                        await socket.sendMessage(remoteJid, { text });
                    } else {
                        // Entre as tentativas: vertical e com bold
                        let text = `*Por favor, escolha uma opção:*`;
                        opts.forEach((opt: string, i: number) => { text += `\n${i + 1}. ${opt}`; });
                        await socket.sendMessage(remoteJid, { text });
                    }
                    return nodeId; // mantém o estado no menu
                }

                // Primeira vez — exibe o menu completo
                let text = `*${interpolate(node.data.message || "Escolha uma opção:", ctx)}*`;
                opts.forEach((opt: string, i: number) => { text += `\n${i + 1}. ${opt}`; });
                await socket.sendMessage(remoteJid, { text });
                return nodeId;
            }

            // ── AUDIO NODE ────────────────────────────────────
            if (node.type === "audioNode") {
                const audioUrl = interpolate(node.data.url || "", ctx);
                if (audioUrl) {
                    logger.info(`[Flow] AudioNode: preparing ${audioUrl}`);
                    await socket.sendPresenceUpdate("recording", remoteJid);

                    try {
                        let audioPayload: any = { url: audioUrl };

                        // Se o áudio for local (nossa própria VPS), enviamos o arquivo direto para evitar erros de download do WhatsApp
                        if (audioUrl.includes('/public/')) {
                            const fileName = audioUrl.split('/public/').pop();
                            const fs = await import('fs');
                            const path = await import('path');
                            const localPath = path.resolve("public", fileName || "");

                            if (fs.existsSync(localPath)) {
                                logger.info(`[Flow] AudioNode: sending local file ${localPath}`);
                                audioPayload = fs.readFileSync(localPath);
                            }
                        }

                        await socket.sendMessage(remoteJid, {
                            audio: audioPayload,
                            mimetype: 'audio/ogg; codecs=opus',
                            ptt: true
                        });
                    } catch (err) {
                        logger.error(`[Flow] Error sending audio: ${err}`);
                    }

                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── DELAY NODE ───────────────────────────────────

            if (node.type === "delayNode") {
                const ms = Math.min(node.data.delay || 1000, 30000); // max 30s
                logger.info(`[Flow] DelayNode: waiting ${ms}ms`);
                await new Promise(r => setTimeout(r, ms));
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── CONDITION NODE (IF) ──────────────────────────
            if (node.type === "conditionNode") {
                const variable = node.data.variable || "msg";
                const operator = node.data.operator || "contém";
                const value = interpolate(node.data.value || "", ctx).toLowerCase();
                let inputValue = "";
                if (variable === "msg") inputValue = (body || "").toLowerCase();
                else if (variable === "nome") inputValue = ctx.name.toLowerCase();
                else inputValue = (ctx.variables[variable] || "").toLowerCase();

                let result = false;
                if (operator === "contém") result = inputValue.includes(value);
                else if (operator === "igual") result = inputValue === value;
                else if (operator === "começa com") result = inputValue.startsWith(value);
                else if (operator === "termina com") result = inputValue.endsWith(value);
                else if (operator === "maior que") result = Number(inputValue) > Number(value);
                else if (operator === "menor que") result = Number(inputValue) < Number(value);

                logger.info(`[Flow] ConditionNode: "${inputValue}" ${operator} "${value}" -> ${result}`);
                const edge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === (result ? "true" : "false"));
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── SWITCH / ROUTER NODE ────────────────────────
            if (node.type === "switchNode") {
                const rules = node.data.rules || [];
                const msgLower = (body || "").toLowerCase();
                let matchedHandle = "default";

                for (let i = 0; i < rules.length; i++) {
                    const rule = rules[i];
                    const val = (rule.value || "").toLowerCase();
                    const op = rule.operator || "contém";
                    let match = false;

                    if (op === "contém") match = msgLower.includes(val);
                    else if (op === "igual") match = msgLower === val;
                    else if (op === "começa com") match = msgLower.startsWith(val);
                    else if (op === "termina com") match = msgLower.endsWith(val);

                    if (match) {
                        matchedHandle = `rule-${i}`;
                        break;
                    }
                }

                logger.info(`[Flow] SwitchNode: matched "${matchedHandle}"`);
                const edge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === matchedHandle);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── LOOP / REPEAT NODE ──────────────────────────
            if (node.type === "loopNode") {
                const maxLoops = node.data.maxLoops || 3;
                const loopKey = `count:${nodeId}`;
                const currentCount = ctx.variables[loopKey] ? parseInt(ctx.variables[loopKey]) : 0;

                let nextHandle = "loop";
                if (currentCount >= maxLoops) {
                    nextHandle = "exit";
                    delete ctx.variables[loopKey]; // reseta para o futuro
                } else {
                    ctx.variables[loopKey] = String(currentCount + 1);
                }

                // Salva o novo estado das variáveis
                await redis.set(`flowCtx:${ticketId}`, JSON.stringify(ctx), "EX", 86400);

                logger.info(`[Flow] LoopNode: count ${currentCount + 1}/${maxLoops}, path ${nextHandle}`);
                const edge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === nextHandle);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── SET VARIABLE NODE ────────────────────────────
            if (node.type === "setVariableNode") {
                const varName = node.data.varName || "";
                const varValue = interpolate(node.data.varValue || "", ctx);
                if (varName) {
                    ctx.variables[varName] = varValue;
                    await saveContext(ticketId, ctx);
                    logger.info(`[Flow] SetVariable: ${varName} = ${varValue}`);
                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── HTTP REQUEST NODE ────────────────────────────
            if (node.type === "httpNode") {
                const url = interpolate(node.data.url || "", ctx);
                const method = (node.data.method || "GET").toUpperCase();
                const headersRaw = node.data.headers || "{}";
                const bodyRaw = node.data.body ? interpolate(node.data.body, ctx) : undefined;
                let parsedHeaders: Record<string, string> = {};
                try { parsedHeaders = JSON.parse(headersRaw); } catch { }

                logger.info(`[Flow] HTTPRequest: ${method} ${url}`);
                const response = await httpRequest(url, method, parsedHeaders, bodyRaw);

                // Salva resposta na variável se configurado
                if (response && node.data.saveToVar) {
                    let finalValue = response;

                    // Supone que se houver jsonPath, a resposta é JSON
                    if (node.data.jsonPath) {
                        try {
                            const parsed = JSON.parse(response);
                            // Simpe path extractor (ex: data.id)
                            finalValue = node.data.jsonPath.split('.').reduce((o: any, i: string) => o?.[i], parsed);
                            if (typeof finalValue === 'object') finalValue = JSON.stringify(finalValue);
                        } catch (e) {
                            logger.error("[Flow] Failed to parse JSON response for path mapping");
                        }
                    }

                    ctx.variables[node.data.saveToVar] = String(finalValue).substring(0, 5000);
                    await saveContext(ticketId, ctx);
                }


                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── AI NODE ─────────────────────────────────────
            if (node.type === "aiNode") {
                logger.info("[Flow] AINode: processing with IA");
                await socket.sendPresenceUpdate("composing", remoteJid);

                const systemPrompt = interpolate(node.data.prompt || "Você é um assistente prestativo.", ctx);

                const aiResp = await AiService.getResponse(
                    companyId,
                    ticketId,
                    body,
                    systemPrompt
                );

                await socket.sendMessage(remoteJid, { text: aiResp });

                if (node.data.saveToVar) {
                    ctx.variables[node.data.saveToVar || "resposta_ia"] = aiResp;
                    await saveContext(ticketId, ctx);
                }

                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── TRANSFER NODE ────────────────────────────────
            if (node.type === "transferNode") {
                const depId = node.data.departmentId;
                if (depId) {
                    await prisma.ticket.update({ where: { id: ticketId }, data: { departmentId: depId } });
                    const transferMsg = interpolate(
                        node.data.message || `Transferindo para: ${node.data.departmentName}...`,
                        ctx
                    );
                    await socket.sendMessage(remoteJid, { text: transferMsg });
                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── TAG NODE ─────────────────────────────────────
            if (node.type === "tagNode") {
                const tagName = interpolate(node.data.tagName || "", ctx);
                if (tagName) {
                    const tag = await prisma.tag.findFirst({ where: { name: tagName, companyId } });
                    if (tag) {
                        const currentTicket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { tags: true } });
                        const existingTagIds = currentTicket?.tags.map((t: any) => t.id) || [];
                        if (!existingTagIds.includes(tag.id)) {
                            await prisma.ticket.update({
                                where: { id: ticketId },
                                data: { tags: { connect: [{ id: tag.id }] } }
                            });
                        }
                    }
                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── IXC BOLETO NODE ──────────────────────────────
            if (node.type === "ixcBoletoNode") {
                const ixcStateKey = `ixcState:${ticketId}`;
                const waitingChoice = await redis.get(ixcStateKey);

                if (waitingChoice) {
                    const loginsRaw = await redis.get(`ixcLogins:${ticketId}`);
                    const logins = loginsRaw ? JSON.parse(loginsRaw) : [];
                    const choice = parseInt(body.trim()) - 1;

                    if (!isNaN(choice) && logins[choice]) {
                        const selected = logins[choice];
                        const result = await IxcService.getBoleto(companyId, "", selected.id_contrato);

                        if (result.success && result.boleto) {
                            const { vencimento, link, linhaDigitavel, valor, id } = result.boleto;
                            const dataFmt = vencimento.split("-").reverse().join("/");
                            const hasLinha = linhaDigitavel && linhaDigitavel.length > 10;
                            const msg = interpolate(
                                node.data.successMessage ||
                                `💳 *Seu Boleto em Aberto*

💰 *Valor:* R$ ${parseFloat(valor).toFixed(2).replace(".", ",")}
📅 *Vencimento:* ${dataFmt}${hasLinha ? `

🔢 *Copie o código abaixo e pague em qualquer banco:*
${linhaDigitavel}` : ""}

🗂️ O PDF do boleto foi enviado abaixo ↓`,
                                { ...ctx, variables: { ...ctx.variables, link_boleto: link, linha_boleto: linhaDigitavel } }
                            );
                            await socket.sendMessage(remoteJid, { text: msg });
                            // Enviar PDF do boleto
                            try {
                                const pdfBuffer = await IxcService.getBoletoPDF(companyId, id);
                                if (pdfBuffer) {
                                    await socket.sendMessage(remoteJid, {
                                        document: pdfBuffer,
                                        fileName: `boleto_venc_${vencimento}.pdf`,
                                        mimetype: "application/pdf"
                                    });
                                }
                            } catch (pdfErr) {
                                console.error("[IXC PDF SEND]", pdfErr);
                            }
                            await redis.del(ixcStateKey);
                            await redis.del(`ixcLogins:${ticketId}`);
                        } else {
                            await socket.sendMessage(remoteJid, { text: result.message || "Erro ao buscar boleto." });
                        }
                    } else {
                        await socket.sendMessage(remoteJid, { text: "⚠️ Opção inválida. Por favor, responda apenas com o *número* correspondente ao seu endereço." });
                        return nodeId;
                    }
                } else {
                    const cpfVar = node.data.cpfVariable || "cpf";
                    const cpfValue = ctx.variables[cpfVar] || body;

                    if (cpfValue && cpfValue.length >= 11) {
                        const logins = await IxcService.listLogins(companyId, cpfValue);

                        if (logins && logins.length > 1) {
                            let msg = "🔍 Identificamos múltiplos acessos em seu CPF.\nQual deles você deseja consultar?\n";
                            logins.forEach((l: any, i: number) => {
                                msg += `\n*${i + 1}* - ${l.endereco} (${l.usuario})`;
                            });
                            await socket.sendMessage(remoteJid, { text: msg });

                            await redis.set(ixcStateKey, "waiting", "EX", 600);
                            await redis.set(`ixcLogins:${ticketId}`, JSON.stringify(logins), "EX", 600);
                            return nodeId;
                        } else if (logins && logins.length === 1) {
                            const result = await IxcService.getBoleto(companyId, "", logins[0].id_contrato);
                            if (result.success && result.boleto) {
                                const { vencimento, link, linhaDigitavel, valor, id } = result.boleto;
                                const dataFmt = vencimento.split("-").reverse().join("/");
                                const hasLinha = linhaDigitavel && linhaDigitavel.length > 10;
                                const msg = interpolate(
                                    node.data.successMessage ||
                                    `💳 *Seu Boleto em Aberto*

💰 *Valor:* R$ ${parseFloat(valor).toFixed(2).replace(".", ",")}
📅 *Vencimento:* ${dataFmt}${hasLinha ? `

🔢 *Copie o código abaixo e pague em qualquer banco:*
${linhaDigitavel}` : ""}

🗂️ O PDF do boleto foi enviado abaixo ↓`,
                                    { ...ctx, variables: { ...ctx.variables, link_boleto: link, linha_boleto: linhaDigitavel } }
                                );
                                await socket.sendMessage(remoteJid, { text: msg });
                                // Enviar PDF do boleto
                                try {
                                    const pdfBuffer = await IxcService.getBoletoPDF(companyId, id);
                                    if (pdfBuffer) {
                                        await socket.sendMessage(remoteJid, {
                                            document: pdfBuffer,
                                            fileName: `boleto_venc_${vencimento}.pdf`,
                                            mimetype: "application/pdf"
                                        });
                                    }
                                } catch (pdfErr) {
                                    console.error("[IXC PDF SEND]", pdfErr);
                                }
                            } else {
                                await socket.sendMessage(remoteJid, { text: result.message || "Não encontramos boletos em aberto." });
                            }
                        } else {
                            // Fallback caso não ache logins rad, tenta pelo CPF direto no cliente
                            const result = await IxcService.getBoleto(companyId, cpfValue);
                            if (result.success && result.boleto) {
                                const { vencimento, link, linhaDigitavel, valor, id } = result.boleto;
                                const dataFmt = vencimento.split("-").reverse().join("/");
                                const hasLinha = linhaDigitavel && linhaDigitavel.length > 10;
                                const msg = interpolate(
                                    node.data.successMessage ||
                                    `💳 *Seu Boleto em Aberto*

💰 *Valor:* R$ ${parseFloat(valor).toFixed(2).replace(".", ",")}
📅 *Vencimento:* ${dataFmt}${hasLinha ? `

🔢 *Copie o código abaixo e pague em qualquer banco:*
${linhaDigitavel}` : ""}

🗂️ O PDF do boleto foi enviado abaixo ↓`,
                                    ctx
                                );
                                await socket.sendMessage(remoteJid, { text: msg });
                                // Enviar PDF do boleto
                                try {
                                    const pdfBuffer = await IxcService.getBoletoPDF(companyId, id);
                                    if (pdfBuffer) {
                                        await socket.sendMessage(remoteJid, {
                                            document: pdfBuffer,
                                            fileName: `boleto_venc_${vencimento}.pdf`,
                                            mimetype: "application/pdf"
                                        });
                                    }
                                } catch (pdfErr) {
                                    console.error("[IXC PDF SEND]", pdfErr);
                                }
                            } else {
                                await socket.sendMessage(remoteJid, { text: "❌ Não conseguimos localizar seu cadastro ou boletos em aberto." });
                            }
                        }
                    } else {
                        await socket.sendMessage(remoteJid, { text: "⚠️ Por favor, informe um CPF válido para consulta." });
                    }
                }

                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── END NODE ─────────────────────────────────────
            if (node.type === "endNode") {
                await prisma.ticket.update({ where: { id: ticketId }, data: { status: "closed" } });
                await redis.del(`flowCtx:${ticketId}`);
                return null;
            }

            // Nó desconhecido — continua pelo edge
            const edge = edges.find((e: any) => e.source === nodeId);
            if (edge) return await executeNode(edge.target);
            return null;
        };

        // ── Resolve o nó inicial ──────────────────────────
        let targetNode = "start";
        let isFirstMessage = false;

        if (currentNodeId === "start") {
            const startEdge = edges.find((e: any) => e.source === "start");
            if (!startEdge) return false;
            targetNode = startEdge.target;
            isFirstMessage = true;
        } else {
            targetNode = currentNodeId;
        }

        const finalNodeId = await executeNode(targetNode, isFirstMessage ? undefined : body);

        if (finalNodeId) {
            await redis.set(stateKey, finalNodeId, "EX", 86400);
        } else {
            await redis.del(stateKey);
        }

        return true;
    } catch (e) {
        logger.error("[Flow] Erro ao processar:", e);
        return false;
    }
};
