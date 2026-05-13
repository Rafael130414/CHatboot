import { Router } from "express";
import { isAuth } from "../middleware/isAuth.js";
import prisma from "../libs/prisma.js";

const userRoutes = Router();

import bcrypt from "bcryptjs";

userRoutes.get("/", isAuth, async (req, res) => {
    const users = await prisma.user.findMany({
        where: { companyId: req.user.companyId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true
        }
    });
    return res.json(users);
});

userRoutes.post("/", isAuth, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const companyId = req.user.companyId;

        // Verificar se e-mail já existe
        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
            return res.status(400).json({ error: "E-mail já cadastrado" });
        }

        const hashedPassword = await bcrypt.hash(password, 8);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || "agent",
                companyId
            }
        });

        return res.json({ id: newUser.id, name: newUser.name, email: newUser.email });
    } catch (error: any) {
        console.error("[UserRoutes] Create Error:", error.message);
        return res.status(500).json({ error: "Erro interno ao criar usuário. Verifique se os dados estão corretos." });
    }
});


export default userRoutes;
