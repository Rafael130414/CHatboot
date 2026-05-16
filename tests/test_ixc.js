

const url = 'https://ixc22.mixtel.com.br';
const token = '26:1ee1cde8bb018db665a3fe737edcba481a3fac0f0792c7d7af4f8b3ae0828fe4';
const cpf = process.argv[2] || '12345678901';

async function testIxc() {
    try {
        const auth = Buffer.from(token).toString("base64");
        console.log("Testing IXC API...");
        console.log("URL:", url);
        console.log("Auth Header:", `Basic ${auth}`);

        console.log(`Searching for CPF: ${cpf} with Like (L)...`);
        const clientRes = await fetch(`${url}/webservice/v1/cliente`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${auth}`,
                "ixcsoft": "listar"
            },
            body: JSON.stringify({
                qtype: "cliente.cnpj_cpf",
                query: cpf.replace(/\D/g, "").split("").join("%"),
                oper: "L",
                page: "1",
                rp: "1"
            })
        });

        const clientData = await clientRes.json();
        console.log("Client Response:", JSON.stringify(clientData, null, 2));

        if (clientData.registros && clientData.registros.length > 0) {
            console.log("Client Found:", JSON.stringify(clientData.registros[0], null, 2));
            const clientId = clientData.registros[0].id;
            console.log("Client ID found:", clientId);

            // Testar boletos
            const gridParam = [{ TB: "fn_areceber.status", OP: "=", P: "A" }, { TB: "fn_areceber.id_cliente", OP: "=", P: clientId }];
            const boletoRes = await fetch(`${url}/webservice/v1/fn_areceber`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${auth}`,
                    "ixcsoft": "listar"
                },
                body: JSON.stringify({
                    qtype: "fn_areceber.id",
                    query: "0",
                    oper: ">",
                    grid_param: JSON.stringify(gridParam),
                    page: "1",
                    rp: "5"
                })
            });
            const boletoData = await boletoRes.json();
            console.log("Boleto Response:", JSON.stringify(boletoData, null, 2));
        } else {
            console.log("CPF not found.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

testIxc();
