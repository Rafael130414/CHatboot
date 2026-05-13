import http from "http";
import app from "./app.js";
import { logger } from "./utils/logger.js";
import path from "path";
import express from "express";
import tagRoutes from "./routes/TagRoutes.js";
import { initIO } from "./libs/socket.js";

const PORT = process.env.PORT || 4000;

// Servir arquivos estáticos para mídias
app.use("/public", express.static(path.resolve("public")));

app.use("/tags", tagRoutes);

const server = http.createServer(app);

const io = initIO(server);
app.set("io", io);

io.on("connection", (socket) => {
    logger.info("New client connected: " + socket.id);

    socket.on("joinCompany", (companyId) => {
        socket.join(`company-${companyId}`);
        logger.info(`Client ${socket.id} joined company-${companyId}`);
    });

    socket.on("joinChat", (ticketId) => {
        socket.join(`ticket-${ticketId}`);
    });

    socket.on("disconnect", () => {
        logger.info("Client disconnected: " + socket.id);
    });
});

server.listen(Number(PORT), "0.0.0.0", async () => {
    logger.info(`Server listening on port ${PORT}`);

    // Inicializa sessões salvas no banco
    const { initWhatsApp } = await import("./services/WhatsAppService.js");
    const prisma = (await import("./libs/prisma.js")).default;

    const whatsapps = await prisma.whatsApp.findMany();
    for (const whatsapp of whatsapps) {
        try {
            await initWhatsApp(whatsapp.id, whatsapp.companyId);
            logger.info(`Session ${whatsapp.id} initialized automatically.`);
        } catch (err) {
            logger.error(`Failed to initialize session ${whatsapp.id}:`, err);
        }
    }
});

