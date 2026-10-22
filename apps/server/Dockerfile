# 阶段1(build)：使用 node:24-bookworm-slim 镜像
# 构建上下文是仓库根目录：docker build -f apps/server/Dockerfile .
FROM node:24-bookworm-slim AS build

WORKDIR /app

# argon2 需要编译原生模块
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# 安装指定版本的 pnpm
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

# 复制依赖清单。构建阶段不要设置 NODE_ENV=production，否则会跳过 nest、typescript 等 devDependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# 安装 server 及其 workspace 依赖
RUN pnpm install --frozen-lockfile --filter @ragflux/server...

# 复制源码并构建。... 会先构建 @ragflux/config 和 @ragflux/shared
COPY apps/server ./apps/server
COPY packages/config ./packages/config
COPY packages/shared ./packages/shared
RUN pnpm --filter @ragflux/server... build


# 阶段2(runtime)：只保留运行所需文件
FROM node:24-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

# pnpm 使用相对符号链接，node_modules 与各包目录必须一起复制
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/packages/config ./packages/config
COPY --from=build /app/packages/shared ./packages/shared

WORKDIR /app/apps/server

# api 3001，relay 3002，worker 3003
EXPOSE 3001 3002 3003

# 任一 HTTP 响应都表示 API 已监听；当前没有独立健康检查路由
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api').then(()=>process.exit(0)).catch(()=>process.exit(1))"

# 同时启动 api、relay、worker
CMD ["pnpm", "start"]
