import { COMPONENTS } from './components';
import type { ComponentId, LText, Part, ProductConfig } from './types';

/**
 * Editable pricing model (SAR).
 * EVERY default below is a PLACEHOLDER chosen only so the calculation runs.
 * None is a supplier quotation or a verified cost.
 */
export interface PricingSettings {
  woodPricePerM3: Record<string, number>;
  woodWastePct: number;
  dowelPricePerM: number;
  connectorPrice: number;
  anchorKitPrice: number;
  ropePricePerM: number;
  ropeFittingPrice: number;
  cuttingPerPart: number;
  finishingPerM2: number;
  laborRatePerHour: number;
  laborBaseHours: number;
  laborHoursPerPart: number;
  packaging: number;
  installation: number;
  overheadPct: number;
  /** Profit margin as % of selling price. */
  marginPct: number;
  vatPct: number;
}

export const DEFAULT_PRICING: PricingSettings = {
  woodPricePerM3: { beech: 4500, birch_ply: 3800, pine: 2200 },
  woodWastePct: 15,
  dowelPricePerM: 18,
  connectorPrice: 6,
  anchorKitPrice: 120,
  ropePricePerM: 9,
  ropeFittingPrice: 4,
  cuttingPerPart: 8,
  finishingPerM2: 45,
  laborRatePerHour: 35,
  laborBaseHours: 6,
  laborHoursPerPart: 0.15,
  packaging: 150,
  installation: 400,
  overheadPct: 15,
  marginPct: 35,
  vatPct: 15,
};

export interface Quantities {
  woodVolumeM3: number;
  woodSurfaceM2: number;
  woodPartCount: number;
  dowelLengthM: number;
  dowelCount: number;
  ropeLengthM: number;
  ropeCount: number;
  connectorCount: number;
  partCount: number;
}

export function computeQuantities(parts: Part[]): Quantities {
  const q: Quantities = {
    woodVolumeM3: 0,
    woodSurfaceM2: 0,
    woodPartCount: 0,
    dowelLengthM: 0,
    dowelCount: 0,
    ropeLengthM: 0,
    ropeCount: 0,
    connectorCount: 0,
    partCount: parts.length,
  };
  for (const p of parts) {
    switch (p.materialClass) {
      case 'wood': {
        const [x, y, z] = p.size;
        q.woodVolumeM3 += (x * y * z) / 1e6;
        q.woodSurfaceM2 += (2 * (x * y + y * z + x * z)) / 1e4;
        q.woodPartCount++;
        break;
      }
      case 'dowel':
        q.dowelLengthM += p.lengthCm / 100;
        q.dowelCount++;
        break;
      case 'rope':
        q.ropeLengthM += p.lengthCm / 100;
        q.ropeCount++;
        break;
      case 'metal':
        q.connectorCount++;
        break;
    }
  }
  return q;
}

export interface BomLine {
  componentId: ComponentId;
  name: LText;
  section: string;
  lengthCm: number;
  qty: number;
}

/** Preliminary bill of materials: identical pieces grouped together. */
export function computeBom(parts: Part[]): BomLine[] {
  const map = new Map<string, BomLine>();
  for (const p of parts) {
    const def = COMPONENTS[p.componentId];
    const section = 'dia' in def.section ? `Ø${def.section.dia}` : `${def.section.w}×${def.section.h}`;
    const len = Math.round(p.lengthCm * 10) / 10;
    const key = `${p.componentId}|${len}`;
    const line = map.get(key);
    if (line) line.qty++;
    else map.set(key, { componentId: p.componentId, name: def.name, section, lengthCm: len, qty: 1 });
  }
  return [...map.values()];
}

export type CostCategory =
  | 'wood'
  | 'hardware'
  | 'ropes'
  | 'cutting_finishing'
  | 'labor'
  | 'packaging'
  | 'installation';

export interface CostLine {
  category: CostCategory;
  label: LText;
  qty: number;
  unit: LText;
  unitPrice: number;
  total: number;
}

export interface CostResult {
  quantities: Quantities;
  lines: CostLine[];
  byCategory: Record<CostCategory, number>;
  directCost: number;
  overhead: number;
  productionCost: number;
  sellingPrice: number;
  grossMargin: number;
  grossMarginPct: number;
  vat: number;
  totalWithVat: number;
}

export const CATEGORY_LABELS: Record<CostCategory, LText> = {
  wood: { ar: 'المواد الخشبية', en: 'Wood materials' },
  hardware: { ar: 'العتاد وعناصر الربط', en: 'Hardware & connectors' },
  ropes: { ar: 'الحبال والملحقات', en: 'Ropes & accessories' },
  cutting_finishing: { ar: 'القص والتشطيب', en: 'Cutting & finishing' },
  labor: { ar: 'العمالة', en: 'Labor' },
  packaging: { ar: 'التغليف', en: 'Packaging' },
  installation: { ar: 'التركيب', en: 'Installation' },
};

const U = {
  m3: { ar: 'م³', en: 'm³' },
  m: { ar: 'م', en: 'm' },
  m2: { ar: 'م²', en: 'm²' },
  pc: { ar: 'قطعة', en: 'pc' },
  h: { ar: 'ساعة', en: 'h' },
  lot: { ar: 'مقطوع', en: 'lot' },
};

export function computeCost(parts: Part[], config: ProductConfig, pr: PricingSettings): CostResult {
  const q = computeQuantities(parts);
  const lines: CostLine[] = [];
  const add = (category: CostCategory, label: LText, qty: number, unit: LText, unitPrice: number) => {
    if (qty > 0) lines.push({ category, label, qty, unit, unitPrice, total: qty * unitPrice });
  };

  const woodPrice = pr.woodPricePerM3[config.woodId] ?? 0;
  add('wood', { ar: `خشب (شامل هالك ${pr.woodWastePct}%)`, en: `Timber (incl. ${pr.woodWastePct}% waste)` },
    q.woodVolumeM3 * (1 + pr.woodWastePct / 100), U.m3, woodPrice);
  add('wood', { ar: 'قضبان خشب صلب', en: 'Hardwood dowels' }, q.dowelLengthM, U.m, pr.dowelPricePerM);
  add('hardware', { ar: 'أطقم ربط', en: 'Connector sets' }, q.connectorCount, U.pc, pr.connectorPrice);
  add('hardware', { ar: 'طقم تثبيت (يحدده المهندس)', en: 'Anchoring kit (TBD by engineering)' }, 1, U.lot, pr.anchorKitPrice);
  add('ropes', { ar: 'حبل', en: 'Rope' }, q.ropeLengthM, U.m, pr.ropePricePerM);
  add('ropes', { ar: 'نهايات ومثبتات الحبال', en: 'Rope end fittings' }, q.ropeCount * 2, U.pc, pr.ropeFittingPrice);
  add('cutting_finishing', { ar: 'قص القطع', en: 'Cutting' }, q.woodPartCount + q.dowelCount, U.pc, pr.cuttingPerPart);
  add('cutting_finishing', { ar: 'صنفرة وتشطيب', en: 'Sanding & finishing' }, q.woodSurfaceM2, U.m2, pr.finishingPerM2);
  add('labor', { ar: 'تجميع وعمالة', en: 'Assembly labor' },
    pr.laborBaseHours + pr.laborHoursPerPart * q.partCount, U.h, pr.laborRatePerHour);
  add('packaging', { ar: 'تغليف', en: 'Packaging' }, 1, U.lot, pr.packaging);
  add('installation', { ar: 'تركيب بالموقع', en: 'On-site installation' }, 1, U.lot, pr.installation);

  const byCategory = Object.fromEntries(
    (Object.keys(CATEGORY_LABELS) as CostCategory[]).map((c) => [
      c,
      lines.filter((l) => l.category === c).reduce((s, l) => s + l.total, 0),
    ]),
  ) as Record<CostCategory, number>;

  const directCost = lines.reduce((s, l) => s + l.total, 0);
  const overhead = (directCost * pr.overheadPct) / 100;
  const productionCost = directCost + overhead;
  const margin = Math.min(Math.max(pr.marginPct, 0), 95) / 100;
  const sellingPrice = productionCost / (1 - margin);
  const grossMargin = sellingPrice - productionCost;
  const vat = (sellingPrice * pr.vatPct) / 100;

  return {
    quantities: q,
    lines,
    byCategory,
    directCost,
    overhead,
    productionCost,
    sellingPrice,
    grossMargin,
    grossMarginPct: sellingPrice > 0 ? (grossMargin / sellingPrice) * 100 : 0,
    vat,
    totalWithVat: sellingPrice + vat,
  };
}
