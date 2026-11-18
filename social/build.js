/*
 * Instagram γραφικά από τα δεδομένα του site (data.js).
 * Τρέξιμο:  node social/build.js
 * Βγάζει PNG στο social/out/: stories 1080×1920 και carousel 1080×1350.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
global.window = {};
require(path.join(ROOT, "data.js"));
const L = window.LEAGUE;
const OUT = path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });

const team = Object.fromEntries(L.teams.map((t) => [t.id, t]));
const DAYS = ["ΚΥΡ", "ΔΕΥ", "ΤΡΙ", "ΤΕΤ", "ΠΕΜ", "ΠΑΡ", "ΣΑΒ"];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const dd = (iso) => { const d = new Date(iso); return { day: DAYS[d.getDay()], date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, time: iso.slice(11, 16) }; };
const crest = (t, size) => `<span class="crest" style="--c:${t.color};--s:${size}px">${esc(t.short)}</span>`;
const rounds = [...new Set(L.matches.map((m) => m.round))].sort((a, b) => a - b);
const byRound = (r) => L.matches.filter((m) => m.round === r).sort((a, b) => a.date.localeCompare(b.date));
const MONTHS = ["ΙΑΝ", "ΦΕΒ", "ΜΑΡ", "ΑΠΡ", "ΜΑΪ", "ΙΟΥΝ", "ΙΟΥΛ", "ΑΥΓ", "ΣΕΠ", "ΟΚΤ", "ΝΟΕ", "ΔΕΚ"];
const weekLabel = (r) => { // Δευτέρα–Κυριακή της εβδομάδας του πρώτου ματς
  const d = new Date(byRound(r)[0].date);
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  return mon.getMonth() === sun.getMonth() ? `${mon.getDate()}–${sun.getDate()} ${MONTHS[sun.getMonth()]}` : `${mon.getDate()} ${MONTHS[mon.getMonth()]} – ${sun.getDate()} ${MONTHS[sun.getMonth()]}`;
};
const centaur = "data:image/jpeg;base64," + fs.readFileSync(path.join(ROOT, "assets/centaur.jpg")).toString("base64");

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#031a47;--deep:#021234;--ice:#e2f0ff;--sky:#93cbff;--muted:#8eaad4;--gold:#f2c94c;--line:rgba(170,210,255,.18)}
html,body{width:var(--w);height:var(--h);overflow:hidden}
body{font-family:"Roboto Condensed",sans-serif;color:var(--ice);position:relative;
  background:linear-gradient(118deg,transparent 0 20%,rgba(140,190,255,.08) 20% 22%,transparent 22% 66%,rgba(140,190,255,.07) 66% 67.2%,transparent 67.2%),
  radial-gradient(900px 700px at 10% 0%,rgba(60,130,255,.5),transparent 70%),
  radial-gradient(800px 700px at 100% 60%,rgba(40,100,230,.4),transparent 70%),
  radial-gradient(900px 700px at 30% 100%,rgba(20,70,190,.55),transparent 70%),var(--bg)}
.art{position:absolute;inset:0;background:url(${centaur}) center/cover no-repeat;opacity:.55;
  -webkit-mask-image:radial-gradient(ellipse 70% 55% at 50% 55%,#000 30%,transparent 75%)}
.page{position:relative;height:100%;display:flex;flex-direction:column;padding:var(--pad)}
.top{display:flex;justify-content:space-between;align-items:center;font-weight:800;letter-spacing:3px;font-size:24px;text-transform:uppercase;color:var(--sky)}
.top b{font-family:Graduate,serif;font-weight:400;font-size:38px;color:var(--ice);letter-spacing:2px}
.idx{font-size:22px;color:var(--muted)}
.uth{font-family:Graduate,serif;font-weight:400;color:var(--ice);line-height:.85;text-shadow:0 8px 0 #0a2c6c,0 30px 60px rgba(0,0,0,.4)}
.league{font-family:Graduate,serif;color:var(--ice);text-shadow:0 4px 0 #0a2c6c}
.kicker{display:inline-block;background:var(--sky);color:var(--deep);font-weight:900;text-transform:uppercase;letter-spacing:3px;padding:8px 26px;
  clip-path:polygon(14px 0,100% 0,calc(100% - 14px) 100%,0 100%)}
.h1{font-weight:900;text-transform:uppercase;line-height:.95;letter-spacing:1px}
.rule{display:flex;align-items:center;gap:20px;color:var(--sky);font-weight:700;letter-spacing:5px;text-transform:uppercase}
.rule:before,.rule:after{content:"";flex:1;height:2px;background:var(--sky);opacity:.8}
.crest{width:var(--s);height:calc(var(--s)*1.12);flex:none;display:grid;place-items:center;background:var(--c);color:#03122f;font-weight:900;
  font-size:calc(var(--s)*.3);letter-spacing:1px;clip-path:polygon(50% 0,100% 12%,100% 58%,50% 100%,0 58%,0 12%)}
.glass{background:linear-gradient(180deg,rgba(130,180,255,.14),rgba(20,60,150,.22));border:1.5px solid var(--line);border-top-color:rgba(220,238,255,.4);position:relative;backdrop-filter:blur(14px)}
.glass:before{content:"";position:absolute;top:-2px;left:-2px;width:26px;height:26px;border-top:4px solid var(--sky);border-left:4px solid var(--sky)}
.venue{display:flex;align-items:center;justify-content:center;gap:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase}
.venue svg{width:1.1em;height:1.1em;fill:var(--sky)}
.group{padding:26px 30px}
.group h3{font-weight:900;letter-spacing:4px;text-transform:uppercase;color:var(--sky);font-size:30px;margin-bottom:14px;display:flex;align-items:center;gap:14px}
.group h3 span{background:var(--sky);color:var(--deep);padding:2px 14px}
.trow{display:flex;align-items:center;gap:20px;padding:12px 0;border-top:1px solid var(--line);font-weight:800;text-transform:uppercase;letter-spacing:.5px}
.trow .slot{color:var(--muted);font-size:24px;width:44px}
.mrow{display:grid;grid-template-columns:150px 92px 1fr auto 1fr;align-items:center;gap:14px;padding:13px 22px;border-top:1px solid var(--line)}
.mrow:first-of-type{border-top:0}
.mrow .d{font-weight:900;font-size:25px;line-height:1}.mrow .d small{display:block;font-size:18px;color:var(--muted);font-weight:700;letter-spacing:1px;margin-top:4px}
.mrow .tm{font-weight:900;font-size:26px;background:var(--deep);padding:6px 0;text-align:center;clip-path:polygon(9px 0,100% 0,calc(100% - 9px) 100%,0 100%)}
.mrow .tm.b{background:#0c3d8f}
.mrow .h,.mrow .a{display:flex;align-items:center;gap:12px;font-weight:800;font-size:23px;text-transform:uppercase;line-height:1.05}
.mrow .h{justify-content:flex-end;text-align:right}
.mrow .v{color:var(--sky);font-weight:900;font-size:20px}
.rhead{display:flex;justify-content:space-between;align-items:baseline;padding:16px 22px 10px;border-bottom:1.5px solid var(--line)}
.rhead b{font-weight:900;font-size:30px;letter-spacing:2px;text-transform:uppercase}
.rhead span{color:var(--sky);font-weight:800;letter-spacing:2px;font-size:22px}
.roster{columns:2;column-gap:40px;padding:8px 34px 18px}
.roster li{list-style:none;break-inside:avoid;display:flex;gap:14px;align-items:baseline;padding:15px 0;border-bottom:1px solid var(--line);font-weight:800;font-size:28px;text-transform:uppercase;letter-spacing:.5px}
.roster li i{font-style:normal;color:var(--sky);font-size:19px;min-width:26px}
.fx{display:grid;grid-template-columns:repeat(2,1fr);gap:0 30px;padding:6px 30px 16px}
.fx div{display:flex;gap:14px;align-items:center;padding:10px 0;border-top:1px solid var(--line);font-weight:800;font-size:21px;text-transform:uppercase}
.fx div b{color:var(--sky);min-width:118px;font-size:19px}
.glow{position:absolute;inset:0;background:radial-gradient(700px 520px at 18% 18%,var(--tc),transparent 70%);opacity:.28;pointer-events:none}
.cta{font-weight:900;text-transform:uppercase;background:var(--ice);color:var(--deep);padding:18px 40px;letter-spacing:2px;clip-path:polygon(18px 0,100% 0,calc(100% - 18px) 100%,0 100%);display:inline-block}
`;

const PIN = `<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>`;
const doc = (w, h, pad, body, art = false) => `<!doctype html><html lang="el"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Graduate&family=Roboto+Condensed:wght@500;700;800;900&display=block" rel="stylesheet">
<style>${CSS}:root{--w:${w}px;--h:${h}px;--pad:${pad}}</style></head><body>${art ? '<div class="art"></div>' : ""}<div class="page">${body}</div></body></html>`;

const groupBox = (g, big) => `<div class="glass group"><h3><span>${g === "A" ? "Α" : "Β"}</span>${esc(L.groups[g])}</h3>
  ${L.teams.filter((t) => t.group === g).map((t) => `<div class="trow" style="font-size:${big ? 38 : 32}px"><span class="slot">${t.id.replace("A", "Α").replace("B", "Β")}</span>${crest(t, big ? 58 : 50)}${esc(t.name)}</div>`).join("")}</div>`;
const matchRow = (m) => {
  const { day, date, time } = dd(m.date), h = team[m.home], a = team[m.away];
  return `<div class="mrow"><div class="d">${day} ${date}<small>${esc(L.groups[h.group])}</small></div><div class="tm ${h.group === "B" ? "b" : ""}">${time}</div>
    <div class="h">${esc(h.name)}${crest(h, 40)}</div><div class="v">VS</div><div class="a">${crest(a, 40)}${esc(a.name)}</div></div>`;
};
const roundBox = (r) => `<div class="glass" style="margin-bottom:22px"><div class="rhead"><b>${r}η αγωνιστική</b><span>${weekLabel(r)}</span></div>${byRound(r).map(matchRow).join("")}</div>`;

/* ---------- STORIES 1080×1920 (κρατάμε 250px πάνω/κάτω ελεύθερα για το UI του Instagram) ---------- */
const S = (body, art) => doc(1080, 1920, "250px 70px 250px", body, art);
const stories = [
  ["story-01-omiloi", S(`
    <div style="text-align:center"><div class="uth" style="font-size:190px">UTH</div>
    <div class="league" style="font-size:52px;margin-top:10px">FOOTBALL LEAGUE 8X8</div>
    <div class="rule" style="font-size:30px;margin:22px 0 40px">Οι όμιλοι είναι εδώ</div></div>
    <div style="display:grid;gap:30px">${groupBox("A", true)}${groupBox("B", true)}</div>
    <div class="venue" style="font-size:32px;margin-top:auto">${PIN}${esc(L.venue)}</div>`, true)],
  ["story-02-programma-1", S(`
    <div style="text-align:center;margin-bottom:28px"><span class="kicker" style="font-size:30px">Πρόγραμμα αγώνων</span>
    <div class="h1" style="font-size:84px;margin-top:18px">1η – 3η αγωνιστική</div></div>
    ${[1, 2, 3].filter((r) => rounds.includes(r)).map(roundBox).join("")}`)],
  ["story-03-programma-2", S(`
    <div style="text-align:center;margin-bottom:28px"><span class="kicker" style="font-size:30px">Πρόγραμμα αγώνων</span>
    <div class="h1" style="font-size:84px;margin-top:18px">4η – 5η αγωνιστική</div></div>
    ${rounds.filter((r) => r >= 4).map(roundBox).join("")}
    <div class="venue" style="font-size:32px;margin-top:auto">${PIN}${esc(L.venue)}</div>`)],
  ["story-04-premiera", S(`
    <div style="text-align:center"><span class="kicker" style="font-size:32px">Η σέντρα πλησιάζει</span>
    <div class="h1" style="font-size:150px;margin-top:30px">Πρεμιέρα</div>
    <div class="league" style="font-size:64px;margin-top:6px">${dd(byRound(1)[0].date).day} ${dd(byRound(1)[0].date).date}</div></div>
    <div style="margin-top:60px">${roundBox(1)}</div>
    <div style="text-align:center;margin-top:auto"><div class="venue" style="font-size:34px">${PIN}${esc(L.venue)}</div></div>`, true)],
];

/* ---------- CAROUSEL 1080×1350 ---------- */
const teamsOrder = L.teams;
const TOTAL = 5 + teamsOrder.length + 1;
const top = (n) => `<div class="top"><span><b>UTH</b> &nbsp;Football League 8x8</span><span class="idx">${String(n).padStart(2, "0")}/${TOTAL}</span></div>`;
const C = (n, body, art) => doc(1080, 1350, "64px 70px 60px", top(n) + body, art);
const fixturesOf = (t) => L.matches.filter((m) => m.home === t.id || m.away === t.id).sort((a, b) => a.date.localeCompare(b.date));
const carousel = [
  ["carousel-01-cover", C(1, `
    <div style="margin:auto 0;text-align:center"><div class="uth" style="font-size:230px">UTH</div>
    <div class="league" style="font-size:60px;margin-top:12px">FOOTBALL LEAGUE 8X8</div>
    <div class="rule" style="font-size:30px;margin:26px 40px 10px">Τουρνουά ποδοσφαίρου</div>
    <div class="h1" style="font-size:86px">${L.season}</div>
    <div style="margin-top:50px"><span class="kicker" style="font-size:40px">Όμιλοι &amp; πρόγραμμα</span></div></div>
    <div class="venue" style="font-size:30px">${PIN}${esc(L.venue)} · ${L.teams.length} ομάδες · ${L.matches.length} αγώνες</div>`, true)],
  ["carousel-02-omiloi", C(2, `
    <div class="h1" style="font-size:96px;margin:26px 0 26px">Οι όμιλοι</div>
    <div style="display:grid;gap:22px">${groupBox("A")}${groupBox("B")}</div>
    <div style="margin-top:auto;font-size:28px;font-weight:700;color:var(--muted);letter-spacing:1px">Όλοι με όλους μέσα στον όμιλο · ${rounds.length} αγωνιστικές</div>`)],
  ["carousel-03-programma", C(3, `<div class="h1" style="font-size:72px;margin:24px 0 22px">Πρόγραμμα</div>${[1, 2].map(roundBox).join("")}`)],
  ["carousel-04-programma", C(4, `<div class="h1" style="font-size:72px;margin:24px 0 22px">Πρόγραμμα</div>${[3, 4].map(roundBox).join("")}`)],
  ["carousel-05-programma", C(5, `<div class="h1" style="font-size:72px;margin:24px 0 22px">Πρόγραμμα</div>${rounds.filter((r) => r >= 5).map(roundBox).join("")}
    <div class="glass" style="padding:30px;margin-top:auto;text-align:center"><div class="venue" style="font-size:34px">${PIN}${esc(L.venue)}</div>
    <div style="margin-top:10px;font-size:26px;color:var(--muted);font-weight:700">Ματς Τρίτη, Πέμπτη &amp; Παρασκευή · 19:30 &amp; 21:00</div></div>`, true)],
  ...teamsOrder.map((t, i) => [`carousel-${String(6 + i).padStart(2, "0")}-${t.id}`, C(6 + i, `
    <div class="glow" style="--tc:${t.color}"></div>
    <div style="display:flex;align-items:center;gap:36px;margin:34px 0 28px">${crest(t, 190)}
      <div><span class="kicker" style="font-size:24px">${esc(L.groups[t.group])} · ${t.id.replace("A", "Α").replace("B", "Β")}</span>
      <div class="h1" style="font-size:${t.name.length > 12 ? 78 : 96}px;margin-top:16px">${esc(t.name)}</div></div></div>
    <div class="glass"><div class="rhead"><b>Ρόστερ</b><span>${t.players.length} παίκτες</span></div>
      <ol class="roster">${t.players.map((p, k) => `<li><i>${String(k + 1).padStart(2, "0")}</i>${esc(typeof p === "string" ? p : p.name || p[0])}</li>`).join("")}</ol></div>
    <div class="glass" style="margin-top:auto"><div class="rhead"><b>Τα ματς</b><span>${esc(L.groups[t.group])}</span></div>
      <div class="fx">${fixturesOf(t).map((m) => { const x = dd(m.date), o = team[m.home === t.id ? m.away : m.home]; return `<div><b>${x.day} ${x.date}</b>${crest(o, 30)}${esc(o.name)}</div>`; }).join("")}</div></div>`, true)]),
  [`carousel-${TOTAL}-outro`, C(TOTAL, `
    <div style="margin:auto 0;text-align:center"><div class="h1" style="font-size:120px">Ραντεβού<br>στο γήπεδο</div>
    <div class="rule" style="font-size:30px;margin:40px 60px">Πρεμιέρα ${dd(L.matches[0].date).day} ${dd(L.matches[0].date).date} · ${dd(L.matches[0].date).time}</div>
    <div style="font-size:34px;font-weight:700;line-height:1.5;color:var(--ice)">Βαθμολογίες, προγνωστικά<br>&amp; live κερκίδα στο site</div>
    <div style="margin-top:44px"><span class="cta" style="font-size:34px">Link στο bio</span></div></div>
    <div class="venue" style="font-size:30px">${PIN}${esc(L.venue)}</div>`, true)],
];

(async () => {
  const browser = await chromium.launch();
  for (const [name, html, w, h] of [...stories.map(([n, x]) => [n, x, 1080, 1920]), ...carousel.map(([n, x]) => [n, x, 1080, 1350])]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const over = await page.evaluate(() => document.querySelector(".page").scrollHeight > innerHeight + 1);
    if (over) console.warn("ΠΡΟΣΟΧΗ: το περιεχόμενο ξεχειλίζει στο", name);
    await page.screenshot({ path: path.join(OUT, name + ".png") });
    await page.close();
    console.log("✓", name);
  }
  await browser.close();
})();
