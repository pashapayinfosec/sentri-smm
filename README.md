# sentri-smm

Branded templates for sentri.az Instagram content. You write the text in a small JSON file, run one command, and get a finished **post image (PNG)** or **reel (MP4, 1080×1920, 30fps)** in the sentri.az style: navy background, blue glow, Poppins font, logo and contacts.

## Setup (once)

Requirements: [Node.js 18+](https://nodejs.org) and [ffmpeg](https://ffmpeg.org/download.html) (`winget install ffmpeg` on Windows, `brew install ffmpeg` on macOS).

```bash
npm install
npx playwright install chromium
```

## Make a post image

1. Copy `content/posts/3-sehv.json` to a new file, e.g. `content/posts/vpn.json`, and edit the text.
2. Run `npm run render -- content/posts/vpn.json`
3. Upload `out/vpn.png` to Instagram.

| Field | Meaning |
|---|---|
| `format` | `post` (1080×1350, feed), `square` (1080×1080), `story` (1080×1920) |
| `eyebrow` | optional small label above the headline |
| `headline` | main title (shown in capitals; `"uppercase": false` turns that off) |
| `bullets` | list of points |
| `image` | optional background photo, e.g. `assets/images/hacker.jpg` (the text area is darkened automatically) |
| `visual` | `"phone"` draws a 3D phone mockup (SMS + incoming call) on the right; the text column narrows to fit |
| `footer` | bottom-left message |

**Text colours** work in every field: `**orange**`, `__red__`, `++blue++`, and `\n` for a new line.

## Make a reel

1. Copy `content/reels/fisinq-faktura.json` and edit it.
2. Run `npm run render -- content/reels/your-file.json` (takes about 1 minute).
3. You get `out/your-file.mp4` plus `out/your-file-cover.png` to use as the cover.

A reel is a list of **scenes** played in order. Each scene type:

| `type` | What it shows | Fields |
|---|---|---|
| `hook` | Opening question with a warning badge | `badge`, `title`, `subtitle` |
| `email` | Fake phishing e-mail, then numbered red warnings that highlight parts of it | `from`, `address`, `subject`, `body`, `attachment`, `button`, `link` (put the bad part in `[brackets]`), `caption`, `callouts` (each has `title`, `text`, `highlight`: `address` / `subject` / `body` / `attachment` / `button` / `link`) |
| `stat` | Big red number and a "virus spreading" network animation | `big`, `caption` |
| `list` | Title and numbered tips appearing one by one | `title`, `items` |
| `text` | A single strong statement | `title`, `subtitle`, `size` |
| `package` | Pricing card: price counts up, features tick in, ribbon pops | `heading`, `name`, `what`, `price`, `currency`, `features`, `ribbon`, `featured`, `note` |
| `browser` | Browser window: URL types itself, then a website builds block by block | `title`, `url`, `badges` |
| `cta` | Icon, question, button, logo and contacts | `title`, `button`, `icon` (`shield` or `globe`) |

Every scene accepts `duration` (seconds) if you want to override the default timing.

**Music:** set `"music": "assets/audio/track.mp3"` and it is mixed in with a fade-out. For better reach, leave it empty and add a trending sound in the Instagram app when you upload.

## Animated IT support ad (no footage needed)

`content/reels/it-destek-animasiya.json` renders a finished 30s flat-illustration ad (internet outage -> call Sentri -> technician fixes it -> end card) from `templates/story-it.html`. Edit the dialogue lines in the JSON and run `npm run render -- content/reels/it-destek-animasiya.json`.

## Portfolio showcase reel (client website)

`content/reels/palid-showcase.json` uses `templates/showcase.html`: intro, the client's full-page screenshot scrolling smoothly inside a browser frame with feature captions (`stops`), floating detail crops (`cards`), and a Sentri end card. Assets for Palıd Perfumery are in `assets/projects/palid/` (the full page was stitched from a screen recording).

## Client site on real laptop footage

`scripts/screen_replace.py` tracks the laptop screen in a stock clip and plays the client's page scrolling on it; `templates/overlay.html` (data in `content/footage/palid-laptop.json`) adds the title and tags on top. See the header of the script for usage; screen corners for another clip go in `Q0`.

## Live-action commercial (AI video clips + Sentri branding)

Photorealistic footage must come from an AI video tool (Veo, Kling, Sora, Runway…) or a real shoot. This repo does the editing part.

1. Open `content/commercials/it-destek.json`. For each shot, generate a clip with `master_prompt` + that shot's `prompt`.
2. Save each clip at the shot's `clip` path (e.g. `assets/clips/1-problem.mp4`). Any aspect ratio works; it is cropped to 9:16 and trimmed or held to fit the slot.
3. Run `node scripts/commercial.js content/commercials/it-destek.json` -> `out/it-destek.mp4` (30s, 1080×1920).

Shots without a clip yet show a storyboard frame, so the full timing can be reviewed before any footage exists. Azerbaijani dialogue subtitles, the logo and the end card are added automatically; set `music` for a soundtrack. Dialogue audio (voice actors or voiceover) is recorded separately.

## Colour palette (use for everything)

Diagonal gradient from deep navy-blue `#05206b` (top-left) through royal blue `#0a3aa7` to bright blue `#1668dc` (bottom-right), white text, warm yellow accent `#ffd166` for highlighted words (`**text**`). Red `#ff5a6a` only for danger/warning elements. All tokens live in `templates/brand.css`.

## Wording rules

- Never write **"pulsuz"**, always write **"ödənişsiz"** (e.g. "Ödənişsiz konsultasiya üçün yazın").
- Never write **"fidyə"**; use **"ransomware"** instead.

## Preview while editing

```bash
npm run preview
```

It prints a link for each content file. Open it in your browser, edit the JSON, save, and refresh. Click the reel to restart it.

## Logo

`assets/logo.svg` is the official sentri.az mark, traced as a vector from `assets/logo-original.webp`. All templates use it.

## Weekly workflow (about 15 minutes per reel)

1. Pick one topic: a phishing example, a common mistake, a tip list or a statistic.
2. Ask Claude/ChatGPT: *"Write a sentri.az reel JSON about <topic> in Azerbaijani, using scene types hook, email/list/text, stat, cta"* and paste one of the example files as reference.
3. Render, check the MP4, upload, then add a trending sound in Instagram.
