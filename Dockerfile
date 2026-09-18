# 可选方案：把 render.yaml 里的 runtime 改成 docker 即可用本文件构建
# （默认不加 Dockerfile 时走 Render 原生 Node，构建更快）
FROM node:22-alpine

WORKDIR /app

# 1) 根依赖（Tailwind）+ 构建 CSS
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY src ./src
RUN npm run build:css

# 2) 后端依赖
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# 3) 其余源码（assets/models 已在 .dockerignore 中排除）
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/server.js"]
