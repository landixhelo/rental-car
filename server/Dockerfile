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
# Never block forever on db push (Neon wake / network blips). Always start the API.
CMD ["sh", "-c", "echo \"Boot PORT=${PORT:-8080}\"; (timeout 45 npx prisma db push --skip-generate || echo \"WARN: prisma db push skipped/failed\"); echo \"Starting AutoRent\"; exec node dist/index.js"]
