import type { ComponentDef, ComponentId, Part, Vec3 } from './types';

/**
 * Modular component library.
 * Sections are PRELIMINARY nominal sizes for visualisation and quantity
 * estimation only. They carry no structural validation.
 */
export const COMPONENTS: Record<ComponentId, ComponentDef> = {
  post: {
    id: 'post',
    prefix: 'POST',
    name: { ar: 'قائم خشبي رأسي', en: 'Vertical wooden post' },
    materialClass: 'wood',
    section: { w: 9, h: 9 },
    note: { ar: 'مقطع مبدئي 9×9 سم', en: 'Preliminary 9×9 cm section' },
  },
  beam: {
    id: 'beam',
    prefix: 'BEAM',
    name: { ar: 'عارضة أفقية', en: 'Horizontal beam' },
    materialClass: 'wood',
    section: { w: 9, h: 9 },
    note: { ar: 'مقطع مبدئي 9×9 سم', en: 'Preliminary 9×9 cm section' },
  },
  rail: {
    id: 'rail',
    prefix: 'RAIL',
    name: { ar: 'سكة حاملة لقضبان التعلق', en: 'Monkey-bar carrier rail' },
    materialClass: 'wood',
    section: { w: 4.5, h: 9 },
    note: { ar: 'مقطع مبدئي 4.5×9 سم', en: 'Preliminary 4.5×9 cm section' },
  },
  monkey_rung: {
    id: 'monkey_rung',
    prefix: 'MBR',
    name: { ar: 'قضيب تعلق', en: 'Monkey-bar rung' },
    materialClass: 'dowel',
    section: { dia: 3.2 },
    note: { ar: 'قضيب خشب صلب، قطر مبدئي 3.2 سم', en: 'Hardwood dowel, preliminary Ø3.2 cm' },
  },
  ladder_stile: {
    id: 'ladder_stile',
    prefix: 'LST',
    name: { ar: 'قائم السلم', en: 'Ladder stile' },
    materialClass: 'wood',
    section: { w: 4.5, h: 9 },
    note: { ar: 'مقطع مبدئي 4.5×9 سم', en: 'Preliminary 4.5×9 cm section' },
  },
  ladder_rung: {
    id: 'ladder_rung',
    prefix: 'LRG',
    name: { ar: 'درجة السلم', en: 'Ladder rung' },
    materialClass: 'dowel',
    section: { dia: 3.5 },
    note: { ar: 'قضيب خشب صلب، قطر مبدئي 3.5 سم', en: 'Hardwood dowel, preliminary Ø3.5 cm' },
  },
  net_rope: {
    id: 'net_rope',
    prefix: 'ROPE',
    name: { ar: 'حبل شبكة التسلق', en: 'Climbing-net rope' },
    materialClass: 'rope',
    section: { dia: 1.6 },
    note: { ar: 'حبل قطر مبدئي 16 مم', en: 'Preliminary Ø16 mm rope' },
  },
  connector: {
    id: 'connector',
    prefix: 'CON',
    name: { ar: 'عنصر ربط (مسمار + صامولة)', en: 'Connector set (bolt + barrel nut)' },
    materialClass: 'metal',
    section: { dia: 2.6 },
    note: { ar: 'نوع ومقاس الربط يحدده المهندس', en: 'Type and size to be specified by engineering' },
  },
};

type Draft = Omit<Part, 'id'>;

/** Rectangular timber piece. `size` is the full XYZ extent in cm. */
export function boxPart(componentId: ComponentId, group: string, size: Vec3, position: Vec3): Draft {
  return {
    componentId,
    group,
    shape: 'box',
    size,
    position,
    materialClass: COMPONENTS[componentId].materialClass,
    lengthCm: Math.max(...size),
  };
}

/** Round piece (dowel, rope, bolt head) along a principal axis. */
export function cylPart(
  componentId: ComponentId,
  group: string,
  axis: 'x' | 'y' | 'z',
  length: number,
  position: Vec3,
  diameter?: number,
): Draft {
  const def = COMPONENTS[componentId];
  const dia = diameter ?? ('dia' in def.section ? def.section.dia : def.section.w);
  return {
    componentId,
    group,
    shape: 'cylinder',
    size: [dia, length, dia],
    axis,
    position,
    materialClass: def.materialClass,
    lengthCm: length,
  };
}

/** Assigns stable sequential identifiers (POST-01, BEAM-03, …). */
export function finalizeParts(drafts: Draft[]): Part[] {
  const counters: Partial<Record<ComponentId, number>> = {};
  return drafts.map((d) => {
    const n = (counters[d.componentId] = (counters[d.componentId] ?? 0) + 1);
    return { ...d, id: `${COMPONENTS[d.componentId].prefix}-${String(n).padStart(2, '0')}` };
  });
}
