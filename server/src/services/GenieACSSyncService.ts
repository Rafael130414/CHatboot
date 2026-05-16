import { IxcService } from "./IxcService.js";
import prisma from "../libs/prisma.js";

export class GenieACSSyncService {
    static GENIEACS_URL = "http://127.0.0.1:7557"; // NBI API

    static async syncDevices() {
        try {
            console.log("[GenieACSSync] Iniciando sincronização TR-069 <-> IXC...");
            // Usar o companyId = 1 por padrão para o IXC, ou buscar a primeira company configurada
            const company = await prisma.company.findFirst({ where: { ixcUrl: { not: null } } });
            if (!company) {
                console.log("[GenieACSSync] Nenhuma empresa com IXC configurado.");
                return;
            }

            const res = await fetch(`${this.GENIEACS_URL}/devices?projection=_id,InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.Username,Device.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.Username,VirtualParameters.ClientName`);

            if (!res.ok) {
                console.error("[GenieACSSync] Erro ao buscar devices:", res.status, res.statusText);
                return;
            }

            const text = await res.text();
            let devices: any[] = [];
            try {
                devices = JSON.parse(text);
            } catch (e) {
                console.error("[GenieACSSync] Erro ao fazer parse dos devices do GenieACS.");
                return;
            }

            console.log(`[GenieACSSync] Encontrados ${devices.length} dispositivos no TR-069.`);

            for (const d of devices) {
                const id = d._id;
                let pppoe = null;
                let currentClientName = null;

                // Extrair PPPoE para TR-098 (InternetGatewayDevice) ou TR-181 (Device)
                try { pppoe = d.InternetGatewayDevice.WANDevice["1"].WANConnectionDevice["1"].WANPPPConnection["1"].Username._value; } catch (e) { }
                if (!pppoe) {
                    try { pppoe = d.Device.WANDevice["1"].WANConnectionDevice["1"].WANPPPConnection["1"].Username._value; } catch (e) { }
                }

                // Extrair Nome Atual que já está salvo no GenieACS
                try { currentClientName = d.VirtualParameters.ClientName._value; } catch (e) { }

                if (pppoe && pppoe.trim() !== "") {
                    // Buscar o nome no IXC
                    const ixcName = await IxcService.getClientNameByPppoe(company.id, pppoe);

                    if (ixcName) {
                        // Verifica se o nome precisa ser atualizado no GenieACS
                        if (currentClientName !== ixcName) {
                            console.log(`[GenieACSSync] Atualizando [${id}] - PPPoE: ${pppoe} -> NOVO NOME: ${ixcName}`);

                            // Usaremos a API de Tags nativa do GenieACS para adicionar uma Tag com o nome
                            // Como Tags não podem ter espaços, vamos higienizar
                            const cleanName = ixcName.replace(/[^a-zA-Z0-9]/g, "_");
                            const tagName = `IXC__${cleanName}`;

                            // Adiciona a Tag
                            await fetch(`${this.GENIEACS_URL}/devices/${encodeURIComponent(id)}/tags/${encodeURIComponent(tagName)}`, {
                                method: "POST"
                            });

                            // Além disso, também enviaremos uma "Task" para criar/atualizar a VirtualParameter 'ClientName', 
                            // *NOTA: Virtual Parameters não se pode escrever direto via NBI. É read-only.
                            // Mas podemos setar um alias ou colocar dentro do ProvisioningCode para ficar visível na tela!

                            const paramPath = d.InternetGatewayDevice ?
                                "InternetGatewayDevice.DeviceInfo.ProvisioningCode" :
                                "Device.DeviceInfo.ProvisioningCode";

                            await fetch(`${this.GENIEACS_URL}/devices/${encodeURIComponent(id)}/tasks?connection_request`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    name: "setParameterValues",
                                    parameterValues: [
                                        [paramPath, ixcName, "xsd:string"]
                                    ]
                                })
                            });
                        }
                    }
                }
            }
            console.log("[GenieACSSync] Sincronização finalizada com sucesso!");
        } catch (error) {
            console.error("[GenieACSSync] Erro fatal durante sincronização:", error);
        }
    }
}
