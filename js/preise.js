/* =========================================================
   PREISLISTE – hier pflegt der Kunde alle Preise.
   Preise in Euro, inkl. MwSt. und Anfahrt innerhalb Berlins.
   null = Reparatur für dieses Modell nicht angeboten (wird ausgeblendet)
   ========================================================= */
window.PREISE = {
  // Reihenfolge = Reihenfolge der Karten im Preisrechner
  reparaturen: [
    { id: "display",   name: "Display",          info: "Glas + Touch + Anzeige, Premium-Qualität", dauer: 45 },
    { id: "akku",      name: "Akku",             info: "Neuer Akku mit voller Kapazität",           dauer: 30 },
    { id: "rueck",     name: "Rückglas",         info: "Gebrochene Rückseite ersetzen",             dauer: 60 },
    { id: "lade",      name: "Ladebuchse",       info: "Lädt nicht oder nur mit Wackeln",           dauer: 40 },
    { id: "kamera",    name: "Hauptkamera",      info: "Unscharf, schwarz oder wackelt",            dauer: 40 },
    { id: "kglas",     name: "Kameraglas",       info: "Nur die Linsenabdeckung ist gesprungen",    dauer: 25 },
    { id: "wasser",    name: "Wasserschaden",    info: "Reinigung & Diagnose, wird bei Reparatur verrechnet", dauer: 60 }
  ],

  // Rabatt ab 2 Reparaturen gleichzeitig (0.1 = 10 %)
  kombiRabatt: 0.10,
  // Aufpreis Express-Termin (Techniker innerhalb von 2 Stunden)
  express: 19,
  // Garantie in Monaten (wird auf der Seite angezeigt)
  garantie: 6,

  // Preise je Modell: [Display, Akku, Rückglas, Ladebuchse, Hauptkamera, Kameraglas, Wasserschaden]
  // Die Preise zwischen AUTO-PREISE-START und -ENDE kommen aus preiskalkulation/Preiskalkulation.xlsx
  // (Spalte „Empfohlener Verkaufspreis“) und werden mit  python3 preiskalkulation/preise_fuer_website.py
  // neu erzeugt. Handänderungen hier werden dabei überschrieben – besser in der Excel-Datei ändern.
  // Display = Premium-Qualität (iPhone: Soft-OLED, Samsung S: Original Service Pack, sonst Original).
  marken: {
    // AUTO-PREISE-START
    "Apple": {
      "iPhone 16 Pro Max": [319,  null, 109,  159,  179,  89,   49],
      "iPhone 16 Pro":     [259,  129,  109,  149,  169,  89,   49],
      "iPhone 16 Plus":    [229,  null, 119,  159,  169,  89,   49],
      "iPhone 16":         [219,  null, 109,  139,  149,  89,   49],
      "iPhone 16e":        [199,  null, 109,  null, null, null, 49],
      "iPhone 15 Pro Max": [229,  109,  109,  129,  129,  89,   49],
      "iPhone 15 Pro":     [229,  109,  109,  129,  129,  89,   49],
      "iPhone 15 Plus":    [189,  109,  109,  139,  119,  79,   49],
      "iPhone 15":         [189,  109,  99,   119,  119,  79,   49],
      "iPhone 14 Pro Max": [219,  109,  119,  119,  149,  79,   49],
      "iPhone 14 Pro":     [219,  109,  119,  119,  129,  79,   49],
      "iPhone 14 Plus":    [179,  109,  99,   119,  129,  79,   49],
      "iPhone 14":         [159,  99,   99,   109,  129,  79,   49],
      "iPhone 13 Pro Max": [179,  99,   119,  109,  149,  79,   49],
      "iPhone 13 Pro":     [159,  99,   119,  109,  149,  79,   49],
      "iPhone 13":         [149,  89,   119,  109,  109,  79,   49],
      "iPhone 13 mini":    [159,  89,   119,  109,  109,  79,   49],
      "iPhone 12 Pro Max": [169,  99,   119,  109,  139,  79,   49],
      "iPhone 12 Pro":     [159,  89,   119,  109,  159,  79,   49],
      "iPhone 12":         [159,  89,   119,  109,  109,  79,   49],
      "iPhone 12 mini":    [149,  89,   119,  109,  119,  79,   49],
      "iPhone 11 Pro Max": [169,  89,   119,  119,  119,  79,   49],
      "iPhone 11 Pro":     [149,  89,   119,  109,  119,  79,   49],
      "iPhone 11":         [119,  89,   119,  109,  99,   79,   49],
      "iPhone SE (2022)":  [99,   89,   null, 89,   79,   79,   49],
      "iPhone SE (2020)":  [99,   89,   119,  89,   79,   79,   49]
    },
    "Samsung": {
      "Galaxy S25 Ultra": [299,  null, 99,   119,  null, null, 49],
      "Galaxy S25+":      [259,  null, 99,   119,  null, null, 49],
      "Galaxy S25":       [229,  null, 99,   119,  null, null, 49],
      "Galaxy S24 Ultra": [299,  109,  99,   109,  null, null, 49],
      "Galaxy S24+":      [279,  109,  99,   109,  null, null, 49],
      "Galaxy S24":       [239,  109,  99,   109,  null, null, 49],
      "Galaxy S24 FE":    [189,  null, 99,   109,  null, null, 49],
      "Galaxy A56":       [169,  null, null, 99,   null, null, 49],
      "Galaxy A55":       [169,  99,   99,   99,   null, null, 49],
      "Galaxy A15":       [139,  89,   89,   89,   null, null, 49]
    },
    "Google": {
      "Pixel 9 Pro XL": [379,  null, null, null, null, 89,   49],
      "Pixel 9 Pro":    [269,  null, null, null, null, 89,   49],
      "Pixel 9":        [269,  null, null, null, null, 89,   49],
      "Pixel 9a":       [259,  null, null, null, null, 89,   49],
      "Pixel 8 Pro":    [349,  119,  null, 99,   null, 79,   49],
      "Pixel 8":        [249,  119,  null, 99,   null, 79,   49],
      "Pixel 8a":       [239,  119,  null, 99,   null, 79,   49]
    },
    "Xiaomi": {
      "Redmi Note 14 Pro 5G": [149,  null, null, null, null, null, 49],
      "Redmi Note 14 Pro 4G": [209,  null, null, null, null, null, 49],
      "Redmi Note 14 5G":     [149,  null, null, null, null, null, 49]
    }
    // AUTO-PREISE-ENDE
  }
};
