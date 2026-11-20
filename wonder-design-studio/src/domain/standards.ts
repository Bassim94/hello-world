import type { LText } from './types';

/**
 * Candidate requirements for the ENGINEERING REVIEW to assess.
 * This list is a starting checklist only. Applicability, current editions
 * and Saudi adoption status are NOT verified by this software and must be
 * confirmed with SASO / an accredited conformity body.
 */
export interface StandardRef {
  ref: string;
  scope: LText;
}

export const STANDARDS_FOR_REVIEW: StandardRef[] = [
  {
    ref: 'SASO / SABER',
    scope: {
      ar: 'متطلبات المطابقة السعودية وتسجيل المنتج عبر منصة سابر — يُحدَّد التصنيف واللائحة المنطبقة.',
      en: 'Saudi conformity requirements and product registration via SABER — classification and applicable regulation to be determined.',
    },
  },
  {
    ref: 'GSO — Gulf Technical Regulation on Toys (G-Mark)',
    scope: {
      ar: 'اللائحة الفنية الخليجية للعب الأطفال — يُتحقق من انطباقها على ألعاب النشاط المنزلية.',
      en: 'Gulf toy regulation — confirm whether domestic activity toys fall in scope.',
    },
  },
  {
    ref: 'EN 71-8 / ISO 8124-4',
    scope: {
      ar: 'ألعاب النشاط للاستخدام المنزلي (التسلق، التعلق، الثبات، الانحشار).',
      en: 'Activity toys for domestic use (climbing, hanging, stability, entrapment).',
    },
  },
  {
    ref: 'EN 71-1 / EN 71-3',
    scope: {
      ar: 'الخواص الميكانيكية والفيزيائية؛ هجرة العناصر من الدهانات والتشطيبات.',
      en: 'Mechanical/physical properties; migration of elements from coatings and finishes.',
    },
  },
  {
    ref: 'EN 1176-1 / EN 1177',
    scope: {
      ar: 'معدات الملاعب العامة والأسطح الماصّة للصدمات — عند التركيب في حضانات أو مواقع تجارية.',
      en: 'Public playground equipment and impact-attenuating surfacing — if installed in nurseries or commercial sites.',
    },
  },
  {
    ref: 'ASTM F1148 / ASTM F1487',
    scope: {
      ar: 'مرجع بديل: معدات اللعب المنزلية / العامة.',
      en: 'Alternative reference: home / public playground equipment.',
    },
  },
];
