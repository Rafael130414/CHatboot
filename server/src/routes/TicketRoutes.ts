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

// Criar Novo Ticket Manualmente (Novo Atendimento)
ticketRoutes.post("/", isAuth, async (req, res) => {
    const { contactId, whatsappId } = req.body;
    const companyId = req.user.companyId;

    try {
        // Verifica se já existe um ticket aberto ou pendente para este contato nesta conexão
        const existingTicket = await prisma.ticket.findFirst({
            where: {
                contactId: Number(contactId),
                companyId,
                status: { in: ["pending", "open"] }
            },
            include: { contact: true }
        });

        if (existingTicket) {
            return res.json(existingTicket);
        }

        // Busca conexão padrão se não informada
        let wId = whatsappId;
        if (!wId) {
            const firstWhatsapp = await prisma.whatsApp.findFirst({ where: { companyId, status: "CONNECTED" } });
            wId = firstWhatsapp?.id;
        }

        if (!wId) return res.status(400).json({ error: "Nenhuma conexão WhatsApp ativa encontrada." });

        const ticket = await prisma.ticket.create({
            data: {
                contactId: Number(contactId),
                companyId,
                whatsappId: Number(wId),
                status: "pending"
            },
            include: {
                contact: true,
                whatsapp: { select: { name: true } },
                tags: true,
                department: true,
                lastMessage: true
            }
        });

        getIO().to(`company-${companyId}`).emit("ticket", {
            action: "update",
            ticket
        });

        return res.json(ticket);
    } catch (err) {
        return res.status(500).json({ error: "Erro ao criar atendimento manual" });
    }
});

// Listar tickets da empresa (filtrando por status)
ticketRoutes.get("/", isAuth, async (req, res) => {
    const { status } = req.query;
    const where: any = { companyId: req.user.companyId };

    if (status && status !== "all") {
        where.status = status as string;
    }

    // Lógica de isolamento de tickets para Agentes:
    // 1. Administradores veem tudo.
    // 2. Agentes só veem tickets de departamentos aos quais pertencem.
    // 3. Se não tiver departamento, veem tickets atribuídos a eles ou sem departamento se estiverem na fila.
    if (req.user.role !== "admin") {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { departments: true }
        });
        const departmentIds = user?.departments.map(d => d.id) || [];

        const agentFilter: any = {
            OR: [
                { userId: req.user.id }, // Meus tickets
                { departmentId: { in: departmentIds } } // Meus departamentos
            ]
        };

        // Filtro específico para "todos" os tickets permitidos
        if (!where.status || where.status === "all") {
            where.OR = agentFilter.OR;
        } else {
            // Se filtrar por status, aplica o filtro de agente e o status
            where.AND = [
                { status: where.status },
                agentFilter
            ];
            delete where.status;
        }
    }

    const tickets = await prisma.ticket.findMany({
        where,
        include: {
            contact: true,
            lastMessage: true,
            whatsapp: { select: { id: true, name: true } },
            tags: true,
            department: true,
            user: { select: { id: true, name: true } }
        },
        orderBy: [
            { department: { priority: "desc" } }, // Prioridade do Departamento
            { updatedAt: "desc" }
        ]
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

// Transferir Atendimento (Smart Transfer)
ticketRoutes.post("/:id/transfer", isAuth, async (req, res) => {
    const { id } = req.params;
    const { userId, departmentId } = req.body;
    const companyId = req.user.companyId;

    try {
        const ticket = await prisma.ticket.findFirst({
            where: { id: Number(id), companyId },
            include: { contact: true, whatsapp: true }
        });

        if (!ticket) return res.status(404).json({ error: "Ticket not found" });

        const data: any = { status: "pending" };
        if (userId) data.userId = Number(userId);
        if (departmentId) data.departmentId = Number(departmentId);

        const updatedTicket = await prisma.ticket.update({
            where: { id: ticket.id },
            data,
            include: { contact: true, whatsapp: { select: { name: true } }, tags: true, department: true, lastMessage: true }
        });

        // Enviar mensagem automática de transferência se mudar de departamento
        if (departmentId && ticket.whatsapp && ticket.contact) {
            const dep = await prisma.department.findUnique({ where: { id: Number(departmentId) } });
            if (dep) {
                const transferMsg = `*Aviso:* Seu atendimento foi transferido para o setor *${dep.name}*. Por favor, aguarde um instante.`;

                // Usamos o controller ou enviamos direto via socket se quisermos simular, 
                // mas o ideal é persistir a mensagem e enviar via WhatsAppService se disponível.
                // Aqui vou apenas simular a criação da mensagem no banco para aparecer no chat.
                await prisma.message.create({
                    data: {
                        body: transferMsg,
                        fromMe: true,
                        read: true,
                        ticketId: ticket.id,
                        contactId: ticket.contactId,
                        type: "chat"
                    }
                });
            }
        }

        getIO().to(`company-${companyId}`).emit("ticket", {
            action: "update",
            ticket: updatedTicket
        });

        return res.json(updatedTicket);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao transferir ticket" });
    }
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

// Deletar Ticket
ticketRoutes.delete("/:id", isAuth, async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        const ticket = await prisma.ticket.findFirst({
            where: { id: Number(id), companyId }
        });

        if (!ticket) return res.status(404).json({ error: "Ticket not found" });

        // Deletar mensagens primeiro (caso o cascade não esteja configurado no DB)
        await prisma.message.deleteMany({ where: { ticketId: ticket.id } });

        await prisma.ticket.delete({
            where: { id: ticket.id }
        });

        getIO().to(`company-${companyId}`).emit("ticket", {
            action: "delete",
            ticketId: ticket.id
        });

        return res.json({ success: true });
    } catch (err: any) {
        return res.status(500).json({ error: "Failed to delete ticket" });
    }
});

export default ticketRoutes;

