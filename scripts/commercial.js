#!/usr/bin/env node
// Assembles a live-action commercial from per-shot clips plus Sentri branding:
//   - each shot: the clip from shot.clip (cropped to 9:16 and trimmed), or a
//     storyboard placeholder frame if that clip does not exist yet
//   - Azerbaijani dialogue subtitle and logo bug on top of every shot
//   - animated Sentri end card
//   - optional music track
//
// Usage: node scripts/commercial.js content/commercials/it-destek.json
// Output: out/<name>.mp4

const fs = require("fs");
const path = require("path");
const { execFileSync, spawn } = require("child_process");
const { chromium } = require("playwright");
const { ROOT, FPS, serve, openPage } = require("./render");

const SIZE = { width: 1080, height: 1920 };

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
}

async function layer(browser, port, data, kind, file) {
  const page = await openPage(browser, port, `commercial.html?layer=${kind}`, data, SIZE);
  await page.locator(".frame").screenshot({ path: file, omitBackground: true });
  await page.close();
}

async function renderEndcard(browser, port, data, seconds, out) {
  const page = await openPage(browser, port, "commercial.html", data, SIZE);
  const frame = page.locator(".frame");
  const enc = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-r", String(FPS), out], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((ok, fail) => enc.on("close", (c) => (c === 0 ? ok() : fail(new Error("ffmpeg exited " + c)))));
  for (let f = 0; f < Math.round(seconds * FPS); f++) {
    await page.evaluate((t) => window.seek(t), f / FPS);
    if (!enc.stdin.write(await frame.screenshot({ type: "jpeg", quality: 95 }))) await new Promise((ok) => enc.stdin.once("drain", ok));
  }
  enc.stdin.end();
  await done;
  await page.close();
}

function renderShot(shot, bg, sub, out) {
  const dur = shot.end - shot.start;
  const clip = path.join(ROOT, shot.clip);
  const hasClip = fs.existsSync(clip);
  const input = hasClip ? ["-i", clip] : ["-loop", "1", "-framerate", String(FPS), "-t", String(dur), "-i", bg];
  // Fill the 9:16 frame, hold the last frame if the clip is shorter than the slot
  const fit = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=${FPS},tpad=stop_mode=clone:stop_duration=${dur},trim=duration=${dur},setpts=PTS-STARTPTS`;
  ffmpeg([...input, "-loop", "1", "-framerate", String(FPS), "-t", String(dur), "-i", sub,
    "-filter_complex", `[0:v]${fit}[v];[1:v]format=rgba,fade=in:st=0.2:d=0.3:alpha=1[s];[v][s]overlay=0:0:shortest=1,format=yuv420p[o]`,
    "-map", "[o]", "-an", "-c:v", "libx264", "-crf", "18", "-r", String(FPS), "-t", String(dur), out]);
  return hasClip;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.log("Usage: node scripts/commercial.js content/commercials/<name>.json");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), "utf8"));
  const name = path.basename(file, ".json");
  const tmp = path.join(ROOT, "out", `.${name}`);
  fs.mkdirSync(tmp, { recursive: true });

  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const parts = [];
  try {
    for (const [i, shot] of data.shots.entries()) {
      const shotData = { ...data, shot: { ...shot, index: i + 1 } };
      const bg = path.join(tmp, `bg${i}.png`), sub = path.join(tmp, `sub${i}.png`), out = path.join(tmp, `shot${i}.mp4`);
      await layer(browser, port, shotData, "placeholder", bg);
      await layer(browser, port, shotData, "subtitle", sub);
      const real = renderShot(shot, bg, sub, out);
      console.log(`  Səhnə ${i + 1} (${shot.title}): ${real ? "klip" : "storyboard"}`);
      parts.push(out);
    }
    const end = path.join(tmp, "endcard.mp4");
    await renderEndcard(browser, port, data, data.endcard.end - data.endcard.start, end);
    parts.push(end);
  } finally {
    await browser.close();
    server.close();
  }

  const list = path.join(tmp, "list.txt");
  fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
  const out = path.join(ROOT, "out", `${name}.mp4`);
  const total = data.endcard.end;
  const music = data.music ? path.join(ROOT, data.music) : null;
  ffmpeg(["-f", "concat", "-safe", "0", "-i", list,
    ...(music ? ["-i", music, "-af", `afade=t=out:st=${total - 1.5}:d=1.5`, "-c:a", "aac", "-b:a", "192k", "-shortest"] : []),
    "-c:v", "copy", "-movflags", "+faststart", out]);
  console.log(`  -> ${path.relative(ROOT, out)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
