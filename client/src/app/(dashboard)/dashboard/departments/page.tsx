"use client";

import React, { useState, useEffect } from "react";
import {
    Layers,
    Plus,
    Trash2,
    Edit3,
    Layers,
    Palette,
    Hash,
    MessageSquare,
    Clock,
    AlertCircle,
    X
} from "lucide-react";
import api from "@/services/api";

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [name, setName] = useState("");
    const [color, setColor] = useState("#8b5cf6");
    const [priority, setPriority] = useState(0);
    const [outOfHoursMessage, setOutOfHoursMessage] = useState("");
    const [schedules, setSchedules] = useState<any[]>([]);

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

    const handleOpenModal = (dep?: any) => {
        if (dep) {
            setIsEditing(true);
            setSelectedId(dep.id);
            setName(dep.name);
            setColor(dep.color);
            setPriority(dep.priority || 0);
            setOutOfHoursMessage(dep.outOfHoursMessage || "");
            setSchedules(dep.schedules || []);
        } else {
            setIsEditing(false);
            setSelectedId(null);
            setName("");
            setColor("#8b5cf6");
            setPriority(0);
            setOutOfHoursMessage("");
            setSchedules([
                { weekday: "Segunda-feira", startTime: "08:00", endTime: "18:00", active: true },
                { weekday: "Terça-feira", startTime: "08:00", endTime: "18:00", active: true },
                { weekday: "Quarta-feira", startTime: "08:00", endTime: "18:00", active: true },
                { weekday: "Quinta-feira", startTime: "08:00", endTime: "18:00", active: true },
                { weekday: "Sexta-feira", startTime: "08:00", endTime: "18:00", active: true },
                { weekday: "Sábado", startTime: "08:00", endTime: "12:00", active: false },
                { weekday: "Domingo", startTime: "08:00", endTime: "12:00", active: false },
            ]);
        }
        setShowModal(true);
    };

    const updateSchedule = (idx: number, field: string, value: any) => {
        const newSchedules = [...schedules];
        newSchedules[idx][field] = value;
        setSchedules(newSchedules);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            const payload = { name, color, priority, outOfHoursMessage, schedules };

            if (isEditing && selectedId) {
                await api.put(`/departments/${selectedId}`, payload, { headers });
            } else {
                await api.post("/departments", payload, { headers });
            }

            setShowModal(false);
            loadDepartments();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Tem certeza que deseja excluir este departamento?")) return;
        try {
            const token = localStorage.getItem("token");
            await api.delete(`/departments/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
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
                    onClick={() => handleOpenModal()}
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
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleOpenModal(dep)}
                                    className="w-10 h-10 bg-white/5 hover:bg-emerald-500 hover:text-white rounded-xl text-[#94a3b8] transition-all flex items-center justify-center border border-white/5"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(dep.id)}
                                    className="w-10 h-10 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl text-[#94a3b8] transition-all flex items-center justify-center border border-white/5"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dep.color }} />
                            {dep.name}
                        </h3>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-[#0a1120]/80">
                    <div className="glass w-full max-w-2xl rounded-[3rem] p-10 border border-[#00d9a6]/20 shadow-[0_0_50px_rgba(0,201,167,0.1)] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-display font-bold text-white italic uppercase">{isEditing ? "Editar Setor" : "Novo Departamento"}</h2>
                                <p className="text-[#94a3b8] text-sm">{isEditing ? "Altere as informações do setor selecionado." : "Crie um novo setor para distribuir seus atendimentos."}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-white border border-white/5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em] px-2">Nome do Setor</label>
                                    <div className="relative">
                                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                                        <input
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Ex: Comercial, Suporte..."
                                            className="w-full bg-[#162952]/40 border border-[#334155] rounded-2xl py-4 pl-12 pr-6 text-white text-sm focus:border-[#00d9a6] outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em] px-2">Prioridade (0-10)</label>
                                    <div className="relative">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={priority}
                                            onChange={(e) => setPriority(Number(e.target.value))}
                                            className="w-full bg-[#162952]/40 border border-[#334155] rounded-2xl py-4 pl-12 pr-6 text-white text-sm focus:border-[#00d9a6] outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em] px-2 italic">Cor de Identificação</label>
                                <div className="flex gap-4 p-4 bg-[#162952]/20 border border-[#334155] rounded-2xl">
                                    {['#8b5cf6', '#00d9a6', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899'].map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setColor(c)}
                                            className={`w-10 h-10 rounded-xl transition-all ${color === c ? 'scale-110 ring-2 ring-white ring-offset-4 ring-offset-[#0a1120]' : 'opacity-40 hover:opacity-100'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-10 h-10 rounded-xl bg-transparent border-none cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em] px-2">Mensagem de Fora de Horário (Opcional)</label>
                                <div className="relative">
                                    <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-[#475569]" />
                                    <textarea
                                        value={outOfHoursMessage}
                                        onChange={(e) => setOutOfHoursMessage(e.target.value)}
                                        placeholder="Olá! Nosso setor está fechado agora. Retornaremos em breve..."
                                        rows={3}
                                        className="w-full bg-[#162952]/40 border border-[#334155] rounded-2xl py-4 pl-12 pr-6 text-white text-sm focus:border-[#00d9a6] outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-2">
                                    <Clock className="w-4 h-4 text-[#00d9a6]" />
                                    <label className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em]">Horário de Atendimento do Setor</label>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {schedules.map((s, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 bg-[#162952]/20 border border-[#334155] rounded-2xl group transition-all hover:border-[#00d9a6]/30">
                                            <div className="flex-1">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{s.weekday}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    disabled={!s.active}
                                                    value={s.startTime}
                                                    onChange={(e) => updateSchedule(idx, "startTime", e.target.value)}
                                                    className="bg-[#0a1120] border border-[#334155] rounded-lg px-2 py-1 text-[10px] text-white disabled:opacity-30"
                                                />
                                                <span className="text-[#475569]">-</span>
                                                <input
                                                    type="time"
                                                    disabled={!s.active}
                                                    value={s.endTime}
                                                    onChange={(e) => updateSchedule(idx, "endTime", e.target.value)}
                                                    className="bg-[#0a1120] border border-[#334155] rounded-lg px-2 py-1 text-[10px] text-white disabled:opacity-30"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => updateSchedule(idx, "active", !s.active)}
                                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${s.active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                                            >
                                                {s.active ? 'Ativo' : 'Fechado'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-[#334155] text-[#94a3b8] font-black uppercase text-[10px] tracking-widest hover:bg-white/5 transition-all">Cancelar</button>
                                <button type="submit" className="flex-1 py-4 rounded-2xl bg-[#00d9a6] text-[#0a1120] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    {isEditing ? "Salvar Alterações" : "Criar Setor"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
