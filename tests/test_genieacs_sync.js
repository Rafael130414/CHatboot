const { IxcService } = require("../server/src/services/IxcService.ts");
const prisma = require("@prisma/client").PrismaClient;

const GENIEACS_URL = "http://127.0.0.1:7557";

async function run() {
    console.log("Fetching devices from GenieACS...");
    const res = await fetch(`${GENIEACS_URL}/devices?projection=_id,InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.Username,Device.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.Username,InternetGatewayDevice.DeviceInfo.ProvisioningCode,Device.DeviceInfo.ProvisioningCode`);
    const devices = await res.json();

    console.log(`Found ${devices.length} devices.`);

    for (const d of devices) {
        const id = d._id;
        let pppoe = null;
        let provCode = null;

        // extrair pppoe (tr069 standard)
        try { pppoe = d.InternetGatewayDevice.WANDevice["1"].WANConnectionDevice["1"].WANPPPConnection["1"].Username._value; } catch (e) { }
        if (!pppoe) try { pppoe = d.Device.WANDevice["1"].WANConnectionDevice["1"].WANPPPConnection["1"].Username._value; } catch (e) { }

        // extrair prov code
        try { provCode = d.InternetGatewayDevice.DeviceInfo.ProvisioningCode._value; } catch (e) { }
        if (!provCode) try { provCode = d.Device.DeviceInfo.ProvisioningCode._value; } catch (e) { }

        console.log(`Device ${id} | PPPoE: ${pppoe} | ProvCode: ${provCode}`);

        if (pppoe && pppoe !== "") {
            console.log(`Looking up PPPoE ${pppoe} in IXC...`);
            // usar companyId = 1
            const name = await IxcService.getClientNameByPppoe(1, pppoe);
            if (name) {
                console.log(`Found IXC Name: ${name}`);

                // Compare c/ ProvisionCode
                if (provCode !== name) {
                    console.log(`Updating ProvisioningCode for ${id} to ${name}`);
                    // Enviar task p/ o GenieACS para definir o ProvisioningCode
                    const paramPath = "InternetGatewayDevice.DeviceInfo.ProvisioningCode";
                    // Em rotedores Device2.0 seria Device.DeviceInfo.ProvisioningCode

                    const taskRes = await fetch(`${GENIEACS_URL}/devices/${encodeURIComponent(id)}/tasks?connection_request`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            name: "setParameterValues",
                            parameterValues: [
                                [paramPath, name, "xsd:string"]
                            ]
                        })
                    });
                    console.log(`Task submitted:`, taskRes.status);

                    // Atualizar Tags nativas do GenieACS (Substituindo espaços por _)
                    const tagObjStr = `IXC__${name.replace(/[^a-zA-Z0-9]/g, "_")}`;
                    const tagRes = await fetch(`${GENIEACS_URL}/devices/${encodeURIComponent(id)}/tags/${encodeURIComponent(tagObjStr)}`, {
                        method: "POST"
                    });
                    console.log(`Tag adicionada:`, tagRes.status);
                } else {
                    console.log(`Name already matches. Skipping.`);
                }
            } else {
                console.log(`PPPoE ${pppoe} not found in IXC.`);
            }
        }
    }
}

run().catch(console.error);
