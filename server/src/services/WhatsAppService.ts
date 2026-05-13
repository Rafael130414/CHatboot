import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    ConnectionState
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import prisma from "../libs/prisma.js";
import { getIO } from "../libs/socket.js";
import { logger } from "../utils/logger.js";
import { processFlow } from "./FlowEngine.js";
import path from "path";
import fs from "fs";

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

                    if (!contact) {
                        contact = await prisma.contact.create({
                            data: {
                                remoteJid,
                                number: cleanNumber,
                                name: msg.pushName || cleanNumber,
                                companyId
                            }
                        });

                        // Tentar buscar foto em segundo plano
                        socket.profilePictureUrl(remoteJid, 'image').then(ppUrl => {
                            prisma.contact.update({ where: { id: contact!.id }, data: { profilePic: ppUrl } }).catch(() => { });
                        }).catch(() => { });
                    }

                    // 2. Localizar Ticket Ativo
                    let ticket = await prisma.ticket.findFirst({
                        where: {
                            contactId: contact.id,
                            companyId,
                            status: { in: ["pending", "open"] }
                        },
                        orderBy: { updatedAt: 'desc' }
                    });

                    if (!ticket) {
                        const lastClosed = await prisma.ticket.findFirst({
                            where: { contactId: contact.id, companyId, status: "closed" },
                            orderBy: { updatedAt: 'desc' }
                        });

                        if (lastClosed) {
                            // Garantir setor Geral
                            let geralDept = await prisma.department.findFirst({
                                where: { name: { contains: "Geral" }, companyId }
                            });
                            if (!geralDept) {
                                geralDept = await prisma.department.create({ data: { name: "Geral", companyId, color: "#8b5cf6" } });
                            }

                            ticket = await prisma.ticket.update({
                                where: { id: lastClosed.id },
                                data: { status: "pending", whatsappId, departmentId: geralDept.id }
                            });
                            getIO().to(`company-${companyId}`).emit("appMessage", {
                                action: "reopen", ticketId: ticket.id, ticketStatus: "pending", contact
                            });
                        } else {
                            // Garantir setor Geral
                            let geralDept = await prisma.department.findFirst({
                                where: { name: { contains: "Geral" }, companyId }
                            });
                            if (!geralDept) {
                                geralDept = await prisma.department.create({ data: { name: "Geral", companyId, color: "#8b5cf6" } });
                            }

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

                    const newMessage = await prisma.message.create({
                        data: {
                            body: body || (messageType !== "chat" ? `[Mídia: ${messageType}]` : ""),
                            fromMe: msg.key.fromMe || false,
                            contactId: contact.id,
                            ticketId: ticket.id,
                            type: messageType,
                            read: msg.key.fromMe || false
                        }
                    });

                    await prisma.ticket.update({
                        where: { id: ticket.id },
                        data: { lastMessageId: newMessage.id, updatedAt: new Date() }
                    });

                    // 4. Executar Flowbuilder
                    if (!msg.key.fromMe && ticket.status === "pending") {
                        processFlow(ticket.id, companyId, whatsappId, body, remoteJid).catch(e => logger.error("Flow error:", e));
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
