/*
 * UTH Football League 8x8 — ΔΕΔΟΜΕΝΑ ΤΟΥΡΝΟΥΑ
 * ------------------------------------------------------------
 * Αυτό είναι το μόνο αρχείο που χρειάζεται να αλλάζετε.
 * - Νέο αποτέλεσμα: βάλτε score και status: "played" στο αντίστοιχο ματς
 *   και τους σκόρερ στο goals. Η βαθμολογία και οι σκόρερ υπολογίζονται μόνα τους.
 * - Νέα είδηση: προσθέστε ένα αντικείμενο στην αρχή του news.
 *
 * ΠΡΟΣΟΧΗ: Οι ομάδες, οι παίκτες, τα αποτελέσματα και οι ειδήσεις
 * παρακάτω είναι ΕΝΔΕΙΚΤΙΚΑ (προσχέδιο) — αντικαταστήστε τα με τα πραγματικά.
 */

window.LEAGUE = {
  name: "UTH Football League 8x8",
  season: "2026",
  venue: "Olympico Sports Club",
  teams: [
    { id: "KEN", name: "Κένταυροι", short: "KEN", color: "#93cbff", captain: "Γ. Παπαδόπουλος", dept: "Τμήμα Μηχανικών Η/Υ" },
    { id: "ARG", name: "Αργοναύτες", short: "ARG", color: "#f5c542", captain: "Ν. Αθανασίου", dept: "Τμήμα Οικονομικών" },
    { id: "PIL", name: "Πήλιο United", short: "PIL", color: "#5ee0a0", captain: "Κ. Δημητρίου", dept: "Τμήμα Πολ. Μηχανικών" },
    { id: "PAG", name: "Παγασητικός", short: "PAG", color: "#4fd1ff", captain: "Α. Γεωργίου", dept: "Τμήμα ΤΕΦΑΑ" },
    { id: "IAS", name: "Ιάσων FC", short: "IAS", color: "#ff7a7a", captain: "Π. Νικολάου", dept: "Τμήμα Ιατρικής" },
    { id: "AIO", name: "Αιολικοί", short: "AIO", color: "#c69cff", captain: "Δ. Κωνσταντίνου", dept: "Τμήμα Μηχανολόγων" },
    { id: "ATL", name: "Atlético Βόλου", short: "ATL", color: "#ff9f43", captain: "Μ. Ιωάννου", dept: "Τμήμα Αρχιτεκτόνων" },
    { id: "ORF", name: "Ορφέας", short: "ORF", color: "#ffffff", captain: "Σ. Βασιλείου", dept: "Τμήμα Γεωπονίας" },
  ],

  // status: "played" | "upcoming" | "live"
  // goals: [ ["Ομάδα", "Παίκτης", λεπτό], ... ]
  matches: [
    // 1η αγωνιστική
    { round: 1, date: "2026-11-02T19:00", pitch: "Γήπεδο 1", home: "KEN", away: "ORF", score: [3, 1], status: "played",
      goals: [["KEN", "Λ. Σταύρου", 12], ["KEN", "Λ. Σταύρου", 30], ["ORF", "Ε. Μιχαήλ", 41], ["KEN", "Τ. Ρήγας", 48]] },
    { round: 1, date: "2026-11-02T20:00", pitch: "Γήπεδο 2", home: "ARG", away: "ATL", score: [2, 2], status: "played",
      goals: [["ARG", "Χ. Λάμπρου", 5], ["ATL", "Β. Ζαχαρίου", 22], ["ATL", "Β. Ζαχαρίου", 33], ["ARG", "Ι. Πέτρου", 49]] },
    { round: 1, date: "2026-11-03T19:00", pitch: "Γήπεδο 1", home: "PIL", away: "AIO", score: [4, 0], status: "played",
      goals: [["PIL", "Ο. Καρράς", 8], ["PIL", "Ο. Καρράς", 19], ["PIL", "Φ. Αλεξίου", 27], ["PIL", "Ο. Καρράς", 44]] },
    { round: 1, date: "2026-11-03T20:00", pitch: "Γήπεδο 2", home: "PAG", away: "IAS", score: [1, 2], status: "played",
      goals: [["IAS", "Ρ. Θεοδώρου", 15], ["PAG", "Α. Γεωργίου", 31], ["IAS", "Ρ. Θεοδώρου", 46]] },
    // 2η αγωνιστική
    { round: 2, date: "2026-11-09T19:00", pitch: "Γήπεδο 1", home: "KEN", away: "ARG", score: [2, 1], status: "played",
      goals: [["ARG", "Χ. Λάμπρου", 10], ["KEN", "Λ. Σταύρου", 26], ["KEN", "Λ. Σταύρου", 50]] },
    { round: 2, date: "2026-11-09T20:00", pitch: "Γήπεδο 2", home: "PIL", away: "PAG", score: [1, 1], status: "played",
      goals: [["PIL", "Ο. Καρράς", 18], ["PAG", "Ν. Σπύρου", 39]] },
    { round: 2, date: "2026-11-10T19:00", pitch: "Γήπεδο 1", home: "IAS", away: "ATL", score: [3, 0], status: "played",
      goals: [["IAS", "Ρ. Θεοδώρου", 7], ["IAS", "Κ. Μάρκου", 21], ["IAS", "Ρ. Θεοδώρου", 38]] },
    { round: 2, date: "2026-11-10T20:00", pitch: "Γήπεδο 2", home: "AIO", away: "ORF", score: [2, 3], status: "played",
      goals: [["AIO", "Γ. Τσιρίγος", 4], ["ORF", "Ε. Μιχαήλ", 17], ["ORF", "Ε. Μιχαήλ", 29], ["AIO", "Γ. Τσιρίγος", 35], ["ORF", "Ά. Ραφαήλ", 49]] },
    // 3η αγωνιστική
    { round: 3, date: "2026-11-16T19:00", pitch: "Γήπεδο 1", home: "KEN", away: "PIL", status: "upcoming" },
    { round: 3, date: "2026-11-16T20:00", pitch: "Γήπεδο 2", home: "IAS", away: "ARG", status: "upcoming" },
    { round: 3, date: "2026-11-17T19:00", pitch: "Γήπεδο 1", home: "ATL", away: "ORF", status: "upcoming" },
    { round: 3, date: "2026-11-17T20:00", pitch: "Γήπεδο 2", home: "PAG", away: "AIO", status: "upcoming" },
    // 4η αγωνιστική
    { round: 4, date: "2026-11-23T19:00", pitch: "Γήπεδο 1", home: "IAS", away: "KEN", status: "upcoming" },
    { round: 4, date: "2026-11-23T20:00", pitch: "Γήπεδο 2", home: "ARG", away: "PAG", status: "upcoming" },
    { round: 4, date: "2026-11-24T19:00", pitch: "Γήπεδο 1", home: "ORF", away: "PIL", status: "upcoming" },
    { round: 4, date: "2026-11-24T20:00", pitch: "Γήπεδο 2", home: "AIO", away: "ATL", status: "upcoming" },
  ],

  news: [
    { date: "2026-11-14", tag: "Ανάλυση", title: "Ο Σταύρου «πετάει»: 4 γκολ σε 2 ματς για τους Κένταυρους",
      body: "Ο φορ των Κενταύρων είναι ο πρώτος σκόρερ του τουρνουά μετά από δύο αγωνιστικές και η ομάδα του βρίσκεται στο 6/6. Τη Δευτέρα όμως έρχεται το πρώτο μεγάλο τεστ απέναντι στο αήττητο Πήλιο United." },
    { date: "2026-11-11", tag: "Αποτελέσματα", title: "2η αγωνιστική: Επίδειξη δύναμης από τον Ιάσων FC",
      body: "Καθαρό 3-0 επί της Atlético Βόλου και ο Ιάσων ισοβαθμεί στην κορυφή. Θρίλερ στο Αιολικοί–Ορφέας με το νικητήριο γκολ στο 49′." },
    { date: "2026-11-08", tag: "Ανακοίνωση", title: "Αλλαγή ώρας στα ματς της Δευτέρας",
      body: "Από την 3η αγωνιστική τα ματς ξεκινούν 19:00 και 20:00. Οι ομάδες παρακαλούνται να βρίσκονται στο γήπεδο 20′ νωρίτερα." },
    { date: "2026-11-04", tag: "Αποτελέσματα", title: "Η αυλαία άνοιξε στο Olympico: 15 γκολ στην πρεμιέρα",
      body: "Χατ-τρικ του Καρρά για το Πήλιο, μεγάλη ανατροπή του Ιάσονα στο φινάλε και ισοπαλία-θέαμα στο Αργοναύτες–Atlético." },
  ],
};
