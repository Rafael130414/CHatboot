const fs = require("fs");
const url = "https://ixc22.mixtel.com.br";
const token = "26:1ee1cde8bb018db665a3fe737edcba481a3fac0f0792c7d7af4f8b3ae0828fe4";
const auth = Buffer.from(token).toString("base64");

async function test() {
    try {
        console.log("Testando /webservice/v1/get_boleto ...");
        const res = await fetch(`${url}/webservice/v1/get_boleto`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${auth}`
            },
            body: JSON.stringify({
                boletos: "553855",   // boleto em aberto do Paulo
                juro: "N",
                multa: "N",
                atualiza_boleto: "S",
                tipo_boleto: "arquivo",
                base64: "S",
                layout_impressao: ""
            })
        });

        const contentType = res.headers.get("content-type");
        console.log("Status:", res.status);
        console.log("Content-Type:", contentType);

        const text = await res.text();
        console.log("Response (primeiros 500 chars):", text.substring(0, 500));

        // Se for base64, salvar como PDF para confirmar
        if (text.length > 100 && !text.includes("{")) {
            const buf = Buffer.from(text, "base64");
            fs.writeFileSync("tests/boleto_teste.pdf", buf);
            console.log("\n✅ PDF salvo em tests/boleto_teste.pdf (" + buf.length + " bytes)");
        } else {
            try {
                const json = JSON.parse(text);
                console.log("\nResposta JSON:", JSON.stringify(json, null, 2));
                // Se tiver campo com base64
                if (json.arquivo || json.base64 || json.pdf || json.content) {
                    const b64 = json.arquivo || json.base64 || json.pdf || json.content;
                    const buf = Buffer.from(b64, "base64");
                    fs.writeFileSync("tests/boleto_teste.pdf", buf);
                    console.log("✅ PDF salvo em tests/boleto_teste.pdf (" + buf.length + " bytes)");
                }
            } catch (e) {
                // não é JSON
            }
        }
    } catch (e) {
        console.error("Erro:", e.message);
    }
}

test();
