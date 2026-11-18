/*
 * UTH Football League 8x8 — ΔΕΔΟΜΕΝΑ ΤΟΥΡΝΟΥΑ
 * ------------------------------------------------------------
 * Αυτό είναι το μόνο αρχείο που χρειάζεται να αλλάζετε.
 * - Νέο αποτέλεσμα: στο αντίστοιχο ματς βάλτε score: [γκολ γηπεδούχου, γκολ φιλοξενούμενου],
 *   status: "played" και τους σκόρερ στο goals: [["A1", "Όνομα παίκτη", λεπτό], ...].
 *   Βαθμολογίες ομίλων, φόρμα και σκόρερ υπολογίζονται μόνα τους.
 * - Όνομα για την Α1: αλλάξτε το name της ομάδας "A1".
 * - Παίκτες: στο players κάθε ομάδας: ["Όνομα", νούμερο, "GK"|"DF"|"MF"|"FW", [ΤΑΧ, ΣΟΥ, ΠΑΣ, ΝΤΡ, ΑΜΥ, ΣΩΜ]].
 *   Το rating βγαίνει αυτόματα.
 * - Νέα είδηση: προσθέστε ένα αντικείμενο στην αρχή του news:
 *   { date: "2026-11-24", tag: "Ανακοίνωση", title: "...", body: "..." }
 */

window.LEAGUE = {
  name: "UTH Football League 8x8",
  season: "2026",
  venue: "Olympico Sports Club",

  groups: { A: "Όμιλος Α", B: "Όμιλος Β" },

  teams: [
    { id: "A1", group: "A", name: "Ομάδα Α1", short: "Α1", color: "#93cbff", players: [] }, // χωρίς όνομα ακόμα
    { id: "A2", group: "A", name: "ΑΤΑΛΑΝΤΟΙ", short: "ΑΤΑ", color: "#f5c542", players: [] },
    { id: "A3", group: "A", name: "ΧΟΡΤΟ ΡΙΚΟ", short: "ΧΡΚ", color: "#5ee0a0", players: [] },
    { id: "A4", group: "A", name: "ΔΟΞΑ ΜΗΧΑΝΙΚΩΝ", short: "ΔΟΞ", color: "#ff7a7a", players: [] },
    { id: "A5", group: "A", name: "ΠΑΕ ΓΛΑΡΟΙ", short: "ΓΛΑ", color: "#ffffff", players: [] },
    { id: "B1", group: "B", name: "COCA JUNIORS", short: "COC", color: "#ff9f43", players: [] },
    { id: "B2", group: "B", name: "ΜΠΙΚΙΝΙ ΜΠΟΤΟΜ", short: "ΜΠΚ", color: "#f472b6", players: [] },
    { id: "B3", group: "B", name: "ΑΣΣΟ ΗΜΙΧΡΟΝΟ", short: "ΑΣΣ", color: "#c69cff", players: [] },
    { id: "B4", group: "B", name: "ΕΓΩ ΕΣΕΝΑ", short: "ΕΓΩ", color: "#4fd1ff", players: [] },
    { id: "B5", group: "B", name: "SELECCION FC", short: "SEL", color: "#a3e635", players: [] },
  ],

  // round = αγωνιστική (εβδομάδα) · status: "upcoming" | "played"
  matches: [
    // 1η αγωνιστική · 23–29 Νοεμβρίου
    { round: 1, date: "2026-11-24T19:30", home: "A1", away: "A2", status: "upcoming" },
    { round: 1, date: "2026-11-24T21:00", home: "B1", away: "B2", status: "upcoming" },
    { round: 1, date: "2026-11-26T21:00", home: "A3", away: "A4", status: "upcoming" },
    { round: 1, date: "2026-11-27T21:00", home: "B3", away: "B4", status: "upcoming" },
    // 2η αγωνιστική · 30 Νοεμβρίου – 6 Δεκεμβρίου
    { round: 2, date: "2026-12-01T19:30", home: "A1", away: "A3", status: "upcoming" },
    { round: 2, date: "2026-12-01T21:00", home: "B1", away: "B3", status: "upcoming" },
    { round: 2, date: "2026-12-03T21:00", home: "A2", away: "A5", status: "upcoming" },
    { round: 2, date: "2026-12-04T21:00", home: "B2", away: "B5", status: "upcoming" },
    // 3η αγωνιστική · 7–13 Δεκεμβρίου
    { round: 3, date: "2026-12-08T19:30", home: "A1", away: "A4", status: "upcoming" },
    { round: 3, date: "2026-12-08T21:00", home: "B1", away: "B4", status: "upcoming" },
    { round: 3, date: "2026-12-10T21:00", home: "A3", away: "A5", status: "upcoming" },
    { round: 3, date: "2026-12-11T21:00", home: "B3", away: "B5", status: "upcoming" },
    // 4η αγωνιστική · 14–20 Δεκεμβρίου
    { round: 4, date: "2026-12-15T19:30", home: "A1", away: "A5", status: "upcoming" },
    { round: 4, date: "2026-12-15T21:00", home: "B1", away: "B5", status: "upcoming" },
    { round: 4, date: "2026-12-17T21:00", home: "A2", away: "A4", status: "upcoming" },
    { round: 4, date: "2026-12-18T21:00", home: "B2", away: "B4", status: "upcoming" },
    // 5η αγωνιστική · 11–17 Ιανουαρίου 2027
    { round: 5, date: "2027-01-12T19:30", home: "A2", away: "A3", status: "upcoming" },
    { round: 5, date: "2027-01-12T21:00", home: "B2", away: "B3", status: "upcoming" },
    { round: 5, date: "2027-01-14T21:00", home: "A4", away: "A5", status: "upcoming" },
    { round: 5, date: "2027-01-15T21:00", home: "B4", away: "B5", status: "upcoming" },
  ],

  news: [],
};
