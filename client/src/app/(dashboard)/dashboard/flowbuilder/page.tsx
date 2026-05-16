"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ReactFlow, addEdge, useNodesState, useEdgesState,
    Controls, MiniMap, Background, BackgroundVariant,
    Handle, Position, Connection, type Node, type NodeProps,
    Panel, ControlButton, type Edge
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import api from "@/services/api";
import {
    Plus, Save, Trash2, Play, MessageSquare, GitBranch, Zap,
    Users, ArrowLeft, Power, ChevronRight, Clock, Code,
    BrainCircuit, Terminal, X, Settings2, LayoutGrid, Workflow,
    Image as ImageIcon, Music, FileText, Globe, Variable, Tag as TagIcon, Copy, Undo2, Redo2,
    ArrowRightLeft, Unlink, Mic, Square, Check, Info, Settings, Edit2, Maximize2, Minimize2, ZoomIn, ZoomOut, Phone
} from "lucide-react";

import { toast } from "sonner";

// ── Estilos base dos nós ──────────────────────────────
const nBase = "rounded-3xl border shadow-[0_10px_40px_rgba(0,0,0,0.4)] text-white text-xs font-semibold min-w-[220px] transition-all duration-300 backdrop-blur-xl";

// ── Estilo do Badge de Estatística ──────────────────
const StatBadge = ({ count }: { count?: number }) => {
    if (!count) return null;
    return (
        <div className="absolute -top-3 -right-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-lg animate-in zoom-in duration-300"
            style={{
                background: "rgba(15,23,42,0.9)",
                borderColor: count > 100 ? "#f59e0b" : "rgba(255,255,255,0.2)",
                boxShadow: count > 100 ? "0 0 15px rgba(245,158,11,0.3)" : "0 4px 12px rgba(0,0,0,0.5)"
            }}>
            <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${count > 100 ? "bg-amber-400" : "bg-emerald-400"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${count > 100 ? "bg-amber-500" : "bg-emerald-500"}`}></span>
            </span>
            <span className="text-[10px] font-black text-white tabular-nums tracking-tighter">
                {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
            </span>
        </div>
    );
};


// ── Componentes dos Nós ───────────────────────────────

const StartNode = ({ selected }: NodeProps) => (
    <div className={`${nBase} p-6 relative overflow-visible`} style={{
        background: "linear-gradient(145deg, rgba(30,41,59,0.95), rgba(15,23,42,1))",
        border: `2px solid ${selected ? "#8b5cf6" : "rgba(139,92,246,0.3)"}`,
        boxShadow: selected
            ? "0 0 50px rgba(139,92,246,0.4), inset 0 0 20px rgba(139,92,246,0.1)"
            : "0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(139,92,246,0.1)",
        borderRadius: '24px'
    }}>
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center relative shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #d946ef)" }}>
                <Zap className="w-6 h-6 text-white animate-pulse" />
                <div className="absolute inset-0 rounded-2xl animate-ping opacity-20 bg-white" />
            </div>
            <div>
                <span className="font-black text-sm tracking-tight uppercase text-white">Início do Fluxo</span>
                <p className="text-[10px] font-bold text-[#d946ef] uppercase tracking-widest opacity-80">Trigger Principal</p>
            </div>
        </div>

        {/* Handle de Saída maior e centralizado */}
        <Handle type="source" position={Position.Bottom}
            className="!bg-[#d946ef] !w-5 !h-5 !border-[4px] !border-[#060D1A] !-bottom-2.5 hover:scale-125 transition-transform" />
    </div>
);

const MessageNode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-5 relative`} style={{
        background: "rgba(15,23,42,0.8)", border: `1px solid ${selected ? "#00c9a7" : "rgba(255,255,255,0.1)"}`,
        boxShadow: selected ? "0 0 30px rgba(0,201,167,0.3), inset 0 0 10px rgba(0,201,167,0.1)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <StatBadge count={(data as any)._stats} />
        <Handle type="target" position={Position.Top} className="!bg-[#00c9a7] !w-3 !h-3 !border-2 !border-slate-900 !-top-1.5" />
        <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #00c9a7, #0088ff)" }}>
                <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
                <span className="text-[10px] font-black uppercase tracking-wider opacity-60">Mensagem</span>
                <div className="h-0.5 w-8 rounded-full bg-[#00c9a7] mt-0.5" />
            </div>
        </div>
        <p className="text-[12px] text-slate-300 font-medium leading-relaxed italic whitespace-pre-wrap max-w-[200px] line-clamp-3">
            {(data as any).message || "Escreva sua mensagem aqui..."}
        </p>
        <Handle type="source" position={Position.Bottom} className="!bg-[#00c9a7] !w-3 !h-3 !border-2 !border-slate-900 !-bottom-1.5" />
    </div>
);

const MenuNode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-5 relative`} style={{
        background: "rgba(15,23,42,0.8)", border: `1px solid ${selected ? "#3b82f6" : "rgba(255,255,255,0.1)"}`,
        boxShadow: selected ? "0 0 30px rgba(59,130,246,0.3), inset 0 0 10px rgba(59,130,246,0.1)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <StatBadge count={(data as any)._stats} />
        <Handle type="target" position={Position.Top} className="!bg-[#3b82f6] !w-3 !h-3 !border-2 !border-slate-900 !-top-1.5" />

        <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>
                <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div>
                <span className="text-[10px] font-black uppercase tracking-wider opacity-60">Menu Interativo</span>
                <div className="h-0.5 w-8 rounded-full bg-[#3b82f6] mt-0.5" />
            </div>
        </div>
        <p className="text-[11px] text-slate-400 font-medium mb-4 leading-relaxed line-clamp-2">{(data as any).message || "Selecione uma opção:"}</p>
        <div className="space-y-2">
            {((data as any).options || ["Opção 1", "Opção 2"]).map((opt: string, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors relative" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/20">
                        {i + 1}
                    </div>
                    <span className="text-[11px] text-slate-200 font-semibold">{opt}</span>
                    <Handle type="source" position={Position.Right} id={`option-${i}`}
                        style={{ top: '50%', right: '-12px', transform: 'translateY(-50%)' }}
                        className="!bg-[#3b82f6] !w-2.5 !h-2.5 !border-2 !border-slate-900" />
                </div>
            ))}
        </div>
    </div>
);


const TransferNode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-5 relative`} style={{
        background: "rgba(15,23,42,0.8)", border: `1px solid ${selected ? "#8b5cf6" : "rgba(255,255,255,0.1)"}`,
        boxShadow: selected ? "0 0 40px rgba(139,92,246,0.4), inset 0 0 15px rgba(139,92,246,0.1)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <StatBadge count={(data as any)._stats} />
        <Handle type="target" position={Position.Top} className="!bg-[#8b5cf6] !w-3 !h-3 !border-2 !border-slate-900 !-top-1.5" />
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

const EndNode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-5 relative`} style={{
        background: "rgba(15,23,42,0.8)", border: `1px solid ${selected ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <StatBadge count={(data as any)._stats} />
        <Handle type="target" position={Position.Top} className="!bg-[#ef4444] !w-3 !h-3 !border-2 !border-slate-900 !-top-1.5" />
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
    <div className={`${nBase} p-5 relative overflow-hidden group`} style={{
        background: "rgba(15,23,42,0.8)", border: `1px solid ${selected ? "#94a3b8" : "rgba(255,255,255,0.1)"}`,
        boxShadow: selected ? "0 0 30px rgba(148,163,184,0.3)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <StatBadge count={(data as any)._stats} />
        <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-3 !border-2 !border-slate-900 !-top-1.5" />
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
    <div className={`${nBase} p-5 relative overflow-visible`} style={{
        background: "rgba(15,23,42,0.95)",
        border: `1.5px solid ${selected ? "#f59e0b" : "rgba(245,158,11,0.2)"}`,
        boxShadow: selected ? "0 0 40px rgba(245,158,11,0.25), inset 0 0 15px rgba(245,158,11,0.05)" : "0 10px 40px rgba(0,0,0,0.4)"
    }}>
        <StatBadge count={(data as any)._stats} />
        <Handle type="target" position={Position.Top} className="!bg-[#f59e0b] !w-3.5 !h-3.5 !border-[3px] !border-[#060D1A] !-top-2" />

        <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-7 h-7 rounded-[10px] flex items-center justify-center shadow-inner" style={{ background: "rgba(245,158,11,0.15)" }}>
                <Code className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[13px] font-black tracking-tight text-amber-500 uppercase">Condição (SE)</span>
        </div>

        <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/5 mb-3">
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                {(data as any).variable || "msg"}
                <span className="text-amber-500 mx-1">{(data as any).operator || "contém"}</span>
                {(data as any).value || "..."}
            </p>
        </div>

        <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-1.5 grayscale opacity-60">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-tighter">Sim</span>
            </div>
            <div className="flex items-center gap-1.5 grayscale opacity-60">
                <span className="text-[10px] text-red-500 font-black uppercase tracking-tighter">Não</span>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            </div>
        </div>

        <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }}
            className="!bg-emerald-500 !w-4 !h-4 !border-[3px] !border-[#060D1A] !-bottom-2 hover:scale-125 transition-transform" />
        <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }}
            className="!bg-red-500 !w-4 !h-4 !border-[3px] !border-[#060D1A] !-bottom-2 hover:scale-125 transition-transform" />
    </div>
);


const SwitchNode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-5 relative`} style={{
        background: "rgba(15,23,42,0.8)", border: `1px solid ${selected ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
        boxShadow: selected ? "0 0 30px rgba(245,158,11,0.3), inset 0 0 10px rgba(245,158,11,0.1)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <StatBadge count={(data as any)._stats} />
        <Handle type="target" position={Position.Top} className="!bg-[#f59e0b] !w-3 !h-3 !border-2 !border-slate-900 !-top-1.5" />
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
    <div className={`${nBase} p-5 relative`} style={{
        background: "rgba(15,23,42,0.8)", border: `1px solid ${selected ? "#0ea5e9" : "rgba(255,255,255,0.1)"}`,
        boxShadow: selected ? "0 0 30px rgba(14,165,233,0.3), inset 0 0 10px rgba(14,165,233,0.1)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <StatBadge count={(data as any)._stats} />
        <Handle type="target" position={Position.Top} className="!bg-[#0ea5e9] !w-3 !h-3 !border-2 !border-slate-900 !-top-1.5" />
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
    <div className={`${nBase} p-5 relative`} style={{
        background: "rgba(15,23,42,0.8)", border: `1px solid ${selected ? "#a855f7" : "rgba(255,255,255,0.1)"}`,
        boxShadow: selected ? "0 0 30px rgba(168,85,247,0.3), inset 0 0 10px rgba(168,85,247,0.1)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <StatBadge count={(data as any)._stats} />
        <Handle type="target" position={Position.Top} className="!bg-[#a855f7] !w-3 !h-3 !border-2 !border-slate-900 !-top-1.5" />
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

const IxcBoletoNode = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-5 relative overflow-visible`} style={{
        background: "rgba(10,22,40,0.95)",
        border: `2px solid ${selected ? "#8b5cf6" : "rgba(139,92,246,0.3)"}`,
        boxShadow: selected ? "0 0 40px rgba(139,92,246,0.4)" : "0 8px 32px rgba(0,0,0,0.3)"
    }}>
        <Handle type="target" position={Position.Top} className="!bg-[#8b5cf6] !w-3.5 !h-3.5 !border-2 !border-[#060D1A]" />
        <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)" }}>
                <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">IXC Financeiro</span>
                <div className="h-0.5 w-8 rounded-full bg-purple-500 mt-0.5" />
            </div>
        </div>
        <div className="p-2 rounded-lg bg-black/20 border border-white/5">
            <p className="text-[10px] text-slate-400">Busca boletos pelo CPF e gerencia múltiplos contratos.</p>
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-[#8b5cf6] !w-3.5 !h-3.5 !border-2 !border-[#060D1A]" />
    </div>
);

const TR069Node = ({ data, selected }: NodeProps) => (
    <div className={`${nBase} p-5 relative overflow-visible`} style={{
        background: "rgba(10,22,40,0.97)",
        border: `2px solid ${selected ? "#22d3ee" : "rgba(34,211,238,0.3)"}`,
        boxShadow: selected ? "0 0 40px rgba(34,211,238,0.5), inset 0 0 20px rgba(34,211,238,0.05)" : "0 8px 32px rgba(0,0,0,0.4)",
        borderRadius: '20px'
    }}>
        <Handle type="target" position={Position.Top} className="!bg-[#22d3ee] !w-3.5 !h-3.5 !border-2 !border-[#060D1A]" />
        <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg relative" style={{ background: "linear-gradient(135deg, #0891b2, #06b6d4)" }}>
                <Terminal className="w-4 h-4 text-white" />
                <div className="absolute inset-0 rounded-xl animate-pulse opacity-20" style={{ background: "radial-gradient(circle, #22d3ee, transparent)" }} />
            </div>
            <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400">Gestão TR-069</span>
                <div className="h-0.5 w-10 rounded-full mt-0.5" style={{ background: "linear-gradient(90deg, #22d3ee, transparent)" }} />
            </div>
        </div>
        <div className="space-y-1.5">
            {[
                { icon: "📶", label: "Verificar Sinal" },
                { icon: "🔁", label: "Reiniciar Roteador" },
                { icon: "📡", label: "Alterar WiFi/Senha" },
            ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.08)" }}>
                    <span className="text-[10px]">{item.icon}</span>
                    <span className="text-[10px] text-cyan-300/80 font-semibold">{item.label}</span>
                </div>
            ))}
        </div>
        <div className="mt-2 px-2 py-1 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
            <p className="text-[9px] text-slate-500 truncate">CPF via: <span className="text-cyan-400">{`{{${(data as any).cpfVariable || 'cpf'}}}`}</span></p>
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-[#22d3ee] !w-3.5 !h-3.5 !border-2 !border-[#060D1A]" />
    </div>
);

const nodeTypes = {
    startNode: StartNode, messageNode: MessageNode, menuNode: MenuNode,
    transferNode: TransferNode, endNode: EndNode, delayNode: DelayNode,
    conditionNode: ConditionNode, aiNode: AINode,
    imageNode: ImageNode, audioNode: AudioNode, documentNode: DocumentNode,
    httpNode: HTTPNode, setVariableNode: SetVariableNode, tagNode: TagNode,
    switchNode: SwitchNode, loopNode: LoopNode,
    ixcBoletoNode: IxcBoletoNode,
    tr069Node: TR069Node,
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
        httpNode: "#06b6d4", setVariableNode: "#eab308", tagNode: "#10b981",
        ixcBoletoNode: "#8b5cf6",
        tr069Node: "#22d3ee",
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
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1 px-2 rounded-md bg-orange-500/10 text-orange-500 text-[10px] font-bold uppercase tracking-wider">Passo 1</div>
                                <label style={labelStyle} className="mb-0">Escolha o dado</label>
                            </div>
                            <input style={inputStyle} value={d.variable || "msg"}
                                placeholder="ex: msg, nome ou {{pedido_status}}"
                                onChange={e => onUpdate(node.id, { ...d, variable: e.target.value })} />
                            <p className="text-[10px] text-slate-600 mt-1.5">Use <b>msg</b> para o texto que o cliente enviou.</p>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1 px-2 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-wider">Passo 2</div>
                                <label style={labelStyle} className="mb-0">Operador de Comparação</label>
                            </div>
                            <select style={{ ...inputStyle, cursor: "pointer" }}
                                value={d.operator || "contém"}
                                onChange={e => onUpdate(node.id, { ...d, operator: e.target.value })}>
                                <option value="contém">Contém texto (contém)</option>
                                <option value="igual">É exatamente igual a (==)</option>
                                <option value="diferente">É diferente de (!=)</option>
                                <option value="começa com">Começa com (^)</option>
                                <option value="termina com">Termina com ($)</option>
                                <option value="maior que">Número é maior que (&gt;)</option>
                                <option value="menor que">Número é menor que (&lt;)</option>
                                <option value="vazio">Está vazio / Não preenchido</option>
                            </select>
                        </div>

                        {d.operator !== 'vazio' && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1 px-2 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">Passo 3</div>
                                    <label style={labelStyle} className="mb-0">Valor Esperado</label>
                                </div>
                                <input style={inputStyle} value={d.value || ""}
                                    onChange={e => onUpdate(node.id, { ...d, value: e.target.value })}
                                    placeholder="Digite o valor aqui..." />
                            </div>
                        )}

                        <div className="pt-2">
                            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 mb-1">
                                    <span>Caminhos de Saída</span>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                        <p className="text-[10px] font-black text-emerald-500">✓ SIM</p>
                                        <span className="text-[9px] text-emerald-500/50 leading-none">Condição OK</span>
                                    </div>
                                    <div className="flex-1 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                                        <p className="text-[10px] font-black text-red-500">X NÃO</p>
                                        <span className="text-[9px] text-red-500/50 leading-none">Outros casos</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
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
                    <div className="space-y-4">
                        <div>
                            <label style={labelStyle}>URL do Áudio</label>
                            <input style={inputStyle} value={d.url || ""} placeholder="https://exemplo.com/audio.mp3"
                                onChange={e => onUpdate(node.id, { ...d, url: e.target.value })} />
                        </div>

                        <div className="p-4 rounded-3xl bg-slate-900/60 border border-white/5 space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">🎙️ Gravar Áudio na Hora</label>
                            <AudioRecorder onSave={(fileName) => {
                                const baseUrl = api.defaults.baseURL || "";
                                const serverUrl = baseUrl.replace('/auth', '').replace('/api', '');
                                const fullUrl = `${serverUrl}/public/${fileName}`;
                                onUpdate(node.id, { ...d, url: fullUrl });
                                toast.success("Áudio gravado com sucesso!");
                            }} />

                        </div>

                        <div className="flex items-center gap-2 p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <input type="checkbox" id="ptt" checked={d.ptt ?? true}
                                onChange={e => onUpdate(node.id, { ...d, ptt: e.target.checked })} />
                            <label htmlFor="ptt" className="text-xs text-slate-300">Enviar como mensagem de voz (PTT)</label>
                        </div>
                    </div>
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
                        <div className="flex gap-2">
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Mapear campo JSON (opcional)</label>
                                <input style={inputStyle} value={d.jsonPath || ""} placeholder="ex: data.cliente.status"
                                    onChange={e => onUpdate(node.id, { ...d, jsonPath: e.target.value })} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Salvar em variável</label>
                                <input style={inputStyle} value={d.saveToVar || ""} placeholder="status_pedido"
                                    onChange={e => onUpdate(node.id, { ...d, saveToVar: e.target.value })} />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1.5 leading-tight">
                            Extrai um valor específico do JSON da resposta. Use <b>{`{{variavel}}`}</b> nos próximos nós.
                        </p>
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

                {node.type === "ixcBoletoNode" && (
                    <div className="space-y-4">
                        <div>
                            <label style={labelStyle}>Variável do CPF</label>
                            <input style={inputStyle} value={d.cpfVariable || "cpf"} placeholder="Variável onde está o CPF..."
                                onChange={e => onUpdate(node.id, { ...d, cpfVariable: e.target.value })} />
                            <p className="text-[10px] text-slate-600 mt-1.5">Se vazio, usará o texto da última mensagem do cliente.</p>
                        </div>
                        <div>
                            <label style={labelStyle}>Mensagem de Sucesso (Personalizada)</label>
                            <textarea rows={4} style={{ ...inputStyle, resize: "none" }}
                                value={d.successMessage || ""}
                                placeholder="Deixe vazio para usar a mensagem padrão do sistema..."
                                onChange={e => onUpdate(node.id, { ...d, successMessage: e.target.value })} />
                            <p className="text-[10px] text-slate-600 mt-1.5">Use variáveis: {"{{link_boleto, linha_boleto}}"}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                            <p className="text-[10px] text-purple-400 font-bold mb-1">⚙️ Comportamento</p>
                            <p className="text-[10px] text-slate-500 leading-tight">
                                Este nó solicita automaticamente o CPF, lista endereços se houver múltiplos logins e envia o boleto.
                            </p>
                        </div>
                    </div>
                )}

                {node.type === "tr069Node" && (
                    <div className="space-y-5">
                        <div>
                            <label style={labelStyle}>Variável do CPF</label>
                            <input style={inputStyle} value={d.cpfVariable || "cpf"} placeholder="Ex: cpf"
                                onChange={e => onUpdate(node.id, { ...d, cpfVariable: e.target.value })} />
                            <p className="text-[10px] text-slate-600 mt-1.5">O nó vai buscar esta variável no contexto. Se não existir, pede ao cliente.</p>
                        </div>
                        <div>
                            <label style={labelStyle}>Mensagem ao Pedir CPF</label>
                            <textarea rows={3} style={{ ...inputStyle, resize: "none" }}
                                value={d.askCpfMessage || ""}
                                placeholder="Por favor, informe seu CPF para acessar as opções da sua conexão."
                                onChange={e => onUpdate(node.id, { ...d, askCpfMessage: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Opções do Menu</label>
                            <p className="text-[10px] text-slate-500 -mt-2 mb-3">Selecione quais opções aparecerão no WhatsApp do cliente:</p>
                            {[
                                { key: "showSignal", label: "📶 Verificar Sinal Ótico" },
                                { key: "showReboot", label: "🔁 Reiniciar Roteador" },
                                { key: "showWifiName", label: "📡 Alterar Nome do WiFi" },
                                { key: "showWifiPass", label: "🔒 Alterar Senha do WiFi" },
                            ].map(opt => (
                                <label key={opt.key} className="flex items-center gap-3 py-2 px-3 rounded-xl mb-2 cursor-pointer hover:bg-white/5 transition-colors" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <input type="checkbox"
                                        checked={d[opt.key] !== false}
                                        onChange={e => onUpdate(node.id, { ...d, [opt.key]: e.target.checked })}
                                        className="rounded" />
                                    <span className="text-[11px] text-slate-300 font-semibold">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                        <div className="p-3 rounded-xl" style={{ background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.15)" }}>
                            <p className="text-[10px] text-cyan-400 font-bold mb-1">⚡ Como funciona</p>
                            <ol className="text-[10px] text-slate-400 space-y-1 leading-relaxed list-decimal list-inside">
                                <li>Verifica se já tem CPF salvo no contexto</li>
                                <li>Se não tiver, pede ao cliente</li>
                                <li>Busca contratos no IXC pelo CPF</li>
                                <li>Se houver mais de 1, pede para escolher</li>
                                <li>Busca a ONU no GenieACS pelo PPPoE</li>
                                <li>Exibe menu com as opções configuradas</li>
                            </ol>
                        </div>
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

// ── Gravador de Áudio ───────────────────────────────
const AudioRecorder = ({ onSave }: { onSave: (fileName: string) => void }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<any>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: any[] = [];

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/mp3' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
        } catch (err) {
            toast.error("Microfone não autorizado ou não encontrado.");
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        clearInterval(timerRef.current);
    };

    const handleUpload = async () => {
        if (!audioBlob) return;
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.mp3");
        try {
            // Usa o baseUrl configurado no serviço de API em vez de adivinhar
            const response = await api.post("/media/upload", formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onSave(response.data.fileName);
            setAudioBlob(null);
            setAudioUrl(null);
        } catch (err) {
            toast.error("Erro ao subir áudio. Verifique sua conexão com o servidor.");
            console.error("Upload error:", err);
        }
    };


    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
        <div className="space-y-3">
            {!audioUrl && !isRecording && (
                <button onClick={startRecording} className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/10 transition-all group">
                    <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-wider">Clique para Gravar</span>
                </button>
            )}

            {isRecording && (
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-14 rounded-2xl bg-red-600 flex items-center justify-between px-5 animate-pulse shadow-lg shadow-red-600/30">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            <span className="text-xs font-black text-white tabular-nums">{formatTime(recordingTime)}</span>
                        </div>
                        <span className="text-[10px] font-black text-white/70 uppercase">Gravando...</span>
                    </div>
                    <button onClick={stopRecording} className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-red-600 shadow-xl border border-white/20">
                        <Square className="w-5 h-5 fill-current" />
                    </button>
                </div>
            )}

            {audioUrl && !isRecording && (
                <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 flex flex-col gap-3">
                        <audio src={audioUrl} controls className="w-full h-10 filter invert brightness-150" />
                        <div className="flex gap-2">
                            <button onClick={handleUpload} className="flex-1 h-11 rounded-xl bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30">
                                <Check className="w-4 h-4" /> Salvar Áudio
                            </button>
                            <button onClick={() => { setAudioUrl(null); setAudioBlob(null); }} className="w-11 h-11 rounded-xl bg-white/5 text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors flex items-center justify-center">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Página Principal ─────────────────────────────────
export default function FlowbuilderPage() {
    const studioRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
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
    const [flowStats, setFlowStats] = useState<Record<string, number>>({});

    // ── Simulador ───────────────────────────────────
    const [isSimulating, setIsSimulating] = useState(false);
    const [simMessages, setSimMessages] = useState<{ role: 'bot' | 'user', text: string, type?: string, url?: string }[]>([]);
    const [simContext, setSimContext] = useState<any>({ variables: {}, name: "Simulador", phone: "55119999999" });
    const [activeSimNodeId, setActiveSimNodeId] = useState<string | null>(null);
    const [simInput, setSimInput] = useState("");

    // ── Polling de Estatísticas (Analytics) ──────────
    useEffect(() => {
        let interval: any;
        if (activeFlow) {
            const fetchStats = async () => {
                try {
                    const { data } = await api.get(`/flows/${activeFlow.id}/stats`);
                    setFlowStats(data);
                } catch (err) { }
            };
            fetchStats();
            interval = setInterval(fetchStats, 10000); // Polling a cada 10s
        } else {
            setFlowStats({});
        }
        return () => clearInterval(interval);
    }, [activeFlow]);

    // ── Lógica de Tela Cheia ──────────────────────────
    const toggleFullscreen = () => {
        if (!studioRef.current) return;
        if (!document.fullscreenElement) {
            studioRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {
                toast.error("Seu navegador bloqueou a tela cheia.");
            });
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

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
        else if (node.type === "ixcBoletoNode") {
            setSimMessages(prev => [...prev, { role: 'bot', text: "🏦 *[IXC]* Processando boleto... (simulação)\n💳 Venc: 10/06/2026 | Valor: R$ 89,90\n📋 Código de barras simulado" }]);
            const edge = edges.find(e => e.source === nodeId);
            if (edge) setTimeout(() => processSimStep(edge.target, ""), 1000);
        }
        else if (node.type === "tr069Node") {
            setSimMessages(prev => [...prev, { role: 'bot', text: "📶 *Gestão da sua Conexão*\n\nO que você deseja fazer?\n1. 📶 Verificar Sinal\n2. 🔁 Reiniciar Roteador\n3. 📡 Alterar Nome do WiFi\n4. 🔒 Alterar Senha do WiFi" }]);
            setActiveSimNodeId(nodeId);
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
        const loadedNodes = JSON.parse(flow.nodes || "[]");
        const loadedEdges = JSON.parse(flow.edges || "[]").map((edge: any) => {
            const sourceNode = loadedNodes.find((n: any) => n.id === edge.source);
            return {
                ...edge,
                animated: true,
                style: {
                    stroke: getNodeColor(sourceNode?.type),
                    strokeWidth: 2,
                    opacity: 0.8
                }
            };
        });

        setActiveFlow(flow);
        setNodes(loadedNodes);
        setEdges(loadedEdges);
        setSelectedNode(null);
        setActiveWhatsappId(flow.whatsappId || "");
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

    // ── Mapeamento Centralizado de Cores ────────────
    const getNodeColor = (type: string) => {
        const colors: Record<string, string> = {
            startNode: "#d946ef",
            messageNode: "#00c9a7",
            menuNode: "#3b82f6",
            transferNode: "#8b5cf6",
            endNode: "#ef4444",
            imageNode: "#ec4899",
            audioNode: "#f97316",
            documentNode: "#64748b",
            conditionNode: "#f59e0b",
            switchNode: "#f59e0b",
            loopNode: "#0ea5e9",
            delayNode: "#06b6d4",
            setVariableNode: "#eab308",
            aiNode: "#a855f7",
            httpNode: "#06b6d4",
            tagNode: "#10b981",
            tr069Node: "#22d3ee",
        };
        return colors[type || ""] || "#00c9a7";
    };

    const onConnect = useCallback((params: Connection) => {
        const sourceNode = nodes.find(n => n.id === params.source);
        const color = getNodeColor(sourceNode?.type || "messageNode");

        const newEdges = addEdge({
            ...params,
            id: `edge-${Date.now()}`,
            animated: true,
            type: "smoothstep",
            style: { stroke: color, strokeWidth: 2, opacity: 0.8 },
            labelStyle: { fill: '#fff', fontWeight: 700 }
        }, edges);
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
            ixcBoletoNode: { cpfVariable: "cpf", successMessage: "" },
            tr069Node: { cpfVariable: "cpf", askCpfMessage: "", showSignal: true, showReboot: true, showWifiName: true, showWifiPass: true },

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
                { type: "ixcBoletoNode", icon: FileText, label: "IXC Boleto", color: "#8b5cf6", desc: "Busca boleto e contratos" },
                { type: "tr069Node", icon: Terminal, label: "Gestão TR-069", color: "#22d3ee", desc: "WiFi, Sinal e Reboot" },
            ]
        },
    ];

    return (
        <div ref={studioRef} className={`flex h-[calc(100vh-64px)] bg-[#030711] overflow-hidden relative ${isFullscreen ? 'h-screen' : ''}`} style={isFullscreen ? { position: 'fixed', inset: 0, zIndex: 9999, height: '100vh' } : {}}>
            {/* Sidebar Lateral */}
            <div className="w-[280px] h-full bg-[#060D1A] border-r border-white/5 flex flex-col items-stretch overflow-hidden z-20" style={{ background: "rgba(10,18,34,0.9)", borderRight: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
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
            <div className="flex-1 relative bg-[#060D1A]">
                {activeFlow && (
                    <div className="absolute top-6 left-6 right-6 z-[90] flex items-center justify-between">
                        {/* Header do Fluxo */}
                        <div className="flex items-center gap-4 bg-[#0a1628]/80 backdrop-blur-3xl border border-white/10 px-6 py-3.5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg">
                                <Workflow className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-black text-white uppercase tracking-tight">{activeFlow.name}</h2>
                                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase ${activeFlow.active ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-700/50 text-slate-400 border border-slate-600/30"}`}>
                                        {activeFlow.active ? "Ativo" : "Inativo"}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium">Chatbot Automation Studio</p>
                            </div>
                        </div>

                        {/* Ações Rápidas */}
                        <div className="flex items-center gap-3 bg-[#0a1628]/80 backdrop-blur-3xl border border-white/10 p-2 rounded-[22px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                            <button onClick={() => startSimulation()}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all hover:scale-105 active:scale-95 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white">
                                <Play className="w-3.5 h-3.5" />
                                Simular
                            </button>
                            <button onClick={saveFlow}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all hover:scale-105 active:scale-95 bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                                <Save className="w-3.5 h-3.5" />
                                Salvar Alterações
                            </button>
                            <div className="w-px h-6 bg-white/10 mx-1" />
                            <button onClick={() => { setActiveFlow(null); setNodes([]); setEdges([]); }}
                                className="p-2.5 rounded-xl text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {!activeFlow ? (
                    <div className="flex flex-col items-center justify-center h-full gap-6">
                        <div className="relative">
                            <div className="absolute inset-0 blur-3xl opacity-50" style={{ background: "radial-gradient(circle, #00c9a7 0%, #0088ff 70%)" }} />
                            <div className="relative w-24 h-24 rounded-[32px] bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl">
                                <Workflow className="w-12 h-12 text-slate-500" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-black text-white mb-2">Flow Studio</h2>
                            <p className="text-slate-500 text-sm max-w-[300px]">Selecione ou crie um novo fluxo na barra lateral para começar.</p>
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
                        }))}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        onNodeClick={(_, node) => setSelectedNode(node)}
                        onPaneClick={() => setSelectedNode(null)}
                        fitView
                        style={{ background: "#060D1A" }}
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            animated: true,
                            style: { strokeWidth: 3, stroke: 'rgba(255,255,255,0.1)' }
                        }}
                    >
                        <Background color="#1e293b" variant={BackgroundVariant.Dots} gap={24} size={1} />
                        <Controls
                            style={{
                                background: "#0a1628",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "16px",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0px",
                                boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
                            }}
                            className="bg-slate-900 border-white/10 [&_button]:!bg-[#0a1628] [&_button]:!border-white/5 [&_button]:!fill-white [&_svg]:!fill-white hover:[&_button]:!bg-slate-800"
                        >
                            <ControlButton onClick={toggleFullscreen} title="Alternar Tela Cheia">
                                {isFullscreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
                            </ControlButton>
                        </Controls>

                        <MiniMap
                            className="!bg-[#060D1A]/80 !border-white/5 !rounded-[2rem] !backdrop-blur-xl shadow-2xl"
                            nodeColor={(n) => getNodeColor(n.type || "")}
                            maskColor="rgba(0,0,0,0.4)"
                            nodeStrokeWidth={3}
                            zoomable
                            pannable />
                    </ReactFlow>
                )}

                {/* Drawer do Simulador (Visual estilo Celular) */}
                {isSimulating && (
                    <div className="absolute right-8 top-8 bottom-8 w-[380px] bg-[#0f172a] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)] z-[100] flex flex-col rounded-[3rem] overflow-hidden animate-in slide-in-from-right duration-500">
                        {/* Notch do "Celular" */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />

                        <div className="p-8 pt-10 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/5 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center">
                                    <Play className="w-5 h-5 text-white fill-current" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Simulator</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">LIVE TEST</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => { setIsSimulating(false); setActiveSimNodeId(null); }} className="w-9 h-9 flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 rounded-full text-slate-500 transition-all">
                                <X className="w-5 h-5" />
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
