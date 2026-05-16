
const cpf = process.argv[2] || "618.641.923-13";
const url = "https://ixc22.mixtel.com.br";
const token = "26:1ee1cde8bb018db665a3fe737edcba481a3fac0f0792c7d7af4f8b3ae0828fe4";
const auth = Buffer.from(token).toString("base64");

async function test() {
    try {
        console.log("Testing IXC PDF...");
        const res = await fetch(`${url}/webservice/v1/fn_areceber/imprimir_boleto_api`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${auth}`
            },
            body: JSON.stringify({
                id: "553855"
            })
        });
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

test();
