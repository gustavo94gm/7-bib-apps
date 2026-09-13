FROM oven/bun:1.4.2-alpine AS build
WORKDIR /app

COPY package.json bun.lock ./

RUN bun install

COPY . ./

RUN bun run build

FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/.output/ ./

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "/app/server/index.mjs"]
