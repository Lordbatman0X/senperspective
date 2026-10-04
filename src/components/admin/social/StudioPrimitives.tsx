export function OpacityField({
  value,
  onCommit,
}: { value: number; onCommit: (v: number) => void }) {
  return (
    <label className="block">
      <span className={PANEL_LABEL}>
        Opacité<span className="text-zinc-600 normal-case tracking-normal"> {Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onCommit(Number(e.target.value) / 100)}
        className="w-full accent-[#E85D42]"
      />
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-1.5 gap-3 group"
    >
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-200 transition-colors text-left">
        {label}
      </span>
      <span
        className={`relative w-9 h-4 border transition-colors shrink-0 ${
          checked ? 'bg-[#E85D42] border-[#E85D42]' : 'bg-zinc-950 border-zinc-800'
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 bg-white transition-all ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; title?: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
            value === o.value
              ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-[#E85D42] hover:text-zinc-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ColorField({
  label,
  value,
  onCommit,
}: { label: string; value: string; onCommit: (v: string) => void }) {
  return (
    <label className="block">
      <span className={PANEL_LABEL}>{label}</span>
      <div className="flex gap-1.5">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
          onChange={(e) => onCommit(e.target.value)}
          className="w-9 h-8 bg-zinc-950 border border-zinc-800 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onCommit(e.target.value)}
          className={`${INPUT_CLASS} font-mono`}
        />
      </div>
    </label>
  );
}

export function GhostButton({
  children,
  onClick,
  tone = 'default',
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'accent' | 'danger';
  title?: string;
  disabled?: boolean;
}) {
  const tones = {
    default: 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-100',
    accent: 'border-[#E85D42] text-[#E85D42] hover:bg-[#E85D42] hover:text-white',
    danger: 'border-rose-900 text-rose-400 hover:bg-rose-600 hover:text-white',
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border bg-zinc-950 transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-zinc-500 italic leading-relaxed py-4 text-center">
      {children}
    </p>
  );
}
/**
 * Small presentational primitives shared by the Studio panels.
 *
 * These exist so the inspector, filters and caption panels all render the same
 * controls in the same way — a number field that behaves subtly differently in
 * two panels is a real source of "why did that value not stick" bugs.
 */

import React from 'react';

export const PANEL_LABEL = 'text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block';

export const INPUT_CLASS =
  'w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-100 ' +
  'focus:outline-none focus:border-[#E85D42] transition-colors';

export function Section({
  title,
  children,
  action,
}: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-800/80 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-center justify-between mb-2.5 gap-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#E85D42]">{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

/**
 * A labelled number input.
 *
 * `onCommit` fires on every valid keystroke but refuses to write `NaN`, so
 * clearing the field mid-edit cannot poison the design document.
 */
export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className={PANEL_LABEL}>
        {label}{suffix ? <span className="text-zinc-600 normal-case tracking-normal"> {suffix}</span> : null}
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isFinite(next)) return;
          onCommit(next);
        }}
        className={INPUT_CLASS}
      />
    </label>
  );
}

export function TextField({
  label,
  value,
  onCommit,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className={PANEL_LABEL}>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onCommit(e.target.value)}
        className={`${INPUT_CLASS} ${mono ? 'font-mono' : ''}`}
      />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <label className="block">
      <span className={PANEL_LABEL}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`${INPUT_CLASS} py-1.5`}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}