const url = "https://ixc22.mixtel.com.br";
const token = "26:1ee1cde8bb018db665a3fe737edcba481a3fac0f0792c7d7af4f8b3ae0828fe4";
const auth = Buffer.from(token).toString("base64");

async function test() {
    try {
        // Buscar boletos do cliente Paulo (id=22008)
        const res = await fetch(`${url}/webservice/v1/fn_areceber`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${auth}`,
                "ixcsoft": "listar"
            },
            body: JSON.stringify({
                qtype: "fn_areceber.id_cliente",
                query: "22008",
                oper: "=",
                page: "1",
                rp: "3",
                grid_param: JSON.stringify([{ TB: "fn_areceber.status", OP: "=", P: "A" }]),
                sortname: "fn_areceber.data_vencimento",
                sortorder: "asc"
            })
        });
        const data = await res.json();
        if (data.registros && data.registros.length > 0) {
            const boleto = data.registros[0];
            console.log("Boleto ID:", boleto.id);
            console.log("Linha digitável:", boleto.linha_digitavel);
            console.log("Gateway link:", boleto.gateway_link);
            console.log("Valor:", boleto.valor);
            console.log("Vencimento:", boleto.data_vencimento);

            // Tentar o link do portal do assinante (segunda via publica)
            const linkSegundaVia = `${url}/central_assinante_web/api/get_boleto?id=${boleto.id}`;
            console.log("\nTentando link portal assinante:", linkSegundaVia);
            const r2 = await fetch(linkSegundaVia);
            console.log("Status:", r2.status, "Content-Type:", r2.headers.get("content-type"));
            const text = await r2.text();
            console.log("Resposta:", text.substring(0, 500));
        }
    } catch (e) {
        console.error(e);
    }
}

test();
