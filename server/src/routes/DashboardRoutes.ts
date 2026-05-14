import { Router } from "express";
import prisma from "../libs/prisma.js";
import { isAuth } from "../middleware/isAuth.js";

const dashboardRoutes = Router();

dashboardRoutes.get("/stats", isAuth, async (req, res) => {
    const companyId = req.user.companyId;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [open, pending, closed, closedToday, agents, connections] = await Promise.all([
            prisma.ticket.count({ where: { companyId, status: "open" } }),
            prisma.ticket.count({ where: { companyId, status: "pending" } }),
            prisma.ticket.count({ where: { companyId, status: "closed" } }),
            prisma.ticket.count({ where: { companyId, status: "closed", updatedAt: { gte: today } } }),
            prisma.user.findMany({
                where: { companyId },
                select: { id: true, name: true }
            }),
            prisma.whatsApp.findMany({
                where: { companyId },
                select: { id: true, name: true }
            })
        ]);

        // Atendimentos por Agente
        const perAgent = await Promise.all(agents.map(async (agent) => {
            const count = await prisma.ticket.count({ where: { companyId, userId: agent.id } });

            // Atendimentos por Conexão para este agente
            const agentConns = await Promise.all(connections.map(async (conn) => {
                const connCount = await prisma.ticket.count({
                    where: { companyId, userId: agent.id, whatsappId: conn.id }
                });
                return { name: conn.name, count: connCount };
            }));

            return {
                name: agent.name,
                id: agent.id,
                total: count,
                connections: agentConns.filter(c => c.count > 0)
            };
        }));

        // Atendimentos por Conexão (Geral)
        const perConnection = await Promise.all(connections.map(async (conn) => {
            const count = await prisma.ticket.count({ where: { companyId, whatsappId: conn.id } });
            return { name: conn.name, value: count };
        }));

        // Histórico de 7 dias
        const weekData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);

            const [created, resolved] = await Promise.all([
                prisma.ticket.count({ where: { companyId, createdAt: { gte: date, lt: nextDate } } }),
                prisma.ticket.count({ where: { companyId, status: "closed", updatedAt: { gte: date, lt: nextDate } } })
            ]);

            weekData.push({
                name: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
                criados: created,
                resolvidos: resolved
            });
        }

        return res.json({
            kpis: { open, pending, closed, closedToday },
            perAgent: perAgent.filter(a => a.total > 0),
            perConnection,
            weekData
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default dashboardRoutes;
