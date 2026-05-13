import { redirect } from "next/navigation";

export default function Home() {
  // Redireciona automaticamente para a tela de login do SaaS
  redirect("/login");
}
