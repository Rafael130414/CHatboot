"use client";

import React, { useState, useEffect } from "react";
import { Shield, MessageSquare, Zap, Palette, Globe, Clock, Save, CheckCircle2, Bot, Timer, BellRing, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Schedule {
    id: number;
    weekday: string;
    start: string;
    end: string;
    active: boolean;
}

interface BotSettings {
    welcomeMessage: string;
    outOfHoursMessage: string;
    antiBanDelay: number;
}

const getApiUrl = () => {
    if (typeof window !== "undefined") {
        return `${window.location.protocol}//${window.location.hostname}:4000`;
    }
    return "http://37.148.134.48:4000";
};

const API_URL = getApiUrl();



export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("Geral");
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [botSettings, setBotSettings] = useState<BotSettings>({
        welcomeMessage: "",
        outOfHoursMessage: "",
        antiBanDelay: 2000,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSchedules();
        fetchBotSettings();
    }, []);

    const fetchSchedules = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/settings/schedules`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) setSchedules(data);
        } catch (error) {
            console.error("Erro ao carregar horários", error);
        }
    };

    const fetchBotSettings = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/settings/bot`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data) {
                setBotSettings({
                    welcomeMessage: data.welcomeMessage || "",
                    outOfHoursMessage: data.outOfHoursMessage || "",
                    antiBanDelay: data.antiBanDelay ?? 2000,
                });
            }
        } catch (error) {
            console.error("Erro ao carregar configurações do bot", error);
        }
    };

    const handleUpdateSchedule = (id: number, field: keyof Schedule, value: any) => {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const saveSchedules = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            await fetch(`${API_URL}/settings/schedules`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ schedules })
            });
            toast.success("Horários atualizados com sucesso!");
        } catch (error) {
            toast.error("Erro ao salvar horários.");
        } finally {
            setLoading(false);
        }
    };

    const saveBotSettings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            await fetch(`${API_URL}/settings/bot`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(botSettings)
            });
            toast.success("Configurações do bot salvas!");
        } catch (error) {
            toast.error("Erro ao salvar configurações do bot.");
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { icon: Globe, label: "Geral" },
        { icon: Clock, label: "Horário de Atendimento" },
        { icon: Bot, label: "Comportamento do Bot" },
        { icon: Shield, label: "Segurança" },
        { icon: MessageSquare, label: "Chat" },
        { icon: Zap, label: "Integrações" },
        { icon: Palette, label: "Visual" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter">Configurações</h1>
                <p className="text-[#94a3b8] font-medium">Ajuste os parâmetros globais da sua plataforma.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Sidebar */}
                <div className="xl:col-span-1 space-y-2">
                    {tabs.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => setActiveTab(item.label)}
                            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === item.label ? 'bg-[#00d9a6] text-[#0a1120] shadow-lg shadow-[#00d9a6]/10' : 'text-[#94a3b8] hover:bg-white/5'}`}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            <span className="text-left leading-tight">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="xl:col-span-3 bg-[#1e293b] border border-[#334155]/50 rounded-[2.5rem] p-10 space-y-10">

                    {/* ─── Geral ─────────────────────────────────── */}
                    {activeTab === "Geral" && (
                        <div className="space-y-10">
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Globe className="w-6 h-6 text-[#00d9a6]" /> Configurações Gerais
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-[#475569] tracking-widest px-2">Nome da Empresa</label>
                                        <input defaultValue="Chatboot SaaS" className="w-full bg-[#0a1120] border border-[#334155] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00d9a6] outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-[#475569] tracking-widest px-2">E-mail de Suporte</label>
                                        <input defaultValue="suporte@chatboot.com" className="w-full bg-[#0a1120] border border-[#334155] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00d9a6] outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="h-px bg-white/5" />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white font-bold">Modo Dark Deep</p>
                                    <p className="text-xs text-[#94a3b8]">Ativa o visual noturno de alto contraste.</p>
                                </div>
                                <div className="w-14 h-8 bg-[#00d9a6] rounded-full relative p-1 cursor-pointer">
                                    <div className="w-6 h-6 bg-white rounded-full absolute right-1 shadow-md" />
                                </div>
                            </div>
                            <div className="pt-2">
                                <button className="bg-[#00d9a6] text-[#0a1120] px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-xl shadow-[#00d9a6]/10 transition-all">Salvar Alterações</button>
                            </div>
                        </div>
                    )}

                    {/* ─── Horário de Atendimento ────────────────── */}
                    {activeTab === "Horário de Atendimento" && (
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Clock className="w-6 h-6 text-[#00d9a6]" /> Horário de Funcionamento
                                </h3>
                                <button
                                    onClick={saveSchedules}
                                    disabled={loading}
                                    className="bg-[#00d9a6] text-[#0a1120] px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {loading ? "Salvando..." : "Salvar Horários"}
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                                {schedules.map((schedule) => (
                                    <div key={schedule.id} className={`flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl border transition-all ${schedule.active ? 'bg-[#0a1120] border-[#00d9a6]/20' : 'bg-white/5 border-transparent opacity-60'}`}>
                                        <div className="flex items-center gap-4 mb-4 md:mb-0">
                                            <div
                                                onClick={() => handleUpdateSchedule(schedule.id, "active", !schedule.active)}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all ${schedule.active ? 'bg-[#00d9a6] text-[#0a1120]' : 'bg-[#334155] text-[#94a3b8]'}`}
                                            >
                                                <CheckCircle2 className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">{schedule.weekday}</p>
                                                <p className="text-[10px] text-[#94a3b8] uppercase font-black tracking-widest">
                                                    {schedule.active ? "Atendimento Ativo" : "Fechado"}
                                                </p>
                                            </div>
                                        </div>
                                        {schedule.active && (
                                            <div className="flex items-center gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase text-[#475569] tracking-widest px-1">Início</label>
                                                    <input
                                                        type="time"
                                                        value={schedule.start}
                                                        onChange={(e) => handleUpdateSchedule(schedule.id, "start", e.target.value)}
                                                        className="bg-[#1e293b] border border-[#334155] rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-[#00d9a6]"
                                                    />
                                                </div>
                                                <div className="w-4 h-px bg-[#334155] mt-4" />
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase text-[#475569] tracking-widest px-1">Fim</label>
                                                    <input
                                                        type="time"
                                                        value={schedule.end}
                                                        onChange={(e) => handleUpdateSchedule(schedule.id, "end", e.target.value)}
                                                        className="bg-[#1e293b] border border-[#334155] rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-[#00d9a6]"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── Comportamento do Bot ──────────────────── */}
                    {activeTab === "Comportamento do Bot" && (
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Bot className="w-6 h-6 text-[#00d9a6]" /> Regras Globais do Bot
                                </h3>
                                <button
                                    onClick={saveBotSettings}
                                    disabled={loading}
                                    className="bg-[#00d9a6] text-[#0a1120] px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {loading ? "Salvando..." : "Salvar Regras"}
                                </button>
                            </div>

                            {/* Link para Conexões */}
                            <div className="bg-[#0a1120] rounded-3xl p-8 border border-[#334155]/50 border-dashed space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-[#00d9a6]/10 flex items-center justify-center">
                                        <MessageSquare className="w-6 h-6 text-[#00d9a6]" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">Mensagens por Conexão</p>
                                        <p className="text-xs text-[#94a3b8]">As mensagens de boas-vindas e fora de horário agora são configuradas <span className="text-[#00d9a6] font-bold">individualmente por conexão</span> WhatsApp.</p>
                                    </div>
                                </div>
                                <a
                                    href="/dashboard/connections"
                                    className="inline-flex items-center gap-2 text-sm text-[#00d9a6] hover:underline font-bold"
                                >
                                    Ir para Conexões <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>

                            {/* Intervalo Anti-Ban */}
                            <div className="bg-[#0a1120] rounded-3xl p-6 border border-[#334155]/50 space-y-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                        <Timer className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">Intervalo Anti-Ban</p>
                                        <p className="text-xs text-[#94a3b8]">Delay aplicado entre cada resposta automática do bot para <span className="text-purple-400 font-semibold">simular comportamento humano</span> e reduzir risco de bloqueio.</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-[#94a3b8]">Intervalo atual</span>
                                        <span className="text-[#00d9a6] font-black text-lg">{(botSettings.antiBanDelay / 1000).toFixed(1)}s</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={500}
                                        max={10000}
                                        step={500}
                                        value={botSettings.antiBanDelay}
                                        onChange={(e) => setBotSettings(prev => ({ ...prev, antiBanDelay: Number(e.target.value) }))}
                                        className="w-full accent-[#00d9a6]"
                                    />
                                    <div className="flex justify-between text-[10px] text-[#475569] font-black uppercase tracking-widest">
                                        <span>0.5s (Rápido)</span>
                                        <span className="text-yellow-500">⚠ 2-4s Recomendado</span>
                                        <span>10s (Seguro)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
