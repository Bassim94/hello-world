import { RotateCcw } from 'lucide-react';
import { WOODS } from '../domain/materials';
import { CATEGORY_LABELS, computeBom, type CostCategory, type PricingSettings } from '../domain/pricing';
import { useActiveProject, useActiveSaved, useStore } from '../store/useStore';
import { Button, Card, fmt, PageTitle, PlaceholderNote, useDesign, useMoney, useT } from '../ui/common';

type NumKey = Exclude<keyof PricingSettings, 'woodPricePerM3'>;

function NumField({ label, value, unit, onChange }: { label: string; value: number; unit: string; onChange(v: number): void }) {
  return (
    <label className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <span className="min-w-0 flex-1">{label}</span>
      <span className="flex items-center gap-1.5" dir="ltr">
        <input
          className="h-10 w-24 rounded-lg border border-line px-2 text-end text-base outline-none focus:border-forest"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={value}
          aria-label={label}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(Number.isFinite(v) && v >= 0 ? v : 0);
          }}
        />
        <span className="w-14 text-xs text-muted">{unit}</span>
      </span>
    </label>
  );
}

export default function CostEstimator() {
  const t = useT();
  const money = useMoney();
  const { draft, pricing, setPricing, resetPricing, setView } = useStore();
  const project = useActiveProject();
  const saved = useActiveSaved();
  const { product, parts, cost } = useDesign(draft, project?.room ?? null, saved?.stage ?? 'visual_concept');
  const bom = computeBom(parts);
  const sar = t('ر.س', 'SAR');

  const groups: { title: string; fields: { key: NumKey; label: string; unit: string }[] }[] = [
    {
      title: t(CATEGORY_LABELS.wood),
      fields: [
        { key: 'woodWastePct', label: t('نسبة الهالك', 'Waste factor'), unit: '%' },
        { key: 'dowelPricePerM', label: t('قضبان خشب صلب', 'Hardwood dowel'), unit: `${sar}/m` },
      ],
    },
    {
      title: t(CATEGORY_LABELS.hardware),
      fields: [
        { key: 'connectorPrice', label: t('طقم ربط', 'Connector set'), unit: sar },
        { key: 'anchorKitPrice', label: t('طقم تثبيت', 'Anchoring kit'), unit: sar },
      ],
    },
    {
      title: t(CATEGORY_LABELS.ropes),
      fields: [
        { key: 'ropePricePerM', label: t('حبل', 'Rope'), unit: `${sar}/m` },
        { key: 'ropeFittingPrice', label: t('مثبت نهاية حبل', 'Rope end fitting'), unit: sar },
      ],
    },
    {
      title: t(CATEGORY_LABELS.cutting_finishing),
      fields: [
        { key: 'cuttingPerPart', label: t('قص القطعة', 'Cutting per part'), unit: sar },
        { key: 'finishingPerM2', label: t('تشطيب', 'Finishing'), unit: `${sar}/m²` },
      ],
    },
    {
      title: t(CATEGORY_LABELS.labor),
      fields: [
        { key: 'laborRatePerHour', label: t('أجر الساعة', 'Hourly rate'), unit: `${sar}/h` },
        { key: 'laborBaseHours', label: t('ساعات أساسية', 'Base hours'), unit: 'h' },
        { key: 'laborHoursPerPart', label: t('ساعات لكل قطعة', 'Hours per part'), unit: 'h' },
      ],
    },
    {
      title: t('التغليف والتركيب', 'Packaging & installation'),
      fields: [
        { key: 'packaging', label: t(CATEGORY_LABELS.packaging), unit: sar },
        { key: 'installation', label: t(CATEGORY_LABELS.installation), unit: sar },
      ],
    },
    {
      title: t('النسب', 'Rates'),
      fields: [
        { key: 'overheadPct', label: t('مصاريف غير مباشرة', 'Overhead'), unit: '%' },
        { key: 'marginPct', label: t('هامش الربح (من سعر البيع)', 'Profit margin (of price)'), unit: '%' },
        { key: 'vatPct', label: t('ضريبة القيمة المضافة', 'VAT'), unit: '%' },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <PageTitle
        title={t('حاسبة التكلفة', 'Cost Estimator')}
        sub={`${saved?.name ?? t(product.name)} · ${draft.dims.width}×${draft.dims.depth}×${draft.dims.height} cm`}
        action={
          <Button variant="ghost" onClick={() => setView('configurator')}>
            {t('العودة للمصمم', 'Back to studio')}
          </Button>
        }
      />
      <PlaceholderNote />

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-xs text-muted">{t('تكلفة الإنتاج التقديرية', 'Estimated production cost')}</div>
          <div className="mt-1 text-2xl font-bold" data-testid="production-cost">{money(cost.productionCost)}</div>
        </Card>
        <Card className="border-forest/40 bg-forest/5">
          <div className="text-xs text-muted">{t('سعر البيع (قبل الضريبة)', 'Selling price (excl. VAT)')}</div>
          <div className="mt-1 text-2xl font-bold text-forest" data-testid="selling-price">{money(cost.sellingPrice)}</div>
          <div className="text-xs text-muted">{t('شامل الضريبة', 'Incl. VAT')}: {money(cost.totalWithVat)}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted">{t('إجمالي الهامش', 'Gross margin')}</div>
          <div className="mt-1 text-2xl font-bold">{money(cost.grossMargin)}</div>
          <div className="text-xs text-muted" dir="ltr">{cost.grossMarginPct.toFixed(1)}%</div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="p-0">
            <h2 className="p-4 pb-2 font-bold">{t('تفصيل التكلفة', 'Cost breakdown')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-sm">
                <thead className="bg-sand/60 text-xs text-muted">
                  <tr>
                    <th className="p-2 ps-4 text-start">{t('البند', 'Item')}</th>
                    <th className="p-2 text-end">{t('الكمية', 'Qty')}</th>
                    <th className="p-2 text-end">{t('سعر الوحدة', 'Unit')}</th>
                    <th className="p-2 pe-4 text-end">{t('الإجمالي', 'Total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(CATEGORY_LABELS) as CostCategory[]).map((cat) => {
                    const lines = cost.lines.filter((l) => l.category === cat);
                    if (!lines.length) return null;
                    return [
                      <tr key={cat} className="border-t border-line bg-cream/60">
                        <td className="p-2 ps-4 font-semibold" colSpan={3}>{t(CATEGORY_LABELS[cat])}</td>
                        <td className="p-2 pe-4 text-end font-semibold">{fmt(cost.byCategory[cat])}</td>
                      </tr>,
                      ...lines.map((l) => (
                        <tr key={cat + l.label.en} className="text-muted">
                          <td className="p-1.5 ps-6">{t(l.label)}</td>
                          <td className="p-1.5 text-end" dir="ltr">{fmt(l.qty, 2)} {t(l.unit)}</td>
                          <td className="p-1.5 text-end">{fmt(l.unitPrice, 2)}</td>
                          <td className="p-1.5 pe-4 text-end">{fmt(l.total)}</td>
                        </tr>
                      )),
                    ];
                  })}
                </tbody>
                <tfoot className="border-t-2 border-line text-sm">
                  <tr><td className="p-2 ps-4" colSpan={3}>{t('التكلفة المباشرة', 'Direct cost')}</td><td className="p-2 pe-4 text-end">{fmt(cost.directCost)}</td></tr>
                  <tr><td className="p-2 ps-4" colSpan={3}>{t('مصاريف غير مباشرة', 'Overhead')} ({pricing.overheadPct}%)</td><td className="p-2 pe-4 text-end">{fmt(cost.overhead)}</td></tr>
                  <tr className="font-bold"><td className="p-2 ps-4" colSpan={3}>{t('تكلفة الإنتاج', 'Production cost')}</td><td className="p-2 pe-4 text-end">{fmt(cost.productionCost)}</td></tr>
                  <tr><td className="p-2 ps-4" colSpan={3}>{t('هامش الربح', 'Profit margin')} ({pricing.marginPct}%)</td><td className="p-2 pe-4 text-end">{fmt(cost.grossMargin)}</td></tr>
                  <tr className="bg-forest/5 font-bold text-forest"><td className="p-2 ps-4" colSpan={3}>{t('سعر البيع', 'Selling price')}</td><td className="p-2 pe-4 text-end">{fmt(cost.sellingPrice)}</td></tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card className="p-0">
            <h2 className="p-4 pb-1 font-bold">{t('قائمة مواد مبدئية', 'Preliminary bill of materials')}</h2>
            <p className="px-4 pb-2 text-xs text-muted">{t('كميات تقديرية من النموذج — ليست قائمة قص للتصنيع.', 'Estimated from the model — not a manufacturing cut list.')}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-sm">
                <thead className="bg-sand/60 text-xs text-muted">
                  <tr>
                    <th className="p-2 ps-4 text-start">{t('المكوّن', 'Component')}</th>
                    <th className="p-2 text-end">{t('المقطع', 'Section')}</th>
                    <th className="p-2 text-end">{t('الطول', 'Length')}</th>
                    <th className="p-2 pe-4 text-end">{t('العدد', 'Qty')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {bom.map((b) => (
                    <tr key={b.componentId + b.lengthCm}>
                      <td className="p-2 ps-4">{t(b.name)}</td>
                      <td className="p-2 text-end" dir="ltr">{b.section}</td>
                      <td className="p-2 text-end" dir="ltr">{b.componentId === 'connector' ? '—' : `${b.lengthCm} cm`}</td>
                      <td className="p-2 pe-4 text-end">{b.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-bold">{t('إعدادات الأسعار (قابلة للتعديل)', 'Pricing settings (editable)')}</h2>
            <Button
              variant="ghost"
              className="min-h-9 px-2.5 text-xs"
              onClick={() => confirm(t('إعادة كل الأسعار للقيم الافتراضية؟', 'Reset all prices to placeholders?')) && resetPricing()}
            >
              <RotateCcw className="size-3.5" />
              {t('إعادة ضبط', 'Reset')}
            </Button>
          </div>
          <div className="mb-1 mt-2 text-xs font-semibold text-forest">{t('سعر الخشب', 'Timber price')}</div>
          {WOODS.map((w) => (
            <NumField
              key={w.id}
              label={`${t(w.name)}${w.id === draft.woodId ? ' ✓' : ''}`}
              unit={`${sar}/m³`}
              value={pricing.woodPricePerM3[w.id] ?? 0}
              onChange={(v) => setPricing({ woodPricePerM3: { ...pricing.woodPricePerM3, [w.id]: v } })}
            />
          ))}
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-1 mt-3 text-xs font-semibold text-forest">{g.title}</div>
              {g.fields.map((f) => (
                <NumField key={f.key} label={f.label} unit={f.unit} value={pricing[f.key]} onChange={(v) => setPricing({ [f.key]: v })} />
              ))}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
