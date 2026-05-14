import { Router } from "express";
import { isAuth } from "../middleware/isAuth.js";
import prisma from "../libs/prisma.js";

const contactRoutes = Router();

// Listar contatos
contactRoutes.get("/", isAuth, async (req, res) => {
    const contacts = await prisma.contact.findMany({
        where: { companyId: req.user.companyId },
        include: {
            whatsApp: { select: { name: true } }
        },
        orderBy: { name: 'asc' }
    });
    return res.json(contacts);
});

// Atualizar contato
contactRoutes.put("/:id", isAuth, async (req, res) => {
    const { id } = req.params;
    const { name, number } = req.body;
    const companyId = req.user.companyId;

    try {
        const contact = await prisma.contact.update({
            where: { id: Number(id), companyId },
            data: { name, number }
        });
        return res.json(contact);
    } catch (err) {
        return res.status(404).json({ error: "Contato não encontrado ou não pertence a esta empresa." });
    }
});

// Deletar contato
contactRoutes.delete("/:id", isAuth, async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    try {
        await prisma.contact.delete({
            where: { id: Number(id), companyId }
        });
        return res.json({ success: true });
    } catch (err) {
        return res.status(404).json({ error: "Erro ao deletar contato." });
    }
});

export default contactRoutes;
