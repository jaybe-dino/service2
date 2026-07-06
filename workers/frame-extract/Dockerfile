FROM node:22-slim

# ffmpeg(프레임 추출) + yt-dlp(영상 다운로드)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 curl ca-certificates \
  && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json server.js ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
