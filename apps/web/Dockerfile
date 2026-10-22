# 阶段1(build)：使用 node:24-bookworm-slim 镜像
FROM node:24-bookworm-slim AS build

# 设置工作目录
WORKDIR /app

# 安装指定版本的 pnpm
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

# 复制打包构建所需要的所有必要文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web ./apps/web
COPY apps/server/package.json ./apps/server/package.json
COPY packages/config ./packages/config
COPY packages/shared ./packages/shared

# 安装 web 应用依赖并构建 web 应用
RUN pnpm install --frozen-lockfile --filter @ragflux/web...
RUN pnpm --filter @ragflux/web... build


# 阶段2(代理)：使用 nginx:1.28-alpine 镜像
FROM nginx:1.28-alpine

# 复制 nginx 配置与 web 应用 dist 文件
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# 暴露 80 端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
