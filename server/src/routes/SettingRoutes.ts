import { Router } from "express";
import { isAuth } from "../middleware/isAuth.js";
import prisma from "../libs/prisma.js";

const settingRoutes = Router();

// ─── Horários de Atendimento ─────────────────────────────────────────────────

settingRoutes.get("/schedules", isAuth, async (req, res) => {
    const companyId = req.user.companyId;
    console.log(`[Schedules GET] companyId: ${companyId}`);

    try {
        let schedules = await prisma.schedule.findMany({
            where: { companyId },
            orderBy: { id: "asc" }
        });

        console.log(`[Schedules GET] Found ${schedules.length} for company ${companyId}`);

        if (schedules.length === 0) {
            // Usar SQL raw para evitar qualquer problema de constraints do Prisma
            const days = [
                { name: "Segunda-feira", active: true },
                { name: "Terca-feira", active: true },
                { name: "Quarta-feira", active: true },
                { name: "Quinta-feira", active: true },
                { name: "Sexta-feira", active: true },
                { name: "Sabado", active: false },
                { name: "Domingo", active: false },
            ];
            for (const d of days) {
                try {
                    await prisma.$executeRawUnsafe(
                        `INSERT INTO "Schedule" (weekday, start, "end", active, "companyId") VALUES ($1, '09:00', '18:00', $2, $3) ON CONFLICT DO NOTHING`,
                        d.name, d.active, companyId
                    );
                } catch (e: any) {
                    console.error(`[Schedules] Insert failed for ${d.name}:`, e.message);
                }
            }
            schedules = await prisma.schedule.findMany({
                where: { companyId },
                orderBy: { id: "asc" }
            });
            console.log(`[Schedules GET] After insert: ${schedules.length} rows`);
        }

        return res.json(schedules);
    } catch (err: any) {
        console.error("[Schedules GET] Fatal:", err.message);
        return res.status(500).json({ error: err.message });
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
