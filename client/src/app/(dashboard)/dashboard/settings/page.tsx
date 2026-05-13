"use client";

import React, { useState } from "react";
import { Settings, Bell, Shield, MessageSquare, Zap, Palette, Globe } from "lucide-react";

export default function SettingsPage() {
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
                        { icon: Shield, label: "Segurança" },
                        { icon: Bell, label: "Notificações" },
                        { icon: MessageSquare, label: "Chat" },
                        { icon: Zap, label: "Integrações" },
                        { icon: Palette, label: "Visual" },
                    ].map((item, idx) => (
                        <button key={item.label} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${idx === 0 ? 'bg-[#00d9a6] text-[#0a1120] shadow-lg shadow-[#00d9a6]/10' : 'text-[#94a3b8] hover:bg-white/5'}`}>
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Conteúdo Central */}
                <div className="xl:col-span-3 bg-[#1e293b] border border-[#334155]/50 rounded-[2.5rem] p-10 space-y-10">
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

                    <div className="pt-6">
                        <button className="bg-[#00d9a6] text-[#0a1120] px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] shadow-xl shadow-[#00d9a6]/10 transition-all">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
