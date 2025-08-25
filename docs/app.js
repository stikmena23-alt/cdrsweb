/* CDRS Analyzer - HTML/JS - streaming CSV + XLSX (worker) - v2.1.0 (advanced filters, col-move, UX) */
"use strict";

const APP_NAME = "CDRS Analyzer Pro";
const APP_VERSION = "v1.0.0";

const OPERATORS = ['claro','movistar','tigo','wom'];
const STATE = {
  summary: {
    processedFiles: 0,
    rows: 0,
    byOperator: { claro:0, movistar:0, tigo:0, wom:0 },
    duplicates: 0,
    lastExportAt: null,
  },
  tabs:{} // per operator
};

// --- Loader ---
window.addEventListener('load', () => {
  const loader = document.getElementById('app-loader');
  setTimeout(()=> loader && loader.classList.add('hidden'), 600);
  // Versión visual y título
  const pill = document.getElementById('app-version');
  if (pill) { pill.textContent = `${APP_NAME} · ${APP_VERSION}`; pill.classList.remove('hidden'); }
  document.title = `${APP_NAME} · ${APP_VERSION}`;
  const y = document.getElementById('year-copy'); if (y) y.textContent = new Date().getFullYear();
});

// --- Build operator tabs dynamically ---
const tabsContainer = document.getElementById('tabs-container');

function operatorPanel(op){
  const title = op[0].toUpperCase()+op.slice(1);
  return `
  <div id="tab-${op}" class="tab-panel">
    <div class="grid gap-4 lg:grid-cols-3">
      <div class="card lg:col-span-2">
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex-1 min-w-[220px]">
            <label class="block text-sm text-slate-300 mb-1">Archivo Excel o CSV</label>
            <div class="dropzone p-3">
              <input type="file" id="${op}-file" accept=".xlsx,.xls,.csv" class="w-full input">
            </div>
          </div>
          <button id="${op}-process" class="btn-primary">Procesar</button>
          <button id="${op}-clear" class="btn-secondary">Limpiar</button>
          <button id="${op}-export-xlsx" class="btn-secondary">Exportar XLSX</button>
          <button id="${op}-export-csv" class="btn-secondary">Exportar CSV</button>
          <button id="${op}-howto" class="btn-secondary" title="Cómo usar filtros">¿Cómo usar?</button>
        </div>

        <!-- Column mapping -->
        <div class="grid gap-3 md:grid-cols-3 mt-4">
          <div><label class="block text-xs text-slate-400 mb-1">Columna Número</label><select id="${op}-col-num" class="w-full"></select></div>
          <div><label class="block text-xs text-slate-400 mb-1">Columna Fecha</label><select id="${op}-col-date" class="w-full"></select></div>
          <div><label class="block text-xs text-slate-400 mb-1">Columna Tipo (opcional)</label><select id="${op}-col-type" class="w-full"></select></div>
        </div>

        <!-- Filters (básicos + avanzados) -->
        <div class="grid gap-3 md:grid-cols-5 mt-4">
          <div class="md:col-span-2">
            <label class="block text-xs text-slate-400 mb-1">Buscar número</label>
            <div class="flex gap-2">
              <select id="${op}-num-mode" class="w-36">
                <option value="contains">Contiene</option>
                <option value="starts">Empieza</option>
                <option value="ends">Termina</option>
                <option value="equals">Igual</option>
                <option value="regex">RegEx</option>
              </select>
              <input id="${op}-filter-number" class="input w-full" placeholder="Ej: 300 | 57 | ^57\\d+$">
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Desde</label>
            <input id="${op}-filter-from" type="date" class="input w-full">
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Hasta</label>
            <input id="${op}-filter-to" type="date" class="input w-full">
          </div>
          <div class="flex items-center gap-2 pt-6">
            <input id="${op}-dedupe" type="checkbox" class="h-4 w-4">
            <label for="${op}-dedupe" class="text-sm text-slate-300">Deduplicar números</label>
          </div>
        </div>

        <!-- Filtros adicionales -->
        <div class="grid-adv mt-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1">Excluir número (RegEx)</label>
            <input id="${op}-filter-number-not" class="input w-full" placeholder="Ej: ^(57)?0+">
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Longitud número (min)</label>
            <input id="${op}-num-len-min" type="number" min="0" class="input w-full" placeholder="Ej: 7">
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Longitud número (max)</label>
            <input id="${op}-num-len-max" type="number" min="0" class="input w-full" placeholder="Ej: 12">
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Tipo (contiene)</label>
            <input id="${op}-type-contains" class="input w-full" placeholder="voz / datos / sms ...">
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Hora desde</label>
            <input id="${op}-time-from" type="time" class="input w-full">
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Hora hasta</label>
            <input id="${op}-time-to" type="time" class="input w-full">
          </div>
        </div>

        <div class="grid-adv mt-3">
          <div>
            <label class="block text-xs text-slate-400 mb-1">Tipo (igual a)</label>
            <input id="${op}-type-eq" class="input w-full" placeholder="voz / datos / sms / claro ...">
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Ordenar por</label>
            <div class="flex gap-2">
              <select id="${op}-sort-by" class="w-full">
                <option value="none">—</option>
                <option value="number">Número</option>
                <option value="date">Fecha</option>
                <option value="type">Tipo</option>
              </select>
              <select id="${op}-sort-order" class="w-28">
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
            </div>
          </div>

          <!-- Mover fila -->
          <div>
            <label class="block text-xs text-slate-400 mb-1">Mover fila A → B</label>
            <div class="flex gap-2">
              <input id="${op}-move-from" type="number" min="1" class="input w-full" placeholder="A (#)">
              <input id="${op}-move-to" type="number" min="1" class="input w-full" placeholder="B (#)">
            </div>
          </div>

          <!-- Mover columna -->
          <div>
            <label class="block text-xs text-slate-400 mb-1">Mover columna A → B</label>
            <div class="flex gap-2">
              <select id="${op}-col-move-from" class="w-full"></select>
              <select id="${op}-col-move-to" class="w-full"></select>
            </div>
            <button id="${op}-apply-col-move" class="btn-secondary mt-2 w-full">Mover columna</button>
          </div>

          <div class="flex items-center gap-2 pt-6">
            <input id="${op}-normalize-date" type="checkbox" class="h-4 w-4">
            <label class="text-sm text-slate-300">Normalizar fecha (YYYY-MM-DD)</label>
          </div>
          <div class="flex items-center gap-2 pt-6">
            <input id="${op}-split-datetime" type="checkbox" class="h-4 w-4">
            <label class="text-sm text-slate-300">Separar fecha y hora</label>
          </div>

          <div class="flex gap-2 pt-5">
            <button id="${op}-apply-sort" class="btn-secondary w-full">Aplicar orden</button>
            <button id="${op}-apply-move" class="btn-secondary w-full">Mover fila</button>
          </div>
        </div>

        <div class="mt-3 flex gap-2">
          <button id="${op}-clear-filters" class="btn-secondary">Limpiar filtros</button>
          <span class="text-xs text-slate-400 self-center">* Para aplicar nuevos filtros, vuelve a “Procesar”.</span>
        </div>

        <!-- Progress -->
        <div class="mt-5">
          <div class="flex items-center justify-between text-sm mb-2">
            <div class="text-slate-300">Progreso</div>
            <div id="${op}-progress-label" class="text-slate-400">0%</div>
          </div>
          <div class="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div id="${op}-progress" class="h-full w-0 bg-gradient-to-r from-brand-500 to-brand-700 transition-all"></div>
          </div>
          <div id="${op}-log" class="mt-3 text-xs text-slate-400 h-20 overflow-auto border border-brand-800/30 rounded p-2 bg-cave-800/40"></div>
        </div>
      </div>

      <div class="card">
        <div class="text-sm text-slate-300 mb-2">Organización de datos</div>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="badge"><span class="h-2 w-2 rounded-full bg-emerald-400"></span> Leídas <b id="${op}-stats-read" class="ml-1">0</b></div>
          <div class="badge"><span class="h-2 w-2 rounded-full bg-sky-400"></span> Válidas <b id="${op}-stats-valid" class="ml-1">0</b></div>
          <div class="badge"><span class="h-2 w-2 rounded-full bg-fuchsia-400"></span> Duplicados <b id="${op}-stats-dup" class="ml-1">0</b></div>
          <div class="badge"><span class="h-2 w-2 rounded-full bg-amber-400"></span> Coincidencias <b id="${op}-stats-match" class="ml-1">0</b></div>
        </div>
        <div class="mt-4 text-xs text-slate-400 space-y-1">
          <div>Tiempo: <span id="${op}-stats-time">00:00</span></div>
          <div>Velocidad: <span id="${op}-stats-speed">0</span> filas/s</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold">Vista previa (máx. 500 filas)</h3>
        <div class="text-xs text-slate-400">Cabecera detectada: <span id="${op}-header"></span></div>
      </div>
      <div class="table-wrap preview-max-h">
        <table>
          <thead id="${op}-thead"></thead>
          <tbody id="${op}-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>`;
}

tabsContainer.innerHTML = OPERATORS.map(operatorPanel).join('');

// --- Tab switching ---
function switchTab(id){
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  const panel = document.getElementById(`tab-${id}`);
  if(panel){ panel.classList.add('active'); }
  document.querySelectorAll(`[data-tab="${id}"]`).forEach(el => el.classList.add('active'));
  const tt = document.getElementById('tab-title');
  if(tt && id) tt.textContent = id[0].toUpperCase()+id.slice(1);
}
switchTab('dashboard');

// Sidebar hide/show (desktop) + persist (usa md:flex ↔ md:hidden)
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');

function setSidebarCollapsed(collapsed){
  if(!sidebar) return;
  if (collapsed) {
    sidebar.classList.remove('md:flex');
    sidebar.classList.add('md:hidden');
  } else {
    sidebar.classList.remove('md:hidden');
    sidebar.classList.add('md:flex');
  }
  localStorage.setItem('cdrs_sidebar_collapsed', collapsed ? '1':'0');

  if (toggleSidebarBtn) toggleSidebarBtn.textContent = collapsed ? '☰' : '⟷';
}

if (toggleSidebarBtn) {
  toggleSidebarBtn.addEventListener('click', ()=> {
    const isCollapsed = sidebar?.classList.contains('md:hidden');
    setSidebarCollapsed(!isCollapsed);
  });
}
// init persisted
if(localStorage.getItem('cdrs_sidebar_collapsed') === '1') setSidebarCollapsed(true);
else setSidebarCollapsed(false);

// Drawer (mobile)
const drawer = document.getElementById('drawer');
function openDrawer(){ drawer && drawer.classList.remove('hidden'); }
function closeDrawer(){ drawer && drawer.classList.add('hidden'); }
const openDrawerBtn = document.getElementById('open-drawer');
const closeDrawerBtn = document.getElementById('close-drawer');
if (openDrawerBtn) openDrawerBtn.addEventListener('click', openDrawer);
if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
if (drawer) drawer.addEventListener('click', (e)=>{ if(e.target === drawer) closeDrawer(); });

// Side nav click
const sideNav = document.getElementById('side-nav');
if (sideNav) {
  sideNav.addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if(btn){
      const id = btn.dataset.tab;
      switchTab(id);
    }
  });
}
const drawerNav = document.getElementById('drawer-nav');
if (drawerNav) {
  drawerNav.addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if(btn){
      const id = btn.dataset.tab;
      switchTab(id);
      closeDrawer();
    }
  });
}

// --- Modal helpers ---
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
function openModal(title, html){
  if(!modal) return;
  modalTitle.textContent = title || 'Información';
  modalBody.innerHTML = html || '';
  modal.classList.remove('hidden');
}
function closeModal(){ if(modal) modal.classList.add('hidden'); }
if (modalClose) modalClose.addEventListener('click', closeModal);
if (modal) modal.addEventListener('click', (e)=> { if(e.target === modal) closeModal(); });

// --- Per-operator state/init ---
OPERATORS.forEach(op => {
  STATE.tabs[op] = {
    file: null,
    header: [],
    map: { num:null, date:null, type:null },
    reading: false,
    startTime: 0,
    read: 0,
    valid: 0,
    dup: 0,
    match: 0,
    preview: [], // up to 500
    seen: new Set(), // for dedupe
    matches: [], // filtered rows (cap to avoid OOM)
  };

  const fileEl = document.getElementById(`${op}-file`);
  const processBtn = document.getElementById(`${op}-process`);
  const clearBtn = document.getElementById(`${op}-clear`);
  const exportXlsxBtn = document.getElementById(`${op}-export-xlsx`);
  const exportCsvBtn = document.getElementById(`${op}-export-csv`);
  const applySortBtn = document.getElementById(`${op}-apply-sort`);
  const applyMoveBtn = document.getElementById(`${op}-apply-move`);
  const clearFiltersBtn = document.getElementById(`${op}-clear-filters`);
  const splitDtEl = document.getElementById(`${op}-split-datetime`);
  const normDateEl = document.getElementById(`${op}-normalize-date`);
  const applyColMoveBtn = document.getElementById(`${op}-apply-col-move`);
  const howtoBtn = document.getElementById(`${op}-howto`);

  if (fileEl) {
    fileEl.addEventListener('change', (e)=> {
      STATE.tabs[op].file = e.target.files[0] || null;
      if(STATE.tabs[op].file){
        log(op, `Archivo seleccionado: <b>${STATE.tabs[op].file.name}</b> (${(STATE.tabs[op].file.size/1024/1024).toFixed(1)} MB)`);
        if(/\.(xlsx|xls)$/i.test(STATE.tabs[op].file.name) && STATE.tabs[op].file.size > 50*1024*1024){
          log(op, `<span class='text-amber-300'>Sugerencia:</span> Para >50MB, convierta a CSV para mejor rendimiento.`);
        }
        readHeader(op, STATE.tabs[op].file);
      }
    });
  }

  if (processBtn) processBtn.addEventListener('click', ()=> startProcess(op));
  if (clearBtn) clearBtn.addEventListener('click', ()=> resetTab(op));
  if (exportXlsxBtn) exportXlsxBtn.addEventListener('click', ()=> exportResults(op, 'xlsx'));
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', ()=> exportResults(op, 'csv'));
  if (applySortBtn) applySortBtn.addEventListener('click', ()=> { applySort(op); });
  if (applyMoveBtn) applyMoveBtn.addEventListener('click', ()=> { applyMove(op); });
  if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', ()=> { clearFilters(op); });
  if (splitDtEl) splitDtEl.addEventListener('change', ()=> renderPreview(op));
  if (normDateEl) normDateEl.addEventListener('change', ()=> renderPreview(op));
  if (applyColMoveBtn) applyColMoveBtn.addEventListener('click', ()=> { applyColMove(op); });
  if (howtoBtn) howtoBtn.addEventListener('click', ()=> openModal(
    `Cómo usar filtros · ${op[0].toUpperCase()+op.slice(1)}`,
    getHowToHtml()
  ));
});

// --- Helpers for UI ---
function log(op, html){
  const el = document.getElementById(`${op}-log`);
  if(!el) return;
  el.insertAdjacentHTML('beforeend', `<div class="mb-1">${html}</div>`);
  el.scrollTop = el.scrollHeight;
}
function setProgress(op, pct){
  const bar = document.getElementById(`${op}-progress`);
  const lbl = document.getElementById(`${op}-progress-label`);
  if(bar) bar.style.width = pct + '%';
  if(lbl) lbl.textContent = pct.toFixed(0) + '%';
}
function pad(n){ return n.toString().padStart(2,'0'); }
function elapsed(ms){ const s = Math.floor(ms/1000); return pad(Math.floor(s/60))+':'+pad(s%60); }
function updateStats(op){
  const st = STATE.tabs[op];
  const now = st.reading ? Date.now() - st.startTime : 0;
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set(`${op}-stats-read`, st.read.toLocaleString());
  set(`${op}-stats-valid`, st.valid.toLocaleString());
  set(`${op}-stats-dup`, st.dup.toLocaleString());
  set(`${op}-stats-match`, st.match.toLocaleString());
  set(`${op}-stats-time`, elapsed(now));
  const speed = now ? (st.read / (now/1000)) : 0;
  set(`${op}-stats-speed`, speed.toFixed(0));
}
function clearFilters(op){
  const ids = [
    `${op}-num-mode`,`${op}-filter-number`,`${op}-filter-from`,`${op}-filter-to`,
    `${op}-type-eq`,`${op}-dedupe`,`${op}-filter-number-not`,
    `${op}-num-len-min`,`${op}-num-len-max`,
    `${op}-type-contains`,`${op}-time-from`,`${op}-time-to`
  ];
  ids.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(el.tagName === 'SELECT') el.selectedIndex = 0;
    else if(el.type === 'checkbox') el.checked = false;
    else el.value = '';
  });
  log(op,'Filtros limpiados. Vuelve a <b>Procesar</b> para aplicar.');
}

// --- Header detection ---
async function readHeader(op, file){
  const ext = file.name.split('.').pop().toLowerCase();
  if(ext === 'csv'){
    await new Promise((resolve)=> {
      Papa.parse(file, {
        preview: 1,
        skipEmptyLines: true,
        complete: (res)=>{
          const header = res.data && res.data[0] ? res.data[0] : [];
          STATE.tabs[op].header = header;
          fillHeaderUI(op);
          resolve();
        }
      });
    });
  }else{
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, {type:'array', cellDates:true});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const ref = ws['!ref'];
    const header = [];
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      for(let C=range.s.c; C<=range.e.c; ++C){
        const cell = ws[XLSX.utils.encode_cell({r:range.s.r, c:C})];
        header.push(cell ? String(cell.v).trim() : `Col ${C+1}`);
      }
    }
    STATE.tabs[op].header = header;
    fillHeaderUI(op);
  }
}

function fillHeaderUI(op){
  const header = STATE.tabs[op].header || [];
  ['num','date','type'].forEach(key => {
    const sel = document.getElementById(`${op}-col-${key}`);
    if(!sel) return;
    sel.innerHTML = header.map((h,i)=> `<option value="${i}">${h || 'Col '+(i+1)}</option>`).join('');
  });
  // selects para mover columnas
  const selFrom = document.getElementById(`${op}-col-move-from`);
  const selTo = document.getElementById(`${op}-col-move-to`);
  if (selFrom && selTo){
    const opts = header.map((h,i)=> `<option value="${i}">${h || ('Col '+(i+1))} (${i+1})</option>`).join('');
    selFrom.innerHTML = opts;
    selTo.innerHTML = opts;
  }

  const lower = header.map(h => (h||'').toString().toLowerCase());
  const map = STATE.tabs[op].map;
  const findOrZero = (re) => {
    const idx = lower.findIndex(h => re.test(h));
    return idx >= 0 ? idx : 0;
  };
  map.num  = findOrZero(/(numero|número|msisdn|phone|celular)/);
  map.date = findOrZero(/(fecha|date|timestamp|hora)/);
  map.type = findOrZero(/(tipo|type|event|operadora|carrier|operator)/);

  const setVal = (id, v) => { const el = document.getElementById(id); if(el) el.value = String(v); };
  setVal(`${op}-col-num`, map.num);
  setVal(`${op}-col-date`, map.date);
  setVal(`${op}-col-type`, map.type);

  const hdrEl = document.getElementById(`${op}-header`);
  if(hdrEl) hdrEl.textContent = header.join(' | ');
}

// --- Processing ---
async function startProcess(op){
  const st = STATE.tabs[op];
  if(!st.file){ alert('Primero seleccione un archivo.'); return; }
  // Reset
  st.reading = true; st.startTime = Date.now();
  st.read = st.valid = st.dup = st.match = 0;
  st.preview = []; st.seen.clear(); st.matches = [];
  setProgress(op, 0); updateStats(op);
  log(op, 'Iniciando procesamiento...');

  // Read mapping + filters
  st.map.num = parseInt(document.getElementById(`${op}-col-num`).value,10);
  st.map.date = parseInt(document.getElementById(`${op}-col-date`).value,10);
  st.map.type = parseInt(document.getElementById(`${op}-col-type`).value,10);

  const numMode = document.getElementById(`${op}-num-mode`).value;
  const fContains = (document.getElementById(`${op}-filter-number`).value || '').trim();
  const fNot = (document.getElementById(`${op}-filter-number-not`).value || '').trim();
  const lenMin = parseInt(document.getElementById(`${op}-num-len-min`).value || '0', 10);
  const lenMax = parseInt(document.getElementById(`${op}-num-len-max`).value || '0', 10);
  const fFrom = document.getElementById(`${op}-filter-from`).value;
  const fTo = document.getElementById(`${op}-filter-to`).value;
  const tContains = (document.getElementById(`${op}-type-contains`).value || '').trim().toLowerCase();
  const typeEq = (document.getElementById(`${op}-type-eq`).value || '').trim().toLowerCase();
  const timeFrom = document.getElementById(`${op}-time-from`).value; // "HH:MM"
  const timeTo = document.getElementById(`${op}-time-to`).value;     // "HH:MM"
  const dedupe = document.getElementById(`${op}-dedupe`).checked;

  const filters = { numMode, fContains, fNot, lenMin, lenMax, fFrom, fTo, tContains, typeEq, timeFrom, timeTo, dedupe };

  const name = st.file.name.toLowerCase();
  if(name.endsWith('.csv')){
    await processCSV(op, st.file, filters);
  }else{
    await processXLSX(op, st.file, filters);
  }
  st.reading = false;
  setProgress(op, 100); updateStats(op);
  log(op, '<span class="text-emerald-300">Completado.</span>');
  STATE.summary.processedFiles += 1;

  // aplicar orden si está configurado
  applySort(op);
}

function passFilters(row, map, filters, operatorName){
  const num = (row?.[map.num] ?? '').toString();
  const dateRaw = row?.[map.date];
  const typeCell = (row?.[map.type] ?? '').toString().toLowerCase();
  let passes = true;

  // Si hay columna de operadora y coincide, filtra por la pestaña
  const maybeOpIdx = (Number.isInteger(map.type) && map.type >= 0 && map.type < row.length) ? map.type : -1;
  if(maybeOpIdx >= 0){
    const cellOp = String(row[maybeOpIdx] ?? '').toLowerCase();
    if(['claro','movistar','tigo','wom'].includes(cellOp)){
      passes = passes && (cellOp === operatorName);
    }
  }

  // Filtro por número (modo)
  if(filters.fContains){
    const val = filters.fContains;
    if(filters.numMode === 'contains') passes = passes && num.includes(val);
    else if(filters.numMode === 'starts') passes = passes && num.startsWith(val);
    else if(filters.numMode === 'ends') passes = passes && num.endsWith(val);
    else if(filters.numMode === 'equals') passes = passes && num === val;
    else if(filters.numMode === 'regex'){
      try{
        const re = new RegExp(val);
        passes = passes && re.test(num);
      }catch{ /* regex inválido, ignora */ }
    }
  }

  // Excluir por RegEx
  if(filters.fNot){
    try{
      const reN = new RegExp(filters.fNot);
      if(reN.test(num)) passes = false;
    }catch{}
  }

  // Longitud
  if(filters.lenMin && num.length < filters.lenMin) passes = false;
  if(filters.lenMax && filters.lenMax > 0 && num.length > filters.lenMax) passes = false;

  // Tipo contiene / igual
  if(filters.tContains){
    passes = passes && typeCell.includes(filters.tContains);
  }
  if(filters.typeEq){
    passes = passes && typeCell === filters.typeEq;
  }

  // Rango de fechas
  let d = null;
  if(filters.fFrom || filters.fTo || filters.timeFrom || filters.timeTo){
    d = parseDate(dateRaw);
  }
  if(filters.fFrom && d) passes = passes && d >= new Date(filters.fFrom+'T00:00:00');
  if(filters.fTo && d)   passes = passes && d <= new Date(filters.fTo+'T23:59:59');

  // Rango de horas (si hay fecha válida)
  if(d && (filters.timeFrom || filters.timeTo)){
    const hhmm = (x)=> {
      if(!x) return null;
      const [h,m] = x.split(':').map(n=>parseInt(n,10));
      return h*60 + (m||0);
    };
    const minutes = d.getHours()*60 + d.getMinutes();
    const fromM = hhmm(filters.timeFrom);
    const toM = hhmm(filters.timeTo);
    if(fromM !== null && minutes < fromM) passes = false;
    if(toM !== null && minutes > toM) passes = false;
  }

  return passes;
}

function parseDate(v){
  if(v == null) return null;
  if(v instanceof Date && !isNaN(v)) return v;
  const s = String(v);

  // DD/MM/YYYY (o -, .) con o sin hora
  if(/^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/.test(s)){
    const normalized = s.replace(
      /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/,
      (m,d,mn,y)=> `${y.length===2 ? '20'+y : y}-${String(mn).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    );
    const d = new Date(normalized);
    if(!isNaN(d)) return d;
  }

  // Excel serial date
  const asNum = Number(v);
  if(!isNaN(asNum) && asNum > 20000 && asNum < 90000){
    const epoch = new Date(Date.UTC(1899,11,30));
    return new Date(epoch.getTime() + asNum * 86400000);
  }

  // ISO u otros
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function formatDate(d, normalize){
  if(!(d instanceof Date) || isNaN(d)) return '';
  if(normalize){
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}
function formatTime(d){
  if(!(d instanceof Date) || isNaN(d)) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function processCSV(op, file, filters){
  const st = STATE.tabs[op];
  const totalSize = file.size;
  let processedBytes = 0;
  const operatorName = op;

  return new Promise((resolve, reject)=> {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      worker: true,
      chunkSize: 1024 * 1024,
      chunk: (results)=>{
        const rows = results.data;
        for(const row of rows){
          st.read++;
          if(st.read === 1 && st.header.length && row.join('|') === st.header.join('|')) continue;

          const num = (row[st.map.num] ?? '').toString();
          if(!num) continue;
          st.valid++;

          const isDup = st.seen.has(num);
          if(isDup) st.dup++;
          if(filters.dedupe && isDup) continue;
          st.seen.add(num);

          if(passFilters(row, st.map, filters, operatorName)){
            st.match++;
            if(st.preview.length < 500) st.preview.push(row);
            if(st.matches.length < 250000) st.matches.push(row);
          }
        }

        processedBytes += (results?.meta?.cursor ?? rows.join('\n').length);
        const pct = totalSize ? Math.min(99, (processedBytes / totalSize) * 100) : 0;
        setProgress(op, pct);
        if(st.read % 5000 === 0) updateStats(op);
      },
      complete: ()=>{
        updateStats(op);
        renderPreview(op);
        resolve();
      },
      error: (err)=>{
        log(op, '<span class="text-rose-300">Error CSV:</span> '+err.message);
        reject(err);
      }
    });
  });
}

async function processXLSX(op, file, filters){
  const st = STATE.tabs[op];
  const operatorName = op;
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, {type:'array', cellDates:true});
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:true});
  const totalRows = Math.max(0, aoa.length - 1);

  for(let i=1;i<aoa.length;i++){
    const row = aoa[i];
    st.read++;
    const num = (row[st.map.num] ?? '').toString();
    if(!num) continue;
    st.valid++;
    const isDup = st.seen.has(num);
    if(isDup) st.dup++;
    if(filters.dedupe && isDup) continue;
    st.seen.add(num);

    if(passFilters(row, st.map, filters, operatorName)){
      st.match++;
      if(st.preview.length < 500) st.preview.push(row);
      if(st.matches.length < 250000) st.matches.push(row);
    }
    if(i % 2000 === 0){
      const done = i - 1;
      const pct = totalRows ? Math.min(99, (done / totalRows) * 100) : 0;
      setProgress(op, pct);
      updateStats(op);
      await new Promise(r=> setTimeout(r, 0));
    }
  }
  renderPreview(op);
}

// --- Sorting / Moving ---
function applySort(op){
  const st = STATE.tabs[op];
  const by = document.getElementById(`${op}-sort-by`)?.value || 'none';
  const order = document.getElementById(`${op}-sort-order`)?.value || 'asc';
  if(by === 'none' || st.matches.length === 0){ renderPreview(op); return; }

  const idxNum = st.map.num, idxDate = st.map.date, idxType = st.map.type;
  const dir = order === 'desc' ? -1 : 1;
  const asNumberDigits = (s)=> Number((s||'').toString().replace(/\D+/g,'') || '0');

  const cmp = (a,b)=>{
    if(by === 'number'){
      const va = asNumberDigits(a[idxNum]); const vb = asNumberDigits(b[idxNum]);
      return (va>vb?1:va<vb?-1:0)*dir;
    }else if(by === 'date'){
      const da = parseDate(a[idxDate]) || new Date(0);
      const db = parseDate(b[idxDate]) || new Date(0);
      return (da>db?1:da<db?-1:0)*dir;
    }else{ // type / default str
      const sa = String(a[idxType] ?? '').toLowerCase();
      const sb = String(b[idxType] ?? '').toLowerCase();
      return (sa>sb?1:sa<sb?-1:0)*dir;
    }
  };

  st.matches.sort(cmp);
  st.preview = st.matches.slice(0, 500);
  renderPreview(op);
}

function applyMove(op){
  const st = STATE.tabs[op];
  const fromEl = document.getElementById(`${op}-move-from`);
  const toEl = document.getElementById(`${op}-move-to`);
  const from = Math.max(1, parseInt(fromEl?.value||'0',10));
  const to = Math.max(1, parseInt(toEl?.value||'0',10));
  if(!st.matches.length || isNaN(from) || isNaN(to)){ return; }
  const len = st.matches.length;
  const iFrom = Math.min(len, from) - 1;
  const iTo = Math.min(len, to) - 1;
  if(iFrom === iTo) return;

  const row = st.matches.splice(iFrom, 1)[0];
  st.matches.splice(iTo, 0, row);
  st.preview = st.matches.slice(0, 500);
  renderPreview(op);
  log(op, `Fila movida de <b>${from}</b> a <b>${to}</b> en los resultados.`);
}

function applyColMove(op){
  const st = STATE.tabs[op];
  const selFrom = document.getElementById(`${op}-col-move-from`);
  const selTo = document.getElementById(`${op}-col-move-to`);
  if(!selFrom || !selTo) return;
  const from = parseInt(selFrom.value, 10);
  const to = parseInt(selTo.value, 10);
  if(isNaN(from) || isNaN(to) || from === to) return;

  const moveIdx = (arr, fromIdx, toIdx)=>{
    const item = arr.splice(fromIdx,1)[0];
    arr.splice(toIdx,0,item);
  };

  // mover header
  if (st.header.length) moveIdx(st.header, from, to);

  // mover columnas en preview y matches
  st.preview = st.preview.map(row => {
    const r = [...row];
    moveIdx(r, from, to);
    return r;
  });
  st.matches = st.matches.map(row => {
    const r = [...row];
    moveIdx(r, from, to);
    return r;
  });

  // ajustar mapeos (si índices pasan al mover)
  const adjustIndex = (idx)=>{
    if(idx === null || idx === undefined) return idx;
    if(from < to){ // se removió before, índices entre (from,to] bajan 1, from pasa a to
      if(idx === from) return to;
      if(idx > from && idx <= to) return idx - 1;
      return idx;
    }else{ // from > to: índices en [to,from) suben 1
      if(idx === from) return to;
      if(idx >= to && idx < from) return idx + 1;
      return idx;
    }
  };
  st.map.num = adjustIndex(st.map.num);
  st.map.date = adjustIndex(st.map.date);
  st.map.type = adjustIndex(st.map.type);

  renderPreview(op);
  log(op, `Columna movida de posición <b>${from+1}</b> a <b>${to+1}</b>.`);
}

// --- Render (con separar fecha/hora y normalizar) ---
function renderPreview(op){
  const st = STATE.tabs[op];
  const thead = document.getElementById(`${op}-thead`);
  const tbody = document.getElementById(`${op}-tbody`);
  const split = document.getElementById(`${op}-split-datetime`)?.checked;
  const normalize = document.getElementById(`${op}-normalize-date`)?.checked;

  // Header base
  let header = st.header.length ? [...st.header] : (st.preview[0]?.map((_,i)=> 'Col '+(i+1)) || []);
  let rows = st.preview.map(r => [...r]);

  // Insertar columnas Fecha/Hora derivadas (no modifica datos originales)
  if(split && Number.isInteger(st.map.date)){
    const insertIdx = Math.min(st.map.date, header.length);
    const newHeader = [];
    header.forEach((h,i)=>{
      if(i === insertIdx){
        newHeader.push('Fecha');
        newHeader.push('Hora');
      }else{
        newHeader.push(h);
      }
    });
    header = newHeader;

    rows = rows.map(r=>{
      const d = parseDate(r[st.map.date]);
      const parts = [formatDate(d, normalize), formatTime(d)];
      const out = [];
      r.forEach((cell,i)=>{
        if(i === st.map.date){
          out.push(parts[0], parts[1]);
        }else{
          out.push(cell);
        }
      });
      return out;
    });
  }else if(Number.isInteger(st.map.date) && normalize){
    // Solo normalizar la celda fecha
    rows = rows.map(r=>{
      const d = parseDate(r[st.map.date]);
      const out = [...r];
      out[st.map.date] = formatDate(d, true);
      return out;
    });
  }

  // Render
  if (thead) thead.innerHTML = '<tr>'+ header.map(h=> `<th class="text-left">${escapeHtml(String(h||''))}</th>`).join('') + '</tr>';
  const rowsHtml = rows.map(r=> '<tr>'+ r.map(c=> `<td>${escapeHtml(String(c??''))}</td>`).join('') + '</tr>').join('');
  if (tbody) tbody.innerHTML = rowsHtml || '<tr><td class="text-slate-400 p-3">Sin datos para mostrar.</td></tr>';

  const hdrEl = document.getElementById(`${op}-header`);
  if(hdrEl) hdrEl.textContent = (st.header||[]).join(' | ');
}

function escapeHtml(s){
  return s.replace(/[&<>"]/g, ch => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;"
  }[ch]));
}

// --- Export ---
function getExportData(op){
  const st = STATE.tabs[op];
  if(st.matches.length === 0) return { header: [], rows: [] };

  // Tomamos header base
  let header = st.header.length ? [...st.header] : (st.preview[0]?.map((_,i)=> 'Col '+(i+1)) || []);
  let rows = st.matches.map(r => [...r]);

  const split = document.getElementById(`${op}-split-datetime`)?.checked;
  const normalize = document.getElementById(`${op}-normalize-date`)?.checked;

  if(split && Number.isInteger(st.map.date)){
    const insertIdx = Math.min(st.map.date, header.length);
    const newHeader = [];
    header.forEach((h,i)=>{
      if(i === insertIdx){
        newHeader.push('Fecha');
        newHeader.push('Hora');
      }else{
        newHeader.push(h);
      }
    });
    header = newHeader;

    rows = rows.map(r=>{
      const d = parseDate(r[st.map.date]);
      const parts = [formatDate(d, normalize), formatTime(d)];
      const out = [];
      r.forEach((cell,i)=>{
        if(i === st.map.date){
          out.push(parts[0], parts[1]);
        }else{
          out.push(cell);
        }
      });
      return out;
    });
  }else if(Number.isInteger(st.map.date) && normalize){
    rows = rows.map(r=>{
      const d = parseDate(r[st.map.date]);
      const out = [...r];
      out[st.map.date] = formatDate(d, true);
      return out;
    });
  }
  return { header, rows };
}

function exportResults(op, mode){
  const st = STATE.tabs[op];
  if(st.matches.length === 0){
    alert('No hay resultados para exportar. Procese y filtre primero.');
    return;
  }
  const { header, rows } = getExportData(op);
  const data = [header, ...rows];

  if(mode === 'csv'){
    const csv = data.map(row => row.map(v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    download(url, `resultados_${op}.csv`);
  }else{
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, op.toUpperCase());
    XLSX.writeFile(wb, `resultados_${op}.xlsx`);
  }
  STATE.summary.lastExportAt = new Date().toISOString();
}

function download(url, filename){
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
}

// --- Export summary global ---
const exportSummaryBtn = document.getElementById('export-summary');
if (exportSummaryBtn) {
  exportSummaryBtn.addEventListener('click', (e)=> {
    e.preventDefault();
    const rows = [['Métrica','Valor']];
    Object.entries(STATE.summary).forEach(([k,v])=>{
      if(typeof v === 'object' && v !== null){
        rows.push(['Por operador', '']);
        Object.entries(v).forEach(([k2,v2])=> rows.push([k2, String(v2)]));
      }else{
        rows.push([k, String(v)]);
      }
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
    XLSX.writeFile(wb, 'resumen_cdrs.xlsx');
  });
}

// --- Reset ---
function resetTab(op){
  const st = STATE.tabs[op];
  st.file = null; st.header=[]; st.map={num:null,date:null,type:null};
  st.reading=false; st.read=st.valid=st.dup=st.match=0;
  st.preview=[]; st.seen.clear(); st.matches=[];
  const setHTML = (id, html) => { const el = document.getElementById(id); if(el) el.innerHTML = html; };
  const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
  const fileEl = document.getElementById(`${op}-file`);
  if (fileEl) fileEl.value = '';
  setHTML(`${op}-thead`, '');
  setHTML(`${op}-tbody`, '');
  setHTML(`${op}-log`, '');
  setText(`${op}-header`, '');
  setProgress(op, 0); updateStats(op);
}

// (Optional) small heartbeat for summary
setInterval(()=>{
  let rows = 0, dups = 0;
  for(const op of OPERATORS){
    rows += STATE.tabs[op].read;
    dups += STATE.tabs[op].dup;
    STATE.summary.byOperator[op] = STATE.tabs[op].match;
  }
  STATE.summary.rows = rows;
  STATE.summary.duplicates = dups;
}, 1000);

// --- HowTo HTML ---
function getHowToHtml(){
  return `
    <p class="mb-2">Guía rápida de los filtros y utilidades disponibles:</p>
    <ul class="space-y-1 mb-3">
      <li><b>Buscar número</b>: selecciona el modo (contiene, empieza, termina, igual o RegEx) y escribe el patrón.</li>
      <li><b>Excluir número (RegEx)</b>: cualquier número que haga match será descartado.</li>
      <li><b>Longitud número (min/max)</b>: limita por cantidad de dígitos.</li>
      <li><b>Fechas (Desde/Hasta)</b>: filtra por fecha. Acepta formatos dd/mm/yyyy, ISO y serial Excel.</li>
      <li><b>Rango de hora</b>: restringe entre Hora desde y Hora hasta (formato HH:mm).</li>
      <li><b>Tipo (contiene / igual)</b>: filtra por valores en la columna de Tipo.</li>
      <li><b>Deduplicar números</b>: elimina repetidos según columna Número.</li>
      <li><b>Ordenar por</b>: ordena por Número, Fecha o Tipo (Asc/Desc).</li>
      <li><b>Mover fila A→B</b>: reubica filas dentro de los resultados filtrados.</li>
      <li><b>Mover columna A→B</b>: reordena columnas (afecta vista previa, resultados, header y mapeo).</li>
      <li><b>Normalizar fecha</b>: muestra la fecha como YYYY-MM-DD (no altera datos originales).</li>
      <li><b>Separar fecha y hora</b>: crea dos columnas derivadas en la vista/exports.</li>
    </ul>
    <p class="mb-1"><b>Consejo:</b> para filtros nuevos, presiona <b>Procesar</b> otra vez. Usa <b>Exportar XLSX/CSV</b> para descargar los resultados.</p>
    <p class="opacity-80 text-sm">Rendimiento óptimo con CSV de gran tamaño. Para XLSX &gt; 50 MB se recomienda convertir a CSV.</p>
  `;
}
