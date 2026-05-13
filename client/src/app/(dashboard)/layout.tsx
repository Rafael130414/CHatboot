"use client";

import React from "react";
import {
    LayoutDashboard,
    MessageSquare,
    Users,
    Settings,
    Radio,
    PieChart,
    LogOut,
    Plus,
    Hash,
    Shield,
    Sparkles,
    ChevronRight,
    UserCircle,
    GitBranch
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";

const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: MessageSquare, label: "Atendimentos", href: "/dashboard/tickets" },
    { icon: Users, label: "Contatos", href: "/dashboard/contacts" },
    { icon: Radio, label: "Conexões", href: "/dashboard/connections" },
    { icon: Hash, label: "Departamentos", href: "/dashboard/departments" },
    { icon: GitBranch, label: "Flowbuilder", href: "/dashboard/flowbuilder" },
    { icon: Shield, label: "Equipe", href: "/dashboard/team" },
    { icon: Settings, label: "Configurações", href: "/dashboard/settings" },
];

import { SocketProvider } from "@/contexts/SocketContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = React.useState<any>(null);

    React.useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            router.push("/login"); // Proteção básica: redireciona se não houver usuário
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
    };

    // Filtra itens do menu baseados no cargo (Ex: Atendente não vê Flowbuilder, Equipe, etc)
    const isAdmin = user?.role === "admin";
    const filteredMenu = menuItems.filter(item => {
        if (!isAdmin) {
            // Rotas bloqueadas para Atendentes
            const restricted = [
                "/dashboard/flowbuilder",
                "/dashboard/team",
                "/dashboard/settings",
                "/dashboard/connections",
                "/dashboard/departments"
            ];
            return !restricted.includes(item.href);
        }
        return true;
    });

    return (
        <SocketProvider>
            <div className="flex h-screen bg-[#0f172a] text-[#f8fafc] overflow-hidden font-sans">
                {/* Sidebar - Fiel à Imagem de Referência */}
                <aside className="w-64 flex flex-col bg-[#0a1120] z-20 border-r border-[#1e293b]/30">

                    {/* Logo Area */}
                    <div className="pt-8 pb-0 px-4 flex justify-center">
                        <Logo size="md" />
                    </div>

                    <div className="px-4 py-0">
                        <p className="text-[10px] font-bold text-[#475569] uppercase tracking-[0.15em] mb-2 px-2">Menu</p>
                        <nav className="space-y-0.5">
                            {filteredMenu.map((item) => {
                                const active = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 text-sm transition-all group relative ${active
                                            ? "bg-[#1e293b] text-white rounded-xl"
                                            : "text-[#94a3b8] hover:text-zinc-200"
                                            }`}
                                    >
                                        <item.icon className={`w-5 h-5 ${active ? "text-[#00d9a6]" : "text-[#475569]"}`} />
                                        <span className="font-semibold">{item.label}</span>

                                        {active && (
                                            <div className="absolute right-3 w-1.5 h-1.5 bg-[#00d9a6] rounded-full shadow-[0_0_8px_#00d9a6]" />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Perfil no Rodapé (Dinâmico) */}
                    <div className="mt-auto p-4 border-t border-[#1e293b]/30 bg-[#090f1d]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-[#00d9a6] rounded-full flex items-center justify-center text-[#0a1120] font-bold text-sm uppercase">
                                    {user?.name?.charAt(0) || "U"}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white truncate max-w-[100px]">{user?.name || "Usuário"}</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">{user?.role === "admin" ? "Adiministrador" : "Atendente"}</span>
                                </div>
                            </div>
                            <button onClick={handleLogout} className="p-2 text-[#475569] hover:text-white transition-colors">
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col bg-[#0f172a] overflow-hidden min-w-0">
                    <section className="flex-1 overflow-hidden relative flex flex-col">
                        {children}
                    </section>
                </main>
            </div>
        </SocketProvider>
    );
}
