import {
  ANTIGUEDAD_OPTIONS,
  ESTADO_CIVIL_OPTIONS,
  FRECUENCIA_OPTIONS,
  INSTRUCCION_OPTIONS,
  ITEM_KEYS_PA,
  ITEM_KEYS_TD,
  NIVEL_RESPONSABILIDAD_OPTIONS,
  PARTICIPACION_OPTIONS,
  TODOS_LOS_ITEM_KEYS,
  type DimensionDefinition,
} from './catalog';
import type { Survey, SurveyFormState } from '../types';
import { average, safeNumber, todayISO } from './format';

export function newClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}


export function emptyItems(): Record<string, number> {
  return Object.fromEntries(TODOS_LOS_ITEM_KEYS.map((key) => [key, -1]));
}

export function createEmptyForm(): SurveyFormState {
  return {
    fecha_encuesta: todayISO(),
    edad: '',
    sexo: '',
    estado_civil: '',
    instruccion: '',
    area_id: '',
    nivel_responsabilidad: '',
    antiguedad: '',
    frecuencia_uso: '',
    participacion: '',
    consentimiento: false,
    observaciones: '',
    items: emptyItems(),
  };
}

export function formFromSurvey(survey: Survey): SurveyFormState {
  const items = emptyItems();
  for (const key of TODOS_LOS_ITEM_KEYS) {
    const value = safeNumber(survey[key]);
    items[key] = value >= 0 && value <= 5 ? value : -1;
  }

  return {
    fecha_encuesta: survey.fecha_encuesta?.slice(0, 10) || todayISO(),
    edad: survey.edad ? String(survey.edad) : '',
    sexo: survey.sexo || '',
    estado_civil: survey.estado_civil || '',
    instruccion: survey.instruccion || '',
    area_id: survey.area_id ? String(survey.area_id) : '',
    nivel_responsabilidad: survey.nivel_responsabilidad || '',
    antiguedad: survey.antiguedad || '',
    frecuencia_uso: survey.frecuencia_uso || '',
    participacion: survey.participacion || '',
    consentimiento: survey.consentimiento,
    observaciones: survey.observaciones || '',
    items,
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

function isOption(value: string, options: string[]): boolean {
  return options.includes(value);
}

export function validateConsent(form: SurveyFormState): ValidationResult {
  if (!form.consentimiento) {
    return {
      valid: false,
      errors: { consentimiento: 'Debes aceptar el consentimiento para continuar.' },
    };
  }
  return { valid: true, errors: {} };
}

export function validateGeneral(form: SurveyFormState): ValidationResult {
  const errors: Record<string, string> = {};

  if (!form.fecha_encuesta) {
    errors.fecha_encuesta = 'Selecciona la fecha de aplicación.';
  } else if (form.fecha_encuesta > todayISO()) {
    errors.fecha_encuesta = 'La fecha de aplicación no puede ser futura.';
  }

  const edad = Number(form.edad);
  if (!form.edad.trim()) {
    errors.edad = 'Ingresa la edad.';
  } else if (!Number.isInteger(edad) || edad < 18 || edad > 99) {
    errors.edad = 'La edad debe ser un número entero entre 18 y 99.';
  }

  if (!['M', 'F'].includes(form.sexo)) {
    errors.sexo = 'Selecciona el sexo.';
  }
  if (!form.estado_civil || !isOption(form.estado_civil, ESTADO_CIVIL_OPTIONS)) {
    errors.estado_civil = 'Selecciona el estado civil.';
  }
  if (!form.instruccion || !isOption(form.instruccion, INSTRUCCION_OPTIONS)) {
    errors.instruccion = 'Selecciona el grado de instrucción.';
  }
  if (!form.area_id) {
    errors.area_id = 'Selecciona el área o unidad orgánica.';
  }
  if (
    !form.nivel_responsabilidad ||
    !isOption(form.nivel_responsabilidad, NIVEL_RESPONSABILIDAD_OPTIONS)
  ) {
    errors.nivel_responsabilidad = 'Selecciona el nivel de responsabilidad.';
  }
  if (!form.antiguedad || !isOption(form.antiguedad, ANTIGUEDAD_OPTIONS)) {
    errors.antiguedad = 'Selecciona la antigüedad en la entidad.';
  }
  if (!form.frecuencia_uso || !isOption(form.frecuencia_uso, FRECUENCIA_OPTIONS)) {
    errors.frecuencia_uso = 'Selecciona la frecuencia de uso.';
  }
  if (!form.participacion || !isOption(form.participacion, PARTICIPACION_OPTIONS)) {
    errors.participacion = 'Selecciona la participación en mejoras digitales.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function pendingItemKeys(
  items: Record<string, number>,
  keys: string[],
): string[] {
  return keys.filter((key) => {
    const value = items[key];
    return !(value >= 0 && value <= 5);
  });
}

export function validateItems(
  form: SurveyFormState,
  instrumento: 'TD' | 'PA',
): ValidationResult {
  const keys = instrumento === 'TD' ? ITEM_KEYS_TD : ITEM_KEYS_PA;
  const pending = pendingItemKeys(form.items, keys);
  if (pending.length) {
    return {
      valid: false,
      errors: {
        items: `Faltan ${pending.length} ${
          pending.length === 1 ? 'enunciado' : 'enunciados'
        } por responder. Puedes marcar N/A si no tienes información suficiente.`,
      },
    };
  }
  return { valid: true, errors: {} };
}

export function countDimensionAnswered(
  items: Record<string, number>,
  instrumento: 'TD' | 'PA',
  start: number,
  amount = 5,
): number {
  const prefix = instrumento === 'TD' ? 'td' : 'pa';
  let count = 0;
  for (let i = 0; i < amount; i += 1) {
    const key = `${prefix}_${String(start + i).padStart(2, '0')}`;
    const value = items[key];
    if (value >= 0 && value <= 5) count += 1;
  }
  return count;
}

export function firstIncompleteStep(form: SurveyFormState): number {
  if (!validateConsent(form).valid) return 0;
  if (!validateGeneral(form).valid) return 1;
  if (pendingItemKeys(form.items, ITEM_KEYS_TD).length) return 2;
  if (pendingItemKeys(form.items, ITEM_KEYS_PA).length) return 3;
  return 4;
}

export function formHasProgress(form: SurveyFormState): boolean {
  if (form.consentimiento) return true;
  if (
    form.edad.trim() ||
    form.sexo ||
    form.estado_civil ||
    form.instruccion ||
    form.area_id ||
    form.nivel_responsabilidad ||
    form.antiguedad ||
    form.frecuencia_uso ||
    form.participacion ||
    form.observaciones.trim()
  ) {
    return true;
  }
  return Object.values(form.items).some((value) => value >= 0);
}

export function formScores(form: SurveyFormState): {
  td: number | null;
  pa: number | null;
  general: number | null;
} {
  const tdValues = ITEM_KEYS_TD.map((key) => form.items[key]).filter(
    (value) => value >= 1 && value <= 5,
  );
  const paValues = ITEM_KEYS_PA.map((key) => form.items[key]).filter(
    (value) => value >= 1 && value <= 5,
  );
  return {
    td: average(tdValues),
    pa: average(paValues),
    general: average([...tdValues, ...paValues]),
  };
}

export function formDimensionScores(
  form: SurveyFormState,
  dimensions: DimensionDefinition[],
  instrumento: 'TD' | 'PA',
): Array<{
  id: number;
  codigo: string;
  nombre: string;
  promedio: number | null;
  n: number;
}> {
  const prefix = instrumento === 'TD' ? 'td' : 'pa';
  return dimensions.map((dimension) => {
    const values = dimension.items
      .map((item) => form.items[`${prefix}_${String(item.numero).padStart(2, '0')}`])
      .filter((value) => value >= 1 && value <= 5);
    return {
      id: dimension.id,
      codigo: dimension.codigo,
      nombre: dimension.nombre,
      promedio: average(values),
      n: values.length,
    };
  });
}
