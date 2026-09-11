FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY server.ts ./
COPY server ./server

EXPOSE 8080

CMD ["node", "dist/server.cjs"]