import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Info,
  Plus,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ANTIGUEDAD_OPTIONS,
  CONSENTIMIENTO_DECLARACION,
  CONSENTIMIENTO_PARRAFOS,
  DIMENSIONES_PA,
  DIMENSIONES_TD,
  ESCALA_LEYENDA,
  ESTADO_CIVIL_OPTIONS,
  FRECUENCIA_OPTIONS,
  INSTRUCCION_OPTIONS,
  INSTITUCION,
  INVESTIGADOR,
  LIKERT_OPTIONS,
  NIVEL_RESPONSABILIDAD_OPTIONS,
  PARTICIPACION_OPTIONS,
  SEXO_OPTIONS,
  TITULO_ESTUDIO,
} from '../lib/catalog';
import {
  countDimensionAnswered,
  createEmptyForm,
  firstIncompleteStep,
  formDimensionScores,
  formFromSurvey,
  formHasProgress,
  formScores,
  newClientId,
  validateConsent,
  validateGeneral,
  validateItems,
} from '../lib/survey-form';
import { clearDraft, loadDraft, saveDraft, type LocalDraft } from '../lib/draft';
import {
  errorMessage,
  fetchAreas,
  fetchSurvey,
  saveSurvey,
} from '../lib/api';
import {
  countAnswered,
  formatDate,
  formatDateTime,
  formatDecimal,
  todayISO,
} from '../lib/format';
import {
  ITEM_KEYS_PA,
  ITEM_KEYS_TD,
  type DimensionDefinition,
} from '../lib/catalog';
import type { Area, Survey, SurveyFormState } from '../types';
import { Button, buttonClass } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { Alert, PageLoader } from '../components/Ui';
import { DimensionBars } from '../components/DimensionBars';

const STEPS = [
  'Consentimiento',
  'Datos generales',
  'Transformación digital',
  'Procesos administrativos',
  'Revisión y envío',
];

const STEP_DESCRIPTIONS = [
  'Lee el consentimiento y registra tu aceptación.',
  'Completa la información general de la persona encuestada.',
  'Responde los 25 enunciados sobre transformación digital.',
  'Responde los 25 enunciados sobre procesos administrativos.',
  'Verifica tus respuestas antes de enviar.',
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function instrumentAnswerCount(
  items: Record<string, number>,
  keys: string[],
): number {
  return keys.filter((key) => items[key] >= 0 && items[key] <= 5).length;
}

export function SurveyFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const recordsPath = isAdmin ? '/registros' : '/mis-registros';
  const recordsLabel = isAdmin ? 'Volver a todos los registros' : 'Volver a mis registros';

  const [areas, setAreas] = useState<Area[]>([]);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [form, setForm] = useState<SurveyFormState>(() => createEmptyForm());
  const [clientId, setClientId] = useState(() => newClientId());
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemError, setItemError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);
  const [submitted, setSubmitted] = useState<{ id: string; numero: number | null } | null>(
    null,
  );
  const [draftPrompt, setDraftPrompt] = useState<LocalDraft | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    const load = async () => {
      try {
        const areaData = await fetchAreas(true);
        if (!active) return;
        setAreas(areaData);

        if (id) {
          const loaded = await fetchSurvey(id);
          if (!active) return;
          if (!loaded || loaded.eliminado_en) {
            setLoadError('No se encontró la encuesta o no tienes acceso a ella.');
            return;
          }
          if (
            loaded.usuario_id !== user?.id &&
            !isAdmin
          ) {
            setLoadError('No tienes permiso para editar esta encuesta.');
            return;
          }
          if (loaded.origen === 'importado') {
            setLoadError(
              'Los registros históricos importados son de solo lectura y no se editan desde la aplicación.',
            );
            return;
          }
          const loadedForm = formFromSurvey(loaded);
          setSurvey(loaded);
          setForm(loadedForm);
          setClientId(loaded.client_id);
          setStep(loaded.estado === 'borrador' ? firstIncompleteStep(loadedForm) : 4);
          return;
        }

        if (user) {
          const draft = loadDraft(user.id);
          if (draft && formHasProgress(draft.form)) {
            setDraftPrompt(draft);
          }
        }
      } catch (error) {
        if (active) setLoadError(errorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [id, isAdmin, user?.id]);

  useEffect(() => {
    if (
      isEditing ||
      !user ||
      submitted ||
      draftPrompt ||
      !formHasProgress(form)
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        const draft = saveDraft(user.id, form);
        setDraftSavedAt(draft.savedAt);
      } catch {
        // Si el navegador bloquea el almacenamiento local, el formulario sigue activo.
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [form, isEditing, user, submitted, draftPrompt]);

  const areaName = useMemo(
    () => areas.find((area) => String(area.id) === form.area_id)?.nombre ?? '',
    [areas, form.area_id],
  );

  const answered = useMemo(() => countAnswered(form.items), [form.items]);
  const tdCount = instrumentAnswerCount(form.items, ITEM_KEYS_TD);
  const paCount = instrumentAnswerCount(form.items, ITEM_KEYS_PA);
  const scores = useMemo(() => formScores(form), [form]);
  const tdDimensions = useMemo(
    () => formDimensionScores(form, DIMENSIONES_TD, 'TD'),
    [form],
  );
  const paDimensions = useMemo(
    () => formDimensionScores(form, DIMENSIONES_PA, 'PA'),
    [form],
  );

  const dismissDraftForEdit = () => {
    if (draftPrompt && user) {
      clearDraft(user.id);
      setDraftPrompt(null);
      setDraftSavedAt(null);
    }
  };

  const updateField = <K extends keyof SurveyFormState>(
    field: K,
    value: SurveyFormState[K],
  ) => {
    dismissDraftForEdit();
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[String(field)]) return current;
      const next = { ...current };
      delete next[String(field)];
      return next;
    });
  };

  const setItem = (key: string, value: number) => {
    dismissDraftForEdit();
    setForm((current) => ({
      ...current,
      items: { ...current.items, [key]: value },
    }));
    setItemError(null);
  };

  const continueDraft = () => {
    if (!draftPrompt) return;
    const draftForm = draftPrompt.form;
    setForm(draftForm);
    setStep(firstIncompleteStep(draftForm));
    setDraftSavedAt(draftPrompt.savedAt);
    setDraftPrompt(null);
  };

  const discardDraft = () => {
    if (user) clearDraft(user.id);
    setDraftPrompt(null);
    setDraftSavedAt(null);
    setForm(createEmptyForm());
    setStep(0);
  };

  const saveDraftNow = () => {
    if (!user) return;
    try {
      const draft = saveDraft(user.id, form);
      setDraftSavedAt(draft.savedAt);
      toast('Borrador guardado en este dispositivo.', 'success');
    } catch {
      toast('No se pudo guardar el borrador en este dispositivo.', 'error');
    }
  };

  const validateStep = (): boolean => {
    setErrors({});
    setItemError(null);

    if (step === 0) {
      const result = validateConsent(form);
      if (!result.valid) {
        setErrors(result.errors);
        return false;
      }
      return true;
    }

    if (step === 1) {
      const result = validateGeneral(form);
      if (!result.valid) {
        setErrors(result.errors);
        return false;
      }
      return true;
    }

    if (step === 2) {
      const result = validateItems(form, 'TD');
      if (!result.valid) {
        setItemError(result.errors.items ?? 'Faltan enunciados por responder.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      const result = validateItems(form, 'PA');
      if (!result.valid) {
        setItemError(result.errors.items ?? 'Faltan enunciados por responder.');
        return false;
      }
      return true;
    }

    return true;
  };

  const goNext = (event?: ReactMouseEvent<HTMLButtonElement>) => {
    // Evita que el navegador ejecute el envío implícito del formulario cuando
    // el botón cambia de "Continuar" a "Enviar encuesta" en el último paso.
    event?.preventDefault();
    event?.stopPropagation();
    if (!validateStep()) return;
    setStep((current) => Math.min(4, current + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setErrors({});
    setItemError(null);
    if (step === 0) {
      navigate(isEditing && survey ? `/encuestas/${survey.id}` : recordsPath);
      return;
    }
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (target: number) => {
    if (target === step) return;
    if (target > step && !isEditing) return;
    if (target > step && isEditing) {
      setErrors({});
      setItemError(null);
    }
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateAll = (): boolean => {
    const consent = validateConsent(form);
    if (!consent.valid) {
      setStep(0);
      setErrors(consent.errors);
      return false;
    }
    const general = validateGeneral(form);
    if (!general.valid) {
      setStep(1);
      setErrors(general.errors);
      return false;
    }
    const td = validateItems(form, 'TD');
    if (!td.valid) {
      setStep(2);
      setItemError(td.errors.items ?? 'Faltan enunciados de TD por responder.');
      return false;
    }
    const pa = validateItems(form, 'PA');
    if (!pa.valid) {
      setStep(3);
      setItemError(pa.errors.items ?? 'Faltan enunciados de PA por responder.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!user) {
      toast('Tu sesión expiró. Vuelve a ingresar.', 'error');
      return;
    }
    if (!validateAll()) {
      toast('Revisa los campos pendientes antes de enviar.', 'error');
      return;
    }

    submittingRef.current = true;
    setSaving(true);
    try {
      const result = await saveSurvey({
        id: survey?.id,
        clientId,
        form,
        complete: true,
        userId: user.id,
        existing: survey,
      });
      clearDraft(user.id);
      if (survey) {
        toast(
          `Cambios guardados. La encuesta conserva el número ${
            result.numero ?? survey.numero ?? '—'
          }.`,
          'success',
        );
        navigate(`/encuestas/${result.id}`, { replace: true });
      } else {
        setSubmitted(result);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (submitError) {
      toast(errorMessage(submitError), 'error');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const startAnotherSurvey = () => {
    setSubmitted(null);
    setSurvey(null);
    setForm(createEmptyForm());
    setClientId(newClientId());
    setStep(0);
    setErrors({});
    setItemError(null);
    setDraftPrompt(null);
    setDraftSavedAt(null);
    setLoadError(null);
    navigate('/encuestas/nueva', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (submitted) {
    return (
      <div className="container page">
        <div className="card success-panel">
          <div className="success-icon">
            <FileCheck2 size={30} />
          </div>
          <h1 className="success-title">Encuesta registrada</h1>
          <p className="success-text">
            Tus respuestas se guardaron de forma anónima. El número correlativo se
            asignó automáticamente y ya forma parte del estudio.
          </p>
          <div className="success-number">
            <span>N°</span>
            <strong>{submitted.numero ?? '—'}</strong>
          </div>
          <div
            className="row gap-8"
            style={{ justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Button
              variant="primary"
              icon={<Plus size={15} />}
              onClick={startAnotherSurvey}
            >
              Registrar otra
            </Button>
            <Link
              to={`/encuestas/${submitted.id}`}
              className={buttonClass({ variant: 'secondary' })}
            >
              Ver encuesta
            </Link>
            <Link to={recordsPath} className={buttonClass({ variant: 'ghost' })}>
              {isAdmin ? 'Ir a todos los registros' : 'Ir a mis registros'}
            </Link>
          </div>
          <p className="field-help" style={{ marginTop: 18 }}>
            El formulario se abre limpio para la siguiente persona. También puedes
            revisar la encuesta recién registrada.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <PageLoader label="Preparando el instrumento…" />;
  }

  if (loadError) {
    return (
      <div className="container page">
        <PageHeader
          eyebrow="Instrumento TD-PA"
          title={isEditing ? 'No se puede editar esta encuesta' : 'Nueva encuesta'}
          backTo={isEditing && id ? `/encuestas/${id}` : recordsPath}
        />
        <Alert tone="danger" title="No se pudo abrir el formulario.">
          {loadError}
        </Alert>
        <div style={{ marginTop: 16 }}>
          <Link
            to={isEditing && id ? `/encuestas/${id}` : recordsPath}
            className={buttonClass({ variant: 'ghost' })}
          >
            <ArrowLeft size={15} />
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <PageHeader
        eyebrow={isEditing ? 'Edición de encuesta' : 'Instrumento TD-PA'}
        title={
          isEditing && survey
            ? `Editar encuesta ${survey.numero ? `N° ${survey.numero}` : ''}`
            : 'Nueva encuesta'
        }
        subtitle={
          isEditing
            ? 'Actualiza los datos necesarios. El número correlativo no cambia y la encuesta conserva su fecha de consentimiento.'
            : 'Registra una respuesta completa. El número correlativo se asigna recién al enviar, no al guardar un borrador local.'
        }
        backTo={isEditing && survey ? `/encuestas/${survey.id}` : recordsPath}
        backLabel={isEditing ? 'Volver a la encuesta' : recordsLabel}
        actions={
          draftSavedAt && !isEditing ? (
            <span className="draft-note">
              <Check size={13} />
              Borrador guardado {formatDateTime(draftSavedAt)}
            </span>
          ) : undefined
        }
      />

      {draftPrompt && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="row-between wrap gap-12">
            <div>
              <div className="row gap-8" style={{ marginBottom: 4 }}>
                <Save size={16} className="emerald" />
                <strong className="body-sm">Tienes un borrador guardado</strong>
              </div>
              <p className="small muted">
                Guardado el {formatDateTime(draftPrompt.savedAt)} en este dispositivo.
                Puedes continuar donde lo dejaste.
              </p>
            </div>
            <div className="row gap-8">
              <Button variant="ghost" size="sm" onClick={discardDraft}>
                Empezar de nuevo
              </Button>
              <Button variant="primary" size="sm" onClick={continueDraft}>
                Continuar borrador
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="survey-layout">
        <div className="survey-top">
          <div className="survey-meta-note">
            <Clock3 size={13} />
            Tiempo estimado: 15–20 minutos · 50 enunciados
          </div>
          <div className="survey-meta-note">
            <ShieldCheck size={13} />
            Sin nombre ni DNI
          </div>
        </div>

        <nav className="step-indicator" aria-label="Pasos del formulario">
          {STEPS.map((label, index) => (
            <Fragment key={label}>
              <button
                type="button"
                className={`step-item${index === step ? ' active' : ''}${
                  index < step ? ' done' : ''
                }`}
                onClick={() => goToStep(index)}
                disabled={index > step && !isEditing}
                aria-current={index === step ? 'step' : undefined}
                style={{
                  border: 0,
                  background: 'transparent',
                  padding: 0,
                  textAlign: 'left',
                  cursor: index > step && !isEditing ? 'default' : 'pointer',
                }}
              >
                <span className="step-dot">
                  {index < step ? <Check size={12} /> : index + 1}
                </span>
                <span>{label}</span>
              </button>
              {index < STEPS.length - 1 && <span className="step-line" />}
            </Fragment>
          ))}
        </nav>

        <form onSubmit={handleSubmit} noValidate>
          <div className="card survey-card">
            <div className="form-step-head">
              <div className="eyebrow">Paso {step + 1} de 5</div>
              <h2 className="form-step-title">{STEPS[step]}</h2>
              <p className="form-step-subtitle">{STEP_DESCRIPTIONS[step]}</p>
            </div>

            {step === 0 && (
              <ConsentStep
                form={form}
                error={errors.consentimiento}
                onChange={(checked) => updateField('consentimiento', checked)}
              />
            )}

            {step === 1 && (
              <GeneralStep
                form={form}
                areas={areas}
                errors={errors}
                updateField={updateField}
              />
            )}

            {step === 2 && (
              <InstrumentStep
                instrument="TD"
                dimensions={DIMENSIONES_TD}
                items={form.items}
                setItem={setItem}
                error={itemError}
                answered={tdCount}
              />
            )}

            {step === 3 && (
              <InstrumentStep
                instrument="PA"
                dimensions={DIMENSIONES_PA}
                items={form.items}
                setItem={setItem}
                error={itemError}
                answered={paCount}
              />
            )}

            {step === 4 && (
              <ReviewStep
                form={form}
                areaName={areaName}
                scores={scores}
                tdDimensions={tdDimensions}
                paDimensions={paDimensions}
                answered={answered}
                isEditing={isEditing}
                surveyNumber={survey?.numero ?? null}
                updateField={updateField}
              />
            )}

            <div className="form-actions">
              <Button
                variant="ghost"
                onClick={goBack}
                type="button"
                icon={<ArrowLeft size={15} />}
              >
                {step === 0 ? 'Cancelar' : 'Atrás'}
              </Button>
              <div className="form-actions-right">
                {!isEditing && step < 4 && (
                  <Button
                    variant="text"
                    type="button"
                    icon={<Save size={14} />}
                    onClick={saveDraftNow}
                    disabled={!!draftPrompt}
                  >
                    Guardar borrador
                  </Button>
                )}
                {step < 4 ? (
                  <Button
                    variant="primary"
                    type="button"
                    onClick={goNext}
                    icon={<ArrowRight size={15} />}
                  >
                    Continuar
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    type="submit"
                    loading={saving}
                    icon={!saving ? <Send size={15} /> : undefined}
                  >
                    {isEditing ? 'Guardar cambios' : 'Enviar encuesta'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="row gap-6 small muted" style={{ marginTop: 14 }}>
          <Info size={13} />
          <span>
            Los borradores locales no consumen número. El correlativo se asigna al
            enviar la encuesta completa.
          </span>
        </div>
      </div>
    </div>
  );
}

function ConsentStep({
  form,
  error,
  onChange,
}: {
  form: SurveyFormState;
  error?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div>
      <div className="consent-box">
        <div className="consent-box-head">
          <ShieldCheck size={16} />
          Consentimiento informado · Estudio GOREHCO 2026
        </div>
        <div className="consent-content">
          <p>
            <strong>Título de la investigación:</strong> {TITULO_ESTUDIO}
          </p>
          <p>
            <strong>Investigador:</strong> {INVESTIGADOR}
            <br />
            <strong>Institución:</strong> {INSTITUCION}
            <br />
            <strong>Dirigido a:</strong> Servidores administrativos del Gobierno
            Regional de Huánuco
          </p>
          {CONSENTIMIENTO_PARRAFOS.map((paragraph) => (
            <p key={paragraph.slice(0, 28)}>{paragraph}</p>
          ))}
          <p>
            <strong>Declaración de aceptación.</strong> {CONSENTIMIENTO_DECLARACION}
          </p>
        </div>
        <div className="consent-accept">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.consentimiento}
              onChange={(event) => onChange(event.target.checked)}
            />
            <span>
              <strong>{CONSENTIMIENTO_DECLARACION}</strong>
            </span>
          </label>
          {error && <div className="field-error" style={{ marginTop: 7 }}>{error}</div>}
        </div>
      </div>

      <div className="row-between wrap gap-12" style={{ marginTop: 14 }}>
        <p className="field-help" style={{ maxWidth: 560 }}>
          No se solicita firma, nombre ni DNI. La aceptación queda registrada con la
          fecha y hora del envío. Puedes retirarte antes de enviar.
        </p>
        <div className="row gap-10">
          <a
            href="/docs/consentimiento-informado.pdf"
            target="_blank"
            rel="noreferrer"
            className="small emerald strong"
          >
            Ver PDF del consentimiento
          </a>
          <a
            href="/docs/cuestionario-td-pa.pdf"
            target="_blank"
            rel="noreferrer"
            className="small emerald strong"
          >
            Ver cuestionario
          </a>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginTop: 16 }}>
        <Info size={16} />
        <div>
          <strong>Confidencialidad.</strong> Las respuestas se presentan de forma
          agregada. Tu nombre no aparece en la hoja de datos del Excel.
        </div>
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

function GeneralStep({
  form,
  areas,
  errors,
  updateField,
}: {
  form: SurveyFormState;
  areas: Area[];
  errors: Record<string, string>;
  updateField: <K extends keyof SurveyFormState>(
    field: K,
    value: SurveyFormState[K],
  ) => void;
}) {
  return (
    <div>
      <div className="field-grid">
        <div className="field">
          <label className="field-label" htmlFor="fecha-encuesta">
            Fecha de aplicación
          </label>
          <input
            id="fecha-encuesta"
            className={`input${errors.fecha_encuesta ? ' has-error' : ''}`}
            type="date"
            max={todayISO()}
            value={form.fecha_encuesta}
            onChange={(event) => updateField('fecha_encuesta', event.target.value)}
          />
          <FieldError message={errors.fecha_encuesta} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="edad">
            Edad
          </label>
          <input
            id="edad"
            className={`input${errors.edad ? ' has-error' : ''}`}
            type="number"
            inputMode="numeric"
            min={18}
            max={99}
            placeholder="Ej. 34"
            value={form.edad}
            onChange={(event) => updateField('edad', event.target.value)}
          />
          <FieldError message={errors.edad} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="sexo">
            Sexo
          </label>
          <select
            id="sexo"
            className={`select${errors.sexo ? ' has-error' : ''}`}
            value={form.sexo}
            onChange={(event) => updateField('sexo', event.target.value)}
          >
            <option value="">Selecciona una opción</option>
            {SEXO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.sexo} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="estado-civil">
            Estado civil
          </label>
          <select
            id="estado-civil"
            className={`select${errors.estado_civil ? ' has-error' : ''}`}
            value={form.estado_civil}
            onChange={(event) => updateField('estado_civil', event.target.value)}
          >
            <option value="">Selecciona una opción</option>
            {ESTADO_CIVIL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError message={errors.estado_civil} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="instruccion">
            Grado de instrucción
          </label>
          <select
            id="instruccion"
            className={`select${errors.instruccion ? ' has-error' : ''}`}
            value={form.instruccion}
            onChange={(event) => updateField('instruccion', event.target.value)}
          >
            <option value="">Selecciona una opción</option>
            {INSTRUCCION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError message={errors.instruccion} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="area">
            Área / grupo funcional principal
          </label>
          <select
            id="area"
            className={`select${errors.area_id ? ' has-error' : ''}`}
            value={form.area_id}
            onChange={(event) => updateField('area_id', event.target.value)}
          >
            <option value="">Selecciona el área</option>
            {areas.map((area) => (
              <option
                key={area.id}
                value={area.id}
                disabled={!area.activo && String(area.id) !== form.area_id}
              >
                {area.nombre}
                {!area.activo ? ' (inactiva)' : ''}
              </option>
            ))}
          </select>
          <FieldError message={errors.area_id} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="nivel">
            Nivel de responsabilidad
          </label>
          <select
            id="nivel"
            className={`select${errors.nivel_responsabilidad ? ' has-error' : ''}`}
            value={form.nivel_responsabilidad}
            onChange={(event) =>
              updateField('nivel_responsabilidad', event.target.value)
            }
          >
            <option value="">Selecciona una opción</option>
            {NIVEL_RESPONSABILIDAD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError message={errors.nivel_responsabilidad} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="antiguedad">
            Antigüedad en la entidad
          </label>
          <select
            id="antiguedad"
            className={`select${errors.antiguedad ? ' has-error' : ''}`}
            value={form.antiguedad}
            onChange={(event) => updateField('antiguedad', event.target.value)}
          >
            <option value="">Selecciona una opción</option>
            {ANTIGUEDAD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError message={errors.antiguedad} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="frecuencia">
            Frecuencia de uso de herramientas digitales
          </label>
          <select
            id="frecuencia"
            className={`select${errors.frecuencia_uso ? ' has-error' : ''}`}
            value={form.frecuencia_uso}
            onChange={(event) => updateField('frecuencia_uso', event.target.value)}
          >
            <option value="">Selecciona una opción</option>
            {FRECUENCIA_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError message={errors.frecuencia_uso} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="participacion">
            Participación en mejoras digitales durante los últimos 12 meses
          </label>
          <select
            id="participacion"
            className={`select${errors.participacion ? ' has-error' : ''}`}
            value={form.participacion}
            onChange={(event) => updateField('participacion', event.target.value)}
          >
            <option value="">Selecciona una opción</option>
            {PARTICIPACION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError message={errors.participacion} />
        </div>
      </div>

      <div className="alert alert-info" style={{ marginTop: 18 }}>
        <Info size={16} />
        <div>
          <strong>Datos de caracterización.</strong> No incluyas nombres, DNI ni
          correos. Sirven para comparar promedios por área, sexo, nivel y antigüedad,
          siempre de forma agregada.
        </div>
      </div>
    </div>
  );
}

function InstrumentStep({
  instrument,
  dimensions,
  items,
  setItem,
  error,
  answered,
}: {
  instrument: 'TD' | 'PA';
  dimensions: DimensionDefinition[];
  items: Record<string, number>;
  setItem: (key: string, value: number) => void;
  error: string | null;
  answered: number;
}) {
  const prefix = instrument === 'TD' ? 'td' : 'pa';
  return (
    <div>
      <div className="row-between wrap gap-12" style={{ marginBottom: 12 }}>
        <div className="scale-legend" style={{ marginBottom: 0 }}>
          {ESCALA_LEYENDA.map((legend) => {
            const [value, ...rest] = legend.split('=');
            return (
              <span className="scale-chip" key={legend}>
                <b>{value.trim()}</b>
                {rest.join('=').trim()}
              </span>
            );
          })}
        </div>
        <span className="badge badge-muted">
          {answered} / 25 respondidos
        </span>
      </div>

      {error && (
        <div style={{ marginBottom: 14 }}>
          <Alert tone="warning" title="Faltan respuestas.">
            {error}
          </Alert>
        </div>
      )}

      <div className="progress" style={{ marginBottom: 18 }} aria-hidden="true">
        <div className="progress-bar" style={{ width: `${(answered / 25) * 100}%` }} />
      </div>

      {dimensions.map((dimension) => {
        const dimensionAnswered = countDimensionAnswered(
          items,
          instrument,
          dimension.items[0].numero,
        );
        return (
          <section className="dimension-block" key={dimension.codigo}>
            <div className="dimension-header">
              <div className="dimension-header-left">
                <span className="dimension-code-pill">{dimension.codigo}</span>
                <span className="dimension-header-title">{dimension.nombre}</span>
              </div>
              <span className="dimension-header-count">
                {dimensionAnswered}/5
              </span>
            </div>

            {dimension.items.map((item) => {
              const key = `${prefix}_${pad(item.numero)}`;
              const value = items[key] ?? -1;
              return (
                <div className="likert-row" key={key}>
                  <div className="likert-question">
                    <span className="likert-number">{pad(item.numero)}</span>
                    <span className="likert-text">{item.texto}</span>
                  </div>
                  <div
                    className="likert-options"
                    role="radiogroup"
                    aria-label={`${dimension.codigo}, ítem ${item.numero}: ${item.texto}`}
                  >
                    {LIKERT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={value === option.value}
                        aria-label={`${option.short}: ${option.label}`}
                        title={option.label}
                        className={`likert-option${
                          value === option.value ? ' selected' : ''
                        }${option.value === 0 ? ' na' : ''}`}
                        onClick={() => setItem(key, option.value)}
                      >
                        {option.short}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function ReviewStep({
  form,
  areaName,
  scores,
  tdDimensions,
  paDimensions,
  answered,
  isEditing,
  surveyNumber,
  updateField,
}: {
  form: SurveyFormState;
  areaName: string;
  scores: { td: number | null; pa: number | null; general: number | null };
  tdDimensions: Array<{
    id: number;
    codigo: string;
    nombre: string;
    promedio: number | null;
    n: number;
  }>;
  paDimensions: Array<{
    id: number;
    codigo: string;
    nombre: string;
    promedio: number | null;
    n: number;
  }>;
  answered: { answered: number; na: number; pending: number };
  isEditing: boolean;
  surveyNumber: number | null;
  updateField: <K extends keyof SurveyFormState>(
    field: K,
    value: SurveyFormState[K],
  ) => void;
}) {
  const sexoLabel =
    form.sexo === 'F' ? 'Femenino' : form.sexo === 'M' ? 'Masculino' : '—';

  return (
    <div>
      {isEditing && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="info" title="Edición de un registro existente.">
            La encuesta conserva el número {surveyNumber ? `N° ${surveyNumber}` : ''} y
            la fecha de consentimiento original. Los cambios se reflejan en los
            promedios agregados.
          </Alert>
        </div>
      )}

      <div className="score-strip">
        <div className="score-box emerald">
          <div className="score-box-label">Promedio TD</div>
          <div className="score-box-value">{formatDecimal(scores.td)}</div>
          <div className="score-box-meta">25 enunciados · N/A excluido</div>
        </div>
        <div className="score-box">
          <div className="score-box-label">Promedio PA</div>
          <div className="score-box-value">{formatDecimal(scores.pa)}</div>
          <div className="score-box-meta">25 enunciados · N/A excluido</div>
        </div>
        <div className="score-box">
          <div className="score-box-label">Promedio general</div>
          <div className="score-box-value">{formatDecimal(scores.general)}</div>
          <div className="score-box-meta">
            {answered.answered} respuestas · {answered.na} N/A
          </div>
        </div>
      </div>

      <div className="review-grid">
        <ReviewItem label="Fecha de aplicación" value={formatDate(form.fecha_encuesta)} />
        <ReviewItem label="Edad" value={form.edad ? `${form.edad} años` : '—'} />
        <ReviewItem label="Sexo" value={sexoLabel} />
        <ReviewItem label="Estado civil" value={form.estado_civil || '—'} />
        <ReviewItem label="Grado de instrucción" value={form.instruccion || '—'} />
        <ReviewItem label="Área / unidad orgánica" value={areaName || '—'} />
        <ReviewItem
          label="Nivel de responsabilidad"
          value={form.nivel_responsabilidad || '—'}
        />
        <ReviewItem label="Antigüedad" value={form.antiguedad || '—'} />
        <ReviewItem label="Frecuencia de uso" value={form.frecuencia_uso || '—'} />
        <ReviewItem label="Participación en mejoras" value={form.participacion || '—'} />
        <ReviewItem
          label="Consentimiento"
          value={form.consentimiento ? 'Aceptado' : 'Pendiente'}
        />
        <ReviewItem
          label="Correlativo"
          value={isEditing ? (surveyNumber ? `N° ${surveyNumber}` : '—') : 'Se asigna al enviar'}
        />
      </div>

      <div className="grid grid-2">
        <section className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Dimensiones TD</h3>
              <p className="card-subtitle">Revisa el promedio de tus respuestas</p>
            </div>
          </div>
          <div className="card-body">
            <DimensionBars
              instrument="TD"
              items={tdDimensions.map((dimension) => ({
                id: dimension.id,
                nombre: dimension.nombre,
                promedio: dimension.promedio,
                n: dimension.n,
              }))}
            />
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Dimensiones PA</h3>
              <p className="card-subtitle">Revisa el promedio de tus respuestas</p>
            </div>
          </div>
          <div className="card-body">
            <DimensionBars
              instrument="PA"
              items={paDimensions.map((dimension) => ({
                id: dimension.id,
                nombre: dimension.nombre,
                promedio: dimension.promedio,
                n: dimension.n,
              }))}
            />
          </div>
        </section>
      </div>

      <div className="field" style={{ marginTop: 18 }}>
        <label className="field-label" htmlFor="observaciones">
          Observaciones <span className="optional">(opcional)</span>
        </label>
        <textarea
          id="observaciones"
          className="textarea"
          placeholder="Si deseas, deja una nota breve sobre el contexto de esta encuesta. No incluyas nombres ni datos personales."
          value={form.observaciones}
          onChange={(event) => updateField('observaciones', event.target.value)}
        />
        <span className="field-help">
          Este campo no forma parte de las 60 columnas de la hoja Base 2026.
        </span>
      </div>

      <div className="review-note" style={{ marginTop: 16 }}>
        <ClipboardCheck size={16} />
        <span>
          Al {isEditing ? 'guardar los cambios' : 'enviar'}, la encuesta quedará
          registrada con el correo de tu cuenta para que puedas consultarla en Mis
          registros. El análisis y el Excel no muestran tu nombre en la hoja de datos.
        </span>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="review-item">
      <div className="review-label">{label}</div>
      <div className="review-value">{value}</div>
    </div>
  );
}
