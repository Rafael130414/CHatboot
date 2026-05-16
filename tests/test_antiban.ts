import prisma from "./server/src/libs/prisma.js";

async function test() {
    const c = await prisma.company.findFirst();
    console.log("Companhia:", c);
}

test();
