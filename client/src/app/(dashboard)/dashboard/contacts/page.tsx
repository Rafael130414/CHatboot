"use client";

import React, { useState, useEffect } from "react";
import {
    Users,
    Search,
    Plus,
    MoreVertical,
    MessageSquare,
    UserPlus,
    UserCircle,
    Tag,
    Smartphone,
    Edit2,
    X,
    Save,
    ArrowRight
} from "lucide-react";
import api from "@/services/api";
import { useRouter } from "next/navigation";

export default function ContactsPage() {
    const router = useRouter();
    const [contacts, setContacts] = useState<any[]>([]);
    const [connections, setConnections] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [selectedConnection, setSelectedConnection] = useState<string>("all");
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [editName, setEditName] = useState("");
    const [editNumber, setEditNumber] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadContacts();
        loadConnections();
    }, []);

    const loadConnections = async () => {
        try {
            const token = localStorage.getItem("token");
            const { data } = await api.get("/whatsapp", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConnections(data);
        } catch (err) { console.error(err); }
    };

    const loadContacts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const { data } = await api.get("/contacts", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setContacts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (contact: any) => {
        setSelectedContact(contact);
        setEditName(contact.name || "");
        setEditNumber(contact.number || "");
        setShowEditModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await api.put(`/contacts/${selectedContact.id}`, {
                name: editName,
                number: editNumber
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowEditModal(false);
            loadContacts();
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar contato");
        }
    };

    const filtered = contacts.filter(c => {
        const matchesSearch = (c.name?.toLowerCase() || "").includes(search.toLowerCase()) || c.number?.includes(search);
        const matchesConnection = selectedConnection === "all" || c.whatsappId === Number(selectedConnection);
        return matchesSearch && matchesConnection;
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                        <Users className="text-[#00c9a7]" />
                        Clientes
                    </h1>
                    <p className="text-[#94a3b8] mt-1">Sua base centralizada de contatos integrada ao WhatsApp.</p>
                </div>
                <button className="bg-[#1e3a6e] hover:bg-[#254a8e] text-[#00c9a7] border border-[#00c9a7]/20 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg group">
                    <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" /> Importar Contatos
                </button>
            </div>

            {/* Barra de Busca Premium */}
            <div className="glass p-2 rounded-2xl border border-[#162952] flex items-center gap-4 focus-within:border-[#00c9a7]/30 transition-all">
                <div className="pl-4 text-[#475569]"><Search className="w-5 h-5" /></div>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou número..."
                    className="flex-1 bg-transparent border-none py-3 text-sm text-white focus:outline-none placeholder:text-[#475569]"
                />
            </div>

            {/* Filtros de Conexão */}
            <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setSelectedConnection("all")}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${selectedConnection === "all"
                        ? 'bg-emerald-500 text-[#0a1628] border-emerald-500 shadow-lg shadow-emerald-500/20'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                        }`}
                >
                    Todos
                </button>
                {connections.map(conn => (
                    <button
                        key={conn.id}
                        onClick={() => setSelectedConnection(conn.id.toString())}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${selectedConnection === conn.id.toString()
                            ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                            : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                            }`}
                    >
                        {conn.name}
                    </button>
                ))}
            </div>

            {/* Grid de Contatos */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="glass rounded-3xl border border-white/5 p-6 h-64 animate-pulse bg-white/5" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map((c) => (
                        <div key={c.id} className="glass group rounded-3xl border border-[#162952] p-6 hover:border-[#00c9a7]/40 transition-all relative overflow-hidden group/card">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#00c9a7]/10 to-transparent blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />

                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0f2040] to-[#162952] border border-[#1e3a6e] flex items-center justify-center text-xl font-black text-[#00c9a7] shadow-inner group-hover:scale-110 transition-transform shadow-emerald-500/10">
                                    {c.name?.[0]?.toUpperCase() || <UserCircle className="w-8 h-8 opacity-20" />}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(c)}
                                        className="w-10 h-10 bg-[#162952] hover:bg-emerald-500 hover:text-white rounded-xl text-[#94a3b8] transition-all flex items-center justify-center shadow-lg"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <div className="min-h-[48px]">
                                    <h3 className="text-base font-black text-white truncate tracking-tight">{c.name || "Cliente sem Nome"}</h3>
                                    <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                                        <Smartphone className="w-3 h-3 text-emerald-500/50" />
                                        <span className="text-[11px] font-mono font-bold tracking-tighter">{c.number}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                                    <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                        {c.whatsApp?.name || "Geral"}
                                    </span>
                                </div>

                                <button
                                    onClick={() => router.push(`/dashboard/tickets?contactId=${c.id}`)}
                                    className="w-full bg-[#162952]/40 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-blue-500 hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#00c9a7] transition-all flex items-center justify-center gap-3 border border-white/5 shadow-inner group/btn active:scale-95"
                                >
                                    <MessageSquare className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" /> Iniciar Chat
                                </button>
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="col-span-full py-24 text-center glass rounded-[3rem] border-2 border-dashed border-[#162952] bg-white/[0.02]">
                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Users className="w-10 h-10 text-slate-700" />
                            </div>
                            <p className="text-lg font-black text-white tracking-tight">Nenhum contato encontrado</p>
                            <p className="text-sm text-slate-500 mt-1">Tente ajustar seus filtros ou busca.</p>
                        </div>
                    )}
                </div>
            )
            }

            {/* Modal de Edição Premium */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-[#0a1120]/60">
                    <div className="glass w-full max-w-md rounded-[2.5rem] p-10 border border-[#00c9a7]/20 shadow-2xl relative animate-in zoom-in duration-300">
                        <button
                            onClick={() => setShowEditModal(false)}
                            className="absolute top-6 right-6 p-2 text-[#475569] hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="mb-8">
                            <div className="w-16 h-16 bg-[#00c9a7]/10 rounded-2xl flex items-center justify-center text-[#00c9a7] mb-4">
                                <Edit2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-display font-bold text-white">Editar Cliente</h2>
                            <p className="text-sm text-[#94a3b8]">Atualize as informações de contato.</p>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[#475569] uppercase tracking-widest px-2">Nome do Cliente</label>
                                <input
                                    required
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-[#162952]/40 border border-[#1e3a6e] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00c9a7] transition-all outline-none"
                                    placeholder="Ex: João Silva"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[#475569] uppercase tracking-widest px-2">Telefone</label>
                                <input
                                    required
                                    value={editNumber}
                                    onChange={(e) => setEditNumber(e.target.value)}
                                    className="w-full bg-[#162952]/40 border border-[#1e3a6e] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00c9a7] transition-all outline-none"
                                    placeholder="5564999999999"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 py-4 rounded-2xl border border-[#162952] text-[#94a3b8] font-bold text-sm hover:bg-white/5 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 rounded-2xl bg-[#00c9a7] text-[#0a1628] font-bold text-sm shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
