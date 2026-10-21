import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  Gauge,
  Plus,
  RefreshCw,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  errorMessage,
  fetchAreas,
  fetchDashboard,
  fetchProfiles,
  fetchRecentSurveys,
  fetchSurveys,
} from '../lib/api';
import {
  computeScores,
  formatDate,
  formatDecimal,
  formatNumber,
  formatPercent,
  getAreaName,
  shortName,
} from '../lib/format';
import { META_ENCUESTAS } from '../lib/catalog';
import { exportSurveysToExcel } from '../lib/excel';
import type {
  Area,
  DashboardData,
  DashboardFilters,
  Profile,
  Survey,
} from '../types';
import { Button, buttonClass } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { Alert, Avatar, EmptyState, PageLoader, SurveyStatusBadge } from '../components/Ui';
import { KpiCard } from '../components/KpiCard';
import { DimensionBars } from '../components/DimensionBars';
import { DistributionChart } from '../components/DistributionChart';
import { EvolutionChart } from '../components/EvolutionChart';

const EMPTY_FILTERS: DashboardFilters = {
  desde: '',
  hasta: '',
  area: '',
  sexo: '',
};

export function DashboardPage() {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();

  const [areas, setAreas] = useState<Area[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recent, setRecent] = useState<Survey[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (activeRefreshing = false) => {
      if (activeRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [dashboardData, areaData, recentData, profileData] = await Promise.all([
          fetchDashboard(filters),
          fetchAreas(),
          fetchRecentSurveys(6, isAdmin ? undefined : profile?.id),
          isAdmin ? fetchProfiles() : Promise.resolve([] as Profile[]),
        ]);
        setDashboard(dashboardData);
        setAreas(areaData);
        setRecent(recentData);
        setProfiles(profileData);
      } catch (loadError) {
        setError(errorMessage(loadError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters, isAdmin, profile?.id],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchDashboard(filters),
      fetchAreas(),
      fetchRecentSurveys(6, isAdmin ? undefined : profile?.id),
      isAdmin ? fetchProfiles() : Promise.resolve([] as Profile[]),
    ])
      .then(([dashboardData, areaData, recentData, profileData]) => {
        if (!active) return;
        setDashboard(dashboardData);
        setAreas(areaData);
        setRecent(recentData);
        setProfiles(profileData);
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
  }, [filters, isAdmin, profile?.id]);

  const profilesById = useMemo(
    () => new Map(profiles.map((item) => [item.id, item])),
    [profiles],
  );

  const kpis = dashboard?.kpis;
  const total = kpis?.total ?? 0;
  const progress = total ? Math.min(100, (total / META_ENCUESTAS) * 100) : 0;

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
      const [surveys, exportAreas, exportProfiles] = await Promise.all([
        fetchSurveys(
          {
            desde: filters.desde || undefined,
            hasta: filters.hasta || undefined,
            area: filters.area || undefined,
            sexo: filters.sexo || undefined,
            estado: 'completas',
          },
          isAdmin ? undefined : profile.id,
        ),
        fetchAreas(true),
        isAdmin ? fetchProfiles() : Promise.resolve([] as Profile[]),
      ]);
      await exportSurveysToExcel({
        surveys,
        areas: exportAreas,
        profiles: exportProfiles,
        isAdmin,
      });
      toast('Archivo Excel generado con la hoja Base 2026 y el resumen.', 'success');
    } catch (exportError) {
      toast(errorMessage(exportError), 'error');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !dashboard) {
    return <PageLoader label="Calculando resultados agregados…" />;
  }

  const hasData = !!dashboard && !dashboard.insuficiente && total > 0;
  const sexoF = dashboard?.por_sexo?.find((item) => item.sexo === 'F');
  const sexoM = dashboard?.por_sexo?.find((item) => item.sexo === 'M');

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Panel de control"
        title={profile ? `Hola, ${shortName(profile.nombre)}` : 'Resultados del estudio'}
        subtitle={
          isAdmin
            ? 'Vista agregada de todas las encuestas del estudio. Los registros individuales se gestionan en Registros.'
            : 'Vista agregada y anónima del estudio. Tus respuestas individuales solo están disponibles en Mis registros.'
        }
        actions={
          <>
            <Link
              to="/encuestas/nueva"
              className={buttonClass({ variant: 'primary' })}
            >
              <Plus size={15} />
              Nueva encuesta
            </Link>
            <Button
              variant="ghost"
              icon={<Download size={15} />}
              loading={exporting}
              disabled={!hasData}
              onClick={() => void handleExport()}
            >
              Exportar
            </Button>
          </>
        }
      />

      <form className="card filter-card" onSubmit={applyFilters}>
        <div className="field">
          <label className="field-label" htmlFor="fecha-desde">
            Desde
          </label>
          <input
            id="fecha-desde"
            className="input"
            type="date"
            value={draftFilters.desde}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, desde: event.target.value }))
            }
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="fecha-hasta">
            Hasta
          </label>
          <input
            id="fecha-hasta"
            className="input"
            type="date"
            value={draftFilters.hasta}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, hasta: event.target.value }))
            }
          />
        </div>
        <div className="field grow">
          <label className="field-label" htmlFor="filtro-area">
            Área / unidad orgánica
          </label>
          <select
            id="filtro-area"
            className="select"
            value={draftFilters.area}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, area: event.target.value }))
            }
          >
            <option value="">Todas las áreas</option>
            {areas.map((area) => (
              <option value={area.id} key={area.id}>
                {area.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flexBasis: 120 }}>
          <label className="field-label" htmlFor="filtro-sexo">
            Sexo
          </label>
          <select
            id="filtro-sexo"
            className="select"
            value={draftFilters.sexo}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, sexo: event.target.value }))
            }
          >
            <option value="">Todos</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
          </select>
        </div>
        <div className="filter-actions">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={clearFilters}
            icon={<RefreshCw size={13} />}
          >
            Limpiar
          </Button>
          <Button variant="secondary" size="sm" type="submit" loading={refreshing}>
            Aplicar
          </Button>
        </div>
      </form>

      {error && (
        <div style={{ marginTop: 16 }}>
          <Alert tone="danger" title="No se pudieron cargar los resultados.">
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

      {dashboard?.inactivo && (
        <div style={{ marginTop: 16 }}>
          <Alert tone="danger" title="Cuenta desactivada.">
            Tu cuenta ya no tiene acceso al estudio. Comunícate con el administrador.
          </Alert>
        </div>
      )}

      {dashboard?.insuficiente ? (
        <div className="card" style={{ marginTop: 20 }}>
          <EmptyState
            icon={<ShieldCheck size={20} />}
            title="Aún no hay suficientes respuestas para mostrar el panel"
            text={`Para proteger la confidencialidad, los usuarios encuestadores ven los resultados agregados cuando existen al menos 3 encuestas completas. Por ahora hay ${formatNumber(
              dashboard.total ?? 0,
            )} con los filtros seleccionados.`}
            actions={
              <Link
                to="/encuestas/nueva"
                className={buttonClass({ variant: 'primary', size: 'sm' })}
              >
                <Plus size={14} />
                Registrar una encuesta
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="kpi-grid section">
            <KpiCard
              label="Encuestas completas"
              value={formatNumber(total)}
              icon={<ClipboardList size={17} />}
              meta={
                kpis?.sin_fecha ? (
                  <>
                    <strong>{formatNumber(kpis.sin_fecha)}</strong> históricos sin fecha
                    de aplicación
                  </>
                ) : (
                  'Registros incluidos en el análisis'
                )
              }
            />
            <KpiCard
              label="Promedio Transformación Digital"
              value={formatDecimal(kpis?.td)}
              unit="/ 5"
              icon={<Gauge size={17} />}
              iconTone="onyx"
              meta="Escala 1–5 · N/A excluido de los promedios"
            />
            <KpiCard
              label="Promedio Procesos Administrativos"
              value={formatDecimal(kpis?.pa)}
              unit="/ 5"
              icon={<BarChart3 size={17} />}
              iconTone="onyx"
              meta="Escala 1–5 · N/A excluido de los promedios"
            />
            <KpiCard
              label="Avance hacia la meta"
              value={formatPercent(progress, 1)}
              icon={<Target size={17} />}
              meta={
                <>
                  <strong>{formatNumber(total)}</strong> de{' '}
                  {formatNumber(META_ENCUESTAS)} encuestas previstas
                </>
              }
              footer={
                <div>
                  <div className="progress" aria-hidden="true">
                    <div className="progress-bar" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="progress-meta">
                    <span>{formatPercent(progress, 1)} completado</span>
                    <span>{formatNumber(kpis?.este_mes ?? 0)} este mes</span>
                  </div>
                </div>
              }
            />
          </div>

          {!!kpis?.sin_fecha && (
            <div className="section">
              <Alert tone="info" icon={<CalendarDays size={16} />}>
                <strong>107 registros históricos sin fecha.</strong> Se incluyen en el
                total y en los promedios, pero no en la evolución mensual porque el
                archivo original no registraba la fecha de aplicación.
              </Alert>
            </div>
          )}

          <div className="dimension-columns section">
            <section className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Transformación digital</h2>
                  <p className="card-subtitle">
                    Promedio por dimensión · escala 1 a 5
                  </p>
                </div>
                <span className="badge badge-muted">TD</span>
              </div>
              <div className="card-body">
                <DimensionBars
                  instrument="TD"
                  items={dashboard?.dimensiones_td ?? []}
                />
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Procesos administrativos</h2>
                  <p className="card-subtitle">
                    Promedio por dimensión · escala 1 a 5
                  </p>
                </div>
                <span className="badge badge-muted">PA</span>
              </div>
              <div className="card-body">
                <DimensionBars
                  instrument="PA"
                  items={dashboard?.dimensiones_pa ?? []}
                />
              </div>
            </section>
          </div>

          <div className="dashboard-grid section">
            <div className="stack gap-16">
              <section className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Evolución mensual</h2>
                    <p className="card-subtitle">
                      Encuestas con fecha de aplicación y promedios del mes
                    </p>
                  </div>
                  <span className="badge badge-muted">
                    {formatNumber(dashboard?.evolucion?.length ?? 0)} meses
                  </span>
                </div>
                <div className="card-body">
                  <EvolutionChart data={dashboard?.evolucion ?? []} />
                </div>
              </section>

              <section className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Promedios por área</h2>
                    <p className="card-subtitle">
                      Comparación de las unidades orgánicas participantes
                    </p>
                  </div>
                  <Users size={16} className="muted" />
                </div>
                <div className="card-body">
                  {dashboard?.por_area?.length ? (
                    <>
                      <div
                        className="area-header"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) 48px 52px 52px',
                          gap: 10,
                        }}
                      >
                        <span>Área</span>
                        <span className="text-right">n</span>
                        <span className="text-right">TD</span>
                        <span className="text-right">PA</span>
                      </div>
                      <div className="area-list">
                        {dashboard.por_area.map((area) => (
                          <div className="area-row" key={area.nombre}>
                            <div className="area-name">
                              <span title={area.nombre}>{area.nombre}</span>
                              <span>{formatNumber(area.n)} encuestas</span>
                            </div>
                            <span className="area-metric">{formatNumber(area.n)}</span>
                            <span className="area-metric strong">
                              {formatDecimal(area.td)}
                            </span>
                            <span className="area-metric">
                              {formatDecimal(area.pa)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {!isAdmin && (
                        <p className="field-help" style={{ marginTop: 10 }}>
                          Se ocultan los grupos con menos de 3 encuestas para proteger
                          la confidencialidad.
                        </p>
                      )}
                    </>
                  ) : (
                    <EmptyState
                      icon={<Users size={18} />}
                      title="Sin datos por área"
                      text="No hay encuestas completas para los filtros seleccionados."
                    />
                  )}
                </div>
              </section>
            </div>

            <div className="stack gap-16">
              <section className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Distribución de respuestas</h2>
                    <p className="card-subtitle">Todos los ítems TD y PA</p>
                  </div>
                </div>
                <div className="card-body">
                  <DistributionChart data={dashboard?.distribucion ?? []} />
                </div>
              </section>

              <section className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Promedios por sexo</h2>
                    <p className="card-subtitle">Comparación agregada</p>
                  </div>
                </div>
                <div className="card-body">
                  <div className="sex-grid">
                    <div className="sex-card">
                      <div className="sex-card-head">
                        <span className="sex-icon">F</span>
                        Femenino
                      </div>
                      <div className="sex-values">
                        <div className="sex-value">
                          <strong>{formatNumber(sexoF?.n ?? 0)}</strong>
                          <span>encuestas</span>
                        </div>
                        <div className="sex-value">
                          <strong>{formatDecimal(sexoF?.td)}</strong>
                          <span>TD</span>
                        </div>
                        <div className="sex-value">
                          <strong>{formatDecimal(sexoF?.pa)}</strong>
                          <span>PA</span>
                        </div>
                      </div>
                    </div>
                    <div className="sex-card">
                      <div className="sex-card-head">
                        <span className="sex-icon">M</span>
                        Masculino
                      </div>
                      <div className="sex-values">
                        <div className="sex-value">
                          <strong>{formatNumber(sexoM?.n ?? 0)}</strong>
                          <span>encuestas</span>
                        </div>
                        <div className="sex-value">
                          <strong>{formatDecimal(sexoM?.td)}</strong>
                          <span>TD</span>
                        </div>
                        <div className="sex-value">
                          <strong>{formatDecimal(sexoM?.pa)}</strong>
                          <span>PA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      <section className="card section">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              {isAdmin ? 'Últimas encuestas registradas' : 'Tus últimas encuestas'}
            </h2>
            <p className="card-subtitle">
              {isAdmin
                ? 'Trazabilidad de los registros más recientes del estudio'
                : 'Solo tú puedes ver el detalle de estas encuestas'}
            </p>
          </div>
          <Link
            to={isAdmin ? '/registros' : '/mis-registros'}
            className="card-link"
          >
            Ver todos
          </Link>
        </div>
        <div className="card-body" style={{ paddingTop: 8 }}>
          {recent.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Fecha</th>
                    <th>Área</th>
                    <th className="text-right">TD</th>
                    <th className="text-right">PA</th>
                    {isAdmin && <th>Registrado por</th>}
                    <th>Estado</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {recent.map((survey) => {
                    const scores = computeScores(survey);
                    const owner = survey.usuario_id
                      ? profilesById.get(survey.usuario_id)
                      : undefined;
                    return (
                      <tr key={survey.id}>
                        <td className="cell-mono cell-strong">
                          {survey.numero ? `N° ${survey.numero}` : '—'}
                        </td>
                        <td className="cell-nowrap">
                          {formatDate(survey.fecha_encuesta)}
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          <span className="text-truncate" style={{ display: 'block' }}>
                            {getAreaName(survey)}
                          </span>
                        </td>
                        <td className="cell-mono text-right">
                          {formatDecimal(scores.td)}
                        </td>
                        <td className="cell-mono text-right">
                          {formatDecimal(scores.pa)}
                        </td>
                        {isAdmin && (
                          <td>
                            <div className="user-cell">
                              <Avatar
                                name={
                                  owner?.nombre ||
                                  (survey.origen === 'importado' ? 'Histórico' : '—')
                                }
                              />
                              <span className="user-cell-name">
                                {owner?.nombre ||
                                  (survey.origen === 'importado' ? 'Histórico' : '—')}
                              </span>
                            </div>
                          </td>
                        )}
                        <td>
                          <SurveyStatusBadge
                            estado={survey.estado}
                            origen={survey.origen}
                          />
                        </td>
                        <td className="text-right">
                          <Link
                            to={`/encuestas/${survey.id}`}
                            className="btn btn-ghost btn-sm"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<FileText size={19} />}
              title="Todavía no hay encuestas"
              text={
                isAdmin
                  ? 'Cuando el equipo registre encuestas, aparecerán aquí.'
                  : 'Registra tu primera encuesta para empezar.'
              }
              actions={
                <Link
                  to="/encuestas/nueva"
                  className={buttonClass({ variant: 'primary', size: 'sm' })}
                >
                  <Plus size={14} />
                  Nueva encuesta
                </Link>
              }
            />
          )}
        </div>
      </section>

      <div className="row gap-6 small muted" style={{ marginTop: 16 }}>
        <ShieldCheck size={13} />
        <span>
          Los resultados del panel son agregados. Las respuestas individuales no se
          muestran a otros encuestadores.
        </span>
      </div>
    </div>
  );
}
