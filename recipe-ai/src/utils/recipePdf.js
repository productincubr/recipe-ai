import { jsPDF } from 'jspdf';

// Builds the recipe PDF by drawing it directly (text, boxes, photo) instead of
// screenshotting the page, so the layout is clean, the text stays sharp and
// selectable, and nothing gets sliced in half at a page break.

const C = {
  ink: [44, 42, 34],
  inkSoft: [85, 80, 63],
  inkMuted: [122, 116, 98],
  olive: [111, 125, 51],
  oliveDark: [58, 68, 28],
  oliveDeep: [47, 55, 23],
  oliveSoft: [231, 234, 209],
  cream100: [250, 246, 236],
  cream200: [245, 239, 226],
  cream300: [237, 229, 211],
  roseText: [190, 18, 60],
  roseSoft: [255, 241, 242],
  roseBorder: [255, 228, 230],
  skyText: [2, 132, 199],
  skySoft: [240, 249, 255],
  amberText: [217, 119, 6],
  amberSoft: [255, 251, 235],
  veg: [14, 138, 22],
  nonVeg: [193, 39, 45],
  white: [255, 255, 255],
};

// The built-in PDF fonts only cover Latin-1 + a few typographic marks, so
// map common symbols to safe equivalents and drop anything else (e.g. emoji)
// rather than letting it render as garbage.
const REPLACEMENTS = [
  [/[\u2192\u2794\u27A1\u279C]/g, '->'],
  [/\u2190/g, '<-'],
  [/\u2264/g, '<='],
  [/\u2265/g, '>='],
  [/\u2248/g, '~'],
  [/\u2153/g, '1/3'],
  [/\u2154/g, '2/3'],
  [/\u215B/g, '1/8'],
  [/[\u2010\u2011\u2012\u2212]/g, '-'],
  [/[\u2009\u202F\u00A0]/g, ' '],
];
const WIN_ANSI_EXTRA = '\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178';

const isPrintable = (ch) => {
  const c = ch.codePointAt(0);
  return c === 10 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || WIN_ANSI_EXTRA.includes(ch);
};

function clean(value) {
  if (value == null) return '';
  let s = String(value);
  for (const [re, rep] of REPLACEMENTS) s = s.replace(re, rep);
  return Array.from(s.normalize('NFC'))
    .map((ch) => {
      if (isPrintable(ch)) return ch;
      const base = ch.normalize('NFD')[0]; // accented letter -> its base letter
      return base && isPrintable(base) ? base : '';
    })
    .join('')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// Loads the dish photo, crops it to the box (object-fit: cover) and rounds the
// corners. Resolves null if the image can't be loaded so the PDF still builds.
function loadCoverImage(src, width, height, radius, timeout = 10000) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), timeout);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const scale = 2;
        const cw = Math.round(width * scale);
        const ch = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cw, ch);
        const r = radius * scale;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.arcTo(cw, 0, cw, ch, r);
        ctx.arcTo(cw, ch, 0, ch, r);
        ctx.arcTo(0, ch, 0, 0, r);
        ctx.arcTo(0, 0, cw, 0, r);
        ctx.closePath();
        ctx.clip();
        const ratio = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        const dw = img.naturalWidth * ratio;
        const dh = img.naturalHeight * ratio;
        ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        resolve(null); // tainted canvas (no CORS) \u2014 skip the photo
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

export async function downloadRecipePdf({
  recipe,
  details = {},
  badges = [],
  swaps = [],
  methodAdjustments = [],
  ingredientGroups = [],
  imageSrc,
  nonVeg = false,
}) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 42;
  const CW = W - 2 * M;
  const TOP = 56;
  const BOTTOM = H - 54;
  let y = M;

  // ---------- primitives ----------
  const fill = (c) => pdf.setFillColor(...c);
  const stroke = (c, w = 0.8) => {
    pdf.setDrawColor(...c);
    pdf.setLineWidth(w);
  };
  const font = (style = 'normal', size = 10, color = C.inkSoft, family = 'helvetica') => {
    pdf.setFont(family, style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
  };
  const text = (str, x, ty, opts = {}) => pdf.text(str, x, ty, { baseline: 'top', ...opts });
  const wrap = (str, width) => pdf.splitTextToSize(clean(str), width);
  const ensure = (h) => {
    if (y + h > BOTTOM) {
      pdf.addPage();
      y = TOP;
    }
  };

  // Paragraph that flows line by line across pages.
  const paragraph = (str, { x = M, width = CW, size = 10, style = 'normal', color = C.inkSoft, family = 'helvetica', gapAfter = 0 } = {}) => {
    if (!clean(str)) return;
    const lh = size * 1.45;
    font(style, size, color, family);
    wrap(str, width).forEach((line) => {
      ensure(lh);
      font(style, size, color, family);
      text(line, x, y);
      y += lh;
    });
    y += gapAfter;
  };

  // Rounded box with stacked text blocks; kept together on one page.
  const box = ({ blocks, bg, border, x = M, width = CW, padding = 12, radius = 8, gapAfter = 10 }) => {
    const inner = width - 2 * padding;
    const measured = blocks
      .filter((b) => clean(b.text))
      .map((b) => {
        const size = b.size || 10;
        font(b.style || 'normal', size, b.color || C.inkSoft);
        return { ...b, size, lh: size * 1.45, lines: wrap(b.text, inner) };
      });
    if (!measured.length) return;
    const contentH = measured.reduce((s, b, i) => s + b.lines.length * b.lh + (i < measured.length - 1 ? b.gap ?? 2 : 0), 0);
    const h = contentH + 2 * padding - measured[measured.length - 1].size * 0.4;
    ensure(h);
    fill(bg);
    if (border) stroke(border);
    pdf.roundedRect(x, y, width, h, radius, radius, border ? 'FD' : 'F');
    let cy = y + padding;
    measured.forEach((b) => {
      font(b.style || 'normal', b.size, b.color || C.inkSoft);
      b.lines.forEach((line) => {
        text(line, x + padding, cy);
        cy += b.lh;
      });
      cy += b.gap ?? 2;
    });
    y += h + gapAfter;
  };

  // Flowing row of rounded pills.
  const chips = (items, { x0 = M, width = CW, gapAfter = 12 } = {}) => {
    const list = items.filter((c) => clean(c.text));
    if (!list.length) return;
    const ph = 19;
    const padX = 9;
    const gap = 6;
    let x = x0;
    ensure(ph);
    list.forEach((c) => {
      font(c.style || 'bold', 8.5, c.color);
      const label = clean(c.text);
      const w = Math.min(pdf.getTextWidth(label) + 2 * padX, width);
      if (x + w > x0 + width && x > x0) {
        x = x0;
        y += ph + gap;
        ensure(ph);
      }
      fill(c.bg);
      pdf.roundedRect(x, y, w, ph, ph / 2, ph / 2, 'F');
      font(c.style || 'bold', 8.5, c.color);
      text(label, x + padX, y + ph / 2, { baseline: 'middle' });
      x += w + gap;
    });
    y += ph + gapAfter;
  };

  // Grid of tiles: big value + small caption.
  const tiles = (items, { cols = 4, h = 50, gap = 8, bg = C.cream100, gapAfter = 16 } = {}) => {
    const list = items.filter(([value]) => clean(value));
    if (!list.length) return;
    const tw = (CW - gap * (cols - 1)) / cols;
    list.forEach(([value, caption], i) => {
      const col = i % cols;
      if (col === 0) {
        if (i > 0) y += h + gap;
        ensure(h);
      }
      const x = M + col * (tw + gap);
      fill(bg);
      pdf.roundedRect(x, y, tw, h, 8, 8, 'F');
      font('bold', 11, C.ink);
      let lines = wrap(value, tw - 12);
      let size = 11;
      if (lines.length > 1) {
        size = 8.5;
        font('bold', size, C.ink);
        lines = wrap(value, tw - 12);
        if (lines.length > 2) lines = [lines[0], `${lines[1].replace(/\s*\S*$/, '')}...`];
      }
      const lh = size * 1.2;
      const blockTop = y + (h - 14 - lines.length * lh) / 2;
      lines.forEach((line, k) => text(line, x + tw / 2, blockTop + k * lh, { align: 'center' }));
      font('normal', 7, C.inkMuted);
      text(clean(caption).toUpperCase(), x + tw / 2, y + h - 15, { align: 'center' });
    });
    y += h + gapAfter;
  };

  const label = (str, color = C.oliveDark) => {
    ensure(34);
    font('bold', 10, color);
    text(clean(str), M, y);
    y += 17;
  };

  const sectionTitle = (title, sub) => {
    ensure(70);
    y += 8;
    font('bold', 15, C.ink, 'times');
    text(clean(title), M, y);
    if (sub) {
      const tw = pdf.getTextWidth(clean(title));
      font('normal', 9, C.inkMuted);
      text(clean(sub), M + tw + 8, y + 4);
    }
    y += 22;
    stroke(C.cream300);
    pdf.line(M, y, M + CW, y);
    y += 12;
  };

  const bullets = (items, { x0 = M, width = CW, size = 10, color = C.inkSoft, dot = C.olive } = {}) => {
    const lh = size * 1.45;
    (items || []).filter((it) => clean(it)).forEach((item) => {
      font('normal', size, color);
      wrap(item, width - 14).forEach((line, i) => {
        ensure(lh);
        if (i === 0) {
          fill(dot);
          pdf.circle(x0 + 3.5, y + size * 0.48, 1.8, 'F');
        }
        font('normal', size, color);
        text(line, x0 + 14, y);
        y += lh;
      });
      y += 3;
    });
  };

  // ---------- header: photo, title, intro ----------
  const imgH = 220;
  const photo = await loadCoverImage(imageSrc, CW, imgH, 14);
  if (photo) {
    pdf.addImage(photo, 'JPEG', M, y, CW, imgH, undefined, 'FAST');
    y += imgH + 18;
  }

  // Category chip + veg / non-veg mark
  const vegColor = nonVeg ? C.nonVeg : C.veg;
  const vegLabel = nonVeg ? 'Non-Vegetarian' : 'Vegetarian';
  let cx = M;
  if (clean(recipe.category)) {
    font('bold', 8, C.oliveDeep);
    const cat = clean(recipe.category).toUpperCase();
    const w = pdf.getTextWidth(cat) + 18;
    fill(C.oliveSoft);
    pdf.roundedRect(cx, y, w, 18, 9, 9, 'F');
    text(cat, cx + 9, y + 9, { baseline: 'middle' });
    cx += w + 10;
  }
  stroke(vegColor, 1.4);
  pdf.roundedRect(cx, y + 3, 12, 12, 1.5, 1.5, 'S');
  fill(vegColor);
  pdf.circle(cx + 6, y + 9, 2.6, 'F');
  font('bold', 8.5, vegColor);
  text(vegLabel, cx + 17, y + 9, { baseline: 'middle' });
  y += 28;

  paragraph(recipe.dish_name, { size: 26, style: 'bold', color: C.ink, family: 'times', gapAfter: 4 });
  paragraph(details.subtitle, { size: 11.5, style: 'bold', color: C.oliveDark, gapAfter: 6 });
  paragraph(recipe.description, { size: 11, color: C.inkSoft, gapAfter: 16 });

  tiles([
    [recipe.cooking_time, 'Ready in'],
    [details.prepTime, 'Prep'],
    [details.cookTime, 'Cook'],
    [recipe.servings, 'Servings'],
    [recipe.difficulty, 'Difficulty'],
  ].filter(([v]) => v), { cols: 5 });

  if (badges.length) {
    label('Made for you');
    chips(badges.map((b) => ({ text: `${b.label}: ${b.value}`, bg: C.cream100, color: C.inkSoft, style: 'normal' })));
  }

  const nutrition = [
    [recipe.calories ? `${recipe.calories} kcal` : '', 'Calories'],
    [recipe.protein, 'Protein'],
    [details.nutrition?.carbohydrates, 'Carbs'],
    [recipe.fats, 'Fat'],
    [recipe.fiber, 'Fiber'],
    [details.nutrition?.sugar, 'Sugar'],
    [recipe.sodium, 'Sodium'],
  ].filter(([v]) => v);
  if (nutrition.length) {
    label('Nutrition per serving');
    tiles(nutrition, { cols: Math.min(nutrition.length, 7), h: 44, bg: C.oliveSoft });
  }

  if (clean(recipe.healthier_explanation)) {
    box({
      bg: C.cream100,
      border: C.cream300,
      blocks: [
        { text: "Why it's healthier", style: 'bold', size: 10.5, color: C.ink, gap: 4 },
        { text: recipe.healthier_explanation, size: 9.5 },
      ],
      gapAfter: 16,
    });
  }

  if (swaps.length || methodAdjustments.length) {
    label('Healthy ingredient swaps');
    swaps.forEach((s) =>
      box({
        bg: C.white,
        border: C.cream300,
        padding: 10,
        gapAfter: 8,
        blocks: [
          { text: `${clean(s.originalIngredient)}  ->  ${clean(s.substitutedWith)}`, style: 'bold', size: 10, color: C.ink, gap: 3 },
          { text: s.reason, size: 9 },
          { text: s.clinicalBenefit, size: 8.5, color: C.inkMuted },
        ],
      })
    );
    methodAdjustments.forEach((a) =>
      box({
        bg: C.cream100,
        border: C.cream300,
        padding: 10,
        gapAfter: 8,
        blocks: [
          { text: `${clean(a.originalMethod)}  ->  ${clean(a.adjustedMethod)}`, style: 'bold', size: 10, color: C.ink, gap: 3 },
          { text: a.reason, size: 9 },
        ],
      })
    );
    y += 6;
  }

  // ---------- ingredients ----------
  if (ingredientGroups.length) {
    sectionTitle('Ingredients', recipe.servings ? `for ${clean(recipe.servings)} servings` : '');
    const qtyW = CW * 0.32;
    const nameW = CW - qtyW - 16;
    ingredientGroups.forEach(({ group, items }) => {
      if (group) {
        ensure(34);
        font('bold', 8.5, C.oliveDark);
        text(clean(group).toUpperCase(), M, y + 4);
        y += 18;
      }
      items.forEach((ing) => {
        font('normal', 10.5, C.ink);
        const nameLines = wrap(ing.name, nameW);
        // A short prep note ("bruised") sits on the name's line; a long one wraps below it.
        const prep = clean(ing.prep);
        const lastNameW = pdf.getTextWidth(nameLines[nameLines.length - 1] || '');
        font('italic', 9, C.inkMuted);
        const prepInline = prep && lastNameW + 8 + pdf.getTextWidth(prep) <= nameW;
        const prepLines = prep && !prepInline ? wrap(prep, nameW) : [];
        font('normal', 10, C.inkSoft);
        const qtyLines = wrap(ing.qty || ing.quantity || '', qtyW);
        const h = Math.max(nameLines.length * 14 + prepLines.length * 12, qtyLines.length * 14) + 9;
        ensure(h);
        let cy = y + 5;
        font('normal', 10.5, C.ink);
        nameLines.forEach((l) => {
          text(l, M, cy);
          cy += 14;
        });
        font('italic', 9, C.inkMuted);
        if (prepInline) text(prep, M + lastNameW + 8, cy - 14 + 1.5);
        prepLines.forEach((l) => {
          text(l, M, cy);
          cy += 12;
        });
        font('normal', 10, C.inkSoft);
        qtyLines.forEach((l, k) => text(l, M + CW, y + 5 + k * 14, { align: 'right' }));
        y += h;
        stroke(C.cream200, 0.6);
        pdf.line(M, y, M + CW, y);
      });
      y += 10;
    });
  }

  if (details.equipment?.length) {
    label('Equipment');
    bullets(details.equipment);
    y += 6;
  }

  if (details.preparationNotes?.length) {
    box({
      bg: C.cream100,
      border: C.cream300,
      blocks: [
        { text: 'Before you start', style: 'bold', size: 10, color: C.ink, gap: 4 },
        ...details.preparationNotes.map((n) => ({ text: `\u2022  ${clean(n)}`, size: 9.5, gap: 3 })),
      ],
      gapAfter: 14,
    });
  }

  // ---------- instructions ----------
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  if (steps.length) {
    sectionTitle('Instructions');
    const tx = M + 32;
    const tw = CW - 32;
    steps.forEach((step, i) => {
      const isText = typeof step === 'string';
      ensure(70);
      fill(C.olive);
      pdf.circle(M + 11, y + 10, 11, 'F');
      font('bold', 10, C.white);
      text(String(i + 1), M + 11, y + 10, { align: 'center', baseline: 'middle' });

      y += 2;
      paragraph(isText ? `Step ${i + 1}` : step.title || `Step ${i + 1}`, { x: tx, width: tw, size: 12, style: 'bold', color: C.ink, gapAfter: 4 });

      if (!isText) {
        chips(
          [
            step.time ? { text: `Time: ${step.time}`, bg: C.skySoft, color: C.skyText } : null,
            step.heatLevel && step.heatLevel !== 'None' ? { text: `Heat: ${step.heatLevel}`, bg: C.amberSoft, color: C.amberText } : null,
          ].filter(Boolean),
          { x0: tx, width: tw, gapAfter: 8 }
        );
      }

      const instructions = isText ? [step] : step.instructions || [];
      instructions.forEach((inst, k) => {
        const prefix = isText ? '' : `${k + 1}.`;
        const indent = prefix ? 16 : 0;
        font('normal', 10, C.inkSoft);
        wrap(inst, tw - indent).forEach((line, j) => {
          ensure(14.5);
          if (j === 0 && prefix) {
            font('bold', 10, C.olive);
            text(prefix, tx, y);
          }
          font('normal', 10, C.inkSoft);
          text(line, tx + indent, y);
          y += 14.5;
        });
        y += 3;
      });

      if (!isText && clean(step.chefTip)) {
        y += 2;
        box({
          x: tx,
          width: tw,
          padding: 9,
          gapAfter: 6,
          bg: C.oliveSoft,
          blocks: [{ text: `Chef tip: ${clean(step.chefTip)}`, size: 9, color: C.oliveDark }],
        });
      }
      if (!isText && clean(step.commonMistakes)) {
        box({
          x: tx,
          width: tw,
          padding: 9,
          gapAfter: 6,
          bg: C.roseSoft,
          border: C.roseBorder,
          blocks: [{ text: `Avoid: ${clean(step.commonMistakes)}`, size: 9, color: C.roseText }],
        });
      }
      y += 12;
    });
  }

  // ---------- extras ----------
  const substitutions = details.substitutions || [];
  if (substitutions.length) {
    sectionTitle('Substitutions');
    substitutions.forEach((s) =>
      box({
        bg: C.cream100,
        border: C.cream300,
        padding: 10,
        gapAfter: 8,
        blocks: [
          { text: `${clean(s.ingredient)}  ->  ${clean(s.substitute)}`, style: 'bold', size: 10, color: C.ink, gap: 3 },
          { text: s.note, size: 9 },
        ],
      })
    );
  }

  const extras = [
    ['Chef tips', details.chefTips],
    ['Variations', details.variations],
    ['Serving suggestions', details.servingSuggestions],
    ['Storage', details.storageInstructions],
    ['Reheating', details.reheatingInstructions],
    ['Health benefits', details.healthBenefits],
    ['Protein boost', details.proteinBoost ? [details.proteinBoost] : []],
  ].filter(([, items]) => items?.length);
  if (extras.length) {
    sectionTitle('Tips & more');
    extras.forEach(([title, items]) => {
      label(title);
      bullets(items);
      y += 8;
    });
  }

  const tagChips = [
    ...(details.dietaryTags || []).map((t) => ({ text: t, bg: C.oliveSoft, color: C.oliveDeep })),
    ...(details.allergens?.length ? [{ text: `Contains: ${details.allergens.join(', ')}`, bg: C.roseSoft, color: C.roseText }] : []),
  ];
  if (tagChips.length) chips(tagChips);

  // Closing banner only if it fits \u2014 never start a page just for it.
  if (y + 42 <= BOTTOM) {
    y += 6;
    fill(C.oliveSoft);
    pdf.roundedRect(M, y, CW, 36, 10, 10, 'F');
    font('bold', 10, C.oliveDark);
    text('Made just for you \u2014 healthy, delicious & perfect for your goals!', W / 2, y + 18, { align: 'center', baseline: 'middle' });
  }

  // ---------- running header & footer ----------
  const pages = pdf.getNumberOfPages();
  const shortTitle = (() => {
    font('normal', 8, C.inkMuted);
    const t = clean(recipe.dish_name);
    return pdf.splitTextToSize(t, CW * 0.7)[0] + (pdf.getTextWidth(t) > CW * 0.7 ? '...' : '');
  })();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    stroke(C.cream300, 0.6);
    pdf.line(M, H - 40, W - M, H - 40);
    font('bold', 8, C.olive);
    text('RecipeAI', M, H - 31);
    font('normal', 8, C.inkMuted);
    text(`Page ${p} of ${pages}`, W - M, H - 31, { align: 'right' });
    if (p > 1) {
      text(shortTitle, M, 24);
      pdf.line(M, 38, W - M, 38);
    }
  }

  const fileName = clean(recipe.dish_name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recipe';
  pdf.save(`${fileName}.pdf`);
}
