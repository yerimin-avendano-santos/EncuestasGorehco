import { supabase } from './supabase';
import { ITEM_KEYS_PA, ITEM_KEYS_TD } from './catalog';
import type {
  AdminFunctionResponse,
  Area,
  DashboardData,
  DashboardFilters,
  Profile,
  Rol,
  Survey,
  SurveyFilters,
  SurveyFormState,
} from '../types';

export function errorMessage(error: unknown): string {
  if (!error) return 'Ocurrió un error inesperado.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (record.message) return String(record.message);
    if (record.error_description) return String(record.error_description);
    if (record.error) return String(record.error);
  }
  return 'Ocurrió un error inesperado.';
}

function friendlyDbError(error: unknown): string {
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const code = String(record.code ?? '');
    if (code === '23505') {
      return 'La encuesta ya fue registrada. Actualiza la lista para verla.';
    }
    if (code === '42501' || code === 'PGRST301') {
      return 'No tienes permiso para realizar esta acción.';
    }
    if (code === '23514') {
      return 'Faltan datos obligatorios o algún valor no es válido. Revisa el formulario.';
    }
    if (code === 'PGRST116') {
      return 'No se encontró el registro solicitado.';
    }
  }
  return errorMessage(error);
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(friendlyDbError(error));
  return (data as Profile | null) ?? null;
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('nombre', { ascending: true });
  if (error) throw new Error(friendlyDbError(error));
  return (data ?? []) as Profile[];
}

export async function fetchAreas(includeInactive = false): Promise<Area[]> {
  let query = supabase.from('areas').select('*').order('orden', {
    ascending: true,
  });
  if (!includeInactive) query = query.eq('activo', true);
  const { data, error } = await query;
  if (error) throw new Error(friendlyDbError(error));
  return (data ?? []) as Area[];
}

function sortSurveys(surveys: Survey[]): Survey[] {
  return [...surveys].sort((a, b) => {
    const numberA = a.numero ?? -1;
    const numberB = b.numero ?? -1;
    if (numberA !== numberB) return numberB - numberA;
    return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime();
  });
}

export async function fetchSurveys(
  filters: SurveyFilters = {},
  userId?: string,
): Promise<Survey[]> {
  let query = supabase
    .from('encuestas')
    .select('*, areas(nombre)')
    .is('eliminado_en', null);

  if (userId) query = query.eq('usuario_id', userId);
  if (filters.desde) query = query.gte('fecha_encuesta', filters.desde);
  if (filters.hasta) query = query.lte('fecha_encuesta', filters.hasta);
  if (filters.area) query = query.eq('area_id', Number(filters.area));
  if (filters.sexo) query = query.eq('sexo', filters.sexo);
  if (filters.usuario) query = query.eq('usuario_id', filters.usuario);

  if (filters.estado === 'completas') {
    query = query.in('estado', ['completa', 'validada']);
  } else if (filters.estado && filters.estado !== 'todas') {
    query = query.eq('estado', filters.estado);
  }

  if (filters.numero) {
    const numero = Number(filters.numero);
    if (Number.isFinite(numero)) query = query.eq('numero', numero);
  }

  const { data, error } = await query
    .order('creado_en', { ascending: false })
    .limit(1000);
  if (error) throw new Error(friendlyDbError(error));
  return sortSurveys((data ?? []) as Survey[]);
}

export async function fetchSurvey(id: string): Promise<Survey | null> {
  const { data, error } = await supabase
    .from('encuestas')
    .select('*, areas(nombre)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(friendlyDbError(error));
  return (data as Survey | null) ?? null;
}

export async function fetchRecentSurveys(
  limit = 6,
  userId?: string,
): Promise<Survey[]> {
  let query = supabase
    .from('encuestas')
    .select('*, areas(nombre)')
    .is('eliminado_en', null)
    .in('estado', ['completa', 'validada']);
  if (userId) query = query.eq('usuario_id', userId);
  const { data, error } = await query
    .order('creado_en', { ascending: false })
    .order('numero', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(friendlyDbError(error));
  return (data ?? []) as Survey[];
}

export async function fetchDashboard(
  filters: DashboardFilters,
): Promise<DashboardData> {
  const { data, error } = await supabase.rpc('dashboard_resumen', {
    p_desde: filters.desde || null,
    p_hasta: filters.hasta || null,
    p_area: filters.area ? Number(filters.area) : null,
    p_sexo: filters.sexo || null,
  });
  if (error) throw new Error(friendlyDbError(error));
  const payload = Array.isArray(data) ? data[0] : data;
  return (payload ?? { insuficiente: true, total: 0 }) as DashboardData;
}

export interface SaveSurveyArgs {
  id?: string;
  clientId: string;
  form: SurveyFormState;
  complete: boolean;
  userId: string;
  existing?: Survey | null;
}

export async function saveSurvey(
  args: SaveSurveyArgs,
): Promise<{ id: string; numero: number | null }> {
  const { id, clientId, form, complete, userId, existing } = args;

  if (existing?.origen === 'importado') {
    throw new Error(
      'Los registros históricos importados son de solo lectura y no se pueden editar desde la app.',
    );
  }

  const items: Record<string, number> = {};
  for (const key of [...ITEM_KEYS_TD, ...ITEM_KEYS_PA]) {
    const value = Number(form.items[key]);
    items[key] = Number.isFinite(value) && value >= 0 ? value : 0;
  }

  const row: Record<string, unknown> = {
    fecha_encuesta: form.fecha_encuesta || null,
    edad: form.edad ? Number(form.edad) : null,
    sexo: form.sexo || null,
    estado_civil: form.estado_civil || null,
    instruccion: form.instruccion || null,
    area_id: form.area_id ? Number(form.area_id) : null,
    nivel_responsabilidad: form.nivel_responsabilidad || null,
    antiguedad: form.antiguedad || null,
    frecuencia_uso: form.frecuencia_uso || null,
    participacion: form.participacion || null,
    consentimiento: form.consentimiento,
    consentimiento_en: form.consentimiento
      ? existing?.consentimiento_en ?? new Date().toISOString()
      : null,
    observaciones: form.observaciones.trim() || null,
    estado: complete ? 'completa' : 'borrador',
    ...items,
  };

  if (!id) {
    row.usuario_id = userId;
    row.client_id = clientId;
    row.origen = 'app';
  }

  if (id) {
    const { data, error } = await supabase
      .from('encuestas')
      .update(row)
      .eq('id', id)
      .select('id, numero')
      .single();
    if (error) throw new Error(friendlyDbError(error));
    return data as { id: string; numero: number | null };
  }

  const { data, error } = await supabase
    .from('encuestas')
    .insert(row)
    .select('id, numero')
    .single();

  if (error) {
    if (String((error as { code?: string }).code) === '23505') {
      const { data: existingRow } = await supabase
        .from('encuestas')
        .select('id, numero')
        .eq('client_id', clientId)
        .maybeSingle();
      if (existingRow) {
        return existingRow as { id: string; numero: number | null };
      }
    }
    throw new Error(friendlyDbError(error));
  }

  return data as { id: string; numero: number | null };
}

export async function softDeleteSurvey(id: string): Promise<void> {
  const { error } = await supabase
    .from('encuestas')
    .update({ eliminado_en: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(friendlyDbError(error));
}

export async function updateProfile(
  id: string,
  patch: Partial<Pick<Profile, 'nombre' | 'rol' | 'activo'>>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(friendlyDbError(error));
  return data as Profile;
}

export async function createArea(input: {
  nombre: string;
  orden: number;
  descripcion?: string;
}): Promise<Area> {
  const { data, error } = await supabase
    .from('areas')
    .insert({
      nombre: input.nombre.trim(),
      orden: input.orden,
      descripcion: input.descripcion?.trim() || null,
      activo: true,
    })
    .select('*')
    .single();
  if (error) throw new Error(friendlyDbError(error));
  return data as Area;
}

export async function updateArea(
  id: number,
  patch: Partial<Pick<Area, 'nombre' | 'activo' | 'orden' | 'descripcion'>>,
): Promise<Area> {
  const { data, error } = await supabase
    .from('areas')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(friendlyDbError(error));
  return data as Area;
}

export async function adminCreateUser(input: {
  email: string;
  password: string;
  nombre: string;
  rol: Rol;
}): Promise<AdminFunctionResponse> {
  const { data, error } = await supabase.rpc('admin_crear_usuario', {
    p_email: input.email,
    p_password: input.password,
    p_nombre: input.nombre,
    p_rol: input.rol,
  });

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  if (!data) {
    return { ok: false, error: 'La base de datos no devolvió respuesta.' };
  }

  return data as unknown as AdminFunctionResponse;
}

export async function adminResetPassword(
  id: string,
  password: string,
): Promise<AdminFunctionResponse> {
  const { data, error } = await supabase.rpc('admin_restablecer_password', {
    p_id: id,
    p_password: password,
  });

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  if (!data) {
    return { ok: false, error: 'La base de datos no devolvió respuesta.' };
  }

  return data as unknown as AdminFunctionResponse;
}

export async function changePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(friendlyDbError(error));
}

export async function updateMyProfileName(
  id: string,
  nombre: string,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ nombre: nombre.trim() })
    .eq('id', id);
  if (error) throw new Error(friendlyDbError(error));
}

export async function setProfileRole(id: string, rol: Rol): Promise<void> {
  await updateProfile(id, { rol });
}
