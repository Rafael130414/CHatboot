import { Router } from "express";
import { isAuth } from "../middleware/isAuth.js";
import prisma from "../libs/prisma.js";

const tagRoutes = Router();

// Listar Tags da empresa
tagRoutes.get("/", isAuth, async (req, res) => {
    const tags = await prisma.tag.findMany({
        where: { companyId: req.user.companyId },
        orderBy: { name: "asc" }
    });
    return res.json(tags);
});

// Criar nova Tag
tagRoutes.post("/", isAuth, async (req, res) => {
    const { name, color } = req.body;
    const tag = await prisma.tag.create({
        data: {
            name,
            color: color || "#00d9a6",
            companyId: req.user.companyId
        }
    });
    return res.json(tag);
});

// Vincular / Desvincular Tag de um Ticket
tagRoutes.post("/sync/:ticketId", isAuth, async (req, res) => {
    const { ticketId } = req.params;
    const { tagIds } = req.body; // Array de IDs de tags

    const ticket = await prisma.ticket.findFirst({
        where: { id: Number(ticketId), companyId: req.user.companyId }
    });

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    // Sincronizar tags (limpa as antigas e adiciona as novas)
    await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
            tags: {
                set: tagIds.map((id: number) => ({ id }))
            }
        }
    });

    return res.json({ success: true });
});

export default tagRoutes;
