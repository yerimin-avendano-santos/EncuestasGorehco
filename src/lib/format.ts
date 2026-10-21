import {
  ITEM_KEYS_PA,
  ITEM_KEYS_TD,
  LIKERT_OPTIONS,
  TODOS_LOS_ITEM_KEYS,
} from './catalog';
import type { Survey } from '../types';

export function classNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export function safeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('es-PE').format(value);
}

export function formatDecimal(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${formatDecimal(value, digits)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatMonth(value: string | null | undefined): string {
  if (!value) return '—';
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  const date = new Date(year, month - 1, 1);
  const label = new Intl.DateTimeFormat('es-PE', {
    month: 'short',
    year: 'numeric',
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function todayISO(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function initials(name: string | null | undefined): string {
  if (!name) return '·';
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '·';
}

export function average(values: number[]): number | null {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function answerLabel(value: number): string {
  const option = LIKERT_OPTIONS.find((item) => item.value === value);
  return option?.label ?? '—';
}

export function answerShort(value: number): string {
  if (value === 0) return 'N/A';
  if (value >= 1 && value <= 5) return String(value);
  return '—';
}

export function getItemValue(survey: Survey, key: string): number {
  return safeNumber(survey[key]);
}

export function computeScores(survey: Survey): {
  td: number | null;
  pa: number | null;
  general: number | null;
} {
  const tdValues = ITEM_KEYS_TD.map((key) => getItemValue(survey, key)).filter(
    (value) => value >= 1 && value <= 5,
  );
  const paValues = ITEM_KEYS_PA.map((key) => getItemValue(survey, key)).filter(
    (value) => value >= 1 && value <= 5,
  );
  const td = average(tdValues);
  const pa = average(paValues);
  const all = [...tdValues, ...paValues];
  return { td, pa, general: average(all) };
}

export function computeDimensionScores(
  survey: Survey,
  instrumento: 'TD' | 'PA',
  dimensions: Array<{ id: number; items: Array<{ numero: number }> }>,
): Array<{ id: number; promedio: number | null; n: number }> {
  const prefix = instrumento === 'TD' ? 'td' : 'pa';
  return dimensions.map((dimension) => {
    const values = dimension.items
      .map((item) =>
        getItemValue(
          survey,
          `${prefix}_${String(item.numero).padStart(2, '0')}`,
        ),
      )
      .filter((value) => value >= 1 && value <= 5);
    return {
      id: dimension.id,
      promedio: average(values),
      n: values.length,
    };
  });
}

export function countAnswered(items: Record<string, number>): {
  answered: number;
  na: number;
  pending: number;
} {
  let answered = 0;
  let na = 0;
  let pending = 0;
  for (const key of TODOS_LOS_ITEM_KEYS) {
    const value = items[key];
    if (value >= 1 && value <= 5) answered += 1;
    else if (value === 0) na += 1;
    else pending += 1;
  }
  return { answered, na, pending };
}

export function getAreaName(survey: Survey): string {
  return survey.areas?.nombre || survey.area_nombre || 'No especificado';
}

export function surveyStatusLabel(status: string): string {
  if (status === 'borrador') return 'Borrador';
  if (status === 'validada') return 'Validada';
  return 'Completa';
}

export function normalizeEmailInput(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.includes('@') ? trimmed : `${trimmed}@encuesta.com`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function shortName(name: string | null | undefined): string {
  if (!name) return 'Sin nombre';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).join(' ');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function plural(
  count: number,
  singular: string,
  pluralWord: string,
): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralWord}`;
}
