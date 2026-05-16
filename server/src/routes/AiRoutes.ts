import { Router } from "express";
import { isAuth } from "../middleware/isAuth.js";
import prisma from "../libs/prisma.js";

const aiRoutes = Router();

// Obter configuração de IA da empresa
aiRoutes.get("/config", isAuth, async (req, res) => {
    try {
        const config = await prisma.companyAIConfig.findUnique({
            where: { companyId: req.user.companyId }
        });
        return res.json(config || {});
    } catch (error) {
        return res.status(500).json({ error: "Erro ao buscar configuração de IA" });
    }
});

// Salvar/Ataulizar configuração de IA
aiRoutes.post("/config", isAuth, async (req, res) => {
    const { provider, apiKey, model, url, active } = req.body;

    try {
        const config = await prisma.companyAIConfig.upsert({
            where: { companyId: req.user.companyId },
            update: {
                provider,
                apiKey,
                model,
                url,
                active
            },
            create: {
                companyId: req.user.companyId,
                provider,
                apiKey,
                model,
                url,
                active
            }
        });
        return res.json(config);
    } catch (error) {
        return res.status(500).json({ error: "Erro ao salvar configuração de IA" });
    }
});

export default aiRoutes;
