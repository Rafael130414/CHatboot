import prisma from "../src/libs/prisma.js";

async function main() {
    await prisma.whatsApp.updateMany({
        data: { status: "CONNECTED" }
    });
    console.log("Status de conexão sincronizado com sucesso!");
}

main();
