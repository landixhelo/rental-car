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
EXPOSE 5000
CMD ["sh", "-c", "npx prisma db push && echo \"Starting AutoRent on PORT=${PORT:-5000}\" && node dist/index.js"]
