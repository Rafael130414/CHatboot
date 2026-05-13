import prisma from "./src/libs/prisma.js";

async function main() {
    const w = await prisma.whatsApp.findMany();
    console.log(`Connections in DB: ${w.length}`);
    w.forEach(wa => console.log(` - ID: ${wa.id}, Name: ${wa.name}, Status: ${wa.status}`));
    const u = await prisma.user.findMany();
    console.log(`Users in DB: ${u.length}`);
    u.forEach(user => console.log(` - ID: ${user.id}, Name: ${user.name}, CompanyId: ${user.companyId}`));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
}).then(() => process.exit(0));
