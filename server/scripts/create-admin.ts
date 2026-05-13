import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = "admin@chatboot.com";
    const password = "admin123";
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: "admin",
        },
        create: {
            name: "Administrador Master",
            email,
            password: hashedPassword,
            role: "admin",
            company: {
                create: {
                    name: "Chatboot Corp"
                }
            }
        }
    });

    console.log("-----------------------------------------");
    console.log("Master Access Synchronized!");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log("-----------------------------------------");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
