/* Wspólne pomoce UI: sheet (dolny formularz), toast, renderowanie kalendarza, drobne helpery DOM. */
(function () {
  'use strict';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  let toastTimer = null;
  /** type: 'success' | 'error' | undefined (informacja). Kolor kropki niesie znaczenie, tekst zawsze jest czytelny. */
  function showToast(msg, type) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('toast-success', 'toast-error');
    if (type) el.classList.add(`toast-${type}`);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  const sheetBackdrop = document.getElementById('sheet-backdrop');
  const sheetTitle = document.getElementById('sheet-title');
  const sheetBody = document.getElementById('sheet-body');

  function openSheet(title, bodyHtml, onMount) {
    sheetTitle.textContent = title;
    sheetBody.innerHTML = bodyHtml;
    sheetBackdrop.classList.add('active');
    if (typeof onMount === 'function') onMount(sheetBody);
  }

  /** Przycisk w stanie ładowania na czas operacji asynchronicznej (blokuje też podwójne kliknięcie). */
  async function withLoading(btn, fn) {
    if (!btn || btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading');
    btn.disabled = true;
    try {
      return await fn();
    } finally {
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }
  }

  function closeSheet() {
    sheetBackdrop.classList.remove('active');
    sheetBody.innerHTML = '';
  }

  document.getElementById('sheet-close').addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', (e) => {
    if (e.target === sheetBackdrop) closeSheet();
  });

  function buildOptions(items, valueKey, labelKey, selectedValue) {
    return items
      .map((item) => {
        const val = item[valueKey];
        const sel = selectedValue !== undefined && String(selectedValue) === String(val) ? 'selected' : '';
        return `<option value="${escapeHtml(val)}" ${sel}>${escapeHtml(item[labelKey])}</option>`;
      })
      .join('');
  }

  const STATUS_LABEL = { wykonany: 'Wykonany', zaplanowany: 'Zaplanowany', 'pominięty': 'Pominięty' };

  /**
   * Renderuje duży kalendarz miesięczny do podanego kontenera (grid) + etykiety miesiąca.
   * onDayClick(iso, dayInfo) wywoływane po tapnięciu w dzień.
   */
  function renderCalendar(gridEl, labelEl, date, scheduledSessions, historyEntries, onDayClick) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const cal = WorkoutUtils.buildCalendarMonth(year, month, scheduledSessions, historyEntries);
    const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
    labelEl.textContent = `${monthNames[month]} ${year}`;

    const todayIso = WorkoutUtils.dateToISO(new Date());
    const weekdayLabels = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
    let html = weekdayLabels.map((w) => `<div class="calendar-weekday">${w}</div>`).join('');

    // pon=0 ... niedz=6 offset zamiast JS niedz=0
    const offset = (cal.firstWeekday + 6) % 7;
    for (let i = 0; i < offset; i++) html += `<div class="calendar-day empty"></div>`;

    cal.days.forEach((d) => {
      const statusClass = d.status ? `status-${d.status}` : '';
      const todayClass = d.date === todayIso ? 'is-today' : '';
      html += `<div class="calendar-day ${statusClass} ${todayClass}" data-date="${d.date}" role="button" tabindex="0" aria-label="${d.dayOfMonth} ${d.status ? STATUS_LABEL[d.status] : 'brak treningu'}">${d.dayOfMonth}</div>`;
    });

    gridEl.innerHTML = html;
    gridEl.querySelectorAll('.calendar-day[data-date]').forEach((el) => {
      const fire = () => {
        const iso = el.getAttribute('data-date');
        const dayInfo = cal.days.find((d) => d.date === iso);
        onDayClick(iso, dayInfo);
      };
      el.addEventListener('click', fire);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); }
      });
    });
  }

  function confirmAction(message) {
    return window.confirm(message);
  }

  // Aktualne ustawienia w pamięci (ustawiane przez Profile), żeby każdy panel znał jednostkę bez czytania bazy.
  const currentSettings = { jednostki: 'kg' };
  function setSettings(s) { Object.assign(currentSettings, s || {}); }
  function unit() { return currentSettings.jednostki === 'lb' ? 'lb' : 'kg'; }
  function unitLabel() { return WorkoutUtils.unitLabel(unit()); }
  function kgOut(kg) { return WorkoutUtils.kgToDisplay(kg, unit()); }
  function kgIn(value) { return WorkoutUtils.displayToKg(value, unit()); }

  window.UI = {
    escapeHtml,
    showToast,
    withLoading,
    openSheet,
    closeSheet,
    buildOptions,
    renderCalendar,
    confirmAction,
    setSettings,
    unit,
    unitLabel,
    kgOut,
    kgIn,
  };
})();
