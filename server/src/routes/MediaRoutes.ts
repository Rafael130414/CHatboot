import { Router } from "express";
import { isAuth } from "../middleware/isAuth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const mediaRoutes = Router();

// Configuração do Multer para salvar na pasta public
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const publicPath = path.resolve("public");
        if (!fs.existsSync(publicPath)) {
            fs.mkdirSync(publicPath, { recursive: true });
        }
        // Garante permissão de escrita
        try { fs.chmodSync(publicPath, 0o777); } catch (e) { }
        cb(null, publicPath);
    },

    filename: (req, file, cb) => {
        const ext = file.mimetype.split("/")[1] || "mp3";
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        cb(null, fileName);
    }
});

const upload = multer({ storage });

// Rota de Upload
mediaRoutes.post("/upload", isAuth, upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    // Retorna a URL relativa da mídia (que o FlowEngine resolverá via servidor)
    // Usamos o IP ou domínio da VPS no front. Para o DB, salvamos apenas o nome do arquivo.
    return res.json({ fileName: req.file.filename });
});

export default mediaRoutes;
