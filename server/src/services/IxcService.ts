import prisma from "../libs/prisma.js";

export class IxcService {
    private static async getConfigs(companyId: number) {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { ixcUrl: true, ixcToken: true }
        });

        if (!company?.ixcUrl || !company?.ixcToken) {
            throw new Error("IXC_NOT_CONFIGURED");
        }

        return {
            url: company.ixcUrl.replace(/\/$/, ""), // remover barra final
            token: company.ixcToken
        };
    }

    static async getBoleto(companyId: number, cpf: string) {
        try {
            const { url, token } = await this.getConfigs(companyId);
            const auth = Buffer.from(token).toString("base64");

            // 1. Buscar Cliente pelo CPF
            const clientRes = await fetch(`${url}/webservice/v1/cliente`, {
                method: "POST", // A API IXC costuma usar POST para filtros complexos via JSON
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${auth}`,
                    "ixcsoft": "listar"
                },
                body: JSON.stringify({
                    qtype: "cliente.cnpj_cpf",
                    query: cpf.replace(/\D/g, ""), // apenas números
                    oper: "=",
                    page: "1",
                    rp: "1",
                    sortname: "cliente.id",
                    sortorder: "desc"
                })
            });

            const clientData = await clientRes.json();

            if (!clientData.registros || clientData.registros.length === 0) {
                return { success: false, message: "CPF não encontrado no sistema IXC." };
            }

            const clientId = clientData.registros[0].id;

            // 2. Buscar Boletos em Aberto (status = 'A')
            const boletoRes = await fetch(`${url}/webservice/v1/fn_areceber`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${auth}`,
                    "ixcsoft": "listar"
                },
                body: JSON.stringify({
                    qtype: "fn_areceber.id_cliente",
                    query: clientId,
                    oper: "=",
                    grid_param: JSON.stringify([{ TB: "fn_areceber.status", OP: "=", P: "A" }]),
                    page: "1",
                    rp: "5",
                    sortname: "fn_areceber.data_vencimento",
                    sortorder: "asc" // Próximo boleto a vencer primeiro
                })
            });

            const boletoData = await boletoRes.json();

            if (!boletoData.registros || boletoData.registros.length === 0) {
                return { success: false, message: "Não encontramos boletos em aberto para o seu CPF." };
            }

            const activeBol = boletoData.registros[0];

            return {
                success: true,
                total: boletoData.total,
                boleto: {
                    id: activeBol.id,
                    vencimento: activeBol.data_vencimento,
                    valor: activeBol.valor,
                    linhaDigitavel: activeBol.linha_digitavel,
                    link: activeBol.gateway_link,
                }
            };

        } catch (error: any) {
            console.error("[IXC Service Error]:", error.message);
            return { success: false, message: "Erro ao comunicar com o servidor financeiro." };
        }
    }
}
