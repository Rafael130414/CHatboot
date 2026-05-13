"use client";

import React, { useState, useEffect } from "react";
import {
    Layers,
    Plus,
    Hash,
    Palette,
    MessageSquare,
    TrendingUp,
    Users,
    Trash2
} from "lucide-react";
import api from "@/services/api";

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState("");
    const [color, setColor] = useState("#00d9a6");

    useEffect(() => { loadDepartments(); }, []);

    const loadDepartments = async () => {
        try {
            const token = localStorage.getItem("token");
            const { data } = await api.get("/departments", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDepartments(data);
        } catch (err) { console.error(err); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await api.post("/departments", { name, color }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            setName("");
            loadDepartments();
        } catch (err) { console.error(err); }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                        <Layers className="text-[#00d9a6]" />
                        Departamentos
                    </h1>
                    <p className="text-[#94a3b8] font-medium">Organize sua equipe em setores especializados.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-[#00d9a6] hover:bg-[#009E82] text-[#0a1120] px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-emerald-500/10"
                >
                    <Plus className="w-5 h-5" /> Novo Setor
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {departments.map((dep) => (
                    <div key={dep.id} className="glass rounded-[2.5rem] border border-[#334155]/50 p-8 hover:border-[#00d9a6]/30 transition-all relative group overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] -mr-10 -mt-10 opacity-10" style={{ backgroundColor: dep.color }} />

                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-2xl border flex items-center justify-center shadow-inner" style={{ backgroundColor: `${dep.color}10`, borderColor: `${dep.color}20`, color: dep.color }}>
                                <Hash className="w-6 h-6" />
                            </div>
                            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">
                                ID: #{dep.id}
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dep.color }} />
                            {dep.name}
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#0a1120]/40 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] uppercase font-black text-[#475569] mb-1">Tickets</p>
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="w-3 h-3 text-[#00d9a6]" />
                                    <span className="text-white font-bold">{dep.tickets?.length || 0}</span>
                                </div>
                            </div>
                            <div className="bg-[#0a1120]/40 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] uppercase font-black text-[#475569] mb-1">Status</p>
                                <div className="flex items-center gap-2 text-[#00c9a7]">
                                    <TrendingUp className="w-3 h-3" />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Ativo</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-[#0a1120]/80">
                    <div className="glass w-full max-w-lg rounded-[3rem] p-10 border border-[#00d9a6]/20 shadow-[0_0_50px_rgba(0,201,167,0.1)]">
                        <h2 className="text-2xl font-display font-bold text-white mb-2 italic uppercase">Novo Departamento</h2>
                        <p className="text-[#94a3b8] text-sm mb-10">Crie um novo setor para distribuir seus atendimentos.</p>

                        <form onSubmit={handleCreate} className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em] px-2">Nome do Setor</label>
                                <input
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Suporte Nível 1"
                                    className="w-full bg-[#162952]/40 border border-[#334155] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00d9a6] transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em] px-2">Cor de Identificação</label>
                                <div className="flex gap-4 items-center bg-[#162952]/40 border border-[#334155] rounded-2xl p-2">
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                                    />
                                    <span className="text-white font-mono text-sm font-bold">{color.toUpperCase()}</span>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-[#334155] text-[#94a3b8] font-black uppercase text-[10px] tracking-widest hover:bg-white/5 transition-all">Cancelar</button>
                                <button type="submit" className="flex-1 py-4 rounded-2xl bg-[#00d9a6] text-[#0a1120] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Criar Setor</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
