import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

export const initIO = (httpServer: HttpServer): Server => {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });
    return io;
};

export const getIO = (): Server => {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
};
