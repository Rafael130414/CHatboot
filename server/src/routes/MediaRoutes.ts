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

import ffmpeg from "fluent-ffmpeg";

const upload = multer({ storage });

// Rota de Upload com Transcoder para OGG/OPUS (Padrão WhatsApp Mensagem de Voz)
mediaRoutes.post("/upload", isAuth, upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const inputPath = req.file.path;
    const outputFileName = `${path.parse(req.file.filename).name}.ogg`;
    const outputPath = path.join(path.resolve("public"), outputFileName);

    try {
        // Converte para OGG/OPUS (LibOpus)
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .toFormat('ogg')
                .audioCodec('libopus')
                .on('end', resolve)
                .on('error', reject)
                .save(outputPath);
        });

        // Remove o arquivo original (mp3/webm) após converter
        fs.unlinkSync(inputPath);

        // Retorna o nome do novo arquivo .ogg
        return res.json({ fileName: outputFileName });
    } catch (err) {
        console.error("[Media] Transcode error:", err);
        // Se falhar a conversão, retorna o original mesmo para não quebrar o fluxo
        return res.json({ fileName: req.file.filename });
    }
});


export default mediaRoutes;
