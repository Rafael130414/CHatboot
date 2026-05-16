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

---

## 📡 Integração GenieACS + IXC Soft (Sincronizador Automático)

A plataforma possui um Motor de Sincronização em segundo plano que integra de forma transparente o banco de dados do **IXC Soft** (ERP) com o servidor de gerência e provisionamento **GenieACS** (TR-069).

### Como funciona
A cada 30 minutos, ou no momento do boot do `chatboot-api`, o arquivo `GenieACSSyncService.ts` realiza o seguinte fluxo:
1. Conecta-se à API nativa do GenieACS (NBI) via `http://[IP-ACS]:7557`.
2. Faz o download do inventário completo de dispositivos e suas árvores de parâmetros de hardware e rede, extraindo dinamicamente o login PPPoE (`Username`).
3. Para cada PPPoE identificado, realiza um WebService call para o IXC buscando o "Nome do Cliente" que corresponde àquele login de provedor.
4. Caso o nome capturado seja diferente daquele atualmente gravado no ACS, o script injeta no GenieACS as seguintes informações:
   - Uma **Tag oficial** com o nome filtrado (ex: `IXC__JOAO_DA_SILVA`), visível nos labels nativos;
   - Uma Task TR-069 (CWMP) `setParameterValues` definindo o nome também no campo estático do dispositivo (`InternetGatewayDevice.DeviceInfo.ProvisioningCode`);

### Exibição UI do GenieACS Inteligente / Lidando com 2 Contratos
Como medida de segurança, firmwares modernos podem bloquear uma requisição de `setParameterValues` externa. Para contornar isso com maestria tecnológica:
* Foi codificado um **Parâmetro Virtual (VirtualParameters.NomeCliente)** dentro do GenieACS configurado para ler ativamente as propriedades das Tags que possuam prefixo `IXC__`.
* Sendo um parâmetro de leitura dinâmica (Virtual), não requer permissão de gravação física da ONU. Alteramos o painel interativo Web do Admin (`Edit device page`) mapeando o widget visual `Cliente:` diretamente na rota do parâmetro virtual. 
* **Cenário de Múltiplos Contratos por CPF:** Caso um assinante possua várias propriedades (Ex: Casa matriz e Loja Filial), cada localidade portará um login PPPoE distinto (Ex: `maria@matriz` vs `maria@filial`). O sincronizador trata os PPPoE's independentemente. Consequentemente, o GenieACS listará elegantemente dois roteadores sob a mesma tag "Maria", e durante as buscas no painel Master aparecerão as duas propriedades separadamente sem nenhum conflito sistêmico. Para fluxos de chatbots, a listagem do IXC com a `IxcService.listLogins` varre ambos e deve ser apresentada ao assinante para ele escolher qual roteador ele quer gerenciar/obter relatório via bot.

---

## 🤖 Fluxo de Integração com a Inteligência Artificial (IA)

O Chatboot foi desenhado com uma arquitetura técnica segura para **prevenir erros com clientes homônimos** (que possuem o mesmo nome) ou clientes com múltiplos contratos (Casa, Empresa, Chácara). 

A IA **nunca confia no "Nome" ou "CPF" diretamente para acionar ações no roteador**. O fluxo obrigatório para operações sistêmicas na IA é o seguinte:

1. **Reconhecimento (WhatsApp):** O cliente inicia o diálogo com a IA e fornece seu CPF.
2. **Busca na Fonte de Verdade (IXC):** A Engine aciona a API do IXC e cruza o CPF. O IXC retorna todos os contratos (`radusuarios`) daquele CPF.
3. **Checagem de Multiplicidade:**
   - *Se houver apenas um contrato*, a IA reserva aquela conexão na memória.
   - *Se houver múltiplos (Ex: `joaocasa@fb` e `joaoloja@fb`)*, a IA exibe um submenu interativo no WhatsApp: *"João, vi que você possui conexão ativada na sua Casa e na sua Loja. De qual endereçõ precisamos tratar?"*.
4. **Alvo Técnico Mapeado (GenieACS):** Ao invés de mandar o GenieACS reiniciar ou extrair sinal pelo "CPF" ou "ID", a IA usa o **Login PPPoE exclusivo** do cliente como chave primária de consulta no painel de gerência.
5. **Ação Disparada:** A IA faz a requisição para a API do GenieACS passando o parâmetro (ex: `Username == joaocasa@fb`). O ACS devolve estritamente a ONU física daquele login. A IA então dispara os comandos TR-069 via NBI (Reinboot via `ConnectionRequest`, Troca de Senha SSID via `SetParameterValues`, Leitura Ótica via `GetParameterValues`).

> **Resumo da Teoria:** A IA se comunica com o cliente de forma "humana" (buscando por Nome/CPF), porém, internamente, o software converte essa string e executa no banco de dados todas as ações cirúrgicas em cima do **PPPoE** para garantir assertividade de 100%.



tZrBfmhsvr