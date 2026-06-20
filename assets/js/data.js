/*
 * Datos extraídos de "Relación de la deuda, JUNIO 2026.docx".
 * Los totales de cada mes fueron verificados contra el total oficial
 * del documento ($8.300.300) y coinciden de forma exacta.
 *
 * Para anexar un comprobante desde Google Drive, basta con pegar el link
 * en el campo "driveUrl" de la evidencia correspondiente en EVIDENCIA.
 */

const CASO = {
  cliente: "Juan Pablo Daza González",
  contraparte: "Carolina Muñoz",
  menor: "Gabriel",
  pareja: "pareja actual del cliente",
  corte: "Junio 2026",
  // Totales según la tabla de cobros (julio 2025 – junio 2026)
  // Cargos brutos: $9.860.300 | Abono registrado: $1.170.000 | Neto reclamado: $8.690.300
  totalCargos: 9860300,
  totalAbonos: 1170000,
  totalActual: 8690300,
};

// Aclaración de los dos conceptos recurrentes que más se confunden en la relación.
const CONCEPTOS_INFO = [
  {
    titulo: "Acuerdo deuda — $290.000 / mes",
    texto: "Cuota fija mensual de $290.000, constante durante todo el periodo (julio 2025 a junio 2026), correspondiente a un acuerdo de pago de deuda independiente de la cuota de alimentos.",
  },
  {
    titulo: "Cuota de alimentos — $390.000 → $479.700 / mes",
    texto: "Cuota mensual de alimentos. Se mantuvo en $390.000 entre julio y diciembre de 2025. Desde enero de 2026 subió a $479.700 por el incremento del 23% del Salario Mínimo Legal Vigente (SMLV) decretado para este año.",
  },
];

// status: "no-pago" (rojo), "duda" (fucsia), "pagado" (amarillo), "pendiente" (sin clasificar / mes en curso)
const MESES = [
  {
    year: 2025, month: "Julio", clave: "2025-07",
    items: [
      { concepto: "Acuerdo deuda", valor: 290000, status: "no-pago" },
      { concepto: "Cuota de alimentos", valor: 390000, status: "no-pago",
        pagoMostrado: 390000,
        nota: "Saldo a favor — el dinero fue utilizado este mes." },
      { concepto: "Materiales del colegio", valor: 88100, status: "duda",
        nota: "Se solicita la factura de estos materiales, ya que no se mostró ni compartió evidencia de lo comprado para el menor. Se solicita el soporte para proceder con el pago del 50% acordado." },
      { concepto: "Muda de ropa", valor: 250000, status: "no-pago",
        nota: "Entrega intentada en junio — la contraparte no la aceptó este mes. El gasto ya estaba realizado.",
        evidencia: ["muda-whatsapp", "muda-factura"] },
    ],
  },
  {
    year: 2025, month: "Agosto", clave: "2025-08",
    items: [
      { concepto: "Cuota de alimentos", valor: 390000, status: "cubierto",
        nota: "Incluida en el pago único del 15 de octubre de 2025." },
      { concepto: "Acuerdo deuda", valor: 290000, status: "no-pago" },
      { concepto: "Libro ‘Ellas’", valor: 16500, status: "duda",
        nota: "No se tiene claridad sobre cuál es el libro solicitado ni se cuenta con su factura. Se solicita el soporte para proceder con el pago." },
    ],
  },
  {
    year: 2025, month: "Septiembre", clave: "2025-09",
    items: [
      { concepto: "Cuota de alimentos", valor: 390000, status: "cubierto",
        nota: "Incluida en el pago único del 15 de octubre de 2025." },
      { concepto: "Acuerdo deuda", valor: 290000, status: "no-pago" },
    ],
  },
  {
    year: 2025, month: "Octubre", clave: "2025-10",
    items: [
      { concepto: "Cuota de alimentos", valor: 390000, status: "cubierto",
        nota: "Incluida en el pago único del 15 de octubre de 2025." },
      { concepto: "Acuerdo deuda", valor: 290000, status: "no-pago" },
      { concepto: "Muda de ropa", valor: 250000, status: "no-pago",
        nota: "Entrega intentada en octubre — la contraparte no la aceptó este mes. El gasto ya estaba realizado.",
        evidencia: ["muda-whatsapp", "muda-factura"] },
      { concepto: "Abono", valor: -1170000, status: "abono",
        nota: "Pago realizado el 15 de octubre de 2025 por transferencia Bancolombia a Carolina Muñoz, cubriendo las cuotas de agosto, septiembre y octubre de 2025.",
        evidencia: ["bancolombia-aso"] },
    ],
  },
  {
    year: 2025, month: "Noviembre", clave: "2025-11",
    items: [
      { concepto: "Cuota de alimentos", valor: 390000, status: "no-pago" },
      { concepto: "Acuerdo deuda", valor: 290000, status: "no-pago" },
    ],
  },
  {
    year: 2025, month: "Diciembre", clave: "2025-12",
    items: [
      { concepto: "Cuota de alimentos", valor: 390000, status: "pagado",
        pagoMostrado: 400000,
        nota: "Pago realizado por $400.000 mediante Nequi — $10.000 por encima de la cuota, generando saldo a favor.",
        favor: 10000,
        evidencia: ["nequi-diciembre"] },
      { concepto: "Acuerdo deuda", valor: 290000, status: "no-pago" },
      { concepto: "Muda de ropa", valor: 250000, status: "pagado",
        pagoMostrado: 750000,
        nota: "Diciembre fue el mes en que la contraparte aceptó toda la ropa entregada (julio, octubre y diciembre). Se acreditan las 3 entregas: 3 × $250.000 = $750.000.\n\nAdicional informativo (no suma en cuentas): detalle de ítems usados durante el año — Pantalón $80.000 · Camisas ×9 $270.000 · Buso/Chaqueta $0 · Medias ×12 $144.000 · Boxer ×12 $144.000 · Zapatos $80.000 — Total adicional: $718.000.",
        evidencia: ["muda-whatsapp", "muda-factura"] },
    ],
  },
  {
    year: 2026, month: "Enero", claveMes: "Enero (incremento 23% SMLV)", clave: "2026-01",
    items: [
      { concepto: "Cuota de alimentos", valor: 479700, status: "no-pago",
        nota: "Valor ajustado por el incremento del 23% del Salario Mínimo Legal Vigente." },
      { concepto: "Acuerdo deuda", valor: 290000, status: "no-pago" },
    ],
  },
  {
    year: 2026, month: "Febrero", clave: "2026-02",
    items: [
      { concepto: "Cuota de alimentos", valor: 479700, status: "no-pago" },
      { concepto: "Acuerdo deuda", valor: 290000, status: "no-pago" },
    ],
  },
  {
    year: 2026, month: "Marzo", clave: "2026-03",
    items: [
      { concepto: "Cuota de alimentos", valor: 479700, status: "duda",
        pagoMostrado: 303810,
        nota: "Desde el 4 de marzo se recibe al menor. Desde el 10 de marzo se establece acuerdo de cuidado: ella lo lleva y el padre lo tiene toda la tarde y noche. 19 días con el padre × $15.990 = $303.810 | 7 días con la madre = $111.930.",
        favor: 303810, diasPapa: 19, diasMama: 7, valorDia: 15990 },
      { concepto: "Acuerdo deuda", valor: 290000, status: "no-pago" },
      { concepto: "Gastos de colegio", valor: 748000, status: "abono",
        nota: "Matrícula $260.000 · Blazer $200.000 · Inglés $50.000 · Exámenes $20.000 · Útiles $70.000 · Zapatos colegio $60.000 · Uniforme $73.000 · Arreglo maleta $15.000." },
    ],
  },
  {
    year: 2026, month: "Abril", clave: "2026-04",
    items: [
      { concepto: "Cuota de alimentos", valor: 479700, status: "duda",
        pagoMostrado: 687820,
        nota: "18 días con el padre × $15.990 = $287.820 | 11 días con la madre = $175.890. Desde este mes se paga una persona para cuidar al niño: $400.000. Total crédito reclamado: $287.820 + $400.000 = $687.820.",
        cuidadoAdicional: 400000, diasPapa: 18, diasMama: 11, valorDia: 15990 },
      { concepto: "Acuerdo deuda", valor: 290000, status: "no-pago" },
    ],
  },
  {
    year: 2026, month: "Mayo", clave: "2026-05",
    items: [
      { concepto: "Cuota de alimentos", valor: 479700, status: "duda",
        pagoMostrado: 703810,
        nota: "19 días con el padre × $15.990 = $303.810 | 11 días con la madre = $175.890. Cuidador: $400.000 ($100.000/semana × 4 semanas). Total crédito reclamado: $303.810 + $400.000 = $703.810.",
        favor: 303810, diasPapa: 19, diasMama: 11, valorDia: 15990 },
      { concepto: "Acuerdo deuda", valor: 290000, status: "no-pago" },
    ],
  },
  {
    year: 2026, month: "Junio", clave: "2026-06",
    items: [
      { concepto: "Cuota de alimentos", valor: 479700, status: "pendiente",
        pagoMostrado: 207870,
        nota: "13 días con el padre × $15.990 = $207.870. Del menor no se tiene conocimiento desde el 13 de junio de 2026." },
      { concepto: "Acuerdo deuda", valor: 290000, status: "pendiente" },
      { concepto: "Muda de ropa", valor: 307500, status: "pendiente",
        nota: "Valor con incremento del 23%. Pendiente de soporte." },
    ],
  },
];

// Evidencia ya disponible (extraída del .docx). El campo driveUrl queda en null
// como ancla: cuando llegue el link de Google Drive, solo hay que completarlo aquí.
const EVIDENCIA = [
  {
    id: "muda-whatsapp",
    titulo: "Lista de mudas Gabriel 2025 (WhatsApp)",
    archivo: "assets/img/evidencia/muda-ropa-whatsapp.png",
    driveUrl: null,
    relacionado: "Muda de ropa — Jul / Oct / Dic 2025",
  },
  {
    id: "muda-factura",
    titulo: "Factura de compra — muda de ropa",
    archivo: "assets/img/evidencia/muda-ropa-factura.png",
    driveUrl: null,
    relacionado: "Muda de ropa — Jul / Oct / Dic 2025",
  },
  {
    id: "bancolombia-aso",
    titulo: "Transferencia Bancolombia — Ago/Sep/Oct 2025 ($1.170.000)",
    archivo: "assets/img/evidencia/bancolombia-ago-sep-oct.png",
    driveUrl: null,
    relacionado: "Cuota de alimentos Ago-Sep-Oct 2025 + Abono Octubre",
  },
  {
    id: "nequi-diciembre",
    titulo: "Transferencia Nequi — Diciembre ($400.000)",
    archivo: "assets/img/evidencia/nequi-diciembre.png",
    driveUrl: null,
    relacionado: "Cuota de alimentos — Diciembre 2025",
  },
];

// Gastos del colegio que la contraparte no ha pagado. El cliente entregará esta
// información más adelante; se deja la estructura lista para recibirla.
const GASTOS_COLEGIO_PENDIENTES = [
  // { concepto: "", valor: 0, fecha: "", nota: "", evidencia: [] }
];

// --- Créditos del cliente (RELACION GABRIEL.xlsx) ----------------------------
// Gastos escolares ya pagados directamente por el cliente. No están reflejados
// en el total oficial de $8.300.300, por lo que se presentan como crédito adicional.
const GASTOS_COLEGIO_PAGADOS = [
  { concepto: "Matrícula", valor: 260000 },
  { concepto: "Blazer", valor: 200000 },
  { concepto: "Curso de inglés", valor: 50000,
    nota: "Costo compartido 50/50. No hay confirmación de que la contraparte haya pagado su mitad." },
  { concepto: "Exámenes de ingreso", valor: 20000 },
  { concepto: "Útiles escolares", valor: 70000 },
  { concepto: "Zapatos colegio", valor: 60000 },
  { concepto: "Uniforme", valor: 73000 },
  { concepto: "Arreglo de maleta", valor: 15000 },
];

// Detalle de respaldo de las "mudas de ropa" 2025 ya cargadas en la línea de tiempo
// (Jul/Oct/Dic, $250.000 cada una = $750.000 en total). Esta tabla del Excel
// desagrega el costo real por prenda y por entrega; no es un crédito adicional,
// es el soporte del mismo monto ya contabilizado.
const MUDAS_LEGALES_DETALLE = {
  entregas: ["Junio", "Octubre", "Diciembre"],
  items: [
    { item: "Pantalón",       junio: 80000, octubre: 80000, diciembre: 80000, cantidadAnual: 1,  total: 80000  },
    { item: "Camisa",         junio: 30000, octubre: 30000, diciembre: 30000, cantidadAnual: 9,  total: 270000 },
    { item: "Buso / chaqueta",junio: 50000, octubre: 50000, diciembre: 50000, cantidadAnual: 0,  total: 0      },
    { item: "Medias",         junio: 12000, octubre: 12000, diciembre: 12000, cantidadAnual: 12, total: 144000 },
    { item: "Boxer",          junio: 12000, octubre: 12000, diciembre: 12000, cantidadAnual: 12, total: 144000 },
    { item: "Zapatos",        junio: 80000, octubre: 80000, diciembre: 80000, cantidadAnual: 1,  total: 80000  },
  ],
  totalPorEntrega: 264000,       // costo de un set completo por entrega
  totalTresEntregas: 792000,     // 3 sets × $264.000
  totalAdicional: 718000,        // ítems adicionales (cantidades × precio unitario)
  totalGeneral: 1510000,         // todo lo invertido en ropa: $792.000 + $718.000
  notaAceptacion: "La contraparte no aceptó la ropa sino hasta diciembre. Las entregas de junio y octubre fueron rechazadas o no reconocidas, pero el gasto ya estaba realizado.",
};

// --- Otras categorías de la defensa -------------------------------------------
// Sin evidencia todavía: el cliente entregará los soportes más adelante.
// La estructura queda lista para recibirlos (misma forma que EVIDENCIA).
// Fotografías en orden cronológico. Cada entrada puede tener archivo local
// o un driveUrl. Cuando llegue el link de Drive, solo completar ese campo.
// Ejemplo de entrada:
// { fecha: "2025-07-15", titulo: "Gabriel en el parque", archivo: "assets/img/fotos/foto1.jpg", driveUrl: null }
const FOTOGRAFIAS = [
  // { fecha: "", titulo: "", descripcion: "", archivo: "", driveUrl: null }
];

const NEGACION_ESTUDIO = [
  // { concepto: "", fecha: "", nota: "", evidencia: [] }
];

const VIOLENCIA = [
  // { concepto: "", fecha: "", nota: "", evidencia: [] }
];

const AMENAZAS = [
  // { concepto: "", fecha: "", nota: "", evidencia: [] }
];
