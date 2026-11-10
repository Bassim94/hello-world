import { useRef, useState } from 'react';
import { ArrowRight, Download, Printer } from 'lucide-react';
import { byId, FINISHES, WOODS } from '../domain/materials';
import { STAGE_LABELS } from '../domain/validation';
import { useStore } from '../store/useStore';
import { Button, fmtDate, useDesign, useMoney, useT } from '../ui/common';

/**
 * Preliminary customer quotation.
 * "Download PDF" rasterises the sheet in the browser so Arabic text renders
 * exactly as on screen. "Print" uses the browser dialog (Save as PDF also works).
 */
export default function Quotation() {
  const t = useT();
  const money = useMoney();
  const { quoteTarget, projects, setView, lang } = useStore();
  const project = projects.find((p) => p.id === quoteTarget?.projectId);
  const cfg = project?.configs.find((c) => c.id === quoteTarget?.configId);
  const sheet = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const design = useDesign(cfg?.config ?? useStore.getState().draft, project?.room ?? null, cfg?.stage ?? 'visual_concept');

  if (!project || !cfg) {
    return (
      <div className="p-6 text-center text-sm text-muted">
        {t('لم يتم اختيار تصميم. افتح مشروعًا واختر "عرض سعر".', 'No design selected. Open a project and choose "Quotation".')}
        <div className="mt-3"><Button onClick={() => setView('projects')}>{t('المشاريع', 'Projects')}</Button></div>
      </div>
    );
  }

  const { product, cost } = design;
  const d = cfg.config.dims;
  const today = new Date();
  const quoteNo = `WQ-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${cfg.id.slice(0, 4).toUpperCase()}`;
  const activities = product.activities.filter((a) => cfg.config.activities[a.id]);
  const approved = cfg.stage === 'engineering_approved' || cfg.stage === 'production_ready';

  const downloadPdf = async () => {
    if (!sheet.current) return;
    setBusy(true);
    setError(null);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
      const canvas = await html2canvas(sheet.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const imgH = (canvas.height * pageW) / canvas.width;
      const img = canvas.toDataURL('image/jpeg', 0.92);
      if (imgH <= pageH * 1.45) {
        // fits (or nearly fits) one page: scale down to a single A4 sheet
        const k = Math.min(1, pageH / imgH);
        pdf.addImage(img, 'JPEG', (pageW * (1 - k)) / 2, 0, pageW * k, imgH * k);
      } else {
        // long content: one tall image, shifted up per page
        for (let offset = 0, page = 0; offset < imgH - 1; offset += pageH, page++) {
          if (page > 0) pdf.addPage();
          pdf.addImage(img, 'JPEG', 0, -offset, pageW, imgH);
        }
      }
      pdf.save(`${quoteNo}.pdf`);
    } catch (err) {
      console.error('Wonder: PDF export failed', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex justify-between gap-4 border-b border-line py-1.5 text-sm">
      <span className="text-muted">{k}</span>
      <span className="text-end font-medium">{v}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl p-3 md:p-6">
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
        <button className="inline-flex min-h-10 items-center gap-1 text-sm text-forest" onClick={() => setView('projects')}>
          <ArrowRight className="size-4 ltr:rotate-180" />
          {t('العودة للمشروع', 'Back to project')}
        </button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => window.print()}><Printer className="size-4" />{t('طباعة', 'Print')}</Button>
          <Button onClick={downloadPdf} disabled={busy}><Download className="size-4" />{busy ? t('جارٍ التجهيز…', 'Preparing…') : t('تنزيل PDF', 'Download PDF')}</Button>
        </div>
      </div>
      {error && <p className="no-print mb-2 text-sm text-red-700">{t('تعذر إنشاء الملف. استخدم "طباعة" ثم "حفظ كـ PDF".', 'PDF export failed. Use "Print" then "Save as PDF".')} ({error})</p>}

      <div ref={sheet} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="print-sheet rounded-2xl border border-line bg-white p-6 shadow-sm md:p-10">
        <div className="flex items-start justify-between gap-4 border-b-2 border-forest pb-4">
          <div>
            <div className="text-2xl font-bold text-forest">Wonder</div>
            <div className="text-xs text-muted">{t('ألعاب خشبية داخلية للأطفال', 'Indoor wooden play equipment for children')}</div>
          </div>
          <div className="text-end">
            <div className="text-lg font-bold">{t('عرض سعر مبدئي', 'Preliminary Quotation')}</div>
            <div className="text-xs text-muted" dir="ltr">{quoteNo}</div>
            <div className="text-xs text-muted">{fmtDate(today.toISOString())}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
          <div>
            <Row k={t('العميل', 'Customer')} v={project.customerName} />
            <Row k={t('مرجع المشروع', 'Project ref.')} v={<span dir="ltr">{project.reference || '—'}</span>} />
            <Row k={t('الجوال', 'Mobile')} v={<span dir="ltr">{project.phone || '—'}</span>} />
          </div>
          <div>
            <Row k={t('التصميم', 'Design')} v={cfg.name} />
            <Row k={t('حالة التصميم', 'Design status')} v={t(STAGE_LABELS[cfg.stage])} />
            <Row
              k={t('أبعاد الغرفة', 'Room')}
              v={<span dir="ltr">{project.room.width != null && project.room.depth != null && project.room.height != null ? `${project.room.width}×${project.room.depth}×${project.room.height} cm` : 'TBD'}</span>}
            />
          </div>
        </div>

        {cfg.snapshot && <img src={cfg.snapshot} alt="" className="mt-5 max-h-80 w-full rounded-xl border border-line object-cover" />}

        <h3 className="mt-5 font-bold text-forest-dark">{t(product.name)}</h3>
        <div className="mt-1 grid gap-x-8 sm:grid-cols-2">
          <div>
            <Row k={t('العرض × العمق × الارتفاع', 'Width × Depth × Height')} v={<span dir="ltr">{d.width} × {d.depth} × {d.height} cm</span>} />
            <Row k={t('الفئة العمرية المستهدفة', 'Target age')} v={t(product.ageRange)} />
          </div>
          <div>
            <Row k={t('الخشب / التشطيب', 'Wood / finish')} v={`${t(byId(WOODS, cfg.config.woodId).name)} / ${t(byId(FINISHES, cfg.config.finishId).name)}`} />
            <Row k={t('الأنشطة', 'Activities')} v={activities.map((a) => t(a.name)).join(lang === 'ar' ? '، ' : ', ') || '—'} />
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-sand/60 p-4">
          <Row k={t('السعر التقديري (شامل التركيب)', 'Estimated price (incl. installation)')} v={money(cost.sellingPrice)} />
          <Row k={`${t('ضريبة القيمة المضافة', 'VAT')} (${useStore.getState().pricing.vatPct}%)`} v={money(cost.vat)} />
          <div className="flex justify-between pt-2 text-lg font-bold text-forest">
            <span>{t('الإجمالي التقديري', 'Estimated total')}</span>
            <span data-testid="quote-total">{money(cost.totalWithVat)}</span>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          <div className="mb-1 font-bold">{t('ملاحظات هامة', 'Important notes')}</div>
          <ul className="space-y-1">
            <li>• {t('هذا عرض مبدئي غير مُلزم؛ السعر تقديري وقابل للتغيير بعد المعاينة والتصميم النهائي.', 'This is a non-binding preliminary quotation; the price is an estimate and may change after site survey and final design.')}</li>
            {!approved && (
              <li>• {t('التصميم المعروض تصور أولي لم يخضع بعد للمراجعة الهندسية، ولا يُعد اعتمادًا للسلامة أو المطابقة.', 'The design shown is an initial concept that has not yet undergone engineering review and is not a safety or compliance approval.')}</li>
            )}
            <li>• {t('الأبعاد النهائية، التثبيت، ومتطلبات أرضية الحماية تُحدَّد بعد المراجعة الهندسية وقياس الموقع.', 'Final dimensions, anchoring and protective flooring requirements are defined after engineering review and site measurement.')}</li>
            <li>• {t('الصورة للتوضيح؛ قد يختلف لون الخشب الطبيعي.', 'Image is illustrative; natural wood colour may vary.')}</li>
            <li>• {t('مدة صلاحية العرض: تُحدَّد لاحقًا.', 'Quotation validity: TBD.')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
