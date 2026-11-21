FROM node:26-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@12.6.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM gcr.io/distroless/nodejs26-debian13:nonroot@sha256:1d736cf8b5716c07a245301f92717143215d248fd55771ee1936ef4b3302e531
WORKDIR /app
ENV NODE_ENV=production PORT=8080 PATH=/nodejs/bin:$PATH NODE_OPTIONS="--max-old-space-size=384 --max-semi-space-size=2" MALLOC_ARENA_MAX=2
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/infra/sessions.json ./infra/sessions.json
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["src/server/main.ts"]
