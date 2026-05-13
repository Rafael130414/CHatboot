import { Router } from "express";
import { isAuth } from "../middleware/isAuth.js";
import prisma from "../libs/prisma.js";

const departmentRoutes = Router();

departmentRoutes.get("/", isAuth, async (req, res) => {
    const departments = await prisma.department.findMany({
        where: { companyId: req.user.companyId },
        include: { tickets: true }
    });
    return res.json(departments);
});

departmentRoutes.post("/", isAuth, async (req, res) => {
    const { name, color } = req.body;
    const companyId = req.user.companyId;

    const newDep = await prisma.department.create({
        data: { name, color, companyId }
    });

    return res.json(newDep);
});

export default departmentRoutes;
