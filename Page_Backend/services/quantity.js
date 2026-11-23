// Parsing, conversion and formatting of recipe quantities ("1 1/2 tsp",
// "300 g", "2 medium", "1/2 tsp, or to taste"). Mass is normalised to grams,
// volume to millilitres, everything else is a count of the named unit.

const UNICODE_FRACTIONS = {
  '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4,
  '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8, '⅕': 1 / 5,
};

export const UNIT_TABLE = {
  g: ['mass', 1], gm: ['mass', 1], gms: ['mass', 1], gram: ['mass', 1], grams: ['mass', 1],
  kg: ['mass', 1000], kgs: ['mass', 1000], kilogram: ['mass', 1000], kilograms: ['mass', 1000],
  mg: ['mass', 0.001], oz: ['mass', 28.35], ounce: ['mass', 28.35], ounces: ['mass', 28.35],
  lb: ['mass', 453.6], lbs: ['mass', 453.6], pound: ['mass', 453.6], pounds: ['mass', 453.6],
  ml: ['volume', 1], milliliter: ['volume', 1], milliliters: ['volume', 1], millilitre: ['volume', 1], millilitres: ['volume', 1],
  l: ['volume', 1000], liter: ['volume', 1000], liters: ['volume', 1000], litre: ['volume', 1000], litres: ['volume', 1000],
  tsp: ['volume', 4.93], teaspoon: ['volume', 4.93], teaspoons: ['volume', 4.93],
  tbsp: ['volume', 14.79], tbs: ['volume', 14.79], tablespoon: ['volume', 14.79], tablespoons: ['volume', 14.79],
  cup: ['volume', 240], cups: ['volume', 240],
  pinch: ['volume', 0.31], pinches: ['volume', 0.31], dash: ['volume', 0.62], dashes: ['volume', 0.62],
};

// Count units: the number counts these things.
const COUNT_UNITS = new Set([
  'small', 'medium', 'large', 'clove', 'cloves', 'piece', 'pieces', 'stalk', 'stalks', 'sprig', 'sprigs',
  'leaf', 'leaves', 'pod', 'pods', 'stick', 'sticks', 'slice', 'slices', 'can', 'cans', 'bunch', 'bunches',
  'whole', 'inch', 'inches', 'cm', 'head', 'heads', 'fillet', 'fillets', 'breast', 'breasts', 'thigh', 'thighs',
  'strand', 'strands', 'block', 'blocks', 'packet', 'packets',
]);

const NUMBER_SOURCE = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d*[½⅓⅔¼¾⅛⅜⅝⅞⅕]|\d+(?:\.\d+)?)`;
const RANGE_SOURCE = String.raw`${NUMBER_SOURCE}(?:\s*(?:-|–|to)\s*${NUMBER_SOURCE})?`;

const parseSingleNumber = (raw) => {
  const s = raw.trim();
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  m = s.match(/^(\d*)([½⅓⅔¼¾⅛⅜⅝⅞⅕])$/);
  if (m) return (m[1] ? Number(m[1]) : 0) + UNICODE_FRACTIONS[m[2]];
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Parses "1 1/2", "1/2", "½", "1-2" (average of a range). */
export const parseAmount = (raw) => {
  const parts = String(raw).split(/\s*(?:-|–|\bto\b)\s*/).filter(Boolean);
  const values = parts.map(parseSingleNumber).filter((v) => v !== null);
  if (!values.length) return null;
  return values.length === 1 ? values[0] : (values[0] + values[values.length - 1]) / 2;
};

const LEADING_QTY = new RegExp(String.raw`^\s*(${RANGE_SOURCE})\s*([a-zA-Z]+\.?(?:\s+oz)?)?`);

/**
 * Parses an ingredient quantity string.
 * Returns { value, unit, type: 'mass'|'volume'|'count'|'taste'|'unknown', base }
 * where base is grams (mass), millilitres (volume) or the count.
 */
export const parseQuantity = (input) => {
  const str = String(input || '').trim().toLowerCase();
  if (!str) return { type: 'unknown', value: null, unit: '', base: null };
  const m = str.match(LEADING_QTY);
  if (!m) {
    if (/\bto taste\b|\bas needed\b|\bfor (garnish|serving)\b|\bpinch\b/.test(str)) {
      return { type: /\bpinch\b/.test(str) ? 'volume' : 'taste', value: /\bpinch\b/.test(str) ? 1 : null, unit: /\bpinch\b/.test(str) ? 'pinch' : '', base: /\bpinch\b/.test(str) ? 0.31 : null };
    }
    return { type: 'unknown', value: null, unit: '', base: null };
  }
  const value = parseAmount(m[1]);
  let unit = (m[2] || '').replace(/\.$/, '');
  if (unit === 'fl oz' || /^fl\s+oz$/.test(unit)) return { type: 'volume', value, unit: 'fl oz', base: value * 29.57 };
  if (UNIT_TABLE[unit]) {
    const [type, factor] = UNIT_TABLE[unit];
    return { type, value, unit, base: value * factor };
  }
  if (COUNT_UNITS.has(unit)) return { type: 'count', value, unit: singular(unit), base: value };
  // "2 onions" — the word after the number is the item itself.
  return { type: 'count', value, unit: '', base: value };
};

export const singular = (word) =>
  word === 'leaves' ? 'leaf'
    : word === 'inches' ? 'inch'
      : word.replace(/(ches|shes|sses)$/, (s) => s.slice(0, -2)).replace(/([^s])s$/, '$1');

/** True when two parsed quantities can be compared/added. */
export const comparable = (a, b) =>
  a && b && a.base != null && b.base != null && a.type === b.type &&
  (a.type !== 'count' || !a.unit || !b.unit || a.unit === b.unit);

const FRACTIONS = [[0, ''], [0.125, '1/8'], [0.25, '1/4'], [1 / 3, '1/3'], [0.375, '3/8'], [0.5, '1/2'], [0.625, '5/8'], [2 / 3, '2/3'], [0.75, '3/4'], [0.875, '7/8'], [1, '']];

const formatFraction = (value) => {
  let whole = Math.floor(value + 1e-9);
  const rest = value - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f;
  if (best[0] === 1) {
    whole += 1;
    best = FRACTIONS[0];
  }
  if (!whole && !best[1]) return String(Math.round(value * 100) / 100);
  return [whole || '', best[1]].filter(Boolean).join(' ');
};

/** Formats a base amount back into the given unit ("1 1/2 tsp", "350 g"). */
export const formatQuantity = (base, type, unit) => {
  if (type === 'mass') {
    const factor = UNIT_TABLE[unit]?.[1] || 1;
    const v = base / factor;
    return `${factor === 1 ? roundNice(v) : formatFraction(v)} ${unit || 'g'}`;
  }
  if (type === 'volume') {
    const factor = UNIT_TABLE[unit]?.[1] || 1;
    const v = base / factor;
    return `${factor === 1 || factor === 1000 ? roundNice(v) : formatFraction(v)} ${unit || 'ml'}`;
  }
  return `${formatFraction(base)}${unit ? ` ${unit}` : ''}`;
};

const roundNice = (v) => (v >= 50 ? Math.round(v / 5) * 5 : v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);

// ---------- quantities mentioned inside instruction text ----------

const TEXT_UNITS = String.raw`g|grams?|gms?|kg|mg|ml|milli(?:lit(?:er|re))s?|l|lit(?:er|re)s?|tsp|teaspoons?|tbsp|tablespoons?|cups?|oz|ounces?|lbs?|pounds?|pinch(?:es)?|dash(?:es)?|cloves?|pieces?|stalks?|sprigs?|leaves|leaf|pods?|sticks?|slices?|cans?|small|medium|large|inch(?:es)?|cm|blocks?`;
const NOT_INGREDIENT_WORD = /^(min|mins|minute|minutes|hour|hours|hr|hrs|second|seconds|secs?|times?|degrees?|percent|servings?|portions?|people|days?|weeks?|batches|cubes?|chunks?|thick|long|wide|apart|deep|high|x|more|less|step|steps|at|°|wells?|holes?|hollows?|indentations?|dents?|balls?|patties|rounds?|strips?|layers?|parts?|equal|sides?|bowls?|plates?|skewers?|parcels?|rolls?)$/;
const STOP = String.raw`(?=\s*[,;.():–]|\s+(?:and|or|until|for|into|with|over|in|on|then|while|from|as|so|before|after|at|onto|if|per|each|to the|to a|to taste)\b|$)`;
const MENTION_RE = new RegExp(
  String.raw`(?<![\w/.\-])(${RANGE_SOURCE})\s*(?:(${TEXT_UNITS})\b\.?\s*)?(?:of\s+)?(?:the\s+)?(?:reserved\s+|remaining\s+|extra\s+)?([a-z][a-z'\- ]*?)${STOP}`,
  'gi'
);

/**
 * Finds "<amount> <unit> <ingredient words>" mentions in an instruction.
 * Returns [{ amountText, unit, phrase, qty }].
 */
export const findQuantityMentions = (text) => {
  const out = [];
  // Model output often uses non-breaking/Unicode hyphens ("low‑sodium").
  const src = String(text || '')
    .replace(/[‐‑‒−]/g, '-')
    // "a pinch (about 1/8 tsp) salt" -> "a pinch 1/8 tsp salt": the bracket
    // holds the amount of the ingredient that follows it.
    .replace(/\(\s*(?:about|approx(?:imately)?\.?|roughly|~|≈)?\s*(\d[^()]*?)\)(?=\s*[a-z])/gi, ' $1 ')
    // "1 medium bell pepper (150 g), sliced": the bracket restates the same
    // amount in other units, so it must not be counted a second time.
    .replace(/\(\s*(?:about|approx(?:imately)?\.?|roughly|~|≈)?\s*\d[^()]*?\)/gi, ' ')
    .replace(/\s+/g, ' ');
  for (const m of src.matchAll(MENTION_RE)) {
    const unit = (m[2] || '').toLowerCase();
    const phrase = (m[3] || '').toLowerCase().trim();
    const firstWord = phrase.split(/\s+/)[0] || '';
    if (!phrase || NOT_INGREDIENT_WORD.test(firstWord) || NOT_INGREDIENT_WORD.test(unit)) continue;
    // "400 g into the skillet", "2 g and set aside": the words after the amount
    // aren't an ingredient name (it was named earlier in the sentence).
    if (/^(and|or|until|for|into|in|on|onto|with|over|then|while|from|as|so|before|after|at|if|per|each|to|let|of|is|are|was|plus)$/.test(firstWord)) continue;
    // The "ingredient" can't itself be a unit ("1/8 tsp)" read as 1/8 of "tsp").
    if (!unit && (UNIT_TABLE[firstWord] || COUNT_UNITS.has(firstWord)) && phrase.split(/\s+/).length === 1) continue;
    // "2 cm cubes", "1 inch pieces" are sizes, not amounts.
    if ((unit === 'cm' || unit.startsWith('inch')) && /^(cubes?|pieces?|chunks?|dice|thick|long|strips?|slices?|lengths?|rounds?)\b/.test(phrase)) continue;
    const before = src.slice(Math.max(0, m.index - 12), m.index).toLowerCase();
    if (/(every|step|at|°|gas mark)\s*$/.test(before)) continue;
    const qty = parseQuantity(`${m[1]} ${unit}`.trim());
    if (qty.base == null) continue;
    out.push({ amountText: `${m[1]}${unit ? ` ${unit}` : ''}`, unit, phrase, qty, remaining: /remaining|rest of/.test(m[0].toLowerCase()) });
  }
  return out;
};

// ---------- durations mentioned inside instruction text ----------

const DURATION_RE = /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(min(?:ute)?s?|hrs?|hours?)\b/gi;
export const PASSIVE_RE = /\b(marinat\w*|rest\w*|soak\w*|press\w*|chill\w*|refrigerat\w*|set aside|let (?:it |them |the \w+ )?(?:stand|sit|cool|rest|drain)|cool\w*|drain\w*|proof\w*|rise|freez\w*|steep\w*|hang\w*|sit)\b/i;

/**
 * Sums durations stated in an instruction, split into active and passive
 * (marinating, pressing, soaking, resting...) minutes.
 */
export const durationsIn = (text) => {
  let active = 0;
  let passive = 0;
  const passiveKinds = [];
  // Classify each clause on its own: "Cook 5 minutes, then let rest 10 minutes".
  for (const clause of String(text || '').split(/[;.]|,\s*(?:then|and then)\b|\bthen\b/i)) {
    for (const m of clause.matchAll(DURATION_RE)) {
      const before = clause.slice(0, m.index).toLowerCase();
      if (/\b(every|after|within|up to|last)\s*$/.test(before) || /\b(for up to|store|keeps?|refrigerate for up to)\b/.test(before)) continue;
      const hi = Number(m[2] || m[1]);
      const minutes = /^h/i.test(m[3]) ? hi * 60 : hi;
      // "set aside to marinate for 10 minutes" is marinating, not just resting:
      // prefer the specific verb over set aside / rest / sit / stand.
      // "add the marinated tofu and sear for 6 minutes": a past participle in
      // front of a noun describes the food, it is not a waiting step.
      const kinds = [...clause.matchAll(new RegExp(PASSIVE_RE.source, 'gi'))]
        .filter((k) => {
          const word = k[1].toLowerCase();
          if (!/ed$/.test(word) || /^(set aside|let)/.test(word)) return true;
          const after = clause.slice(k.index + k[0].length).trim().toLowerCase();
          return /^(for|in|until|overnight|covered|at|\d|$)/.test(after);
        })
        .map((k) => k[1].toLowerCase());
      const kind = kinds.find((k) => !/^(set aside|rest|sit|let)\b/.test(k)) || kinds[0];
      if (kind) {
        passive += minutes;
        passiveKinds.push(kind);
      } else {
        active += minutes;
      }
    }
  }
  return { active, passive, passiveKinds };
};
