import { Router } from "express";
import { isAuth } from "../middleware/isAuth.js";
import prisma from "../libs/prisma.js";

const flowRoutes = Router();

// Listar fluxos da empresa
flowRoutes.get("/", isAuth, async (req, res) => {
    const flows = await prisma.flow.findMany({
        where: { companyId: req.user.companyId },
        orderBy: { updatedAt: "desc" }
    });
    return res.json(flows);
});

// Buscar fluxo por ID
flowRoutes.get("/:id", isAuth, async (req, res) => {
    const flow = await prisma.flow.findFirst({
        where: { id: Number(req.params.id), companyId: req.user.companyId }
    });
    if (!flow) return res.status(404).json({ error: "Flow não encontrado" });
    return res.json(flow);
});

// Buscar estatísticas de uso por nó
flowRoutes.get("/:id/stats", isAuth, async (req, res) => {
    const stats = await prisma.flowNodeInteraction.findMany({
        where: { flowId: Number(req.params.id) }
    });
    const formatted = stats.reduce((acc: any, curr: any) => {
        acc[curr.nodeId] = curr.count;
        return acc;
    }, {});
    return res.json(formatted);
});


// Criar fluxo
flowRoutes.post("/", isAuth, async (req, res) => {
    const { name, whatsappId } = req.body;
    const flow = await prisma.flow.create({
        data: {
            name,
            companyId: req.user.companyId,
            whatsappId: whatsappId ? Number(whatsappId) : null,
            nodes: JSON.stringify([
                {
                    id: "start",
                    type: "startNode",
                    position: { x: 250, y: 50 },
                    data: { label: "Início" }
                }
            ]),
            edges: "[]"
        }
    });
    return res.json(flow);
});

// Salvar/atualizar fluxo (nós + arestas)
flowRoutes.put("/:id", isAuth, async (req, res) => {
    const { name, nodes, edges, active, whatsappId } = req.body;
    try {
        const flow = await prisma.flow.update({
            where: { id: Number(req.params.id) },
            data: {
                ...(name && { name }),
                ...(nodes !== undefined && { nodes: JSON.stringify(nodes) }),
                ...(edges !== undefined && { edges: JSON.stringify(edges) }),
                ...(active !== undefined && { active }),
                ...(whatsappId !== undefined && { whatsappId: whatsappId ? Number(whatsappId) : null }),
                updatedAt: new Date()
            }
        });
        return res.json(flow);
    } catch {
        return res.status(404).json({ error: "Flow não encontrado" });
    }
});

// Excluir fluxo
flowRoutes.delete("/:id", isAuth, async (req, res) => {
    await prisma.flow.delete({ where: { id: Number(req.params.id) } });
    return res.json({ ok: true });
});

export default flowRoutes;
