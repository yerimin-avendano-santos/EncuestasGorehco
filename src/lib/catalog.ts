export const META_ENCUESTAS = 336;

export const TITULO_ESTUDIO =
  'Transformación digital y procesos administrativos en el Gobierno Regional de Huánuco, 2026';

export const INVESTIGADOR = 'Santa Maria Valle Danny Chantal';
export const INSTITUCION = 'Universidad Nacional Mayor de San Marcos';

export interface LikertOption {
  value: number;
  label: string;
  short: string;
}

export const LIKERT_OPTIONS: LikertOption[] = [
  { value: 1, label: 'Totalmente en desacuerdo', short: '1' },
  { value: 2, label: 'En desacuerdo', short: '2' },
  { value: 3, label: 'Ni de acuerdo ni en desacuerdo', short: '3' },
  { value: 4, label: 'De acuerdo', short: '4' },
  { value: 5, label: 'Totalmente de acuerdo', short: '5' },
  {
    value: 0,
    label: 'N/A · No tengo información suficiente para responder',
    short: 'N/A',
  },
];

export interface ItemDefinition {
  numero: number;
  texto: string;
}

export interface DimensionDefinition {
  id: number;
  codigo: string;
  nombre: string;
  instrumento: 'TD' | 'PA';
  items: ItemDefinition[];
}

export const DIMENSIONES_TD: DimensionDefinition[] = [
  {
    id: 1,
    codigo: 'X1',
    nombre: 'Estrategia, liderazgo y gobernanza digital',
    instrumento: 'TD',
    items: [
      {
        numero: 1,
        texto:
          'La entidad cuenta con una orientación clara sobre cómo usar tecnologías digitales en su gestión.',
      },
      {
        numero: 2,
        texto:
          'Las jefaturas comunican las prioridades de transformación digital de manera comprensible.',
      },
      {
        numero: 3,
        texto:
          'Las responsabilidades para implementar iniciativas digitales están claramente definidas.',
      },
      {
        numero: 4,
        texto:
          'Las áreas coordinan entre sí las decisiones relacionadas con sistemas y servicios digitales.',
      },
      {
        numero: 5,
        texto:
          'La entidad revisa periódicamente el avance de sus iniciativas digitales.',
      },
    ],
  },
  {
    id: 2,
    codigo: 'X2',
    nombre: 'Infraestructura tecnológica y plataformas digitales',
    instrumento: 'TD',
    items: [
      {
        numero: 6,
        texto:
          'Los equipos informáticos disponibles son adecuados para las tareas que realizo.',
      },
      {
        numero: 7,
        texto:
          'La conectividad permite utilizar los sistemas institucionales sin interrupciones frecuentes.',
      },
      {
        numero: 8,
        texto:
          'Las plataformas digitales están disponibles cuando se necesitan.',
      },
      {
        numero: 9,
        texto:
          'Recibo soporte técnico oportuno cuando se presenta una dificultad.',
      },
      {
        numero: 10,
        texto:
          'La entidad aplica medidas de seguridad para proteger el acceso a sus sistemas.',
      },
    ],
  },
  {
    id: 3,
    codigo: 'X3',
    nombre: 'Interoperabilidad y gestión de datos públicos',
    instrumento: 'TD',
    items: [
      {
        numero: 11,
        texto:
          'Los sistemas institucionales permiten reutilizar información ya registrada.',
      },
      {
        numero: 12,
        texto:
          'Las áreas comparten datos mediante mecanismos institucionales definidos.',
      },
      {
        numero: 13,
        texto:
          'La información registrada en los sistemas se mantiene actualizada.',
      },
      {
        numero: 14,
        texto:
          'Existen criterios claros sobre quién es responsable de la calidad de los datos.',
      },
      {
        numero: 15,
        texto:
          'Los datos institucionales se utilizan para apoyar decisiones de gestión.',
      },
    ],
  },
  {
    id: 4,
    codigo: 'X4',
    nombre: 'Digitalización y rediseño de procesos y servicios',
    instrumento: 'TD',
    items: [
      {
        numero: 16,
        texto:
          'Antes de digitalizar un trámite, la entidad revisa si sus pasos son necesarios.',
      },
      {
        numero: 17,
        texto:
          'Las iniciativas digitales se diseñan considerando el flujo completo del proceso.',
      },
      {
        numero: 18,
        texto:
          'Las soluciones digitales incorporan de manera automatizada las reglas o validaciones necesarias para ejecutar el proceso.',
      },
      {
        numero: 19,
        texto:
          'Las áreas usuarias participan en el diseño o mejora de los servicios digitales.',
      },
      {
        numero: 20,
        texto:
          'La entidad evalúa el funcionamiento de los procesos después de implementar cambios digitales.',
      },
    ],
  },
  {
    id: 5,
    codigo: 'X5',
    nombre:
      'Competencias digitales, cultura organizacional y orientación ciudadana',
    instrumento: 'TD',
    items: [
      {
        numero: 21,
        texto:
          'Recibo capacitación suficiente para utilizar los sistemas relacionados con mi trabajo.',
      },
      {
        numero: 22,
        texto:
          'Puedo utilizar con autonomía las herramientas digitales necesarias para realizar mis funciones.',
      },
      {
        numero: 23,
        texto:
          'En mi área existe disposición para adoptar nuevas formas de trabajo apoyadas en tecnología.',
      },
      {
        numero: 24,
        texto:
          'Las áreas colaboran para resolver dificultades durante los cambios digitales.',
      },
      {
        numero: 25,
        texto:
          'Al diseñar o mejorar servicios digitales, se consideran las necesidades y condiciones de accesibilidad de las personas usuarias.',
      },
    ],
  },
];

export const DIMENSIONES_PA: DimensionDefinition[] = [
  {
    id: 1,
    codigo: 'Y1',
    nombre: 'Simplificación y racionalización de trámites y procedimientos',
    instrumento: 'PA',
    items: [
      {
        numero: 1,
        texto: 'Los procedimientos tienen pasos claramente definidos.',
      },
      {
        numero: 2,
        texto:
          'Los requisitos solicitados guardan relación con la finalidad del trámite.',
      },
      {
        numero: 3,
        texto:
          'Se evita solicitar información o documentos repetidos dentro de un mismo procedimiento.',
      },
      {
        numero: 4,
        texto:
          'Las actividades innecesarias se identifican y corrigen.',
      },
      {
        numero: 5,
        texto:
          'Los procedimientos pueden completarse sin derivaciones que no agregan valor.',
      },
    ],
  },
  {
    id: 2,
    codigo: 'Y2',
    nombre: 'Gestión documental, trazabilidad y seguimiento',
    instrumento: 'PA',
    items: [
      {
        numero: 6,
        texto: 'Los documentos se registran de manera oportuna.',
      },
      {
        numero: 7,
        texto: 'Es posible conocer el estado actual de un expediente.',
      },
      {
        numero: 8,
        texto:
          'Se puede identificar qué unidad o responsable tiene a cargo cada trámite.',
      },
      {
        numero: 9,
        texto:
          'Las actuaciones realizadas quedan registradas de forma verificable.',
      },
      {
        numero: 10,
        texto: 'Los documentos pueden recuperarse cuando se necesitan.',
      },
    ],
  },
  {
    id: 3,
    codigo: 'Y3',
    nombre: 'Eficiencia operativa y uso de recursos',
    instrumento: 'PA',
    items: [
      {
        numero: 11,
        texto:
          'Los trámites se atienden dentro de los plazos establecidos.',
      },
      {
        numero: 12,
        texto:
          'Las tareas se realizan sin repetir trabajos por errores evitables.',
      },
      {
        numero: 13,
        texto:
          'La información necesaria está disponible para continuar el procedimiento.',
      },
      {
        numero: 14,
        texto:
          'La distribución de tareas permite atender la carga de trabajo.',
      },
      {
        numero: 15,
        texto:
          'Los recursos disponibles se utilizan de manera adecuada en los procesos.',
      },
    ],
  },
  {
    id: 4,
    codigo: 'Y4',
    nombre: 'Coordinación interáreas e integración procedimental',
    instrumento: 'PA',
    items: [
      {
        numero: 16,
        texto:
          'Las áreas conocen qué información deben entregar a otras unidades.',
      },
      {
        numero: 17,
        texto:
          'Las derivaciones se realizan con la documentación necesaria.',
      },
      {
        numero: 18,
        texto:
          'Las observaciones entre áreas se comunican de manera clara.',
      },
      {
        numero: 19,
        texto:
          'Los procedimientos mantienen continuidad cuando intervienen varias unidades.',
      },
      {
        numero: 20,
        texto:
          'Las responsabilidades entre áreas están definidas para cada etapa.',
      },
    ],
  },
  {
    id: 5,
    codigo: 'Y5',
    nombre: 'Control, transparencia y rendición de cuentas',
    instrumento: 'PA',
    items: [
      {
        numero: 21,
        texto: 'El avance de los procedimientos puede ser supervisado.',
      },
      {
        numero: 22,
        texto:
          'Las decisiones administrativas cuentan con sustento verificable.',
      },
      {
        numero: 23,
        texto:
          'Los retrasos o incidencias pueden identificarse oportunamente.',
      },
      {
        numero: 24,
        texto:
          'La información sobre el estado de los trámites se brinda de acuerdo con las normas aplicables.',
      },
      {
        numero: 25,
        texto:
          'La entidad dispone de evidencia para rendir cuentas sobre la gestión de sus procesos.',
      },
    ],
  },
];

export const TODAS_LAS_DIMENSIONES = [...DIMENSIONES_TD, ...DIMENSIONES_PA];

export const SEXO_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
];

export const ESTADO_CIVIL_OPTIONS = [
  'Soltero/a',
  'Casado/a',
  'Conviviente',
  'Viudo/a',
  'Divorciado/a',
];

export const INSTRUCCION_OPTIONS = [
  'Primaria',
  'Secundaria',
  'Técnico',
  'Universitario',
  'Posgrado',
];

export const NIVEL_RESPONSABILIDAD_OPTIONS = [
  'Técnico u operativo',
  'Profesional o especialista',
  'Coordinación o jefatura',
  'Prefiero no responder',
];

export const ANTIGUEDAD_OPTIONS = [
  '6–11 meses',
  '1–2 años',
  '1–3 años',
  '4–6 años',
  '7–10 años',
  'Más de 10 años',
];

export const FRECUENCIA_OPTIONS = [
  'Todos los días laborables',
  '3–4 días',
  '1–2 días',
  'Menos de 1 día por semana',
];

export const PARTICIPACION_OPTIONS = [
  'Sí',
  'No',
  'No estoy seguro/a',
];

export const CONSENTIMIENTO_PARRAFOS = [
  'Se le invita a participar en una investigación académica cuyo propósito es determinar la relación entre la transformación digital y procesos administrativos en el Gobierno Regional de Huánuco, 2026. Los resultados permitirán generar evidencia útil para comprender y optimizar la gestión administrativa regional.',
  'Su participación consistirá en responder un cuestionario estructurado con escala tipo Likert. El tiempo aproximado de respuesta será de 15 a 20 minutos. No se solicitarán nombres ni datos personales sensibles que permitan identificarlo directamente.',
  'La participación es voluntaria. Usted puede aceptar, no aceptar o retirarse en cualquier momento, sin que ello genere consecuencia laboral, académica o administrativa. El estudio no representa riesgos físicos, laborales ni personales; el beneficio principal es contribuir con información para la mejora académica e institucional.',
  'La información recolectada será anónima, confidencial y utilizada exclusivamente con fines académicos. Los resultados se presentarán de forma agrupada, sin identificar respuestas individuales. La base de datos será resguardada por el investigador y no será empleada con fines comerciales, sancionadores ni de evaluación del desempeño individual.',
  'Declaro que he leído la información anterior, comprendo el propósito del estudio y he recibido información suficiente sobre mi participación. Por esa razón, manifiesto mi decisión libre e informada.',
];

export const CONSENTIMIENTO_DECLARACION =
  'Acepto participar voluntariamente en este estudio. Entiendo que mis respuestas serán tratadas de forma anónima y confidencial, y que puedo retirarme en cualquier momento.';

export const ESCALA_LEYENDA = [
  '1 = Totalmente en desacuerdo',
  '2 = En desacuerdo',
  '3 = Ni de acuerdo ni en desacuerdo',
  '4 = De acuerdo',
  '5 = Totalmente de acuerdo',
  'N/A = No tengo información suficiente',
];

export const ITEM_KEYS_TD = Array.from(
  { length: 25 },
  (_, index) => `td_${String(index + 1).padStart(2, '0')}`,
);

export const ITEM_KEYS_PA = Array.from(
  { length: 25 },
  (_, index) => `pa_${String(index + 1).padStart(2, '0')}`,
);

export const TODOS_LOS_ITEM_KEYS = [...ITEM_KEYS_TD, ...ITEM_KEYS_PA];

export const AREA_FALLBACK = [
  'Planeamiento y presupuesto',
  'Administración, logística y recursos humanos',
  'Trámite documentario y atención',
  'Control y asesoría',
  'Obras',
  'Liquidación',
  'Estudios',
  'Gerencia de desarrollo social',
  'Patrimonio',
  'Infraestructura',
  'PROCOMPITE',
  'Otros / No especificado',
];
