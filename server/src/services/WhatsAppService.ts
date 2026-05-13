import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    ConnectionState,
    downloadMediaMessage
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import prisma from "../libs/prisma.js";
import { getIO } from "../libs/socket.js";
import { logger } from "../utils/logger.js";
import { processFlow } from "./FlowEngine.js";
import path from "path";
import fs from "fs";

// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Verifica se o horário atual está dentro do horário de atendimento da empresa.
 * Força o uso do fuso horário de Brasília (UTC-3).
 */
const isWithinBusinessHours = async (companyId: number): Promise<boolean> => {
    // Ajuste para Horário de Brasília (UTC-3)
    const nowUtc = new Date();
    const nowBr = new Date(nowUtc.getTime() - (3 * 60 * 60 * 1000));

    const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const todayName = dayNames[nowBr.getUTCDay()];

    console.log(`[BusinessHours] Checking for ${todayName} at ${nowBr.getUTCHours()}:${nowBr.getUTCMinutes()} (BR Time)`);

    const schedule = await prisma.schedule.findFirst({
        where: { companyId, weekday: todayName, active: true }
    });

    if (!schedule) {
        console.log(`[BusinessHours] No active schedule found for ${todayName}`);
        return false;
    }

    const [startH, startM] = schedule.start.split(":").map(Number);
    const [endH, endM] = schedule.end.split(":").map(Number);

    const currentMinutes = nowBr.getUTCHours() * 60 + nowBr.getUTCMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const result = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    console.log(`[BusinessHours] Result: ${result} (Current: ${currentMinutes}, Start: ${startMinutes}, End: ${endMinutes})`);
    return result;
};

export const sessions: any = {};

export const initWhatsApp = async (whatsappId: number, companyId: number) => {
    const sessionName = `session-${whatsappId}`;
    const sessionsDir = path.resolve("sessions");

    if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionsDir, sessionName));
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
    });

    sessions[whatsappId] = socket;

    socket.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            const { addLog } = await import("./LogService.js");
            addLog(whatsappId, companyId, "Novo QR Code gerado. Aguardando leitura...");

            getIO().to(`company-${companyId}`).emit("whatsapp-qr", { whatsappId, qr });
            try {
                await prisma.whatsApp.update({
                    where: { id: whatsappId },
                    data: { qrcode: qr, status: "QRCODE" }
                });
            } catch (e: any) { console.error(`[WA-${whatsappId}] QR update error:`, e.message); }
        }

        if (connection === "close") {
            const { addLog } = await import("./LogService.js");
            const reason = (lastDisconnect?.error as Boom)?.output?.payload?.message || "Desconhecido";
            addLog(whatsappId, companyId, `Conexão fechada: ${reason}`, 'error');

            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            try {
                await prisma.whatsApp.update({
                    where: { id: whatsappId },
                    data: { status: "DISCONNECTED", qrcode: null }
                });
            } catch (e: any) { console.error(`[WA-${whatsappId}] Disconnect update error:`, e.message); }

            if (shouldReconnect) {
                initWhatsApp(whatsappId, companyId);
            } else {
                delete sessions[whatsappId];
            }
        }

        if (connection === "open") {
            const { addLog } = await import("./LogService.js");
            addLog(whatsappId, companyId, "Conectado com sucesso! Sistema pronto.");

            try {
                await prisma.whatsApp.update({
                    where: { id: whatsappId },
                    data: { status: "CONNECTED", qrcode: null }
                });
            } catch (e: any) { console.error(`[WA-${whatsappId}] Connected update error:`, e.message); }
            getIO().to(`company-${companyId}`).emit("whatsapp-status", { whatsappId, status: "CONNECTED" });
        }
    });

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("messages.upsert", async (m) => {
        if (m.type === "notify") {
            // Processar mensagens em paralelo para não travar o fluxo geral se um contato demorar
            m.messages.forEach(async (msg) => {
                const remoteJid = msg.key.remoteJid;
                if (!remoteJid || remoteJid === "status@broadcast" || remoteJid.endsWith("@g.us")) return;

                // Capturar corpo da mensagem
                const body = msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    msg.message?.imageMessage?.caption ||
                    msg.message?.videoMessage?.caption || "";

                if (!body && !msg.key.fromMe && !msg.message?.imageMessage && !msg.message?.audioMessage && !msg.message?.videoMessage) return;

                try {
                    // 1. Localizar ou Criar Contato
                    let contact = await prisma.contact.findUnique({ where: { remoteJid } });

                    // Extrair número limpo (apenas os dígitos antes do @)
                    const cleanNumber = remoteJid.split("@")[0].replace(/\D/g, "");

                    // Só capturamos o pushName se a mensagem NÃO for nossa (evita salvar nosso próprio nome no cliente)
                    const contactName = (!msg.key.fromMe && msg.pushName) ? msg.pushName : null;

                    if (!contact) {
                        contact = await prisma.contact.create({
                            data: {
                                remoteJid,
                                number: cleanNumber,
                                name: contactName || cleanNumber,
                                companyId
                            }
                        });

                        // Tentar buscar foto em segundo plano
                        socket.profilePictureUrl(remoteJid, 'image').then(ppUrl => {
                            prisma.contact.update({ where: { id: contact!.id }, data: { profilePic: ppUrl } }).catch(() => { });
                        }).catch(() => { });
                    } else if (contactName && contact.name !== contactName) {
                        // Se o nome capturado for diferente do que temos no banco, atualizamos para o nome real do cliente
                        console.log(`[BotLogic] Updating contact name from "${contact.name}" to "${contactName}"`);
                        contact = await prisma.contact.update({
                            where: { id: contact.id },
                            data: { name: contactName }
                        });
                    }

                    // 2. Localizar ou Abrir Novo Ciclo de Ticket
                    let ticket = await prisma.ticket.findFirst({
                        where: {
                            contactId: contact.id,
                            companyId,
                            status: { in: ["pending", "open"] }
                        },
                        orderBy: { updatedAt: 'desc' }
                    });

                    let isNewInteraction = false;

                    if (!ticket) {
                        isNewInteraction = true;
                        const lastClosed = await prisma.ticket.findFirst({
                            where: { contactId: contact.id, companyId, status: "closed" },
                            orderBy: { updatedAt: 'desc' }
                        });

                        // Setor Geral Obrigatório para Início/Reabertura
                        let geralDept = await prisma.department.findFirst({
                            where: { name: { contains: "Geral" }, companyId }
                        });
                        if (!geralDept) {
                            geralDept = await prisma.department.create({ data: { name: "Geral", companyId, color: "#8b5cf6" } });
                        }

                        if (lastClosed) {
                            // Reabrir ticket antigo, resetando para Geral, Pendente e SEM atendente
                            ticket = await prisma.ticket.update({
                                where: { id: lastClosed.id },
                                data: { status: "pending", whatsappId, departmentId: geralDept.id, userId: null, updatedAt: new Date() }
                            });
                            getIO().to(`company-${companyId}`).emit("appMessage", {
                                action: "reopen", ticketId: ticket.id, ticketStatus: "pending", contact
                            });
                        } else {
                            // Criar ticket do zero
                            ticket = await prisma.ticket.create({
                                data: { contactId: contact.id, companyId, whatsappId, status: "pending", departmentId: geralDept.id }
                            });
                            getIO().to(`company-${companyId}`).emit("appMessage", {
                                action: "create", ticket
                            });
                        }
                    }

                    // 3. Salvar Mensagem
                    const messageType = msg.message?.imageMessage ? "image" :
                        msg.message?.videoMessage ? "video" :
                            msg.message?.audioMessage ? "audio" : "chat";

                    let mediaUrl = null;
                    let mediaType = null;

                    if (messageType !== "chat") {
                        try {
                            const buffer = await downloadMediaMessage(msg, 'buffer', {});
                            const extension = messageType === "image" ? "jpg" : messageType === "video" ? "mp4" : "ogg";
                            const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
                            const filePath = path.resolve("public", fileName);

                            if (!fs.existsSync(path.resolve("public"))) {
                                fs.mkdirSync(path.resolve("public"), { recursive: true });
                            }

                            fs.writeFileSync(filePath, buffer as Buffer);
                            mediaUrl = fileName; // Salvamos apenas o nome para usar com /public/ no front
                            mediaType = msg.message?.audioMessage?.mimetype || null;
                            console.log(`[Media] Saved ${messageType} to ${fileName}`);
                        } catch (mediaErr) {
                            logger.error("Error downloading media:", mediaErr);
                        }
                    }

                    const newMessage = await prisma.message.create({
                        data: {
                            body: body || (messageType !== "chat" ? `[Mídia: ${messageType}]` : ""),
                            fromMe: msg.key.fromMe || false,
                            contactId: contact.id,
                            ticketId: ticket.id,
                            type: messageType,
                            read: msg.key.fromMe || false,
                            mediaUrl,
                            mediaType
                        }
                    });

                    await prisma.ticket.update({
                        where: { id: ticket.id },
                        data: { lastMessageId: newMessage.id, updatedAt: new Date() }
                    });

                    // 4. Boas-vindas + Verificação de Horário + FlowBuilder
                    if (!msg.key.fromMe && ticket.status === "pending") {
                        const [waConn, company] = await Promise.all([
                            prisma.whatsApp.findUnique({
                                where: { id: whatsappId },
                                select: { id: true, welcomeMessage: true, outOfHoursMessage: true }
                            }),
                            prisma.company.findUnique({
                                where: { id: companyId },
                                select: { antiBanDelay: true }
                            })
                        ]);

                        const delay = company?.antiBanDelay ?? 2000;
                        const withinHours = await isWithinBusinessHours(companyId);

                        console.log(`[BotLogic] Ticket: ${ticket.id}, NewCycle: ${isNewInteraction}, WithinHours: ${withinHours}`);

                        if (!withinHours && isNewInteraction && waConn?.outOfHoursMessage) {
                            console.log(`[BotLogic] Sending OutOfHours message to ${remoteJid}`);
                            await sleep(delay);
                            await socket.sendMessage(remoteJid, { text: waConn.outOfHoursMessage });
                        } else if (withinHours) {
                            // Envia Boas-vindas apenas se for o início/reabertura do ciclo e estiver dentro do horário
                            if (isNewInteraction && waConn?.welcomeMessage) {
                                console.log(`[BotLogic] Sending Welcome message to ${remoteJid}`);
                                await sleep(delay);
                                await socket.sendMessage(remoteJid, { text: waConn.welcomeMessage });
                            }

                            console.log(`[BotLogic] Starting FlowBuilder for ${remoteJid}`);
                            await sleep(delay);
                            processFlow(ticket.id, companyId, whatsappId, body, remoteJid).catch(e => logger.error("Flow error:", e));
                        }
                    }

                    // 5. Emitir via Socket
                    getIO().to(`company-${companyId}`).emit("appMessage", {
                        action: "create", ticketId: ticket.id, contact, message: newMessage
                    });
                } catch (err) {
                    logger.error("Error processing message:", err);
                }
            });
        }
    });

};

export const getSession = (whatsappId: number) => sessions[whatsappId];
