import { Router } from "express";
import { isAuth } from "../middleware/isAuth.js";
import prisma from "../libs/prisma.js";

const settingRoutes = Router();

// ─── Horários de Atendimento ─────────────────────────────────────────────────

settingRoutes.get("/schedules", isAuth, async (req, res) => {
    const companyId = req.user.companyId;
    console.log(`[Schedules GET] Inciando busca para empresa: ${companyId}`);

    try {
        let schedules = await prisma.schedule.findMany({
            where: { companyId },
            orderBy: { id: "asc" }
        });

        if (schedules.length === 0) {
            console.log(`[Schedules] Criando horários padrão para a empresa ${companyId}`);
            const weekdays = ["Segunda-feira", "Terca-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sabado", "Domingo"];

            // Criação sequencial para evitar race conditions
            for (const day of weekdays) {
                await prisma.schedule.create({
                    data: {
                        weekday: day,
                        start: "09:00",
                        end: "18:00",
                        active: !["Sabado", "Domingo"].includes(day),
                        companyId
                    }
                });
            }

            schedules = await prisma.schedule.findMany({
                where: { companyId },
                orderBy: { id: "asc" }
            });
        }

        return res.json(schedules);
    } catch (err: any) {
        console.error("[Schedules GET] Erro Fatal:", err.message);
        return res.status(500).json({ error: "Erro ao carregar horários de atendimento." });
    }
});



settingRoutes.put("/schedules", isAuth, async (req, res) => {
    const { schedules } = req.body;
    if (!Array.isArray(schedules)) return res.status(400).json({ error: "Schedules must be an array" });

    try {
        await Promise.all(
            schedules.map((s: any) =>
                prisma.schedule.update({
                    where: { id: s.id },
                    data: { start: s.start, end: s.end, active: s.active }
                })
            )
        );
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Failed to update schedules" });
    }
});

// ─── Configurações do Bot ─────────────────────────────────────────────────────

settingRoutes.get("/bot", isAuth, async (req, res) => {
    const company = await prisma.company.findUnique({
        where: { id: req.user.companyId },
        select: { antiBanDelay: true }
    });
    return res.json(company);
});

settingRoutes.put("/bot", isAuth, async (req, res) => {
    const { antiBanDelay } = req.body;

    const company = await prisma.company.update({
        where: { id: req.user.companyId },
        data: { antiBanDelay: Number(antiBanDelay) || 2000 }
    });

    return res.json({ success: true, company });
});

export default settingRoutes;
