import { Router } from "express";
import { isAuth } from "../middleware/isAuth.js";
import prisma from "../libs/prisma.js";
import multer from "multer";
import path from "path";
import { sendMessage } from "../controllers/MessageController.js";
import fs from "fs";
import { getIO } from "../libs/socket.js";

const ticketRoutes = Router();

// Configuração Multer para Mídias
const uploadDir = path.resolve("public");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Listar tickets da empresa (filtrando por status)
ticketRoutes.get("/", isAuth, async (req, res) => {
    const { status } = req.query;
    const where: any = { companyId: req.user.companyId };

    if (status && status !== "all") {
        where.status = status as string;
    }

    // Lógica de isolamento de tickets para Agentes:
    // 1. Tickets "pending" (Aguardando) aparecem para todos (para alguém poder puxar)
    // 2. Tickets "open" ou "closed" só aparecem para o próprio atendente (se não for admin)
    if (req.user.role !== "admin") {
        if (where.status === "open" || where.status === "closed") {
            where.userId = req.user.id;
        } else if (!where.status || where.status === "all") {
            // Se buscar todos, traz Pendentes de todos + Abertos/Fechados só meus
            where.OR = [
                { status: "pending" },
                { userId: req.user.id }
            ];
        }
    }

    const tickets = await prisma.ticket.findMany({
        where,
        include: {
            contact: true,
            lastMessage: true,
            whatsapp: { select: { name: true } },
            tags: true,
            department: true,
            user: { select: { id: true, name: true } }
        },
        orderBy: { updatedAt: "desc" }
    });
    return res.json(tickets);
});

// Aceitar Atendimento
ticketRoutes.post("/:id/accept", isAuth, async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const userId = req.user.id;

    const ticket = await prisma.ticket.findFirst({
        where: { id: Number(id), companyId }
    });

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const updatedTicket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
            status: "open",
            userId
        },
        include: { contact: true, whatsapp: { select: { name: true } }, tags: true, department: true, lastMessage: true }
    });

    getIO().to(`company-${companyId}`).emit("ticket", {
        action: "update",
        ticket: updatedTicket
    });

    return res.json(updatedTicket);
});

// Finalizar Atendimento
ticketRoutes.post("/:id/close", isAuth, async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const ticket = await prisma.ticket.findFirst({
        where: { id: Number(id), companyId }
    });

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const updatedTicket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "closed" },
        include: { contact: true, whatsapp: { select: { name: true } }, tags: true, department: true, lastMessage: true }
    });

    getIO().to(`company-${companyId}`).emit("ticket", {
        action: "update",
        ticket: updatedTicket
    });

    return res.json(updatedTicket);
});

// Transferir Atendimento
ticketRoutes.post("/:id/transfer", isAuth, async (req, res) => {
    const { id } = req.params;
    const { userId, departmentId } = req.body;
    const companyId = req.user.companyId;

    const ticket = await prisma.ticket.findFirst({
        where: { id: Number(id), companyId }
    });

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const updatedTicket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
            userId: userId ? Number(userId) : ticket.userId,
            departmentId: departmentId ? Number(departmentId) : ticket.departmentId,
            status: "pending"
        },
        include: { contact: true, whatsapp: { select: { name: true } }, tags: true, department: true, lastMessage: true }
    });

    getIO().to(`company-${companyId}`).emit("ticket", {
        action: "update",
        ticket: updatedTicket
    });

    return res.json(updatedTicket);
});

// Buscar mensagens de um ticket
ticketRoutes.get("/:id", isAuth, async (req, res) => {
    const { id } = req.params;
    const ticket = await prisma.ticket.findFirst({
        where: {
            id: Number(id),
            companyId: req.user.companyId
        },
        include: {
            contact: true,
            whatsapp: { select: { name: true } },
            tags: true,
            messages: {
                orderBy: { createdAt: "asc" }
            }
        }
    });
    return res.json(ticket);
});

// Enviar mensagem (Texto ou Mídia)
ticketRoutes.post("/:id/messages", isAuth, upload.single("media"), sendMessage);

export default ticketRoutes;
