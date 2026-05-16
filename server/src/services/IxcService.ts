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

    static async getBoleto(companyId: number, cpf: string, contractId?: string) {
        try {
            let { url, token } = await this.getConfigs(companyId);
            if (!url.startsWith("http")) url = `https://${url}`;
            const auth = Buffer.from(token).toString("base64");

            // 1. Buscar Cliente pelo CPF (se não tiver contractId, precisamos do cliente)
            let clientId = "";
            if (!contractId) {
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
                if (!clientData.registros || clientData.registros.length === 0) {
                    return { success: false, message: "CPF não encontrado no sistema IXC." };
                }
                clientId = clientData.registros[0].id;
            }

            // 2. Buscar Boletos em Aberto (status = 'A')
            const gridParam = [{ TB: "fn_areceber.status", OP: "=", P: "A" }];
            if (contractId) {
                gridParam.push({ TB: "fn_areceber.id_contrato", OP: "=", P: contractId });
            } else {
                gridParam.push({ TB: "fn_areceber.id_cliente", OP: "=", P: clientId });
            }

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
                    rp: "5",
                    sortname: "fn_areceber.data_vencimento",
                    sortorder: "asc"
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
                    linhaDigitavel: activeBol.linha_digitavel || "",
                    link: activeBol.gateway_link || `${url}/central_assinante_web/api/get_boleto?id=${activeBol.id}`,
                    linkSegundaVia: `${url}/central_assinante_web/api/get_boleto?id=${activeBol.id}`,
                }
            };

        } catch (error: any) {
            console.error("[IXC Service Error]:", error.message);
            return { success: false, message: "Erro ao comunicar com o servidor financeiro." };
        }
    }

    static async listLogins(companyId: number, cpf: string) {
        try {
            let { url, token } = await this.getConfigs(companyId);
            if (!url.startsWith("http")) url = `https://${url}`;
            const auth = Buffer.from(token).toString("base64");

            // 1. Buscar Cliente
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
            if (!clientData.registros || clientData.registros.length === 0) return null;
            const client = clientData.registros[0];
            const clientId = client.id;

            // 2. Listar RadUsuarios (Logins)
            const loginsRes = await fetch(`${url}/webservice/v1/radusuarios`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${auth}`,
                    "ixcsoft": "listar"
                },
                body: JSON.stringify({
                    qtype: "radusuarios.id_cliente",
                    query: clientId,
                    oper: "=",
                    rp: "10"
                })
            });
            const loginsData = await loginsRes.json();
            const registros = loginsData.registros || [];

            return registros.map((r: any) => ({
                ...r,
                endereco: r.endereco && r.endereco !== "" ? r.endereco : `${client.endereco}, ${client.numero}`
            }));
        } catch (e) {
            return null;
        }
    }

    static async getBoletoPDF(companyId: number, boletoId: string) {
        try {
            let { url, token } = await this.getConfigs(companyId);
            if (!url.startsWith("http")) url = `https://${url}`;
            const auth = Buffer.from(token).toString("base64");

            const res = await fetch(`${url}/webservice/v1/fn_areceber/imprimir_boletos`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${auth}`
                },
                body: JSON.stringify({
                    boletos: boletoId,
                    tipo: "pdf"
                })
            });
            return await res.json();
        } catch (e) {
            return null;
        }
    }
}
