/*
 * ΚΕΡΚΙΔΑ — live chat του τουρνουά
 * Κάθε χρήστης έχει ένα έγγραφο chat/<id> με { nick, team, msgs: [{id, t, at}] } (τα 50 τελευταία).
 * Όλοι διαβάζουν, ο καθένας γράφει μόνο το δικό του· ο διοργανωτής μπορεί να σβήσει μηνύματα.
 * Λειτουργεί μόνο με την κοινή βάση (μέσα στο Claude artifact).
 */
(() => {
  const L = window.LEAGUE;
  const $ = (s) => document.querySelector(s);
  const { teamById, esc, crest } = window.UTH;
  const MAX_LEN = 280, KEEP = 50, SHOW = 80, COOLDOWN_MS = 3000;

  let db = null, myId = null, isOwner = false;
  let docs = {};       // userId -> { nick, team, msgs }
  let mine = null;     // το δικό μου έγγραφο, όπως το έστειλα τελευταία
  let lastSent = 0;
  let saving = Promise.resolve();

  const ago = (iso) => {
    const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
    if (s < 60) return "τώρα";
    if (s < 3600) return `πριν ${Math.floor(s / 60)}′`;
    if (s < 86400) return `πριν ${Math.floor(s / 3600)} ώρ.`;
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  const setNote = (msg) => { const el = $("#chatNote"); el.textContent = msg; el.hidden = !msg; };

  function render() {
    const feed = $("#chatFeed");
    const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 60;
    const msgs = [];
    for (const [uid, v] of Object.entries(docs)) {
      if (!v || !Array.isArray(v.msgs)) continue;
      for (const m of v.msgs) if (m && typeof m.t === "string" && m.at) msgs.push({ uid, nick: String(v.nick || "Ανώνυμος").slice(0, 24), team: teamById[v.team], ...m });
    }
    msgs.sort((a, b) => new Date(a.at) - new Date(b.at));
    feed.innerHTML = msgs.slice(-SHOW).map((m) => `
      <li class="msg ${m.uid === myId ? "own" : ""}">
        ${m.team ? crest(m.team) : `<span class="crest" style="--c:#5f7fb5">?</span>`}
        <div class="msg-body">
          <div class="msg-meta"><b>${esc(m.nick)}</b>${m.team ? `<span>${esc(m.team.name)}</span>` : ""}<time>${ago(m.at)}</time>
            ${isOwner ? `<button class="msg-del" data-uid="${esc(m.uid)}" data-id="${esc(m.id)}" aria-label="Διαγραφή μηνύματος">✕</button>` : ""}</div>
          <p>${esc(m.t.slice(0, MAX_LEN))}</p>
        </div>
      </li>`).join("") || `<li class="msg-empty">Η κερκίδα είναι άδεια — γράψε το πρώτο μήνυμα!</li>`;
    if (nearBottom) feed.scrollTop = feed.scrollHeight;
    $("#chatCount").textContent = `${new Set(msgs.map((m) => m.uid)).size} στην κερκίδα`;
  }

  async function send(text) {
    const nick = $("#chatNick").value.trim().slice(0, 24);
    if (!nick) { $("#chatNick").focus(); setNote("Γράψε ένα ψευδώνυμο πρώτα."); return false; }
    if (Date.now() - lastSent < COOLDOWN_MS) { setNote("Λίγο πιο αργά — ένα μήνυμα κάθε 3 δευτερόλεπτα."); return false; }
    const base = mine || docs[myId] || { msgs: [] };
    const msg = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: text.slice(0, MAX_LEN), at: new Date().toISOString() };
    mine = { nick, team: $("#chatTeam").value || null, msgs: [...(Array.isArray(base.msgs) ? base.msgs : []), msg].slice(-KEEP) };
    docs[myId] = mine;
    lastSent = Date.now();
    setNote("");
    render();
    const doc = JSON.parse(JSON.stringify(mine));
    saving = saving.then(() => db.doc("chat/" + myId).set(doc)).catch(() => setNote("Το μήνυμα δεν στάλθηκε: δεν έχεις δικαίωμα να γράφεις εδώ."));
    return true;
  }

  async function boot() {
    $("#chatTeam").innerHTML = `<option value="">Ομάδα (προαιρετικά)</option>` + L.teams.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
    if (!window.claude?.use) return off();
    const [d, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]).catch(() => []);
    if (!d || !user) return off();
    myId = await user.id();
    if (!myId) return off();
    db = d;
    isOwner = await user.isOwner();
    $("#chatForm").hidden = false;
    $("#chatOff").hidden = true;
    const timer = setTimeout(() => setNote("Η σύνδεση αργεί… τα μηνύματα ίσως δεν είναι ενημερωμένα."), 10000);
    db.collection("chat").onSnapshot((snap) => {
      if (!snap.metadata.fromCache) { clearTimeout(timer); if ($("#chatNote").textContent.startsWith("Η σύνδεση")) setNote(""); }
      const next = {};
      for (const x of snap.docs) if (x.exists) next[x.id] = x.data();
      if (mine) next[myId] = mine; // τα δικά μου, ακόμα κι αν δεν έχουν φτάσει
      docs = next;
      const own = docs[myId];
      if (own && !$("#chatNick").value) { $("#chatNick").value = own.nick || ""; $("#chatTeam").value = own.team || ""; }
      render();
    }, (e) => { clearTimeout(timer); setNote("Δεν ήταν δυνατή η φόρτωση της κερκίδας (" + (e?.code || "σφάλμα") + ")."); });
    setInterval(render, 30000); // ανανέωση του «πριν Χ′»

    $("#chatForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const inp = $("#chatText"), text = inp.value.trim();
      if (text && (await send(text))) inp.value = "";
    });
    $("#chatFeed").addEventListener("click", async (e) => {
      const b = e.target.closest(".msg-del");
      if (!b || !isOwner) return;
      const v = docs[b.dataset.uid];
      if (!v) return;
      const next = { ...v, msgs: (v.msgs || []).filter((m) => m.id !== b.dataset.id) };
      if (b.dataset.uid === myId) mine = next;
      try { await db.doc("chat/" + b.dataset.uid).set(next); } catch (err) { setNote("Η διαγραφή απέτυχε (" + (err?.code || "σφάλμα") + ")."); }
    });
  }
  function off() { $("#chatForm").hidden = true; $("#chatOff").hidden = false; render(); }

  boot();
})();
