import { Router } from "express";
import { isAuth } from "../middleware/isAuth.js";
import prisma from "../libs/prisma.js";
import { initWhatsApp } from "../services/WhatsAppService.js";

const whatsappRoutes = Router();

// Listar conexões da empresa
whatsappRoutes.get("/", isAuth, async (req, res) => {
    const whatsapps = await prisma.whatsApp.findMany({
        where: { companyId: req.user.companyId }
    });
    return res.json(whatsapps);
});

// Criar nova conexão e iniciar QR Code
whatsappRoutes.post("/", isAuth, async (req, res) => {
    const { name } = req.body;

    const whatsapp = await prisma.whatsApp.create({
        data: {
            name,
            companyId: req.user.companyId,
            status: "DISCONNECTED"
        }
    });

    // Inicia o processo do WhatsApp em background
    initWhatsApp(whatsapp.id, req.user.companyId);

    return res.json(whatsapp);
});

// Remover Conexão
whatsappRoutes.delete("/:id", isAuth, async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const whatsapp = await prisma.whatsApp.findFirst({
        where: { id: Number(id), companyId }
    });

    if (!whatsapp) return res.status(404).json({ error: "Conexão não encontrada" });

    // Tenta parar a sessão se estiver ativa
    const { getSession, sessions } = await import("../services/WhatsAppService.js");
    const session = getSession(whatsapp.id);
    if (session) {
        await session.logout();
        delete sessions[whatsapp.id];
    }

    await prisma.whatsApp.delete({ where: { id: whatsapp.id } });

    return res.json({ success: true });
});

whatsappRoutes.post("/:id/logout", isAuth, async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const whatsapp = await prisma.whatsApp.findFirst({
        where: { id: Number(id), companyId }
    });

    if (!whatsapp) return res.status(404).json({ error: "Conexão não encontrada" });

    const { getSession, sessions } = await import("../services/WhatsAppService.js");
    const session = getSession(whatsapp.id);

    if (session) {
        try {
            await session.logout();
        } catch (e) { }
        delete sessions[whatsapp.id];
    }

    await prisma.whatsApp.update({
        where: { id: whatsapp.id },
        data: { status: "DISCONNECTED", qrcode: null }
    });

    return res.json({ success: true });
});

whatsappRoutes.post("/:id/restart", isAuth, async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const whatsapp = await prisma.whatsApp.findFirst({
        where: { id: Number(id), companyId }
    });

    if (!whatsapp) return res.status(404).json({ error: "Conexão não encontrada" });

    const { getSession, sessions, initWhatsApp } = await import("../services/WhatsAppService.js");
    const session = getSession(whatsapp.id);

    if (session) {
        try {
            await session.logout();
        } catch (e) { }
        delete sessions[whatsapp.id];
    }

    await prisma.whatsApp.update({
        where: { id: whatsapp.id },
        data: { status: "DISCONNECTED", qrcode: null }
    });

    initWhatsApp(whatsapp.id, companyId);

    return res.json({ success: true, message: "Reiniciando sessão..." });
});

whatsappRoutes.get("/:id", isAuth, async (req, res) => {
    const { id } = req.params;
    const whatsapp = await prisma.whatsApp.findFirst({
        where: { id: Number(id), companyId: req.user.companyId }
    });
    if (!whatsapp) return res.status(404).json({ error: "Conexão não encontrada" });
    return res.json(whatsapp);
});

export default whatsappRoutes;
