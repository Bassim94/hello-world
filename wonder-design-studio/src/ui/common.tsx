import { useCallback, useMemo, type ReactNode } from 'react';
import { AlertTriangle, Info, OctagonAlert } from 'lucide-react';
import { computeCost } from '../domain/pricing';
import { getProduct } from '../domain/products';
import { STAGE_LABELS, validateConfig } from '../domain/validation';
import type { DesignStage, Issue, LText, ProductConfig, RoomDims } from '../domain/types';
import { useStore } from '../store/useStore';

/** Translation helper: t('عربي', 'English') or t(ltext). */
export function useT() {
  const lang = useStore((s) => s.lang);
  return useCallback(
    (ar: string | LText, en?: string) => (typeof ar === 'string' ? (lang === 'ar' ? ar : (en ?? ar)) : ar[lang]),
    [lang],
  );
}

// Latin digits in both languages: avoids ambiguity on dimensions and prices.
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
export const fmt = (n: number, digits: 0 | 2 = 0) => (digits === 0 ? nf0 : nf2).format(n);

export function useMoney() {
  const lang = useStore((s) => s.lang);
  return useCallback((n: number) => `${nf0.format(n)} ${lang === 'ar' ? 'ر.س' : 'SAR'}`, [lang]);
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB');

/** Parts + cost + issues for a configuration, memoised. */
export function useDesign(config: ProductConfig, room: RoomDims | null, stage: DesignStage) {
  const pricing = useStore((s) => s.pricing);
  return useMemo(() => {
    const product = getProduct(config.productId);
    const parts = product.build(config);
    return {
      product,
      parts,
      cost: computeCost(parts, config, pricing),
      issues: validateConfig(config, room, stage),
    };
  }, [config, room, stage, pricing]);
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-forest-dark md:text-2xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

const BTN = {
  primary: 'bg-forest text-white hover:bg-forest-dark',
  ghost: 'border border-line bg-white text-ink hover:bg-sand',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  accent: 'bg-clay text-white hover:brightness-95',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${className}`}
    />
  );
}

export function Field({ label, children, hint, group }: { label: string; children: ReactNode; hint?: string; group?: boolean }) {
  // `group` renders a non-label wrapper for sets of buttons (a <label> would hijack taps).
  const Tag = group ? 'div' : 'label';
  return (
    <Tag className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </Tag>
  );
}

export const inputCls =
  'w-full min-h-11 rounded-xl border border-line bg-white px-3 text-base outline-none focus:border-forest focus:ring-2 focus:ring-forest/20';

const STAGE_STYLE: Record<DesignStage, string> = {
  visual_concept: 'bg-stone-100 text-stone-700 border-stone-300',
  preliminary_design: 'bg-amber-50 text-amber-800 border-amber-300',
  engineering_approved: 'bg-sky-50 text-sky-800 border-sky-300',
  production_ready: 'bg-emerald-50 text-emerald-800 border-emerald-300',
};

export function StageBadge({ stage }: { stage: DesignStage }) {
  const t = useT();
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STAGE_STYLE[stage]}`}>
      {t(STAGE_LABELS[stage])}
    </span>
  );
}

const SEV = {
  blocker: { cls: 'border-red-200 bg-red-50 text-red-800', Icon: OctagonAlert },
  warning: { cls: 'border-amber-200 bg-amber-50 text-amber-900', Icon: AlertTriangle },
  info: { cls: 'border-line bg-sand/60 text-ink', Icon: Info },
};

export function IssueList({ issues }: { issues: Issue[] }) {
  const t = useT();
  const order = { blocker: 0, warning: 1, info: 2 };
  const sorted = [...issues].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <ul className="space-y-2">
      {sorted.map((i) => {
        const { cls, Icon } = SEV[i.severity];
        return (
          <li key={i.code} className={`flex gap-2 rounded-xl border p-2.5 text-sm leading-relaxed ${cls}`}>
            <Icon className="mt-0.5 size-4 shrink-0" />
            <span>{t(i.message)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function PlaceholderNote() {
  const t = useT();
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-900">
      {t(
        'جميع الأسعار قيم افتراضية مؤقتة للتجربة فقط، وليست عروض موردين أو تكاليف مُتحقق منها. عدّلها قبل الاستخدام التجاري.',
        'All prices are placeholder values for testing only — not supplier quotations or verified costs. Edit them before commercial use.',
      )}
    </p>
  );
}
