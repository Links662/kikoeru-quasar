# 阶段1：依赖安装层（独立缓存）
FROM node:14 as dependencies
WORKDIR /frontend
ENV SASS_BINARY_SITE="https://github.com/umonaca/node-sass/releases/download"

# 复制依赖声明文件
COPY package*.json ./

# 安装依赖（这一层只在 package.json 变化时才会重新构建）
RUN npm ci --only=production && \
    npm cache clean --force

# 单独安装全局工具（避免每次清缓存）
RUN npm install -g @quasar/cli

# 阶段2：构建层
FROM dependencies as build-stage
COPY . .

# 构建 SPA 和 PWA（如果源码未变则使用缓存）
RUN quasar build && quasar build -m pwa

# 阶段3：运行时镜像
FROM nginx:mainline-alpine

ARG FRONTEND_TYPE=pwa
WORKDIR /var/www

# 从构建阶段复制最终产物
COPY --from=build-stage /frontend/dist/${FRONTEND_TYPE} /var/www

# 清理默认配置，准备挂载点
RUN rm -rf /etc/nginx/conf.d/* && \
    mkdir -p /storage /covers

# 声明卷（可写挂载）
VOLUME [ "/etc/nginx/conf.d", "/etc/letsencrypt", "/storage", "/covers" ]

EXPOSE 80 443

# 使用 nginx 基础镜像的默认 CMD