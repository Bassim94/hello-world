import { Boxes, FolderPlus } from 'lucide-react';
import { STANDARDS_FOR_REVIEW } from '../domain/standards';
import { STAGE_LABELS, STAGES } from '../domain/validation';
import type { DesignStage, LText } from '../domain/types';
import { useStore } from '../store/useStore';
import { Button, Card, fmtDate, PageTitle, StageBadge, useT } from '../ui/common';

const STAGE_HELP: Record<DesignStage, LText> = {
  visual_concept: { ar: 'عرض شكلي للعميل فقط. لا تحقق من أي شيء.', en: 'Customer-facing visual only. Nothing verified.' },
  preliminary_design: { ar: 'أبعاد وغرفة وكميات مبدئية. بانتظار المراجعة الهندسية.', en: 'Dimensions, room and quantities drafted. Awaiting engineering review.' },
  engineering_approved: { ar: 'يُسجَّل يدويًا بعد اعتماد مهندس مؤهل خارج النظام.', en: 'Recorded manually after a qualified engineer approves outside the software.' },
  production_ready: { ar: 'يُسجَّل يدويًا بعد اكتمال وثائق التصنيع والاختبارات.', en: 'Recorded manually once manufacturing documents and tests are complete.' },
};

export default function Dashboard() {
  const t = useT();
  const { projects, setView, newDraft } = useStore();
  const configs = projects.flatMap((p) => p.configs);
  const pending = configs.filter((c) => c.stage === 'visual_concept' || c.stage === 'preliminary_design').length;
  const kpis = [
    { label: t('مشاريع العملاء', 'Customer projects'), value: projects.length },
    { label: t('التصاميم المحفوظة', 'Saved designs'), value: configs.length },
    { label: t('بانتظار الاعتماد الهندسي', 'Awaiting engineering approval'), value: pending },
  ];

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <PageTitle
        title={t('مرحبًا بك في استوديو وندر', 'Welcome to Wonder Design Studio')}
        sub={t('صمّم، سعّر، واعرض على العميل خلال الزيارة.', 'Design, price and present during the customer visit.')}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Button className="min-h-14 text-base" onClick={() => setView('projects')}>
          <FolderPlus className="size-5" />
          {t('مشروع عميل جديد', 'New customer project')}
        </Button>
        <Button variant="accent" className="min-h-14 text-base" onClick={() => newDraft('jungle_gym')}>
          <Boxes className="size-5" />
          {t('ابدأ تصميم جنغل جيم', 'Start a Jungle Gym design')}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="text-center">
            <div className="text-2xl font-bold text-forest">{k.value}</div>
            <div className="mt-1 text-xs text-muted">{k.label}</div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">{t('أحدث المشاريع', 'Recent projects')}</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-muted">{t('لا توجد مشاريع بعد.', 'No projects yet.')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {projects.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <button
                    className="flex min-h-12 w-full items-center justify-between gap-2 py-2 text-start hover:bg-sand/50"
                    onClick={() => {
                      useStore.getState().setActiveProject(p.id);
                      setView('projects');
                    }}
                  >
                    <span>
                      <span className="font-medium">{p.customerName}</span>
                      {p.reference && <span className="ms-2 text-xs text-muted" dir="ltr">{p.reference}</span>}
                    </span>
                    <span className="text-xs text-muted">
                      {p.configs.length} {t('تصميم', 'designs')} · {fmtDate(p.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-bold">{t('مراحل نضج التصميم', 'Design maturity stages')}</h2>
          <ol className="space-y-2.5">
            {STAGES.map((st, i) => (
              <li key={st} className="flex gap-2 text-sm">
                <span className="mt-0.5 w-4 shrink-0 text-muted">{i + 1}</span>
                <div>
                  <StageBadge stage={st} />
                  <p className="mt-1 text-xs leading-relaxed text-muted">{t(STAGE_HELP[st])}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-xl bg-sand/60 p-2.5 text-xs leading-relaxed">
            {t(
              `النظام لا يرفع التصميم تلقائيًا فوق "${STAGE_LABELS.preliminary_design.ar}". النموذج ثلاثي الأبعاد لا يثبت قدرة التحمل أو التثبيت أو المطابقة.`,
              `The software never promotes a design beyond "${STAGE_LABELS.preliminary_design.en}" automatically. The 3D model is not evidence of load capacity, anchoring suitability or compliance.`,
            )}
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="font-bold">{t('متطلبات ومواصفات للمراجعة الهندسية', 'Requirements & standards for engineering review')}</h2>
          <p className="mb-3 mt-1 text-xs text-muted">
            {t(
              'قائمة مبدئية فقط. الانطباق والإصدارات الحالية غير مُتحقق منها ويجب تأكيدها مع الهيئة السعودية للمواصفات (SASO) أو جهة مطابقة معتمدة.',
              'Starting checklist only. Applicability and current editions are not verified and must be confirmed with SASO or an accredited conformity body.',
            )}
          </p>
          <ul className="grid gap-2 md:grid-cols-2">
            {STANDARDS_FOR_REVIEW.map((s) => (
              <li key={s.ref} className="rounded-xl border border-line p-2.5 text-sm">
                <div className="font-semibold" dir="ltr" style={{ textAlign: 'start' }}>{s.ref}</div>
                <div className="mt-0.5 text-xs leading-relaxed text-muted">{t(s.scope)}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
