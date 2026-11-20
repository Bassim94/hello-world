import { useState } from 'react';
import { Eye, EyeOff, Minus, Plus, Save } from 'lucide-react';
import { byId, FINISHES, ROPE_COLORS, WOODS, woodDisplayColor } from '../domain/materials';
import { hasBlockers } from '../domain/validation';
import type { ParamDef } from '../domain/types';
import { useActiveProject, useActiveSaved, useStore } from '../store/useStore';
import { Button, Field, inputCls, IssueList, StageBadge, useDesign, useMoney, useT } from '../ui/common';
import ProjectForm, { Modal } from '../ui/ProjectForm';
import Viewer3D, { takeSnapshot, type ViewPreset } from '../viewer/Viewer3D';

type Tab = 'dims' | 'activities' | 'materials' | 'checks';

function DimControl({ def }: { def: ParamDef }) {
  const t = useT();
  const value = useStore((s) => s.draft.dims[def.id]);
  const setDim = useStore((s) => s.setDim);
  const [text, setText] = useState<string | null>(null);
  const step = (d: number) => setDim(def.id, value + d * def.step);
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{t(def.name)}</span>
        <div className="flex items-center gap-1" dir="ltr">
          <button className="grid size-10 place-items-center rounded-lg border border-line hover:bg-sand" onClick={() => step(-1)} aria-label="-">
            <Minus className="size-4" />
          </button>
          <input
            className="h-10 w-20 rounded-lg border border-line text-center text-base font-semibold outline-none focus:border-forest"
            inputMode="numeric"
            aria-label={def.name.en}
            value={text ?? value}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              if (text !== null) setDim(def.id, parseFloat(text));
              setText(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          <button className="grid size-10 place-items-center rounded-lg border border-line hover:bg-sand" onClick={() => step(1)} aria-label="+">
            <Plus className="size-4" />
          </button>
          <span className="w-7 text-xs text-muted">cm</span>
        </div>
      </div>
      <input
        type="range"
        dir="ltr"
        className="mt-3 h-6 w-full"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onChange={(e) => setDim(def.id, Number(e.target.value))}
        aria-label={`${def.name.en} slider`}
      />
      <div className="flex justify-between text-[11px] text-muted" dir="ltr">
        <span>{def.min}</span>
        <span>{t('نطاق مؤقت', 'provisional range')}</span>
        <span>{def.max}</span>
      </div>
    </div>
  );
}

function Swatches<T extends { id: string; name: { ar: string; en: string } }>({
  items,
  value,
  color,
  onChange,
}: {
  items: T[];
  value: string;
  color(item: T): string;
  onChange(id: string): void;
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`flex min-h-11 items-center gap-2 rounded-xl border px-2.5 text-start text-sm ${
            value === it.id ? 'border-forest bg-forest/5 font-semibold' : 'border-line hover:bg-sand'
          }`}
        >
          <span className="size-6 shrink-0 rounded-full border border-black/10" style={{ background: color(it) }} />
          {t(it.name)}
        </button>
      ))}
    </div>
  );
}

export default function Configurator() {
  const t = useT();
  const money = useMoney();
  const s = useStore();
  const project = useActiveProject();
  const saved = useActiveSaved();
  const stage = saved?.stage ?? 'visual_concept';
  const { product, parts, cost, issues } = useDesign(s.draft, project?.room ?? null, stage);

  const [tab, setTab] = useState<Tab>('dims');
  const [preset, setPreset] = useState<ViewPreset>('iso');
  const [tick, setTick] = useState(0);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [pickProject, setPickProject] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const doSave = (configName: string) => {
    const revoked = s.saveDraft(configName, takeSnapshot());
    setSaveOpen(false);
    notify(
      revoked
        ? t('تم الحفظ. أُلغي الاعتماد الهندسي بسبب تغيير التصميم.', 'Saved. Engineering approval was revoked because the design changed.')
        : t('تم حفظ التصميم في المشروع.', 'Design saved to the project.'),
    );
  };

  const onSaveClick = () => {
    if (project && saved) {
      const approved = saved.stage === 'engineering_approved' || saved.stage === 'production_ready';
      if (
        approved &&
        s.dirty &&
        !confirm(t('هذا التصميم معتمد هندسيًا. حفظ التعديلات سيلغي الاعتماد. متابعة؟', 'This design is engineering-approved. Saving changes will revoke the approval. Continue?'))
      )
        return;
      doSave(saved.name);
    } else {
      setName(saved?.name ?? t(product.name));
      setPickProject(project?.id ?? (s.projects[0]?.id ?? 'new'));
      setSaveOpen(true);
    }
  };

  const blockers = hasBlockers(issues);
  const warnCount = issues.filter((i) => i.severity !== 'info').length;
  const presets: { id: ViewPreset; ar: string; en: string }[] = [
    { id: 'iso', ar: 'منظور', en: '3D' },
    { id: 'front', ar: 'أمام', en: 'Front' },
    { id: 'side', ar: 'جانب', en: 'Side' },
    { id: 'top', ar: 'أعلى', en: 'Top' },
  ];
  const tabs: { id: Tab; ar: string; en: string }[] = [
    { id: 'dims', ar: 'الأبعاد', en: 'Size' },
    { id: 'activities', ar: 'الأنشطة', en: 'Activities' },
    { id: 'materials', ar: 'الخامات', en: 'Materials' },
    { id: 'checks', ar: `الفحوص (${warnCount})`, en: `Checks (${warnCount})` },
  ];
  const Toggle = ({ k, ar, en }: { k: 'showDims' | 'showGrid' | 'showRoom'; ar: string; en: string }) => (
    <button
      onClick={() => s.setFlag(k, !s[k])}
      className={`min-h-9 rounded-lg px-2.5 text-xs font-medium backdrop-blur ${
        s[k] ? 'bg-forest text-white' : 'bg-white/85 text-ink'
      }`}
    >
      {t(ar, en)}
    </button>
  );

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* 3D viewer */}
      <div className="relative h-[44vh] min-h-64 shrink-0 lg:h-auto lg:min-h-0 lg:flex-1">
        <Viewer3D
          parts={parts}
          config={s.draft}
          room={project?.room}
          hidden={s.hidden}
          showDims={s.showDims}
          showGrid={s.showGrid}
          showRoom={s.showRoom}
          preset={preset}
          presetTick={tick}
        />
        <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-2">
          <div className="pointer-events-auto flex gap-1 rounded-xl bg-white/85 p-1 shadow-sm backdrop-blur">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPreset(p.id);
                  setTick((x) => x + 1);
                }}
                className={`min-h-9 rounded-lg px-2.5 text-xs font-medium ${
                  preset === p.id ? 'bg-forest text-white' : 'text-ink hover:bg-sand'
                }`}
              >
                {t(p.ar, p.en)}
              </button>
            ))}
          </div>
          <div className="pointer-events-auto flex gap-1">
            <Toggle k="showDims" ar="القياسات" en="Dims" />
            <Toggle k="showGrid" ar="الشبكة" en="Grid" />
            {project?.room.width != null && <Toggle k="showRoom" ar="الغرفة" en="Room" />}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-end justify-between gap-2">
          <div className="rounded-xl bg-white/85 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
            <StageBadge stage={stage} />
            <span className="ms-2 text-muted">{t('ليس اعتمادًا للسلامة', 'Not a safety approval')}</span>
          </div>
          {toast && <div className="rounded-xl bg-forest-dark px-3 py-2 text-xs text-white shadow">{toast}</div>}
        </div>
      </div>

      {/* control panel */}
      <div className="flex min-h-0 flex-1 flex-col border-line bg-white lg:w-[400px] lg:flex-none lg:border-s">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-forest-dark">
              {saved?.name ?? t(product.name)}
              {s.dirty && <span className="ms-1 text-clay">●</span>}
            </div>
            <div className="truncate text-xs text-muted">
              {project ? `${project.customerName}${project.reference ? ` · ${project.reference}` : ''}` : t('بدون مشروع — لم يُحفظ', 'No project — not saved')}
            </div>
          </div>
          <div className="text-end">
            <div className="text-[11px] text-muted">{t('سعر البيع التقديري', 'Est. selling price')}</div>
            <div className="text-base font-bold text-forest" data-testid="price">{money(cost.sellingPrice)}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 border-b border-line text-xs font-medium">
          {tabs.map((x) => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              className={`min-h-11 border-b-2 px-1 ${
                tab === x.id ? 'border-forest text-forest' : 'border-transparent text-muted'
              } ${x.id === 'checks' && blockers ? 'text-red-700' : ''}`}
            >
              {t(x.ar, x.en)}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {tab === 'dims' && (
            <>
              {product.params.map((p) => (
                <DimControl key={p.id} def={p} />
              ))}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-sand/60 p-2">
                  <div className="text-muted">{t('القطع', 'Parts')}</div>
                  <div className="text-sm font-bold">{cost.quantities.partCount}</div>
                </div>
                <div className="rounded-xl bg-sand/60 p-2">
                  <div className="text-muted">{t('حجم الخشب', 'Timber')}</div>
                  <div className="text-sm font-bold" dir="ltr">{cost.quantities.woodVolumeM3.toFixed(3)} m³</div>
                </div>
                <div className="rounded-xl bg-sand/60 p-2">
                  <div className="text-muted">{t('الحبال', 'Rope')}</div>
                  <div className="text-sm font-bold" dir="ltr">{cost.quantities.ropeLengthM.toFixed(1)} m</div>
                </div>
              </div>
            </>
          )}

          {tab === 'activities' && (
            <>
              {[{ id: 'frame', name: { ar: 'الهيكل', en: 'Frame' }, description: { ar: 'قوائم وعوارض وعناصر ربط', en: 'Posts, beams, connectors' } }, ...product.activities].map((a) => {
                const isFrame = a.id === 'frame';
                const on = isFrame || s.draft.activities[a.id];
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{t(a.name)}</div>
                      <div className="text-xs text-muted">{t(a.description)}</div>
                    </div>
                    <button
                      onClick={() => s.toggleHidden(a.id)}
                      disabled={!on}
                      className="grid size-10 place-items-center rounded-lg border border-line text-muted hover:bg-sand disabled:opacity-30"
                      aria-label={t('إظهار/إخفاء', 'Show/hide')}
                      title={t('إظهار/إخفاء في العرض فقط', 'Show/hide in view only')}
                    >
                      {s.hidden[a.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    {!isFrame && (
                      <button
                        role="switch"
                        aria-checked={on}
                        aria-label={a.name.en}
                        onClick={() => s.toggleActivity(a.id)}
                        className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-forest' : 'bg-stone-300'}`}
                      >
                        <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? 'start-[22px]' : 'start-0.5'}`} />
                      </button>
                    )}
                  </div>
                );
              })}
              <p className="text-xs text-muted">
                {t('المفتاح يضيف/يحذف النشاط من التصميم والتكلفة. أيقونة العين تخفيه من العرض فقط.', 'The switch adds/removes the activity from design and cost. The eye only hides it in the view.')}
              </p>
            </>
          )}

          {tab === 'materials' && (
            <>
              <Field group label={t('نوع الخشب', 'Wood')}>
                <Swatches items={WOODS} value={s.draft.woodId} color={(w) => woodDisplayColor(w.id, s.draft.finishId)} onChange={(id) => s.patchDraft({ woodId: id })} />
              </Field>
              <Field group label={t('لون التشطيب', 'Finish colour')}>
                <Swatches items={FINISHES} value={s.draft.finishId} color={(f) => woodDisplayColor(s.draft.woodId, f.id)} onChange={(id) => s.patchDraft({ finishId: id })} />
              </Field>
              <Field group label={t('لون الحبال', 'Rope colour')}>
                <Swatches items={ROPE_COLORS} value={s.draft.ropeColorId} color={(r) => r.color} onChange={(id) => s.patchDraft({ ropeColorId: id })} />
              </Field>
              <p className="text-xs text-muted">
                {t('الألوان تقريبية للعرض. خصائص المواد قيم مبدئية.', 'Colours are approximate. Material properties are preliminary.')} ({t(byId(WOODS, s.draft.woodId).name)})
              </p>
            </>
          )}

          {tab === 'checks' && (
            <>
              {!project && (
                <p className="text-xs text-muted">{t('احفظ التصميم في مشروع لإدخال أبعاد الغرفة وفحص الخلوص.', 'Save into a project to enter room dimensions and check clearance.')}</p>
              )}
              <IssueList issues={issues} />
            </>
          )}
        </div>

        <div className="flex gap-2 border-t border-line p-3">
          <Button variant="ghost" className="flex-1" onClick={() => s.setView('cost')}>
            {t('تفاصيل التكلفة', 'Cost details')}
          </Button>
          <Button className="flex-1" onClick={onSaveClick}>
            <Save className="size-4" />
            {saved ? t('حفظ', 'Save') : t('حفظ في مشروع', 'Save to project')}
          </Button>
        </div>
      </div>

      {saveOpen && (
        <Modal title={t('حفظ التصميم', 'Save design')} onClose={() => setSaveOpen(false)}>
          <div className="space-y-3">
            <Field label={t('اسم التصميم', 'Design name')}>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={t('المشروع', 'Project')}>
              <select className={inputCls} value={pickProject} onChange={(e) => setPickProject(e.target.value)}>
                {s.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.customerName} {p.reference && `· ${p.reference}`}
                  </option>
                ))}
                <option value="new">{t('+ مشروع عميل جديد', '+ New customer project')}</option>
              </select>
            </Field>
            {pickProject === 'new' ? (
              <ProjectForm
                submitLabel={t('إنشاء وحفظ', 'Create & save')}
                onCancel={() => setSaveOpen(false)}
                onSubmit={(data) => {
                  s.createProject(data);
                  doSave(name);
                }}
              />
            ) : (
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setSaveOpen(false)}>
                  {t('إلغاء', 'Cancel')}
                </Button>
                <Button
                  onClick={() => {
                    if (pickProject !== s.activeProjectId) s.setActiveProject(pickProject);
                    doSave(name);
                  }}
                >
                  {t('حفظ', 'Save')}
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
