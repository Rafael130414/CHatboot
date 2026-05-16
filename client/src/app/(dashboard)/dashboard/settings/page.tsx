"use client";

import React, { useState, useEffect } from "react";
import { Shield, MessageSquare, Zap, Palette, Globe, Clock, Save, CheckCircle2, Bot, Timer, BellRing, ExternalLink, Brain, Eye, EyeOff } from "lucide-react";
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

interface AiConfig {
    provider: string;
    apiKey: string;
    model: string;
    url: string;
    active: boolean;
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
    const [aiConfig, setAiConfig] = useState<AiConfig>({
        provider: "openai",
        apiKey: "",
        model: "gpt-3.5-turbo",
        url: "",
        active: true,
    });
    const [showApiKey, setShowApiKey] = useState(false);
    const [ixcConfig, setIxcConfig] = useState({ url: "", token: "" });
    const [showIxcToken, setShowIxcToken] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSchedules();
        fetchBotSettings();
        fetchAiConfig();
        fetchIxcConfig();
    }, []);

    const fetchSchedules = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/settings/schedules`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Cache-Control": "no-cache"
                },
                cache: 'no-store'
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
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Cache-Control": "no-cache"
                },
                cache: 'no-store'
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

    const fetchAiConfig = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/ai/config`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Cache-Control": "no-cache"
                },
                cache: 'no-store'
            });
            const data = await res.json();
            if (data && data.id) {
                setAiConfig({
                    provider: data.provider || "openai",
                    apiKey: data.apiKey || "",
                    model: data.model || "",
                    url: data.url || "",
                    active: data.active ?? true,
                });
            }
        } catch (error) {
            console.error("Erro ao carregar configurações de IA", error);
        }
    };

    const saveAiConfig = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            await fetch(`${API_URL}/ai/config`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(aiConfig)
            });
            toast.success("Configurações de IA salvas!");
        } catch (error) {
            toast.error("Erro ao salvar configurações de IA.");
        } finally {
            setLoading(false);
        }
    };

    const fetchIxcConfig = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/settings/ixc`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Cache-Control": "no-cache"
                },
                cache: 'no-store'
            });
            const data = await res.json();
            if (data) {
                setIxcConfig({
                    url: data.ixcUrl || "",
                    token: data.ixcToken || "",
                });
            }
        } catch (error) {
            console.error("Erro ao carregar configurações de IXC", error);
        }
    };

    const saveIxcConfig = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            await fetch(`${API_URL}/settings/ixc`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    ixcUrl: ixcConfig.url,
                    ixcToken: ixcConfig.token
                })
            });
            toast.success("Configurações IXC salvas!");
        } catch (error) {
            toast.error("Erro ao salvar configurações IXC.");
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { icon: Globe, label: "Geral" },
        { icon: Clock, label: "Horário de Atendimento" },
        { icon: Bot, label: "Comportamento do Bot" },
        { icon: Brain, label: "Inteligência Artificial" },
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

                    {/* ─── Inteligência Artificial ───────────────── */}
                    {activeTab === "Inteligência Artificial" && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Brain className="w-6 h-6 text-[#00d9a6]" /> Configurações de IA
                                </h3>
                                <button
                                    onClick={saveAiConfig}
                                    disabled={loading}
                                    className="bg-[#00d9a6] text-[#0a1120] px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {loading ? "Salvando..." : "Salvar Configuração"}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-[#475569] tracking-widest px-2">Provedor de IA</label>
                                    <select
                                        value={aiConfig.provider}
                                        onChange={(e) => setAiConfig(prev => ({ ...prev, provider: e.target.value }))}
                                        className="w-full bg-[#0a1120] border border-[#334155] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00d9a6] outline-none appearance-none"
                                    >
                                        <option value="openai">OpenAI (ChatGPT)</option>
                                        <option value="gemini">Google Gemini</option>
                                        <option value="groq">Groq (Llama/Mistral)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-[#475569] tracking-widest px-2">Modelo</label>
                                    <input
                                        placeholder="Ex: gpt-4o, gemini-pro, llama-3-8b"
                                        value={aiConfig.model}
                                        onChange={(e) => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
                                        className="w-full bg-[#0a1120] border border-[#334155] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00d9a6] outline-none"
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2 relative">
                                    <label className="text-[10px] font-black uppercase text-[#475569] tracking-widest px-2">Chave de API (API KEY)</label>
                                    <div className="relative">
                                        <input
                                            type={showApiKey ? "text" : "password"}
                                            placeholder="sk-..."
                                            value={aiConfig.apiKey}
                                            onChange={(e) => setAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                            className="w-full bg-[#0a1120] border border-[#334155] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00d9a6] outline-none pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#00d9a6] transition-colors"
                                        >
                                            {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase text-[#475569] tracking-widest px-2">URL Customizada (Opcional)</label>
                                    <input
                                        placeholder="https://api.openai.com/v1"
                                        value={aiConfig.url}
                                        onChange={(e) => setAiConfig(prev => ({ ...prev, url: e.target.value }))}
                                        className="w-full bg-[#0a1120] border border-[#334155] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00d9a6] outline-none"
                                    />
                                    <p className="text-[10px] text-[#475569] px-2 italic">Deixe vazio para usar a URL padrão do provedor.</p>
                                </div>
                            </div>

                            <div className="h-px bg-white/5" />

                            <div className="flex items-center justify-between bg-[#0a1120] p-8 rounded-[2rem] border border-[#334155]/20 shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${aiConfig.active ? 'bg-[#00d9a6]/10' : 'bg-red-500/10'}`}>
                                        <Zap className={`w-6 h-6 ${aiConfig.active ? 'text-[#00d9a6]' : 'text-red-500'}`} />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">Estado da Inteligência Artificial</p>
                                        <p className="text-xs text-[#94a3b8]">Habilite ou desabilite globalmente as funções de IA para sua empresa.</p>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setAiConfig(prev => ({ ...prev, active: !prev.active }))}
                                    className={`w-14 h-8 rounded-full relative p-1 cursor-pointer transition-all duration-300 ${aiConfig.active ? 'bg-[#00d9a6]' : 'bg-[#334155]'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full absolute shadow-lg transition-all duration-300 ${aiConfig.active ? 'right-1' : 'left-1'}`} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── Integrações ──────────────────────────── */}
                    {activeTab === "Integrações" && (
                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Zap className="w-6 h-6 text-[#00d9a6]" /> Gerenciar Integrações
                                </h3>
                                <button
                                    onClick={saveIxcConfig}
                                    disabled={loading}
                                    className="bg-[#00d9a6] text-[#0a1120] px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {loading ? "Salvando..." : "Salvar Configurações"}
                                </button>
                            </div>

                            {/* IXC Soft Section */}
                            <div className="bg-[#0a1120] p-8 rounded-[2rem] border border-[#334155]/30 space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 shadow-xl">
                                        <img src="https://ixcsoft.com.br/wp-content/uploads/2021/04/Logo-IXC-Soft-Vertical-1.png" className="w-10 opacity-80" alt="IXC" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-display font-black text-lg">IXC Soft (ERP)</h4>
                                        <p className="text-xs text-[#94a3b8]">Automatize a busca de boletos e consulta de clientes diretamente no seu IXC.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-[#475569] tracking-widest px-2">URL da API do seu IXC</label>
                                        <input
                                            placeholder="https://sua-url.ixcsoft.com.br"
                                            value={ixcConfig.url}
                                            onChange={(e) => setIxcConfig(prev => ({ ...prev, url: e.target.value }))}
                                            className="w-full bg-[#1e293b] border border-[#334155] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00d9a6] outline-none"
                                        />
                                        <p className="text-[10px] text-[#475569] px-2 italic">Exemplo: https://ixc.meuprovedor.com.br</p>
                                    </div>

                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] font-black uppercase text-[#475569] tracking-widest px-2">Token de API (IXC Token)</label>
                                        <div className="relative">
                                            <input
                                                type={showIxcToken ? "text" : "password"}
                                                placeholder="Token gerado no IXC..."
                                                value={ixcConfig.token}
                                                onChange={(e) => setIxcConfig(prev => ({ ...prev, token: e.target.value }))}
                                                className="w-full bg-[#1e293b] border border-[#334155] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00d9a6] outline-none pr-12"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowIxcToken(!showIxcToken)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#00d9a6] transition-colors"
                                            >
                                                {showIxcToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
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
