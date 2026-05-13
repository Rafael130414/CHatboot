FROM node:20-slim

WORKDIR /app

# Instalar dependências para o Prisma e build
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    openssl \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

# Gerar o cliente Prisma
RUN npx prisma generate

# Build do TypeScript
RUN npm run build

EXPOSE 4000

# Script para aguardar o postgres e rodar migrate antes de iniciar
CMD ["npm", "start"]
