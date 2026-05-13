import prisma from "../libs/prisma.js";

export const addLog = async (whatsappId: number, companyId: number, message: string, type: 'info' | 'error' | 'warning' = 'info') => {
    console.log(`[WA-${whatsappId}] ${message}`);

    // Uso do singleton de socket para evitar dependências circulares
    const { getIO } = await import("../libs/socket.js");
    const io = getIO();

    if (io) {
        io.to(`company-${companyId}`).emit("whatsapp-log", {
            whatsappId,
            message,
            type,
            timestamp: new Date()
        });
    }
};
