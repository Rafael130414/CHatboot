"use client";

import React, { useState } from "react";
import { MessageSquare, Mail, Lock, User, Building, ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/services/api";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await api.post("/auth/signup", { name, email, password, companyName });
            router.push("/login?signup=success");
        } catch (err: any) {
            setError(err.response?.data?.error || "Ocorreu um erro ao criar conta.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a1120] flex items-center justify-center p-6 font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e293b_0%,#0a1120_100%)] opacity-50" />

            <div className="w-full max-w-[480px] relative">
                <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="w-14 h-14 bg-[#00d9a6] rounded-[20px] flex items-center justify-center shadow-[0_0_20px_rgba(0,217,166,0.2)] mb-4">
                        <Sparkles className="text-[#0a1120] w-7 h-7 fill-current" />
                    </div>
                    <h1 className="text-3xl font-display font-black text-white italic uppercase tracking-tighter">Chatboot</h1>
                </div>

                <div className="bg-[#1e293b] border border-[#334155]/50 p-10 rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <h2 className="text-2xl font-bold text-white mb-2">Crie sua conta</h2>
                    <p className="text-sm text-[#94a3b8] mb-8">Comece agora a profissionalizar seu atendimento.</p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold mb-6 flex items-center gap-3 italic">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#475569] ml-1">Nome</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#475569] group-focus-within:text-[#00d9a6] transition-colors">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="text" required value={name} onChange={(e) => setName(e.target.value)}
                                        placeholder="Seu nome"
                                        className="w-full bg-[#0a1120] border border-[#334155] rounded-xl py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00d9a6] transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#475569] ml-1">Empresa</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#475569] group-focus-within:text-[#00d9a6] transition-colors">
                                        <Building className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Nome da Empresa"
                                        className="w-full bg-[#0a1120] border border-[#334155] rounded-xl py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00d9a6] transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#475569] ml-1">E-mail</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#475569] group-focus-within:text-[#00d9a6] transition-colors">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <input
                                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    className="w-full bg-[#0a1120] border border-[#334155] rounded-xl py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00d9a6] transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#475569] ml-1">Senha</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#475569] group-focus-within:text-[#00d9a6] transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Escolha uma senha forte"
                                    className="w-full bg-[#0a1120] border border-[#334155] rounded-xl py-3.5 pl-11 pr-4 text-xs text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00d9a6] transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-[#00d9a6] hover:bg-[#00b289] text-[#0a1120] font-black uppercase tracking-widest text-[11px] py-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-[#00d9a6]/10 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 mt-4"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Começar agora <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-[#475569]">
                            Já tem uma conta?{" "}
                            <Link href="/login" className="text-[#00d9a6] font-bold hover:underline underline-offset-4">
                                Fazer Login
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
