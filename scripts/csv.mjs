// Minimaler, aber robuster CSV-Parser (RFC4180-artig): kommt mit
// Anführungszeichen, eingebetteten Kommas/Zeilenumbrüchen und "" als
// escapetem Anführungszeichen klar. Bewusst ohne externe Abhängigkeit.

export function parseCSV(text, delimiter = ",") {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // ignorieren, \n übernimmt den Zeilenumbruch
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

// Wandelt geparste Zeilen (erste Zeile = Header) in ein Array von Objekten um.
export function rowsToObjects(rows) {
  const [header, ...dataRows] = rows;
  return dataRows.map((r) => {
    const obj = {};
    header.forEach((key, idx) => {
      obj[key.trim()] = r[idx] ?? "";
    });
    return obj;
  });
}
