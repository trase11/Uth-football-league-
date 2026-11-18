/*
 * RATING ΑΠΟ ΤΗΝ ΚΕΡΚΙΔΑ
 * Κάθε χρήστης δίνει σε κάθε παίκτη έναν αριθμό 1–999 και (προαιρετικά) έναν τίτλο έως 16 χαρακτήρες.
 * Αποθήκευση: ratings/<userId> = { r: { "<ομάδα>|<όνομα>": { n, t } } } — ο καθένας γράφει μόνο το δικό του.
 * Η κάρτα δείχνει τον μέσο όρο και τον πιο ψηφισμένο τίτλο. Ο διοργανωτής κρύβει τίτλους μέσω mod/titles.
 * Λειτουργεί μόνο με την κοινή βάση (μέσα στο Claude artifact).
 */
(() => {
  const MAX_TITLE = 16;
  let db = null, myId = null, isOwner = false, canWrite = true;
  let all = {};          // userId -> { r: {...} }
  let hidden = [];       // τίτλοι (πεζά) που έκρυψε ο διοργανωτής
  let mine = null;
  let saving = Promise.resolve();

  const norm = (t) => String(t || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("el");
  const changed = () => document.dispatchEvent(new Event("uth:ratings"));

  function get(key) {
    const nums = [], titles = {};
    for (const v of Object.values(all)) {
      const x = v?.r?.[key];
      if (!x || !Number.isInteger(x.n) || x.n < 1 || x.n > 999) continue;
      nums.push(x.n);
      const t = String(x.t || "").trim().slice(0, MAX_TITLE);
      if (t && !hidden.includes(norm(t))) (titles[norm(t)] ||= { t, c: 0 }).c++;
    }
    const top = Object.values(titles).sort((a, b) => b.c - a.c);
    const my = all[myId]?.r?.[key];
    return {
      avg: nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0,
      votes: nums.length,
      titles: top.slice(0, 4),       // [{t, c}]
      title: top[0]?.t || "",
      mine: my && Number.isInteger(my.n) ? { n: my.n, t: String(my.t || "") } : null,
    };
  }

  async function vote(key, n, t) {
    if (!db) return { error: "Η βαθμολογία λειτουργεί στην κοινή έκδοση του site." };
    if (!canWrite) return { error: "Δεν έχεις δικαίωμα να ψηφίσεις σε αυτή τη σελίδα." };
    n = Math.round(Number(n));
    if (!Number.isInteger(n) || n < 1 || n > 999) return { error: "Βάλε αριθμό από 1 έως 999." };
    t = String(t || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, MAX_TITLE);
    mine = { r: { ...(mine?.r || all[myId]?.r || {}), [key]: { n, t } } };
    all[myId] = mine;
    changed();
    const doc = JSON.parse(JSON.stringify(mine));
    saving = saving.then(() => db.doc("ratings/" + myId).set(doc)).catch((e) => {
      if (["permission_denied", "invalid_argument", "not_granted"].includes(e?.code)) canWrite = false;
      changed();
    });
    return {};
  }

  async function hideTitle(t) {
    if (!isOwner || !db) return;
    hidden = [...new Set([...hidden, norm(t)])];
    changed();
    await db.doc("mod/titles").set({ hidden }).catch(() => {});
  }

  window.UTH_RATINGS = {
    get, vote, hideTitle,
    get ready() { return !!db; },
    get isOwner() { return isOwner; },
    get canWrite() { return canWrite; },
  };

  (async () => {
    if (!window.claude?.use) return;
    const [d, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]).catch(() => []);
    if (!d || !user) return;
    myId = await user.id();
    if (!myId) return;
    db = d;
    isOwner = await user.isOwner();
    canWrite = (await user.can("data.write").catch(() => null)) !== false;
    db.collection("ratings").onSnapshot((snap) => {
      const next = {};
      for (const x of snap.docs) if (x.exists) next[x.id] = x.data();
      if (mine) next[myId] = mine; // οι δικές μου ψήφοι, ακόμα κι αν δεν έχουν φτάσει
      all = next;
      changed();
    }, () => {});
    db.doc("mod/titles").onSnapshot((s) => {
      const h = s.exists ? s.data().hidden : null;
      hidden = Array.isArray(h) ? h.map(norm) : [];
      changed();
    }, () => {});
    changed();
  })();
})();
