"use client";

import React, { useEffect, useState } from "react";
import {
    Users,
    MessageSquare,
    Clock,
    CheckCircle2,
    TrendingUp,
    Shield,
    Smartphone,
    User
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie
} from "recharts";
import api from "@/services/api";

const COLORS = ["#00d9a6", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];

const KpiCard = ({ title, value, detail, icon: Icon, loading, color = "#00d9a6" }: any) => (
    <div className="glass rounded-[2rem] p-8 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />

        <div className="flex justify-between items-start relative z-10">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</p>
                </div>
                <h3 className="text-5xl font-black text-white tracking-tighter">
                    {loading ? <span className="animate-pulse text-white/10">···</span> : value}
                </h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                <Icon className="w-7 h-7" />
            </div>
        </div>

        <div className="mt-8 flex items-center gap-2 relative z-10">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{detail}</span>
        </div>
    </div>
);

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState({ open: 0, pending: 0, closed: 0, closedToday: 0 });
    const [weekData, setWeekData] = useState<any[]>([]);
    const [perAgent, setPerAgent] = useState<any[]>([]);
    const [perConnection, setPerConnection] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const { data } = await api.get("/dashboard/stats", {
                headers: { Authorization: `Bearer ${token}` }
            });

            setKpis(data.kpis);
            setWeekData(data.weekData);
            setPerAgent(data.perAgent);
            setPerConnection(data.perConnection);
        } catch (err) {
            console.error("Dashboard error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 p-10 overflow-y-auto h-full scrollbar-hide bg-[#060d1a]">
            {/* Header Moderno */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter">Business Intelligence</h1>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] ml-[52px]">Relatórios operacionais em tempo real</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="px-5 py-3 glass rounded-2xl border border-white/5 flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status da Rede</span>
                            <span className="text-xs font-black text-emerald-500 uppercase flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Operacional
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={loadData}
                        className="h-14 px-8 bg-white text-[#060d1a] hover:bg-emerald-500 hover:text-white transition-all rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-white/5 active:scale-95"
                    >
                        Atualizar Dados
                    </button>
                </div>
            </div>

            {/* Grid de KPIs Ultra Moderno */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <KpiCard title="Atuais" value={kpis.open} detail="Tickets em aberto" icon={MessageSquare} loading={loading} color="#3b82f6" />
                <KpiCard title="Fila" value={kpis.pending} detail="Aguardando aceite" icon={Clock} loading={loading} color="#f59e0b" />
                <KpiCard title="Hoje" value={kpis.closedToday} detail="Finalizados hoje" icon={CheckCircle2} loading={loading} color="#00d9a6" />
                <KpiCard title="Total" value={kpis.closed} detail="Histórico total" icon={Shield} loading={loading} color="#8b5cf6" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gráfico de Tendência */}
                <div className="lg:col-span-2 glass rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32" />

                    <div className="flex items-center justify-between mb-12 relative z-10">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">Performance Semanal</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Volume de interações nos últimos 7 dias</p>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Criados</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Resolvidos</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[350px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weekData}>
                                <defs>
                                    <linearGradient id="gradCriados" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradResolvidos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" vertical={false} strokeOpacity={0.03} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#475569"
                                    fontSize={10}
                                    fontWeight="900"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ dy: 10 }}
                                />
                                <YAxis
                                    stroke="#475569"
                                    fontSize={10}
                                    fontWeight="900"
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    cursor={{ stroke: '#ffffff', strokeWidth: 1, strokeOpacity: 0.1 }}
                                    contentStyle={{
                                        background: 'rgba(15, 23, 42, 0.9)',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        borderRadius: '20px',
                                        padding: '12px 16px'
                                    }}
                                    itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}
                                />
                                <Area type="monotone" dataKey="criados" stroke="#10b981" strokeWidth={3} fill="url(#gradCriados)" />
                                <Area type="monotone" dataKey="resolvidos" stroke="#3b82f6" strokeWidth={3} fill="url(#gradResolvidos)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribuição por Conexão */}
                <div className="glass rounded-[2.5rem] p-10 border border-white/5 flex flex-col">
                    <h3 className="text-xl font-black text-white tracking-tight mb-2">Canais Ativos</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-10">Carga por conexão WhatsApp</p>

                    <div className="flex-1 flex flex-col gap-6 overflow-y-auto scrollbar-hide pr-2">
                        {perConnection.map((conn, idx) => (
                            <div key={idx} className="space-y-3 group">
                                <div className="flex justify-between items-center px-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                                            <Smartphone className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <span className="text-[11px] font-black text-white uppercase tracking-wider">{conn.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-white">{conn.value} <span className="text-[9px] text-slate-500 ml-1 uppercase">Tickets</span></span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-1000"
                                        style={{ width: `${(conn.value / Math.max(...perConnection.map(c => c.value), 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ranking de Atendentes (Sugerido pelo Usuário) */}
                <div className="lg:col-span-3 glass rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">Ranking de Atendentes</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Produtividade filtrada por canal e agente</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {perAgent.map((agent, idx) => (
                            <div key={idx} className="glass group rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0f2040] to-[#162952] border border-[#1e3a6e] flex items-center justify-center text-xl font-black text-[#00c9a7]">
                                        {agent.name?.[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-white truncate w-32">{agent.name}</h4>
                                        <div className="flex items-center gap-1.5">
                                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{agent.total} Atendimentos</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 h-32 overflow-y-auto scrollbar-hide">
                                    {agent.connections.map((conn: any, cidx: number) => (
                                        <div key={cidx} className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest p-2 rounded-xl bg-white/5 border border-white/5">
                                            <span className="text-slate-400">{conn.name}</span>
                                            <span className="text-emerald-500">{conn.count}</span>
                                        </div>
                                    ))}
                                    {agent.connections.length === 0 && (
                                        <div className="h-full flex items-center justify-center opacity-20 py-8">
                                            <User className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
}
