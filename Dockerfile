# Backend BH Assurance - Docker image
FROM node:22-alpine

WORKDIR /app

# Copier les manifestes de dépendances
COPY package*.json ./
COPY backend/package*.json ./backend/

# Installer les dépendances du backend (workspace)
RUN npm ci --workspace=backend

# Copier le code source et le schéma Prisma
COPY backend ./backend
COPY prisma ./prisma

# Générer le client Prisma et compiler le backend
RUN npm run prisma:generate -w backend
RUN npm run build -w backend

# Variables par défaut (écrasables dans docker-compose ou .env)
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/bh_assurance?schema=public
ENV JWT_SECRET=replace_me_in_production
ENV JWT_REFRESH_SECRET=replace_me_in_production
ENV FRONTEND_URL=http://localhost:3000
ENV PORT=3001

EXPOSE 3001

CMD ["node", "backend/dist/src/main.js"]
