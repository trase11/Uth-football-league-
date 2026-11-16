/*
 * ΠΡΟΓΝΩΣΤΙΚΑ — διαγωνισμός πρόβλεψης (χωρίς χρήματα, με έπαθλο στον πρώτο)
 * ------------------------------------------------------------
 * - Ψήφος 1 / X / 2 και (προαιρετικά) ακριβές σκορ. 3 πόντοι για ακριβές σκορ, 1 για σωστό σημείο.
 * - ΣΦΡΑΓΙΣΜΑ: στη σέντρα ο διοργανωτής (owner) πατάει «Σφράγισμα» και οι ψήφοι του ματς
 *   αντιγράφονται σε σημείο που μόνο εκείνος γράφει. Η κατάταξη μετράει ΜΟΝΟ σφραγισμένες ψήφους,
 *   άρα αλλαγές μετά τη σέντρα δεν μετράνε.
 * - ΑΠΟΔΕΙΞΗ ΝΙΚΗΤΗ: με την πρώτη ψήφο ο παίκτης παίρνει μυστικό κωδικό (π.χ. K7M2Q-9XWPA).
 *   Δημόσια αποθηκεύεται μόνο το SHA-256 του κωδικού· οι 4 πρώτοι χαρακτήρες του φαίνονται ως #tag
 *   δίπλα στο ψευδώνυμο. Στην παραλαβή ο νικητής δείχνει τον κωδικό και η «Επαλήθευση» βρίσκει ποιος είναι.
 *
 * Αποθήκευση: κοινή βάση μέσα στο Claude artifact· αλλού τοπικά στον browser (μόνο για δοκιμή).
 */
(() => {
  const L = window.LEAGUE;
  const $ = (s) => document.querySelector(s);
  const { teamById, esc, DAYS, MONTHS, crest } = window.UTH;
  const fmt = (dt) => `${DAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]} · ${dt.toTimeString().slice(0, 5)}`;

  const keyOf = (m) => `${m.round}-${m.home}-${m.away}`;
  const signOf = (h, a) => (h > a ? "1" : h < a ? "2" : "X");
  const started = (m) => m.status !== "upcoming" || new Date(m.date) <= new Date();

  const upcoming = L.matches.filter((m) => m.status === "upcoming").sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextRounds = [...new Set(upcoming.map((m) => m.round))].slice(0, 2);
  const open = upcoming.filter((m) => nextRounds.includes(m.round));
  const played = L.matches.filter((m) => m.status === "played");

  /* ---------- State ---------- */
  let all = {};      // viewerId -> { nick, picks, claim }
  let sealed = {};   // matchKey -> { at, picks: { viewerId: {s,h,a} } }
  let myId = null;
  let myCode = "";   // ο μυστικός κωδικός αυτού του παίκτη (ποτέ δημόσια)
  let isOwner = false;
  let me = { nick: "", picks: {} };
  let store = null;
  let saving = Promise.resolve();

  /* ---------- Claim code ---------- */
  const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // χωρίς 0/O/1/I
  const normCode = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const newCode = () => {
    const r = crypto.getRandomValues(new Uint8Array(10));
    const c = [...r].map((b) => ALPHA[b % 32]).join(""); // 256 % 32 === 0, άρα ομοιόμορφο
    return c.slice(0, 5) + "-" + c.slice(5);
  };
  const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normCode(s))))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  const tagOf = (claim) => (typeof claim === "string" && claim.length >= 4 ? "#" + claim.slice(0, 4).toUpperCase() : "");

  async function ensureClaim() {
    if (!myCode) { myCode = newCode(); await store.saveCode(myCode); }
    if (!me.claim) me.claim = await sha(myCode);
  }

  /* ---------- Stores ---------- */
  function createLocalStore() {
    const KEY = "uth-predictions", CODE = "uth-claim-code";
    const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
    const put = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
    return {
      shared: false,
      async init(onAll) {
        myId = "local";
        try { const saved = JSON.parse(get(KEY)); if (saved?.picks) me = saved; } catch {}
        myCode = get(CODE) || "";
        onAll({ local: me });
      },
      async save(doc) { put(KEY, JSON.stringify(doc)); },
      async saveCode(code) { put(CODE, code); },
    };
  }

  async function createSharedStore() {
    if (!window.claude?.use) return null;
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    if (!db || !user) return null;
    const id = await user.id();
    if (!id) return null;
    let canWrite = await user.can("data.write").catch(() => null);
    const owner = await user.isOwner();
    const codeDoc = db.collection("data/users/" + id).doc("claim"); // ιδιωτικό: μόνο ο ίδιος το διαβάζει
    const denied = (e) => ["permission_denied", "invalid_argument", "not_granted"].includes(e?.code);
    return {
      shared: true,
      get canWrite() { return canWrite !== false; },
      async init(onAll, onSealed) {
        myId = id;
        isOwner = owner;
        try { const c = await codeDoc.get(); if (c.exists) myCode = String(c.data().code || ""); } catch {}
        const timer = setTimeout(() => setStatus("Η σύνδεση με τη βάση αργεί… οι ψήφοι ίσως δεν είναι ενημερωμένες."), 10000);
        const fail = (e) => { clearTimeout(timer); setStatus("Δεν ήταν δυνατή η φόρτωση (" + (e?.code || "σφάλμα") + ")."); };
        db.collection("picks").onSnapshot((snap) => {
          if (!snap.metadata.fromCache) { clearTimeout(timer); setStatus(""); }
          const next = {};
          for (const d of snap.docs) if (d.exists) next[d.id] = d.data();
          onAll(next);
        }, fail);
        db.collection("sealed").onSnapshot((snap) => {
          const next = {};
          for (const d of snap.docs) if (d.exists) next[d.id] = d.data();
          onSealed(next);
        }, fail);
      },
      async save(doc) {
        try { await db.doc("picks/" + id).set(doc); }
        catch (e) {
          if (denied(e)) canWrite = false;
          setStatus("Η ψήφος δεν αποθηκεύτηκε: δεν έχεις δικαίωμα ψήφου σε αυτή τη σελίδα.");
          render();
        }
      },
      async saveCode(code) { await codeDoc.set({ code }); },
      async seal(k, picks) { await db.doc("sealed/" + k).set({ at: new Date().toISOString(), picks }); },
    };
  }

  /* ---------- Scoring ---------- */
  function setStatus(msg) { const el = $("#predStatus"); if (el) { el.textContent = msg; el.hidden = !msg; } }

  // Οι ψήφοι που μετράνε: στην κοινή βάση μόνο οι σφραγισμένες· τοπικά οι δικές σου.
  const countedPick = (id, k) => (store?.shared ? sealed[k]?.picks?.[id] : all[id]?.picks?.[k]);

  function pointsFor(id) {
    let pts = 0, exact = 0, signs = 0, n = 0;
    for (const m of played) {
      const p = countedPick(id, keyOf(m));
      if (!p || typeof p !== "object") continue;
      n++;
      const [h, a] = m.score;
      if (Number.isInteger(p.h) && Number.isInteger(p.a) && p.h === h && p.a === a) { pts += 3; exact++; }
      else if (p.s === signOf(h, a)) { pts += 1; signs++; }
    }
    return { pts, exact, signs, n };
  }

  function standings() {
    return Object.entries(all)
      .filter(([, v]) => v && typeof v.picks === "object" && v.picks)
      .map(([id, v]) => ({ id, nick: String(v.nick || "Ανώνυμος").slice(0, 24), claim: v.claim, ...pointsFor(id) }))
      .sort((x, y) => y.pts - x.pts || y.exact - x.exact || y.n - x.n || x.nick.localeCompare(y.nick, "el"));
  }

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
    return { total, odds, pct };
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
    const locked = (m) => started(m) || !!sealed[keyOf(m)];

    const typing = document.activeElement?.matches?.("#predList input"); // μη χαλάς ό,τι γράφει τώρα
    if (opts.list !== false && !typing) $("#predList").innerHTML = open.map((m) => {
      const h = teamById[m.home], a = teamById[m.away], k = keyOf(m);
      const p = me.picks[k] || {};
      const t = tally(m);
      const off = locked(m) || !canVote;
      const btn = (s, label) => `
        <button class="odd ${p.s === s ? "on" : ""}" data-k="${k}" data-s="${s}" ${off ? "disabled" : ""}>
          <span class="odd-s">${s}</span><span class="odd-l">${label}</span><b>${t.odds[s]}</b>
        </button>`;
      const showBars = store?.shared && (p.s || locked(m));
      const badge = sealed[k] ? `<span class="badge lock">Σφραγίστηκε</span>`
        : locked(m) ? `<span class="badge lock">Κλειστό</span>` : p.s ? `<span class="badge">Ψήφισες</span>` : "";
      return `<article class="card pred">
        <div class="pred-top"><span>${m.round}η αγων. · ${fmt(new Date(m.date))}</span><span>${badge}</span></div>
        <div class="pred-teams">
          <span class="fx-team home">${esc(h.name)}${crest(h)}</span>
          <span class="pred-score">
            <input type="number" min="0" max="20" inputmode="numeric" aria-label="Γκολ ${esc(h.name)}" data-k="${k}" data-side="h" value="${Number.isInteger(p.h) ? p.h : ""}" ${off ? "disabled" : ""} placeholder="–">
            <span>:</span>
            <input type="number" min="0" max="20" inputmode="numeric" aria-label="Γκολ ${esc(a.name)}" data-k="${k}" data-side="a" value="${Number.isInteger(p.a) ? p.a : ""}" ${off ? "disabled" : ""} placeholder="–">
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

    // Διαχείριση (μόνο ο διοργανωτής): ματς που πρέπει να σφραγιστούν
    const toSeal = isOwner ? [...open, ...played].filter((m) => !sealed[keyOf(m)]) : [];
    $("#predAdmin").hidden = !isOwner;
    if (isOwner) $("#predAdmin").innerHTML = `
      <div class="board-head">Διαχείριση · σφράγισμα ψήφων</div>
      <p class="admin-note">Πάτα «Σφράγισμα» στη σέντρα κάθε ματς. Μόνο οι σφραγισμένες ψήφοι μετράνε στην κατάταξη.</p>
      <ul class="admin-list">${toSeal.map((m) => `
        <li><span>${esc(teamById[m.home].name)} – ${esc(teamById[m.away].name)} <small>${fmt(new Date(m.date))}</small></span>
          <button class="seal-btn ${started(m) ? "due" : ""}" data-seal="${keyOf(m)}">Σφράγισμα</button></li>`).join("")
        || `<li class="empty">Όλα τα ματς είναι σφραγισμένα.</li>`}</ul>`;

    // Κατάταξη
    const rows = standings();
    $("#predBoard").innerHTML = rows.length ? rows.slice(0, 20).map((r, i) => `
      <li class="${r.id === myId ? "me" : ""}">
        <span class="rank">${i + 1}</span>
        <span class="who"><b></b> <span class="tag">${esc(tagOf(r.claim))}</span><small>${r.exact} ακριβή · ${r.signs} σημεία · ${r.n} ματς</small></span>
        <span class="g">${r.pts}</span>
      </li>`).join("") : `<li class="empty">Κανείς δεν έχει ψηφίσει ακόμα — γίνε ο πρώτος!</li>`;
    $("#predBoard").querySelectorAll("li:not(.empty) .who b").forEach((b, i) => { b.textContent = rows[i].nick + (rows[i].id === myId ? " (εσύ)" : ""); });

    const mine = pointsFor(myId);
    $("#predMe").innerHTML = `<b>${mine.pts}</b><small>πόντοι</small>`;
    $("#predNickWrap").hidden = !(store?.shared && canVote);
    $("#predNick").classList.toggle("need", store?.shared && canVote && !me.nick);
    $("#predCode").hidden = !myCode;
    if (myCode) $("#predCode").innerHTML = `
      <span class="code-label">Ο κωδικός νίκης σου <span class="tag">${esc(tagOf(me.claim))}</span></span>
      <code>${esc(myCode)}</code>
      <small>Κράτα τον (screenshot). Αν βγεις πρώτος, τον δείχνεις για να παραλάβεις το έπαθλο. Μην τον δώσεις σε κανέναν.</small>`;
    $("#predMode").textContent = store?.shared
      ? (canVote ? "Η κατάταξη μετράει μόνο τις ψήφους που σφραγίστηκαν στη σέντρα." : "Μπορείς να βλέπεις τα προγνωστικά, αλλά δεν έχεις δικαίωμα ψήφου σε αυτή τη σελίδα.")
      : "Προσχέδιο: οι ψήφοι σου μένουν σε αυτή τη συσκευή. Για τον διαγωνισμό χρειάζεται η κοινή βάση.";
  }

  /* ---------- Events ---------- */
  const needNick = () => {
    if (!(store?.shared && !me.nick)) return false;
    $("#predNick").focus(); setStatus("Γράψε πρώτα ένα ψευδώνυμο για την κατάταξη.");
    return true;
  };

  function bind() {
    $("#predList").addEventListener("click", async (e) => {
      const b = e.target.closest(".odd");
      if (!b || b.disabled || needNick()) return;
      await ensureClaim();
      const k = b.dataset.k, cur = me.picks[k] || {};
      me.picks[k] = { ...cur, s: cur.s === b.dataset.s ? undefined : b.dataset.s };
      if (!me.picks[k].s && !Number.isInteger(me.picks[k].h)) delete me.picks[k];
      setStatus("");
      queueSave();
    });
    $("#predList").addEventListener("change", async (e) => {
      const inp = e.target.closest("input[data-k]");
      if (!inp) return;
      if (needNick()) { inp.value = ""; return; }
      await ensureClaim();
      const k = inp.dataset.k, cur = { ...(me.picks[k] || {}) };
      const v = inp.value === "" ? undefined : Math.max(0, Math.min(20, parseInt(inp.value, 10)));
      cur[inp.dataset.side] = Number.isInteger(v) ? v : undefined;
      if (Number.isInteger(cur.h) && Number.isInteger(cur.a)) cur.s = signOf(cur.h, cur.a); // το σκορ ορίζει και το σημείο
      me.picks[k] = cur;
      setStatus("");
      // ενημέρωσε μόνο τα κουμπιά αυτού του ματς, ώστε να μη χαθεί το focus
      $("#predList").querySelectorAll(`.odd[data-k="${k}"]`).forEach((x) => x.classList.toggle("on", x.dataset.s === cur.s));
      queueSave({ list: false });
    });
    $("#predNick").addEventListener("change", (e) => {
      const v = e.target.value.trim().slice(0, 24);
      if (v === me.nick) return;
      me.nick = v;
      queueSave();
    });
    $("#predAdmin").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-seal]");
      if (!b || !store?.seal) return;
      const k = b.dataset.seal;
      const picks = {};
      for (const [id, v] of Object.entries(all)) {
        const p = v?.picks?.[k];
        if (p && (p.s || Number.isInteger(p.h))) picks[id] = { s: p.s ?? null, h: Number.isInteger(p.h) ? p.h : null, a: Number.isInteger(p.a) ? p.a : null };
      }
      b.disabled = true; b.textContent = "…";
      try { await store.seal(k, picks); } catch (err) { b.disabled = false; b.textContent = "Σφράγισμα"; setStatus("Το σφράγισμα απέτυχε (" + (err?.code || "σφάλμα") + ")."); }
    });
    $("#predVerify").addEventListener("submit", async (e) => {
      e.preventDefault();
      const out = $("#predVerifyOut");
      const code = $("#predVerifyCode").value;
      if (normCode(code).length !== 10) { out.className = "verify-out bad"; out.textContent = "Ο κωδικός έχει 10 χαρακτήρες (π.χ. K7M2Q-9XWPA)."; return; }
      const h = await sha(code);
      const rows = standings();
      const i = rows.findIndex((r) => r.claim === h);
      if (i < 0) { out.className = "verify-out bad"; out.textContent = "Ο κωδικός δεν αντιστοιχεί σε κανέναν παίκτη."; return; }
      out.className = "verify-out ok";
      out.textContent = `Σωστός κωδικός: ανήκει στον/στην «${rows[i].nick}» ${tagOf(rows[i].claim)} — ${i + 1}η θέση με ${rows[i].pts} πόντους.`;
    });
  }

  /* ---------- Boot ---------- */
  async function boot() {
    bind();
    store = createLocalStore();
    await store.init((a) => { all = a; render(); });
    $("#predNick").value = me.nick || "";
    // Μέσα σε Claude artifact: κοινή βάση.
    const shared = await createSharedStore().catch(() => null);
    if (shared) {
      store = shared;
      me = { nick: "", picks: {} };
      all = {};
      myCode = "";
      await store.init((a) => {
        all = a;
        const mine = a[myId];
        if (mine && typeof mine.picks === "object" && mine.picks && !me.updatedAt) { me = JSON.parse(JSON.stringify(mine)); $("#predNick").value = me.nick || ""; }
        if (me.updatedAt) all[myId] = JSON.parse(JSON.stringify(me)); // οι δικές μου αλλαγές που δεν έχουν φτάσει ακόμα
        render();
      }, (s) => { sealed = s; render(); });
      if (!$("#predNick").value) $("#predNick").value = me.nick || "";
      render();
    }
  }
  boot();
})();
