# 의존성 없는 Node 게이트웨이 (npm install 불필요)
FROM node:22.22.3-alpine3.24@sha256:e58326d0d441090181ac150dc2078d3e2cf6a0d42e809aebba3ef5880935ffdd
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
ENV NODE_ENV=production
USER node
EXPOSE 8080
CMD ["node", "src/server.mjs"]
