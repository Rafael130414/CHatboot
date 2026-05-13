import { Request, Response } from "express";
import prisma from "../libs/prisma.js";
import { getSession } from "../services/WhatsAppService.js";

export const sendMessage = async (req: Request, res: Response) => {
    const { id: ticketId } = req.params;
    const { body } = req.body;
    const file = req.file;
    const companyId = req.user?.companyId;

    console.log(`[SendMessage] Ticket: ${ticketId}, Company: ${companyId}`);

    try {
        if (!companyId) {
            return res.status(401).json({ error: "Usuário não autenticado" });
        }

        const ticket = await prisma.ticket.findFirst({
            where: { id: Number(ticketId), companyId },
            include: { contact: true }
        });

        if (!ticket) return res.status(404).json({ error: "Ticket not found" });

        // 1. Identificar conexão correta
        let whatsappId = ticket.whatsappId;
        if (!whatsappId) {
            const first = await prisma.whatsApp.findFirst({ where: { companyId, status: "CONNECTED" } });
            whatsappId = first?.id || null;
        }

        if (!whatsappId) return res.status(400).json({ error: "Nenhuma conexão ativa" });

        const session = getSession(whatsappId);
        if (!session) return res.status(400).json({ error: "Sessão offline" });

        const jid = ticket.contact.remoteJid;
        let messageBody = body;
        let mediaUrl: string | undefined;
        let type: string = "chat";

        // 2. Tratar Mídias
        if (file) {
            mediaUrl = `/public/${file.filename}`;
            const isImage = file.mimetype.startsWith("image/");
            const isVideo = file.mimetype.startsWith("video/");
            const isAudio = file.mimetype.startsWith("audio/");

            if (isImage) {
                type = "image";
                await session.sendMessage(jid, { image: { url: file.path }, caption: body });
            } else if (isVideo) {
                type = "video";
                await session.sendMessage(jid, { video: { url: file.path }, caption: body });
            } else if (isAudio) {
                type = "audio";
                await session.sendMessage(jid, { audio: { url: file.path }, ptt: true });
            } else {
                type = "document";
                await session.sendMessage(jid, { document: { url: file.path }, fileName: file.originalname, caption: body });
            }

            messageBody = body || file.originalname;
        } else {
            // Envio de texto normal
            await session.sendMessage(jid, { text: body });
        }

        // 3. Salvar Mensagem
        const message = await prisma.message.create({
            data: {
                body: messageBody || "",
                fromMe: true,
                contactId: ticket.contactId,
                ticketId: ticket.id,
                mediaUrl,
                type,
                read: true
            }
        });

        await prisma.ticket.update({
            where: { id: ticket.id },
            data: { lastMessageId: message.id, updatedAt: new Date() }
        });

        const io = req.app.get("io");
        if (io) {
            io.to(`company-${companyId}`).emit("appMessage", {
                action: "create",
                ticketId: ticket.id,
                contact: ticket.contact,
                message
            });
        }

        return res.json(message);
    } catch (error: any) {
        console.error("[SendMessage Error]", error);
        return res.status(500).json({ error: error.message || "Erro interno ao enviar mensagem" });
    }
};
