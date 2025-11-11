FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.js ./next.config.js
# Create public directory (Next.js may not have static assets, but directory is safe to create)
RUN mkdir -p ./public

EXPOSE 3000

CMD ["npm", "start"]

