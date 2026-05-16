const url = "https://ixc22.mixtel.com.br";
const token = "26:1ee1cde8bb018db665a3fe737edcba481a3fac0f0792c7d7af4f8b3ae0828fe4";
const auth = Buffer.from(token).toString("base64");

async function test() {
    // Buscar logins do cliente 22008
    const res = await fetch(`${url}/webservice/v1/radusuarios`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${auth}`,
            "ixcsoft": "listar"
        },
        body: JSON.stringify({
            qtype: "radusuarios.id_cliente",
            query: "22008",
            oper: "=",
            rp: "10"
        })
    });
    const data = await res.json();
    if (data.registros?.length) {
        console.log("=== CAMPOS DISPONÍVEIS EM RADUSUARIOS ===");
        const r = data.registros[0];
        Object.keys(r).forEach(k => {
            if (r[k] !== "" && r[k] !== "0" && r[k] !== null)
                console.log(`  ${k}: ${r[k]}`);
        });
        console.log("\n=== TODOS OS REGISTROS ===");
        data.registros.forEach((r, i) => {
            console.log(`Login ${i + 1}:`, JSON.stringify(r, null, 2));
        });
    }
}
test().catch(console.error);
