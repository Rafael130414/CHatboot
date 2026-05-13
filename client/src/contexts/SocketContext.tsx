import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextData {
    socket: Socket | null;
}

export const SocketContext = createContext<SocketContextData>({} as SocketContextData);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const connectedRef = useRef(false);

    useEffect(() => {
        if (connectedRef.current) return;

        const dynamicUrl = typeof window !== "undefined"
            ? (window.location.hostname.includes("lhr.life") ? "https://9ca3260b99866f.lhr.life" : `${window.location.protocol}//${window.location.hostname}:4000`)
            : "https://9ca3260b99866f.lhr.life";

        console.log("Connecting to Socket at:", dynamicUrl);

        const newSocket = io(dynamicUrl, {
            transports: ["websocket"],
            reconnectionAttempts: 20,
            reconnectionDelay: 2000,
        });

        newSocket.on("connect", () => {
            console.log("Global Socket Connected:", newSocket.id);

            // Tentar disparar o join imediatamente
            const userStr = localStorage.getItem("user");
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user.companyId) {
                        newSocket.emit("joinCompany", user.companyId);
                        console.log("Joined company:", user.companyId);
                    }
                } catch (e) { }
            }
        });

        newSocket.on("connect_error", (err) => {
            console.error("Socket Connection Error:", err.message);
        });

        setSocket(newSocket);
        connectedRef.current = true;

        return () => {
            newSocket.disconnect();
            connectedRef.current = false;
        };
    }, []);

    // Monitorar login para emitir joinCompany se o socket já estiver aberto
    useEffect(() => {
        if (socket && socket.connected) {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const user = JSON.parse(userStr);
                socket.emit("joinCompany", user.companyId);
            }
        }
    }, [socket]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    return context.socket;
};
