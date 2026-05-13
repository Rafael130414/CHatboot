"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ReactFlow, addEdge, useNodesState, useEdgesState,
    Controls, MiniMap, Background, BackgroundVariant,
    Handle, Position, Connection, type Node, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import api from "@/services/api";
import {
    Plus, Save, Trash2, Play, MessageSquare, GitBranch, Zap,
    Users, ArrowLeft, Power, ChevronRight, Clock, Code,
    BrainCircuit, Terminal, X, Settings2, LayoutGrid, Workflow,
    Image as ImageIcon, Music, FileText, Globe, Variable, Tag as TagIcon, Copy, Undo2, Redo2,
    ArrowRightLeft, Unlink
} from "lucide-react";
import { toast } from "sonner";

// ── Estilos base dos nós ──────────────────────────────
const nBase = "rounded-2xl border shadow-2xl text-white text-xs font-semibold min-w-[200px] transition-all duration-200";

// ── Componentes dos Nós ───────────────────────────────

const StartNode = ({ data }: NodeProps) => (
    <div className={`${nBase} p-4`} style={{ background: "linear-gradient(135deg,#00c9a7,#0088ff)", border: "1px solid rgba(0,201,167,0.5)", boxShadow: "0 8px 32px rgba(0,201,167,0.3)" }}>
        <Handle type="source" position={Position.Bottom} className="!bg-white !w-3 !h-3" />
        <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="font-bold">Início do Fluxo</span>
        </div>
        <p className="text-[10px] font-normal mt-1 opacity-80">Ponto de entrada</p>
    </div>
);

const MessageNode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-4`} style={{
        background: "rgba(10,22,40,0.95)", border: `1px solid ${selected ? "#00c9a7" : "rgba(0,201,167,0.2)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(0,201,167,0.4), 0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <Handle type="target" position={Position.Top} className="!bg-[#00c9a7] !w-3 !h-3" />
        <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,201,167,0.15)" }}>
                <MessageSquare className="w-3.5 h-3.5 text-[#00c9a7]" />
            </div>
            <span style={{ color: "#00c9a7" }}>Mensagem</span>
        </div>
        <p className="text-[11px] text-slate-400 font-normal leading-relaxed whitespace-pre-wrap max-w-[200px] truncate">
            {(data as any).message || "Clique para editar..."}
        </p>
        <Handle type="source" position={Position.Bottom} className="!bg-[#00c9a7] !w-3 !h-3" />
    </div>
);

const MenuNode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-4`} style={{
        background: "rgba(10,22,40,0.95)", border: `1px solid ${selected ? "#3b82f6" : "rgba(59,130,246,0.25)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(59,130,246,0.4), 0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <Handle type="target" position={Position.Top} className="!bg-[#3b82f6] !w-3 !h-3" />
        <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
                <GitBranch className="w-3.5 h-3.5 text-[#3b82f6]" />
            </div>
            <span style={{ color: "#3b82f6" }}>Menu de Opções</span>
        </div>
        <p className="text-[10px] text-slate-400 font-normal mb-2.5 leading-relaxed">{(data as any).message || "Escolha uma opção:"}</p>
        <div className="space-y-1.5">
            {((data as any).options || ["Opção 1", "Opção 2"]).map((opt: string, i: number) => (
                <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    <span className="text-[10px] font-black" style={{ color: "#3b82f6" }}>{i + 1}.</span>
                    <span className="text-[10px] text-white">{opt}</span>
                </div>
            ))}
        </div>
        {((data as any).options || ["Opção 1", "Opção 2"]).map((_: string, i: number) => (
            <Handle key={i} type="source" position={Position.Bottom} id={`option-${i}`}
                style={{ left: `${((i + 1) / (((data as any).options?.length || 2) + 1)) * 100}%` }}
                className="!bg-[#3b82f6] !w-3 !h-3" />
        ))}
    </div>
);

const TransferNode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-4`} style={{
        background: "rgba(10,22,40,0.95)", border: `1px solid ${selected ? "#8b5cf6" : "rgba(139,92,246,0.25)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(139,92,246,0.4), 0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <Handle type="target" position={Position.Top} className="!bg-[#8b5cf6] !w-3 !h-3" />
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                <Users className="w-3.5 h-3.5 text-[#8b5cf6]" />
            </div>
            <span style={{ color: "#8b5cf6" }}>Transferir</span>
        </div>
        <p className="text-[10px] text-slate-500 font-normal mt-1.5">→ {(data as any).departmentName || "Selecione departamento"}</p>
        <Handle type="source" position={Position.Bottom} className="!bg-[#8b5cf6] !w-3 !h-3" />
    </div>
);

const EndNode = ({ data }: NodeProps) => (
    <div className={`${nBase} p-4`} style={{ background: "rgba(10,22,40,0.95)", border: "1px solid rgba(239,68,68,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
        <Handle type="target" position={Position.Top} className="!bg-red-500 !w-3 !h-3" />
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                <Power className="w-3.5 h-3.5 text-red-400" />
            </div>
            <span className="text-red-400">Encerrar</span>
        </div>
        <p className="text-[10px] text-slate-500 font-normal mt-1">Finaliza o fluxo automático</p>
    </div>
);

const DelayNode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-4`} style={{
        background: "rgba(10,22,40,0.95)", border: `1px solid ${selected ? "#06b6d4" : "rgba(6,182,212,0.25)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(6,182,212,0.4), 0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-3 !h-3" />
        <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(6,182,212,0.15)" }}>
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="text-cyan-400">Aguardar</span>
        </div>
        <p className="text-[11px] text-slate-400 font-normal">{(data as any).delay || "1000"} ms</p>
        <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-3 !h-3" />
    </div>
);

const ConditionNode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-4`} style={{
        background: "rgba(10,22,40,0.95)", border: `1px solid ${selected ? "#f59e0b" : "rgba(245,158,11,0.25)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(245,158,11,0.4), 0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-3 !h-3" />
        <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                <Code className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-amber-400">Condição (SE)</span>
        </div>
        <p className="text-[9px] text-slate-500 font-normal truncate max-w-[160px]">
            {(data as any).variable || "msg"} {(data as any).operator || "contém"} {(data as any).value || "valor"}
        </p>
        <div className="flex justify-between mt-3">
            <span className="text-[9px] text-emerald-400 font-bold">✓ Sim</span>
            <span className="text-[9px] text-red-400 font-bold">✗ Não</span>
        </div>
        <Handle type="source" position={Position.Bottom} id="true" style={{ left: '25%' }} className="!bg-emerald-400 !w-3 !h-3" />
        <Handle type="source" position={Position.Bottom} id="false" style={{ left: '75%' }} className="!bg-red-400 !w-3 !h-3" />
    </div>
);

const SwitchNode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-4`} style={{
        background: "rgba(10,22,40,0.95)", border: `1px solid ${selected ? "#f59e0b" : "rgba(245,158,11,0.25)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(245,158,11,0.4), 0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-3 !h-3" />
        <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-amber-400">Switch / Router</span>
        </div>
        <div className="space-y-1.5 min-h-[40px]">
            {((data as any).rules || []).map((rule: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-[9px] text-slate-400 truncate max-w-[120px]">{rule.value || "Regra"}</span>
                    <Handle type="source" position={Position.Right} id={`rule-${i}`}
                        style={{ top: `${20 + (i * 24)}px`, right: '-6px' }}
                        className="!bg-amber-400 !w-2 !h-2" />
                </div>
            ))}
            <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-[9px] text-slate-500 italic">Padrão</span>
                <Handle type="source" position={Position.Right} id="default"
                    style={{ bottom: '15px', right: '-6px', top: 'auto' }}
                    className="!bg-slate-500 !w-2 !h-2" />
            </div>
        </div>
    </div>
);

const LoopNode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-4`} style={{
        background: "rgba(10,22,40,0.95)", border: `1px solid ${selected ? "#0ea5e9" : "rgba(14,165,233,0.25)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(14,165,233,0.4), 0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <Handle type="target" position={Position.Top} className="!bg-sky-400 !w-3 !h-3" />
        <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(14,165,233,0.15)" }}>
                <Undo2 className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <span className="text-sky-400">Loop / Repetir</span>
        </div>
        <p className="text-[10px] text-slate-500 font-normal">Máximo: <span className="text-white">{(data as any).maxLoops || 3}x</span></p>
        <div className="flex justify-between mt-3">
            <span className="text-[9px] text-sky-400 font-bold">↻ Loop</span>
            <span className="text-[9px] text-slate-500 font-bold">➡ Sair</span>
        </div>
        <Handle type="source" position={Position.Bottom} id="loop" style={{ left: '25%' }} className="!bg-sky-400 !w-3 !h-3" />
        <Handle type="source" position={Position.Bottom} id="exit" style={{ left: '75%' }} className="!bg-slate-500 !w-3 !h-3" />
    </div>
);

const AINode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-4`} style={{
        background: "rgba(10,22,40,0.95)", border: `1px solid ${selected ? "#a855f7" : "rgba(168,85,247,0.25)"}`,
        boxShadow: selected ? "0 0 0 2px rgba(168,85,247,0.4), 0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <Handle type="target" position={Position.Top} className="!bg-[#a855f7] !w-3 !h-3" />
        <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)" }}>
                <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <span className="text-purple-400">IA Inteligente</span>
        </div>
        <p className="text-[9px] text-slate-500 font-normal italic truncate max-w-[180px]">
            {(data as any).prompt || "Configure o prompt..."}
        </p>
        <Handle type="source" position={Position.Bottom} className="!bg-[#a855f7] !w-3 !h-3" />
    </div>
);

const makeNode = (color: string, bg: string, Icon: any, label: string, previewFn: (d: any) => string, hasTarget = true) =>
    ({ data, selected }: NodeProps) => (
        <div className="rounded-2xl border shadow-2xl text-white text-xs font-semibold min-w-[200px] p-4" style={{
            background: "rgba(10,22,40,0.95)",
            border: `1px solid ${selected ? color : bg}`,
            boxShadow: selected ? `0 0 0 2px ${color}40, 0 8px 32px rgba(0,0,0,0.4)` : "0 8px 32px rgba(0,0,0,0.3)"
        }}>
            {hasTarget && <Handle type="target" position={Position.Top} className="!w-3 !h-3" style={{ background: color }} />}
            <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <span style={{ color }}>{label}</span>
            </div>
            <p className="text-[10px] text-slate-500 font-normal truncate max-w-[180px]">{previewFn(data as any)}</p>
            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3" style={{ background: color }} />
        </div>
    );

const ImageNode = makeNode("#ec4899", "rgba(236,72,153,0.25)", ImageIcon, "Imagem", d => d.url || "URL da imagem...");
const AudioNode = makeNode("#f97316", "rgba(249,115,22,0.25)", Music, "Áudio", d => d.url || "URL do áudio...");
const DocumentNode = makeNode("#64748b", "rgba(100,116,139,0.25)", FileText, "Documento", d => d.fileName || "Nome do arquivo...");
const HTTPNode = makeNode("#06b6d4", "rgba(6,182,212,0.25)", Globe, "HTTP Request", d => `${d.method || "GET"} ${d.url || "URL..."}`);
const SetVariableNode = makeNode("#eab308", "rgba(234,179,8,0.25)", Variable, "Definir Variável", d => d.varName ? `{{${d.varName}}} = ${d.varValue || ""}` : "Configure a variável...");
const TagNode = makeNode("#10b981", "rgba(16,185,129,0.25)", TagIcon, "Adicionar Tag", d => d.tagName || "Nome da tag...");

const nodeTypes = {
    startNode: StartNode, messageNode: MessageNode, menuNode: MenuNode,
    transferNode: TransferNode, endNode: EndNode, delayNode: DelayNode,
    conditionNode: ConditionNode, aiNode: AINode,
    imageNode: ImageNode, audioNode: AudioNode, documentNode: DocumentNode,
    httpNode: HTTPNode, setVariableNode: SetVariableNode, tagNode: TagNode,
    switchNode: SwitchNode, loopNode: LoopNode,
};

// ── Painel de Edição do Nó ──────────────────────────
const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem", padding: "0.625rem 0.875rem", color: "#e2e8f0", fontSize: "0.8rem", width: "100%", outline: "none", transition: "border-color 0.2s" };
const labelStyle = { display: "block", fontSize: "0.65rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: "0.5rem" };

function NodePanel({ node, departments, onUpdate, onDelete }: { node: Node | null; departments: any[]; onUpdate: (id: string, data: any) => void; onDelete: (id: string) => void; }) {
    if (!node || node.type === "startNode") return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,201,167,0.08)", border: "1px solid rgba(0,201,167,0.12)" }}>
                <Settings2 className="w-6 h-6 text-slate-600" />
            </div>
            <div>
                <p className="text-sm font-semibold text-slate-400">Selecione um nó</p>
                <p className="text-xs text-slate-600 mt-1">Clique em qualquer nó para editar suas propriedades</p>
            </div>
        </div>
    );

    const d = node.data as any;
    const nodeColors: Record<string, string> = {
        messageNode: "#00c9a7", menuNode: "#3b82f6", delayNode: "#06b6d4",
        conditionNode: "#f59e0b", switchNode: "#f59e0b", loopNode: "#0ea5e9", aiNode: "#a855f7", transferNode: "#8b5cf6", endNode: "#ef4444",
        imageNode: "#ec4899", audioNode: "#f97316", documentNode: "#64748b",
        httpNode: "#06b6d4", setVariableNode: "#eab308", tagNode: "#10b981"
    };
    const color = nodeColors[node.type || ""] || "#00c9a7";

    const disconnectOutputs = () => {
        onUpdate(node.id, { ...d, _disconnect: Date.now() });
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <Settings2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">Editar Nó</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{node.id.split('-')[0]}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={disconnectOutputs} title="Desconectar Saídas" className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all">
                        <Unlink className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(node.id)} title="Excluir Nó" className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                {node.type === "messageNode" && (
                    <div>
                        <label style={labelStyle}>Mensagem do Bot</label>
                        <textarea rows={6} style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
                            value={d.message || ""} placeholder="Digite a mensagem que o bot vai enviar..."
                            onChange={e => onUpdate(node.id, { ...d, message: e.target.value })} />
                        <p className="text-[10px] text-slate-600 mt-1.5">Use {`{{nome}}`} para o nome do contato</p>
                    </div>
                )}

                {node.type === "delayNode" && (
                    <div>
                        <label style={labelStyle}>Tempo de Espera (ms)</label>
                        <input type="number" style={inputStyle}
                            value={d.delay || 1000}
                            onChange={e => onUpdate(node.id, { ...d, delay: parseInt(e.target.value) })} />
                        <p className="text-[10px] text-slate-600 mt-1.5">1000ms = 1 segundo</p>
                    </div>
                )}

                {node.type === "loopNode" && (
                    <div className="space-y-4">
                        <div>
                            <label style={labelStyle}>Máximo de Repetições</label>
                            <input type="number" placeholder="Ex: 3" value={d.maxLoops || 3} onChange={e => onUpdate(node.id, { ...d, maxLoops: parseInt(e.target.value) })} style={inputStyle} />
                            <p className="text-[10px] text-slate-500 mt-2">O fluxo seguirá pelo handle 'Sair' após atingir este limite.</p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ background: "rgba(14,165,233,0.05)", border: "1px dashed rgba(14,165,233,0.2)" }}>
                            <p className="text-[10px] text-sky-400 font-bold flex items-center gap-2">
                                <Settings2 className="w-3 h-3" /> Dica de Uso
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">Conecte o handle 'Loop' de volta a um nó anterior para repetir a pergunta.</p>
                        </div>
                    </div>
                )}

                {node.type === "switchNode" && (
                    <div className="space-y-4">
                        <label style={labelStyle}>Regras de Roteamento</label>
                        <p className="text-[10px] text-slate-500 -mt-2 mb-2">Se a mensagem bater com a regra, o fluxo segue pelo handle lateral.</p>
                        {(d.rules || []).map((rule: any, i: number) => (
                            <div key={i} className="p-3 rounded-xl space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-amber-500/80">Regra #{i + 1}</span>
                                    <button onClick={() => {
                                        const r = [...(d.rules || [])];
                                        r.splice(i, 1);
                                        onUpdate(node.id, { ...d, rules: r });
                                    }} className="text-red-400 hover:text-red-300">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                                <select value={rule.operator || "contém"} onChange={e => {
                                    const r = [...(d.rules || [])];
                                    r[i].operator = e.target.value;
                                    onUpdate(node.id, { ...d, rules: r });
                                }} style={inputStyle}>
                                    <option value="contém">Contém</option>
                                    <option value="igual">Igual a</option>
                                    <option value="começa com">Começa com</option>
                                    <option value="termina com">Termina com</option>
                                </select>
                                <input placeholder="Valor para bater..." value={rule.value || ""} onChange={e => {
                                    const r = [...(d.rules || [])];
                                    r[i].value = e.target.value;
                                    onUpdate(node.id, { ...d, rules: r });
                                }} style={inputStyle} />
                            </div>
                        ))}
                        <button onClick={() => onUpdate(node.id, { ...d, rules: [...(d.rules || []), { operator: "contém", value: "" }] })}
                            className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 text-slate-500 text-[10px] font-bold hover:border-amber-500/50 hover:text-amber-500 transition-all">
                            + Adicionar Regra
                        </button>
                    </div>
                )}

                {node.type === "conditionNode" && (
                    <>
                        <div>
                            <label style={labelStyle}>Campo / Variável</label>
                            <select style={{ ...inputStyle, cursor: "pointer" }}
                                value={d.variable || "msg"}
                                onChange={e => onUpdate(node.id, { ...d, variable: e.target.value })}>
                                <option value="msg">Mensagem do Cliente</option>
                                <option value="nome">Nome do Contato</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Operador</label>
                            <select style={{ ...inputStyle, cursor: "pointer" }}
                                value={d.operator || "contém"}
                                onChange={e => onUpdate(node.id, { ...d, operator: e.target.value })}>
                                <option value="contém">Contém</option>
                                <option value="igual">É igual a</option>
                                <option value="começa com">Começa com</option>
                                <option value="termina com">Termina com</option>
                                <option value="maior que">Maior que (número)</option>
                                <option value="menor que">Menor que (número)</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Valor esperado</label>
                            <input style={inputStyle} value={d.value || ""}
                                onChange={e => onUpdate(node.id, { ...d, value: e.target.value })}
                                placeholder="Digite o valor..." />
                        </div>
                    </>
                )}

                {node.type === "aiNode" && (
                    <div>
                        <label style={labelStyle}>Prompt (Instruções da IA)</label>
                        <textarea rows={7} style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
                            value={d.prompt || ""} placeholder="Ex: Você é um assistente de vendas. Responda educadamente..."
                            onChange={e => onUpdate(node.id, { ...d, prompt: e.target.value })} />
                    </div>
                )}

                {node.type === "menuNode" && (
                    <>
                        <div>
                            <label style={labelStyle}>Texto do Menu</label>
                            <textarea rows={3} style={{ ...inputStyle, resize: "none" }}
                                value={d.message || ""} placeholder="Escolha uma opção:"
                                onChange={e => onUpdate(node.id, { ...d, message: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Opções (uma por linha)</label>
                            <textarea rows={5} style={{ ...inputStyle, resize: "none" }}
                                value={(d.options || []).join("\n")} placeholder={"Suporte\nFinanceiro\nVendas"}
                                onChange={e => onUpdate(node.id, { ...d, options: e.target.value.split("\n") })} />
                            <p className="text-[10px] text-slate-600 mt-1.5">Cada linha = uma opção de saída no nó</p>
                        </div>
                    </>
                )}

                {node.type === "transferNode" && (
                    <div>
                        <label style={labelStyle}>Transferir para departamento</label>
                        <select style={{ ...inputStyle, cursor: "pointer" }}
                            value={d.departmentId || ""}
                            onChange={e => {
                                const dep = departments.find(dep => dep.id === Number(e.target.value));
                                onUpdate(node.id, { ...d, departmentId: Number(e.target.value), departmentName: dep?.name });
                            }}>
                            <option value="">Selecione um departamento...</option>
                            {departments.map(dep => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
                        </select>
                        <p className="text-[10px] text-slate-600 mt-1.5">Após a transferência, o fluxo continua pelo conector inferior</p>
                    </div>
                )}

                {node.type === "imageNode" && (
                    <>
                        <div>
                            <label style={labelStyle}>URL da Imagem</label>
                            <input style={inputStyle} value={d.url || ""} placeholder="https://exemplo.com/imagem.jpg"
                                onChange={e => onUpdate(node.id, { ...d, url: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Legenda (opcional)</label>
                            <input style={inputStyle} value={d.caption || ""} placeholder="Texto abaixo da imagem..."
                                onChange={e => onUpdate(node.id, { ...d, caption: e.target.value })} />
                            <p className="text-[10px] text-slate-600 mt-1.5">Use {`{{nome}}`} nas legendas</p>
                        </div>
                    </>
                )}

                {node.type === "audioNode" && (
                    <>
                        <div>
                            <label style={labelStyle}>URL do Áudio</label>
                            <input style={inputStyle} value={d.url || ""} placeholder="https://exemplo.com/audio.mp3"
                                onChange={e => onUpdate(node.id, { ...d, url: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <input type="checkbox" id="ptt" checked={d.ptt ?? true}
                                onChange={e => onUpdate(node.id, { ...d, ptt: e.target.checked })} />
                            <label htmlFor="ptt" className="text-xs text-slate-300">Enviar como mensagem de voz (PTT)</label>
                        </div>
                    </>
                )}

                {node.type === "documentNode" && (
                    <>
                        <div>
                            <label style={labelStyle}>URL do Arquivo</label>
                            <input style={inputStyle} value={d.url || ""} placeholder="https://exemplo.com/arquivo.pdf"
                                onChange={e => onUpdate(node.id, { ...d, url: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Nome do Arquivo</label>
                            <input style={inputStyle} value={d.fileName || ""} placeholder="relatorio.pdf"
                                onChange={e => onUpdate(node.id, { ...d, fileName: e.target.value })} />
                        </div>
                    </>
                )}

                {node.type === "httpNode" && (
                    <>
                        <div className="flex gap-2">
                            <div style={{ width: "100px" }}>
                                <label style={labelStyle}>Método</label>
                                <select style={{ ...inputStyle, cursor: "pointer" }} value={d.method || "GET"}
                                    onChange={e => onUpdate(node.id, { ...d, method: e.target.value })}>
                                    <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>URL</label>
                                <input style={inputStyle} value={d.url || ""} placeholder="https://api.exemplo.com/"
                                    onChange={e => onUpdate(node.id, { ...d, url: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Headers (JSON)</label>
                            <textarea rows={3} style={{ ...inputStyle, resize: "none", fontFamily: "monospace", fontSize: "0.75rem" }}
                                value={d.headers || '{"Content-Type":"application/json"}'}
                                onChange={e => onUpdate(node.id, { ...d, headers: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Body (JSON)</label>
                            <textarea rows={4} style={{ ...inputStyle, resize: "none", fontFamily: "monospace", fontSize: "0.75rem" }}
                                value={d.body || ""} placeholder='{"chave":"{{variavel}}"}'
                                onChange={e => onUpdate(node.id, { ...d, body: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Salvar resposta em variável</label>
                            <input style={inputStyle} value={d.saveToVar || ""} placeholder="resposta_api"
                                onChange={e => onUpdate(node.id, { ...d, saveToVar: e.target.value })} />
                            <p className="text-[10px] text-slate-600 mt-1.5">Use {`{{resposta_api}}`} nos próximos nós</p>
                        </div>
                    </>
                )}

                {node.type === "setVariableNode" && (
                    <>
                        <div>
                            <label style={labelStyle}>Nome da Variável</label>
                            <input style={inputStyle} value={d.varName || ""} placeholder="nome_variavel"
                                onChange={e => onUpdate(node.id, { ...d, varName: e.target.value })} />
                            <p className="text-[10px] text-slate-600 mt-1.5">Acesse com {`{{nome_variavel}}`}</p>
                        </div>
                        <div>
                            <label style={labelStyle}>Valor</label>
                            <input style={inputStyle} value={d.varValue || ""} placeholder="valor fixo ou {{outra_variavel}}"
                                onChange={e => onUpdate(node.id, { ...d, varValue: e.target.value })} />
                        </div>
                    </>
                )}

                {node.type === "tagNode" && (
                    <div>
                        <label style={labelStyle}>Nome da Tag</label>
                        <input style={inputStyle} value={d.tagName || ""} placeholder="Ex: Lead Qualificado"
                            onChange={e => onUpdate(node.id, { ...d, tagName: e.target.value })} />
                        <p className="text-[10px] text-slate-600 mt-1.5">A tag será adicionada automaticamente ao contato</p>
                    </div>
                )}

                {/* Variáveis disponíveis */}
                <div className="p-3 rounded-xl" style={{ background: "rgba(0,201,167,0.05)", border: "1px solid rgba(0,201,167,0.1)" }}>
                    <p className="text-[10px] font-bold text-emerald-500 mb-2">📌 Variáveis disponíveis</p>
                    <div className="grid grid-cols-2 gap-1">
                        {["{{nome}}", "{{telefone}}", "{{ticket_id}}"].map(v => (
                            <span key={v} className="text-[9px] font-mono px-2 py-1 rounded-lg text-emerald-400" style={{ background: "rgba(0,201,167,0.08)" }}>{v}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Página Principal ─────────────────────────────────
export default function FlowbuilderPage() {
    const [flows, setFlows] = useState<any[]>([]);
    const [activeFlow, setActiveFlow] = useState<any>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [departments, setDepartments] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [whatsapps, setWhatsapps] = useState<any[]>([]);
    const [newFlowName, setNewFlowName] = useState("");
    const [showNewForm, setShowNewForm] = useState(false);
    const [activeWhatsappId, setActiveWhatsappId] = useState<number | "">("");
    const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
    const [codeValue, setCodeValue] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);

    // ── Simulador ───────────────────────────────────
    const [isSimulating, setIsSimulating] = useState(false);
    const [simMessages, setSimMessages] = useState<{ role: 'bot' | 'user', text: string, type?: string, url?: string }[]>([]);
    const [simContext, setSimContext] = useState<any>({ variables: {}, name: "Simulador", phone: "55119999999" });
    const [activeSimNodeId, setActiveSimNodeId] = useState<string | null>(null);
    const [simInput, setSimInput] = useState("");

    // ── Undo/Redo history ────────────────────────────
    const historyRef = useRef<{ nodes: Node[], edges: any[] }[]>([]);
    const historyIdxRef = useRef(-1);

    const pushHistory = useCallback((n: Node[], e: any[]) => {
        historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
        historyRef.current.push({ nodes: JSON.parse(JSON.stringify(n)), edges: JSON.parse(JSON.stringify(e)) });
        historyIdxRef.current = historyRef.current.length - 1;
    }, []);

    const undo = useCallback(() => {
        if (historyIdxRef.current <= 0) return;
        historyIdxRef.current--;
        const snap = historyRef.current[historyIdxRef.current];
        setNodes(snap.nodes); setEdges(snap.edges);
        toast.info("Desfeito", { duration: 1000 });
    }, [setNodes, setEdges]);

    const redo = useCallback(() => {
        if (historyIdxRef.current >= historyRef.current.length - 1) return;
        historyIdxRef.current++;
        const snap = historyRef.current[historyIdxRef.current];
        setNodes(snap.nodes); setEdges(snap.edges);
        toast.info("Refeito", { duration: 1000 });
    }, [setNodes, setEdges]);

    // ── Lógica do Simulador ────────────────────────
    const startSimulation = () => {
        setSimMessages([]);
        setSimContext({ variables: {}, name: "João Simulator", phone: "55119999999" });
        setIsSimulating(true);
        const startNode = nodes.find(n => n.type === 'startNode');
        if (startNode) processSimStep(startNode.id, "");
    };

    const processSimStep = (nodeId: string, input: string) => {
        setActiveSimNodeId(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const data = node.data as any;
        const ctx = simContext;

        const interpolate = (text: string, c: any) => {
            if (!text) return "";
            let res = text.replace(/{{nome}}/g, c.name)
                .replace(/{{telefone}}/g, c.phone)
                .replace(/{{msg}}/g, c.lastMessage || "");

            Object.keys(c.variables || {}).forEach(k => {
                const regex = new RegExp(`{{${k}}}`, 'g');
                res = res.replace(regex, String(c.variables[k]));
            });
            return res;
        };

        if (input) ctx.lastMessage = input;

        if (node.type === "startNode") {
            const edge = edges.find(e => e.source === nodeId);
            if (edge) processSimStep(edge.target, input);
        }
        else if (node.type === "messageNode") {
            setSimMessages(prev => [...prev, { role: 'bot', text: interpolate(data.message, ctx) }]);
            const edge = edges.find(e => e.source === nodeId);
            if (edge) setTimeout(() => processSimStep(edge.target, ""), 800);
        }
        else if (node.type === "imageNode" || node.type === "audioNode" || node.type === "documentNode") {
            setSimMessages(prev => [...prev, { role: 'bot', text: interpolate(data.caption || "", ctx), type: node.type?.replace('Node', '') || 'image', url: data.url }]);
            const edge = edges.find(e => e.source === nodeId);
            if (edge) setTimeout(() => processSimStep(edge.target, ""), 800);
        }
        else if (node.type === "menuNode") {
            setSimMessages(prev => [...prev, { role: 'bot', text: `*${interpolate(data.message || "Escolha uma opção:", ctx)}*\n` + (data.options || []).map((o: string, i: number) => `${i + 1}. ${o}`).join("\n") }]);
        }
        else if (node.type === "conditionNode") {
            const val = interpolate(data.value || "", ctx).toLowerCase();
            const variable = data.variable || "msg";
            let inputVal = (variable === "msg" ? (input || ctx.lastMessage || "") : (ctx.variables[variable] || "")).toLowerCase();

            let matched = false;
            const operator = data.operator || "contém";
            if (operator === "contém") matched = inputVal.includes(val);
            else if (operator === "igual") matched = inputVal === val;
            else if (operator === "começa com") matched = inputVal.startsWith(val);
            else if (operator === "termina com") matched = inputVal.endsWith(val);
            else if (operator === "maior que") matched = Number(inputVal) > Number(val);
            else if (operator === "menor que") matched = Number(inputVal) < Number(val);

            const edge = edges.find(e => e.source === nodeId && e.sourceHandle === (matched ? 'true' : 'false'));
            if (edge) processSimStep(edge.target, "");
        }
        else if (node.type === "switchNode") {
            let matchedHandle = "default";
            const rules = data.rules || [];
            const inputVal = (input || ctx.lastMessage || "").toLowerCase();

            for (let i = 0; i < rules.length; i++) {
                const ruleVal = (rules[i].value || "").toLowerCase();
                const op = rules[i].operator || "contém";
                let ruleMatched = false;

                if (op === "contém") ruleMatched = inputVal.includes(ruleVal);
                else if (op === "igual") ruleMatched = inputVal === ruleVal;
                else if (op === "começa com") ruleMatched = inputVal.startsWith(ruleVal);
                else if (op === "termina com") ruleMatched = inputVal.endsWith(ruleVal);

                if (ruleMatched) { matchedHandle = `rule-${i}`; break; }
            }
            const edge = edges.find(e => e.source === nodeId && e.sourceHandle === matchedHandle);
            if (edge) processSimStep(edge.target, "");
        }
        else if (node.type === "setVariableNode") {
            if (data.varName) ctx.variables[data.varName] = interpolate(data.varValue || "", ctx);
            setSimContext({ ...ctx });
            const edge = edges.find(e => e.source === nodeId);
            if (edge) processSimStep(edge.target, "");
        }
        else if (node.type === "delayNode") {
            const ms = data.delay || 1000;
            setTimeout(() => {
                const edge = edges.find(e => e.source === nodeId);
                if (edge) processSimStep(edge.target, "");
            }, ms);
        }
        else if (node.type === "loopNode") {
            const max = data.maxLoops || 3;
            const countKey = `count:${nodeId}`;
            const current = ctx.variables[countKey] ? parseInt(ctx.variables[countKey]) : 0;
            let handle = "loop";
            if (current >= max) {
                handle = "exit";
                delete ctx.variables[countKey];
            } else {
                ctx.variables[countKey] = String(current + 1);
            }
            setSimContext({ ...ctx });
            const edge = edges.find(e => e.source === nodeId && e.sourceHandle === handle);
            if (edge) processSimStep(edge.target, "");
        }
        else if (node.type === "aiNode") {
            setSimMessages(prev => [...prev, { role: 'bot', text: "🤖 *[IA] Pensando...*" }]);
            setTimeout(() => {
                setSimMessages(prev => {
                    const filtered = prev.filter(m => m.text !== "🤖 *[IA] Pensando...*");
                    return [...filtered, { role: 'bot', text: "Olá! Sou a IA configurada neste nó. Esta é uma simulação da minha resposta baseada no seu prompt." }];
                });
                const edge = edges.find(e => e.source === nodeId);
                if (edge) processSimStep(edge.target, "");
            }, 1500);
        }
        else if (node.type === "httpNode") {
            setSimMessages(prev => [...prev, { role: 'bot', text: `🌐 *[HTTP] ${data.method || 'GET'} ${data.url || 'API'}*` }]);
            if (data.saveToVar) ctx.variables[data.saveToVar] = "res_simulada_json";
            setSimContext({ ...ctx });
            const edge = edges.find(e => e.source === nodeId);
            if (edge) setTimeout(() => processSimStep(edge.target, ""), 800);
        }
        else if (node.type === "tagNode") {
            setSimMessages(prev => [...prev, { role: 'bot', text: `🏷️ *[Tag] Adicionada: ${data.tagName || 'Tag'}*` }]);
            const edge = edges.find(e => e.source === nodeId);
            if (edge) setTimeout(() => processSimStep(edge.target, ""), 600);
        }
        else if (node.type === "transferNode") {
            setSimMessages(prev => [...prev, { role: 'bot', text: `*🔄 [Simulador] Transferindo para: ${data.departmentName || "Setor"}*` }]);
            const edge = edges.find(e => e.source === nodeId);
            if (edge) setTimeout(() => processSimStep(edge.target, ""), 800);
        }
        else if (node.type === "endNode") {
            setSimMessages(prev => [...prev, { role: 'bot', text: "🏁 *Fluxo encerrado.*" }]);
        }
    };

    const handleSimSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!simInput.trim() || !activeSimNodeId) return;
        const input = simInput;
        setSimMessages(prev => [...prev, { role: 'user', text: input }]);
        setSimInput("");

        const node = nodes.find(n => n.id === activeSimNodeId);
        if (node?.type === 'menuNode') {
            const data = node.data as any;
            const options = data.options || [];
            const index = parseInt(input) - 1;
            const matchedOption = options.find((o: string) => o.toLowerCase() === input.toLowerCase());
            let handle = null;
            if (!isNaN(index) && options[index]) handle = `option-${index}`;
            else if (matchedOption) handle = `option-${options.indexOf(matchedOption)}`;
            if (handle) {
                const edge = edges.find(e => e.source === activeSimNodeId && e.sourceHandle === handle);
                if (edge) setTimeout(() => processSimStep(edge.target, ""), 500);
            } else {
                setSimMessages(prev => [...prev, { role: 'bot', text: "❌ *Opção inválida.* Tente novamente." }]);
            }
        } else {
            // Tenta avançar para o próximo nó se houver uma conexão de saída
            const edge = edges.find(e => e.source === activeSimNodeId);
            if (edge) {
                processSimStep(edge.target, input);
            } else {
                // Se não houver saída, apenas processa no nó atual caso ele tenha lógica interna pendente
                processSimStep(activeSimNodeId, input);
            }
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (document.activeElement as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
            if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
            if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); if (selectedNode) duplicateNode(selectedNode); }
            if (e.key === "Delete" && selectedNode) deleteNodeById(selectedNode.id);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [undo, redo, selectedNode]);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => { loadFlows(); loadDepartments(); loadWhatsapps(); }, []);

    const loadFlows = async () => { try { const { data } = await api.get("/flows", { headers }); setFlows(data); } catch (e) { } };
    const loadDepartments = async () => { try { const { data } = await api.get("/departments", { headers }); setDepartments(data); } catch (e) { } };
    const loadWhatsapps = async () => { try { const { data } = await api.get("/whatsapp", { headers }); setWhatsapps(data); } catch (e) { } };

    const openFlow = (flow: any) => {
        setActiveFlow(flow); setNodes(JSON.parse(flow.nodes || "[]"));
        setEdges(JSON.parse(flow.edges || "[]")); setSelectedNode(null); setActiveWhatsappId(flow.whatsappId || "");
    };

    const createFlow = async () => {
        if (!newFlowName.trim()) return;
        const { data } = await api.post("/flows", { name: newFlowName }, { headers });
        setFlows(prev => [data, ...prev]); setNewFlowName(""); setShowNewForm(false); openFlow(data);
    };

    const saveFlow = async () => {
        if (!activeFlow) return;
        setSaving(true);
        try {
            const payload = { nodes, edges, whatsappId: activeWhatsappId === "" ? null : Number(activeWhatsappId) };
            const { data } = await api.put(`/flows/${activeFlow.id}`, payload, { headers });
            setFlows(prev => prev.map(f => f.id === activeFlow.id ? data : f));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (err) { alert("Erro ao salvar fluxo!"); } finally { setSaving(false); }
    };

    const toggleActive = async () => {
        if (!activeFlow) return;
        const newActive = !activeFlow.active;
        await api.put(`/flows/${activeFlow.id}`, { active: newActive }, { headers });
        setActiveFlow((f: any) => ({ ...f, active: newActive }));
        setFlows(prev => prev.map(f => f.id === activeFlow.id ? { ...f, active: newActive } : f));
    };

    const deleteFlow = async (id: number) => {
        await api.delete(`/flows/${id}`, { headers });
        setFlows(prev => prev.filter(f => f.id !== id));
        if (activeFlow?.id === id) { setActiveFlow(null); setNodes([]); setEdges([]); }
    };

    const onConnect = useCallback((params: Connection) => {
        const newEdges = addEdge({ ...params, id: `edge-${Date.now()}`, animated: true, type: "smoothstep", style: { stroke: "#00c9a7", strokeWidth: 1.5 } }, edges);
        setEdges(newEdges);
        pushHistory(nodes, newEdges);
    }, [setEdges, nodes, edges, pushHistory]);

    const addNode = (type: string) => {
        const defaults: Record<string, any> = {
            messageNode: { message: "Olá! Como posso te ajudar?" },
            menuNode: { message: "Escolha uma opção:", options: ["Suporte", "Financeiro"] },
            transferNode: { departmentName: "Selecione..." },
            endNode: {}, delayNode: { delay: 1000 },
            conditionNode: { variable: "msg", operator: "contém", value: "" },
            aiNode: { prompt: "Você é um assistente virtual..." },
            imageNode: { url: "", caption: "" },
            audioNode: { url: "", ptt: true },
            documentNode: { url: "", fileName: "arquivo.pdf" },
            httpNode: { method: "GET", url: "", headers: '{"Content-Type":"application/json"}', body: "", saveToVar: "resposta" },
            setVariableNode: { varName: "", varValue: "" },
            tagNode: { tagName: "" },
        };
        const newNode: Node = {
            id: `${type}-${Date.now()}`, type,
            position: { x: 200 + Math.random() * 200, y: 200 + nodes.length * 120 },
            data: defaults[type] || {}
        };
        const updated = [...nodes, newNode];
        setNodes(updated);
        pushHistory(updated, edges);
    };

    const duplicateNode = (node: Node) => {
        const newNode: Node = {
            ...JSON.parse(JSON.stringify(node)),
            id: `${node.type}-${Date.now()}`,
            position: { x: node.position.x + 40, y: node.position.y + 40 }
        };
        const updated = [...nodes, newNode];
        setNodes(updated);
        pushHistory(updated, edges);
        setSelectedNode(newNode);
    };

    const updateNodeData = (id: string, data: any) => {
        if (data._disconnect) {
            const updatedEdges = edges.filter((e: any) => e.source !== id);
            setEdges(updatedEdges);
            pushHistory(nodes, updatedEdges);
            const { _disconnect, ...cleanData } = data;
            setNodes(nds => nds.map(n => n.id === id ? { ...n, data: cleanData } : n));
            return;
        }
        setNodes(nds => nds.map(n => n.id === id ? { ...n, data } : n));
        setSelectedNode(prev => prev?.id === id ? { ...prev, data } as Node : prev);
    };

    const deleteNodeById = (id: string) => {
        const updatedNodes = nodes.filter(n => n.id !== id);
        const updatedEdges = edges.filter((e: any) => e.source !== id && e.target !== id);
        setNodes(updatedNodes); setEdges(updatedEdges);
        pushHistory(updatedNodes, updatedEdges);
        setSelectedNode(null);
    };

    const nodeButtons = [
        {
            group: "Básicos", items: [
                { type: "messageNode", icon: MessageSquare, label: "Mensagem", color: "#00c9a7", desc: "Envia texto ao cliente" },
                { type: "menuNode", icon: GitBranch, label: "Menu", color: "#3b82f6", desc: "Apresenta opções" },
                { type: "transferNode", icon: Users, label: "Transferir", color: "#8b5cf6", desc: "Muda departamento" },
                { type: "endNode", icon: Power, label: "Encerrar", color: "#ef4444", desc: "Finaliza o fluxo" },
            ]
        },
        {
            group: "Mídia", items: [
                { type: "imageNode", icon: ImageIcon, label: "Imagem", color: "#ec4899", desc: "Envia imagem" },
                { type: "audioNode", icon: Music, label: "Áudio", color: "#f97316", desc: "Envia áudio/voz" },
                { type: "documentNode", icon: FileText, label: "Documento", color: "#64748b", desc: "Envia arquivo" },
            ]
        },
        {
            group: "Lógica", items: [
                { type: "conditionNode", icon: Code, label: "Condição (SE)", color: "#f59e0b", desc: "Bifurca por condição" },
                { type: "switchNode", icon: ArrowRightLeft, label: "Switch Router", color: "#f59e0b", desc: "Múltiplas saídas" },
                { type: "loopNode", icon: Undo2, label: "Loop / Repetir", color: "#0ea5e9", desc: "Controle de repetição" },
                { type: "delayNode", icon: Clock, label: "Delay", color: "#06b6d4", desc: "Pausa o fluxo" },
                { type: "setVariableNode", icon: Variable, label: "Definir Variável", color: "#eab308", desc: "Cria variável" },
            ]
        },
        {
            group: "Avançados", items: [
                { type: "aiNode", icon: BrainCircuit, label: "IA", color: "#a855f7", desc: "Resposta com IA" },
                { type: "httpNode", icon: Globe, label: "HTTP Request", color: "#06b6d4", desc: "Chama API externa" },
                { type: "tagNode", icon: TagIcon, label: "Tag", color: "#10b981", desc: "Adiciona tag ao contato" },
            ]
        },
    ];

    return (
        <div className="flex h-full overflow-hidden" style={{ background: "#060d1a" }}>

            {/* ── Sidebar Esquerda ── */}
            <div className="w-[280px] flex flex-col flex-shrink-0" style={{ background: "rgba(10,18,34,0.9)", borderRight: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
                {/* Header */}
                <div className="p-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00c9a7,#0088ff)", boxShadow: "0 4px 12px rgba(0,201,167,0.3)" }}>
                            <Workflow className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-base font-bold text-white">FlowBuilder</h2>
                    </div>
                    <p className="text-[11px] text-slate-600 pl-10">Automação visual de chatbot</p>
                </div>

                {/* Nós disponíveis quando editando */}
                {activeFlow ? (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.05) transparent" }}>
                        {nodeButtons.map(group => (
                            <div key={group.group}>
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 px-1">{group.group}</p>
                                <div className="space-y-1">
                                    {group.items.map(item => (
                                        <button key={item.type} onClick={() => addNode(item.type)}
                                            className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                                            onMouseEnter={e => (e.currentTarget.style.borderColor = `${item.color}40`)}
                                            onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}>
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}18` }}>
                                                <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-white">{item.label}</p>
                                                <p className="text-[10px] text-slate-600 truncate">{item.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2">Conexão WhatsApp</label>
                            <select value={activeWhatsappId} onChange={e => setActiveWhatsappId(e.target.value ? Number(e.target.value) : "")}
                                className="w-full text-xs p-2.5 rounded-xl text-white focus:outline-none"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#94a3b8" }}>
                                <option value="">Todas as Conexões</option>
                                {whatsapps.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button onClick={saveFlow} disabled={saving}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all"
                                style={{ background: saveSuccess ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#00c9a7,#0088ff)", boxShadow: "0 4px 12px rgba(0,201,167,0.3)" }}>
                                <Save className="w-3.5 h-3.5" />
                                {saving ? "Salvando..." : saveSuccess ? "Salvo! ✓" : "Salvar"}
                            </button>
                            <button onClick={startSimulation} title="Simular Fluxo"
                                className="px-3 py-2.5 rounded-xl text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                                <Play className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={toggleActive} title={activeFlow?.active ? "Desativar" : "Ativar"}
                                className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                                style={activeFlow?.active ? { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" } : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b" }}>
                                <Play className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <button onClick={() => { setCodeValue(JSON.stringify({ nodes, edges }, null, 2)); setIsCodeEditorOpen(true); }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold transition-all"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b" }}>
                            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                            Editor JSON
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={undo} title="Desfazer (Ctrl+Z)"
                                className="py-2.5 rounded-xl text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 transition-all"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                <Undo2 className="w-3.5 h-3.5" /> Desfazer
                            </button>
                            <button onClick={redo} title="Refazer (Ctrl+Y)"
                                className="py-2.5 rounded-xl text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 transition-all"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                <Redo2 className="w-3.5 h-3.5" /> Refazer
                            </button>
                        </div>

                        <button onClick={() => { setActiveFlow(null); setNodes([]); setEdges([]); }}
                            className="w-full py-2 text-[10px] font-semibold text-slate-600 hover:text-slate-400 flex items-center justify-center gap-1 transition-colors">
                            <ArrowLeft className="w-3 h-3" /> Voltar para a lista
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ scrollbarWidth: "thin" }}>
                        <button onClick={() => setShowNewForm(!showNewForm)}
                            className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                            style={{ border: "1px dashed rgba(0,201,167,0.3)", color: "#00c9a7", background: "rgba(0,201,167,0.04)" }}>
                            <Plus className="w-4 h-4" /> Novo Fluxo
                        </button>

                        {showNewForm && (
                            <div className="p-3 rounded-xl space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                <input className="w-full text-xs p-2.5 rounded-lg text-white focus:outline-none"
                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,201,167,0.3)" }}
                                    placeholder="Nome do fluxo..." value={newFlowName}
                                    onChange={e => setNewFlowName(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && createFlow()} autoFocus />
                                <div className="flex gap-2">
                                    <button onClick={createFlow} className="flex-1 py-2 rounded-lg text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#00c9a7,#0088ff)" }}>Criar</button>
                                    <button onClick={() => setShowNewForm(false)} className="px-3 py-2 rounded-lg text-xs text-slate-500" style={{ background: "rgba(255,255,255,0.04)" }}>✕</button>
                                </div>
                            </div>
                        )}

                        {flows.length === 0 && !showNewForm && (
                            <div className="text-center py-12 px-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(0,201,167,0.08)", border: "1px solid rgba(0,201,167,0.12)" }}>
                                    <Zap className="w-6 h-6 text-slate-600" />
                                </div>
                                <p className="text-sm font-semibold text-slate-500">Nenhum fluxo</p>
                                <p className="text-xs text-slate-600 mt-1">Crie seu primeiro chatbot automático</p>
                            </div>
                        )}

                        {flows.map(f => (
                            <div key={f.id} onClick={() => openFlow(f)}
                                className="group flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all"
                                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(0,201,167,0.25)")}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}>
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${f.active ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-slate-700"}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-white truncate">{f.name}</p>
                                    <p className="text-[10px] text-slate-600 mt-0.5">{f.active ? "⚡ Ativo" : "Inativo"} · {JSON.parse(f.nodes || "[]").length} nós</p>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={e => { e.stopPropagation(); deleteFlow(f.id); }}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-all">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Canvas Principal ── */}
            <div className="flex-1 relative">
                {!activeFlow ? (
                    <div className="flex flex-col items-center justify-center h-full gap-6">
                        <div className="relative">
                            <div className="absolute inset-0 blur-3xl" style={{ background: "radial-gradient(circle, rgba(0,201,167,0.15) 0%, transparent 70%)" }} />
                            <div className="w-24 h-24 rounded-3xl flex items-center justify-center relative" style={{ background: "rgba(0,201,167,0.06)", border: "1px solid rgba(0,201,167,0.12)" }}>
                                <LayoutGrid className="w-10 h-10 text-slate-700" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-2">FlowBuilder</h3>
                            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">Crie fluxos visuais de chatbot para automatizar atendimentos. Selecione ou crie um fluxo na lateral.</p>
                        </div>
                    </div>
                ) : (
                    <ReactFlow
                        nodes={nodes.map(n => ({
                            ...n,
                            style: n.id === activeSimNodeId ? {
                                ...n.style,
                                boxShadow: '0 0 20px rgba(16,185,129,0.5)',
                                border: '2px solid #10b981',
                                scale: 1.05
                            } : n.style
                        }))} edges={edges}
                        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={(_, node) => setSelectedNode(node)}
                        onPaneClick={() => setSelectedNode(null)}
                        nodeTypes={nodeTypes} fitView
                        style={{ background: "#060d1a" }}>
                        <Background variant={BackgroundVariant.Dots} gap={28} size={0.8} color="rgba(255,255,255,0.06)" />
                        <Controls className="!bg-[#0f1c30] !border-[#1e3a6e]/40 !rounded-xl !shadow-xl" />
                        <MiniMap className="!bg-[#0a1628] !border-[#1e3a6e]/40 !rounded-xl !shadow-xl"
                            nodeColor="#00c9a7" maskColor="rgba(6,13,26,0.7)" />
                    </ReactFlow>
                )}

                {/* Drawer do Simulador */}
                {isSimulating && (
                    <div className="absolute right-4 top-4 bottom-4 w-[350px] bg-[#0a1628]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-[100] flex flex-col rounded-3xl overflow-hidden animate-in slide-in-from-right duration-300">
                        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-emerald-500/5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center animate-pulse">
                                    <Play className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Simulador</h3>
                                    <p className="text-[10px] text-emerald-500/70 font-medium uppercase tracking-wider">Modo de Teste</p>
                                </div>
                            </div>
                            <button onClick={() => { setIsSimulating(false); setActiveSimNodeId(null); }} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                            {simMessages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-3 grayscale">
                                    <MessageSquare className="w-12 h-12 text-slate-500" />
                                    <p className="text-xs text-slate-400">Iniciando fluxo...</p>
                                </div>
                            )}
                            {simMessages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm ${m.role === 'user'
                                        ? 'bg-emerald-600 text-white rounded-tr-none shadow-emerald-900/20'
                                        : 'bg-slate-800 text-slate-100 rounded-tl-none border border-white/5'
                                        }`}>
                                        {m.type === 'image' && <img src={m.url} className="rounded-lg mb-2 max-w-full h-auto border border-white/10" />}
                                        <p className="whitespace-pre-wrap">{m.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Variáveis Inspecionadas */}
                        <div className="px-4 py-2 bg-black/20 border-t border-white/5">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-1 select-none">Variáveis em Tempo Real</p>
                            <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto">
                                {Object.keys(simContext.variables).length === 0 && <span className="text-[9px] text-slate-700 italic">Nenhuma variável</span>}
                                {Object.entries(simContext.variables).map(([k, v]) => (
                                    <span key={k} className="text-[9px] bg-slate-900/50 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/10">
                                        {k}: <span className="text-white/70">{String(v)}</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSimSubmit} className="p-4 bg-slate-900/50 border-t border-white/5">
                            <div className="relative">
                                <input
                                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 pr-12 text-xs text-white focus:border-emerald-500/50 focus:ring-0 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="Simule uma resposta..."
                                    value={simInput}
                                    onChange={e => setSimInput(e.target.value)}
                                />
                                <button type="submit" className="absolute right-2 top-2 p-1.5 bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-500/20">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* ── Sidebar Direita (edição do nó) ── */}
            {activeFlow && selectedNode && selectedNode.type !== "startNode" && (
                <div className="w-[320px] flex-shrink-0 flex flex-col" style={{ background: "rgba(10,18,34,0.95)", borderLeft: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
                    <NodePanel node={selectedNode} departments={departments} onUpdate={updateNodeData} onDelete={deleteNodeById} />
                    <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <button onClick={() => setSelectedNode(null)}
                            className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-white transition-all"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            Fechar Painel
                        </button>
                    </div>
                </div>
            )}

            {/* ── Modal Editor JSON ── */}
            {isCodeEditorOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-8" style={{ background: "rgba(6,13,26,0.95)", backdropFilter: "blur(20px)" }}>
                    <div className="w-full max-w-4xl h-[80vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl" style={{ background: "#0a1628", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center justify-between p-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,201,167,0.12)", border: "1px solid rgba(0,201,167,0.2)" }}>
                                    <Terminal className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Editor de Código JSON</h3>
                                    <p className="text-[10px] text-slate-500">Edite a estrutura bruta do fluxo</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCodeEditorOpen(false)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 p-6 overflow-hidden">
                            <textarea autoFocus
                                className="w-full h-full rounded-2xl p-5 font-mono text-sm focus:outline-none resize-none"
                                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", color: "#4ade80", lineHeight: 1.7, scrollbarWidth: "thin" }}
                                value={codeValue} onChange={e => setCodeValue(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-3 p-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <button onClick={() => setIsCodeEditorOpen(false)}
                                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all"
                                style={{ background: "rgba(255,255,255,0.04)" }}>
                                Cancelar
                            </button>
                            <button onClick={() => {
                                try {
                                    const parsed = JSON.parse(codeValue);
                                    if (parsed.nodes && parsed.edges) { setNodes(parsed.nodes); setEdges(parsed.edges); setIsCodeEditorOpen(false); }
                                    else alert("Estrutura inválida! O JSON deve conter 'nodes' e 'edges'.");
                                } catch (e) { alert("JSON Inválido!"); }
                            }} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                                style={{ background: "linear-gradient(135deg,#00c9a7,#0088ff)", boxShadow: "0 4px 12px rgba(0,201,167,0.3)" }}>
                                Aplicar Mudanças
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
