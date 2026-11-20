import { COMPONENTS, boxPart, cylPart, finalizeParts } from '../components';
import type { Issue, Part, ProductConfig, ProductDefinition } from '../types';

/**
 * Wonder Indoor Wooden Jungle Gym — parametric definition.
 *
 * Layout (looking from the front, +Z towards the viewer):
 *   - Ladder on the left end frame (x = -W/2)
 *   - Monkey-bar lane along the top, centred on depth
 *   - Climbing net filling the right end frame (x = +W/2)
 *
 * All constants below are PRELIMINARY design assumptions. None has been
 * structurally or safety validated.
 */
const POST = 9; // post section, cm
const BEAM = 9; // beam section, cm
const RAIL_W = 4.5;
const MAX_BAY = 160; // max post spacing before an intermediate post line is added
const LANE = 50; // monkey-bar / ladder lane width (rail centre to centre)
const MB_PITCH = 30; // target monkey-bar rung spacing
const LADDER_PITCH = 25; // target ladder rung spacing
const NET_MESH = 20; // target net mesh size

export function monkeyBarGripHeight(config: ProductConfig): number {
  return config.dims.height - BEAM / 2;
}

function build(config: ProductConfig): Part[] {
  const { width: W, depth: D, height: H } = config.dims;
  const act = config.activities;
  const parts: ReturnType<typeof boxPart>[] = [];

  const xEnd = W / 2 - POST / 2;
  const zEnd = D / 2 - POST / 2;
  const bays = Math.max(1, Math.ceil((W - POST) / MAX_BAY));
  const bayLen = (2 * xEnd) / bays;
  const postXs = Array.from({ length: bays + 1 }, (_, i) => -xEnd + i * bayLen);
  const innerDepth = D - 2 * POST;
  const topY = H - BEAM / 2;
  const conDia = 'dia' in COMPONENTS.connector.section ? COMPONENTS.connector.section.dia : 2.6;

  // --- Frame -------------------------------------------------------------
  for (const x of postXs) {
    for (const z of [-zEnd, zEnd]) {
      parts.push(boxPart('post', 'frame', [POST, H - BEAM, POST], [x, (H - BEAM) / 2, z]));
      // bolt head on top of the long beam above each post
      parts.push(cylPart('connector', 'frame', 'y', 0.6, [x, H + 0.3, z], conDia));
    }
    // top cross beam on every post line
    parts.push(boxPart('beam', 'frame', [POST, BEAM, innerDepth], [x, topY, 0]));
    for (const s of [-1, 1]) {
      parts.push(cylPart('connector', 'frame', 'z', 0.6, [x, topY, s * (D / 2 + 0.3)], conDia));
    }
  }
  for (const z of [-zEnd, zEnd]) {
    parts.push(boxPart('beam', 'frame', [W, BEAM, POST], [0, topY, z]));
  }
  // floor sills on both end frames
  for (const x of [-xEnd, xEnd]) {
    parts.push(boxPart('beam', 'frame', [POST, BEAM, innerDepth], [x, BEAM / 2, 0]));
    for (const s of [-1, 1]) {
      parts.push(cylPart('connector', 'frame', 'z', 0.6, [x, BEAM / 2, s * (D / 2 + 0.3)], conDia));
    }
  }
  // rear floor stretcher per bay (front stays open for access)
  for (let i = 0; i < bays; i++) {
    const mid = (postXs[i] + postXs[i + 1]) / 2;
    parts.push(boxPart('beam', 'frame', [bayLen - POST, BEAM, POST], [mid, BEAM / 2, -zEnd]));
    parts.push(cylPart('connector', 'frame', 'z', 0.6, [postXs[i], BEAM / 2 + 0.01, -(D / 2 + 0.3)], conDia));
  }

  // --- Monkey bars ------------------------------------------------------
  if (act.monkey_bars) {
    for (let i = 0; i < bays; i++) {
      const mid = (postXs[i] + postXs[i + 1]) / 2;
      for (const z of [-LANE / 2, LANE / 2]) {
        parts.push(boxPart('rail', 'monkey_bars', [bayLen - POST, BEAM, RAIL_W], [mid, topY, z]));
      }
    }
    const start = -xEnd + POST / 2;
    const span = 2 * xEnd - POST;
    const n = Math.max(2, Math.round(span / MB_PITCH));
    const pitch = span / n;
    for (let i = 1; i < n; i++) {
      const x = start + i * pitch;
      // skip rungs that would collide with an intermediate cross beam
      if (postXs.slice(1, -1).some((px) => Math.abs(px - x) < POST / 2 + 4)) continue;
      parts.push(cylPart('monkey_rung', 'monkey_bars', 'z', LANE, [x, topY, 0]));
    }
  }

  // --- Climbing ladder (left end frame) -----------------------------------
  if (act.ladder) {
    const clear = H - 2 * BEAM;
    for (const z of [-LANE / 2, LANE / 2]) {
      parts.push(boxPart('ladder_stile', 'ladder', [POST, clear, RAIL_W], [-xEnd, BEAM + clear / 2, z]));
    }
    const n = Math.max(2, Math.round(clear / LADDER_PITCH));
    const pitch = clear / n;
    for (let i = 1; i < n; i++) {
      parts.push(cylPart('ladder_rung', 'ladder', 'z', LANE, [-xEnd, BEAM + i * pitch, 0]));
    }
  }

  // --- Climbing net (right end frame) --------------------------------------
  if (act.net) {
    const spanY = H - 2 * BEAM;
    const nz = Math.max(2, Math.round(innerDepth / NET_MESH));
    const ny = Math.max(2, Math.round(spanY / NET_MESH));
    for (let i = 1; i < nz; i++) {
      const z = -innerDepth / 2 + (i * innerDepth) / nz;
      parts.push(cylPart('net_rope', 'net', 'y', spanY, [xEnd, BEAM + spanY / 2, z]));
    }
    for (let j = 1; j < ny; j++) {
      const y = BEAM + (j * spanY) / ny;
      parts.push(cylPart('net_rope', 'net', 'z', innerDepth, [xEnd, y, 0]));
    }
  }

  return finalizeParts(parts);
}

function validate(config: ProductConfig): Issue[] {
  const { width: W, depth: D, height: H } = config.dims;
  const act = config.activities;
  const issues: Issue[] = [];
  const innerDepth = D - 2 * POST;

  if (!Object.values(act).some(Boolean)) {
    issues.push({
      code: 'no_activity',
      severity: 'warning',
      message: { ar: 'لم يتم اختيار أي نشاط.', en: 'No activity is selected.' },
    });
  }
  if ((act.monkey_bars || act.ladder) && innerDepth < LANE + 10) {
    issues.push({
      code: 'lane_depth',
      severity: 'blocker',
      message: {
        ar: `العمق لا يكفي لمسار قضبان التعلق/السلم (عرض المسار ${LANE} سم). زد العمق أو ألغِ النشاط.`,
        en: `Depth is too small for the ${LANE} cm monkey-bar / ladder lane. Increase depth or disable the activity.`,
      },
    });
  }
  if (act.monkey_bars && W < 180) {
    issues.push({
      code: 'mb_short',
      severity: 'warning',
      message: {
        ar: 'العرض قصير لمسار قضبان التعلق؛ عدد القضبان محدود.',
        en: 'Width gives a very short monkey-bar run with few rungs.',
      },
    });
  }
  if (act.monkey_bars) {
    const grip = Math.round(monkeyBarGripHeight(config));
    issues.push({
      code: 'mb_grip_height',
      severity: 'warning',
      message: {
        ar: `ارتفاع قبضة قضبان التعلق ≈ ${grip} سم. لم يتم تقييم إمكانية الوصول وارتفاع السقوط للفئة العمرية المستهدفة؛ يجب أن يعتمد المهندس الارتفاع والأرضية الماصّة للصدمات.`,
        en: `Monkey-bar grip height ≈ ${grip} cm. Reachability and fall height for the target age group are not assessed; engineering must confirm the height and impact-absorbing flooring.`,
      },
    });
  }
  if (act.net) {
    issues.push({
      code: 'net_openings',
      severity: 'info',
      message: {
        ar: `فتحات الشبكة مرسومة بمقاس تقريبي ${NET_MESH} سم. مقاس الفتحات (خطر الانحشار/الاختناق) يحتاج مراجعة هندسية.`,
        en: `Net is drawn with ~${NET_MESH} cm mesh. Opening sizes (entrapment / strangulation risk) require engineering review.`,
      },
    });
  }
  if (H / D > 1.5) {
    issues.push({
      code: 'tip_ratio',
      severity: 'warning',
      message: {
        ar: 'نسبة الارتفاع إلى العمق مرتفعة؛ خطر الانقلاب والتثبيت يحتاجان مراجعة هندسية.',
        en: 'High height-to-depth ratio; tip-over risk and anchoring need engineering review.',
      },
    });
  }
  return issues;
}

export const jungleGym: ProductDefinition = {
  id: 'jungle_gym',
  name: { ar: 'جنغل جيم خشبي داخلي من وندر', en: 'Wonder Indoor Wooden Jungle Gym' },
  description: {
    ar: 'هيكل لعب خشبي داخلي معياري بأنشطة قابلة للتبديل.',
    en: 'Modular indoor wooden play frame with interchangeable activities.',
  },
  ageRange: { ar: '3–6 سنوات (مستهدف)', en: '3–6 years (target)' },
  traits: [
    { ar: 'هيكل خشبي طبيعي', en: 'Natural wooden structure' },
    { ar: 'حواف مستديرة', en: 'Rounded edges' },
    { ar: 'بناء معياري', en: 'Modular construction' },
    { ar: 'مكونات قابلة للاستبدال', en: 'Replaceable components' },
    { ar: 'تركيب داخلي سكني', en: 'Indoor residential installation' },
  ],
  // Ranges are PROVISIONAL until engineering validation.
  params: [
    { id: 'width', name: { ar: 'العرض', en: 'Width' }, unit: 'cm', min: 150, max: 450, step: 5, default: 300 },
    { id: 'depth', name: { ar: 'العمق', en: 'Depth' }, unit: 'cm', min: 70, max: 250, step: 5, default: 150 },
    { id: 'height', name: { ar: 'الارتفاع', en: 'Height' }, unit: 'cm', min: 120, max: 260, step: 5, default: 220 },
  ],
  activities: [
    {
      id: 'monkey_bars',
      name: { ar: 'قضبان التعلق', en: 'Monkey bars' },
      description: { ar: 'مسار علوي على امتداد العرض', en: 'Overhead lane along the width' },
      default: true,
    },
    {
      id: 'ladder',
      name: { ar: 'سلم التسلق', en: 'Climbing ladder' },
      description: { ar: 'على الجانب الأيسر', en: 'On the left end frame' },
      default: true,
    },
    {
      id: 'net',
      name: { ar: 'شبكة التسلق', en: 'Climbing net' },
      description: { ar: 'على الجانب الأيمن', en: 'On the right end frame' },
      default: true,
    },
  ],
  defaultConfig() {
    return {
      productId: this.id,
      dims: Object.fromEntries(this.params.map((p) => [p.id, p.default])),
      activities: Object.fromEntries(this.activities.map((a) => [a.id, a.default])),
      woodId: 'beech',
      finishId: 'natural',
      ropeColorId: 'natural',
    };
  },
  build,
  validate,
};
