import type { LText, ProductDefinition } from '../types';
import { jungleGym } from './jungleGym';

/** Product registry. Add new product families here. */
export const PRODUCTS: ProductDefinition[] = [jungleGym];

export const getProduct = (id: string): ProductDefinition =>
  PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];

/** Roadmap placeholders shown in the library (not configurable yet). */
export const UPCOMING: LText[] = [
  { ar: 'برج التعلّم', en: 'Learning Tower' },
  { ar: 'مثلث التسلق', en: 'Climbing Triangle' },
  { ar: 'جدار التسلق الداخلي', en: 'Indoor Climbing Wall' },
];
