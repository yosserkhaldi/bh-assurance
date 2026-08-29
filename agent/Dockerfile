FROM node:22-alpine

WORKDIR /app

COPY agent/package.json ./
COPY agent/tsconfig.json ./
RUN npm install

COPY agent/src ./src

CMD ["npx", "tsx", "src/index.ts"]
