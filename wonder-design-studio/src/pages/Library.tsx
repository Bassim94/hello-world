import { COMPONENTS } from '../domain/components';
import { PRODUCTS, UPCOMING } from '../domain/products';
import { useStore } from '../store/useStore';
import { Button, Card, PageTitle, useT } from '../ui/common';

export default function Library() {
  const t = useT();
  const newDraft = useStore((s) => s.newDraft);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <PageTitle title={t('مكتبة المنتجات', 'Product Library')} sub={t('اختر نموذجًا قياسيًا لبدء التخصيص.', 'Pick a standard model to start customising.')} />

      <div className="grid gap-4 md:grid-cols-2">
        {PRODUCTS.map((p) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold text-forest-dark">{t(p.name)}</h2>
              <span className="shrink-0 rounded-full bg-sand px-2.5 py-0.5 text-xs">{t(p.ageRange)}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{t(p.description)}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs" dir="ltr">
              {p.params.map((d) => (
                <div key={d.id} className="rounded-xl bg-sand/60 p-2">
                  <div className="text-muted">{t(d.name)}</div>
                  <div className="text-sm font-bold">{d.default} cm</div>
                  <div className="text-[10px] text-muted">{d.min}–{d.max}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.activities.map((a) => (
                <span key={a.id} className="rounded-full border border-forest/30 bg-forest/5 px-2.5 py-0.5 text-xs text-forest-dark">
                  {t(a.name)}
                </span>
              ))}
              {p.traits.map((tr) => (
                <span key={tr.en} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
                  {t(tr)}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              {t('نطاقات الأبعاد مؤقتة إلى حين التحقق الهندسي.', 'Dimension ranges are provisional until engineering validation.')}
            </p>
            <Button className="mt-3 w-full" onClick={() => newDraft(p.id)}>
              {t('تخصيص في المصمم ثلاثي الأبعاد', 'Customise in 3D Studio')}
            </Button>
          </Card>
        ))}

        <Card className="border-dashed bg-transparent shadow-none">
          <h2 className="font-bold text-muted">{t('قريبًا', 'Coming later')}</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            {UPCOMING.map((u) => (
              <li key={u.en}>• {t(u)}</li>
            ))}
          </ul>
        </Card>
      </div>

      <h2 className="mb-2 mt-6 font-bold">{t('مكتبة المكونات المعيارية', 'Modular component library')}</h2>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-sand/60 text-xs text-muted">
            <tr>
              <th className="p-2.5 text-start">{t('الرمز', 'ID prefix')}</th>
              <th className="p-2.5 text-start">{t('المكوّن', 'Component')}</th>
              <th className="p-2.5 text-start">{t('المادة', 'Material')}</th>
              <th className="p-2.5 text-start">{t('ملاحظة (مبدئي)', 'Note (preliminary)')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {Object.values(COMPONENTS).map((c) => (
              <tr key={c.id}>
                <td className="p-2.5 font-mono text-xs" dir="ltr">{c.prefix}</td>
                <td className="p-2.5 font-medium">{t(c.name)}</td>
                <td className="p-2.5">{c.materialClass}</td>
                <td className="p-2.5 text-xs text-muted">{t(c.note)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
