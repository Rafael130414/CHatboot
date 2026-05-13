"use client";

import React, { useEffect, useState } from "react";
import {
    Users,
    MessageSquare,
    Clock,
    CheckCircle2,
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
    Cell
} from "recharts";
import api from "@/services/api";

const COLORS = ["#00d9a6", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];

const KpiCard = ({ title, value, detail, icon: Icon, loading }: any) => (
    <div className="bg-[#1e293b] p-6 rounded-2xl flex flex-col justify-between h-[160px] relative overflow-hidden group">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <p className="text-zinc-400 text-sm font-medium leading-tight max-w-[150px]">{title}</p>
                <h3 className="text-4xl font-bold text-white mt-4">
                    {loading ? <span className="animate-pulse text-[#334155]">—</span> : value}
                </h3>
            </div>
            <div className="w-12 h-12 rounded-full border border-[#334155] flex items-center justify-center text-[#00d9a6]">
                <Icon className="w-6 h-6" />
            </div>
        </div>
        <div className="flex items-center gap-1 mt-4">
            <span className="text-xs font-medium text-[#64748b]">{detail}</span>
        </div>
    </div>
);

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState({ open: 0, pending: 0, closed: 0, closedToday: 0 });
    const [weekData, setWeekData] = useState<any[]>([]);
    const [deptData, setDeptData] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // KPIs
            const [openRes, pendingRes, closedRes] = await Promise.all([
                api.get("/tickets?status=open", { headers }),
                api.get("/tickets?status=pending", { headers }),
                api.get("/tickets?status=closed", { headers }),
            ]);

            const open = openRes.data.length;
            const pending = pendingRes.data.length;
            const closed = closedRes.data;

            // Fechados hoje
            const today = new Date().toDateString();
            const closedToday = closed.filter((t: any) =>
                new Date(t.updatedAt).toDateString() === today
            ).length;

            setKpis({ open, pending, closed: closed.length, closedToday });

            // Distribuição por departamento
            const [deptRes] = await Promise.all([
                api.get("/departments", { headers }),
            ]);

            const depts = deptRes.data;
            const allTickets = [...openRes.data, ...pendingRes.data, ...closedRes.data];

            const deptCounts = depts.map((d: any) => ({
                name: d.name,
                value: allTickets.filter((t: any) => t.departmentId === d.id).length
            }));

            // Adiciona "Sem departamento"
            const semDep = allTickets.filter((t: any) => !t.departmentId).length;
            if (semDep > 0) deptCounts.push({ name: "Geral", value: semDep });

            setDeptData(deptCounts);

            // Gráfico da semana: tickets criados por dia (últimos 7 dias)
            const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
            const weekMap: Record<string, { criados: number; resolvidos: number }> = {};

            // Inicializa os últimos 7 dias
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const label = days[d.getDay()];
                weekMap[label] = { criados: 0, resolvidos: 0 };
            }

            allTickets.forEach((t: any) => {
                const created = new Date(t.createdAt);
                const daysDiff = Math.floor((Date.now() - created.getTime()) / 86400000);
                if (daysDiff <= 6) {
                    const label = days[created.getDay()];
                    if (weekMap[label]) weekMap[label].criados++;
                }
                if (t.status === "closed") {
                    const updated = new Date(t.updatedAt);
                    const diff = Math.floor((Date.now() - updated.getTime()) / 86400000);
                    if (diff <= 6) {
                        const label = days[updated.getDay()];
                        if (weekMap[label]) weekMap[label].resolvidos++;
                    }
                }
            });

            setWeekData(Object.entries(weekMap).map(([name, v]) => ({ name, ...v })));

        } catch (err) {
            console.error("Dashboard error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 p-8 overflow-y-auto h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-sm text-[#64748b] mt-1">Visão geral dos atendimentos em tempo real</p>
                </div>
                <button onClick={loadData} className="text-xs font-bold text-[#00d9a6] border border-[#00d9a6]/30 px-4 py-2 rounded-xl hover:bg-[#00d9a6]/10 transition-all">
                    ↻ Atualizar
                </button>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Em Atendimento" value={kpis.open} detail="Tickets abertos agora" icon={MessageSquare} loading={loading} />
                <KpiCard title="Aguardando" value={kpis.pending} detail="Pendentes de aceite" icon={Clock} loading={loading} />
                <KpiCard title="Resolvidos Hoje" value={kpis.closedToday} detail="Finalizados no dia" icon={CheckCircle2} loading={loading} />
                <KpiCard title="Total Finalizados" value={kpis.closed} detail="Histórico completo" icon={Users} loading={loading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico Semanal - dados reais */}
                <div className="lg:col-span-2 bg-[#1e293b] p-8 rounded-2xl">
                    <div className="mb-8">
                        <h3 className="font-bold text-lg text-white">Atendimentos da semana</h3>
                        <p className="text-xs text-[#94a3b8]">Criados × Resolvidos nos últimos 7 dias</p>
                    </div>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weekData}>
                                <defs>
                                    <linearGradient id="colorCriados" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00d9a6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#00d9a6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorResolvidos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} strokeOpacity={0.2} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                                    itemStyle={{ color: '#cbd5e1' }}
                                />
                                <Area type="monotone" dataKey="criados" name="Criados" stroke="#00d9a6" strokeWidth={2} fill="url(#colorCriados)" />
                                <Area type="monotone" dataKey="resolvidos" name="Resolvidos" stroke="#3b82f6" strokeWidth={2} fill="url(#colorResolvidos)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex gap-6 mt-4">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#00d9a6]" /><span className="text-xs text-[#94a3b8]">Criados</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3b82f6]" /><span className="text-xs text-[#94a3b8]">Resolvidos</span></div>
                    </div>
                </div>

                {/* Por Departamento - dados reais */}
                <div className="bg-[#1e293b] p-8 rounded-2xl">
                    <h3 className="font-bold text-lg text-white mb-6">Por departamento</h3>
                    {loading ? (
                        <div className="flex items-center justify-center h-[280px] text-[#475569] text-sm">Carregando...</div>
                    ) : deptData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[280px] text-[#475569]">
                            <p className="text-sm font-bold">Sem dados</p>
                            <p className="text-xs mt-1">Crie departamentos e transfira tickets</p>
                        </div>
                    ) : (
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={deptData} layout="vertical">
                                    <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={80} />
                                    <Tooltip
                                        contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                                        itemStyle={{ color: '#00d9a6' }}
                                    />
                                    <Bar dataKey="value" name="Tickets" radius={[0, 6, 6, 0]} barSize={20}>
                                        {deptData.map((_: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
