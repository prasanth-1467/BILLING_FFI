const themes = {
  indigo: {
    name: "Classic Indigo",
    primary: "#1e1b4b",          // Dark primary text & main headings
    accent: "#64748b",           // Border lines & secondary accents
    tableHeaderBg: "#f1f5f9",    // Background fill for tables and info panels
    tableHeaderText: "#1e293b",  // Text inside the table headers (high contrast)
    secondaryText: "#475569"     // Text for secondary captions & metadata
  },
  emerald: {
    name: "Forest Emerald",
    primary: "#064e3b",
    accent: "#14b8a6",
    tableHeaderBg: "#f0fdf4",
    tableHeaderText: "#064e3b",
    secondaryText: "#0f766e"
  },
  crimson: {
    name: "Warm Crimson",
    primary: "#991b1b",
    accent: "#f43f5e",
    tableHeaderBg: "#fff1f2",
    tableHeaderText: "#991b1b",
    secondaryText: "#be123c"
  },
  charcoal: {
    name: "Sleek Charcoal",
    primary: "#09090b",
    accent: "#71717a",
    tableHeaderBg: "#f4f4f5",
    tableHeaderText: "#18181b",
    secondaryText: "#52525b"
  }
};

function hexToRgb(hex) {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function getLuminance(rgb) {
  const a = [rgb.r, rgb.g, rgb.b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hexToRgb(hex1));
  const lum2 = getLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const white = "#ffffff";

console.log("=== WCAG CONTRAST RATIO AUDIT ===");
for (const [key, theme] of Object.entries(themes)) {
  console.log(`\nTheme: ${theme.name} (${key})`);
  
  // 1. Primary Text against white
  const primaryOnWhite = getContrastRatio(theme.primary, white);
  console.log(`- Primary Text (${theme.primary}) on White (${white}): ${primaryOnWhite.toFixed(2)}:1 [${primaryOnWhite >= 7.0 ? 'AAA Pass' : (primaryOnWhite >= 4.5 ? 'AA Pass' : 'Fail')}]`);

  // 2. Secondary Text against white
  const secondaryOnWhite = getContrastRatio(theme.secondaryText, white);
  console.log(`- Secondary Text (${theme.secondaryText}) on White (${white}): ${secondaryOnWhite.toFixed(2)}:1 [${secondaryOnWhite >= 7.0 ? 'AAA Pass' : (secondaryOnWhite >= 4.5 ? 'AA Pass' : 'Fail')}]`);

  // 3. Table Header Text against Table Header Background
  const tableHeaderContrast = getContrastRatio(theme.tableHeaderText, theme.tableHeaderBg);
  console.log(`- Table Header Text (${theme.tableHeaderText}) on Background (${theme.tableHeaderBg}): ${tableHeaderContrast.toFixed(2)}:1 [${tableHeaderContrast >= 7.0 ? 'AAA Pass' : (tableHeaderContrast >= 4.5 ? 'AA Pass' : 'Fail')}]`);

  // 4. Secondary Text against Table Header Background
  const secondaryOnHeaderBg = getContrastRatio(theme.secondaryText, theme.tableHeaderBg);
  console.log(`- Secondary Text (${theme.secondaryText}) on Card/Header Bg (${theme.tableHeaderBg}): ${secondaryOnHeaderBg.toFixed(2)}:1 [${secondaryOnHeaderBg >= 7.0 ? 'AAA Pass' : (secondaryOnHeaderBg >= 4.5 ? 'AA Pass' : 'Fail')}]`);
}
