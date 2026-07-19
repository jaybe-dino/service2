// Remake Studio — 장면별 프레임 추출 워커 (배포형).
// 계약: POST / { videoUrl, timestamps:[초...] }  →  { frames:[{ b64, mime } | null] } (인덱스 매칭)
// 무거운 작업(영상 다운로드 + ffmpeg 프레임 추출)은 여기서 수행. Vercel 앱은 이 URL만 호출.
// 필요한 시스템 바이너리: yt-dlp, ffmpeg (Dockerfile 참고).
// ⚠️ 타 크리에이터 영상 다운로드는 플랫폼 ToS/저작권 이슈가 있을 수 있음 — 권리/정책 확인 후 사용.
const http = require("http");
const { execFile } = require("child_process");
const { mkdtempSync, readFileSync, rmSync, statSync } = require("fs");
const os = require("os");
const path = require("path");

const PORT = process.env.PORT || 8080;
const KEY = process.env.FRAME_SERVICE_KEY || "";

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 180000, maxBuffer: 1 << 26 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`${cmd}: ${(stderr || err.message || "").slice(0, 300)}`));
      else resolve(stdout);
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "GET") {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end("frame-extract ok");
  }
  if (req.method !== "POST") {
    res.writeHead(405);
    return res.end();
  }
  if (KEY && req.headers.authorization !== `Bearer ${KEY}`) {
    res.writeHead(401);
    return res.end("unauthorized");
  }
  let body = "";
  req.on("data", (c) => {
    body += c;
    if (body.length > 2_000_000) req.destroy();
  });
  req.on("end", async () => {
    let dir;
    try {
      const parsed = JSON.parse(body || "{}");
      const { videoUrl } = parsed;
      let { timestamps } = parsed;
      const count = Number(parsed.count) || 0;
      if (!videoUrl) throw new Error("videoUrl 필요");
      dir = mkdtempSync(path.join(os.tmpdir(), "fx-"));
      const mp4 = path.join(dir, "in.mp4");
      // 세로 숏폼 mp4 다운로드
      await run("yt-dlp", ["-f", "mp4/best", "-o", mp4, "--no-playlist", "--no-warnings", "--quiet", videoUrl]);

      // count만 주면 영상 길이(ffprobe) 기준으로 균등 샘플링 → 분석용 스트립.
      if ((!Array.isArray(timestamps) || !timestamps.length) && count > 0) {
        let dur = 0;
        try {
          const out = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", mp4]);
          dur = parseFloat(String(out).trim()) || 0;
        } catch {
          dur = 0;
        }
        const n = Math.max(1, Math.min(16, count));
        timestamps = dur > 0
          ? Array.from({ length: n }, (_, k) => +((dur * (k + 0.5)) / n).toFixed(2))
          : Array.from({ length: n }, (_, k) => k * 2);
      }
      if (!Array.isArray(timestamps)) throw new Error("timestamps 또는 count 필요");

      // 진단: 다운로드 파일 크기
      let fileSize = 0;
      try { fileSize = statSync(mp4).size; } catch { fileSize = 0; }

      const frames = [];
      const errors = [];
      for (let i = 0; i < timestamps.length; i++) {
        const t = Math.max(0, Number(timestamps[i]) || 0);
        const out = path.join(dir, `f${i}.jpg`);
        try {
          // 견고한 단일 프레임 추출(스케일 필터 제거, -update 1, q 2)
          await run("ffmpeg", ["-y", "-ss", String(t), "-i", mp4, "-map", "0:v:0", "-frames:v", "1", "-q:v", "2", "-update", "1", out]);
          frames.push({ b64: readFileSync(out).toString("base64"), mime: "image/jpeg" });
        } catch (e) {
          frames.push(null);
          if (errors.length < 2) errors.push(String((e && e.message) || e).slice(0, 300));
        }
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ frames, timestamps, debug: { fileSize, errors } }));
    } catch (e) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String((e && e.message) || e) }));
    } finally {
      if (dir) {
        try {
          rmSync(dir, { recursive: true, force: true });
        } catch {
          /* 무시 */
        }
      }
    }
  });
});

server.listen(PORT, () => console.log(`frame-extract listening on :${PORT}`));
