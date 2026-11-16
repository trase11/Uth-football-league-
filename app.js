(() => {
  const L = window.LEAGUE;
  const $ = (s) => document.querySelector(s);
  const teamById = Object.fromEntries(L.teams.map((t) => [t.id, t]));
  const DAYS = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"];
  const MONTHS = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαΐ", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const d = (iso) => new Date(iso);
  const fmtDay = (dt) => `${DAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
  const fmtTime = (dt) => dt.toTimeString().slice(0, 5);
  const crest = (t, size = "") => `<span class="crest ${size}" style="--c:${t.color}">${esc(t.short)}</span>`;
  window.UTH = { teamById, DAYS, MONTHS, esc, crest }; // κοινά helpers για το predictions.js

  const played = L.matches.filter((m) => m.status === "played").sort((a, b) => d(a.date) - d(b.date));
  const upcoming = L.matches.filter((m) => m.status !== "played").sort((a, b) => d(a.date) - d(b.date));

  /* ---------- Standings ---------- */
  function computeTable() {
    const rows = Object.fromEntries(L.teams.map((t) => [t.id, { team: t, p: 0, w: 0, dr: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }]));
    for (const m of played) {
      const [hg, ag] = m.score;
      const h = rows[m.home], a = rows[m.away];
      h.p++; a.p++; h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
      if (hg > ag) { h.w++; a.l++; h.pts += 3; h.form.push("W"); a.form.push("L"); }
      else if (hg < ag) { a.w++; h.l++; a.pts += 3; a.form.push("W"); h.form.push("L"); }
      else { h.dr++; a.dr++; h.pts++; a.pts++; h.form.push("D"); a.form.push("D"); }
    }
    return Object.values(rows).sort((x, y) =>
      y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.team.name.localeCompare(y.team.name, "el"));
  }
  const table = computeTable();

  const formChips = (form) => {
    const last = form.slice(-5);
    const label = { W: "Ν", D: "Ι", L: "Η" };
    const chips = last.map((r) => `<span class="form-chip ${r}">${label[r]}</span>`);
    while (chips.length < 5) chips.push(`<span class="form-chip empty"></span>`);
    return `<span class="form">${chips.join("")}</span>`;
  };

  $("#standingsTable").innerHTML = `
    <thead><tr>
      <th>#</th><th class="team-col">Ομάδα</th><th title="Αγώνες">Αγ</th><th title="Νίκες">Ν</th><th title="Ισοπαλίες">Ι</th><th title="Ήττες">Η</th>
      <th title="Γκολ">Γκολ</th><th title="Διαφορά">+/-</th><th>Βαθ</th><th>Φόρμα</th>
    </tr></thead>
    <tbody>${table.map((r, i) => {
      const gd = r.gf - r.ga;
      return `<tr class="${i < 4 ? "q" : ""}" data-team="${r.team.id}">
        <td class="pos">${i + 1}</td>
        <td class="team-cell"><span class="team-name">${crest(r.team)}${esc(r.team.name)}</span></td>
        <td>${r.p}</td><td>${r.w}</td><td>${r.dr}</td><td>${r.l}</td>
        <td>${r.gf}:${r.ga}</td>
        <td class="${gd > 0 ? "gd-pos" : gd < 0 ? "gd-neg" : ""}">${gd > 0 ? "+" : ""}${gd}</td>
        <td class="pts">${r.pts}</td>
        <td>${formChips(r.form)}</td>
      </tr>`;
    }).join("")}</tbody>`;

  /* ---------- Hero: next match + countdown + stats ---------- */
  const next = upcoming.find((m) => d(m.date) > new Date()) || upcoming[0];
  if (next) {
    const h = teamById[next.home], a = teamById[next.away], dt = d(next.date);
    $("#nextMatch").innerHTML = `
      <div class="nm-label">Επόμενο ματς · ${next.round}η αγωνιστική</div>
      <div class="nm-teams">
        <div class="nm-team">${crest(h, "lg")}${esc(h.name)}</div>
        <div class="nm-vs">VS</div>
        <div class="nm-team">${crest(a, "lg")}${esc(a.name)}</div>
      </div>
      <div class="countdown" id="countdown"></div>
      <div class="nm-meta">${fmtDay(dt)} · ${fmtTime(dt)} · ${esc(next.pitch)}</div>`;
    const cd = $("#countdown");
    const tick = () => {
      let s = Math.max(0, Math.floor((dt - new Date()) / 1000));
      const parts = [[Math.floor(s / 86400), "Μέρες"], [Math.floor(s / 3600) % 24, "Ώρες"], [Math.floor(s / 60) % 60, "Λεπτά"], [s % 60, "Δεύτ."]];
      cd.innerHTML = parts.map(([v, l]) => `<div><b>${String(v).padStart(2, "0")}</b><small>${l}</small></div>`).join("");
    };
    tick(); setInterval(tick, 1000);
  } else {
    $("#nextMatch").innerHTML = `<div class="nm-label">Το τουρνουά ολοκληρώθηκε</div>`;
  }

  const totalGoals = played.reduce((s, m) => s + m.score[0] + m.score[1], 0);
  $("#heroStats").innerHTML = [
    [L.teams.length, "Ομάδες"], [played.length, "Αγώνες"], [totalGoals, "Γκολ"],
    [played.length ? (totalGoals / played.length).toFixed(1) : "0", "Γκολ / ματς"],
  ].map(([v, l]) => `<div><b>${v}</b><small>${l}</small></div>`).join("");

  /* ---------- Ticker ---------- */
  const tickerItems = played.slice().reverse().map((m) =>
    `<span>${esc(teamById[m.home].name)}<b>${m.score[0]} - ${m.score[1]}</b>${esc(teamById[m.away].name)}</span>`).join("");
  $("#ticker").innerHTML = tickerItems + tickerItems; // duplicated for seamless loop

  /* ---------- Fixtures ---------- */
  const byRound = (list) => list.reduce((acc, m) => ((acc[m.round] ||= []).push(m), acc), {});
  // μόνο τα ματς της τρέχουσας εβδομάδας (Δευτέρα–Κυριακή)
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
  const lastDay = new Date(weekEnd - 1);
  $("#fixturesNote").textContent = `Εβδομάδα ${weekStart.getDate()} ${MONTHS[weekStart.getMonth()]} – ${lastDay.getDate()} ${MONTHS[lastDay.getMonth()]} · Olympico Sports Club`;
  const upRounds = byRound(upcoming.filter((m) => d(m.date) >= weekStart && d(m.date) < weekEnd));
  $("#fixturesList").innerHTML = Object.keys(upRounds).map((r) => `
    <div class="round-label">${r}η αγωνιστική</div>
    ${upRounds[r].map((m) => {
      const h = teamById[m.home], a = teamById[m.away], dt = d(m.date);
      const soon = m === next;
      return `<div class="card fixture ${soon ? "soon" : ""}">
        <div class="fx-date">${fmtDay(dt)} <small>${dt.getFullYear()}</small></div>
        <div class="fx-team home">${esc(h.name)}${crest(h)}</div>
        <div class="fx-time">${fmtTime(dt)}</div>
        <div class="fx-team away">${crest(a)}${esc(a.name)}</div>
        <div class="fx-pitch">${soon ? `<span class="badge">Επόμενο</span><br>` : ""}${esc(m.pitch)}</div>
      </div>`;
    }).join("")}`).join("") || `<p class="block-note">Δεν υπάρχουν ματς αυτή την εβδομάδα.</p>`;

  /* ---------- Results ---------- */
  const resRounds = byRound(played);
  const roundKeys = Object.keys(resRounds).sort((a, b) => b - a);
  const renderResults = (r) => {
    $("#resultsList").innerHTML = resRounds[r].map((m) => {
      const h = teamById[m.home], a = teamById[m.away], dt = d(m.date);
      const [hg, ag] = m.score;
      const goalsOf = (id) => (m.goals || []).filter((g) => g[0] === id).sort((x, y) => x[2] - y[2])
        .map((g) => `<li>${esc(g[1])} ${g[2]}′</li>`).join("");
      return `<article class="card result">
        <div class="result-top"><span>${fmtDay(dt)} · ${fmtTime(dt)}</span><span>${esc(m.pitch)}</span></div>
        <div class="result-main">
          <div class="fx-team home ${hg > ag ? "win" : hg < ag ? "lose" : ""}">${esc(h.name)}${crest(h)}</div>
          <div class="score">${hg}-${ag}</div>
          <div class="fx-team away ${ag > hg ? "win" : ag < hg ? "lose" : ""}">${crest(a)}${esc(a.name)}</div>
        </div>
        ${m.goals?.length ? `<div class="goals"><ul class="h">${goalsOf(m.home)}</ul><ul>${goalsOf(m.away)}</ul></div>` : ""}
      </article>`;
    }).join("");
    document.querySelectorAll("#roundTabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.r === r));
  };
  $("#roundTabs").innerHTML = roundKeys.map((r) => `<button role="tab" data-r="${r}">${r}η αγων.</button>`).join("");
  $("#roundTabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) renderResults(b.dataset.r); });
  if (roundKeys.length) renderResults(roundKeys[0]);
  else $("#resultsList").innerHTML = `<p class="block-note">Δεν έχουν γίνει ακόμα αγώνες.</p>`;

  /* ---------- Scorers ---------- */
  const scorerMap = {};
  for (const m of played) for (const [tid, name] of m.goals || []) {
    const k = tid + "|" + name;
    (scorerMap[k] ||= { name, team: teamById[tid], g: 0 }).g++;
  }
  const scorers = Object.values(scorerMap).sort((a, b) => b.g - a.g || a.name.localeCompare(b.name, "el")).slice(0, 8);
  const maxG = scorers[0]?.g || 1;
  $("#scorersList").innerHTML = scorers.map((s, i) => `
    <li>
      <span class="rank">${i + 1}</span>
      <span class="who"><b>${esc(s.name)}</b><small>${esc(s.team.name)}</small></span>
      <span class="g"><span class="bar" style="width:${(s.g / maxG) * 60}px"></span>${s.g}</span>
    </li>`).join("");

  /* ---------- Final Four bracket ---------- */
  const seed = (i) => table[i]?.team;
  const brTeam = (t, n) => `<div class="br-team"><span class="seed">${n}</span>${crest(t)}${esc(t.name)}</div>`;
  $("#bracket").innerHTML = `
    <div class="br-col">
      <div class="br-match"><div class="br-title">Ημιτελικός 1</div>${brTeam(seed(0), 1)}${brTeam(seed(3), 4)}</div>
      <div class="br-match"><div class="br-title">Ημιτελικός 2</div>${brTeam(seed(1), 2)}${brTeam(seed(2), 3)}</div>
    </div>
    <div class="br-lines"></div>
    <div class="br-final">
      <div class="trophy"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12v2h4v3a5 5 0 0 1-4.6 5A6 6 0 0 1 13 15.9V19h4v3H7v-3h4v-3.1A6 6 0 0 1 6.6 12 5 5 0 0 1 2 7V4h4V2zm0 4H4v1a3 3 0 0 0 2 2.8V6zm12 0v3.8A3 3 0 0 0 20 7V6h-2z"/></svg></div>
      <div class="br-match"><div class="br-title">Τελικός</div>
        <div class="br-team"><span class="seed"></span>Νικητής Η1</div>
        <div class="br-team"><span class="seed"></span>Νικητής Η2</div>
      </div>
    </div>`;

  /* ---------- News ---------- */
  $("#newsList").innerHTML = L.news.map((n) => {
    const dt = d(n.date);
    return `<article class="card news-card">
      <div class="news-meta"><span class="badge">${esc(n.tag)}</span>${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}</div>
      <h3>${esc(n.title)}</h3>
      <p>${esc(n.body)}</p>
    </article>`;
  }).join("");

  /* ---------- Teams ---------- */
  const rowOf = (id) => table.find((r) => r.team.id === id);
  $("#teamsList").innerHTML = L.teams.map((t) => {
    const r = rowOf(t.id), pos = table.indexOf(r) + 1;
    return `<button class="card team-card" data-team="${t.id}">
      ${crest(t, "lg")}
      <h3>${esc(t.name)}</h3>
      <small>${esc(t.dept)}</small>
      <div class="tc-stats"><span><b>${pos}η</b> θέση</span><span><b>${r.pts}</b> βαθ.</span></div>
    </button>`;
  }).join("");

  const openTeam = (id) => {
    const t = teamById[id], r = rowOf(id), pos = table.indexOf(r) + 1;
    const games = L.matches.filter((m) => m.home === id || m.away === id).sort((a, b) => d(a.date) - d(b.date));
    const line = (m) => {
      const opp = teamById[m.home === id ? m.away : m.home];
      const vs = m.home === id ? "vs" : "@";
      const res = m.status === "played" ? `${m.score[0]}-${m.score[1]}` : `${fmtDay(d(m.date))} ${fmtTime(d(m.date))}`;
      return `<li><span>${vs} ${esc(opp.name)}</span><span>${res}</span></li>`;
    };
    $("#teamDialogBody").innerHTML = `
      <div class="td-head">${crest(t, "xl")}<div><h3>${esc(t.name)}</h3><p>${esc(t.dept)}</p><p>Αρχηγός: ${esc(t.captain)}</p></div></div>
      <div class="td-stats">
        <div><b>${pos}η</b><small>Θέση</small></div><div><b>${r.pts}</b><small>Βαθμοί</small></div>
        <div><b>${r.w}-${r.dr}-${r.l}</b><small>Ν-Ι-Η</small></div><div><b>${r.gf}:${r.ga}</b><small>Γκολ</small></div>
      </div>
      <div class="td-sub">Αγώνες</div>
      <ul class="td-list">${games.map(line).join("")}</ul>`;
    $("#teamDialog").showModal();
  };
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-team]");
    if (el) openTeam(el.dataset.team);
  });
  $("#teamDialog").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

  /* ---------- Nav: mobile menu + active section ---------- */
  const nav = $(".nav"), menuBtn = $(".menu-btn");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  nav.addEventListener("click", () => { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", false); });
  const links = [...nav.querySelectorAll("a")];
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) {
      links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main section[id]").forEach((s) => io.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const rv = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); rv.unobserve(en.target); }
  }), { threshold: 0.08 });
  document.querySelectorAll(".block .card, .round-label").forEach((el) => { el.classList.add("reveal"); rv.observe(el); });

  /* ---------- Kick the ball! ---------- */
  const ball = $("#ball");
  ball.addEventListener("click", () => {
    if (ball.classList.contains("kicked")) return;
    ball.classList.add("kicked");
    setTimeout(() => {
      const g = document.createElement("div");
      g.className = "goal-flash"; g.textContent = "ΓΚΟΟΟΛ!";
      document.body.appendChild(g);
      setTimeout(() => g.remove(), 1700);
    }, 700);
    setTimeout(() => ball.classList.remove("kicked"), 2600);
  });
})();
