import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../libs/prisma.js";

export const signUp = async (req: Request, res: Response) => {
    const { name, email, password, companyName } = req.body;

    try {
        const userExists = await prisma.user.findFirst({ where: { email } });
        if (userExists) return res.status(400).json({ error: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Transação para criar Empresa + Departamentos + Usuário
        const result = await prisma.$transaction(async (tx) => {
            const company = await tx.company.create({
                data: { name: companyName || `${name}'s Company` }
            });

            // Criar Departamentos Padrão
            await tx.department.createMany({
                data: [
                    { name: "Suporte", color: "#00c9a7", companyId: company.id },
                    { name: "Comercial", color: "#3b82f6", companyId: company.id },
                    { name: "Financeiro", color: "#f59e0b", companyId: company.id }
                ]
            });

            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: "admin",
                    companyId: company.id
                }
            });

            return { user, company };
        });

        return res.status(201).json(result);
    } catch (err) {
        console.error("Signup error", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const signIn = async (req: Request, res: Response) => {
    const { email, password, remember } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { company: true }
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const expiresIn = remember ? "30d" : "24h";

        const token = jwt.sign(
            { id: user.id, companyId: user.companyId, role: user.role },
            process.env.JWT_SECRET!,
            { expiresIn }
        );

        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                companyName: user.company.name
            }
        });
    } catch (err: any) {
        console.error("SignIn Error:", err);
        return res.status(400).json({ error: err.message });
    }
};
