"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    MessageSquare, Send, MoreVertical, Smile, Paperclip,
    CheckCircle, Clock, Hash, Circle, FileText, Users,
    ArrowRightLeft, Tag as TagIcon, Phone, Search, Inbox, X, Smartphone, UserCog,
    Play, Pause, Volume2
} from "lucide-react";
import api from "@/services/api";
import { useSocket } from "@/hooks/useSocket";

// ─── Custom Audio Player Component ──────────────────────────────────────────
const CustomAudioPlayer = ({ src }: { src: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            setCurrentTime(current);
            setProgress((current / audioRef.current.duration) * 100);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const seekTime = (Number(e.target.value) / 100) * duration;
        if (audioRef.current) {
            audioRef.current.currentTime = seekTime;
            setProgress(Number(e.target.value));
        }
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-3 p-3 rounded-2xl w-64 shadow-inner" style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.03)" }}>
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
            />
            <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg flex-shrink-0"
                style={{ background: isPlaying ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #00c9a7, #0088ff)", color: isPlaying ? "#00c9a7" : "white" }}
            >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </button>
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <input
                    type="range"
                    value={progress}
                    onChange={handleSeek}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#00c9a7]"
                    style={{ background: `linear-gradient(to right, #00c9a7 ${progress}%, #334155 ${progress}%)` }}
                />
                <div className="flex justify-between items-center px-0.5">
                    <span className="text-[10px] font-mono text-slate-400">{formatTime(currentTime)}</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
                        <Volume2 size={8} /> {formatTime(duration)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default function InboxPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [activeTicket, setActiveTicket] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [newMessage, setNewMessage] = useState("");
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);
    const [counts, setCounts] = useState({ pending: 0, open: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [isEditingContact, setIsEditingContact] = useState(false);
    const [editContactForm, setEditContactForm] = useState({ name: "", number: "" });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socket = useSocket();

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    useEffect(() => { loadTickets(); loadTags(); loadCounts(); loadDepartments(); }, [statusFilter]);
    useEffect(() => { scrollToBottom(); }, [messages]);

    useEffect(() => {
        if (!socket) return;
        const handleAppMessage = async (data: any) => {
            loadCounts();
            if (activeTicket && data.ticketId === activeTicket.id) {
                setMessages(prev => {
                    if (prev.some((m: any) => m.id === data.message?.id)) return prev;
                    return [...prev, data.message];
                });
            }
            await loadTickets();
        };

        const handleTicketUpdate = async (data: any) => {
            loadCounts();
            loadTickets();
        };

        socket.on("appMessage", handleAppMessage);
        socket.on("ticket", handleTicketUpdate);
        return () => {
            socket.off("appMessage", handleAppMessage);
            socket.off("ticket", handleTicketUpdate);
        };
    }, [socket, activeTicket, statusFilter]);

    const loadCounts = async () => {
        try {
            const token = localStorage.getItem("token");
            const [p, o] = await Promise.all([
                api.get(`/tickets?status=pending`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get(`/tickets?status=open`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setCounts({ pending: p.data.length, open: o.data.length });
        } catch (err) { }
    };

    const loadTickets = async () => {
        try {
            const token = localStorage.getItem("token");
            const { data } = await api.get(`/tickets?status=${statusFilter}`, { headers: { Authorization: `Bearer ${token}` } });
            setTickets(data);
        } catch (err) { }
    };

    const loadDepartments = async () => {
        try {
            const token = localStorage.getItem("token");
            const { data } = await api.get("/departments", { headers: { Authorization: `Bearer ${token}` } });
            setAvailableDepartments(data);
        } catch (err) { }
    };

    const loadTags = async () => {
        try {
            const token = localStorage.getItem("token");
            const { data } = await api.get("/tags", { headers: { Authorization: `Bearer ${token}` } });
            setAvailableTags(data);
        } catch (err) { }
    };

    const handleAccept = async () => {
        if (!activeTicket) return;
        try {
            const token = localStorage.getItem("token");
            const { data } = await api.post(`/tickets/${activeTicket.id}/accept`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setActiveTicket(data);
            setStatusFilter("open");
        } catch (err) { }
    };

    const handleClose = async () => {
        if (!activeTicket) return;
        try {
            const token = localStorage.getItem("token");
            await api.post(`/tickets/${activeTicket.id}/close`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setActiveTicket(null);
            loadTickets();
        } catch (err) { }
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !activeTicket || activeTicket.status !== 'open') return;
        const msgBody = newMessage;
        setNewMessage(""); // limpa o campo imediatamente para melhor UX
        try {
            const token = localStorage.getItem("token");
            // NÃO adicionamos ao estado local aqui.
            // O evento socket "appMessage" já chegará do servidor e adicionará a mensagem
            // com o deduplicador por ID, evitando duplicação.
            await api.post(`/tickets/${activeTicket.id}/messages`, { body: msgBody }, { headers: { Authorization: `Bearer ${token}` } });
            loadTickets();
        } catch (err) {
            // Em caso de erro, restaura a mensagem no campo
            setNewMessage(msgBody);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeTicket) return;
        const formData = new FormData();
        formData.append("media", file);
        formData.append("body", file.name);
        try {
            const token = localStorage.getItem("token");
            // Idem: não adicionamos localmente, o socket tratará a atualização
            await api.post(`/tickets/${activeTicket.id}/messages`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            loadTickets();
        } catch (err) { }
    };

    const syncTags = async (tagIds: number[]) => {
        if (!activeTicket) return;
        try {
            const token = localStorage.getItem("token");
            await api.post(`/tags/sync/${activeTicket.id}`, { tagIds }, { headers: { Authorization: `Bearer ${token}` } });
            const { data } = await api.get(`/tickets/${activeTicket.id}`, { headers: { Authorization: `Bearer ${token}` } });
            setActiveTicket(data);
            loadTickets();
        } catch (err) { }
    };

    const selectTicket = async (ticket: any) => {
        setActiveTicket(ticket);
        setEditContactForm({ name: ticket.contact.name || "", number: ticket.contact.number || "" });
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const { data } = await api.get(`/tickets/${ticket.id}`, { headers: { Authorization: `Bearer ${token}` } });
            setMessages(data.messages);
        } catch (err) { } finally { setLoading(false); }
    };

    const handleUpdateContact = async () => {
        if (!activeTicket) return;
        try {
            const token = localStorage.getItem("token");
            const { data } = await api.put(`/contacts/${activeTicket.contact.id}`, editContactForm, { headers: { Authorization: `Bearer ${token}` } });
            // Atualiza o ticket ativo localmente
            setActiveTicket({ ...activeTicket, contact: data });
            loadTickets();
            setIsEditingContact(false);
        } catch (err) { }
    };

    const filteredTickets = tickets.filter(t =>
        !searchQuery || t.contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) || t.contact.number?.includes(searchQuery)
    );

    const getInitials = (name?: string) => name ? name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

    const statusColors: Record<string, string> = {
        pending: "text-amber-400",
        open: "text-emerald-400",
        closed: "text-slate-500"
    };
    const statusLabels: Record<string, string> = {
        pending: "Aguardando",
        open: "Em Atendimento",
        closed: "Finalizado"
    };

    return (
        <div className="flex-1 flex overflow-hidden" style={{ background: "linear-gradient(135deg, #060d1a 0%, #080f1e 50%, #060c18 100%)" }}>

            {/* ── Sidebar Esquerda ── */}
            <div className="w-[340px] flex flex-col border-r" style={{ borderColor: "rgba(0,201,167,0.08)", background: "rgba(10,22,40,0.6)", backdropFilter: "blur(20px)" }}>

                {/* Header da Sidebar */}
                <div className="px-5 pt-6 pb-4">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00c9a7] to-[#0088ff] flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <Inbox className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-base font-bold text-white">Atendimentos</h2>
                        </div>
                        <div className="flex gap-1">
                            {counts.pending > 0 && <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-black">{counts.pending}</span>}
                            {counts.open > 0 && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black">{counts.open}</span>}
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00c9a7]/50 transition-all"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                            placeholder="Buscar conversa..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Tabs */}
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        {[
                            { key: "pending", label: "Pendentes", count: counts.pending },
                            { key: "open", label: "Abertas", count: counts.open },
                            { key: "closed", label: "Fechadas", count: 0 }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key)}
                                className={`py-2 text-[10px] font-bold rounded-lg transition-all relative ${statusFilter === tab.key
                                    ? 'text-white shadow-lg'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                style={statusFilter === tab.key ? {
                                    background: tab.key === 'pending' ? "linear-gradient(135deg,#f59e0b,#d97706)" :
                                        tab.key === 'open' ? "linear-gradient(135deg,#00c9a7,#0088ff)" :
                                            "rgba(100,116,139,0.3)"
                                } : {}}
                            >
                                {tab.label}
                                {tab.count > 0 && statusFilter !== tab.key && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center">{tab.count}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ticket List */}
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,201,167,0.2) transparent" }}>
                    {filteredTickets.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(0,201,167,0.08)", border: "1px solid rgba(0,201,167,0.12)" }}>
                                <MessageSquare className="w-6 h-6 text-slate-600" />
                            </div>
                            <p className="text-sm font-semibold text-slate-500">Nenhuma conversa</p>
                            <p className="text-xs text-slate-600 mt-1">{statusFilter === 'closed' ? 'Sem atendimentos finalizados' : 'Aguardando novas mensagens'}</p>
                        </div>
                    )}

                    {filteredTickets.map(t => (
                        <div
                            key={t.id}
                            onClick={() => selectTicket(t)}
                            className={`group relative mx-2 mb-1 rounded-2xl cursor-pointer transition-all duration-200 ${activeTicket?.id === t.id ? 'ring-1 ring-[#00c9a7]/40' : 'hover:ring-1 hover:ring-white/10'}`}
                            style={{
                                background: activeTicket?.id === t.id
                                    ? "linear-gradient(135deg, rgba(0,201,167,0.12), rgba(0,136,255,0.08))"
                                    : "rgba(255,255,255,0.02)"
                            }}
                        >
                            {activeTicket?.id === t.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-r-full" style={{ background: "linear-gradient(to bottom, #00c9a7, #0088ff)" }} />
                            )}
                            <div className="p-4 pl-5">
                                <div className="flex gap-3">
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm overflow-hidden`}
                                            style={{
                                                background: t.status === 'closed'
                                                    ? "rgba(71,85,105,0.3)"
                                                    : "linear-gradient(135deg, rgba(0,201,167,0.2), rgba(0,136,255,0.15))",
                                                border: t.status === 'closed' ? "1px solid rgba(71,85,105,0.2)" : "1px solid rgba(0,201,167,0.25)",
                                                color: t.status === 'closed' ? "#475569" : "#00c9a7"
                                            }}>
                                            {t.contact.profilePic
                                                ? <img src={t.contact.profilePic} alt="" className="w-full h-full object-cover" />
                                                : getInitials(t.contact.name)
                                            }
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${t.status === 'open' ? 'bg-emerald-400' : t.status === 'pending' ? 'bg-amber-400' : 'bg-slate-600'}`}
                                            style={{ borderColor: "#080f1e" }} />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <h4 className="text-sm font-semibold text-white truncate max-w-[160px]">{t.contact.name || t.contact.number}</h4>
                                            <span className="text-[10px] text-slate-500 font-medium flex-shrink-0 ml-2">
                                                {new Date(t.updatedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate mb-2 group-hover:text-slate-400 transition-colors">{t.lastMessage?.body || '📎 Arquivo recebido'}</p>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {t.status === 'closed' ? (
                                                <span className="text-[9px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">✓ Finalizado</span>
                                            ) : (
                                                t.department && (
                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                                        style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
                                                        {t.department.name}
                                                    </span>
                                                )
                                            )}
                                            {t.tags?.length > 0 && t.tags.map((tag: any) => (
                                                <span key={tag.id} className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                                            ))}
                                            {t.whatsapp && (
                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md ml-auto"
                                                    style={{ background: "rgba(0,201,167,0.1)", color: "#00c9a7", border: "1px solid rgba(0,201,167,0.15)" }}>
                                                    {t.whatsapp.name}
                                                </span>
                                            )}
                                        </div>
                                        {/* Exibir Atendente responsável se estiver em atendimento */}
                                        {t.user && (
                                            <div className="mt-2 flex items-center gap-1.5">
                                                <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                                                    <Users className="w-2 h-2 text-slate-500" />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Atendente: {t.user.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Chat Central ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {activeTicket ? (
                    <>
                        {/* Chat Header */}
                        <header className="flex-shrink-0 h-[68px] px-6 flex items-center justify-between" style={{ background: "rgba(10,22,40,0.8)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm overflow-hidden"
                                    style={{ background: "linear-gradient(135deg,#00c9a7,#0088ff)", boxShadow: "0 4px 15px rgba(0,201,167,0.25)" }}>
                                    {activeTicket.contact.profilePic
                                        ? <img src={activeTicket.contact.profilePic} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-white">{getInitials(activeTicket.contact.name)}</span>
                                    }
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white leading-tight">{activeTicket.contact.name || activeTicket.contact.number}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[10px] font-bold flex items-center gap-1 ${statusColors[activeTicket.status]}`}>
                                            <Circle className="w-1.5 h-1.5 fill-current" />
                                            {statusLabels[activeTicket.status]}
                                        </span>
                                        {activeTicket.department && (
                                            <>
                                                <span className="text-slate-700">•</span>
                                                <span className="text-[10px] font-bold" style={{ color: "#a78bfa" }}>🏢 {activeTicket.department.name}</span>
                                            </>
                                        )}
                                        {activeTicket.whatsapp && (
                                            <>
                                                <span className="text-slate-700">•</span>
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                                    style={{ background: "rgba(0,136,255,0.1)", color: "#0088ff", border: "1px solid rgba(0,136,255,0.2)" }}>
                                                    <Smartphone className="w-2.5 h-2.5" />
                                                    via {activeTicket.whatsapp.name}
                                                </span>
                                            </>
                                        )}
                                        {activeTicket.user && (
                                            <>
                                                <span className="text-slate-700">•</span>
                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800/50 text-slate-400 border border-white/5">
                                                    <Users className="w-2.5 h-2.5" />
                                                    {activeTicket.user.name}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {activeTicket.status === 'pending' && (
                                    <button onClick={handleAccept}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
                                        style={{ background: "linear-gradient(135deg,#00c9a7,#0088ff)", boxShadow: "0 4px 15px rgba(0,201,167,0.3)" }}>
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Aceitar Atendimento
                                    </button>
                                )}
                                {activeTicket.status === 'open' && (
                                    <button onClick={handleClose}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
                                        style={{ background: "rgba(71,85,105,0.4)", border: "1px solid rgba(71,85,105,0.3)" }}>
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                        Finalizar
                                    </button>
                                )}
                                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-all"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        </header>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
                            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,201,167,0.15) transparent", background: "radial-gradient(ellipse at 20% 50%, rgba(0,201,167,0.03) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(0,136,255,0.03) 0%, transparent 60%)" }}>
                            {loading && <div className="text-center py-4"><span className="text-xs text-slate-500 animate-pulse">Carregando histórico...</span></div>}
                            {messages.map((m, i) => (
                                <div key={m.id || i} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'} items-end gap-2 group`}>
                                    {!m.fromMe && (
                                        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mb-1 overflow-hidden"
                                            style={{ background: "linear-gradient(135deg,rgba(0,201,167,0.2),rgba(0,136,255,0.15))", border: "1px solid rgba(0,201,167,0.2)", color: "#00c9a7" }}>
                                            {activeTicket.contact.profilePic
                                                ? <img src={activeTicket.contact.profilePic} alt="" className="w-full h-full object-cover" />
                                                : getInitials(activeTicket.contact.name)
                                            }
                                        </div>
                                    )}
                                    <div className={`max-w-[68%] ${m.fromMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                        <div className={`px-4 py-3 rounded-2xl shadow-lg text-sm leading-relaxed ${m.fromMe
                                            ? 'text-white rounded-br-md'
                                            : 'text-slate-200 rounded-bl-md'
                                            }`}
                                            style={m.fromMe ? {
                                                background: "linear-gradient(135deg, #00c9a7, #009E82)",
                                                boxShadow: "0 4px 15px rgba(0,201,167,0.2)"
                                            } : {
                                                background: "rgba(255,255,255,0.06)",
                                                border: "1px solid rgba(255,255,255,0.08)"
                                            }}>
                                            {m.mediaUrl && (
                                                <div className="mb-2">
                                                    {m.mediaType?.startsWith("image/") ? (
                                                        <img src={`${api.defaults.baseURL}/public/${m.mediaUrl}`} alt="Media" className="rounded-xl max-w-full h-auto border border-white/10" />
                                                    ) : m.mediaType?.startsWith("audio/") ? (
                                                        <div className="pt-2 pb-1">
                                                            <CustomAudioPlayer src={`${api.defaults.baseURL}/public/${m.mediaUrl}`} />
                                                        </div>
                                                    ) : m.mediaType?.startsWith("video/") ? (
                                                        <video controls className="rounded-xl max-w-full border border-white/10">
                                                            <source src={`${api.defaults.baseURL}/public/${m.mediaUrl}`} type={m.mediaType} />
                                                        </video>
                                                    ) : (
                                                        <a href={`${api.defaults.baseURL}/public/${m.mediaUrl}`} target="_blank"
                                                            className="flex items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-all"
                                                            style={{ background: "rgba(0,0,0,0.2)" }}>
                                                            <FileText className="w-5 h-5 text-emerald-400" />
                                                            <span className="text-xs font-semibold truncate max-w-[200px]">{m.body || 'Ver arquivo'}</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            {(!m.mediaUrl || m.body !== m.mediaUrl) && <p>{m.body}</p>}
                                        </div>
                                        <span className={`text-[10px] font-medium px-1 opacity-0 group-hover:opacity-100 transition-opacity ${m.fromMe ? 'text-right text-slate-500' : 'text-slate-600'}`}>
                                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {m.fromMe && (
                                        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mb-1"
                                            style={{ background: "linear-gradient(135deg,#0088ff,#0050cc)", border: "1px solid rgba(0,136,255,0.3)", color: "white" }}>
                                            A
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="flex-shrink-0 px-6 pb-6 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                            {activeTicket.status === 'open' ? (
                                <form onSubmit={handleSend} className="flex items-center gap-3 p-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all flex-shrink-0">
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                    <button type="button"
                                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all flex-shrink-0">
                                        <Smile className="w-4 h-4" />
                                    </button>
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        placeholder="Escreva uma mensagem..."
                                        className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none py-2"
                                    />
                                    <button type="submit"
                                        className="w-9 h-9 flex items-center justify-center rounded-xl text-white flex-shrink-0 transition-all hover:scale-110"
                                        style={{ background: "linear-gradient(135deg,#00c9a7,#0088ff)", boxShadow: "0 4px 12px rgba(0,201,167,0.3)" }}>
                                        <Send className="w-4 h-4" />
                                    </button>
                                </form>
                            ) : (
                                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px dashed rgba(245,158,11,0.25)" }}>
                                    <span className="text-lg">⚠️</span>
                                    <p className="text-xs text-slate-400">Visualizando ticket. Clique em <span className="text-emerald-400 font-bold">Aceitar Atendimento</span> para responder.</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                        <div className="relative">
                            <div className="absolute inset-0 blur-3xl rounded-full" style={{ background: "radial-gradient(circle, rgba(0,201,167,0.15), transparent)" }} />
                            <div className="w-24 h-24 rounded-3xl flex items-center justify-center relative"
                                style={{ background: "rgba(0,201,167,0.08)", border: "1px solid rgba(0,201,167,0.15)" }}>
                                <MessageSquare className="w-10 h-10 text-slate-700" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-white mb-2">Central de Atendimento</h3>
                            <p className="text-sm text-slate-500 max-w-xs">Selecione uma conversa na lateral para começar a interagir com seus clientes.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── CRM Sidebar ── */}
            {activeTicket && (
                <div className="w-72 flex-shrink-0 flex flex-col overflow-y-auto" style={{ borderLeft: "1px solid rgba(255,255,255,0.05)", background: "rgba(10,22,40,0.6)", backdropFilter: "blur(20px)", scrollbarWidth: "thin", scrollbarColor: "rgba(0,201,167,0.1) transparent" }}>
                    {/* Client card */}
                    <div className="p-6 text-center relative group/card" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <button
                            onClick={() => setIsEditingContact(true)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 text-emerald-400 opacity-0 group-hover/card:opacity-100 transition-all flex items-center justify-center hover:bg-[#00c9a7] hover:text-white"
                        >
                            <UserCog size={14} />
                        </button>

                        <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center font-bold text-2xl overflow-hidden"
                            style={{ background: "linear-gradient(135deg,rgba(0,201,167,0.15),rgba(0,136,255,0.1))", border: "1px solid rgba(0,201,167,0.2)", color: "#00c9a7" }}>
                            {activeTicket.contact.profilePic
                                ? <img src={activeTicket.contact.profilePic} alt="" className="w-full h-full object-cover" />
                                : getInitials(activeTicket.contact.name)
                            }
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-white leading-tight">{activeTicket.contact.name || "Cliente"}</h3>
                                <button onClick={() => setIsEditingContact(true)} className="text-slate-600 hover:text-emerald-400 transition-colors">
                                    <UserCog size={12} />
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 font-mono tracking-tighter">{activeTicket.contact.number}</p>
                        </div>
                    </div>

                    <div className="flex-1 p-5 space-y-6">
                        {/* Ticket Info */}
                        <div>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Informações</p>
                            <div className="space-y-2.5">
                                {[
                                    { icon: <Clock className="w-3.5 h-3.5" />, label: "Início", value: new Date(activeTicket.createdAt).toLocaleDateString('pt-BR') },
                                    { icon: <Hash className="w-3.5 h-3.5" />, label: "ID", value: `#${activeTicket.id}`, mono: true },
                                    ...(activeTicket.department ? [{ icon: <Users className="w-3.5 h-3.5" />, label: "Setor", value: activeTicket.department.name, purple: true }] : []),
                                    ...(activeTicket.whatsapp ? [{ icon: <Smartphone className="w-3.5 h-3.5" />, label: "Conexão", value: activeTicket.whatsapp.name, blue: true }] : [])
                                ].map((item: any, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                                        <span className="flex items-center gap-2 text-xs text-slate-500">
                                            <span style={{ color: item.purple ? "#a78bfa" : item.blue ? "#0088ff" : "#00c9a7" }}>{item.icon}</span>
                                            {item.label}
                                        </span>
                                        <span className={`text-xs font-semibold ${item.mono ? 'font-mono' : ''} ${item.purple ? 'text-violet-400' : item.blue ? 'text-blue-400' : 'text-white'}`}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Tags</p>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {activeTicket.tags?.map((tag: any) => (
                                    <span key={tag.id} className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                                        style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}30` }}>
                                        {tag.name}
                                    </span>
                                ))}
                                {(!activeTicket.tags || activeTicket.tags.length === 0) && (
                                    <span className="text-xs text-slate-600">Nenhuma tag</span>
                                )}
                            </div>
                            <select
                                onChange={(e) => {
                                    const ids = activeTicket.tags?.map((t: any) => t.id) || [];
                                    const newId = Number(e.target.value);
                                    if (newId && !ids.includes(newId)) syncTags([...ids, newId]);
                                    e.target.value = "";
                                }}
                                className="w-full text-xs p-2.5 rounded-xl text-white focus:outline-none transition-all"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#94a3b8" }}>
                                <option value="">+ Adicionar tag...</option>
                                {availableTags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                            </select>
                        </div>

                        {/* Transfer */}
                        <div>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Transferir</p>
                            <select
                                value=""
                                onChange={(e) => {
                                    const depId = e.target.value;
                                    if (!depId) return;
                                    const token = localStorage.getItem("token");
                                    api.post(`/tickets/${activeTicket.id}/transfer`, { departmentId: Number(depId) }, { headers: { Authorization: `Bearer ${token}` } })
                                        .then(() => { setActiveTicket(null); loadTickets(); loadCounts(); })
                                        .catch(console.error);
                                }}
                                className="w-full text-xs p-2.5 rounded-xl text-white focus:outline-none transition-all"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#94a3b8" }}>
                                <option value="">Para departamento...</option>
                                {availableDepartments.length === 0 && <option disabled>Nenhum departamento</option>}
                                {availableDepartments.map((dep: any) => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* End Button */}
                    <div className="p-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <button onClick={handleClose}
                            className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                            <X className="w-4 h-4" />
                            Finalizar Atendimento
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Editar Contato */}
            {isEditingContact && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border" style={{ background: "rgba(10,22,40,0.95)", borderColor: "rgba(255,255,255,0.1)" }}>
                        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white">Editar Perfil do Cliente</h3>
                            <button onClick={() => setIsEditingContact(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">Nome</label>
                                <input
                                    value={editContactForm.name}
                                    onChange={e => setEditContactForm({ ...editContactForm, name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                    placeholder="Nome do cliente"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">Número / ID</label>
                                <input
                                    value={editContactForm.number}
                                    onChange={e => setEditContactForm({ ...editContactForm, number: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                    placeholder="55..."
                                />
                            </div>
                            <button
                                onClick={handleUpdateContact}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
