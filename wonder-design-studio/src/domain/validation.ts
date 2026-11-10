import { getProduct } from './products';
import type { DesignStage, Issue, LText, ProductConfig, RoomDims } from './types';

/**
 * PROVISIONAL clearance allowances used only to raise warnings.
 * They are NOT taken from a standard; the required free space and
 * fall zone must be defined by the engineering review.
 */
export const PROVISIONAL_SIDE_CLEARANCE_CM = 150;
export const PROVISIONAL_HEADROOM_CM = 30;

export const STAGES: DesignStage[] = [
  'visual_concept',
  'preliminary_design',
  'engineering_approved',
  'production_ready',
];

export const STAGE_LABELS: Record<DesignStage, LText> = {
  visual_concept: { ar: 'تصور بصري', en: 'Visual concept' },
  preliminary_design: { ar: 'تصميم مبدئي', en: 'Preliminary design' },
  engineering_approved: { ar: 'معتمد هندسيًا', en: 'Engineering-approved' },
  production_ready: { ar: 'جاهز للإنتاج', en: 'Production-ready' },
};

export function validateConfig(
  config: ProductConfig,
  room: RoomDims | null,
  stage: DesignStage,
): Issue[] {
  const product = getProduct(config.productId);
  const issues: Issue[] = [];

  for (const p of product.params) {
    const v = config.dims[p.id];
    if (v < p.min || v > p.max) {
      issues.push({
        code: `range_${p.id}`,
        severity: 'blocker',
        message: {
          ar: `${p.name.ar} (${v} سم) خارج النطاق المؤقت ${p.min}–${p.max} سم.`,
          en: `${p.name.en} (${v} cm) is outside the provisional range ${p.min}–${p.max} cm.`,
        },
      });
    }
  }

  issues.push(...product.validate(config));

  // Room fit and clearance
  const { width: W, depth: D, height: H } = config.dims;
  if (!room || room.width == null || room.depth == null || room.height == null) {
    issues.push({
      code: 'room_missing',
      severity: 'warning',
      message: {
        ar: 'أبعاد الغرفة غير مُدخلة؛ لا يمكن فحص الملاءمة والخلوص.',
        en: 'Room dimensions not entered; fit and clearance cannot be checked.',
      },
    });
  } else {
    if (W > room.width || D > room.depth || H > room.height) {
      issues.push({
        code: 'room_no_fit',
        severity: 'blocker',
        message: {
          ar: 'المنتج أكبر من أبعاد الغرفة المتاحة.',
          en: 'The product is larger than the available room.',
        },
      });
    } else {
      const sideX = (room.width - W) / 2;
      const sideZ = (room.depth - D) / 2;
      const side = Math.min(sideX, sideZ);
      if (side < PROVISIONAL_SIDE_CLEARANCE_CM) {
        issues.push({
          code: 'room_side_clearance',
          severity: 'warning',
          message: {
            ar: `الخلوص الجانبي المتاح ≈ ${Math.round(side)} سم (عند التوسيط) أقل من القيمة المؤقتة ${PROVISIONAL_SIDE_CLEARANCE_CM} سم. منطقة السقوط والخلوص يحددها المهندس.`,
            en: `Available side clearance ≈ ${Math.round(side)} cm (centred) is below the provisional ${PROVISIONAL_SIDE_CLEARANCE_CM} cm allowance. Fall zone and clearances must be set by engineering.`,
          },
        });
      }
      const head = room.height - H;
      if (head < PROVISIONAL_HEADROOM_CM) {
        issues.push({
          code: 'room_headroom',
          severity: 'warning',
          message: {
            ar: `المسافة إلى السقف ≈ ${Math.round(head)} سم أقل من القيمة المؤقتة ${PROVISIONAL_HEADROOM_CM} سم.`,
            en: `Ceiling gap ≈ ${Math.round(head)} cm is below the provisional ${PROVISIONAL_HEADROOM_CM} cm allowance.`,
          },
        });
      }
    }
  }

  // Standing engineering caveats — always present until approval is recorded.
  if (stage === 'visual_concept' || stage === 'preliminary_design') {
    issues.push({
      code: 'no_engineering_approval',
      severity: 'warning',
      message: {
        ar: 'لا يوجد اعتماد هندسي. قدرة التحمل، التثبيت، والمطابقة للمواصفات لم تُقيَّم. هذا التصميم ليس للإنتاج.',
        en: 'No engineering approval. Load capacity, anchoring and standards compliance are not assessed. Not for production.',
      },
    });
  }
  issues.push({
    code: 'provisional_ranges',
    severity: 'info',
    message: {
      ar: 'جميع نطاقات الأبعاد والمقاطع مؤقتة إلى حين التحقق الهندسي.',
      en: 'All dimension ranges and sections are provisional until engineering validation.',
    },
  });

  return issues;
}

export const hasBlockers = (issues: Issue[]) => issues.some((i) => i.severity === 'blocker');
