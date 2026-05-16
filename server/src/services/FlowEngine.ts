import prisma from "../libs/prisma.js";
import { getSession } from "./WhatsAppService.js";
import { logger } from "../utils/logger.js";
import redis from "../libs/redis.js";
import { AiService } from "./AiService.js";
import { IxcService } from "./IxcService.js";

// ── Tipagem do Contexto de Conversa ──────────────────
interface FlowContext {
    phone: string;
    name: string;
    ticketId: number;
    variables: Record<string, string>;
}

// ── Substitui variáveis em uma string ─────────────────
const interpolate = (text: string, ctx: FlowContext): string => {
    return text
        .replace(/\{\{nome\}\}/gi, ctx.name || "Cliente")
        .replace(/\{\{telefone\}\}/gi, ctx.phone || "")
        .replace(/\{\{ticket_id\}\}/gi, String(ctx.ticketId || ""))
        .replace(/\{\{(\w+)\}\}/g, (_, key) => ctx.variables[key] || "");
};

// ── Carrega contexto do Redis ─────────────────────────
const loadContext = async (ticketId: number): Promise<FlowContext> => {
    const raw = await redis.get(`flowCtx:${ticketId}`);
    if (raw) return JSON.parse(raw);
    return { phone: "", name: "", ticketId, variables: {} };
};

// ── Salva contexto no Redis (TTL: 24h) ───────────────
const saveContext = async (ticketId: number, ctx: FlowContext) => {
    await redis.set(`flowCtx:${ticketId}`, JSON.stringify(ctx), "EX", 86400);
};

// ── Chamada HTTP externa ──────────────────────────────
const httpRequest = async (url: string, method: string, headers: Record<string, string>, body?: string) => {
    try {
        const opts: RequestInit = { method: method || "GET", headers };
        if (body && method !== "GET") opts.body = body;
        const resp = await fetch(url, opts);
        return await resp.text();
    } catch (e) {
        logger.error("[Flow] HTTP Request failed:", e);
        return null;
    }
};

// ── Engine Principal ──────────────────────────────────
export const processFlow = async (ticketId: number, companyId: number, whatsappId: number, body: string, remoteJid: string) => {
    try {
        const activeFlows = await prisma.flow.findMany({
            where: { active: true, companyId, OR: [{ whatsappId }, { whatsappId: null }] }
        });

        if (activeFlows.length === 0) return false;
        const activeFlow = activeFlows.find(f => f.whatsappId === whatsappId) || activeFlows[0];

        const nodes = JSON.parse(activeFlow.nodes || "[]");
        const edges = JSON.parse(activeFlow.edges || "[]");
        if (nodes.length === 0) return false;

        const socket = getSession(whatsappId);
        if (!socket) return false;

        const stateKey = `flowState:${ticketId}`;
        const currentNodeId = await redis.get(stateKey) || "start";

        // Carrega dados do contato para o contexto
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { contact: true } });
        const ctx = await loadContext(ticketId);
        if (ticket?.contact) {
            ctx.phone = ticket.contact.number || remoteJid.split("@")[0];
            ctx.name = ticket.contact.name || "Cliente";
            ctx.ticketId = ticketId;
        }

        // Executa os nós recursivamente
        const executeNode = async (nodeId: string, inputMsg?: string): Promise<string | null> => {
            logger.info(`[Flow] Executing node: ${nodeId}`);

            // Incrementar estatística de uso do nó
            prisma.flowNodeInteraction.upsert({
                where: { flowId_nodeId: { flowId: activeFlow.id, nodeId } },
                update: { count: { increment: 1 } },
                create: { flowId: activeFlow.id, nodeId, count: 1 }
            }).catch(e => logger.error(`[FlowStats] Error: ${e}`));

            const node = nodes.find((n: any) => n.id === nodeId);

            if (!node) return null;

            // ── MENSAJE NODE ─────────────────────────────────
            if (node.type === "messageNode") {
                const text = interpolate(node.data.message || "", ctx);
                await socket.sendPresenceUpdate("composing", remoteJid);
                await new Promise(r => setTimeout(r, Math.min(text.length * 25, 2000)));
                await socket.sendMessage(remoteJid, { text });
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── IMAGE NODE ───────────────────────────────────
            if (node.type === "imageNode") {
                const url = interpolate(node.data.url || "", ctx);
                const caption = interpolate(node.data.caption || "", ctx);
                if (url) {
                    await socket.sendMessage(remoteJid, { image: { url }, caption });
                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── AUDIO NODE ───────────────────────────────────
            if (node.type === "audioNode") {
                const url = interpolate(node.data.url || "", ctx);
                if (url) {
                    await socket.sendMessage(remoteJid, { audio: { url }, mimetype: "audio/mp4", ptt: node.data.ptt ?? true });
                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── DOCUMENT NODE ────────────────────────────────
            if (node.type === "documentNode") {
                const url = interpolate(node.data.url || "", ctx);
                const fileName = interpolate(node.data.fileName || "arquivo", ctx);
                if (url) {
                    await socket.sendMessage(remoteJid, { document: { url }, fileName, mimetype: node.data.mimeType || "application/pdf" });
                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── MENU NODE ────────────────────────────────────
            if (node.type === "menuNode") {
                const opts: string[] = node.data.options || [];

                if (inputMsg) {
                    const msgTrim = inputMsg.trim();

                    // 1️⃣ Tenta seleção por NÚMERO (ex: "1", "2", "3")
                    const byNumber = Number(msgTrim) - 1;
                    if (!isNaN(byNumber) && byNumber >= 0 && byNumber < opts.length) {
                        const edge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === `option-${byNumber}`);
                        if (edge) {
                            await redis.del(`menuAttempts:${ticketId}:${nodeId}`);
                            logger.info(`[Flow] MenuNode: selecionou opção ${byNumber + 1} por número`);
                            return await executeNode(edge.target);
                        }
                    }

                    // 2️⃣ Tenta seleção por TEXTO (correspondência parcial, case-insensitive)
                    const msgLower = msgTrim.toLowerCase();
                    const textMatchIndex = opts.findIndex((opt: string) =>
                        opt.toLowerCase().includes(msgLower) || msgLower.includes(opt.toLowerCase())
                    );
                    if (textMatchIndex !== -1) {
                        const edge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === `option-${textMatchIndex}`);
                        if (edge) {
                            await redis.del(`menuAttempts:${ticketId}:${nodeId}`);
                            logger.info(`[Flow] MenuNode: selecionou opção ${textMatchIndex + 1} por texto ("${msgTrim}")`);
                            return await executeNode(edge.target);
                        }
                    }

                    // 3️⃣ Entrada inválida — controla quantas vezes já errou
                    const attemptsKey = `menuAttempts:${ticketId}:${nodeId}`;
                    const attemptsRaw = await redis.get(attemptsKey);
                    const attempts = attemptsRaw ? parseInt(attemptsRaw) : 0;
                    await redis.set(attemptsKey, String(attempts + 1), "EX", 3600);

                    if ((attempts + 1) % 3 === 0) {
                        // A cada 3 tentativas: reexibe o menu completo
                        let text = `*${interpolate(node.data.message || "Escolha uma opção:", ctx)}*`;
                        opts.forEach((opt: string, i: number) => { text += `\n${i + 1}. ${opt}`; });
                        await socket.sendMessage(remoteJid, { text });
                    } else {
                        // Entre as tentativas: vertical e com bold
                        let text = `*Por favor, escolha uma opção:*`;
                        opts.forEach((opt: string, i: number) => { text += `\n${i + 1}. ${opt}`; });
                        await socket.sendMessage(remoteJid, { text });
                    }
                    return nodeId; // mantém o estado no menu
                }

                // Primeira vez — exibe o menu completo
                let text = `*${interpolate(node.data.message || "Escolha uma opção:", ctx)}*`;
                opts.forEach((opt: string, i: number) => { text += `\n${i + 1}. ${opt}`; });
                await socket.sendMessage(remoteJid, { text });
                return nodeId;
            }

            // ── AUDIO NODE ────────────────────────────────────
            if (node.type === "audioNode") {
                const audioUrl = interpolate(node.data.url || "", ctx);
                if (audioUrl) {
                    logger.info(`[Flow] AudioNode: preparing ${audioUrl}`);
                    await socket.sendPresenceUpdate("recording", remoteJid);

                    try {
                        let audioPayload: any = { url: audioUrl };

                        // Se o áudio for local (nossa própria VPS), enviamos o arquivo direto para evitar erros de download do WhatsApp
                        if (audioUrl.includes('/public/')) {
                            const fileName = audioUrl.split('/public/').pop();
                            const fs = await import('fs');
                            const path = await import('path');
                            const localPath = path.resolve("public", fileName || "");

                            if (fs.existsSync(localPath)) {
                                logger.info(`[Flow] AudioNode: sending local file ${localPath}`);
                                audioPayload = fs.readFileSync(localPath);
                            }
                        }

                        await socket.sendMessage(remoteJid, {
                            audio: audioPayload,
                            mimetype: 'audio/ogg; codecs=opus',
                            ptt: true
                        });
                    } catch (err) {
                        logger.error(`[Flow] Error sending audio: ${err}`);
                    }

                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── DELAY NODE ───────────────────────────────────

            if (node.type === "delayNode") {
                const ms = Math.min(node.data.delay || 1000, 30000); // max 30s
                logger.info(`[Flow] DelayNode: waiting ${ms}ms`);
                await new Promise(r => setTimeout(r, ms));
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── CONDITION NODE (IF) ──────────────────────────
            if (node.type === "conditionNode") {
                const variable = node.data.variable || "msg";
                const operator = node.data.operator || "contém";
                const value = interpolate(node.data.value || "", ctx).toLowerCase();
                let inputValue = "";
                if (variable === "msg") inputValue = (body || "").toLowerCase();
                else if (variable === "nome") inputValue = ctx.name.toLowerCase();
                else inputValue = (ctx.variables[variable] || "").toLowerCase();

                let result = false;
                if (operator === "contém") result = inputValue.includes(value);
                else if (operator === "igual") result = inputValue === value;
                else if (operator === "começa com") result = inputValue.startsWith(value);
                else if (operator === "termina com") result = inputValue.endsWith(value);
                else if (operator === "maior que") result = Number(inputValue) > Number(value);
                else if (operator === "menor que") result = Number(inputValue) < Number(value);

                logger.info(`[Flow] ConditionNode: "${inputValue}" ${operator} "${value}" -> ${result}`);
                const edge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === (result ? "true" : "false"));
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── SWITCH / ROUTER NODE ────────────────────────
            if (node.type === "switchNode") {
                const rules = node.data.rules || [];
                const msgLower = (body || "").toLowerCase();
                let matchedHandle = "default";

                for (let i = 0; i < rules.length; i++) {
                    const rule = rules[i];
                    const val = (rule.value || "").toLowerCase();
                    const op = rule.operator || "contém";
                    let match = false;

                    if (op === "contém") match = msgLower.includes(val);
                    else if (op === "igual") match = msgLower === val;
                    else if (op === "começa com") match = msgLower.startsWith(val);
                    else if (op === "termina com") match = msgLower.endsWith(val);

                    if (match) {
                        matchedHandle = `rule-${i}`;
                        break;
                    }
                }

                logger.info(`[Flow] SwitchNode: matched "${matchedHandle}"`);
                const edge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === matchedHandle);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── LOOP / REPEAT NODE ──────────────────────────
            if (node.type === "loopNode") {
                const maxLoops = node.data.maxLoops || 3;
                const loopKey = `count:${nodeId}`;
                const currentCount = ctx.variables[loopKey] ? parseInt(ctx.variables[loopKey]) : 0;

                let nextHandle = "loop";
                if (currentCount >= maxLoops) {
                    nextHandle = "exit";
                    delete ctx.variables[loopKey]; // reseta para o futuro
                } else {
                    ctx.variables[loopKey] = String(currentCount + 1);
                }

                // Salva o novo estado das variáveis
                await redis.set(`flowCtx:${ticketId}`, JSON.stringify(ctx), "EX", 86400);

                logger.info(`[Flow] LoopNode: count ${currentCount + 1}/${maxLoops}, path ${nextHandle}`);
                const edge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === nextHandle);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── SET VARIABLE NODE ────────────────────────────
            if (node.type === "setVariableNode") {
                const varName = node.data.varName || "";
                const varValue = interpolate(node.data.varValue || "", ctx);
                if (varName) {
                    ctx.variables[varName] = varValue;
                    await saveContext(ticketId, ctx);
                    logger.info(`[Flow] SetVariable: ${varName} = ${varValue}`);
                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── HTTP REQUEST NODE ────────────────────────────
            if (node.type === "httpNode") {
                const url = interpolate(node.data.url || "", ctx);
                const method = (node.data.method || "GET").toUpperCase();
                const headersRaw = node.data.headers || "{}";
                const bodyRaw = node.data.body ? interpolate(node.data.body, ctx) : undefined;
                let parsedHeaders: Record<string, string> = {};
                try { parsedHeaders = JSON.parse(headersRaw); } catch { }

                logger.info(`[Flow] HTTPRequest: ${method} ${url}`);
                const response = await httpRequest(url, method, parsedHeaders, bodyRaw);

                // Salva resposta na variável se configurado
                if (response && node.data.saveToVar) {
                    let finalValue = response;

                    // Supone que se houver jsonPath, a resposta é JSON
                    if (node.data.jsonPath) {
                        try {
                            const parsed = JSON.parse(response);
                            // Simpe path extractor (ex: data.id)
                            finalValue = node.data.jsonPath.split('.').reduce((o: any, i: string) => o?.[i], parsed);
                            if (typeof finalValue === 'object') finalValue = JSON.stringify(finalValue);
                        } catch (e) {
                            logger.error("[Flow] Failed to parse JSON response for path mapping");
                        }
                    }

                    ctx.variables[node.data.saveToVar] = String(finalValue).substring(0, 5000);
                    await saveContext(ticketId, ctx);
                }


                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── AI NODE ─────────────────────────────────────
            if (node.type === "aiNode") {
                logger.info("[Flow] AINode: processing with IA");
                await socket.sendPresenceUpdate("composing", remoteJid);

                const systemPrompt = interpolate(node.data.prompt || "Você é um assistente prestativo.", ctx);

                const aiResp = await AiService.getResponse(
                    companyId,
                    ticketId,
                    body,
                    systemPrompt
                );

                await socket.sendMessage(remoteJid, { text: aiResp });

                if (node.data.saveToVar) {
                    ctx.variables[node.data.saveToVar || "resposta_ia"] = aiResp;
                    await saveContext(ticketId, ctx);
                }

                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── TRANSFER NODE ────────────────────────────────
            if (node.type === "transferNode") {
                const depId = node.data.departmentId;
                if (depId) {
                    await prisma.ticket.update({ where: { id: ticketId }, data: { departmentId: depId } });
                    const transferMsg = interpolate(
                        node.data.message || `Transferindo para: ${node.data.departmentName}...`,
                        ctx
                    );
                    await socket.sendMessage(remoteJid, { text: transferMsg });
                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── TAG NODE ─────────────────────────────────────
            if (node.type === "tagNode") {
                const tagName = interpolate(node.data.tagName || "", ctx);
                if (tagName) {
                    const tag = await prisma.tag.findFirst({ where: { name: tagName, companyId } });
                    if (tag) {
                        const currentTicket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { tags: true } });
                        const existingTagIds = currentTicket?.tags.map((t: any) => t.id) || [];
                        if (!existingTagIds.includes(tag.id)) {
                            await prisma.ticket.update({
                                where: { id: ticketId },
                                data: { tags: { connect: [{ id: tag.id }] } }
                            });
                        }
                    }
                }
                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── IXC BOLETO NODE ──────────────────────────────
            if (node.type === "ixcBoletoNode") {
                const ixcStateKey = `ixcState:${ticketId}`;
                const waitingChoice = await redis.get(ixcStateKey);

                if (waitingChoice) {
                    const loginsRaw = await redis.get(`ixcLogins:${ticketId}`);
                    const logins = loginsRaw ? JSON.parse(loginsRaw) : [];
                    const choice = parseInt(body.trim()) - 1;

                    if (!isNaN(choice) && logins[choice]) {
                        const selected = logins[choice];
                        const result = await IxcService.getBoleto(companyId, "", selected.id_contrato);

                        if (result.success && result.boleto) {
                            const { vencimento, link, linhaDigitavel, valor, id } = result.boleto;
                            const dataFmt = vencimento.split("-").reverse().join("/");
                            const hasLinha = linhaDigitavel && linhaDigitavel.length > 10;
                            const msg = interpolate(
                                node.data.successMessage ||
                                `💳 *Seu Boleto em Aberto*

💰 *Valor:* R$ ${parseFloat(valor).toFixed(2).replace(".", ",")}
📅 *Vencimento:* ${dataFmt}${hasLinha ? `

🔢 *Copie o código abaixo e pague em qualquer banco:*
${linhaDigitavel}` : ""}

🗂️ O PDF do boleto foi enviado abaixo ↓`,
                                { ...ctx, variables: { ...ctx.variables, link_boleto: link, linha_boleto: linhaDigitavel } }
                            );
                            await socket.sendMessage(remoteJid, { text: msg });
                            // Enviar PDF do boleto
                            try {
                                const pdfBuffer = await IxcService.getBoletoPDF(companyId, id);
                                if (pdfBuffer) {
                                    await socket.sendMessage(remoteJid, {
                                        document: pdfBuffer,
                                        fileName: `boleto_venc_${vencimento}.pdf`,
                                        mimetype: "application/pdf"
                                    });
                                }
                            } catch (pdfErr) {
                                console.error("[IXC PDF SEND]", pdfErr);
                            }
                            await redis.del(ixcStateKey);
                            await redis.del(`ixcLogins:${ticketId}`);
                        } else {
                            await socket.sendMessage(remoteJid, { text: result.message || "Erro ao buscar boleto." });
                        }
                    } else {
                        await socket.sendMessage(remoteJid, { text: "⚠️ Opção inválida. Por favor, responda apenas com o *número* correspondente ao seu endereço." });
                        return nodeId;
                    }
                } else {
                    const cpfVar = node.data.cpfVariable || "cpf";
                    let cpfValue = ctx.variables[cpfVar];

                    // Se o usuário digitou agora especificamente para este nó, atualizamos a variável
                    if (inputMsg) {
                        cpfValue = inputMsg;
                        ctx.variables[cpfVar] = inputMsg;
                        await saveContext(ticketId, ctx);
                    }

                    // Validação de CPF (mínimo 11 números)
                    const cleanCpf = (cpfValue || "").replace(/\\D/g, '');
                    if (cleanCpf.length < 11) {
                        // Só enviamos aviso de CPF inválido se o usuário REALMENTE tentou enviar algo para este nó.
                        // Se inputMsg for undefined, significa que o fluxo acabou de chegar no nó, então apenas pausamos aguardando.
                        if (inputMsg) {
                            await socket.sendMessage(remoteJid, { text: "⚠️ Por favor, informe um CPF válido com 11 dígitos para consulta." });
                        }
                        return nodeId; // Pausa o fluxo no IXC Node
                    }

                    // Prossegue com a consulta (agora com CPF obrigatoriamente >= 11 dígitos)
                    const logins = await IxcService.listLogins(companyId, cpfValue);

                    if (logins && logins.length > 1) {
                        let msg = "🔍 *Identificamos mais de um acesso vinculado ao seu CPF.*\nQual deles você deseja consultar?\n";
                        logins.forEach((l: any, i: number) => {
                            const loginLabel = l.login || l.conexao || `Contrato ${l.id_contrato}`;
                            const statusIcon = l.online === "S" ? "🟢" : "🔴";
                            msg += `\n*${i + 1}* ${statusIcon} ${l.endereco}\n   🖥️ Login: ${loginLabel}`;
                        });
                        msg += "\n\nResponda com o número da opção desejada.";
                        await socket.sendMessage(remoteJid, { text: msg });

                        await redis.set(ixcStateKey, "waiting", "EX", 600);
                        await redis.set(`ixcLogins:${ticketId}`, JSON.stringify(logins), "EX", 600);
                        return nodeId;
                    } else if (logins && logins.length === 1) {
                        const result = await IxcService.getBoleto(companyId, "", logins[0].id_contrato);
                        if (result.success && result.boleto) {
                            const { vencimento, link, linhaDigitavel, valor, id } = result.boleto;
                            const dataFmt = vencimento.split("-").reverse().join("/");
                            const hasLinha = linhaDigitavel && linhaDigitavel.length > 10;
                            const msg = interpolate(
                                node.data.successMessage ||
                                `💳 *Seu Boleto em Aberto*

💰 *Valor:* R$ ${parseFloat(valor).toFixed(2).replace(".", ",")}
📅 *Vencimento:* ${dataFmt}${hasLinha ? `

🔢 *Copie o código abaixo e pague em qualquer banco:*
${linhaDigitavel}` : ""}

🗂️ O PDF do boleto foi enviado abaixo ↓`,
                                { ...ctx, variables: { ...ctx.variables, link_boleto: link, linha_boleto: linhaDigitavel } }
                            );
                            await socket.sendMessage(remoteJid, { text: msg });
                            // Enviar PDF do boleto
                            try {
                                const pdfBuffer = await IxcService.getBoletoPDF(companyId, id);
                                if (pdfBuffer) {
                                    await socket.sendMessage(remoteJid, {
                                        document: pdfBuffer,
                                        fileName: `boleto_venc_${vencimento}.pdf`,
                                        mimetype: "application/pdf"
                                    });
                                }
                            } catch (pdfErr) {
                                console.error("[IXC PDF SEND]", pdfErr);
                            }
                        } else {
                            await socket.sendMessage(remoteJid, { text: result.message || "Não encontramos boletos em aberto." });
                        }
                    } else {
                        // Fallback caso não ache logins rad, tenta pelo CPF direto no cliente
                        const result = await IxcService.getBoleto(companyId, cpfValue);
                        if (result.success && result.boleto) {
                            const { vencimento, link, linhaDigitavel, valor, id } = result.boleto;
                            const dataFmt = vencimento.split("-").reverse().join("/");
                            const hasLinha = linhaDigitavel && linhaDigitavel.length > 10;
                            const msg = interpolate(
                                node.data.successMessage ||
                                `💳 *Seu Boleto em Aberto*

💰 *Valor:* R$ ${parseFloat(valor).toFixed(2).replace(".", ",")}
📅 *Vencimento:* ${dataFmt}${hasLinha ? `

🔢 *Copie o código abaixo e pague em qualquer banco:*
${linhaDigitavel}` : ""}

🗂️ O PDF do boleto foi enviado abaixo ↓`,
                                ctx
                            );
                            await socket.sendMessage(remoteJid, { text: msg });
                            // Enviar PDF do boleto
                            try {
                                const pdfBuffer = await IxcService.getBoletoPDF(companyId, id);
                                if (pdfBuffer) {
                                    await socket.sendMessage(remoteJid, {
                                        document: pdfBuffer,
                                        fileName: `boleto_venc_${vencimento}.pdf`,
                                        mimetype: "application/pdf"
                                    });
                                }
                            } catch (pdfErr) {
                                console.error("[IXC PDF SEND]", pdfErr);
                            }
                        } else {
                            await socket.sendMessage(remoteJid, { text: "❌ Não conseguimos localizar seu cadastro ou boletos em aberto com este CPF." });
                            return nodeId; // Pausa para ele tentar outro CPF
                        }
                    }
                }

                const edge = edges.find((e: any) => e.source === nodeId);
                if (edge) return await executeNode(edge.target);
                return null;
            }

            // ── TR-069 NODE ──────────────────────────────────
            if (node.type === "tr069Node") {
                const GENIEACS_URL = "http://37.148.134.48:7557";
                const cpfVar = node.data.cpfVariable || "cpf";
                const askMsg = node.data.askCpfMessage || "Por favor, informe seu *CPF* para acessar as opções da sua conexão:";

                const tr069StateKey = `tr069State:${ticketId}:${nodeId}`;
                const tr069State = await redis.get(tr069StateKey);
                const tr069Data = tr069State ? JSON.parse(tr069State) : {};

                // ──── FASE 1: Obter CPF ────────────────────────
                if (!tr069Data.cpf) {
                    let cpfValue = ctx.variables[cpfVar] || "";
                    if (inputMsg) cpfValue = inputMsg;

                    const cleanCpf = cpfValue.replace(/\D/g, "");
                    if (cleanCpf.length < 11) {
                        if (inputMsg) await socket.sendMessage(remoteJid, { text: "⚠️ CPF inválido. Por favor, informe os 11 dígitos." });
                        else await socket.sendMessage(remoteJid, { text: askMsg });
                        await redis.set(tr069StateKey, JSON.stringify({ phase: "awaiting_cpf" }), "EX", 600);
                        return nodeId;
                    }

                    // Buscar contratos no IXC
                    const logins = await IxcService.listLogins(companyId, cleanCpf);
                    if (!logins || logins.length === 0) {
                        await socket.sendMessage(remoteJid, { text: "❌ CPF não encontrado no sistema. Verifique os dados e tente novamente." });
                        await redis.del(tr069StateKey);
                        return nodeId;
                    }

                    if (logins.length > 1) {
                        let menuMsg = "🔍 *Identificamos mais de uma conexão no seu CPF.*\nQual você deseja gerenciar?\n";
                        logins.forEach((l: any, i: number) => {
                            const statusIcon = l.online === "S" ? "🟢" : "🔴";
                            menuMsg += `\n*${i + 1}* ${statusIcon} ${l.endereco || `Conexão ${i + 1}`}\n   🖥️ Login: ${l.login}`;
                        });
                        menuMsg += "\n\nResponda com o número da opção:";
                        await socket.sendMessage(remoteJid, { text: menuMsg });
                        await redis.set(tr069StateKey, JSON.stringify({ phase: "awaiting_contract", cpf: cleanCpf, logins }), "EX", 600);
                        return nodeId;
                    }

                    // Contrato único — avança direto
                    await redis.set(tr069StateKey, JSON.stringify({ phase: "awaiting_action", cpf: cleanCpf, pppoe: logins[0].login }), "EX", 600);
                    // Cai no próximo if via re-execução
                    return await executeNode(nodeId, "");
                }

                // ──── FASE 2: Seleção de contrato (múltiplos) ──
                if (tr069Data.phase === "awaiting_contract" && inputMsg) {
                    const choice = parseInt(inputMsg.trim()) - 1;
                    const logins = tr069Data.logins || [];
                    if (isNaN(choice) || !logins[choice]) {
                        await socket.sendMessage(remoteJid, { text: "❌ Opção inválida. Digite o número da conexão." });
                        return nodeId;
                    }
                    const selected = logins[choice];
                    await redis.set(tr069StateKey, JSON.stringify({ phase: "awaiting_action", cpf: tr069Data.cpf, pppoe: selected.login }), "EX", 600);
                    return await executeNode(nodeId, "");
                }

                // ──── FASE 3: Exibir menu de ações (com detecção ONU vs Roteador) ────
                if (tr069Data.phase === "awaiting_action" && !inputMsg) {
                    // Detectar se é ONU ou Roteador buscando o device já com projeção ampla
                    let isONU = false;
                    let cachedDeviceId: string | null = null;
                    try {
                        const detRes = await fetch(`${GENIEACS_URL}/devices?query={"InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username._value":"${tr069Data.pppoe}"}&projection=_id,InternetGatewayDevice.WANDevice.1.WANPONInterfaceConfig,InternetGatewayDevice.X_FH_Optics`);
                        const detDevices: any[] = detRes.ok ? await detRes.json() : [];
                        if (detDevices.length > 0) {
                            cachedDeviceId = detDevices[0]._id;
                            // É ONU se tiver WANPONInterfaceConfig ou X_FH_Optics ou se o ID contiver fabricantes de ONU
                            const devId = (cachedDeviceId || "").toUpperCase();
                            const hasPON = detDevices[0]?.InternetGatewayDevice?.WANDevice?.["1"]?.WANPONInterfaceConfig !== undefined;
                            const hasFHOptics = detDevices[0]?.InternetGatewayDevice?.X_FH_Optics !== undefined;
                            const isONUModel = devId.includes("FHTT") || devId.includes("ZXHN") || devId.includes("HG6") || devId.includes("AN5") || devId.includes("GPN") || devId.includes("ONU") || devId.includes("GPON");
                            isONU = hasPON || hasFHOptics || isONUModel;
                        }
                    } catch (_) {}

                    const opts: string[] = [];
                    if (node.data.showSignal !== false && isONU) opts.push("📶 Verificar Sinal Ótico");
                    if (node.data.showReboot !== false) opts.push("🔁 Reiniciar Dispositivo");
                    opts.push("📡 Ver WiFi (SSID e Senha)");
                    if (node.data.showWifiName !== false) opts.push("✏️ Alterar Nome do WiFi");
                    if (node.data.showWifiPass !== false) opts.push("🔒 Alterar Senha do WiFi");
                    opts.push("🌐 Ver DNS Atual");
                    opts.push("⚙️ Alterar DNS");

                    const deviceType = isONU ? "🔴 ONU/Fibra" : "📦 Roteador";
                    let menuMsg = `⚙️ *Gestão da sua Conexão*\n*Login:* ${tr069Data.pppoe}\n*Dispositivo:* ${deviceType}\n\nO que você deseja fazer?\n`;
                    opts.forEach((o, i) => { menuMsg += `\n*${i + 1}.* ${o}`; });
                    await socket.sendMessage(remoteJid, { text: menuMsg });

                    const newState = { ...tr069Data, phase: "awaiting_action_choice", opts, isONU, cachedDeviceId };
                    await redis.set(tr069StateKey, JSON.stringify(newState), "EX", 600);
                    return nodeId;
                }

                // ──── FASE 4: Executar ação escolhida ──────────
                if (tr069Data.phase === "awaiting_action_choice" && inputMsg) {
                    const choice = parseInt(inputMsg.trim()) - 1;
                    const opts = tr069Data.opts || [];
                    const pppoe = tr069Data.pppoe;

                    if (isNaN(choice) || !opts[choice]) {
                        await socket.sendMessage(remoteJid, { text: "❌ Opção inválida. Digite o número da ação desejada." });
                        return nodeId;
                    }

                    const chosenOpt: string = opts[choice];

                    // Usar deviceId cacheado da fase de detecção (ou buscar se não tiver)
                    let deviceId: string | null = tr069Data.cachedDeviceId || null;
                    if (!deviceId) {
                        // BUG FIX: era &&projection — correto é &projection
                        const devRes = await fetch(`${GENIEACS_URL}/devices?query=${encodeURIComponent(JSON.stringify({"InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username._value": pppoe}))}&projection=_id`);
                        const devices: any[] = devRes.ok ? await devRes.json() : [];
                        if (devices.length > 0) deviceId = devices[0]._id;
                    }

                    if (!deviceId) {
                        await socket.sendMessage(remoteJid, { text: `⚠️ Não encontramos seu dispositivo ativo no sistema de gerência. Tente novamente em instantes.` });
                        await redis.del(tr069StateKey);
                        const edge = edges.find((e: any) => e.source === nodeId);
                        if (edge) return await executeNode(edge.target);
                        return null;
                    }

                    // ── Ação: Verificar Sinal Ótico (FiberHome X_FH_GponInterfaceConfig) ──
                    if (chosenOpt.includes("Sinal")) {
                        await socket.sendMessage(remoteJid, { text: "📡 *Consultando sinal da sua ONU...*\nAguarde um momento." });

                        // Força leitura do path proprietário correto FiberHome
                        await fetch(`${GENIEACS_URL}/devices/${encodeURIComponent(deviceId)}/tasks?connection_request`, {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: "getParameterValues", parameterNames: [
                                // Path proprietário FiberHome GPON (correto para HG6143D)
                                "InternetGatewayDevice.WANDevice.1.X_FH_GponInterfaceConfig.RXPower",
                                "InternetGatewayDevice.WANDevice.1.X_FH_GponInterfaceConfig.TXPower",
                                "InternetGatewayDevice.WANDevice.1.X_FH_GponInterfaceConfig.BiasCurrent",
                                "InternetGatewayDevice.WANDevice.1.X_FH_GponInterfaceConfig.TransceiverTemperature",
                                // Status do link e PPPoE
                                "InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.PhysicalLinkStatus",
                                "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ConnectionStatus"
                            ]})
                        });
                        await new Promise(r => setTimeout(r, 6000)); // Aguarda ONU responder (CGNAT pode demorar)

                        // BUG FIX: GenieACS retorna ARRAY mesmo quando busca por ID, precisa do [0]
                        // Usa query ao invés de /devices/{id} para garantir o retorno correto
                        const sigRes = await fetch(`${GENIEACS_URL}/devices?query=${encodeURIComponent(JSON.stringify({_id: deviceId}))}&projection=InternetGatewayDevice.WANDevice.1`);
                        let rxPower: string = "N/A", txPower: string = "N/A", linkStatus: string = "N/A", connStatus: string = "N/A", temp: string = "N/A";

                        if (sigRes.ok) {
                            try {
                                const sigArr = await sigRes.json();
                                const sigData = Array.isArray(sigArr) ? sigArr[0] : sigArr; // garante objeto
                                const wan1 = sigData?.InternetGatewayDevice?.WANDevice?.["1"] || {};
                                const gpon = wan1?.X_FH_GponInterfaceConfig || {};

                                rxPower  = gpon?.RXPower?._value   ?? "N/A";
                                txPower  = gpon?.TXPower?._value   ?? "N/A";
                                temp     = gpon?.TransceiverTemperature?._value ?? "N/A";
                                linkStatus = wan1?.WANCommonInterfaceConfig?.PhysicalLinkStatus?._value ?? "N/A";
                                connStatus = wan1?.WANConnectionDevice?.["1"]?.WANPPPConnection?.["1"]?.ConnectionStatus?._value ?? "N/A";
                            } catch (_) {}
                        }

                        // Normaliza o valor (FiberHome retorna em 0.01 dBm → dividir por 100, ou já em dBm)
                        const parseSignal = (val: string): string => {
                            const n = parseFloat(String(val));
                            if (isNaN(n) || n === 0) return "N/A";
                            if (Math.abs(n) > 100) return (n / 100).toFixed(2);   // 0.01 dBm
                            if (Math.abs(n) > 1000) return (n / 1000).toFixed(2); // 0.001 dBm
                            return n.toFixed(2);
                        };

                        const rxFmt = parseSignal(rxPower);
                        const txFmt = parseSignal(txPower);
                        const rxNum = parseFloat(rxFmt);
                        const signalEmoji = isNaN(rxNum) ? "⚪" : rxNum >= -27 ? "🟢" : rxNum >= -30 ? "🟡" : "🔴";
                        const signalQuality = isNaN(rxNum) ? "Não disponível" : rxNum >= -27 ? "Ótimo" : rxNum >= -30 ? "Aceitável" : "Ruim (verifique o cabeamento)";

                        await socket.sendMessage(remoteJid, { text:
                            `📶 *Relatório de Sinal Ótico*\n\n` +
                            `${signalEmoji} *Qualidade:* ${signalQuality}\n` +
                            `📥 *RX Power (Recepção):* ${rxFmt !== "N/A" ? rxFmt + " dBm" : "N/A"}\n` +
                            `📤 *TX Power (Transmissão):* ${txFmt !== "N/A" ? txFmt + " dBm" : "N/A"}\n` +
                            `🌡️ *Temperatura:* ${temp !== "N/A" ? temp + " °C" : "N/A"}\n` +
                            `🔗 *Link Físico:* ${linkStatus}\n` +
                            `🌐 *PPPoE:* ${connStatus}\n\n` +
                            `_Referência: Sinal saudável entre -8 e -27 dBm_\n\n` +
                            `↩️ Digite *0* para voltar ao menu.`
                        });
                        await redis.set(tr069StateKey, JSON.stringify({ ...tr069Data, phase: "awaiting_back_to_menu" }), "EX", 600);
                        return nodeId;
                    }

                    // ── Ação: Reiniciar Roteador ──
                    else if (chosenOpt.includes("Reiniciar")) {
                        await socket.sendMessage(remoteJid, { text: "🔁 *Reiniciando seu roteador...*\nSua internet ficará indisponível por aproximadamente 1 minuto." });
                        await fetch(`${GENIEACS_URL}/devices/${encodeURIComponent(deviceId)}/tasks?connection_request`, {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: "reboot" })
                        });
                        await socket.sendMessage(remoteJid, { text: "✅ *Comando enviado com sucesso!*\nSeu roteador está reiniciando. Aguarde cerca de 60 segundos para a reconexão." });
                        // Volta para o menu
                        await redis.set(tr069StateKey, JSON.stringify({ ...tr069Data, phase: "awaiting_action" }), "EX", 600);
                        return await executeNode(nodeId, "");
                    }

                    // ── Ação: Ver WiFi (SSID e Senha) ──
                    else if (chosenOpt.includes("Ver WiFi")) {
                        await socket.sendMessage(remoteJid, { text: "📡 *Consultando dados do WiFi...*" });

                        // Força leitura dos parâmetros de WiFi
                        await fetch(`${GENIEACS_URL}/devices/${encodeURIComponent(deviceId)}/tasks?connection_request`, {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: "getParameterValues", parameterNames: [
                                "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID",
                                "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase",
                                "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase",
                                "InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID",
                                "InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.KeyPassphrase",
                                "InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase"
                            ]})
                        });
                        await new Promise(r => setTimeout(r, 5000));

                        // Lê os valores do GenieACS
                        const wifiRes = await fetch(`${GENIEACS_URL}/devices?query=${encodeURIComponent(JSON.stringify({_id: deviceId}))}&projection=InternetGatewayDevice.LANDevice.1.WLANConfiguration`);
                        let ssid24 = "N/A", pass24 = "N/A", ssid5g = "N/A", pass5g = "N/A";

                        if (wifiRes.ok) {
                            try {
                                const wifiArr = await wifiRes.json();
                                const wifiData = Array.isArray(wifiArr) ? wifiArr[0] : wifiArr;
                                const wlan = wifiData?.InternetGatewayDevice?.LANDevice?.["1"]?.WLANConfiguration || {};

                                // 2.4GHz — índice 1
                                ssid24 = wlan?.["1"]?.SSID?._value ?? "N/A";
                                pass24 = wlan?.["1"]?.KeyPassphrase?._value
                                      || wlan?.["1"]?.PreSharedKey?.["1"]?.KeyPassphrase?._value
                                      || "N/A";

                                // 5GHz — índice 5 (FiberHome HG6143D)
                                ssid5g = wlan?.["5"]?.SSID?._value ?? "N/A";
                                pass5g = wlan?.["5"]?.KeyPassphrase?._value
                                      || wlan?.["5"]?.PreSharedKey?.["1"]?.KeyPassphrase?._value
                                      || "N/A";
                            } catch (_) {}
                        }

                        await socket.sendMessage(remoteJid, { text:
                            `📡 *Dados do seu WiFi*\n\n` +
                            `🟡 *Rede 2.4 GHz*\n` +
                            `📝 Nome (SSID): *${ssid24}*\n` +
                            `🔑 Senha: *${pass24}*\n\n` +
                            `🟣 *Rede 5 GHz*\n` +
                            `📝 Nome (SSID): *${ssid5g}*\n` +
                            `🔑 Senha: *${pass5g}*\n\n` +
                            `⚠️ _Por segurança, não compartilhe esta mensagem._\n\n` +
                            `↩️ Digite *0* para voltar ao menu.`
                        });
                        await redis.set(tr069StateKey, JSON.stringify({ ...tr069Data, phase: "awaiting_back_to_menu" }), "EX", 600);
                        return nodeId;
                    }

                    // ── Ação: Alterar Nome WiFi ──
                    else if (chosenOpt.includes("Nome do WiFi")) {
                        await socket.sendMessage(remoteJid, { text: "📡 *Alteração de Nome do WiFi*\n\nDigite o *novo nome* que você quer colocar na sua rede WiFi:" });
                        const newState = { ...tr069Data, phase: "awaiting_wifi_ssid", deviceId };
                        await redis.set(tr069StateKey, JSON.stringify(newState), "EX", 600);
                        return nodeId;
                    }

                    // ── Ação: Alterar Senha WiFi ──
                    else if (chosenOpt.includes("Senha do WiFi")) {
                        await socket.sendMessage(remoteJid, { text: "🔒 *Alteração de Senha do WiFi*\n\nDigite a *nova senha* da sua rede WiFi (mínimo 8 caracteres):" });
                        const newState = { ...tr069Data, phase: "awaiting_wifi_pass", deviceId };
                        await redis.set(tr069StateKey, JSON.stringify(newState), "EX", 600);
                        return nodeId;
                    }

                    // ── Ação: Ver DNS Atual (multi-path: suporta todos os firmwares FiberHome) ──
                    else if (chosenOpt.includes("Ver DNS")) {
                        await socket.sendMessage(remoteJid, { text: "🌐 *Consultando DNS configurado na sua rede...*" });

                        // Força leitura dos parâmetros de DNS (GenieACS pode estar com cache antigo)
                        await fetch(`${GENIEACS_URL}/devices/${encodeURIComponent(deviceId)}/tasks?connection_request`, {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: "getParameterValues", parameterNames: [
                                "InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.DNSServers",
                                "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.DNSServers",
                                "Device.DNS.Config.DNSServers", // TR-181 (modelos novos)
                                "Device.DHCPv4.Server.Pool.1.DNSServers" // TR-181 DHCP
                            ]})
                        });
                        await new Promise(r => setTimeout(r, 5000)); // Aguarda ONU responder

                        // Busca tanto LAN quanto WAN de uma vez (firmwares diferentes usam paths diferentes)
                        const dnsRes = await fetch(`${GENIEACS_URL}/devices?query=${encodeURIComponent(JSON.stringify({_id: deviceId}))}&projection=InternetGatewayDevice.LANDevice.1.LANHostConfigManagement,InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1,Device.DNS,Device.DHCPv4`);
                        let priDns = "N/A", secDns = "N/A", dnsSource = "";

                        if (dnsRes.ok) {
                            try {
                                const dnsArr = await dnsRes.json();
                                const dnsData = Array.isArray(dnsArr) ? dnsArr[0] : dnsArr;

                                // CAMINHO 1: LAN DHCP (TR-098 — ex: FHTT99727FF0)
                                const lanDns: string = dnsData?.InternetGatewayDevice?.LANDevice?.["1"]?.LANHostConfigManagement?.DNSServers?._value ?? "";

                                // CAMINHO 2: WAN PPPoE (TR-098 — ex: FHTT9967AD18)
                                const wanPpp = dnsData?.InternetGatewayDevice?.WANDevice?.["1"]?.WANConnectionDevice?.["1"]?.WANPPPConnection?.["1"] || {};
                                const wanDns1: string = wanPpp?.DNSServers?._value ?? "";

                                // CAMINHO 3: TR-181 (Modelos novos)
                                const tr181Dns: string = dnsData?.Device?.DNS?.Config?.DNSServers?._value 
                                                      || dnsData?.Device?.DHCPv4?.Server?.Pool?.["1"]?.DNSServers?._value 
                                                      || "";

                                // Prioriza LAN se tiver valor; caso contrário tenta TR-181 e por fim WAN
                                let rawDns = "";
                                if (lanDns && lanDns.trim() && lanDns !== "0.0.0.0") {
                                    rawDns = lanDns;
                                    dnsSource = "LAN (DHCP)";
                                } else if (tr181Dns && tr181Dns.trim() && tr181Dns !== "0.0.0.0") {
                                    rawDns = tr181Dns;
                                    dnsSource = "LAN (TR-181)";
                                } else if (wanDns1 && wanDns1.trim() && wanDns1 !== "0.0.0.0") {
                                    rawDns = wanDns1;
                                    dnsSource = "WAN (PPPoE)";
                                }

                                const parts = rawDns.split(",").map((s: string) => s.trim()).filter(Boolean);
                                priDns = parts[0] || "N/A";
                                secDns = parts[1] || "N/A";
                            } catch (_) {}
                        }

                        await socket.sendMessage(remoteJid, { text:
                            (priDns !== "N/A"
                            ? `🌐 *DNS Configurado na sua Rede*\n\n` +
                              `🔵 *DNS Primário:* ${priDns}\n` +
                              `🔵 *DNS Secundário:* ${secDns}\n` +
                              `📍 *Origem:* ${dnsSource || "N/A"}\n\n` +
                              `_Este é o DNS que sua ONU entrega para os dispositivos da rede local._`
                            : `🌐 *DNS da sua Rede*\n\n` +
                              `ℹ️ O DNS desta ONU é atribuído automaticamente pelo provedor via PPPoE e não pode ser consultado remotamente.\n\n` +
                              `_Para alterar o DNS, utilize a opção "Alterar DNS" do menu._`) +
                            `\n\n↩️ Digite *0* para voltar ao menu.`
                        });
                        await redis.set(tr069StateKey, JSON.stringify({ ...tr069Data, phase: "awaiting_back_to_menu" }), "EX", 600);
                        return nodeId;
                    }

                    // ── Ação: Alterar DNS ──
                    else if (chosenOpt.includes("Alterar DNS")) {
                        const dnsMenu = `⚙️ *Alterar DNS*\n\nEscolha o DNS ou digite um personalizado:\n\n*1.* 🌐 Cloudflare (1.1.1.1 / 1.0.0.1) — Mais rápido\n*2.* 🌐 Google (8.8.8.8 / 8.8.4.4) — Popular\n*3.* 🌐 OpenDNS (208.67.222.222 / 208.67.220.220)\n*4.* ✏️ Digitar DNS personalizado`;
                        await socket.sendMessage(remoteJid, { text: dnsMenu });
                        const newState = { ...tr069Data, phase: "awaiting_dns_choice", deviceId };
                        await redis.set(tr069StateKey, JSON.stringify(newState), "EX", 600);
                        return nodeId;
                    }

                    await redis.del(tr069StateKey);
                    const edge = edges.find((e: any) => e.source === nodeId);
                    if (edge) return await executeNode(edge.target);
                    return null;
                }

                // ──── FASE 5A: Receber novo SSID e aplicar ──────
                if (tr069Data.phase === "awaiting_wifi_ssid" && inputMsg) {
                    const newSsid = inputMsg.trim();
                    if (newSsid.length < 1 || newSsid.length > 32) {
                        await socket.sendMessage(remoteJid, { text: "⚠️ Nome inválido. Deve ter entre 1 e 32 caracteres." });
                        return nodeId;
                    }
                    await socket.sendMessage(remoteJid, { text: `⏳ Aplicando o novo nome *"${newSsid}"*...` });
                    await fetch(`${GENIEACS_URL}/devices/${encodeURIComponent(tr069Data.deviceId)}/tasks?connection_request`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: "setParameterValues", parameterValues: [
                            ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID", newSsid, "xsd:string"],
                            ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID", `${newSsid}_5G`, "xsd:string"],
                            ["Device.WiFi.SSID.1.SSID", newSsid, "xsd:string"],
                            ["Device.WiFi.SSID.5.SSID", `${newSsid}_5G`, "xsd:string"]
                        ]})
                    });
                    await socket.sendMessage(remoteJid, { text: `✅ *Nome do WiFi alterado com sucesso!*\n\n📡 Nome 2.4GHz: *${newSsid}*\n📡 Nome 5GHz: *${newSsid}_5G*\n\n_Aguarde alguns segundos para a rede aparecer com o novo nome._` });
                    // Volta para o menu
                    await redis.set(tr069StateKey, JSON.stringify({ ...tr069Data, phase: "awaiting_action" }), "EX", 600);
                    return await executeNode(nodeId, "");
                }

                // ──── FASE 5B: Receber nova senha e aplicar ─────
                if (tr069Data.phase === "awaiting_wifi_pass" && inputMsg) {
                    const newPass = inputMsg.trim();
                    if (newPass.length < 8) {
                        await socket.sendMessage(remoteJid, { text: "⚠️ Senha muito curta. Mínimo 8 caracteres." });
                        return nodeId;
                    }
                    await socket.sendMessage(remoteJid, { text: `⏳ Aplicando nova senha...` });
                    await fetch(`${GENIEACS_URL}/devices/${encodeURIComponent(tr069Data.deviceId)}/tasks?connection_request`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: "setParameterValues", parameterValues: [
                            ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase", newPass, "xsd:string"],
                            ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.KeyPassphrase", newPass, "xsd:string"],
                            ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase", newPass, "xsd:string"],
                            ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase", newPass, "xsd:string"],
                            ["Device.WiFi.AccessPoint.1.Security.KeyPassphrase", newPass, "xsd:string"],
                            ["Device.WiFi.AccessPoint.5.Security.KeyPassphrase", newPass, "xsd:string"]
                        ]})
                    });
                    await socket.sendMessage(remoteJid, { text: `✅ *Senha do WiFi alterada com sucesso!*\n\n🔒 Nova senha: *${newPass}*\n\n_Conecte seus dispositivos com a nova senha._` });
                    // Volta para o menu
                    await redis.set(tr069StateKey, JSON.stringify({ ...tr069Data, phase: "awaiting_action" }), "EX", 600);
                    return await executeNode(nodeId, "");
                }

                // ──── FASE 6A: Seleção de DNS (predefinido ou personalizado) ─────
                if (tr069Data.phase === "awaiting_dns_choice" && inputMsg) {
                    const pick = inputMsg.trim();
                    let priDns = "", secDns = "";

                    if (pick === "1") { priDns = "1.1.1.1"; secDns = "1.0.0.1"; }
                    else if (pick === "2") { priDns = "8.8.8.8"; secDns = "8.8.4.4"; }
                    else if (pick === "3") { priDns = "208.67.222.222"; secDns = "208.67.220.220"; }
                    else if (pick === "4") {
                        await socket.sendMessage(remoteJid, { text: "✏️ Digite o *DNS Primário* (ex: 1.1.1.1):" });
                        await redis.set(tr069StateKey, JSON.stringify({ ...tr069Data, phase: "awaiting_dns_custom_pri" }), "EX", 600);
                        return nodeId;
                    } else {
                        await socket.sendMessage(remoteJid, { text: "❌ Opção inválida. Digite 1, 2, 3 ou 4." });
                        return nodeId;
                    }

                    // Aplica o DNS escolhido
                    await socket.sendMessage(remoteJid, { text: `⏳ Aplicando DNS *${priDns} / ${secDns}*...` });
                    await fetch(`${GENIEACS_URL}/devices/${encodeURIComponent(tr069Data.deviceId)}/tasks?connection_request`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: "setParameterValues", parameterValues: [
                            ["InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.DNSServers", `${priDns},${secDns}`, "xsd:string"],
                            ["InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.DNSServers", `${priDns},${secDns}`, "xsd:string"],
                            ["Device.DNS.Config.DNSServers", `${priDns},${secDns}`, "xsd:string"],
                            ["Device.DHCPv4.Server.Pool.1.DNSServers", `${priDns},${secDns}`, "xsd:string"]
                        ]})
                    });
                    await socket.sendMessage(remoteJid, { text:
                        `✅ *DNS alterado com sucesso!*\n\n` +
                        `🔵 *DNS Primário:* ${priDns}\n` +
                        `🔵 *DNS Secundário:* ${secDns}\n\n` +
                        `_Os dispositivos da sua rede vão usar o novo DNS na próxima reconexão._`
                    });
                    // Volta para o menu
                    await redis.set(tr069StateKey, JSON.stringify({ ...tr069Data, phase: "awaiting_action" }), "EX", 600);
                    return await executeNode(nodeId, "");
                }

                // ──── FASE 6B: DNS personalizado — pede primário ─────────────
                if (tr069Data.phase === "awaiting_dns_custom_pri" && inputMsg) {
                    const priDns = inputMsg.trim();
                    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                    if (!ipRegex.test(priDns)) {
                        await socket.sendMessage(remoteJid, { text: "⚠️ IP inválido. Digite um IP válido (ex: 1.1.1.1):" });
                        return nodeId;
                    }
                    await socket.sendMessage(remoteJid, { text: `✅ DNS Primário: *${priDns}*\n\nAgora digite o *DNS Secundário* (ex: 1.0.0.1):` });
                    await redis.set(tr069StateKey, JSON.stringify({ ...tr069Data, phase: "awaiting_dns_custom_sec", priDns }), "EX", 600);
                    return nodeId;
                }

                // ──── FASE 6C: DNS personalizado — pede secundário e aplica ──
                if (tr069Data.phase === "awaiting_dns_custom_sec" && inputMsg) {
                    const secDns = inputMsg.trim();
                    const priDns = tr069Data.priDns || "8.8.8.8";
                    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                    if (!ipRegex.test(secDns)) {
                        await socket.sendMessage(remoteJid, { text: "⚠️ IP inválido. Digite um IP válido (ex: 1.0.0.1):" });
                        return nodeId;
                    }
                    await socket.sendMessage(remoteJid, { text: `⏳ Aplicando DNS personalizado *${priDns} / ${secDns}*...` });
                    await fetch(`${GENIEACS_URL}/devices/${encodeURIComponent(tr069Data.deviceId)}/tasks?connection_request`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: "setParameterValues", parameterValues: [
                            ["InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.DNSServers", `${priDns},${secDns}`, "xsd:string"],
                            ["InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.DNSServers", `${priDns},${secDns}`, "xsd:string"],
                            ["Device.DNS.Config.DNSServers", `${priDns},${secDns}`, "xsd:string"],
                            ["Device.DHCPv4.Server.Pool.1.DNSServers", `${priDns},${secDns}`, "xsd:string"]
                        ]})
                    });
                    await socket.sendMessage(remoteJid, { text:
                        `✅ *DNS personalizado aplicado com sucesso!*\n\n` +
                        `🔵 *DNS Primário:* ${priDns}\n` +
                        `🔵 *DNS Secundário:* ${secDns}\n\n` +
                        `_Os dispositivos da sua rede vão usar o novo DNS na próxima reconexão._`
                    });
                    // Volta para o menu
                    await redis.set(tr069StateKey, JSON.stringify({ ...tr069Data, phase: "awaiting_action" }), "EX", 600);
                    return await executeNode(nodeId, "");
                }

                // ──── FASE 7: Voltar ao menu ─────────────────────────────────
                if (tr069Data.phase === "awaiting_back_to_menu" && inputMsg) {
                    const choice = inputMsg.trim();
                    if (choice === "0" || choice.toLowerCase() === "voltar") {
                        await redis.set(tr069StateKey, JSON.stringify({ ...tr069Data, phase: "awaiting_action" }), "EX", 600);
                        return await executeNode(nodeId, "");
                    } else {
                        // Se digitar qualquer outra coisa, encerra o TR-069 e vai para o próximo nó (para não travar)
                        await redis.del(tr069StateKey);
                        const edge = edges.find((e: any) => e.source === nodeId);
                        if (edge) return await executeNode(edge.target);
                        return null;
                    }
                }

                // Fallback — limpa estado e avança
                await redis.del(tr069StateKey);
                const edge613 = edges.find((e: any) => e.source === nodeId);
                if (edge613) return await executeNode(edge613.target);
                return null;
            }

            // ── END NODE ─────────────────────────────────────
            if (node.type === "endNode") {
                await prisma.ticket.update({ where: { id: ticketId }, data: { status: "closed" } });
                await redis.del(`flowCtx:${ticketId}`);
                return null;
            }

            // Nó desconhecido — continua pelo edge
            const edge = edges.find((e: any) => e.source === nodeId);
            if (edge) return await executeNode(edge.target);
            return null;
        };

        // ── Resolve o nó inicial ──────────────────────────
        let targetNode = "start";
        let isFirstMessage = false;

        if (currentNodeId === "start") {
            const startEdge = edges.find((e: any) => e.source === "start");
            if (!startEdge) return false;
            targetNode = startEdge.target;
            isFirstMessage = true;
        } else {
            targetNode = currentNodeId;
        }

        const finalNodeId = await executeNode(targetNode, isFirstMessage ? undefined : body);

        if (finalNodeId) {
            await redis.set(stateKey, finalNodeId, "EX", 86400);
        } else {
            await redis.del(stateKey);
        }

        return true;
    } catch (e) {
        logger.error("[Flow] Erro ao processar:", e);
        return false;
    }
};
