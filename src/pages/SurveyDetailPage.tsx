import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarDays,
  Clock3,
  Download,
  Info,
  MapPin,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  errorMessage,
  fetchAreas,
  fetchProfiles,
  fetchSurvey,
  softDeleteSurvey,
} from '../lib/api';
import {
  answerLabel,
  answerShort,
  computeDimensionScores,
  computeScores,
  formatDate,
  formatDateTime,
  formatDecimal,
  getAreaName,
  getItemValue,
} from '../lib/format';
import {
  DIMENSIONES_PA,
  DIMENSIONES_TD,
  TODAS_LAS_DIMENSIONES,
} from '../lib/catalog';
import { exportSurveysToExcel } from '../lib/excel';
import type { Area, Profile, Survey } from '../types';
import { Button, buttonClass } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DimensionBars } from '../components/DimensionBars';
import { PageHeader } from '../components/PageHeader';
import { Alert, Avatar, EmptyState, PageLoader, SurveyStatusBadge } from '../components/Ui';

export function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      id ? fetchSurvey(id) : Promise.resolve(null),
      fetchAreas(true),
      isAdmin ? fetchProfiles() : Promise.resolve([] as Profile[]),
    ])
      .then(([surveyData, areaData, profileData]) => {
        if (!active) return;
        setSurvey(surveyData);
        setAreas(areaData);
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
  }, [id, isAdmin]);

  const scores = useMemo(
    () => (survey ? computeScores(survey) : { td: null, pa: null, general: null }),
    [survey],
  );

  const tdDimensions = useMemo(() => {
    if (!survey) return [];
    const values = computeDimensionScores(survey, 'TD', DIMENSIONES_TD);
    return DIMENSIONES_TD.map((dimension) => {
      const score = values.find((value) => value.id === dimension.id);
      return {
        id: dimension.id,
        nombre: dimension.nombre,
        promedio: score?.promedio ?? null,
        n: score?.n ?? 0,
      };
    });
  }, [survey]);

  const paDimensions = useMemo(() => {
    if (!survey) return [];
    const values = computeDimensionScores(survey, 'PA', DIMENSIONES_PA);
    return DIMENSIONES_PA.map((dimension) => {
      const score = values.find((value) => value.id === dimension.id);
      return {
        id: dimension.id,
        nombre: dimension.nombre,
        promedio: score?.promedio ?? null,
        n: score?.n ?? 0,
      };
    });
  }, [survey]);

  const owner = useMemo(() => {
    if (!survey) return undefined;
    if (isAdmin && survey.usuario_id) {
      return profiles.find((item) => item.id === survey.usuario_id);
    }
    return profile ?? undefined;
  }, [survey, isAdmin, profiles, profile]);

  const ownerName =
    owner?.nombre ||
    (survey?.origen === 'importado' ? 'Registro histórico' : 'Sin usuario');

  const canEdit =
    !!survey &&
    survey.origen === 'app' &&
    !survey.eliminado_en &&
    (isAdmin || survey.usuario_id === profile?.id);
  const canDelete = !!survey && isAdmin && survey.origen === 'app';

  const handleExport = async () => {
    if (!survey) return;
    setExporting(true);
    try {
      const exportAreas = areas.length ? areas : await fetchAreas(true);
      const exportProfiles = isAdmin
        ? profiles.length
          ? profiles
          : await fetchProfiles()
        : [];
      await exportSurveysToExcel({
        surveys: [survey],
        areas: exportAreas,
        profiles: exportProfiles,
        isAdmin,
      });
      toast('Se descargó un Excel con esta encuesta.', 'success');
    } catch (exportError) {
      toast(errorMessage(exportError), 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!survey) return;
    setDeleting(true);
    try {
      await softDeleteSurvey(survey.id);
      toast('La encuesta se retiró del análisis sin borrar el registro de auditoría.', 'success');
      setConfirmDelete(false);
      navigate(isAdmin ? '/registros' : '/mis-registros', { replace: true });
    } catch (deleteError) {
      toast(errorMessage(deleteError), 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <PageLoader label="Cargando la encuesta…" />;
  }

  if (error) {
    return (
      <div className="container page">
        <PageHeader
          eyebrow="Detalle"
          title="No se pudo cargar la encuesta"
          backTo={isAdmin ? '/registros' : '/mis-registros'}
        />
        <Alert tone="danger" title="Ocurrió un problema.">
          {error}
        </Alert>
      </div>
    );
  }

  if (!survey || survey.eliminado_en) {
    return (
      <div className="container page">
        <PageHeader
          eyebrow="Detalle"
          title="Encuesta no disponible"
          backTo={isAdmin ? '/registros' : '/mis-registros'}
        />
        <div className="card">
          <EmptyState
            icon={<Info size={20} />}
            title="No encontramos esta encuesta"
            text="Puede haber sido retirada del análisis o no tienes permisos para verla."
            actions={
              <Link
                to={isAdmin ? '/registros' : '/mis-registros'}
                className={buttonClass({ variant: 'primary', size: 'sm' })}
              >
                Volver a la lista
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <PageHeader
        eyebrow={isAdmin ? 'Administración del estudio' : 'Mi registro'}
        title="Detalle de la encuesta"
        subtitle="Información completa de la encuesta seleccionada."
        backTo={isAdmin ? '/registros' : '/mis-registros'}
        backLabel={isAdmin ? 'Todos los registros' : 'Mis registros'}
        actions={
          <>
            {canEdit && (
              <Link
                to={`/encuestas/${survey.id}/editar`}
                className={buttonClass({ variant: 'secondary' })}
              >
                <Pencil size={14} />
                Editar
              </Link>
            )}
            <Button
              variant="ghost"
              icon={<Download size={15} />}
              loading={exporting}
              onClick={() => void handleExport()}
            >
              Excel
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                icon={<Trash2 size={15} />}
                onClick={() => setConfirmDelete(true)}
                aria-label="Retirar encuesta del análisis"
                title="Retirar encuesta del análisis"
              />
            )}
          </>
        }
      />

      <section className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="detail-header" style={{ marginBottom: 18 }}>
          <div>
            <div className="eyebrow">Encuesta completada</div>
            <div className="detail-title-row">
              <span className="detail-number">
                {survey.numero ? `N° ${survey.numero}` : 'Sin número'}
              </span>
              <SurveyStatusBadge estado={survey.estado} origen={survey.origen} />
              {survey.origen === 'importado' && (
                <span className="badge badge-muted">Solo lectura</span>
              )}
            </div>
            <div className="detail-meta">
              <span>
                <CalendarDays size={12} />
                {formatDate(survey.fecha_encuesta)}
              </span>
              <span>
                <MapPin size={12} />
                {getAreaName(survey)}
              </span>
              <span>
                <UserRound size={12} />
                {ownerName}
              </span>
              <span>
                <Clock3 size={12} />
                Registrada {formatDateTime(survey.creado_en)}
              </span>
            </div>
          </div>
          <div className="row gap-8 wrap">
            <div className="score-box emerald" style={{ minWidth: 100 }}>
              <div className="score-box-label">TD</div>
              <div className="score-box-value">{formatDecimal(scores.td)}</div>
              <div className="score-box-meta">de 5</div>
            </div>
            <div className="score-box" style={{ minWidth: 100 }}>
              <div className="score-box-label">PA</div>
              <div className="score-box-value">{formatDecimal(scores.pa)}</div>
              <div className="score-box-meta">de 5</div>
            </div>
            <div className="score-box" style={{ minWidth: 100 }}>
              <div className="score-box-label">General</div>
              <div className="score-box-value">{formatDecimal(scores.general)}</div>
              <div className="score-box-meta">de 5</div>
            </div>
          </div>
        </div>

        {survey.origen === 'importado' ? (
          <Alert tone="info" icon={<ShieldCheck size={16} />}>
            Este es un registro histórico importado del archivo original. Se conserva
            tal como fue recibido y no se edita desde la aplicación.
          </Alert>
        ) : (
          <Alert tone="info" icon={<ShieldCheck size={16} />}>
            El número correlativo y la fecha de consentimiento se asignaron al enviar
            la encuesta. La hoja <strong>Base 2026</strong> no incluye tu nombre.
          </Alert>
        )}
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Datos generales</h2>
            <p className="card-subtitle">
              Caracterización de la persona encuestada y contexto de aplicación
            </p>
          </div>
          <span className="badge badge-muted">
            {survey.sexo === 'F' ? 'Femenino' : survey.sexo === 'M' ? 'Masculino' : 'Sexo no registrado'}
          </span>
        </div>
        <div className="card-body">
          <div className="detail-grid">
            <DetailItem label="Fecha de aplicación" value={formatDate(survey.fecha_encuesta)} />
            <DetailItem label="Edad" value={survey.edad !== null ? `${survey.edad} años` : '—'} />
            <DetailItem
              label="Sexo"
              value={survey.sexo === 'F' ? 'Femenino' : survey.sexo === 'M' ? 'Masculino' : '—'}
            />
            <DetailItem label="Estado civil" value={survey.estado_civil || '—'} />
            <DetailItem label="Grado de instrucción" value={survey.instruccion || '—'} />
            <DetailItem label="Área / unidad orgánica" value={getAreaName(survey)} />
            <DetailItem
              label="Nivel de responsabilidad"
              value={survey.nivel_responsabilidad || '—'}
            />
            <DetailItem label="Antigüedad" value={survey.antiguedad || '—'} />
            <DetailItem label="Frecuencia de uso" value={survey.frecuencia_uso || '—'} />
            <DetailItem label="Participación en mejoras" value={survey.participacion || '—'} />
            <DetailItem
              label="Consentimiento"
              value={survey.consentimiento ? 'Aceptado' : 'No registrado'}
            />
            <DetailItem
              label="Consentimiento registrado"
              value={formatDateTime(survey.consentimiento_en)}
            />
          </div>

          {isAdmin && (
            <div
              className="row gap-8"
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: '1px solid var(--color-ash-border)',
              }}
            >
              <Avatar name={ownerName} />
              <div>
                <div className="user-cell-name">{ownerName}</div>
                <div className="user-cell-email">
                  {owner?.email || (survey.origen === 'importado' ? 'Importado del archivo original' : '—')}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="dimension-columns" style={{ marginBottom: 16 }}>
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Dimensiones TD</h2>
              <p className="card-subtitle">Promedio de transformación digital</p>
            </div>
            <span className="badge badge-muted">X1–X5</span>
          </div>
          <div className="card-body">
            <DimensionBars instrument="TD" items={tdDimensions} />
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Dimensiones PA</h2>
              <p className="card-subtitle">Promedio de procesos administrativos</p>
            </div>
            <span className="badge badge-muted">Y1–Y5</span>
          </div>
          <div className="card-body">
            <DimensionBars instrument="PA" items={paDimensions} />
          </div>
        </section>
      </div>

      {survey.observaciones && (
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Observaciones</h2>
              <p className="card-subtitle">
                Nota opcional registrada por el encuestador; no forma parte del Excel.
              </p>
            </div>
          </div>
          <div className="card-body">
            <p className="body-sm graphite" style={{ whiteSpace: 'pre-wrap' }}>
              {survey.observaciones}
            </p>
          </div>
        </section>
      )}

      <div className="grid grid-2">
        <ItemBlock
          title="Transformación digital"
          code="TD"
          dimensions={DIMENSIONES_TD}
          survey={survey}
          instrument="TD"
        />
        <ItemBlock
          title="Procesos administrativos"
          code="PA"
          dimensions={DIMENSIONES_PA}
          survey={survey}
          instrument="PA"
        />
      </div>

      <div className="row gap-6 small muted" style={{ marginTop: 16 }}>
        <Info size={13} />
        <span>
          Escala: 1 = Totalmente en desacuerdo · 5 = Totalmente de acuerdo · N/A no
          cuenta en los promedios.
        </span>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Retirar encuesta del análisis"
        description={`La encuesta ${survey.numero ? `N° ${survey.numero}` : ''} dejará de aparecer en el panel y en las exportaciones. El registro se conserva con marca de eliminación y el evento queda en auditoría. Esta acción no se puede deshacer desde la aplicación.`}
        confirmLabel="Retirar encuesta"
        destructive
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  );
}

function ItemBlock({
  title,
  code,
  dimensions,
  survey,
  instrument,
}: {
  title: string;
  code: string;
  dimensions: typeof TODAS_LAS_DIMENSIONES;
  survey: Survey;
  instrument: 'TD' | 'PA';
}) {
  const prefix = instrument === 'TD' ? 'td' : 'pa';
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">{title}</h2>
          <p className="card-subtitle">Respuestas ítem por ítem</p>
        </div>
        <span className="badge badge-muted">{code}</span>
      </div>
      <div className="card-body" style={{ paddingTop: 8 }}>
        {dimensions.map((dimension) => (
          <div key={dimension.codigo} style={{ marginTop: 14 }}>
            <div className="dimension-header" style={{ borderBottom: 0, paddingBottom: 4 }}>
              <div className="dimension-header-left">
                <span className="dimension-code-pill">{dimension.codigo}</span>
                <span className="dimension-header-title">{dimension.nombre}</span>
              </div>
            </div>
            <div className="item-table">
              {dimension.items.map((item) => {
                const key = `${prefix}_${String(item.numero).padStart(2, '0')}`;
                const value = getItemValue(survey, key);
                return (
                  <div className="item-table-row" key={key}>
                    <span className="item-table-number">{String(item.numero).padStart(2, '0')}</span>
                    <span className="item-table-text">{item.texto}</span>
                    <span className="item-table-answer">
                      <span
                        className={`answer-pill${value === 0 ? ' na' : ''}`}
                        title={answerLabel(value)}
                      >
                        <b>{answerShort(value)}</b>
                        {value >= 1 && value <= 5 ? ' / 5' : ''}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
