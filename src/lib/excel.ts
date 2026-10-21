import type ExcelJS from 'exceljs';
import {
  DIMENSIONES_PA,
  DIMENSIONES_TD,
  LIKERT_OPTIONS,
  META_ENCUESTAS,
  TITULO_ESTUDIO,
} from './catalog';
import {
  average,
  computeScores,
  downloadBlob,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatNumber,
  getAreaName,
  safeNumber,
  todayISO,
} from './format';
import type { Area, Profile, Survey } from '../types';

const BASE_HEADERS = [
  'N°',
  'Edad',
  'Sexo',
  'Estado CivilL',
  'Grado de Instrucción',
  'Grupo Funcional Principal',
  'Nivel de Responsabilidad',
  'Antigüedad',
  'Frecuencia de uso-Herramientas',
  'Participación en mejoras digitales-2026',
  ...Array.from({ length: 25 }, (_, i) => `P${i + 1}`),
  ...Array.from({ length: 25 }, (_, i) => `P${i + 1}`),
];

const TD_KEYS = Array.from(
  { length: 25 },
  (_, i) => `td_${String(i + 1).padStart(2, '0')}`,
);
const PA_KEYS = Array.from(
  { length: 25 },
  (_, i) => `pa_${String(i + 1).padStart(2, '0')}`,
);

const COLORS = {
  onyx: 'FF18181B',
  emerald: 'FF059669',
  mint: 'FFD1FAE5',
  fog: 'FFF4F4F5',
  border: 'FFE5E7EB',
  graphite: 'FF52525B',
  slate: 'FF71717A',
  white: 'FFFFFFFF',
  charcoal: 'FF3F3F46',
};

function itemValues(
  surveys: Survey[],
  instrumento: 'TD' | 'PA',
  dimensionId?: number,
): number[] {
  const dims = instrumento === 'TD' ? DIMENSIONES_TD : DIMENSIONES_PA;
  const selected = dimensionId
    ? dims.filter((dimension) => dimension.id === dimensionId)
    : dims;
  const keys = instrumento === 'TD' ? TD_KEYS : PA_KEYS;
  const indexes = selected.flatMap((dimension) =>
    dimension.items.map((item) => item.numero - 1),
  );
  const values: number[] = [];
  for (const survey of surveys) {
    for (const index of indexes) {
      const value = safeNumber(survey[keys[index]]);
      if (value >= 1 && value <= 5) values.push(value);
    }
  }
  return values;
}

function styleRange(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  style: {
    fill?: string;
    fontColor?: string;
    bold?: boolean;
    size?: number;
    align?: ExcelJS.Alignment['horizontal'];
    wrap?: boolean;
    border?: boolean;
  },
): void {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const cell = worksheet.getCell(row, col);
      if (style.fill) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: style.fill },
        };
      }
      cell.font = {
        name: 'Calibri',
        size: style.size ?? 10,
        bold: style.bold ?? false,
        color: { argb: style.fontColor ?? COLORS.onyx },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: style.align ?? 'left',
        wrapText: style.wrap ?? false,
      };
      if (style.border) {
        cell.border = {
          top: { style: 'thin', color: { argb: COLORS.border } },
          left: { style: 'thin', color: { argb: COLORS.border } },
          bottom: { style: 'thin', color: { argb: COLORS.border } },
          right: { style: 'thin', color: { argb: COLORS.border } },
        };
      }
    }
  }
}

function buildBaseSheet(
  workbook: ExcelJS.Workbook,
  surveys: Survey[],
  areas: Area[],
): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet('Base 2026', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 5 }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const widths = [7, 7, 6, 14, 18, 40, 28, 18, 30, 18];
  for (let i = 0; i < 60; i += 1) {
    ws.getColumn(i + 1).width = widths[i] ?? 5.5;
  }

  ws.getCell('D1').value = 'SÍ=1';
  ws.getCell('E1').value = 'NO=0';
  ws.getCell('F1').value = 'No estoy seguro=0';
  styleRange(ws, 1, 1, 4, 6, {
    fontColor: COLORS.slate,
    size: 9,
    align: 'left',
    bold: true,
  });

  ws.mergeCells('A2:BH2');
  ws.getCell('A2').value = TITULO_ESTUDIO;
  styleRange(ws, 2, 2, 1, 60, {
    fill: COLORS.onyx,
    fontColor: COLORS.white,
    bold: true,
    size: 13,
    align: 'center',
    border: true,
  });
  ws.getRow(2).height = 30;

  ws.mergeCells('B3:J3');
  ws.mergeCells('K3:AI3');
  ws.mergeCells('AJ3:BH3');
  ws.getCell('A3').value = 'Encuesta';
  ws.getCell('B3').value = 'Información General';
  ws.getCell('K3').value = 'Transformación Digital en la Gestión Pública: Likert';
  ws.getCell('AJ3').value = 'Procesos Administrativos: Likert';
  styleRange(ws, 3, 3, 1, 60, {
    fill: COLORS.emerald,
    fontColor: COLORS.white,
    bold: true,
    size: 10,
    align: 'center',
    border: true,
  });
  ws.getRow(3).height = 24;

  ws.mergeCells('B4:E4');
  ws.mergeCells('F4:J4');
  ws.getCell('B4').value = 'Datos Epidemiológicos';
  ws.getCell('F4').value = 'Unidad Orgánica';
  for (let i = 0; i < 50; i += 1) {
    ws.getCell(4, 11 + i).value = i + 1;
  }
  styleRange(ws, 4, 4, 1, 60, {
    fill: COLORS.fog,
    fontColor: COLORS.onyx,
    bold: true,
    size: 9,
    align: 'center',
    border: true,
  });
  ws.getRow(4).height = 20;

  BASE_HEADERS.forEach((header, index) => {
    ws.getCell(5, index + 1).value = header;
  });
  styleRange(ws, 5, 5, 1, 60, {
    fill: COLORS.onyx,
    fontColor: COLORS.white,
    bold: true,
    size: 9,
    align: 'center',
    wrap: true,
    border: true,
  });
  ws.getRow(5).height = 42;

  const areaMap = new Map(areas.map((area) => [area.id, area.nombre]));

  surveys.forEach((survey, index) => {
    const rowNumber = 6 + index;
    const row: Array<string | number | null> = [
      survey.numero,
      survey.edad,
      survey.sexo,
      survey.estado_civil,
      survey.instruccion,
      areaMap.get(Number(survey.area_id)) || getAreaName(survey),
      survey.nivel_responsabilidad,
      survey.antiguedad,
      survey.frecuencia_uso,
      survey.participacion === 'Sí' ? 1 : 0,
    ];

    for (const key of TD_KEYS) {
      const value = safeNumber(survey[key]);
      row.push(value >= 1 && value <= 5 ? value : null);
    }
    for (const key of PA_KEYS) {
      const value = safeNumber(survey[key]);
      row.push(value >= 1 && value <= 5 ? value : null);
    }

    row.forEach((value, cellIndex) => {
      const cell = ws.getCell(rowNumber, cellIndex + 1);
      cell.value = value;
      cell.font = {
        name: 'Calibri',
        size: 9,
        color: { argb: COLORS.onyx },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal:
          cellIndex < 5 || cellIndex >= 10 ? 'center' : 'left',
        wrapText: false,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };
    });
    ws.getRow(rowNumber).height = 18;
  });

  const lastRow = Math.max(6, 5 + surveys.length);
  ws.autoFilter = { from: 'A5', to: `BH${lastRow}` };

  return ws;
}

function sectionTitle(
  ws: ExcelJS.Worksheet,
  row: number,
  title: string,
  span = 4,
): number {
  ws.mergeCells(row, 1, row, span);
  ws.getCell(row, 1).value = title;
  styleRange(ws, row, row, 1, span, {
    fill: COLORS.fog,
    fontColor: COLORS.onyx,
    bold: true,
    size: 11,
    align: 'left',
    border: true,
  });
  ws.getRow(row).height = 22;
  return row + 2;
}

function table(
  ws: ExcelJS.Worksheet,
  startRow: number,
  headers: string[],
  rows: Array<Array<string | number | null>>,
): number {
  headers.forEach((header, index) => {
    ws.getCell(startRow, index + 1).value = header;
  });
  styleRange(ws, startRow, startRow, 1, headers.length, {
    fill: COLORS.onyx,
    fontColor: COLORS.white,
    bold: true,
    size: 9,
    align: 'center',
    wrap: true,
    border: true,
  });

  rows.forEach((values, rowIndex) => {
    const rowNumber = startRow + 1 + rowIndex;
    values.forEach((value, columnIndex) => {
      const cell = ws.getCell(rowNumber, columnIndex + 1);
      cell.value = value;
      cell.font = {
        name: 'Calibri',
        size: 9,
        color: { argb: COLORS.onyx },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: columnIndex === 0 ? 'left' : 'center',
        wrapText: columnIndex === 1 && headers[1] === 'Dimensión',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };
    });
  });

  return startRow + rows.length + 3;
}

function buildSummarySheet(
  workbook: ExcelJS.Workbook,
  surveys: Survey[],
  generatedAt: Date,
): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet('Resumen', {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  });
  ws.getColumn(1).width = 46;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 16;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 50;

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = 'Resumen de resultados · Encuestas GOREHCO 2026';
  styleRange(ws, 1, 1, 1, 6, {
    fill: COLORS.onyx,
    fontColor: COLORS.white,
    bold: true,
    size: 15,
    align: 'left',
  });
  ws.getRow(1).height = 30;

  const total = surveys.length;
  const tdValues = itemValues(surveys, 'TD');
  const paValues = itemValues(surveys, 'PA');
  const td = average(tdValues);
  const pa = average(paValues);
  const validResponses = tdValues.length + paValues.length;
  const totalSlots = total * 50;
  const naCount = Math.max(0, totalSlots - validResponses);
  const progress = total ? (total / META_ENCUESTAS) * 100 : 0;

  const kpis: Array<[string, string]> = [
    ['Total de encuestas', formatNumber(total)],
    ['Promedio Transformación Digital', formatDecimal(td)],
    ['Promedio Procesos Administrativos', formatDecimal(pa)],
    ['Meta de encuestas', formatNumber(META_ENCUESTAS)],
    ['Avance hacia la meta', `${formatDecimal(progress, 1)}%`],
    ['Respuestas N/A (excluidas de promedios)', formatNumber(naCount)],
    ['Generado', formatDateTime(generatedAt.toISOString())],
  ];

  kpis.forEach(([label, value], index) => {
    const row = 3 + index;
    ws.getCell(row, 1).value = label;
    ws.getCell(row, 2).value = value;
    ws.mergeCells(row, 2, row, 3);
    styleRange(ws, row, row, 1, 3, {
      fontColor: index === 0 ? COLORS.onyx : COLORS.graphite,
      bold: index === 0,
      size: 10,
      border: true,
    });
    ws.getCell(row, 2).alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
  });

  let row = 3 + kpis.length + 2;

  row = sectionTitle(ws, row, 'Promedios por dimensión', 4);
  const dimensionRows: Array<Array<string | number | null>> = [];
  for (const dimension of DIMENSIONES_TD) {
    const values = itemValues(surveys, 'TD', dimension.id);
    dimensionRows.push([
      `TD · ${dimension.codigo}`,
      dimension.nombre,
      average(values) === null ? '—' : formatDecimal(average(values)),
      values.length,
    ]);
  }
  for (const dimension of DIMENSIONES_PA) {
    const values = itemValues(surveys, 'PA', dimension.id);
    dimensionRows.push([
      `PA · ${dimension.codigo}`,
      dimension.nombre,
      average(values) === null ? '—' : formatDecimal(average(values)),
      values.length,
    ]);
  }
  row = table(
    ws,
    row,
    ['Instrumento', 'Dimensión', 'Promedio', 'Respuestas'],
    dimensionRows,
  );

  row = sectionTitle(ws, row, 'Distribución de respuestas Likert', 5);
  const distributionRows: Array<Array<string | number | null>> = [];
  for (let value = 1; value <= 5; value += 1) {
    const count = [...tdValues, ...paValues].filter((v) => v === value).length;
    distributionRows.push([
      value,
      LIKERT_OPTIONS.find((option) => option.value === value)?.label ?? '',
      count,
      validResponses ? `${formatDecimal((count / validResponses) * 100, 1)}%` : '0.0%',
    ]);
  }
  distributionRows.push([
    'N/A',
    'No tengo información suficiente (excluida de promedios)',
    naCount,
    totalSlots ? `${formatDecimal((naCount / totalSlots) * 100, 1)}%` : '0.0%',
  ]);
  row = table(ws, row, ['Valor', 'Etiqueta', 'n', '%'], distributionRows);

  row = sectionTitle(ws, row, 'Promedios por área / unidad orgánica', 5);
  const areaGroups = new Map<string, Survey[]>();
  for (const survey of surveys) {
    const name = getAreaName(survey);
    const list = areaGroups.get(name) ?? [];
    list.push(survey);
    areaGroups.set(name, list);
  }
  const areaRows = [...areaGroups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, list]) => [
      name,
      list.length,
      formatDecimal(average(itemValues(list, 'TD'))),
      formatDecimal(average(itemValues(list, 'PA'))),
    ]);
  row = table(ws, row, ['Área / unidad orgánica', 'n', 'TD', 'PA'], areaRows);

  row = sectionTitle(ws, row, 'Promedios por sexo', 5);
  const sexRows = (['F', 'M'] as const).map((sex) => {
    const list = surveys.filter((survey) => survey.sexo === sex);
    return [
      sex === 'F' ? 'Femenino' : 'Masculino',
      list.length,
      formatDecimal(average(itemValues(list, 'TD'))),
      formatDecimal(average(itemValues(list, 'PA'))),
    ];
  });
  row = table(ws, row, ['Sexo', 'n', 'TD', 'PA'], sexRows);

  ws.mergeCells(row, 1, row + 2, 6);
  ws.getCell(row, 1).value =
    'Nota metodológica: los promedios se calculan sobre respuestas válidas de 1 a 5. Los valores N/A (0) se excluyen de los promedios y se muestran vacíos en la hoja Base 2026. Los 107 registros históricos no tienen fecha de aplicación, por lo que no aparecen en la evolución mensual del panel.';
  styleRange(ws, row, row + 2, 1, 6, {
    fill: 'FFECFDF5',
    fontColor: COLORS.graphite,
    size: 9,
    wrap: true,
    border: true,
  });

  return ws;
}

function buildDictionarySheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet('Diccionario', {
    views: [{ showGridLines: false }],
  });
  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 90;
  ws.getColumn(3).width = 32;

  ws.mergeCells('A1:C1');
  ws.getCell('A1').value = 'Diccionario de variables';
  styleRange(ws, 1, 1, 1, 3, {
    fill: COLORS.onyx,
    fontColor: COLORS.white,
    bold: true,
    size: 15,
    align: 'left',
  });
  ws.getRow(1).height = 30;

  const rows: Array<[string, string, string]> = [
    ['N°', 'Número correlativo de la encuesta. Los registros 1–107 son históricos; las nuevas encuestas continúan desde 108.', 'Entero'],
    ['Edad', 'Edad del servidor público encuestado.', '18–99 años'],
    ['Sexo', 'Sexo declarado por la persona encuestada.', 'M / F'],
    ['Estado CivilL', 'Estado civil declarado. Se conserva el nombre original de la columna del archivo fuente.', 'Soltero/a, Casado/a, Conviviente, Viudo/a, Divorciado/a'],
    ['Grado de Instrucción', 'Máximo grado de instrucción alcanzado.', 'Primaria, Secundaria, Técnico, Universitario, Posgrado'],
    ['Grupo Funcional Principal', 'Área o unidad orgánica de desempeño.', 'Catálogo de áreas'],
    ['Nivel de Responsabilidad', 'Nivel de responsabilidad en la entidad.', 'Técnico u operativo, Profesional o especialista, Coordinación o jefatura, Prefiero no responder'],
    ['Antigüedad', 'Tiempo de servicio en la entidad.', '6–11 meses, 1–2 años, 1–3 años, 4–6 años, 7–10 años, Más de 10 años'],
    ['Frecuencia de uso-Herramientas', 'Frecuencia de uso de herramientas digitales institucionales.', 'Todos los días laborables, 3–4 días, 1–2 días, Menos de 1 día por semana'],
    ['Participación en mejoras digitales-2026', 'Participación en mejoras digitales durante el último año.', '1 = Sí; 0 = No / No estoy seguro/a'],
  ];

  for (const dimension of DIMENSIONES_TD) {
    for (const item of dimension.items) {
      rows.push([
        `P${item.numero} (TD)`,
        `${dimension.codigo} · ${dimension.nombre} · ${item.texto}`,
        '1–5 Likert; 0 = N/A',
      ]);
    }
  }
  for (const dimension of DIMENSIONES_PA) {
    for (const item of dimension.items) {
      rows.push([
        `P${item.numero} (PA)`,
        `${dimension.codigo} · ${dimension.nombre} · ${item.texto}`,
        '1–5 Likert; 0 = N/A',
      ]);
    }
  }

  const start = 3;
  ['Campo', 'Descripción', 'Escala / valores'].forEach((header, index) => {
    ws.getCell(start, index + 1).value = header;
  });
  styleRange(ws, start, start, 1, 3, {
    fill: COLORS.emerald,
    fontColor: COLORS.white,
    bold: true,
    size: 10,
    align: 'center',
    border: true,
  });

  rows.forEach((values, rowIndex) => {
    const rowNumber = start + 1 + rowIndex;
    values.forEach((value, columnIndex) => {
      const cell = ws.getCell(rowNumber, columnIndex + 1);
      cell.value = value;
      cell.font = {
        name: 'Calibri',
        size: 9,
        color: { argb: COLORS.onyx },
      };
      cell.alignment = {
        vertical: 'top',
        horizontal: 'left',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };
    });
  });

  const noteRow = start + rows.length + 2;
  ws.mergeCells(noteRow, 1, noteRow + 1, 3);
  ws.getCell(noteRow, 1).value =
    'Escala Likert: 1 = Totalmente en desacuerdo; 2 = En desacuerdo; 3 = Ni de acuerdo ni en desacuerdo; 4 = De acuerdo; 5 = Totalmente de acuerdo. N/A = No tengo información suficiente para responder. En la hoja Base 2026, las celdas N/A se exportan vacías.';
  styleRange(ws, noteRow, noteRow + 1, 1, 3, {
    fill: 'FFECFDF5',
    fontColor: COLORS.graphite,
    size: 9,
    wrap: true,
    border: true,
  });

  return ws;
}

function buildControlSheet(
  workbook: ExcelJS.Workbook,
  surveys: Survey[],
  profiles: Profile[],
  isAdmin: boolean,
): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet('Control', {
    views: [{ showGridLines: false }],
  });
  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 32;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 14;

  ws.mergeCells('A1:G1');
  ws.getCell('A1').value = 'Control de registros';
  styleRange(ws, 1, 1, 1, 7, {
    fill: COLORS.onyx,
    fontColor: COLORS.white,
    bold: true,
    size: 15,
    align: 'left',
  });
  ws.getRow(1).height = 30;

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const headers = [
    'N°',
    'Fecha de aplicación',
    'Fecha de registro',
    'Registrado por',
    'Estado',
    'Origen',
    'Consentimiento',
  ];

  headers.forEach((header, index) => {
    ws.getCell(3, index + 1).value = header;
  });
  styleRange(ws, 3, 3, 1, 7, {
    fill: COLORS.emerald,
    fontColor: COLORS.white,
    bold: true,
    size: 10,
    align: 'center',
    border: true,
  });

  surveys.forEach((survey, index) => {
    const row = 4 + index;
    const profile = survey.usuario_id
      ? profileMap.get(survey.usuario_id)
      : undefined;
    const values = [
      survey.numero,
      formatDate(survey.fecha_encuesta),
      formatDateTime(survey.creado_en),
      isAdmin ? profile?.nombre || (survey.origen === 'importado' ? 'Histórico importado' : '—') : '—',
      survey.estado === 'validada' ? 'Validada' : survey.estado === 'borrador' ? 'Borrador' : 'Completa',
      survey.origen === 'importado' ? 'Importado' : 'App',
      survey.consentimiento ? 'Sí' : 'No',
    ];
    values.forEach((value, columnIndex) => {
      const cell = ws.getCell(row, columnIndex + 1);
      cell.value = value;
      cell.font = { name: 'Calibri', size: 9, color: { argb: COLORS.onyx } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: columnIndex === 0 || columnIndex >= 4 ? 'center' : 'left',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };
    });
  });

  const noteRow = Math.max(5, 4 + surveys.length + 1);
  ws.mergeCells(noteRow, 1, noteRow + 1, 7);
  ws.getCell(noteRow, 1).value =
    'La hoja Base 2026 no contiene nombres ni correos. Esta hoja de control es solo para trazabilidad administrativa. Los registros históricos importados no tienen fecha de aplicación ni usuario asociado.';
  styleRange(ws, noteRow, noteRow + 1, 1, 7, {
    fill: 'FFECFDF5',
    fontColor: COLORS.graphite,
    size: 9,
    wrap: true,
    border: true,
  });

  return ws;
}

export interface ExportExcelOptions {
  surveys: Survey[];
  areas: Area[];
  profiles?: Profile[];
  isAdmin: boolean;
}

export async function exportSurveysToExcel({
  surveys,
  areas,
  profiles = [],
  isAdmin,
}: ExportExcelOptions): Promise<void> {
  const completed = surveys
    .filter(
      (survey) =>
        !survey.eliminado_en &&
        (survey.estado === 'completa' || survey.estado === 'validada'),
    )
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));

  if (!completed.length) {
    throw new Error('No hay encuestas completas para exportar con los filtros actuales.');
  }

  // ExcelJS es pesado: se carga solo cuando la persona solicita una exportación.
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Encuestas GOREHCO';
  workbook.lastModifiedBy = 'Encuestas GOREHCO';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  buildBaseSheet(workbook, completed, areas);
  buildSummarySheet(workbook, completed, new Date());
  buildDictionarySheet(workbook);
  buildControlSheet(workbook, completed, profiles, isAdmin);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `Encuestas_TD_PA_GOREHCO_${todayISO()}.xlsx`);
}
