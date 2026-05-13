"use client";

import React, { useState } from "react";
import { MessageSquare, Mail, Lock, ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import Logo from "@/components/Logo";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { data } = await api.post("/auth/signin", { email, password });
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.error || "Ocorreu um erro ao entrar.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050a14] flex items-center justify-center p-6 font-sans relative overflow-hidden">
            {/* Background Decorativo - Futurista */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00d9a6]/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#0088ff]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
            </div>

            <div className="w-full max-w-[460px] relative z-10">
                {/* Logo Area com Glow */}
                <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-8 duration-1000">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-[#00d9a6]/20 rounded-full blur-[40px] group-hover:bg-[#00d9a6]/40 transition-all duration-500" />
                        <Logo size="xl" className="relative z-10" />
                    </div>
                </div>

                {/* Login Card - Glassmorphism Premium */}
                <div className="bg-[#111927]/80 backdrop-blur-xl border border-white/5 p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Login</h2>
                        <p className="text-sm text-[#94a3b8]">Acesse a plataforma de multiatendimento</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold mb-6 flex items-center gap-3 italic">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Usuário / E-mail</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-[#00d9a6] transition-colors">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4.5 pl-14 pr-4 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-[#00d9a6]/50 focus:ring-4 focus:ring-[#00d9a6]/5 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Senha secreta</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-[#00d9a6] transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4.5 pl-14 pr-4 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-[#00d9a6]/50 focus:ring-4 focus:ring-[#00d9a6]/5 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button type="button" className="text-[10px] font-bold text-slate-600 hover:text-[#00d9a6] transition-colors uppercase tracking-widest">
                                Esqueceu a senha?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-[0.15em] text-xs py-5 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 mt-4"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Entrar no Ecossistema <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-white/5">
                        <p className="text-sm text-slate-500">
                            Novo por aqui?{" "}
                            <Link href="/signup" className="text-[#00d9a6] font-bold hover:text-emerald-300 transition-colors">
                                Criar conta gratuita
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
