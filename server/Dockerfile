# Build for Railway / Render / Docker
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist
RUN mkdir -p uploads
EXPOSE 8080
# Prefer prisma db push; API also self-heals missing columns via ensureSchema().
CMD ["sh", "-c", "echo \"Boot PORT=${PORT:-8080}\"; (timeout 90 npx prisma db push --skip-generate || echo \"WARN: prisma db push skipped/failed\"); echo \"Starting AutoRent\"; exec node dist/index.js"]
