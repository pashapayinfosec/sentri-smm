// Shared helpers for post.html and reel.html.

const BRAND = {
  handle: "sentri.az",
  name: "SENTRI.AZ",
  tagline: "Rəqəmsal keşikçiniz",
  email: "contact@sentri.az",
  phone: "070 695 01 21",
};

// Text markup used in the JSON content files:
//   **text**  -> orange accent      __text__ -> red accent
//   ++text++  -> blue accent         \n       -> line break
function rich(text) {
  const esc = String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<span class="accent-orange">$1</span>')
    .replace(/__(.+?)__/g, '<span class="accent-red">$1</span>')
    .replace(/\+\+(.+?)\+\+/g, '<span class="accent-blue">$1</span>')
    .replace(/\n/g, "<br>");
}

// The renderer injects window.DATA; in a browser preview the JSON path comes from ?data=
async function loadData() {
  if (window.DATA) return window.DATA;
  const path = new URLSearchParams(location.search).get("data");
  if (!path) throw new Error("Open with ?data=content/.../file.json");
  const res = await fetch("/" + path.replace(/^\/+/, ""));
  return res.json();
}

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
}

const LOGO = '<img class="logo" src="/assets/logo.svg" alt="">';
