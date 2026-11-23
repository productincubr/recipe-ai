// Cooking-time calculation from the recipe workflow.
//
// Each step has hands-on minutes (activeMinutes), hands-off minutes
// (passiveMinutes: marinating, soaking, simmering covered, resting, baking)
// and the steps it depends on (dependsOn). With one cook, hands-on work
// happens one step at a time, but hands-off time can overlap other work: you
// can chop vegetables while the chillies soak. Total time is the length of
// that schedule, not the sum of every duration.

import { durationsIn } from './quantity.js';

const fmt = (min) => {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
};
export const formatMinutes = fmt;

const WAIT_LABELS = [[/marinat/, 'marinating'], [/press/, 'pressing'], [/soak/, 'soaking'], [/chill|refrigerat/, 'chilling'], [/freez/, 'freezing'], [/proof|rise/, 'proofing'], [/steep/, 'steeping'], [/drain|hang/, 'draining'], [/cool/, 'cooling'], [/rest|set aside|stand|sit/, 'resting']];
const waitLabel = (kind) => WAIT_LABELS.find(([re]) => re.test(String(kind || '').toLowerCase()))?.[1] || (kind ? String(kind).toLowerCase() : 'waiting');

const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Math.max(0, Number(v)));
const isHeat = (step) => Boolean((step.heatLevel && !/^(none|off|no heat)$/i.test(step.heatLevel)) || step.temperature);

// Verbs whose past participle in a later step implies an earlier step did it.
const PREREQUISITES = [
  ['soaked', /\bsoak/, 'soak'], ['toasted', /\btoast|\bdry[- ]roast|\broast/, 'toast'], ['marinated', /\bmarinat|\btoss\w* (?:\w+ ){0,4}to coat|\bcoat\w* (?:\w+ ){0,3}in|\brub\w* /, 'marinate'],
  ['pressed', /\bpress/, 'press'], ['roasted', /\broast/, 'roast'], ['boiled', /\bboil|\bcook\w* (?:\w+ ){0,3}in (?:salted )?water/, 'boil'],
  ['blanched', /\bblanch/, 'blanch'], ['caramelised', /\bcaramel/, 'caramelise'], ['caramelized', /\bcaramel/, 'caramelize'],
  ['rested', /\brest/, 'rest'], ['chilled', /\bchill|\brefrigerat/, 'chill'], ['grilled', /\bgrill/, 'grill'],
];

/**
 * Schedules the steps and validates the stated durations.
 * Returns { minutes, display, schedule } and reports problems through ctx.
 */
export const calculateTiming = (recipe, ctx, { structured = true } = {}) => {
  const steps = (recipe.steps || []).filter((s) => s && typeof s === 'object');
  const numberOf = (s, i) => Number(s.stepNumber) || i + 1;
  const rows = steps.map((step, i) => {
    const text = (step.instructions || []).join(' ');
    const fromText = durationsIn(text);
    let active = num(step.activeMinutes);
    let passive = num(step.passiveMinutes);
    if (!structured || (active == null && passive == null)) {
      // Older recipes: take the durations written in the instructions.
      active = fromText.active;
      passive = fromText.passive;
      const stated = num(String(step.time || '').match(/\d+/)?.[0]);
      if (stated != null && stated > active + passive) active = stated - passive;
    }
    active = active ?? 0;
    passive = passive ?? 0;
    const n = numberOf(step, i);

    if (structured) {
      // The step's durations must cover what its instructions say.
      const textTotal = fromText.active + fromText.passive;
      if (textTotal > active + passive + 1) {
        ctx.hard('timing', `Step ${n} ("${step.title}"): the instructions add up to ${fmt(textTotal)} (${fromText.active ? `${fmt(fromText.active)} cooking/handling` : ''}${fromText.active && fromText.passive ? ' + ' : ''}${fromText.passive ? `${fmt(fromText.passive)} ${fromText.passiveKinds.join('/')}` : ''}) but the step is timed at ${fmt(active + passive)}.`);
      }
      if (fromText.passive > 0 && passive === 0) {
        ctx.hard('timing', `Step ${n} includes ${fmt(fromText.passive)} of waiting (${fromText.passiveKinds.join(', ')}) but passiveMinutes is 0.`);
      }
      if (active + passive === 0) ctx.hard('timing', `Step ${n} ("${step.title}") has no duration.`);
      // Hands-off time must come from something the instructions say to wait for.
      const mentionsWait = fromText.passive > 0 || /\b(simmer|bake|roast|rest|marinat|soak|chill|cover|steam|braise|cook)\w*\b[^.]*\d/i.test(text);
      if (passive > 0 && !mentionsWait) {
        ctx.warn('timing', `Step ${n} ("${step.title}") counts ${fmt(passive)} of hands-off time that its instructions don't mention.`);
      }
    }

    const deps = Array.isArray(step.dependsOn) && structured
      ? step.dependsOn.map(Number).filter((d) => Number.isFinite(d) && d !== n)
      : i > 0 ? [numberOf(steps[i - 1], i - 1)] : [];
    return { n, title: step.title || `Step ${n}`, active, passive, deps, heat: isHeat(step), optional: Boolean(step.optional), passiveLabel: waitLabel(step.passiveLabel || fromText.passiveKinds[0] || '') };
  });

  // Dependencies must point backwards to existing steps.
  const known = new Set(rows.map((r) => r.n));
  for (const r of rows) {
    const bad = r.deps.filter((d) => !known.has(d) || d > r.n);
    if (bad.length && structured) ctx.warn('timing', `Step ${r.n} depends on step ${bad.join(', ')}, which does not come before it; treated as following the previous step.`);
    r.deps = r.deps.filter((d) => known.has(d) && d < r.n);
  }

  // One cook: hands-on work is sequential; hands-off time runs in parallel.
  const schedule = (include) => {
    const end = new Map();
    let cookFree = 0;
    const out = [];
    for (const r of rows.filter(include)) {
      const ready = Math.max(0, ...r.deps.filter((d) => end.has(d)).map((d) => end.get(d)));
      const start = r.active > 0 ? Math.max(ready, cookFree) : ready;
      if (r.active > 0) cookFree = start + r.active;
      end.set(r.n, start + r.active + r.passive);
      out.push({ step: r.n, title: r.title, start, activeEnd: start + r.active, end: start + r.active + r.passive });
    }
    return { total: Math.max(0, ...out.map((o) => o.end)), timeline: out };
  };
  const main = schedule((r) => !r.optional);
  const withOptional = rows.some((r) => r.optional) ? schedule(() => true) : null;

  const required = rows.filter((r) => !r.optional);
  const prepActive = required.filter((r) => !r.heat).reduce((s, r) => s + r.active, 0);
  const waiting = required.filter((r) => !r.heat).reduce((s, r) => s + r.passive, 0);
  const cook = required.filter((r) => r.heat).reduce((s, r) => s + r.active + r.passive, 0);
  const handsOn = required.reduce((s, r) => s + r.active, 0);
  const sequentialSum = required.reduce((s, r) => s + r.active + r.passive, 0);
  const overlap = Math.max(0, sequentialSum - main.total);

  const waits = new Map();
  for (const r of required.filter((x) => x.passive && !x.heat)) waits.set(r.passiveLabel || 'waiting', (waits.get(r.passiveLabel || 'waiting') || 0) + r.passive);
  const waitText = [...waits].map(([label, m]) => `${fmt(m)} ${label}`).join(', ');

  // Steps that use soaked/toasted/... ingredients need the step that did it.
  if (structured) {
    const all = steps.map((s) => [s.title, ...(s.instructions || []), s.produces || ''].join(' ').toLowerCase().replace(/[\u2010-\u2015\u2212]/g, '-'));
    const prepNotes = [...(recipe.details?.preparationNotes || []), ...(recipe.ingredients || []).map((i) => i.prep || '')].join(' ').toLowerCase();
    steps.forEach((s, i) => {
      for (const [participle, verb, base] of PREREQUISITES) {
        const re = new RegExp(`(?<!cold[- ]|pre[- ]|par[- ]|fire[- ]|dry[- ])\\b${participle}\\s+([a-z][a-z ]{2,30})`, 'i');
        const m = all[i].match(re);
        if (!m) continue;
        const didIt = all.slice(0, i).some((t) => verb.test(t)) || verb.test(all[i].replace(re, ''));
        if (!didIt) {
          const inPrep = verb.test(prepNotes);
          const msg = `Step ${numberOf(s, i)} uses "${participle} ${m[1].trim().split(' ').slice(0, 3).join(' ')}", but no earlier step says to ${base} it${inPrep ? ' (it is only mentioned in the ingredient preparation, so its time is not counted)' : ''}.`;
          ctx.hard('timing', msg);
        }
      }
    });
  }

  // Ingredients that must be cut, pressed or soaked take hands-on time; if no
  // step is a preparation step, that time is missing from the total.
  const needsPrep = (recipe.ingredients || []).filter((i) => !i.optional && /\b(chop|slic|dic|cub|mince|grat|julienn|peel|press|soak|shred|crush|trim|halv|quarter)\w*/i.test(i.prep || ''));
  if (structured && prepActive === 0 && needsPrep.length) {
    ctx.warn('timing', `${needsPrep.map((i) => i.name).slice(0, 4).join(', ')} need${needsPrep.length === 1 ? 's' : ''} preparing (${needsPrep.map((i) => i.prep).slice(0, 2).join('; ')}), but no step covers that work, so preparation time is not counted.`);
  }

  const minutes = {
    prepActive,
    waiting,
    cook,
    handsOn,
    total: main.total,
    overlap,
    withOptional: withOptional?.total ?? null,
  };
  const display = {
    // No separate prep step: show nothing rather than a misleading "0 min".
    prepTime: prepActive || waitText ? `${fmt(prepActive)}${waitText ? ` + ${waitText}` : ''}` : '',
    cookTime: fmt(cook),
    totalTime: fmt(main.total),
    timingNote: [
      `${fmt(handsOn)} hands-on`,
      waitText ? `includes ${waitText}` : '',
      overlap > 0 ? `${fmt(overlap)} of waiting overlaps other steps` : '',
      withOptional && withOptional.total > main.total ? `${fmt(withOptional.total)} with the optional side` : '',
    ].filter(Boolean).join('; '),
  };
  return { minutes, display, schedule: main.timeline };
};
