# Chatboot SaaS - Multiatendimento para WhatsApp

Plataforma moderna de multiatendimento SaaS, construída com foco em performance, escalabilidade e design premium.

## 🚀 Tecnologias
- **Frontend:** Next.js, TailwindCSS, Lucide Icons, Socket.io-client.
- **Backend:** Node.js, Express, Socket.io, Prisma ORM, BullMQ, Redis.
- **WhatsApp Engine:** Baileys (WA Web API).
- **Banco de Dados:** PostgreSQL.

## 🏗️ Arquitetura
O sistema segue uma estrutura de monorepo:
- `/server`: API REST e Engine de WhatsApp.
- `/client`: Interface do usuário Next.js.

## 🐳 Como Executar com Docker (Recomendado para Testes)

A maneira mais rápida de sua equipe testar o projeto é utilizando o Docker. Isso subirá o Frontend, Backend, Banco de Dados (Postgres) e Redis automaticamente.

### 🛠️ Pré-requisitos
1.  **Docker Desktop** instalado ([Baixar aqui](https://www.docker.com/products/docker-desktop/))
2.  O Docker deve estar aberto e rodando.

### 🚀 Iniciando o Projeto
1.  Abra o terminal na pasta raiz do projeto (onde está o arquivo `docker-compose.yml`).
2.  Execute o comando:
    ```bash
    docker-compose up -d --build
    ```
3.  Aguarde o processo terminar (isso pode levar alguns minutos na primeira vez).

### 🔗 Acesso ao Sistema
Assim que o comando terminar, os serviços estarão disponíveis em:
*   **Painel (Frontend):** [http://localhost:3000](http://localhost:3000)
*   **API (Backend):** [http://localhost:4000](http://localhost:4000)

### 👤 Acesso Inicial
Na tela de login, sua equipe pode clicar em **"Crie agora gratuitamente"** para criar suas próprias contas de teste.

---

## 🏗️ Execução para Desenvolvimento (Local)

Se preferir rodar localmente sem Docker para os serviços de aplicação, siga estes passos:

### Passo 1: Infraestrutura (DB & Redis)
Suba apenas os serviços fundamentais:
```bash
docker-compose up -d postgres redis
```

### Passo 2: Backend (Server)
```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Passo 3: Frontend (Client)
```bash
cd client
npm install
npm run dev
```

## 💎 Funcionalidades Entregues
1.  **Arquitetura Multi-tenant**: Isolamento total de dados por empresa.
2.  **Dashboard Premium**: Interface moderna com métricas em tempo real.
3.  **Gestão de Conexões**: Interface para escanear QR Code e gerenciar múltiplos números.
4.  **Painel de Atendimento**: Sistema de chat completo com suporte a setores, filtros e histórico.
5.  **Sistema de Permissões**: Estrutura pronta para Admin, Supervisor e Agente.
6.  **Real-time**: Atualizações instantâneas via WebSockets.

## 🛣️ Roadmap Futuro
- Integração com API Oficial da Meta.
- Construtor de Fluxos de Chatbot (Drag & Drop).
- Relatórios Avançados com exportação em PDF.
- Integração com IA (OpenAI/Claude) para respostas automáticas.



tZrBfmhsvr↵