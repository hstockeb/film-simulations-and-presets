// One viewer, two sections. Each page says which half it shows and where the
// site root is: <body data-kind="sims|presets" data-root="../">
const REPO = "https://github.com/hstockeb/film-simulations-and-presets";
const KIND = document.body.dataset.kind;
const ROOT = document.body.dataset.root || "";
const SECTION = {
  sims: { zip: "Film-Simulations", start: /Portra 400/,
          blurb: "Emulations of real film stocks and of camera makers' built-in looks." },
  presets: { zip: "Presets", start: /Storm Sky/,
             blurb: "Looks of their own — not modelled on any film or camera." },
}[KIND];
const ZIP = name => `${REPO}/releases/latest/download/${name}.zip`;
const zipName = family => family.replace(/\s+/g, "-");

const el = id => document.getElementById(id);
const compare = el("compare"), after = el("after");
let looks = [], current = -1;

function setPos(pct) {
  pct = Math.max(0, Math.min(100, pct));
  compare.style.setProperty("--pos", pct + "%");
  compare.setAttribute("aria-valuenow", Math.round(pct));
}

function show(i, push) {
  if (i < 0 || i >= looks.length) return;
  current = i;
  const L = looks[i];
  after.src = ROOT + L.image;
  after.alt = L.name;
  el("tag-look").textContent = L.name;
  el("cap-name").textContent = L.name;
  el("cap-family").textContent = `${L.family} · ${L.kindName}`;
  const dl = el("dl-one");
  dl.href = ROOT + L.preset;
  dl.setAttribute("download", decodeURIComponent(L.preset.split("/").pop()));
  document.querySelectorAll(".look").forEach(b =>
    b.setAttribute("aria-current", b.dataset.i == i ? "true" : "false"));
  // warm the cache for the neighbours so stepping through is instant
  [i - 1, i + 1].forEach(j => { if (looks[j]) new Image().src = ROOT + looks[j].image; });
  if (push) history.replaceState(null, "", "#" + L.slug);
}

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function build(data) {
  const mine = data.families.filter(f => f.kind === KIND);
  const total = mine.reduce((a, f) => a + f.looks.length, 0);
  el("summary").textContent = `${total} looks for Lightroom · ${SECTION.blurb}`;
  el("dl-all").href = ZIP(SECTION.zip);
  el("dl-all").textContent = `Download all ${total} (.zip)`;
  el("before").src = ROOT + data.original;
  const kindName = Object.fromEntries(data.kinds.map(k => [k.id, k.name]));
  const list = el("list");
  for (const k of data.kinds.filter(k => k.id === KIND)) {
    const fams = data.families.filter(f => f.kind === k.id);
    if (!fams.length) continue;
    const sec = document.createElement("section");
    sec.className = "kind";
    const n = fams.reduce((a, f) => a + f.looks.length, 0);
    sec.innerHTML = `<h3 class="edge">${k.name} · ${n}</h3>`;
    for (const f of fams) {
      const div = document.createElement("div");
      div.className = "family";
      div.innerHTML = `<h4><span>${f.name}</span><a href="${ZIP(zipName(f.name))}">${f.looks.length} · zip ↓</a></h4>`;
      const grid = document.createElement("div");
      grid.className = "grid";
      for (const L of f.looks) {
        const i = looks.length;
        looks.push({ ...L, family: f.name, kindName: kindName[f.kind], slug: slugify(f.slug + " " + L.name) });
        const b = document.createElement("button");
        b.className = "look";
        b.dataset.i = i;
        b.title = L.name;
        b.innerHTML = `<img loading="lazy" src="${ROOT + L.thumb}" alt=""><span></span>`;
        b.querySelector("span").textContent = L.name;
        b.addEventListener("click", () => {
          show(i, true);
          if (matchMedia("(max-width: 980px)").matches) scrollTo({ top: 0, behavior: "smooth" });
        });
        grid.appendChild(b);
      }
      div.appendChild(grid);
      sec.appendChild(div);
    }
    list.appendChild(sec);
  }
  const fromHash = looks.findIndex(L => "#" + L.slug === location.hash);
  const start = fromHash >= 0 ? fromHash : Math.max(0, looks.findIndex(L => SECTION.start.test(L.name)));
  show(start, false);
}

// dragging
function fromEvent(e) {
  const r = compare.getBoundingClientRect();
  setPos((e.clientX - r.left) / r.width * 100);
}
let dragging = false;
compare.addEventListener("pointerdown", e => { dragging = true; compare.setPointerCapture(e.pointerId); fromEvent(e); });
compare.addEventListener("pointermove", e => { if (dragging) fromEvent(e); });
compare.addEventListener("pointerup", () => dragging = false);
compare.addEventListener("pointercancel", () => dragging = false);

document.addEventListener("keydown", e => {
  if (e.target.closest("input, textarea")) return;
  const pos = parseFloat(compare.style.getPropertyValue("--pos")) || 50;
  if (e.key === "ArrowLeft") { setPos(pos - 5); e.preventDefault(); }
  else if (e.key === "ArrowRight") { setPos(pos + 5); e.preventDefault(); }
  else if (e.key === "ArrowDown") { show(current + 1, true); e.preventDefault(); }
  else if (e.key === "ArrowUp") { show(current - 1, true); e.preventDefault(); }
});

setPos(50);
fetch(ROOT + "looks.json").then(r => r.json()).then(build).catch(() => {
  el("list").textContent = "Could not load the list of looks.";
});
