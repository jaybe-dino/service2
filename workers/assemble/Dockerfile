# Remake 조립 워커 — FFmpeg + Node
FROM node:20-slim

# ffmpeg + 자막 번인용 폰트(Noto CJK=한/중/일, Noto core=라틴/태국 등)
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg ca-certificates fonts-noto-cjk fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
COPY server.js ./

ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
