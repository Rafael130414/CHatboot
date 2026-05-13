import prisma from "../src/libs/prisma.js";

async function main() {
    const whatsapps = await prisma.whatsApp.findMany();
    console.log("Conexões encontradas:", whatsapps.length);

    if (whatsapps.length > 1) {
        console.log("Limpando conexões duplicadas...");
        const keepId = whatsapps[0].id;
        await prisma.whatsApp.deleteMany({
            where: {
                id: { not: keepId }
            }
        });
        console.log("Limpeza concluída. Mantida apenas a conexão ID:", keepId);
    }
}

main();
