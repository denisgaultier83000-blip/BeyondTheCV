const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RELATIVE_DATE_STORAGE_PREFIX = 'btcv:interview-relative:';

const toDayStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseAbsoluteDate = (raw: string): Date | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const formatAsIsoDay = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseRelativeDays = (raw: string): number | null => {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.includes("aujourd'hui") || normalized.includes('today') || normalized.includes('ce jour')) return 0;
  if (normalized.includes('demain') || normalized.includes('tomorrow') || normalized.includes('24h') || normalized.includes('24 h')) return 1;
  if (normalized.includes('48h') || normalized.includes('48 h') || normalized.includes('2 jours') || normalized.includes('2 days')) return 2;

  const frMatch = normalized.match(/\bdans\s+(\d+)\s*(j|jour|jours)\b/);
  if (frMatch) return Number(frMatch[1]);

  const enMatch = normalized.match(/\bin\s+(\d+)\s*days?\b/);
  if (enMatch) return Number(enMatch[1]);

  return null;
};

const getPersistedRelativeTarget = (raw: string, days: number, nowMs: number): Date => {
  const key = `${RELATIVE_DATE_STORAGE_PREFIX}${raw.trim().toLowerCase()}`;
  const fallbackTarget = new Date(toDayStart(new Date(nowMs)).getTime() + (days * DAY_IN_MS));

  if (typeof window === 'undefined') {
    return fallbackTarget;
  }

  try {
    const stored = window.localStorage.getItem(key);
    if (stored) {
      const parsed = parseAbsoluteDate(stored);
      if (parsed) return parsed;
    }

    window.localStorage.setItem(key, formatAsIsoDay(fallbackTarget));
  } catch (_) {
    return fallbackTarget;
  }

  return fallbackTarget;
};

export const getDaysUntilInterview = (rawInput: string, nowMs: number = Date.now()): number => {
  const raw = (rawInput || '').trim();
  if (!raw) return 999;

  const absolute = parseAbsoluteDate(raw);
  const relativeDays = parseRelativeDays(raw);
  const targetDate = absolute || (relativeDays !== null ? getPersistedRelativeTarget(raw, relativeDays, nowMs) : null);
  if (!targetDate) return 999;

  const now = toDayStart(new Date(nowMs));
  const target = toDayStart(targetDate);
  return Math.ceil((target.getTime() - now.getTime()) / DAY_IN_MS);
};

export const formatInterviewCountdownLabel = (rawInput: string, nowMs: number = Date.now()): string => {
  const raw = (rawInput || '').trim();
  if (!raw) return 'Date non définie';

  const daysUntil = getDaysUntilInterview(raw, nowMs);
  if (daysUntil === 999) return `Entretien : ${raw}`;
  if (daysUntil > 1) return `Entretien : dans ${daysUntil} jours`;
  if (daysUntil === 1) return "Entretien : demain";
  if (daysUntil === 0) return "Entretien : aujourd'hui";

  const elapsed = Math.abs(daysUntil);
  return `Entretien : il y a ${elapsed} jour${elapsed > 1 ? 's' : ''}`;
};
