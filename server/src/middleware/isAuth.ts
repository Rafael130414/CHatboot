import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface TokenPayload {
    id: number;
    companyId: number;
    role: string;
}

export const isAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "Token missing" });
    }

    const [, token] = authHeader.split(" ");

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
        req.user = decoded;
        return next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
};
