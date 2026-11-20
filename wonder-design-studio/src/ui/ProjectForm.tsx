import { useState } from 'react';
import type { Project, RoomDims } from '../domain/types';
import type { NewProjectInput } from '../store/useStore';
import { Button, Field, inputCls, useT } from './common';

const toNum = (s: string): number | null => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Create / edit form for a customer project. */
export default function ProjectForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: Project;
  onSubmit(data: Required<NewProjectInput>): void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const t = useT();
  const [customerName, setCustomerName] = useState(initial?.customerName ?? '');
  const [reference, setReference] = useState(initial?.reference ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [room, setRoom] = useState({
    width: initial?.room.width?.toString() ?? '',
    depth: initial?.room.depth?.toString() ?? '',
    height: initial?.room.height?.toString() ?? '',
  });
  const valid = customerName.trim().length > 0;

  const roomField = (key: keyof RoomDims, label: string) => (
    <Field label={label}>
      <input
        className={inputCls}
        inputMode="decimal"
        dir="ltr"
        placeholder="cm"
        value={room[key]}
        onChange={(e) => setRoom({ ...room, [key]: e.target.value })}
      />
    </Field>
  );

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          customerName,
          reference,
          phone,
          notes,
          room: { width: toNum(room.width), depth: toNum(room.depth), height: toNum(room.height) },
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('اسم العميل *', 'Customer name *')}>
          <input className={inputCls} value={customerName} onChange={(e) => setCustomerName(e.target.value)} autoFocus />
        </Field>
        <Field label={t('مرجع المشروع', 'Project reference')}>
          <input className={inputCls} dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <Field label={t('رقم الجوال', 'Mobile')}>
          <input className={inputCls} dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label={t('ملاحظات', 'Notes')}>
          <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <div>
        <div className="mb-1 text-sm font-medium">{t('أبعاد الغرفة المتاحة (سم)', 'Available room dimensions (cm)')}</div>
        <div className="grid grid-cols-3 gap-3">
          {roomField('width', t('العرض', 'Width'))}
          {roomField('depth', t('العمق', 'Depth'))}
          {roomField('height', t('الارتفاع', 'Height'))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('إلغاء', 'Cancel')}
          </Button>
        )}
        <Button type="submit" disabled={!valid}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose(): void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="mb-4 text-lg font-bold text-forest-dark">{title}</h2>
        {children}
      </div>
    </div>
  );
}
