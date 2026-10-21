export type Rol = 'admin' | 'encuestador';
export type EstadoEncuesta = 'borrador' | 'completa' | 'validada';
export type OrigenEncuesta = 'app' | 'importado';
export type Sexo = 'M' | 'F';

export interface Profile {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface Area {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  orden: number;
  creado_en: string;
}

export interface SurveyBase {
  id: string;
  numero: number | null;
  client_id: string;
  usuario_id: string | null;
  consentimiento: boolean;
  consentimiento_en: string | null;
  fecha_encuesta: string | null;
  edad: number | null;
  sexo: Sexo | null;
  estado_civil: string | null;
  instruccion: string | null;
  area_id: number | null;
  nivel_responsabilidad: string | null;
  antiguedad: string | null;
  frecuencia_uso: string | null;
  participacion: string | null;
  estado: EstadoEncuesta;
  origen: OrigenEncuesta;
  observaciones: string | null;
  creado_en: string;
  actualizado_en: string;
  eliminado_en: string | null;
  areas?: { nombre: string } | null;
  area_nombre?: string | null;
}

export interface Survey extends SurveyBase {
  [key: string]: unknown;
}

export interface SurveyFormState {
  fecha_encuesta: string;
  edad: string;
  sexo: string;
  estado_civil: string;
  instruccion: string;
  area_id: string;
  nivel_responsabilidad: string;
  antiguedad: string;
  frecuencia_uso: string;
  participacion: string;
  consentimiento: boolean;
  observaciones: string;
  items: Record<string, number>;
}

export interface DashboardKpis {
  total: number;
  td: number | null;
  pa: number | null;
  sin_fecha: number;
  este_mes: number;
}

export interface DashboardDimension {
  id: number;
  nombre: string;
  promedio: number | null;
  n: number;
}

export interface DashboardDistribution {
  valor: number;
  n: number;
}

export interface DashboardArea {
  nombre: string;
  n: number;
  td: number | null;
  pa: number | null;
}

export interface DashboardSexo {
  sexo: Sexo;
  n: number;
  td: number | null;
  pa: number | null;
}

export interface DashboardMonth {
  mes: string;
  n: number;
  td: number | null;
  pa: number | null;
}

export interface DashboardItem {
  item: number;
  promedio: number | null;
  n: number;
}

export interface DashboardData {
  insuficiente: boolean;
  total?: number;
  inactivo?: boolean;
  kpis?: DashboardKpis;
  meta?: number;
  dimensiones_td?: DashboardDimension[];
  dimensiones_pa?: DashboardDimension[];
  distribucion?: DashboardDistribution[];
  por_area?: DashboardArea[];
  por_sexo?: DashboardSexo[];
  evolucion?: DashboardMonth[];
  items_td?: DashboardItem[];
  items_pa?: DashboardItem[];
}

export interface DashboardFilters {
  desde: string;
  hasta: string;
  area: string;
  sexo: string;
}

export interface SurveyFilters {
  desde?: string;
  hasta?: string;
  area?: string;
  sexo?: string;
  usuario?: string;
  estado?: string;
  numero?: string;
}

export interface UserAdminAction {
  action: 'ping' | 'create' | 'reset' | 'toggle' | 'role';
  id?: string;
  email?: string;
  password?: string;
  nombre?: string;
  rol?: Rol;
  activo?: boolean;
}

export interface AdminFunctionResponse {
  ok: boolean;
  error?: string;
  data?: unknown;
}
