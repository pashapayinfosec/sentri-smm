#!/usr/bin/env node
// Renders content JSON files into finished media:
//   content/posts/*.json -> out/<name>.png  (Instagram post / story image)
//   content/reels/*.json -> out/<name>.mp4  (1080x1920 30fps reel)
//
// Usage:
//   node scripts/render.js content/posts/3-sehv.json
//   node scripts/render.js content/reels/fisinq-faktura.json
//   node scripts/render.js all          (everything under content/)
//   node scripts/render.js preview      (open templates in your browser)

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "out");
const FPS = 30;
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ttf": "font/ttf" };

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

async function openPage(browser, port, template, data, size) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("  page error:", e.message));
  await page.addInitScript((d) => { window.DATA = d; window.RENDER = true; }, data);
  await page.goto(`http://127.0.0.1:${port}/templates/${template}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.READY === true);
  return page;
}

async function renderPost(browser, port, data, out) {
  const height = { square: 1080, story: 1920 }[data.format] || 1350;
  const page = await openPage(browser, port, "post.html", data, { width: 1080, height });
  await page.locator(".canvas").screenshot({ path: out });
  await page.close();
}

async function renderReel(browser, port, data, out) {
  const page = await openPage(browser, port, "reel.html", data, { width: 1080, height: 1920 });
  const total = await page.evaluate(() => window.TOTAL);
  const frames = Math.round(total * FPS);
  const music = data.music ? path.join(ROOT, data.music) : null;
  const args = ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-"];
  if (music) args.push("-i", music, "-af", `afade=t=out:st=${Math.max(0, total - 1.5)}:d=1.5`, "-shortest", "-c:a", "aac", "-b:a", "192k");
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "18", "-r", String(FPS), "-movflags", "+faststart", out);
  const ffmpeg = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((ok, fail) => ffmpeg.on("close", (c) => (c === 0 ? ok() : fail(new Error("ffmpeg exited " + c)))));
  const canvas = page.locator(".canvas");
  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => window.seek(t), f / FPS);
    const img = await canvas.screenshot({ type: "jpeg", quality: 95 });
    if (!ffmpeg.stdin.write(img)) await new Promise((ok) => ffmpeg.stdin.once("drain", ok));
    if (f % FPS === 0) process.stdout.write(`\r  ${Math.round((f / frames) * 100)}%`);
  }
  ffmpeg.stdin.end();
  await done;
  process.stdout.write("\r  100%\n");
  // Cover image for the reel grid: the last frame of the first scene's fully-shown state
  await page.evaluate(() => window.seek(2));
  await canvas.screenshot({ path: out.replace(/\.mp4$/, "-cover.png") });
  await page.close();
}

function collect(arg) {
  if (arg !== "all") return [arg];
  return ["posts", "reels"].flatMap((dir) => {
    const d = path.join(ROOT, "content", dir);
    return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => path.join("content", dir, f)) : [];
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log("Usage: node scripts/render.js <content/...json | all | preview>");
    process.exit(1);
  }
  const server = await serve();
  const port = server.address().port;

  if (args[0] === "preview") {
    console.log(`Preview server running. Open in your browser:`);
    for (const f of collect("all")) {
      const tpl = f.includes(`${path.sep}reels${path.sep}`) || f.includes("/reels/") ? "reel.html" : "post.html";
      console.log(`  http://127.0.0.1:${port}/templates/${tpl}?data=${f.split(path.sep).join("/")}`);
    }
    console.log("Press Ctrl+C to stop. Save the JSON and refresh the page to see changes.");
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    for (const file of args.flatMap(collect)) {
      const data = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), "utf8"));
      const name = path.basename(file, ".json");
      const isReel = Array.isArray(data.scenes);
      const out = path.join(OUT, name + (isReel ? ".mp4" : ".png"));
      console.log(`${isReel ? "Reel" : "Post"}: ${file}`);
      await (isReel ? renderReel : renderPost)(browser, port, data, out);
      console.log(`  -> ${path.relative(ROOT, out)}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
