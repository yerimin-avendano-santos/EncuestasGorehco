import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  errorMessage,
  fetchAreas,
  fetchProfiles,
  fetchSurveys,
} from '../lib/api';
import {
  computeScores,
  formatDate,
  formatDecimal,
  formatNumber,
  getAreaName,
  plural,
} from '../lib/format';
import { exportSurveysToExcel } from '../lib/excel';
import type {
  Area,
  Profile,
  Survey,
  SurveyFilters,
} from '../types';
import { Button, buttonClass } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { Alert, Avatar, EmptyState, SurveyStatusBadge } from '../components/Ui';

const PAGE_SIZE = 12;
const EMPTY_FILTERS: SurveyFilters = {
  numero: '',
  desde: '',
  hasta: '',
  area: '',
  sexo: '',
  usuario: '',
};

export function MyRecordsPage() {
  return <RecordsPage scope="mine" />;
}

export function AllRecordsPage() {
  return <RecordsPage scope="all" />;
}

function RecordsPage({ scope }: { scope: 'mine' | 'all' }) {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const isAll = scope === 'all';

  const [areas, setAreas] = useState<Area[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filters, setFilters] = useState<SurveyFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<SurveyFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [surveyData, areaData, profileData] = await Promise.all([
        fetchSurveys(
          { ...filters, estado: 'todas' },
          isAll ? undefined : profile?.id,
        ),
        fetchAreas(true),
        isAll ? fetchProfiles() : Promise.resolve([] as Profile[]),
      ]);
      setSurveys(surveyData);
      setAreas(areaData);
      setProfiles(profileData);
      setPage(0);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchSurveys(
        { ...filters, estado: 'todas' },
        isAll ? undefined : profile?.id,
      ),
      fetchAreas(true),
      isAll ? fetchProfiles() : Promise.resolve([] as Profile[]),
    ])
      .then(([surveyData, areaData, profileData]) => {
        if (!active) return;
        setSurveys(surveyData);
        setAreas(areaData);
        setProfiles(profileData);
        setPage(0);
      })
      .catch((loadError) => {
        if (active) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // `filters` cambia solo al aplicar el formulario de filtros.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, isAll, profile?.id]);

  const profilesById = useMemo(
    () => new Map(profiles.map((item) => [item.id, item])),
    [profiles],
  );

  const pageCount = Math.max(1, Math.ceil(surveys.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = surveys.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const first = surveys.length ? safePage * PAGE_SIZE + 1 : 0;
  const last = Math.min(surveys.length, (safePage + 1) * PAGE_SIZE);
  const hasFilters = Object.values(filters).some(Boolean);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    if (
      draftFilters.desde &&
      draftFilters.hasta &&
      draftFilters.desde > draftFilters.hasta
    ) {
      toast('La fecha inicial no puede ser posterior a la fecha final.', 'error');
      return;
    }
    setFilters({ ...draftFilters });
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  };

  const handleExport = async () => {
    if (!profile) return;
    setExporting(true);
    try {
      const [exportSurveys, exportAreas, exportProfiles] = await Promise.all([
        fetchSurveys(
          { ...filters, estado: 'completas' },
          isAll ? undefined : profile.id,
        ),
        fetchAreas(true),
        isAll ? fetchProfiles() : Promise.resolve([] as Profile[]),
      ]);
      await exportSurveysToExcel({
        surveys: exportSurveys,
        areas: exportAreas,
        profiles: exportProfiles,
        isAdmin: isAll && isAdmin,
      });
      toast(
        `Excel generado con ${formatNumber(exportSurveys.length)} encuestas.`,
        'success',
      );
    } catch (exportError) {
      toast(errorMessage(exportError), 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container page">
      <PageHeader
        eyebrow={isAll ? 'Administración del estudio' : 'Tus registros'}
        title={isAll ? 'Todos los registros' : 'Mis registros'}
        subtitle={
          isAll
            ? 'Vista completa de las encuestas del estudio, incluidos los 107 registros históricos importados.'
            : 'Solo tú puedes ver y exportar las encuestas que registraste. Los registros históricos no están asociados a tu cuenta.'
        }
        actions={
          <>
            {!isAll && (
              <Link
                to="/encuestas/nueva"
                className={buttonClass({ variant: 'primary' })}
              >
                <Plus size={15} />
                Nueva encuesta
              </Link>
            )}
            <Button
              variant="ghost"
              icon={<Download size={15} />}
              loading={exporting}
              disabled={!surveys.length}
              onClick={() => void handleExport()}
            >
              Exportar Excel
            </Button>
            <Button
              variant="ghost"
              size="icon"
              icon={<RefreshCw size={15} />}
              onClick={() => void load(true)}
              aria-label="Actualizar"
              loading={refreshing}
            />
          </>
        }
      />

      {isAll && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="info" icon={<Users size={16} />}>
            Como administrador ves y exportas <strong>todas</strong> las encuestas.
            Los encuestadores solo ven las suyas. La hoja <strong>Base 2026</strong>{' '}
            mantiene el anonimato y no incluye el nombre del encuestado.
          </Alert>
        </div>
      )}

      <form className="card filter-card" onSubmit={applyFilters}>
        <div className="field" style={{ flexBasis: 120 }}>
          <label className="field-label" htmlFor="filtro-numero">
            N° de encuesta
          </label>
          <input
            id="filtro-numero"
            className="input"
            type="search"
            inputMode="numeric"
            placeholder="Ej. 108"
            value={draftFilters.numero ?? ''}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                numero: event.target.value,
              }))
            }
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="registros-desde">
            Desde
          </label>
          <input
            id="registros-desde"
            className="input"
            type="date"
            value={draftFilters.desde ?? ''}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                desde: event.target.value,
              }))
            }
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="registros-hasta">
            Hasta
          </label>
          <input
            id="registros-hasta"
            className="input"
            type="date"
            value={draftFilters.hasta ?? ''}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                hasta: event.target.value,
              }))
            }
          />
        </div>
        <div className="field grow">
          <label className="field-label" htmlFor="registros-area">
            Área
          </label>
          <select
            id="registros-area"
            className="select"
            value={draftFilters.area ?? ''}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                area: event.target.value,
              }))
            }
          >
            <option value="">Todas las áreas</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flexBasis: 120 }}>
          <label className="field-label" htmlFor="registros-sexo">
            Sexo
          </label>
          <select
            id="registros-sexo"
            className="select"
            value={draftFilters.sexo ?? ''}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                sexo: event.target.value,
              }))
            }
          >
            <option value="">Todos</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
          </select>
        </div>
        {isAll && (
          <div className="field grow">
            <label className="field-label" htmlFor="registros-usuario">
              Registrado por
            </label>
            <select
              id="registros-usuario"
              className="select"
              value={draftFilters.usuario ?? ''}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  usuario: event.target.value,
                }))
              }
            >
              <option value="">Todos los usuarios</option>
              {profiles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="filter-actions">
          <Button
            variant="text"
            size="sm"
            type="button"
            onClick={clearFilters}
            icon={<RefreshCw size={13} />}
          >
            Limpiar
          </Button>
          <Button variant="secondary" size="sm" type="submit" loading={refreshing}>
            <Search size={13} />
            Aplicar
          </Button>
        </div>
      </form>

      {error && (
        <div style={{ marginTop: 16 }}>
          <Alert tone="danger" title="No se pudieron cargar los registros.">
            {error}{' '}
            <button
              type="button"
              className="btn btn-text btn-sm"
              onClick={() => void load(true)}
            >
              Reintentar
            </button>
          </Alert>
        </div>
      )}

      <div className="table-wrap section">
        <div className="table-toolbar">
          <div className="row gap-8 wrap">
            <span className="table-toolbar-title">
              {hasFilters ? 'Resultados filtrados' : 'Encuestas registradas'}
            </span>
            <span className="badge badge-muted">
              {plural(surveys.length, 'registro', 'registros')}
            </span>
            {refreshing && (
              <span className="loading-inline">
                <span className="spinner" style={{ width: 12, height: 12 }} />
                Actualizando
              </span>
            )}
          </div>
          <span className="small muted">
            {isAll ? 'Vista global' : 'Vista personal'} · orden por N° descendente
          </span>
        </div>

        {loading && !surveys.length ? (
          <div className="page-loader" style={{ minHeight: 260 }}>
            <span className="spinner" />
            <span>Cargando registros…</span>
          </div>
        ) : surveys.length ? (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Fecha</th>
                    <th>Área / unidad</th>
                    <th>Sexo</th>
                    <th className="text-right">Edad</th>
                    <th className="text-right">TD</th>
                    <th className="text-right">PA</th>
                    {isAll && <th>Registrado por</th>}
                    <th>Origen</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((survey) => {
                    const scores = computeScores(survey);
                    const owner = survey.usuario_id
                      ? profilesById.get(survey.usuario_id)
                      : undefined;
                    return (
                      <tr key={survey.id}>
                        <td className="cell-mono cell-strong cell-nowrap">
                          {survey.numero ? `N° ${survey.numero}` : '—'}
                        </td>
                        <td className="cell-nowrap">
                          {formatDate(survey.fecha_encuesta)}
                        </td>
                        <td style={{ maxWidth: 230 }}>
                          <span className="text-truncate" style={{ display: 'block' }}>
                            {getAreaName(survey)}
                          </span>
                        </td>
                        <td className="cell-nowrap">{survey.sexo ?? '—'}</td>
                        <td className="cell-mono text-right">
                          {survey.edad ?? '—'}
                        </td>
                        <td className="cell-mono text-right">
                          {formatDecimal(scores.td)}
                        </td>
                        <td className="cell-mono text-right">
                          {formatDecimal(scores.pa)}
                        </td>
                        {isAll && (
                          <td>
                            <div className="user-cell">
                              <Avatar
                                name={
                                  owner?.nombre ||
                                  (survey.origen === 'importado' ? 'Histórico' : '—')
                                }
                              />
                              <div className="user-cell-copy">
                                <span className="user-cell-name">
                                  {owner?.nombre ||
                                    (survey.origen === 'importado'
                                      ? 'Histórico'
                                      : 'Sin usuario')}
                                </span>
                                {owner && (
                                  <span className="user-cell-email">
                                    {owner.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        )}
                        <td>
                          <SurveyStatusBadge
                            estado={survey.estado}
                            origen={survey.origen}
                          />
                        </td>
                        <td>
                          <div className="table-actions">
                            <Link
                              to={`/encuestas/${survey.id}`}
                              className="btn btn-ghost btn-sm"
                            >
                              Ver
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>
                Mostrando {formatNumber(first)}–{formatNumber(last)} de{' '}
                {plural(surveys.length, 'registro', 'registros')}
              </span>
              <div className="pagination">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPage(Math.max(0, safePage - 1))}
                  disabled={safePage === 0}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="small muted" style={{ padding: '0 6px' }}>
                  Página {safePage + 1} de {pageCount}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                  disabled={safePage >= pageCount - 1}
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<FileText size={20} />}
            title={
              hasFilters
                ? 'No hay encuestas con esos filtros'
                : isAll
                  ? 'No hay registros todavía'
                  : 'Todavía no has registrado encuestas'
            }
            text={
              hasFilters
                ? 'Prueba con otro rango de fechas, área, sexo o número de encuesta.'
                : isAll
                  ? 'Los registros que complete el equipo aparecerán aquí.'
                  : 'Registra tu primera encuesta y aparecerá en esta lista.'
            }
            actions={
              hasFilters ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : !isAll ? (
                <Link
                  to="/encuestas/nueva"
                  className={buttonClass({ variant: 'primary', size: 'sm' })}
                >
                  <Plus size={14} />
                  Nueva encuesta
                </Link>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
