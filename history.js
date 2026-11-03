/* Panel 4 — Historia: kalendarz, rekordy życiowe, log treningów z edycją/usuwaniem. */
(function () {
  'use strict';

  const state = { calDate: new Date() };

  function init() {
    document.getElementById('hist-cal-prev').addEventListener('click', () => {
      state.calDate.setMonth(state.calDate.getMonth() - 1);
      render();
    });
    document.getElementById('hist-cal-next').addEventListener('click', () => {
      state.calDate.setMonth(state.calDate.getMonth() + 1);
      render();
    });
  }

  async function render() {
    const [history, scheduled, exercises] = await Promise.all([DB.getAll('history_entries'), DB.getAll('scheduled_sessions'), DB.getAll('exercises')]);

    UI.renderCalendar(document.getElementById('hist-cal-grid'), document.getElementById('hist-cal-label'), state.calDate, scheduled, history, (iso, dayInfo) => {
      const entry = history.find((e) => e.data === iso);
      if (entry) openEntryDetail(entry, exercises);
    });

    renderPRs(history, exercises);
    renderLog(history, exercises);
  }

  function exName(exercises, id) {
    return exercises.find((e) => e.id === id)?.nazwa || 'Ćwiczenie';
  }

  /** Typ pomiaru ćwiczenia we wpisie. Nowe wpisy mają go zapisanego, starsze bierzemy z biblioteki ćwiczeń. */
  function measureType(ex, exercises) {
    if (ex.typ_pomiaru) return ex.typ_pomiaru;
    const lib = exercises.find((e) => e.id === ex.exercise_id);
    if (lib) return lib.typ_pomiaru;
    // ćwiczenie usunięte z biblioteki: zgadujemy po danych, czy któraś seria ma czas
    return (ex.serie || []).some((s) => s.czas !== null && s.czas !== undefined) ? 'czas' : 'powtorzenia';
  }

  function renderPRs(history, exercises) {
    const prs = WorkoutUtils.calcPRs(history);
    const el = document.getElementById('pr-list');
    const entries = Object.entries(prs);
    if (entries.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="h-title">Brak jeszcze rekordów</div><p>Pojawią się po pierwszych zapisanych treningach.</p></div>`;
      return;
    }
    el.innerHTML = entries
      .map(([exId, pr]) => {
        const value = pr.kg
          ? `${UI.kgOut(pr.kg)} ${UI.unitLabel()}${pr.powt ? ` × ${pr.powt}` : ''}`
          : pr.czas
          ? `${pr.czas}s`
          : `${pr.powt} powt.`;
        return `<div class="list-item"><div class="title">${UI.escapeHtml(exName(exercises, Number(exId)))}</div><span class="num" style="font-weight:700">${value}</span></div>`;
      })
      .join('');
  }

  function renderLog(history, exercises) {
    const el = document.getElementById('history-log-list');
    const sorted = [...history].sort((a, b) => (a.data < b.data ? 1 : -1));
    if (sorted.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="h-title">Pusto</div><p>Tu pojawi się historia Twoich treningów.</p></div>`;
      return;
    }
    el.innerHTML = sorted
      .map(
        (e) => `
      <div class="list-item">
        <div><div class="title">${UI.escapeHtml(e.nazwa_treningu || 'Trening')}</div><div class="sub">${e.data} · ${WorkoutUtils.formatDuration(e.czas_trwania || 0)}</div></div>
        <div class="item-actions">
          <button class="icon-btn" data-edit-hist="${e.id}"><svg><use href="#i-edit"/></svg></button>
          <button class="icon-btn danger" data-del-hist="${e.id}"><svg><use href="#i-trash"/></svg></button>
        </div>
      </div>`
      )
      .join('');
    el.querySelectorAll('[data-edit-hist]').forEach((btn) =>
      btn.addEventListener('click', async () => openEntryDetail(await DB.get('history_entries', Number(btn.getAttribute('data-edit-hist'))), exercises))
    );
    el.querySelectorAll('[data-del-hist]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!UI.confirmAction('Usunąć ten wpis z historii?')) return;
        await DB.remove('history_entries', Number(btn.getAttribute('data-del-hist')));
        UI.showToast('Usunięto wpis');
        render();
        if (window.Dashboard) window.Dashboard.render();
      })
    );
  }

  function openEntryDetail(entry, exercises) {
    const unitLbl = UI.unitLabel();
    const types = entry.cwiczenia.map((ex) => measureType(ex, exercises));
    const rows = entry.cwiczenia
      .map((ex, exIdx) => {
        const isTime = types[exIdx] === 'czas';
        return `
      <div class="section-title">${UI.escapeHtml(exName(exercises, ex.exercise_id))}</div>
      <div class="set-row" style="color:var(--ink-faint);font-size:10px;text-transform:uppercase">
        <span></span><span>${isTime ? 'Czas (s)' : 'Powt.'}</span><span>${unitLbl}</span><span></span>
      </div>
      ${ex.serie
        .map(
          (s, sIdx) => `
        <div class="set-row" data-ex="${exIdx}" data-set="${sIdx}">
          <span class="set-idx">${sIdx + 1}</span>
          <input type="number" class="h-cel" value="${(isTime ? s.czas : s.powt) ?? ''}" placeholder="${isTime ? 'sek.' : 'powt.'}" />
          <input type="number" class="h-kg" value="${UI.kgOut(s.kg) ?? ''}" placeholder="${unitLbl}" step="0.5" />
          <span></span>
        </div>`
        )
        .join('')}`;
      })
      .join('');

    const html = `
      <div class="field"><label>Nazwa treningu</label><input type="text" id="f-hist-nazwa" value="${UI.escapeHtml(entry.nazwa_treningu || '')}" /></div>
      <div class="field"><label>Data</label><input type="date" id="f-hist-data" value="${entry.data}" /></div>
      <div class="field"><label>Notatka</label><textarea id="f-hist-notatka">${UI.escapeHtml(entry.notatka_ogolna || '')}</textarea></div>
      ${rows}
      <button class="btn btn-primary btn-block" id="f-hist-save" style="margin-top:16px">Zapisz zmiany</button>`;

    UI.openSheet('Szczegóły treningu', html, (body) => {
      body.querySelector('#f-hist-save').addEventListener('click', async () => {
        const updated = { ...entry };
        updated.nazwa_treningu = body.querySelector('#f-hist-nazwa').value.trim();
        updated.data = body.querySelector('#f-hist-data').value;
        updated.notatka_ogolna = body.querySelector('#f-hist-notatka').value.trim();
        if (!updated.data) { UI.showToast('Podaj datę treningu'); return; }
        updated.cwiczenia = entry.cwiczenia.map((ex, exIdx) => ({
          ...ex,
          typ_pomiaru: types[exIdx],
          serie: ex.serie.map((s, sIdx) => {
            const row = body.querySelector(`.set-row[data-ex="${exIdx}"][data-set="${sIdx}"]`);
            const celVal = row.querySelector('.h-cel').value;
            const kgVal = row.querySelector('.h-kg').value;
            const cel = celVal ? Number(celVal) : null;
            const isTime = types[exIdx] === 'czas';
            return {
              ...s,
              powt: isTime ? s.powt ?? null : cel,
              czas: isTime ? cel : s.czas ?? null,
              kg: UI.kgIn(kgVal),
            };
          }),
        }));
        await DB.put('history_entries', updated);
        UI.closeSheet();
        UI.showToast('Zapisano zmiany');
        render();
        if (window.Dashboard) window.Dashboard.render();
      });
    });
  }

  window.History = { init, render };
})();
