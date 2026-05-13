"use client";

import React, { useState, useEffect } from "react";
import {
    Radio,
    Smartphone,
    Wifi,
    WifiOff,
    Plus,
    RefreshCw,
    Trash2,
    ExternalLink,
    ShieldCheck,
    QrCode,
    Globe
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import api from "@/services/api";
import { useSocket } from "@/hooks/useSocket";

export default function ConnectionsPage() {
    const [whatsApps, setWhatsApps] = useState<any[]>([]);
    const [qrCodes, setQrCodes] = useState<Record<number, string>>({});
    const [showModal, setShowModal] = useState(false);
    const [connType, setConnType] = useState<'qr' | 'official'>('qr');

    const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const socket = useSocket();

    useEffect(() => { loadConnections(); }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on("whatsapp-qr", (data: any) => {
            console.log("Recebi QR para WA:", data.whatsappId);
            setQrCodes(prev => ({ ...prev, [data.whatsappId]: data.qr }));
            // Forçar atualização da lista para mudar status visual se necessário
            loadConnections();
        });

        socket.on("whatsapp-status", (data: any) => {
            loadConnections();
            if (data.status === "CONNECTED") {
                setQrCodes(prev => {
                    const next = { ...prev };
                    delete next[data.whatsappId];
                    return next;
                });
            }
        });

        return () => {
            socket.off("whatsapp-qr");
            socket.off("whatsapp-status");
        };
    }, [socket]);

    const [name, setName] = useState("");

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const loadConnections = async () => {
        try {
            setErrorMsg(null);
            const token = localStorage.getItem("token");
            const { data } = await api.get("/whatsapp", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWhatsApps(data);
        } catch (err: any) {
            console.error(err);
            setErrorMsg(`Erro ao carregar: ${err.message}`);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await api.post("/whatsapp", { name, type: connType }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            setName("");
            loadConnections();
        } catch (err: any) {
            console.error(err);
            alert(`Erro ao criar conexão: ${err.message}`);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Deseja realmente REMOVER esta conexão? Isso excluirá todos os dados.")) return;
        try {
            const token = localStorage.getItem("token");
            await api.delete(`/whatsapp/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadConnections();
            setQrCodes(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        } catch (err: any) { console.error(err); }
    };

    const handleLogout = async (id: number) => {
        if (!confirm("Deseja desconectar esta sessão?")) return;
        try {
            const token = localStorage.getItem("token");
            await api.post(`/whatsapp/${id}/logout`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadConnections();
        } catch (err: any) {
            console.error(err);
        }
    };

    const handleRestart = async (id: number) => {
        try {
            const token = localStorage.getItem("token");
            await api.post(`/whatsapp/${id}/restart`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadConnections();
        } catch (err: any) {
            console.error(err);
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                        <Radio className="text-[#00c9a7] animate-pulse" />
                        Connections
                    </h1>
                    <p className="text-[#94a3b8] mt-1">Gerencie suas instâncias de WhatsApp e API Oficial.</p>
                </div>
                <div className="flex gap-4">
                    {errorMsg && (
                        <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2">
                            {errorMsg}
                        </div>
                    )}
                    <button onClick={() => setShowModal(true)} className="bg-[#00c9a7] hover:bg-[#009E82] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-emerald-500/20">
                        <Plus className="w-5 h-5" /> Adicionar Canal
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {whatsApps.map((wa) => {
                    const currentQr = qrCodes[wa.id] || wa.qrcode;
                    const showQr = (wa.status === 'QRCODE' || wa.status === 'DISCONNECTED') && currentQr;

                    return (
                        <div key={wa.id} className="glass group rounded-[2.5rem] border border-[#162952] p-8 relative overflow-hidden transition-all hover:border-[#00c9a7]/40 shadow-2xl">
                            {/* Status Backdrop Glow */}
                            <div className={`absolute top-0 right-0 w-40 h-40 blur-[80px] -mr-16 -mt-16 opacity-20 ${wa.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-red-500'}`} />

                            <div className="flex justify-between items-start mb-8 relative z-10">
                                <div className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-inner border ${wa.status === 'CONNECTED' ? 'bg-emerald-500/10 border-emerald-500/20 text-[#00c9a7]' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                    {wa.status === 'CONNECTED' ? <Wifi className="w-7 h-7" /> : <WifiOff className="w-7 h-7" />}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRestart(wa.id)}
                                        className="p-3 bg-[#162952] hover:bg-white/5 rounded-2xl text-[#94a3b8] transition-all"
                                        title="Reiniciar Sessão"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(wa.id)} className="p-3 bg-[#162952] hover:bg-red-500/10 rounded-2xl text-[#94a3b8] hover:text-red-400 transition-all" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                                    {wa.status === 'CONNECTED' && (
                                        <button onClick={() => handleLogout(wa.id)} className="p-3 bg-[#162952] hover:bg-orange-500/10 rounded-2xl text-[#94a3b8] hover:text-orange-400 transition-all" title="Desconectar"><WifiOff className="w-4 h-4" /></button>
                                    )}
                                </div>
                            </div>

                            <div className="relative z-10 mb-8">
                                <h3 className="text-xl font-display font-bold text-white mb-1">{wa.name || "Sem Nome"}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">ID: {wa.id} •</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${wa.status === 'CONNECTED' ? 'text-[#00c9a7]' : 'text-red-400'}`}>{wa.status}</span>
                                </div>
                            </div>

                            <div className="bg-[#0a1120]/40 border border-[#162952] rounded-3xl p-6 relative z-10 mb-8">
                                {wa.status === 'CONNECTED' ? (
                                    <div className="flex items-center gap-4">
                                        <ShieldCheck className="w-10 h-10 text-[#00c9a7]" />
                                        <div>
                                            <p className="text-xs font-bold text-white">Instância Ativa</p>
                                            <p className="text-[10px] text-[#94a3b8]">Pronta para enviar e receber</p>
                                        </div>
                                    </div>
                                ) : showQr ? (
                                    <div className="flex flex-col items-center">
                                        <div className="bg-white p-3 rounded-2xl mb-4 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                            <QRCodeSVG value={currentQr} size={150} />
                                        </div>
                                        <p className="text-[10px] font-bold text-[#00c9a7] animate-pulse">Aguardando Escaneamento...</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-xs text-[#94a3b8]">Iniciando WhatsApp... O QR Code aparecerá em instantes.</p>
                                    </div>
                                )}
                            </div>

                            <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-sm font-bold text-white hover:bg-[#00c9a7] hover:text-[#0a1120] transition-all flex items-center justify-center gap-2 group">
                                Ver Logs <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                            </button>
                        </div>
                    );
                })}

                {whatsApps.length === 0 && (
                    <div className="col-span-full py-20 text-center glass rounded-[3rem] border-2 border-dashed border-[#162952]">
                        <div className="w-20 h-20 bg-[#0f2040] rounded-full flex items-center justify-center mx-auto mb-6">
                            <Radio className="w-10 h-10 text-[#1e3a6e]" />
                        </div>
                        <h3 className="text-xl font-display font-bold text-white">Nenhum canal conectado</h3>
                        <p className="text-[#94a3b8] max-w-xs mx-auto mt-2">Adicione sua primeira instância para começar a interagir.</p>
                    </div>
                )}
            </div>

            {/* Modal Novo Canal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-[#0a1120]/80">
                    <div className="glass w-full max-w-lg rounded-[3rem] p-10 border border-[#00c9a7]/20 shadow-[0_0_50px_rgba(0,201,167,0.1)]">
                        <h2 className="text-2xl font-display font-bold text-white mb-2">Novo Canal</h2>
                        <p className="text-[#94a3b8] text-sm mb-10">Escolha como deseja se conectar ao WhatsApp.</p>

                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <button onClick={() => setConnType('qr')} className={`p-6 rounded-[2rem] border transition-all text-left group ${connType === 'qr' ? 'bg-[#00c9a7]/10 border-[#00c9a7] text-[#00c9a7]' : 'bg-[#162952]/40 border-[#1e3a6e] text-[#94a3b8]'}`}>
                                <QrCode className={`w-8 h-8 mb-4 ${connType === 'qr' ? 'text-[#00c9a7]' : 'text-[#475569]'}`} />
                                <p className="font-bold text-sm">QR Code</p>
                                <p className="text-[10px] font-medium opacity-60">Baileys Engine (Free)</p>
                            </button>
                            <button onClick={() => setConnType('official')} className={`p-6 rounded-[2rem] border transition-all text-left group ${connType === 'official' ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6]' : 'bg-[#162952]/40 border-[#1e3a6e] text-[#94a3b8]'}`}>
                                <Globe className={`w-8 h-8 mb-4 ${connType === 'official' ? 'text-[#3b82f6]' : 'text-[#475569]'}`} />
                                <p className="font-bold text-sm">Meta API</p>
                                <p className="text-[10px] font-medium opacity-60">Official Cloud API</p>
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[#475569] uppercase tracking-widest px-2">Nome da Instância</label>
                                <input
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Suporte Principal"
                                    className="w-full bg-[#162952]/40 border border-[#1e3a6e] rounded-2xl py-4 px-6 text-white text-sm focus:border-[#00c9a7] transition-all outline-none"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-[#162952] text-[#94a3b8] font-bold text-sm hover:bg-white/5 transition-all">Cancelar</button>
                                <button type="submit" className="flex-1 py-4 rounded-2xl bg-[#00c9a7] text-[#0a1628] font-bold text-sm shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Ativar Conexão</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
