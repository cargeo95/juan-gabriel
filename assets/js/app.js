const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const STATUS_LABEL = {
  "no-pago": "No pago",
  duda: "Duda / sin soporte",
  pagado: "Pagado",
  cubierto: "Cubierto por abono",
  pendiente: "Mes en curso",
  abono: "Abono",
};

function monthSubtotal(mes) {
  return mes.items.reduce((acc, it) => acc + it.valor, 0);
}

function buildKpis() {
  let pagado = 0, duda = 0, noPago = 0, pendiente = 0, favorReclamado = 0;
  MESES.forEach((mes) =>
    mes.items.forEach((it) => {
      if (it.status === "abono") return;
      if (it.status === "pagado" || it.status === "cubierto") pagado += it.valor;
      else if (it.status === "duda") duda += it.valor;
      else if (it.status === "no-pago") noPago += it.valor;
      else if (it.status === "pendiente") pendiente += it.valor;
      if (it.favor) favorReclamado += it.favor;
    })
  );
  return { pagado, duda, noPago, pendiente, favorReclamado };
}

function buildBalance() {
  const k = buildKpis();
  const creditosPagadosNoDescontados = k.pagado - CASO.totalAbonos;
  const creditosColegio = GASTOS_COLEGIO_PAGADOS.reduce((a, g) => a + g.valor, 0);
  const creditosCuidado = k.favorReclamado;
  const saldoEstimado = CASO.totalActual - creditosPagadosNoDescontados - creditosColegio - creditosCuidado;
  return { k, creditosPagadosNoDescontados, creditosColegio, creditosCuidado, saldoEstimado };
}

function buildTripleSeries() {
  const labels = [];
  const cobro = [];
  const pagos = [];
  const saldo = [];
  let runCobro = 0, runPagos = 0;

  MESES.forEach((mes) => {
    let mesCobro = 0, mesPago = 0;
    mes.items.forEach((it) => {
      const isAbono  = it.status === "abono";
      const isPagado = it.status === "pagado";
      // Cobro: todo lo que no es abono
      if (!isAbono) mesCobro += it.valor;
      // Pagos: lo que efectivamente se pagó (verde en timeline)
      const pv = isAbono                 ? Math.abs(it.valor)
               : isPagado                ? (it.pagoMostrado ?? it.valor)
               : it.pagoMostrado != null ? it.pagoMostrado
               : 0;
      mesPago += pv;
    });
    runCobro += mesCobro;
    runPagos += mesPago;
    labels.push(`${mes.month.slice(0,3)} ${String(mes.year).slice(2)}`);
    cobro.push(runCobro);
    pagos.push(runPagos);
    saldo.push(runCobro - runPagos);
  });
  return { labels, cobro, pagos, saldo };
}

const PALETTE = {
  pagado: "#e8b400",
  duda: "#c2255c",
  "no-pago": "#d62839",
  pendiente: "#6b7785",
  azul: "#1d72b8",
  navy: "#1b2a4a",
};

// ---------------------------------------------------------------- Tab switching
function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("is-active"));
      panels.forEach((p) => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add("is-active");
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    });
  });
}

// --------------------------------------------------------------------- Balance
function renderBalance() {
  const s = buildTripleSeries();
  const totalCobro = s.cobro[s.cobro.length - 1];
  const totalPago  = s.pagos[s.pagos.length - 1];
  const diferencia = totalCobro - totalPago;

  document.getElementById("balanceCards").innerHTML = `
    <div class="kpi kpi--no-pago">
      <span class="kpi__label">Cuánto pide ella (total cobrado)</span>
      <span class="kpi__value">${fmt(totalCobro)}</span>
    </div>
    <div class="kpi kpi--saldo-verde">
      <span class="kpi__label">Cuánto hemos dado (total pagos y créditos)</span>
      <span class="kpi__value">${fmt(totalPago)}</span>
    </div>
    <div class="kpi kpi--saldo">
      <span class="kpi__label">Diferencia (saldo pendiente)</span>
      <span class="kpi__value">${fmt(diferencia)}</span>
    </div>
  `;

  document.getElementById("balanceNota").innerHTML = "";

  const serie = buildTripleSeries();
  new Chart(document.getElementById("chartPrincipal"), {
    type: "line",
    data: {
      labels: serie.labels,
      datasets: [
        {
          label: "Cobro acumulado",
          data: serie.cobro,
          borderColor: "#d62839",
          backgroundColor: "rgba(214,40,57,0.08)",
          fill: false,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: "Pagos acumulados",
          data: serie.pagos,
          borderColor: "#1a7a4a",
          backgroundColor: "rgba(26,122,74,0.08)",
          fill: false,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: "Saldo pendiente",
          data: serie.saldo,
          borderColor: "#1d72b8",
          backgroundColor: "rgba(29,114,184,0.10)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          borderDash: [5, 3],
        },
      ],
    },
    options: {
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } },
      },
      scales: { y: { ticks: { callback: (v) => fmt(v) } } },
    },
  });
}

// --------------------------------------------------------------- Línea tiempo
function renderConceptosInfo() {
  document.getElementById("conceptosInfo").innerHTML = CONCEPTOS_INFO.map(
    (c) => `<div class="info-card"><h4>${c.titulo}</h4><p>${c.texto}</p></div>`
  ).join("");
}

// Tabla resumen mensual: columnas fijas — Acuerdo deuda | Cuota alimentos | Extras | Muda ropa | Abono | Total | Acumulado
function mesPayVal(it) {
  const isAbono  = it.status === "abono";
  const isPagado = it.status === "pagado";
  if (isAbono)                 return Math.abs(it.valor);
  if (isPagado)                return it.pagoMostrado ?? it.valor;
  if (it.pagoMostrado != null) return it.pagoMostrado;
  return 0;
}

function renderSummaryTable() {
  // Acumulados en orden cronológico
  let runCobro = 0, runPago = 0;
  const acumData = MESES.map((mes) => {
    let mesCobro = 0, mesPago = 0;
    mes.items.forEach((it) => {
      if (it.status !== "abono") mesCobro += it.valor;
      mesPago += mesPayVal(it);
    });
    runCobro += mesCobro;
    runPago  += mesPago;
    return { mesCobro, mesPago, runCobro, runPago };
  });

  const mesesRev = [...MESES].reverse();
  const acumRev  = [...acumData].reverse();

  const cell  = (v) => v ? `<td class="sum-td">${fmt(v)}</td>` : `<td class="sum-td sum-td--empty">—</td>`;
  const pCell = (v) => v ? `<td class="sum-td sum-td--pago">${fmt(v)}</td>` : `<td class="sum-td sum-td--empty">—</td>`;

  const rowsHtml = mesesRev.map((mes, i) => {
    const { mesCobro, mesPago, runCobro, runPago } = acumRev[i];
    const saldo = runCobro - runPago;
    return `
      <tr>
        <td class="sum-td sum-td--mes">${mes.claveMes || mes.month} ${mes.year}</td>
        <td class="sum-td sum-td--total">${fmt(mesCobro)}</td>
        ${pCell(mesPago)}
        <td class="sum-td sum-td--acum">${fmt(saldo)}</td>
      </tr>
    `;
  }).join("");

  const lastAcum = acumData[acumData.length - 1];

  document.getElementById("summaryTable").innerHTML = `
    <div class="table-wrap">
      <table class="sum-table">
        <thead>
          <tr>
            <th>Mes</th>
            <th>Cobro Carolina</th>
            <th class="sum-th--pago">Pago Juan</th>
            <th>Saldo</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr>
            <td class="sum-td sum-td--mes">TOTAL</td>
            <td class="sum-td sum-td--total sum-td--foot">${fmt(lastAcum.runCobro)}</td>
            <td class="sum-td sum-td--pago sum-td--foot">${fmt(lastAcum.runPago)}</td>
            <td class="sum-td sum-td--acum sum-td--foot">${fmt(lastAcum.runCobro - lastAcum.runPago)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function renderCareChart() {
  const cat = buildCategorySeries();
  new Chart(document.getElementById("chartCategoria"), {
    type: "doughnut",
    data: {
      labels: cat.labels,
      datasets: [{ data: cat.data, backgroundColor: ["#1b2a4a", "#e8b400", "#c2255c", "#1d72b8", "#6b7785"] }],
    },
    options: {
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmt(ctx.raw)}` } },
      },
    },
  });

  const care = buildCareDaysSeries();
  new Chart(document.getElementById("chartCuidado"), {
    type: "bar",
    data: {
      labels: care.labels,
      datasets: [
        { label: "Días con el padre", data: care.papa, backgroundColor: PALETTE.navy },
        { label: "Días con la madre", data: care.mama, backgroundColor: PALETTE.azul },
      ],
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true, title: { display: true, text: "Días" } } },
    },
  });
}

function evidenceCardHtml(id) {
  const ev = EVIDENCIA.find((e) => e.id === id);
  if (!ev) return "";
  return `
    <button class="evid-thumb" data-evid="${ev.id}" title="${ev.titulo}">
      <img src="${ev.archivo}" alt="${ev.titulo}" loading="lazy" />
    </button>
  `;
}

function renderTimeline() {
  const el = document.getElementById("timeline");
  el.innerHTML = [...MESES].reverse().map((mes) => {
    let totalCobro = 0, totalPago = 0;

    const itemsHtml = mes.items.map((it) => {
      const isAbono  = it.status === "abono";
      const isPagado = it.status === "pagado";

      const cobroVal = isAbono ? null : it.valor;
      const pagoVal  = isAbono                  ? Math.abs(it.valor)
                     : isPagado                 ? (it.pagoMostrado ?? it.valor)
                     : it.pagoMostrado != null  ? it.pagoMostrado
                     : null;

      if (cobroVal != null) totalCobro += cobroVal;
      if (pagoVal  != null) totalPago  += pagoVal;

      const cobroCell = cobroVal != null
        ? `<td class="tl-cobro">${fmt(cobroVal)}</td>`
        : `<td class="tl-empty">—</td>`;

      const pagoCell = pagoVal != null
        ? `<td class="tl-pago">${fmt(pagoVal)}${it.evidencia ? `<div class="tl-evid">${it.evidencia.map(evidenceCardHtml).join("")}</div>` : ""}</td>`
        : `<td class="tl-empty">—</td>`;

      const nota = it.nota ? `<p class="tl-nota">${it.nota}</p>` : "";

      return `
        <tr class="tl-row">
          <td class="tl-desc"><span class="tl-concepto">${it.concepto}</span>${nota}</td>
          ${cobroCell}
          ${pagoCell}
        </tr>
      `;
    }).join("");

    return `
      <article class="month-card">
        <div class="month-card__rail"><span class="month-card__dot"></span></div>
        <div class="month-card__body">
          <header class="month-card__header">
            <h3>${mes.claveMes || mes.month} ${mes.year}</h3>
          </header>
          <table class="tl-table">
            <thead>
              <tr>
                <th class="tl-th">Descripción</th>
                <th class="tl-th tl-th--cobro">Cobro</th>
                <th class="tl-th tl-th--pago">Pagos</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr class="tl-total-row">
                <td class="tl-total-label">Total del mes</td>
                <td class="tl-total-cobro">${totalCobro ? fmt(totalCobro) : "—"}</td>
                <td class="tl-total-pago">${totalPago  ? fmt(totalPago)  : "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </article>
    `;
  }).join("");
}

// ----------------------------------------------------------- Colegio y mudas
function renderColegioMudas() {
  const totalPagado = GASTOS_COLEGIO_PAGADOS.reduce((a, g) => a + g.valor, 0);
  document.getElementById("gastosColegioPagados").innerHTML = `
    <table class="table">
      <thead><tr><th>Concepto</th><th>Valor</th><th>Nota</th></tr></thead>
      <tbody>
        ${GASTOS_COLEGIO_PAGADOS.map(
          (g) => `<tr><td>${g.concepto}</td><td>${fmt(g.valor)}</td><td>${g.nota || "-"}</td></tr>`
        ).join("")}
        <tr class="table__total"><td>Total</td><td>${fmt(totalPagado)}</td><td></td></tr>
      </tbody>
    </table>
  `;

}

function renderGastosColegioPendientes() {
  const el = document.getElementById("gastosColegioPendientes");
  if (!GASTOS_COLEGIO_PENDIENTES.length) {
    el.innerHTML = emptyState(
      "Aún no se han registrado los gastos del colegio pendientes de pago por la contraparte.",
      "Esta sección está lista para recibir esa información (concepto, valor, fecha y soporte) en cuanto se entregue."
    );
    return;
  }
  el.innerHTML = `
    <table class="table">
      <thead><tr><th>Concepto</th><th>Fecha</th><th>Valor</th><th>Nota</th></tr></thead>
      <tbody>
        ${GASTOS_COLEGIO_PENDIENTES.map(
          (g) => `<tr><td>${g.concepto}</td><td>${g.fecha || "-"}</td><td>${fmt(g.valor)}</td><td>${g.nota || "-"}</td></tr>`
        ).join("")}
      </tbody>
    </table>
  `;
}

// --------------------------------------------------------- Otras categorías
function emptyState(text, hint) {
  return `
    <div class="empty-state">
      <p>${text}</p>
      <p class="empty-state__hint">${hint}</p>
    </div>
  `;
}

function renderGenericList(containerId, items, emptyText, emptyHint) {
  const el = document.getElementById(containerId);
  if (!items.length) {
    el.innerHTML = emptyState(emptyText, emptyHint);
    return;
  }
  el.innerHTML = `
    <ul class="item-list">
      ${items.map((it) => `
        <li class="item">
          <div class="item__head"><span class="item__concepto">${it.concepto}</span></div>
          ${it.fecha ? `<p class="item__nota"><strong>Fecha:</strong> ${it.fecha}</p>` : ""}
          ${it.nota ? `<p class="item__nota">${it.nota}</p>` : ""}
          ${it.evidencia ? `<div class="item__evidencia">${it.evidencia.map(evidenceCardHtml).join("")}</div>` : ""}
        </li>
      `).join("")}
    </ul>
  `;
}

// --------------------------------------------------------------- Fotografías
function renderFotos() {
  const el = document.getElementById("fotosGallery");
  if (!FOTOGRAFIAS.length) {
    el.innerHTML = emptyState(
      "Aún no hay fotografías registradas.",
      "Para agregar una foto, completa una entrada en el arreglo FOTOGRAFIAS de data.js con fecha, título, descripción y el archivo o link de Drive."
    );
    return;
  }
  const sorted = [...FOTOGRAFIAS].sort((a, b) => a.fecha.localeCompare(b.fecha));
  el.innerHTML = `<div class="foto-grid">${sorted.map((f) => {
    const src   = f.archivo || null;
    const drive = f.driveUrl || null;
    const img   = src
      ? `<img src="${src}" alt="${f.titulo}" loading="lazy" />`
      : `<div class="foto-placeholder">Sin imagen local</div>`;
    const link  = drive
      ? `<a class="btn btn--drive" href="${drive}" target="_blank" rel="noopener">Ver en Drive ↗</a>`
      : `<span class="btn btn--pending">Pendiente enlace de Drive</span>`;
    return `
      <div class="foto-card">
        <div class="foto-card__img">${img}</div>
        <div class="foto-card__body">
          <span class="foto-card__fecha">${f.fecha}</span>
          <h4 class="foto-card__titulo">${f.titulo}</h4>
          ${f.descripcion ? `<p class="foto-card__desc">${f.descripcion}</p>` : ""}
          ${link}
        </div>
      </div>
    `;
  }).join("")}</div>`;
}

// --------------------------------------------------------------- Comprobantes
function renderEvidenceGallery() {
  const el = document.getElementById("evidenceGallery");
  el.innerHTML = EVIDENCIA.map(
    (ev) => `
    <div class="evid-card">
      <button class="evid-card__thumb" data-evid="${ev.id}">
        <img src="${ev.archivo}" alt="${ev.titulo}" loading="lazy" />
      </button>
      <div class="evid-card__body">
        <h4>${ev.titulo}</h4>
        <p>${ev.relacionado}</p>
        ${
          ev.driveUrl
            ? `<a class="btn btn--drive" href="${ev.driveUrl}" target="_blank" rel="noopener">Ver en Drive ↗</a>`
            : `<span class="btn btn--pending">Pendiente enlace de Drive</span>`
        }
      </div>
    </div>
  `
  ).join("");
}

function setupLightbox() {
  const modal = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  const caption = document.getElementById("lightboxCaption");
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-evid]");
    if (btn) {
      const ev = EVIDENCIA.find((x) => x.id === btn.dataset.evid);
      if (!ev) return;
      img.src = ev.archivo;
      caption.textContent = ev.titulo;
      modal.classList.add("is-open");
    }
    if (e.target.closest("[data-close-lightbox]") || e.target === modal) {
      modal.classList.remove("is-open");
    }
  });
}

function renderHeader() {
  document.getElementById("caseSubtitle").textContent =
    `${CASO.cliente} — Defensa frente a reclamación de cuota de alimentos del menor ${CASO.menor} (contraparte: ${CASO.contraparte}). Corte: ${CASO.corte}.`;
}

setupTabs();
renderBalance();
renderSummaryTable();
renderTimeline();
renderColegioMudas();
renderGastosColegioPendientes();
renderGenericList("negacionEstudio", NEGACION_ESTUDIO,
  "Aún no se han registrado soportes de negación del derecho al estudio.",
  "Sección lista para recibir las evidencias de que la contraparte no está llevando al menor al colegio.");
renderGenericList("violenciaList", VIOLENCIA,
  `Aún no se han registrado soportes de insultos de la contraparte hacia la ${CASO.pareja}.`,
  "Sección lista para recibir capturas de chat, audios o testimonios.");
renderGenericList("amenazasList", AMENAZAS,
  "Aún no se han registrado soportes de amenazas de la contraparte hacia el cliente.",
  "Sección lista para recibir capturas de chat, audios o testimonios.");
renderFotos();
renderEvidenceGallery();
setupLightbox();
