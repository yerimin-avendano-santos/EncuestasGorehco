import type { SurveyFormState } from '../types';
import { emptyItems } from './survey-form';

const DRAFT_PREFIX = 'gorehco_encuesta_draft_v1';

function draftKey(userId: string): string {
  return `${DRAFT_PREFIX}:${userId}`;
}

export interface LocalDraft {
  form: SurveyFormState;
  savedAt: string;
}

export function loadDraft(userId: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalDraft>;
    if (!parsed?.form || typeof parsed.form !== 'object') return null;
    const items = { ...emptyItems(), ...(parsed.form.items ?? {}) };
    return {
      form: {
        ...parsed.form,
        items,
      } as SurveyFormState,
      savedAt: parsed.savedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveDraft(userId: string, form: SurveyFormState): LocalDraft {
  const draft: LocalDraft = {
    form,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  return draft;
}

export function clearDraft(userId: string): void {
  localStorage.removeItem(draftKey(userId));
}
