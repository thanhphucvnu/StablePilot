FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY public ./public
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV SIMULATION_MODE=true
ENV ENABLE_CORS=true
EXPOSE 8080
CMD ["node", "dist/server.js"]
