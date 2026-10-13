# This Dockerfile builds SPA and PWA artifacts and starts an Nginx if you run it in standalone mode
# The Nginx is supposed to serve the following static assets:
# /var/www for SPA and PWA
# /storage at example.com/media/stream and example.com/media/download (if offload is enabled)
# /covers for cover images (if offload is enabled)
# Nginx should also be configured to reverse proxy to the backend at /api
# Please refer to docs/nginx for examples

# Build SPA and PWA
FROM node:22 as build-stage
WORKDIR /frontend
# Quasar v2 builds on dart-sass, so the old node-sass binary workaround is gone.

# npm 镜像源：默认走国内 npmmirror，需要用官方源时加 --build-arg NPM_REGISTRY=https://registry.npmjs.org
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm config set registry ${NPM_REGISTRY}

COPY package*.json ./
RUN npm ci
COPY . .
RUN npx quasar build && npx quasar build -m pwa

# We only need the build artifact
FROM nginx:mainline-alpine

# FRONTEND_TYPE can be spa or pwa
ARG FRONTEND_TYPE=pwa
WORKDIR /var/www
COPY --from=build-stage /frontend/dist/${FRONTEND_TYPE} /var/www

# Mount your own Nginx config
RUN rm -rf /etc/nginx/conf.d/*
VOLUME [ "/etc/nginx/conf.d" ]
EXPOSE 80

# If you are using Let's Encrypt
VOLUME [ "/etc/letsencrypt" ]
EXPOSE 443

# Mount offload paths for media files and covers
VOLUME [ "/storage", "/covers" ]

# Note: ENTRYPOINT and CMD is provided by the nginx base image
