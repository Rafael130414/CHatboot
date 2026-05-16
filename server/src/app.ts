import express from "express";
import cors from "cors";
import path from "path";
import "dotenv/config";
import authRoutes from "./routes/AuthRoutes.js";
import whatsappRoutes from "./routes/WhatsAppRoutes.js";
import ticketRoutes from "./routes/TicketRoutes.js";
import tagRoutes from "./routes/TagRoutes.js";
import departmentRoutes from "./routes/DepartmentRoutes.js";
import userRoutes from "./routes/UserRoutes.js";
import contactRoutes from "./routes/ContactRoutes.js";
import flowRoutes from "./routes/FlowRoutes.js";
import settingRoutes from "./routes/SettingRoutes.js";
import mediaRoutes from "./routes/MediaRoutes.js";
import dashboardRoutes from "./routes/DashboardRoutes.js";
import aiRoutes from "./routes/AiRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (Mídias)
// Servir arquivos estáticos (Mídias)
app.use("/public", express.static(path.resolve("public"), {
    setHeaders: (res, path) => {
        if (path.endsWith('.mp3')) res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
}));


app.use("/auth", authRoutes);
app.use("/whatsapp", whatsappRoutes);
app.use("/tickets", ticketRoutes);
app.use("/tags", tagRoutes);
app.use("/departments", departmentRoutes);
app.use("/users", userRoutes);
app.use("/contacts", contactRoutes);
app.use("/flows", flowRoutes);
app.use("/settings", settingRoutes);
app.use("/media", mediaRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/ai", aiRoutes);


app.get("/", (req, res) => {
    res.json({ message: "Chatboot API is running" });
});

// 404 Handler para debug
app.use((req, res) => {
    console.log(`[404] ${req.method} ${req.url}`);
    res.status(404).json({ error: `Rota ${req.method} ${req.url} não encontrada` });
});

export default app;
