import type { LText } from './types';

export interface WoodOption {
  id: string;
  name: LText;
  color: string;
  /** Placeholder density, kg/m³ — for rough weight indication only. */
  densityKgM3: number;
}

/** Wood choices. Properties are PLACEHOLDERS pending supplier/engineering data. */
export const WOODS: WoodOption[] = [
  { id: 'beech', name: { ar: 'خشب الزان', en: 'Beech' }, color: '#d9b98c', densityKgM3: 700 },
  { id: 'birch_ply', name: { ar: 'أبلكاش بتولا', en: 'Birch plywood' }, color: '#e6d2ad', densityKgM3: 680 },
  { id: 'pine', name: { ar: 'خشب الصنوبر', en: 'Pine' }, color: '#e3c58d', densityKgM3: 500 },
];

export interface FinishOption {
  id: string;
  name: LText;
  /** Tint blended over the wood colour. null = clear finish. */
  tint: string | null;
  strength: number;
}

export const FINISHES: FinishOption[] = [
  { id: 'natural', name: { ar: 'طبيعي شفاف', en: 'Natural clear' }, tint: null, strength: 0 },
  { id: 'honey', name: { ar: 'عسلي', en: 'Honey' }, tint: '#c98a3c', strength: 0.35 },
  { id: 'walnut', name: { ar: 'جوزي', en: 'Walnut' }, tint: '#6b4a2f', strength: 0.6 },
  { id: 'whitewash', name: { ar: 'أبيض معتّق', en: 'Whitewash' }, tint: '#f6f1e7', strength: 0.6 },
];

export interface RopeColor {
  id: string;
  name: LText;
  color: string;
}

export const ROPE_COLORS: RopeColor[] = [
  { id: 'natural', name: { ar: 'طبيعي', en: 'Natural' }, color: '#cdb892' },
  { id: 'sage', name: { ar: 'أخضر هادئ', en: 'Sage' }, color: '#8aa38f' },
  { id: 'clay', name: { ar: 'طيني', en: 'Terracotta' }, color: '#c98263' },
];

export const byId = <T extends { id: string }>(list: T[], id: string): T =>
  list.find((x) => x.id === id) ?? list[0];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Final display colour of the wood = species colour blended with the finish tint. */
export function woodDisplayColor(woodId: string, finishId: string): string {
  const wood = byId(WOODS, woodId);
  const finish = byId(FINISHES, finishId);
  if (!finish.tint) return wood.color;
  const a = hexToRgb(wood.color);
  const b = hexToRgb(finish.tint);
  const mix = a.map((v, i) => Math.round(v + (b[i] - v) * finish.strength));
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
