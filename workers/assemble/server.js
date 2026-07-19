// Remake Studio — 영상 조립 워커 (FFmpeg). 별도 배포(Railway 등).
// 입력: POST / { plan }  (AssemblyPlan/EDL — /api/remake/assemble 가 생성)
// 동작: timeline[].src 클립들을 순서대로 다운로드 → 9:16 정규화 → concat → out/{id}.mp4
// 출력: { ok, videoUrl, id, shots }  (videoUrl = 이 워커가 서빙하는 완성본)
// 서빙: GET /out/{id}.mp4
//
// 주의(v1): 전환은 하드컷, 오디오는 제외(무음 릴), 자막 번인 미포함 — 안정성 우선.
//   → 크로스페이드/자막/BGM은 후속 확장. 원본 영상은 다루지 않음(우리가 생성한 클립만).
const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 8080;
const KEY = process.env.WORKER_KEY || "";
const PUBLIC_BASE = (process.env.PUBLIC_BASE || "").replace(/\/+$/, ""); // 예: https://xxx.up.railway.app
const OUT_DIR = path.join(os.tmpdir(), "remake-out");
fs.mkdirSync(OUT_DIR, { recursive: true });

function sh(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, opts);
    let err = "";
    p.stderr.on("data", (d) => { err += d.toString(); });
    p.on("close", (code) => resolve({ code, err: err.slice(-2000) }));
    p.on("error", (e) => resolve({ code: -1, err: String(e) }));
  });
}

async function download(url, dest) {
  // node 18+ fetch. 프록시/서명 URL 모두 GET.
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${url.slice(0, 80)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  if (buf.length < 1000) throw new Error(`clip too small (${buf.length}b)`);
  return dest;
}

async function assemble(plan) {
  const id = crypto.randomUUID();
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "asm-"));
  const timeline = Array.isArray(plan?.timeline) ? plan.timeline : [];
  if (!timeline.length) throw new Error("timeline 비어 있음");

  // 1) 클립 다운로드 (+ 계획된 컷 길이 dur_sec 보존)
  const clips = [];
  for (let i = 0; i < timeline.length; i++) {
    const seg = timeline[i] || {};
    if (!seg.src) continue;
    const f = path.join(work, `c${i}.mp4`);
    await download(seg.src, f);
    const dur = Math.max(0.5, Math.min(15, Number(seg.dur_sec) || 2)); // 계획된 컷 길이(과다 방지)
    clips.push({ file: f, dur });
  }
  if (!clips.length) throw new Error("다운로드된 클립 없음");

  // 2) 각 클립을 '계획된 길이(dur_sec)로 트림' + 9:16 정규화 → concat.
  //    (트림 없이 붙이면 원본 5~8초 클립이 통째로 들어가 페이싱이 무너짐.)
  const inputs = [];
  clips.forEach((c) => { inputs.push("-i", c.file); });
  const parts = clips
    .map((c, i) => `[${i}:v]trim=0:${c.dur.toFixed(2)},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,format=yuv420p[v${i}]`)
    .join(";");
  const concatIn = clips.map((_, i) => `[v${i}]`).join("");
  const filter = `${parts};${concatIn}concat=n=${clips.length}:v=1:a=0[outv]`;
  const out = path.join(OUT_DIR, `${id}.mp4`);
  const r = await sh("ffmpeg", ["-y", ...inputs, "-filter_complex", filter, "-map", "[outv]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-movflags", "+faststart", out]);
  // 정리
  try { fs.rmSync(work, { recursive: true, force: true }); } catch { }
  if (r.code !== 0 || !fs.existsSync(out)) throw new Error(`ffmpeg concat 실패: ${r.err}`);
  return { id, out, shots: clips.length };
}

const server = http.createServer(async (req, res) => {
  const json = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };

  if (req.method === "GET" && req.url.startsWith("/health")) return json(200, { ok: true });

  // 완성본 서빙
  if (req.method === "GET" && req.url.startsWith("/out/")) {
    const name = path.basename(req.url.split("?")[0]);
    const f = path.join(OUT_DIR, name);
    if (!fs.existsSync(f)) return json(404, { error: "not found" });
    res.writeHead(200, { "content-type": "video/mp4", "cache-control": "public, max-age=86400" });
    return fs.createReadStream(f).pipe(res);
  }

  if (req.method === "POST" && req.url === "/") {
    if (KEY) {
      const auth = req.headers["authorization"] || "";
      if (auth !== `Bearer ${KEY}`) return json(401, { error: "unauthorized" });
    }
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", async () => {
      try {
        const { plan } = JSON.parse(body || "{}");
        if (!plan) return json(400, { error: "plan 필요" });
        const { id, shots } = await assemble(plan);
        const base = PUBLIC_BASE || `http://${req.headers.host}`;
        return json(200, { ok: true, id, shots, videoUrl: `${base}/out/${id}.mp4` });
      } catch (e) {
        return json(500, { error: String(e && e.message ? e.message : e).slice(0, 400) });
      }
    });
    return;
  }
  json(404, { error: "not found" });
});

server.listen(PORT, () => console.log(`assemble worker on :${PORT}`));
