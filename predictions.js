/*
 * ΠΡΟΓΝΩΣΤΙΚΑ — παιχνίδι πρόβλεψης (χωρίς χρήματα)
 * ------------------------------------------------------------
 * Κάθε επισκέπτης ψηφίζει 1 / X / 2 και (προαιρετικά) ακριβές σκορ
 * για τα επόμενα ματς. Οι ψήφοι κλειδώνουν στη σέντρα.
 * Πόντοι: 3 για ακριβές σκορ, 1 για σωστό σημείο (1/X/2).
 *
 * Αποθήκευση:
 *  - Μέσα στο Claude artifact: κοινή βάση (όλοι βλέπουν τις ψήφους όλων).
 *  - Αλλού (π.χ. GitHub Pages): τοπικά στον browser, μέχρι να συνδεθεί
 *    backend (π.χ. Firebase / Supabase) στη θέση του createLocalStore().
 */
(() => {
  const L = window.LEAGUE;
  const $ = (s) => document.querySelector(s);
  const teamById = Object.fromEntries(L.teams.map((t) => [t.id, t]));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const DAYS = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"];
  const MONTHS = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαΐ", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];
  const fmt = (dt) => `${DAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]} · ${dt.toTimeString().slice(0, 5)}`;
  const crest = (t) => `<span class="crest" style="--c:${t.color}">${esc(t.short)}</span>`;

  const keyOf = (m) => `${m.round}-${m.home}-${m.away}`;
  const signOf = (h, a) => (h > a ? "1" : h < a ? "2" : "X");
  const isLocked = (m) => m.status !== "upcoming" || new Date(m.date) <= new Date();

  const upcoming = L.matches.filter((m) => m.status === "upcoming").sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextRounds = [...new Set(upcoming.map((m) => m.round))].slice(0, 2);
  const open = upcoming.filter((m) => nextRounds.includes(m.round));
  const played = L.matches.filter((m) => m.status === "played");

  /* ---------- State ---------- */
  let all = {};          // viewerId -> { nick, picks }
  let myId = null;
  let me = { nick: "", picks: {} };
  let store = null;
  let saving = Promise.resolve();

  /* ---------- Stores ---------- */
  function createLocalStore() {
    const KEY = "uth-predictions";
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
    return {
      shared: false,
      async init(onAll) {
        myId = "local";
        const saved = read();
        if (saved) me = saved;
        onAll({ local: me });
      },
      async save(doc) { try { localStorage.setItem(KEY, JSON.stringify(doc)); } catch {} },
    };
  }

  async function createSharedStore() {
    if (!window.claude?.use) return null;
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    if (!db || !user) return null;
    const id = await user.id();
    if (!id) return null;
    let canWrite = await user.can("data.write").catch(() => null);
    return {
      shared: true,
      get canWrite() { return canWrite !== false; },
      async init(onAll) {
        myId = id;
        const timer = setTimeout(() => setStatus("Η σύνδεση με τη βάση αργεί… οι ψήφοι ίσως δεν είναι ενημερωμένες."), 10000);
        db.collection("picks").onSnapshot((snap) => {
          if (!snap.metadata.fromCache) { clearTimeout(timer); setStatus(""); }
          const next = {};
          for (const d of snap.docs) if (d.exists) next[d.id] = d.data();
          onAll(next);
        }, (e) => { clearTimeout(timer); setStatus("Δεν ήταν δυνατή η φόρτωση των ψήφων (" + (e?.code || "σφάλμα") + ")."); });
      },
      async save(doc) {
        try { await db.doc("picks/" + id).set(doc); }
        catch (e) {
          if (e?.code === "permission_denied" || e?.code === "invalid_argument" || e?.code === "not_granted") canWrite = false;
          setStatus("Η ψήφος δεν αποθηκεύτηκε: δεν έχεις δικαίωμα ψήφου σε αυτή τη σελίδα.");
          render();
        }
      },
    };
  }

  /* ---------- Helpers ---------- */
  function setStatus(msg) { const el = $("#predStatus"); if (el) { el.textContent = msg; el.hidden = !msg; } }

  function tally(m) {
    const k = keyOf(m), c = { "1": 0, X: 0, "2": 0 };
    for (const v of Object.values(all)) { const p = v?.picks?.[k]; if (p?.s && c[p.s] !== undefined) c[p.s]++; }
    const total = c["1"] + c.X + c["2"];
    const odds = {}, pct = {};
    for (const s of ["1", "X", "2"]) {
      const share = (c[s] + 1) / (total + 3);           // εξομάλυνση για λίγες ψήφους
      odds[s] = Math.max(1.05, 0.92 / share).toFixed(2); // «απόδοση κοινού»
      pct[s] = total ? Math.round((c[s] / total) * 100) : 0;
    }
    return { c, total, odds, pct };
  }

  function pointsFor(picks) {
    let pts = 0, exact = 0, signs = 0;
    for (const m of played) {
      const p = picks?.[keyOf(m)];
      if (!p) continue;
      const [h, a] = m.score;
      if (Number.isInteger(p.h) && Number.isInteger(p.a) && p.h === h && p.a === a) { pts += 3; exact++; }
      else if (p.s === signOf(h, a)) { pts += 1; signs++; }
    }
    return { pts, exact, signs };
  }

  function queueSave(opts) {
    me.updatedAt = new Date().toISOString();
    all[myId] = JSON.parse(JSON.stringify(me));
    render(opts);
    clearTimeout(queueSave.t);
    queueSave.t = setTimeout(() => {
      const doc = JSON.parse(JSON.stringify(me));
      saving = saving.then(() => store.save(doc)); // ένα write τη φορά
    }, 500);
  }

  /* ---------- Render ---------- */
  function render(opts = {}) {
    const canVote = !store?.shared || store.canWrite;
    const needNick = store?.shared && canVote && !me.nick;

    if (opts.list !== false) $("#predList").innerHTML = open.map((m) => {
      const h = teamById[m.home], a = teamById[m.away], k = keyOf(m);
      const p = me.picks[k] || {};
      const t = tally(m);
      const locked = isLocked(m) || !canVote;
      const btn = (s, label) => `
        <button class="odd ${p.s === s ? "on" : ""}" data-k="${k}" data-s="${s}" ${locked ? "disabled" : ""}>
          <span class="odd-s">${s}</span><span class="odd-l">${label}</span><b>${t.odds[s]}</b>
        </button>`;
      const showBars = !store?.shared ? false : (p.s || isLocked(m));
      return `<article class="card pred">
        <div class="pred-top"><span>${m.round}η αγων. · ${fmt(new Date(m.date))}</span>
          <span>${isLocked(m) ? `<span class="badge lock">Κλειστό</span>` : p.s ? `<span class="badge">✓ Ψήφισες</span>` : ""}</span></div>
        <div class="pred-teams">
          <span class="fx-team home">${esc(h.name)}${crest(h)}</span>
          <span class="pred-score">
            <input type="number" min="0" max="20" inputmode="numeric" aria-label="Γκολ ${esc(h.name)}" data-k="${k}" data-side="h" value="${p.h ?? ""}" ${locked ? "disabled" : ""} placeholder="–">
            <span>:</span>
            <input type="number" min="0" max="20" inputmode="numeric" aria-label="Γκολ ${esc(a.name)}" data-k="${k}" data-side="a" value="${p.a ?? ""}" ${locked ? "disabled" : ""} placeholder="–">
          </span>
          <span class="fx-team away">${crest(a)}${esc(a.name)}</span>
        </div>
        <div class="odds">${btn("1", "Άσσος")}${btn("X", "Ισοπαλία")}${btn("2", "Διπλό")}</div>
        ${showBars ? `<div class="crowd">
          <div class="crowd-bar"><i style="width:${t.pct["1"]}%"></i><i style="width:${t.pct.X}%"></i><i style="width:${t.pct["2"]}%"></i></div>
          <div class="crowd-l"><span>1 · ${t.pct["1"]}%</span><span>${t.total} ψήφοι</span><span>${t.pct["2"]}% · 2</span></div>
        </div>` : ""}
      </article>`;
    }).join("") || `<p class="block-note">Δεν υπάρχουν ανοιχτά ματς για πρόβλεψη.</p>`;

    // leaderboard
    const rows = Object.entries(all)
      .filter(([, v]) => v && v.picks && Object.keys(v.picks).length)
      .map(([id, v]) => ({ id, nick: v.nick || "Ανώνυμος", n: Object.keys(v.picks).length, ...pointsFor(v.picks) }))
      .sort((x, y) => y.pts - x.pts || y.exact - x.exact || y.n - x.n || x.nick.localeCompare(y.nick, "el"));
    $("#predBoard").innerHTML = rows.length ? rows.slice(0, 15).map((r, i) => `
      <li class="${r.id === myId ? "me" : ""}">
        <span class="rank">${i + 1}</span>
        <span class="who"><b></b><small>${r.exact} ακριβή · ${r.signs} σημεία · ${r.n} ψήφοι</small></span>
        <span class="g">${r.pts}</span>
      </li>`).join("") : `<li class="empty">Κανείς δεν έχει ψηφίσει ακόμα — γίνε ο πρώτος!</li>`;
    // nicknames via textContent (user input)
    $("#predBoard").querySelectorAll("li:not(.empty) .who b").forEach((b, i) => { b.textContent = rows[i].nick + (rows[i].id === myId ? " (εσύ)" : ""); });

    const mine = pointsFor(me.picks);
    $("#predMe").innerHTML = `<b>${mine.pts}</b><small>πόντοι</small>`;
    $("#predNickWrap").hidden = !(store?.shared && canVote);
    $("#predNick").classList.toggle("need", needNick);
    $("#predMode").textContent = store?.shared
      ? (canVote ? "Οι ψήφοι είναι κοινές — όλοι βλέπουν τα ποσοστά και την κατάταξη." : "Μπορείς να βλέπεις τα προγνωστικά, αλλά δεν έχεις δικαίωμα ψήφου σε αυτή τη σελίδα.")
      : "Προσχέδιο: οι ψήφοι σου μένουν σε αυτή τη συσκευή. Για κοινή ψηφοφορία θα συνδεθεί βάση δεδομένων.";
  }

  /* ---------- Events ---------- */
  function bind() {
    $("#predList").addEventListener("click", (e) => {
      const b = e.target.closest(".odd");
      if (!b || b.disabled) return;
      if (store?.shared && !me.nick) { $("#predNick").focus(); setStatus("Γράψε πρώτα ένα ψευδώνυμο για την κατάταξη."); return; }
      const k = b.dataset.k, cur = me.picks[k] || {};
      me.picks[k] = { ...cur, s: cur.s === b.dataset.s ? undefined : b.dataset.s };
      if (!me.picks[k].s && !Number.isInteger(me.picks[k].h)) delete me.picks[k];
      setStatus("");
      queueSave();
    });
    $("#predList").addEventListener("change", (e) => {
      const inp = e.target.closest("input[data-k]");
      if (!inp) return;
      if (store?.shared && !me.nick) { $("#predNick").focus(); setStatus("Γράψε πρώτα ένα ψευδώνυμο για την κατάταξη."); inp.value = ""; return; }
      const k = inp.dataset.k, cur = { ...(me.picks[k] || {}) };
      const v = inp.value === "" ? undefined : Math.max(0, Math.min(20, parseInt(inp.value, 10)));
      cur[inp.dataset.side] = Number.isInteger(v) ? v : undefined;
      if (Number.isInteger(cur.h) && Number.isInteger(cur.a)) cur.s = signOf(cur.h, cur.a); // το σκορ ορίζει και το σημείο
      me.picks[k] = cur;
      setStatus("");
      // ενημέρωσε μόνο τα κουμπιά αυτού του ματς, ώστε να μη χαθεί το focus
      $("#predList").querySelectorAll(`.odd[data-k="${k}"]`).forEach((b) => b.classList.toggle("on", b.dataset.s === cur.s));
      queueSave({ list: false });
    });
    $("#predNick").addEventListener("change", (e) => {
      const v = e.target.value.trim().slice(0, 24);
      if (v === me.nick) return;
      me.nick = v;
      queueSave();
    });
  }

  /* ---------- Boot ---------- */
  async function boot() {
    bind();
    store = createLocalStore();
    await store.init((a) => { all = a; render(); });
    $("#predNick").value = me.nick || "";
    // Αν τρέχει μέσα σε Claude artifact, πέρνα σε κοινή βάση.
    const shared = await createSharedStore().catch(() => null);
    if (shared) {
      store = shared;
      me = { nick: "", picks: {} };
      all = {};
      await store.init((a) => {
        all = a;
        if (a[myId] && !me.updatedAt) { me = JSON.parse(JSON.stringify(a[myId])); $("#predNick").value = me.nick || ""; }
        render();
      });
      if (!$("#predNick").value) $("#predNick").value = me.nick || "";
      render();
    }
  }
  boot();
})();
