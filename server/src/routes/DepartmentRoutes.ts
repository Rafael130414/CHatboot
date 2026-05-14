import { Router } from "express";
import { isAuth } from "../middleware/isAuth.js";
import prisma from "../libs/prisma.js";

const departmentRoutes = Router();

departmentRoutes.get("/", isAuth, async (req, res) => {
    const departments = await prisma.department.findMany({
        where: { companyId: req.user.companyId },
        include: { tickets: true, schedules: true }
    });
    return res.json(departments);
});

departmentRoutes.post("/", isAuth, async (req, res) => {
    const { name, color, priority, outOfHoursMessage } = req.body;
    const companyId = req.user.companyId;

    const newDep = await prisma.department.create({
        data: {
            name,
            color,
            companyId,
            priority: priority ? Number(priority) : 0,
            outOfHoursMessage
        }
    });

    return res.json(newDep);
});

departmentRoutes.put("/:id", isAuth, async (req, res) => {
    const { id } = req.params;
    const { name, color, priority, outOfHoursMessage, schedules } = req.body;
    const companyId = req.user.companyId;

    const updated = await prisma.department.update({
        where: { id: Number(id), companyId },
        data: {
            name,
            color,
            priority: priority ? Number(priority) : 0,
            outOfHoursMessage
        }
    });

    // Atualizar schedules se fornecido
    if (schedules && Array.isArray(schedules)) {
        // Deletar antigos e criar novos por simplicidade
        await prisma.departmentSchedule.deleteMany({ where: { departmentId: Number(id) } });
        await prisma.departmentSchedule.createMany({
            data: schedules.map((s: any) => ({
                weekday: s.weekday,
                startTime: s.startTime,
                endTime: s.endTime,
                active: s.active,
                departmentId: Number(id)
            }))
        });
    }

    return res.json(updated);
});

departmentRoutes.delete("/:id", isAuth, async (req, res) => {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Antes de excluir, movemos os tickets desse departamento para "sem departamento" (null) or delete them?
    // Usually it's better to set null to avoid data loss.
    await prisma.ticket.updateMany({
        where: { departmentId: Number(id), companyId },
        data: { departmentId: null }
    });

    await prisma.department.delete({
        where: { id: Number(id), companyId }
    });

    return res.json({ message: "Department deleted" });
});

export default departmentRoutes;
