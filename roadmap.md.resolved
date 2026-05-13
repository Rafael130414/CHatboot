# 🚀 Mcall Platform — Roadmap FlowBuilder SaaS

## Stack Atual ✅
| Camada | Tecnologia | Status |
|---|---|---|
| Frontend | Next.js 16 + React Flow | ✅ Ativo |
| Backend | NestJS/Express + TypeScript | ✅ Ativo |
| ORM | Prisma | ✅ Ativo |
| Banco | PostgreSQL | ✅ Ativo |
| Cache/Fila | Redis | ✅ Ativo |
| WebSocket | Socket.IO | ✅ Ativo |
| WhatsApp | Baileys (QR Code) | ✅ Ativo |
| Infra | Docker Compose | ✅ Ativo |
| Auth | JWT + Multi-empresa | ✅ Ativo |

---

## Fase 1 — MVP+ (Imediato) 🔥
> **Objetivo:** Tornar o FlowBuilder funcional e profissional para uso real

### FlowBuilder — Editor Visual
- [ ] **Undo/Redo** — Ctrl+Z / Ctrl+Y no canvas
- [ ] **Duplicar nó** — botão ou Ctrl+D
- [ ] **Copiar/colar nó** — Ctrl+C / Ctrl+V
- [ ] **Seleção múltipla** — arrastar área + Shift+Click
- [ ] **Organização automática** — layout automático dos nós
- [ ] **Teclado DEL** — deletar nó selecionado

### Sistema de Variáveis
- [ ] `{{nome}}`, `{{telefone}}`, `{{ultima_mensagem}}`, `{{empresa}}`
- [ ] Variáveis de sessão persistidas no Redis
- [ ] Substituição automática nas mensagens do bot
- [ ] Painel de variáveis no editor

### Novos Tipos de Nó
- [ ] **Imagem** — envia imagem via URL
- [ ] **Áudio** — envia áudio
- [ ] **Documento** — envia arquivo
- [ ] **HTTP Request** — chamada a API externa (GET/POST)
- [ ] **Webhook Entrada** — recebe dados externos
- [ ] **Definir Variável** — seta variável de sessão
- [ ] **Loop** — repete até condição ser atendida

### Engine Backend
- [ ] Substituição de variáveis `{{var}}` nas mensagens
- [ ] Armazenar contexto completo da conversa no Redis
- [ ] Suporte a nós de HTTP Request

---

## Fase 2 — Inteligência 🤖
> **Objetivo:** IA real, integrações e webhooks

### IA Integrada
- [ ] **OpenAI GPT-4o** — nó com prompt + histórico da conversa
- [ ] **Google Gemini** — alternativa ao OpenAI
- [ ] **Memória de conversa** — contexto passado para a IA
- [ ] **Classificação automática** — IA classifica intenção e direciona fluxo
- [ ] **RAG** — responde com base em documentos da empresa

### Integrações
- [ ] **HTTP Request Node** — GET, POST, PUT com headers e body configuráveis
- [ ] **Webhook Node** — URL de entrada para disparo externo do fluxo
- [ ] **Google Sheets** — leitura e escrita
- [ ] **Notion** — criação de registros
- [ ] **Zapier/Make** — webhook genérico

### Novos Nodes
- [ ] **Switch/Router** — direciona por múltiplas condições
- [ ] **Randomização** — escolhe caminho aleatório (variante A/B)
- [ ] **Adicionar Tag** — tag automática no contato
- [ ] **Agendamento** — envio programado

---

## Fase 3 — Operação Profissional 📊
> **Objetivo:** Analytics, debug e versionamento

### Debug & Simulador
- [ ] **Modo simulação** — testar fluxo sem enviar mensagem real
- [ ] **Execução node-a-node** — highlight do nó em execução
- [ ] **Logs de execução** — histórico detalhado por conversa
- [ ] **Visualizador de erros** — nó com erro exibido em vermelho

### Analytics do Fluxo
- [ ] Taxa de conversão por nó
- [ ] Abandono (onde o usuário desiste)
- [ ] Tempo médio de atendimento
- [ ] Funil de atendimento visual
- [ ] Dashboard de uso de IA

### Versionamento
- [ ] Salvar versões nomeadas do fluxo
- [ ] Publicar versão produção vs rascunho
- [ ] Reverter para versão anterior
- [ ] Diff visual entre versões

---

## Fase 4 — Escala Enterprise 🏢
> **Objetivo:** Produto SaaS completo multiempresa

### Sistema de Filas
- [ ] **BullMQ** para processamento assíncrono de mensagens
- [ ] **SLA** por fila/departamento
- [ ] **Round-robin** para distribuição entre atendentes
- [ ] **Priorização** por tags ou classificação IA

### Omnicanal
- [ ] **WhatsApp Cloud API** (oficial Meta)
- [ ] **Instagram DM**
- [ ] **Telegram**
- [ ] **Widget Chat site**
- [ ] **Email via SMTP**

### Segurança & Compliance
- [ ] RBAC (roles: admin, supervisor, atendente, viewer)
- [ ] Logs de auditoria (quem fez o quê e quando)
- [ ] Rate limiting por empresa
- [ ] Criptografia de dados sensíveis
- [ ] LGPD — exportar/deletar dados do contato

---

## Arquitetura Alvo

```
Cliente WhatsApp
      ↓
Gateway (Baileys / Cloud API)
      ↓
BullMQ (Fila Redis)
      ↓
Flow Engine (Node.js)
      ├── Executor de Nós
      │   ├── Mensagem / Mídia
      │   ├── Menu / Botões
      │   ├── Condição / Switch
      │   ├── IA (OpenAI / Gemini)
      │   ├── HTTP Request
      │   └── Transferência
      ├── Context Manager (Redis)
      │   └── {phone, step, variables, history}
      └── Resposta → WhatsApp
```

---

## Prioridade de Implementação

| # | Feature | Impacto | Esforço | Status |
|---|---|---|---|---|
| 1 | Variáveis `{{nome}}` no engine | 🔴 Crítico | Baixo | 🔲 |
| 2 | Mais tipos de nó (HTTP, Imagem, Var) | 🔴 Alto | Médio | 🔲 |
| 3 | Undo/Redo + Duplicar nó | 🟡 Alto | Baixo | 🔲 |
| 4 | IA real (OpenAI/Gemini) | 🔴 Alto | Médio | 🔲 |
| 5 | Simulador de fluxo | 🟡 Médio | Alto | 🔲 |
| 6 | Analytics básico | 🟡 Médio | Médio | 🔲 |
| 7 | WhatsApp Cloud API | 🟡 Alto | Alto | 🔲 |
| 8 | Versionamento de fluxos | 🟢 Médio | Alto | 🔲 |
