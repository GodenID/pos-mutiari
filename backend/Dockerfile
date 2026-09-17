FROM node:22-alpine AS base
WORKDIR /app

# Zona waktu operasional (WIB) — batas hari invoice & laporan ikut ini
RUN apk add --no-cache tzdata
ENV TZ=Asia/Jakarta

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
