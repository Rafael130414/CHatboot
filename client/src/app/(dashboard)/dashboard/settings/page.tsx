"use client";

import React, { useState, useEffect } from "react";
import { Settings, Bell, Shield, MessageSquare, Zap, Palette, Globe, Clock, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Schedule {
    id: number;
    weekday: string;
    start: string;
    end: string;
    active: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("Geral");
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSchedules();
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

    const handleUpdateSchedule = (id: number, field: keyof Schedule, value: any) => {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const saveSchedules = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            await fetch(`${API_URL}/settings/schedules`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ schedules })
            });
            toast.success("Horários atualizados com sucesso!");
        } catch (error) {
            toast.error("Erro ao salvar horários.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter">Configurações</h1>
                <p className="text-[#94a3b8] font-medium">Ajuste os parâmetros globais da sua plataforma.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Categorias Sidebar */}
                <div className="xl:col-span-1 space-y-2">
                    {[
                        { icon: Globe, label: "Geral" },
                        { icon: Clock, label: "Horário de Atendimento" },
                        { icon: Shield, label: "Segurança" },
                        { icon: MessageSquare, label: "Chat" },
                        { icon: Zap, label: "Integrações" },
                        { icon: Palette, label: "Visual" },
                    ].map((item) => (
                        <button
                            key={item.label}
                            onClick={() => setActiveTab(item.label)}
                            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === item.label ? 'bg-[#00d9a6] text-[#0a1120] shadow-lg shadow-[#00d9a6]/10' : 'text-[#94a3b8] hover:bg-white/5'}`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Conteúdo Central */}
                <div className="xl:col-span-3 bg-[#1e293b] border border-[#334155]/50 rounded-[2.5rem] p-10 space-y-10">

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
                        </div>
                    )}

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

                            <div className="space-y-4">
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

                    <div className="pt-6">
                        <button className="bg-[#00d9a6] text-[#0a1120] px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-xl shadow-[#00d9a6]/10 transition-all">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
