import { Router } from "express";
import { isAuth } from "../middleware/isAuth.js";
import prisma from "../libs/prisma.js";

const settingRoutes = Router();

// Listar horários de atendimento
settingRoutes.get("/schedules", isAuth, async (req, res) => {
    let schedules = await prisma.schedule.findMany({
        where: { companyId: req.user.companyId },
        orderBy: { id: "asc" }
    });

    // Inicializar horários padrão se a empresa for nova/não tiver
    if (schedules.length === 0) {
        const weekdays = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

        await Promise.all(
            weekdays.map(day =>
                prisma.schedule.create({
                    data: {
                        weekday: day,
                        start: "09:00",
                        end: "18:00",
                        active: !["Sábado", "Domingo"].includes(day),
                        companyId: req.user.companyId
                    }
                })
            )
        );

        schedules = await prisma.schedule.findMany({
            where: { companyId: req.user.companyId },
            orderBy: { id: "asc" }
        });
    }

    return res.json(schedules);
});

// Atualizar múltiplos horários
settingRoutes.put("/schedules", isAuth, async (req, res) => {
    const { schedules } = req.body; // Expects array of { id, start, end, active }

    if (!Array.isArray(schedules)) {
        return res.status(400).json({ error: "Schedules must be an array" });
    }

    try {
        await Promise.all(
            schedules.map((s: any) =>
                prisma.schedule.update({
                    where: { id: s.id, companyId: req.user.companyId },
                    data: {
                        start: s.start,
                        end: s.end,
                        active: s.active
                    }
                })
            )
        );

        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Failed to update schedules" });
    }
});

export default settingRoutes;
