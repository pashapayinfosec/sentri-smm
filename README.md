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
| `cta` | Shield, question, button, logo and contacts | `title`, `button` |

Every scene accepts `duration` (seconds) if you want to override the default timing.

**Music:** set `"music": "assets/audio/track.mp3"` and it is mixed in with a fade-out. For better reach, leave it empty and add a trending sound in the Instagram app when you upload.

## Preview while editing

```bash
npm run preview
```

It prints a link for each content file. Open it in your browser, edit the JSON, save, and refresh. Click the reel to restart it.

## Logo

`assets/logo.svg` is a hand-drawn approximation of the sentri.az mark. Replace it with your original logo file (keep the name `logo.svg`, white on transparent) and all templates will use it.

## Weekly workflow (about 15 minutes per reel)

1. Pick one topic: a phishing example, a common mistake, a tip list or a statistic.
2. Ask Claude/ChatGPT: *"Write a sentri.az reel JSON about <topic> in Azerbaijani, using scene types hook, email/list/text, stat, cta"* and paste one of the example files as reference.
3. Render, check the MP4, upload, then add a trending sound in Instagram.
