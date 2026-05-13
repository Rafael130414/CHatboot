import { useContext } from "react";
import { SocketContext } from "../contexts/SocketContext";

// Hook simplificado que usa o contexto global
export const useSocket = () => {
    const context = useContext(SocketContext);
    return context.socket;
};
