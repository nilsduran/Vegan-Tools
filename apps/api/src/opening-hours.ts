/**
 * Standard Multi-language OSM / Geoapify opening_hours parser.
 * Handles common opening hours patterns like:
 * - "Mo-Su 12:00-16:00, 20:00-23:30"
 * - "Tu-Sa 13:00-23:00; Su 13:00-17:00"
 * - "Mo-Fr 08:00-20:00; Sa 09:00-14:00; PH off"
 * - "24/7", "Daily 12:00-23:00", "Everyday 13:00-23:00"
 * - Catalan & Spanish: "Dl-Dv 13:00-16:00, 20:00-23:30", "Lun-Dom 12:00-24:00"
 * - AM/PM: "11:30 AM - 10:30 PM", "12pm - 11pm"
 * - Overnight shifts like "Fr-Sa 20:00-02:00"
 */

const DAY_MAP: Record<string, number> = {
  // English
  su: 0, sun: 0, sunday: 0,
  mo: 1, mon: 1, monday: 1,
  tu: 2, tue: 2, tues: 2, tuesday: 2,
  we: 3, wed: 3, wednesday: 3,
  th: 4, thu: 4, thur: 4, thurs: 4, thursday: 4,
  fr: 5, fri: 5, friday: 5,
  sa: 6, sat: 6, saturday: 6,

  // Catalan
  dg: 0, diumenge: 0,
  dl: 1, dilluns: 1,
  dt: 2, dimarts: 2,
  dc: 3, dimecres: 3,
  dj: 4, dijous: 4,
  dv: 5, divendres: 5,
  ds: 6, dissabte: 6,

  // Spanish
  dom: 0, domingo: 0,
  lun: 1, lunes: 1,
  mar: 2, martes: 2,
  mie: 3, miercoles: 3, miércoles: 3,
  jue: 4, jueves: 4,
  vie: 5, viernes: 5,
  sab: 6, sabado: 6, sábado: 6,
};

function parseTimeToMinutes(timeStr: string): number | undefined {
  const clean = timeStr.trim().toLowerCase();
  
  // Check 12-hour AM/PM format: e.g. "11:30 am", "11pm", "1:00pm"
  const ampmMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampmMatch) {
    let hours = Number(ampmMatch[1]);
    const minutes = Number(ampmMatch[2] ?? 0);
    const meridiem = ampmMatch[3]?.toLowerCase();
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return undefined;
    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Check 24-hour format: e.g. "13:30", "08:00", "24:00"
  const match = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) return undefined;
  return hours * 60 + minutes;
}

function resolveDayKey(token: string): number | undefined {
  const norm = token
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  if (norm in DAY_MAP) return DAY_MAP[norm];
  if (norm.length >= 2) {
    const prefix2 = norm.slice(0, 2);
    if (prefix2 in DAY_MAP) return DAY_MAP[prefix2];
  }
  return undefined;
}

function parseDaysRange(daysPart: string): Set<number> {
  const days = new Set<number>();
  const clean = daysPart
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

  if (
    !clean ||
    clean === "daily" ||
    clean === "everyday" ||
    clean === "all days" ||
    clean === "tots els dies" ||
    clean === "todos los dias" ||
    clean === "tots"
  ) {
    return new Set([0, 1, 2, 3, 4, 5, 6]);
  }

  if (clean === "weekdays" || clean === "feiners" || clean === "laborables") {
    return new Set([1, 2, 3, 4, 5]);
  }

  if (clean === "weekend" || clean === "cap de setmana" || clean === "fin de semana") {
    return new Set([0, 6]);
  }

  const parts = clean.split(",").map((p) => p.trim());

  for (const part of parts) {
    const rangeSplit = part.split(/[-–—]|(?:\s+to\s+)|\s+a\s+/i).map((d) => d.trim());
    if (rangeSplit.length === 2) {
      const startIdx = resolveDayKey(rangeSplit[0] ?? "");
      const endIdx = resolveDayKey(rangeSplit[1] ?? "");
      if (startIdx !== undefined && endIdx !== undefined) {
        let curr = startIdx;
        while (true) {
          days.add(curr);
          if (curr === endIdx) break;
          curr = (curr + 1) % 7;
        }
      }
    } else {
      const idx = resolveDayKey(part);
      if (idx !== undefined) {
        days.add(idx);
      }
    }
  }

  return days;
}

export function evaluateOpeningHours(
  openingHoursStr?: string,
  currentDate: Date = new Date(),
): boolean | undefined {
  if (!openingHoursStr) return undefined;

  const raw = openingHoursStr.trim();
  if (!raw) return undefined;
  if (raw === "24/7" || raw.toLowerCase() === "open") return true;
  if (raw.toLowerCase() === "off" || raw.toLowerCase() === "closed") return false;

  const currentDay = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ...
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  const previousDay = (currentDay + 6) % 7;

  // Split multiple clauses by semicolon or newline
  const clauses = raw.split(/[;\n]/).map((c) => c.trim()).filter(Boolean);

  let evaluatedForCurrentDay = false;
  let isOpen = false;

  for (const clause of clauses) {
    // Check if clause is "off" for certain days
    const isOffClause = /\boff\b|\bclosed\b|\btancat\b|\bcerrado\b/i.test(clause);

    // Find the split point between days description and time intervals.
    // The time intervals start at the first digit (or off/closed/tancat/cerrado)
    let firstDigitIndex = clause.search(/\d/);
    if (firstDigitIndex === -1 && isOffClause) {
      firstDigitIndex = clause.search(/\b(off|closed|tancat|cerrado)\b/i);
    }

    let daysPart = "";
    let timesPart = clause;

    if (firstDigitIndex > 0) {
      daysPart = clause.slice(0, firstDigitIndex).trim();
      timesPart = clause.slice(firstDigitIndex).trim();
    }

    const activeDays = parseDaysRange(daysPart);

    if (isOffClause) {
      if (activeDays.has(currentDay)) {
        evaluatedForCurrentDay = true;
        return false;
      }
      continue;
    }

    // Check time intervals
    const timeIntervals = timesPart.split(",").map((t) => t.trim());
    for (const interval of timeIntervals) {
      const timeSplit = interval.split(/[-–—]|(?:\s+to\s+)|\s+a\s+/i).map((t) => t.trim());
      if (timeSplit.length !== 2) continue;

      const startMin = parseTimeToMinutes(timeSplit[0]!);
      const endMin = parseTimeToMinutes(timeSplit[1]!);

      if (startMin === undefined || endMin === undefined) continue;

      if (endMin > startMin) {
        // Standard same-day interval (e.g. 10:00-14:00)
        if (activeDays.has(currentDay)) {
          evaluatedForCurrentDay = true;
          if (currentMinutes >= startMin && currentMinutes <= endMin) {
            isOpen = true;
          }
        }
      } else {
        // Overnight interval (e.g. 20:00-02:00)
        if (activeDays.has(currentDay)) {
          evaluatedForCurrentDay = true;
          if (currentMinutes >= startMin) {
            isOpen = true;
          }
        }
        if (activeDays.has(previousDay)) {
          evaluatedForCurrentDay = true;
          if (currentMinutes <= endMin) {
            isOpen = true;
          }
        }
      }
    }
  }

  return evaluatedForCurrentDay ? isOpen : undefined;
}
