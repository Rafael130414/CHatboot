"use client";

import React, { useState, useEffect } from "react";
import {
    Users,
    Plus,
    Mail,
    Shield,
    User,
    MoreVertical,
    Trash2,
    CheckCircle,
    UserPlus,
    Hash,
    Layers,
    Edit3,
    Palette,
    MessageSquare,
    Clock,
    AlertCircle,
    X
} from "lucide-react";
import api from "@/services/api";

export default function TeamPage() {
    const [members, setMembers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("agent");
    const [selectedDepts, setSelectedDepts] = useState<number[]>([]);

    useEffect(() => {
        loadMembers();
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        try {
            const token = localStorage.getItem("token");
            const { data } = await api.get("/departments", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDepartments(data);
        } catch (err) { console.error(err); }
    };

    const loadMembers = async () => {
        try {
            const token = localStorage.getItem("token");
            const { data } = await api.get("/users", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(data);
        } catch (err) { console.error(err); }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await api.post("/users", { name, email, password, role, departmentIds: selectedDepts }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            setName("");
            setEmail("");
            setPassword("");
            setSelectedDepts([]);
            loadMembers();
        } catch (err) { console.error("Error creating member:", err); }
    };

    const toggleDept = (id: number) => {
        setSelectedDepts(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                        <Users className="text-[#00d9a6]" />
                        Equipe
                    </h1>
                    <p className="text-[#94a3b8] font-medium">Gerencie os acessos e permissões dos seus atendentes.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-[#00d9a6] hover:bg-[#009E82] text-[#0a1120] px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-emerald-500/10"
                >
                    <UserPlus className="w-5 h-5" /> Novo Membro
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {members.map((member) => (
                    <div key={member.id} className="glass rounded-[2.5rem] border border-[#334155]/50 p-8 hover:border-[#00d9a6]/30 transition-all relative group shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#162952] to-[#0f2040] border border-[#334155] flex items-center justify-center font-display font-bold text-2xl text-[#00d9a6] shadow-inner">
                                {member.name[0]}
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${member.role === 'admin' ? 'bg-[#00d9a6]/10 border-[#00d9a6]/20 text-[#00d9a6]' : 'bg-[#3b82f6]/10 border-[#3b82f6]/20 text-[#3b82f6]'}`}>
                                {member.role}
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                        <p className="text-sm text-[#94a3b8] mb-6 font-medium">{member.email}</p>

                        <div className="flex flex-wrap gap-2 mb-8">
                            {member.departments?.map((dep: any) => (
                                <div
                                    key={dep.id}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest"
                                    style={{ color: dep.color }}
                                >
                                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: dep.color }} />
                                    {dep.name}
                                </div>
                            ))}
                            {(!member.departments || member.departments.length === 0) && (
                                <span className="text-[9px] font-black uppercase text-[#475569] tracking-widest">Sem departamento</span>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase text-[#475569] tracking-widest">Ativo</span>
                            </div>
                            <button className="text-[#475569] hover:text-[#00d9a6] transition-colors">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-[#0a1120]/80">
                    <div className="glass w-full max-w-xl rounded-[3rem] p-10 border border-[#00d9a6]/20 shadow-[0_0_50px_rgba(0,201,167,0.1)] overflow-y-auto max-h-[90vh]">
                        <h2 className="text-2xl font-display font-bold text-white mb-2 italic uppercase">Novo Atendente</h2>
                        <p className="text-[#94a3b8] text-sm mb-10">Cadastre um novo membro para sua equipe de atendimento.</p>

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em] px-2">Nome Completo</label>
                                    <input
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ex: João Silva"
                                        className="w-full bg-[#162952]/40 border border-[#334155] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00d9a6] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em] px-2">Cargo / Função</label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full bg-[#162952]/40 border border-[#334155] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00d9a6] outline-none transition-all"
                                    >
                                        <option value="agent">Atendente</option>
                                        <option value="supervisor">Supervisor</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em] px-2">Departamentos Vinculados</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {departments.map((dep) => (
                                        <button
                                            key={dep.id}
                                            type="button"
                                            onClick={() => toggleDept(dep.id)}
                                            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${selectedDepts.includes(dep.id) ? 'bg-[#00d9a6]/10 border-[#00d9a6]/40' : 'bg-[#162952]/20 border-[#334155] hover:border-white/10'}`}
                                        >
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dep.color }} />
                                            <span className={`text-[11px] font-black uppercase tracking-wider ${selectedDepts.includes(dep.id) ? 'text-white' : 'text-slate-500'}`}>{dep.name}</span>
                                            {selectedDepts.includes(dep.id) && <CheckCircle className="w-3 h-3 text-[#00d9a6] ml-auto" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em] px-2">E-mail de Acesso</label>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="joao@chatboot.com"
                                    className="w-full bg-[#162952]/40 border border-[#334155] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00d9a6] outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#475569] uppercase tracking-[0.2em] px-2">Senha Provisória</label>
                                <input
                                    required
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-[#162952]/40 border border-[#334155] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00d9a6] outline-none transition-all"
                                />
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-[#334155] text-[#94a3b8] font-black uppercase text-[10px] tracking-widest hover:bg-white/5 transition-all">Cancelar</button>
                                <button type="submit" className="flex-1 py-4 rounded-2xl bg-[#00d9a6] text-[#0a1120] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Salvar Membro</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
