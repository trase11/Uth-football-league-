/*
 * ΚΕΡΚΙΔΑ — live chat του τουρνουά
 * Κάθε χρήστης έχει ένα έγγραφο chat/<id> με { nick, team, msgs: [{id, t, at}] } (τα 50 τελευταία).
 * Όλοι διαβάζουν, ο καθένας γράφει μόνο το δικό του· ο διοργανωτής μπορεί να σβήσει μηνύματα.
 * Φωτογραφίες: μικραίνουν στον browser (max 1280px, JPEG — φεύγουν και τα EXIF/τοποθεσία) και ανεβαίνουν
 * ως assets· στο μήνυμα μένει μόνο το id τους και εμφανίζονται μόνο ως <img>.
 * Λειτουργεί μόνο με την κοινή βάση (μέσα στο Claude artifact).
 */
(() => {
  const L = window.LEAGUE;
  const $ = (s) => document.querySelector(s);
  const { teamById, esc, crest } = window.UTH;
  const MAX_LEN = 280, KEEP = 50, SHOW = 80, COOLDOWN_MS = 3000;

  let db = null, assets = null, myId = null, isOwner = false, canDeleteAssets = false;
  let photo = null;    // Blob έτοιμο για αποστολή
  const validId = (x) => typeof x === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(x);
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
      for (const m of v.msgs) if (m && typeof m.t === "string" && m.at && (m.t || validId(m.img))) msgs.push({ uid, nick: String(v.nick || "Ανώνυμος").slice(0, 24), team: teamById[v.team], ...m });
    }
    msgs.sort((a, b) => new Date(a.at) - new Date(b.at));
    feed.innerHTML = msgs.slice(-SHOW).map((m) => `
      <li class="msg ${m.uid === myId ? "own" : ""}">
        ${m.team ? crest(m.team) : `<span class="crest" style="--c:#5f7fb5">?</span>`}
        <div class="msg-body">
          <div class="msg-meta"><b>${esc(m.nick)}</b>${m.team ? `<span>${esc(m.team.name)}</span>` : ""}<time>${ago(m.at)}</time>
            ${isOwner ? `<button class="msg-del" data-uid="${esc(m.uid)}" data-id="${esc(m.id)}" aria-label="Διαγραφή μηνύματος">✕</button>` : ""}</div>
          ${m.t ? `<p>${esc(m.t.slice(0, MAX_LEN))}</p>` : ""}
          ${validId(m.img) ? `<img class="msg-img" src="/_blob/${m.img}" alt="Φωτογραφία από ${esc(m.nick)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'msg-img-missing',textContent:'Η φωτογραφία δεν είναι διαθέσιμη'}))">` : ""}
        </div>
      </li>`).join("") || `<li class="msg-empty">Η κερκίδα είναι άδεια — γράψε το πρώτο μήνυμα!</li>`;
    if (nearBottom) feed.scrollTop = feed.scrollHeight;
    $("#chatCount").textContent = `${new Set(msgs.map((m) => m.uid)).size} στην κερκίδα`;
  }

  // Μίκρυνση σε JPEG ≤1280px· το canvas δεν κρατάει EXIF, άρα φεύγει και η τοποθεσία.
  async function shrink(file) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.82));
  }

  async function send(text) {
    const nick = $("#chatNick").value.trim().slice(0, 24);
    if (!nick) { $("#chatNick").focus(); setNote("Γράψε ένα ψευδώνυμο πρώτα."); return false; }
    if (Date.now() - lastSent < COOLDOWN_MS) { setNote("Λίγο πιο αργά — ένα μήνυμα κάθε 3 δευτερόλεπτα."); return false; }
    let img = null;
    if (photo) {
      $("#chatSendBtn").disabled = true; setNote("Ανέβασμα φωτογραφίας…");
      try { img = (await assets.upload(photo)).id; }
      catch (e) { setNote("Η φωτογραφία δεν ανέβηκε (" + (e?.code || "σφάλμα") + ")."); return false; }
      finally { $("#chatSendBtn").disabled = false; }
      clearPhoto();
    }
    const base = mine || docs[myId] || { msgs: [] };
    const msg = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: text.slice(0, MAX_LEN), at: new Date().toISOString(), ...(img ? { img } : {}) };
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
    canDeleteAssets = (await user.can("assets.write").catch(() => false)) === true;
    assets = await window.claude.use("assets").catch(() => null);
    $("#chatPhotoBtn").hidden = !assets; // μόνο όσοι μπορούν να ανεβάσουν
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
      if ((text || photo) && (await send(text))) inp.value = "";
    });
    $("#chatPhotoBtn").addEventListener("click", () => $("#chatFile").click());
    $("#chatFile").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      e.target.value = "";
      if (!f) return;
      if (!f.type.startsWith("image/")) { setNote("Μόνο φωτογραφίες."); return; }
      try { photo = await shrink(f); } catch { setNote("Δεν μπόρεσα να διαβάσω αυτή τη φωτογραφία."); return; }
      const prev = $("#chatPreview");
      prev.hidden = false;
      prev.querySelector("img").src = URL.createObjectURL(photo);
      setNote("");
    });
    $("#chatPreview").addEventListener("click", (e) => { if (e.target.closest("button")) clearPhoto(); });
    $("#chatFeed").addEventListener("click", (e) => { const im = e.target.closest(".msg-img"); if (im) im.classList.toggle("big"); });
    $("#chatFeed").addEventListener("click", async (e) => {
      const b = e.target.closest(".msg-del");
      if (!b || !isOwner) return;
      const v = docs[b.dataset.uid];
      if (!v) return;
      const gone = (v.msgs || []).find((m) => m.id === b.dataset.id);
      const next = { ...v, msgs: (v.msgs || []).filter((m) => m.id !== b.dataset.id) };
      if (gone && validId(gone.img) && assets && canDeleteAssets) assets.delete(gone.img).catch(() => {}); // σβήσε και τη φωτογραφία
      if (b.dataset.uid === myId) mine = next;
      try { await db.doc("chat/" + b.dataset.uid).set(next); } catch (err) { setNote("Η διαγραφή απέτυχε (" + (err?.code || "σφάλμα") + ")."); }
    });
  }
  function clearPhoto() {
    photo = null;
    const prev = $("#chatPreview");
    if (prev.querySelector("img").src) URL.revokeObjectURL(prev.querySelector("img").src);
    prev.querySelector("img").removeAttribute("src");
    prev.hidden = true;
  }
  function off() { $("#chatForm").hidden = true; $("#chatOff").hidden = false; render(); }

  boot();
})();
