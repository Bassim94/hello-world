import { useState } from 'react';
import { ArrowRight, FileText, FolderPlus, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { getProduct } from '../domain/products';
import { hasBlockers, STAGE_LABELS, STAGES, validateConfig } from '../domain/validation';
import type { DesignStage, Project, SavedConfig } from '../domain/types';
import { useActiveProject, useStore } from '../store/useStore';
import { Button, Card, Field, fmtDate, inputCls, IssueList, PageTitle, StageBadge, useT } from '../ui/common';
import ProjectForm, { Modal } from '../ui/ProjectForm';

function StageDialog({ project, cfg, onClose }: { project: Project; cfg: SavedConfig; onClose(): void }) {
  const t = useT();
  const setStage = useStore((s) => s.setStage);
  const [target, setTarget] = useState<DesignStage>(cfg.stage);
  const [engineer, setEngineer] = useState(cfg.approval?.engineer ?? '');
  const [reference, setReference] = useState(cfg.approval?.reference ?? '');
  const [ack, setAck] = useState(false);

  const issues = validateConfig(cfg.config, project.room, cfg.stage);
  const blockers = hasBlockers(issues);
  const roomOk = project.room.width != null && project.room.depth != null && project.room.height != null;

  // Gate rules. The software records decisions; it does not make them.
  let blockedReason: string | null = null;
  if (target === 'preliminary_design' && (blockers || !roomOk))
    blockedReason = t('يتطلب إدخال أبعاد الغرفة وعدم وجود أخطاء مانعة.', 'Requires room dimensions and no blocking issues.');
  if (target === 'engineering_approved') {
    if (blockers) blockedReason = t('توجد أخطاء مانعة في التصميم.', 'The design has blocking issues.');
    else if (!engineer.trim() || !reference.trim())
      blockedReason = t('أدخل اسم المهندس المعتمِد ومرجع وثيقة الاعتماد.', 'Enter the approving engineer and the approval document reference.');
    else if (!ack) blockedReason = t('أكّد الإقرار أدناه.', 'Confirm the acknowledgement below.');
  }
  if (target === 'production_ready') {
    if (cfg.stage !== 'engineering_approved' && cfg.stage !== 'production_ready')
      blockedReason = t('يجب تسجيل الاعتماد الهندسي أولًا.', 'Engineering approval must be recorded first.');
    else if (!ack) blockedReason = t('أكّد الإقرار أدناه.', 'Confirm the acknowledgement below.');
  }

  return (
    <Modal title={t('مرحلة التصميم', 'Design stage')} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid gap-2">
          {STAGES.map((st) => (
            <label key={st} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 ${target === st ? 'border-forest bg-forest/5' : 'border-line'}`}>
              <input type="radio" name="stage" checked={target === st} onChange={() => { setTarget(st); setAck(false); }} />
              <span className="text-sm font-medium">{t(STAGE_LABELS[st])}</span>
            </label>
          ))}
        </div>

        {target === 'engineering_approved' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('المهندس المعتمِد', 'Approving engineer')}>
              <input className={inputCls} value={engineer} onChange={(e) => setEngineer(e.target.value)} />
            </Field>
            <Field label={t('مرجع وثيقة الاعتماد', 'Approval document ref.')}>
              <input className={inputCls} dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
          </div>
        )}
        {(target === 'engineering_approved' || target === 'production_ready') && (
          <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            <input type="checkbox" className="mt-0.5 size-4" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>
              {target === 'engineering_approved'
                ? t('أقرّ بأن مهندسًا مؤهلًا راجع هذا التصميم واعتمده خارج هذا النظام، وأن النظام يسجّل القرار فقط ولا يتحقق منه.', 'I confirm a qualified engineer reviewed and approved this exact design outside this software. The software only records the decision; it does not verify it.')
                : t('أقرّ باكتمال وثائق التصنيع والاختبارات المطلوبة خارج هذا النظام.', 'I confirm manufacturing documents and required tests were completed outside this software.')}
            </span>
          </label>
        )}

        {blockedReason && target !== cfg.stage && <p className="text-sm text-red-700">{blockedReason}</p>}
        <IssueList issues={issues.filter((i) => i.severity !== 'info')} />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('إلغاء', 'Cancel')}</Button>
          <Button
            disabled={!!blockedReason || target === cfg.stage}
            onClick={() => {
              setStage(project.id, cfg.id, target, { engineer: engineer.trim(), reference: reference.trim(), date: new Date().toISOString() });
              onClose();
            }}
          >
            {t('تسجيل المرحلة', 'Record stage')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ProjectDetail({ project }: { project: Project }) {
  const t = useT();
  const s = useStore();
  const [editing, setEditing] = useState(false);
  const [stageFor, setStageFor] = useState<SavedConfig | null>(null);
  const r = project.room;

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <button className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm text-forest" onClick={() => s.setActiveProject(null)}>
        <ArrowRight className="size-4 ltr:rotate-180" />
        {t('كل المشاريع', 'All projects')}
      </button>
      <PageTitle
        title={project.customerName}
        sub={[project.reference, project.phone].filter(Boolean).join(' · ') || undefined}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditing(true)}><Pencil className="size-4" />{t('تعديل', 'Edit')}</Button>
            <Button
              variant="danger"
              onClick={() => confirm(t('حذف المشروع وكل تصاميمه نهائيًا؟', 'Permanently delete this project and all its designs?')) && s.deleteProject(project.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        }
      />

      <Card>
        <div className="grid grid-cols-3 gap-2 text-center text-sm" dir="ltr">
          {([['width', t('عرض الغرفة', 'Room width')], ['depth', t('عمق الغرفة', 'Room depth')], ['height', t('ارتفاع الغرفة', 'Room height')]] as const).map(([k, label]) => (
            <div key={k} className="rounded-xl bg-sand/60 p-2">
              <div className="text-xs text-muted">{label}</div>
              <div className="font-bold">{r[k] != null ? `${r[k]} cm` : 'TBD'}</div>
            </div>
          ))}
        </div>
        {project.notes && <p className="mt-3 text-sm text-muted">{project.notes}</p>}
      </Card>

      <div className="mb-2 mt-5 flex items-center justify-between">
        <h2 className="font-bold">{t('التصاميم المحفوظة', 'Saved designs')}</h2>
        <Button onClick={() => { s.setActiveProject(project.id); s.newDraft('jungle_gym'); }}>
          <Plus className="size-4" />{t('تصميم جديد', 'New design')}
        </Button>
      </div>

      {project.configs.length === 0 && <p className="text-sm text-muted">{t('لا توجد تصاميم محفوظة لهذا العميل بعد.', 'No saved designs for this customer yet.')}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {project.configs.map((c) => {
          const d = c.config.dims;
          return (
            <Card key={c.id} className="flex flex-col gap-3">
              <div className="flex gap-3">
                {c.snapshot ? (
                  <img src={c.snapshot} alt="" className="h-20 w-28 shrink-0 rounded-xl border border-line object-cover" />
                ) : (
                  <div className="h-20 w-28 shrink-0 rounded-xl bg-sand" />
                )}
                <div className="min-w-0">
                  <div className="truncate font-semibold">{c.name}</div>
                  <div className="text-xs text-muted">{t(getProduct(c.config.productId).name)}</div>
                  <div className="text-xs text-muted" dir="ltr" style={{ textAlign: 'start' }}>{d.width}×{d.depth}×{d.height} cm · {fmtDate(c.updatedAt)}</div>
                  <div className="mt-1"><StageBadge stage={c.stage} /></div>
                </div>
              </div>
              {c.approval && (
                <div className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs text-sky-900">
                  {t('اعتماد مسجَّل', 'Recorded approval')}: {c.approval.engineer} · <span dir="ltr">{c.approval.reference}</span> · {fmtDate(c.approval.date)}
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                <Button className="col-span-2" onClick={() => s.openConfig(project.id, c.id)}>{t('فتح وتعديل', 'Open & edit')}</Button>
                <Button variant="ghost" onClick={() => s.openQuote(project.id, c.id)} aria-label={t('عرض سعر', 'Quotation')} title={t('عرض سعر', 'Quotation')}><FileText className="size-4" /></Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="ghost" className="px-0" onClick={() => setStageFor(c)} aria-label={t('المرحلة', 'Stage')} title={t('المرحلة', 'Stage')}><ShieldCheck className="size-4" /></Button>
                  <Button variant="danger" className="px-0" aria-label={t('حذف', 'Delete')} onClick={() => confirm(t('حذف هذا التصميم؟', 'Delete this design?')) && s.deleteConfig(project.id, c.id)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {editing && (
        <Modal title={t('تعديل بيانات المشروع', 'Edit project')} onClose={() => setEditing(false)}>
          <ProjectForm
            initial={project}
            submitLabel={t('حفظ', 'Save')}
            onCancel={() => setEditing(false)}
            onSubmit={(data) => { s.updateProject(project.id, data); setEditing(false); }}
          />
        </Modal>
      )}
      {stageFor && <StageDialog project={project} cfg={project.configs.find((c) => c.id === stageFor.id) ?? stageFor} onClose={() => setStageFor(null)} />}
    </div>
  );
}

export default function Projects() {
  const t = useT();
  const { projects, createProject, setActiveProject } = useStore();
  const active = useActiveProject();
  const [creating, setCreating] = useState(false);

  if (active) return <ProjectDetail project={active} />;

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <PageTitle
        title={t('مشاريع العملاء', 'Customer Projects')}
        sub={t('محفوظة على هذا الجهاز فقط (تخزين المتصفح).', 'Stored on this device only (browser storage).')}
        action={<Button onClick={() => setCreating(true)}><FolderPlus className="size-4" />{t('مشروع جديد', 'New project')}</Button>}
      />
      {projects.length === 0 && (
        <Card className="text-center text-sm text-muted">{t('ابدأ بإنشاء مشروع لعميلك الأول.', 'Start by creating a project for your first customer.')}</Card>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((p) => (
          <button key={p.id} className="text-start" onClick={() => setActiveProject(p.id)}>
            <Card className="transition hover:border-forest/50">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">{p.customerName}</div>
                <div className="text-xs text-muted" dir="ltr">{p.reference}</div>
              </div>
              <div className="mt-1 text-xs text-muted">
                {p.configs.length} {t('تصميم', 'designs')} · {t('آخر تحديث', 'Updated')} {fmtDate(p.updatedAt)}
              </div>
            </Card>
          </button>
        ))}
      </div>
      {creating && (
        <Modal title={t('مشروع عميل جديد', 'New customer project')} onClose={() => setCreating(false)}>
          <ProjectForm submitLabel={t('إنشاء المشروع', 'Create project')} onCancel={() => setCreating(false)} onSubmit={(d) => { createProject(d); setCreating(false); }} />
        </Modal>
      )}
    </div>
  );
}
