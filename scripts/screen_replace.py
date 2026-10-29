# Puts a scrolling full-page screenshot onto a laptop screen in real footage.
# Usage: python3 scripts/screen_replace.py <footage.mp4> <page.jpg> <header.png> <out.mp4> <audio-source>
# The screen corners of frame 0 are set in Q0; the laptop is tracked with ORB features + homography.
# Needs: pip install opencv-python-headless numpy
import sys, subprocess, numpy as np, cv2
src, page_path, header_path, out, audio = sys.argv[1:6]
SCALE = 1.5                                            # work at 1080x1920 so the inserted site stays sharp
Q0 = np.float32([[86, 284], [672, 330], [652, 786], [82, 706]]) * SCALE
cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS)
frames = []
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(cv2.resize(f, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_LANCZOS4))
n = len(frames); H, W = frames[0].shape[:2]
page = cv2.imread(page_path); header = cv2.imread(header_path)
VW, VH = 1484, 928                                      # 16:10 laptop viewport in page pixels

# Track the laptop: features outside the screen, matched to frame 0, homography maps the corners
orb = cv2.ORB_create(4000)
mask0 = np.full((H, W), 255, np.uint8); cv2.fillConvexPoly(mask0, Q0.astype(np.int32), 0)
g0 = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY); k0, d0 = orb.detectAndCompute(g0, mask0)
bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
quads = [Q0]
for f in frames[1:]:
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
    m = np.full((H, W), 255, np.uint8); cv2.fillConvexPoly(m, quads[-1].astype(np.int32), 0)
    k, d = orb.detectAndCompute(g, m)
    ms = sorted(bf.match(d0, d), key=lambda x: x.distance)[:800]
    a = np.float32([k0[x.queryIdx].pt for x in ms]); b = np.float32([k[x.trainIdx].pt for x in ms])
    Hm, inl = cv2.findHomography(a, b, cv2.RANSAC, 3.0)
    quads.append(cv2.perspectiveTransform(Q0[None], Hm)[0])
quads = np.array(quads)
# Smooth the corner paths a little to remove tracking jitter
k = 5; pad = np.pad(quads, ((k, k), (0, 0), (0, 0)), mode="edge")
quads = np.array([pad[i:i + 2 * k + 1].mean(0) for i in range(n)])
print("corner drift px:", np.abs(quads[-1] - quads[0]).max().round(1))

def ease(x): x = min(max(x, 0), 1); return x * x * (3 - 2 * x)
stops = [(0.0, 0), (1.2, 0), (3.0, 1000), (4.6, 2230), (6.4, page.shape[0] - VH), (99, page.shape[0] - VH)]
def scroll(t):
    for (t0, y0), (t1, y1) in zip(stops, stops[1:]):
        if t < t1: return y0 + (y1 - y0) * ease((t - t0) / (t1 - t0))
    return stops[-1][1]

ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                       "-i", audio, "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-c:a", "aac", "-b:a", "192k",
                       "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
srcq = np.float32([[0, 0], [VW, 0], [VW, VH], [0, VH]])
for i, f in enumerate(frames):
    y = int(round(scroll(i / fps)))
    view = page[y:y + VH].copy()
    if y > 110: view[:header.shape[0]] = header
    view = cv2.convertScaleAbs(view, alpha=0.93, beta=0)        # screens read slightly darker than the source PNG
    Mx = cv2.getPerspectiveTransform(srcq, quads[i].astype(np.float32))
    warped = cv2.warpPerspective(view, Mx, (W, H), flags=cv2.INTER_AREA)
    alpha = cv2.warpPerspective(np.full((VH, VW), 255, np.uint8), Mx, (W, H), flags=cv2.INTER_LINEAR).astype(np.float32)[..., None] / 255
    comp = (f * (1 - alpha) + warped * alpha).astype(np.uint8)
    ff.stdin.write(comp.tobytes())
ff.stdin.close(); ff.wait()
cv2.imwrite(out.replace(".mp4", "-check.png"), comp)
