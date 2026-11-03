/* Panel 3 — Zarządzanie treningami: ćwiczenia, sprzęt, gotowe treningi (szablony), harmonogram. */
(function () {
  'use strict';

  const state = {
    tab: 'templates',
    schedDate: new Date(),
    tplRows: [], // tymczasowe wiersze ćwiczeń podczas edycji szablonu
    tplRowSeq: 0,
  };

  function init() {
    document.querySelectorAll('#view-planner .subtab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.tab = btn.getAttribute('data-planner-tab');
        document.querySelectorAll('#view-planner .subtab').forEach((b) => b.classList.toggle('active', b === btn));
        ['templates', 'schedule', 'exercises', 'equipment'].forEach((t) => {
          document.getElementById(`planner-tab-${t}`).style.display = t === state.tab ? '' : 'none';
        });
        document.getElementById('planner-fab').style.display = state.tab === 'schedule' ? 'none' : 'flex';
        render();
      });
    });

    document.getElementById('planner-fab').addEventListener('click', () => {
      if (state.tab === 'templates') openTemplateForm(null);
      else if (state.tab === 'exercises') openExerciseForm(null);
      else if (state.tab === 'equipment') openEquipmentForm(null);
    });

    document.getElementById('sched-cal-prev').addEventListener('click', () => {
      state.schedDate.setMonth(state.schedDate.getMonth() - 1);
      renderSchedule();
    });
    document.getElementById('sched-cal-next').addEventListener('click', () => {
      state.schedDate.setMonth(state.schedDate.getMonth() + 1);
      renderSchedule();
    });
  }

  function render() {
    if (state.tab === 'templates') renderTemplates();
    else if (state.tab === 'exercises') renderExercises();
    else if (state.tab === 'equipment') renderEquipment();
    else if (state.tab === 'schedule') renderSchedule();
  }

  /* ---------------- ĆWICZENIA ---------------- */

  async function renderExercises() {
    const list = document.getElementById('exercises-list');
    const items = await DB.getAll('exercises');
    if (items.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="h-title">Brak ćwiczeń</div><p>Dodaj pierwsze ćwiczenie przyciskiem +.</p></div>`;
      return;
    }
    list.innerHTML = items
      .map(
        (ex) => `
      <div class="list-item">
        <div>
          <div class="title">${UI.escapeHtml(ex.nazwa)}</div>
          <div class="sub">${UI.escapeHtml(ex.kategoria || '')} · ${ex.typ_pomiaru === 'czas' ? 'na czas' : 'na powtórzenia'}${ex.wymaga_sprzetu ? '' : ' · masa własna'}</div>
        </div>
        <div class="item-actions">
          <button class="icon-btn" data-edit-ex="${ex.id}"><svg><use href="#i-edit"/></svg></button>
          <button class="icon-btn danger" data-del-ex="${ex.id}"><svg><use href="#i-trash"/></svg></button>
        </div>
      </div>`
      )
      .join('');
    list.querySelectorAll('[data-edit-ex]').forEach((btn) =>
      btn.addEventListener('click', async () => openExerciseForm(await DB.get('exercises', Number(btn.getAttribute('data-edit-ex')))))
    );
    list.querySelectorAll('[data-del-ex]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!UI.confirmAction('Usunąć to ćwiczenie? Może być używane w istniejących treningach.')) return;
        await DB.remove('exercises', Number(btn.getAttribute('data-del-ex')));
        UI.showToast('Usunięto ćwiczenie');
        renderExercises();
      })
    );
  }

  function openExerciseForm(existing) {
    const html = `
      <div class="field"><label>Nazwa</label><input type="text" id="f-ex-nazwa" value="${UI.escapeHtml(existing?.nazwa || '')}" /></div>
      <div class="field"><label>Kategoria</label><input type="text" id="f-ex-kat" placeholder="np. nogi, plecy, cardio" value="${UI.escapeHtml(existing?.kategoria || '')}" /></div>
      <div class="field"><label>Opis</label><textarea id="f-ex-opis">${UI.escapeHtml(existing?.opis || '')}</textarea></div>
      <div class="field">
        <label>Sposób pomiaru</label>
        <select id="f-ex-typ">
          <option value="powtorzenia" ${existing?.typ_pomiaru !== 'czas' ? 'selected' : ''}>Powtórzenia</option>
          <option value="czas" ${existing?.typ_pomiaru === 'czas' ? 'selected' : ''}>Czas</option>
        </select>
      </div>
      <div class="field checkbox-row">
        <input type="checkbox" id="f-ex-sprzet" ${existing?.wymaga_sprzetu ? 'checked' : ''} />
        <label for="f-ex-sprzet" style="margin:0">Wymaga sprzętu (odznacz dla masy własnej)</label>
      </div>
      <button class="btn btn-primary btn-block" id="f-ex-save">Zapisz</button>`;
    UI.openSheet(existing ? 'Edytuj ćwiczenie' : 'Nowe ćwiczenie', html, (body) => {
      body.querySelector('#f-ex-save').addEventListener('click', async () => {
        const nazwa = body.querySelector('#f-ex-nazwa').value.trim();
        if (!nazwa) { UI.showToast('Podaj nazwę ćwiczenia'); return; }
        const obj = {
          nazwa,
          kategoria: body.querySelector('#f-ex-kat').value.trim(),
          opis: body.querySelector('#f-ex-opis').value.trim(),
          typ_pomiaru: body.querySelector('#f-ex-typ').value,
          wymaga_sprzetu: body.querySelector('#f-ex-sprzet').checked,
        };
        if (existing) obj.id = existing.id;
        await DB[existing ? 'put' : 'add']('exercises', obj);
        UI.closeSheet();
        UI.showToast('Zapisano ćwiczenie');
        renderExercises();
      });
    });
  }

  /* ---------------- SPRZĘT ---------------- */

  async function renderEquipment() {
    const list = document.getElementById('equipment-list');
    const items = await DB.getAll('equipment');
    if (items.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="h-title">Brak sprzętu</div><p>Sprzęt jest opcjonalny — potrzebny tylko dla ćwiczeń, które go wymagają.</p></div>`;
      return;
    }
    list.innerHTML = items
      .map(
        (eq) => `
      <div class="list-item">
        <div><div class="title">${UI.escapeHtml(eq.nazwa)}</div><div class="sub">${UI.escapeHtml(eq.typ || '')}</div></div>
        <div class="item-actions">
          <button class="icon-btn" data-edit-eq="${eq.id}"><svg><use href="#i-edit"/></svg></button>
          <button class="icon-btn danger" data-del-eq="${eq.id}"><svg><use href="#i-trash"/></svg></button>
        </div>
      </div>`
      )
      .join('');
    list.querySelectorAll('[data-edit-eq]').forEach((btn) =>
      btn.addEventListener('click', async () => openEquipmentForm(await DB.get('equipment', Number(btn.getAttribute('data-edit-eq')))))
    );
    list.querySelectorAll('[data-del-eq]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!UI.confirmAction('Usunąć ten sprzęt?')) return;
        await DB.remove('equipment', Number(btn.getAttribute('data-del-eq')));
        UI.showToast('Usunięto sprzęt');
        renderEquipment();
      })
    );
  }

  function openEquipmentForm(existing) {
    const html = `
      <div class="field"><label>Nazwa</label><input type="text" id="f-eq-nazwa" placeholder="np. Hantle 10kg" value="${UI.escapeHtml(existing?.nazwa || '')}" /></div>
      <div class="field"><label>Typ</label><input type="text" id="f-eq-typ" placeholder="np. wolne ciężary" value="${UI.escapeHtml(existing?.typ || '')}" /></div>
      <button class="btn btn-primary btn-block" id="f-eq-save">Zapisz</button>`;
    UI.openSheet(existing ? 'Edytuj sprzęt' : 'Nowy sprzęt', html, (body) => {
      body.querySelector('#f-eq-save').addEventListener('click', async () => {
        const nazwa = body.querySelector('#f-eq-nazwa').value.trim();
        if (!nazwa) { UI.showToast('Podaj nazwę sprzętu'); return; }
        const obj = { nazwa, typ: body.querySelector('#f-eq-typ').value.trim() };
        if (existing) obj.id = existing.id;
        await DB[existing ? 'put' : 'add']('equipment', obj);
        UI.closeSheet();
        UI.showToast('Zapisano sprzęt');
        renderEquipment();
      });
    });
  }

  /* ---------------- TRENINGI (SZABLONY) ---------------- */

  async function renderTemplates() {
    const list = document.getElementById('templates-list');
    const items = await DB.getAll('templates');
    if (items.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="h-title">Brak treningów</div><p>Utwórz gotowy zestaw ćwiczeń przyciskiem +.</p></div>`;
      return;
    }
    const dniLabel = { pon: 'Pn', wt: 'Wt', sr: 'Śr', czw: 'Cz', pt: 'Pt', sob: 'So', nd: 'Nd' };
    list.innerHTML = items
      .map(
        (t) => `
      <div class="list-item">
        <div>
          <div class="title">${UI.escapeHtml(t.nazwa)}</div>
          <div class="sub">${(t.cwiczenia || []).length} ćwiczeń${t.dni_tygodnia?.length ? ' · ' + t.dni_tygodnia.map((d) => dniLabel[d] || d).join(', ') : ''}</div>
        </div>
        <div class="item-actions">
          <button class="icon-btn" data-edit-tpl="${t.id}"><svg><use href="#i-edit"/></svg></button>
          <button class="icon-btn danger" data-del-tpl="${t.id}"><svg><use href="#i-trash"/></svg></button>
        </div>
      </div>`
      )
      .join('');
    list.querySelectorAll('[data-edit-tpl]').forEach((btn) =>
      btn.addEventListener('click', async () => openTemplateForm(await DB.get('templates', Number(btn.getAttribute('data-edit-tpl')))))
    );
    list.querySelectorAll('[data-del-tpl]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!UI.confirmAction('Usunąć ten trening? Zniknie też z przyszłych dni w harmonogramie.')) return;
        const tplId = Number(btn.getAttribute('data-del-tpl'));
        await removeFutureScheduled(tplId, false);
        await DB.remove('templates', tplId);
        UI.showToast('Usunięto trening');
        renderTemplates();
      })
    );
  }

  async function openTemplateForm(existing) {
    const exercises = await DB.getAll('exercises');
    const equipment = await DB.getAll('equipment');

    if (exercises.length === 0) {
      UI.showToast('Najpierw dodaj przynajmniej jedno ćwiczenie w zakładce Ćwiczenia');
      return;
    }

    state.tplRows = (existing?.cwiczenia || []).map((c) => ({ ...c, _rowId: state.tplRowSeq++ }));
    if (state.tplRows.length === 0) state.tplRows.push(emptyTplRow(exercises[0].id));

    const dni = ['pon', 'wt', 'sr', 'czw', 'pt', 'sob', 'nd'];
    const dniLabel = { pon: 'Pn', wt: 'Wt', sr: 'Śr', czw: 'Cz', pt: 'Pt', sob: 'So', nd: 'Nd' };
    const selectedDays = new Set(existing?.dni_tygodnia || []);

    const html = `
      <div class="field"><label>Nazwa treningu</label><input type="text" id="f-tpl-nazwa" value="${UI.escapeHtml(existing?.nazwa || '')}" /></div>
      <div class="field"><label>Opis</label><textarea id="f-tpl-opis">${UI.escapeHtml(existing?.opis || '')}</textarea></div>
      <div class="field">
        <label>Dni tygodnia (opcjonalnie)</label>
        <div class="day-toggles">${dni.map((d) => `<button type="button" class="day-toggle ${selectedDays.has(d) ? 'on' : ''}" data-day="${d}">${dniLabel[d]}</button>`).join('')}</div>
      </div>
      <div class="section-title" style="margin-top:18px">Ćwiczenia</div>
      <div id="f-tpl-rows"></div>
      <button type="button" class="btn btn-ghost btn-block" id="f-tpl-add-row">+ Dodaj ćwiczenie</button>
      <button class="btn btn-primary btn-block" id="f-tpl-save" style="margin-top:16px">Zapisz trening</button>`;

    UI.openSheet(existing ? 'Edytuj trening' : 'Nowy trening', html, (body) => {
      renderTplRows(body, exercises, equipment);

      body.querySelectorAll('.day-toggle').forEach((btn) =>
        btn.addEventListener('click', () => {
          btn.classList.toggle('on');
        })
      );

      body.querySelector('#f-tpl-add-row').addEventListener('click', () => {
        syncTplRowsFromDom(body, exercises);
        state.tplRows.push(emptyTplRow(exercises[0].id));
        renderTplRows(body, exercises, equipment);
      });

      body.querySelector('#f-tpl-save').addEventListener('click', async () => {
        const nazwa = body.querySelector('#f-tpl-nazwa').value.trim();
        if (!nazwa) { UI.showToast('Podaj nazwę treningu'); return; }

        syncTplRowsFromDom(body, exercises);
        const cwiczenia = state.tplRows.map(({ _rowId, ...row }) => row);

        const dni_tygodnia = Array.from(body.querySelectorAll('.day-toggle.on')).map((b) => b.getAttribute('data-day'));
        const daysChanged = !existing || dni_tygodnia.slice().sort().join() !== (existing.dni_tygodnia || []).slice().sort().join();

        const obj = { ...(existing || {}), nazwa, opis: body.querySelector('#f-tpl-opis').value.trim(), cwiczenia, dni_tygodnia };
        if (daysChanged) {
          // dni się zmieniły: zdejmij przyszłe automatyczne wpisy tego treningu i wygeneruj je od nowa
          if (existing) await removeFutureScheduled(existing.id, true);
          obj.zaplanowano_do = null;
        }
        await DB[existing ? 'put' : 'add']('templates', obj);
        if (daysChanged) await syncRecurring();
        UI.closeSheet();
        UI.showToast(dni_tygodnia.length && daysChanged ? 'Zapisano trening i dodano go do harmonogramu' : 'Zapisano trening');
        renderTemplates();
      });
    });
  }

  /**
   * Przepisuje to, co użytkownik wpisał w formularzu, do state.tplRows.
   * Bez tego każde przerysowanie wierszy (zmiana ćwiczenia, dodanie, usunięcie)
   * cofało niezapisane wartości we wszystkich wierszach.
   */
  function syncTplRowsFromDom(body, exercises) {
    state.tplRows = state.tplRows.map((row) => {
      const rowEl = body.querySelector(`[data-row-id="${row._rowId}"]`);
      if (!rowEl) return row;
      const exId = Number(rowEl.querySelector('.tpl-row-ex').value);
      const ex = exercises.find((e) => e.id === exId) || exercises[0];
      const celRaw = rowEl.querySelector('.tpl-row-cel').value;
      const sprzetRaw = rowEl.querySelector('.tpl-row-sprzet').value;
      const isTime = ex.typ_pomiaru === 'czas';
      return {
        _rowId: row._rowId,
        exercise_id: exId,
        docelowe_serie: Number(rowEl.querySelector('.tpl-row-serie').value) || 1,
        docelowe_powt: isTime ? null : Number(celRaw) || null,
        docelowe_czas: isTime ? Number(celRaw) || null : null,
        docelowe_kg: UI.kgIn(rowEl.querySelector('.tpl-row-kg').value),
        sprzet_id: sprzetRaw ? Number(sprzetRaw) : null,
      };
    });
  }

  function emptyTplRow(defaultExId) {
    return { _rowId: state.tplRowSeq++, exercise_id: defaultExId, docelowe_serie: 3, docelowe_powt: 10, docelowe_czas: null, docelowe_kg: null, sprzet_id: null };
  }

  function renderTplRows(body, exercises, equipment) {
    const container = body.querySelector('#f-tpl-rows');
    container.innerHTML = state.tplRows
      .map((row) => {
        const ex = exercises.find((e) => e.id === row.exercise_id) || exercises[0];
        const cel = ex.typ_pomiaru === 'czas' ? row.docelowe_czas : row.docelowe_powt;
        const celLabel = ex.typ_pomiaru === 'czas' ? 'Czas (s)' : 'Powtórzenia';
        return `
        <div class="card" data-row-id="${row._rowId}" style="margin-bottom:10px">
          <div class="field" style="margin-bottom:10px">
            <label>Ćwiczenie</label>
            <select class="tpl-row-ex">${UI.buildOptions(exercises, 'id', 'nazwa', row.exercise_id)}</select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="field" style="margin-bottom:8px"><label>Serie</label><input type="number" class="tpl-row-serie" min="1" value="${row.docelowe_serie || 3}" /></div>
            <div class="field" style="margin-bottom:8px"><label>${celLabel}</label><input type="number" class="tpl-row-cel" min="0" value="${cel ?? ''}" /></div>
            <div class="field" style="margin-bottom:0"><label>${UI.unitLabel()} (opcjonalnie)</label><input type="number" class="tpl-row-kg" min="0" step="0.5" value="${UI.kgOut(row.docelowe_kg) ?? ''}" placeholder="masa własna" /></div>
            <div class="field" style="margin-bottom:0">
              <label>Sprzęt (opcjonalnie)</label>
              <select class="tpl-row-sprzet"><option value="">— brak —</option>${UI.buildOptions(equipment, 'id', 'nazwa', row.sprzet_id)}</select>
            </div>
          </div>
          <button type="button" class="btn btn-ghost btn-block tpl-row-remove" style="margin-top:10px">Usuń ćwiczenie z treningu</button>
        </div>`;
      })
      .join('');

    container.querySelectorAll('.tpl-row-ex').forEach((sel) =>
      sel.addEventListener('change', (e) => {
        const rowId = Number(e.target.closest('[data-row-id]').getAttribute('data-row-id'));
        syncTplRowsFromDom(body, exercises);
        const row = state.tplRows.find((r) => r._rowId === rowId);
        // inny typ pomiaru = stary cel (np. 10 powt.) nie ma sensu jako czas, więc go czyścimy
        const prevEx = exercises.find((x) => x.id === row.exercise_id);
        const nextEx = exercises.find((x) => x.id === Number(e.target.value));
        row.exercise_id = Number(e.target.value);
        if (prevEx && nextEx && prevEx.typ_pomiaru !== nextEx.typ_pomiaru) {
          row.docelowe_powt = null;
          row.docelowe_czas = null;
        }
        renderTplRows(body, exercises, equipment);
      })
    );
    container.querySelectorAll('.tpl-row-remove').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        const rowId = Number(e.target.closest('[data-row-id]').getAttribute('data-row-id'));
        if (state.tplRows.length === 1) { UI.showToast('Trening musi mieć przynajmniej jedno ćwiczenie'); return; }
        syncTplRowsFromDom(body, exercises);
        state.tplRows = state.tplRows.filter((r) => r._rowId !== rowId);
        renderTplRows(body, exercises, equipment);
      })
    );
  }

  /* ---------------- HARMONOGRAM ---------------- */

  // ile dni do przodu dopisujemy sesje z szablonów z ustawionymi dniami tygodnia
  const RECURRING_HORIZON_DAYS = 28;

  const STATUS_TEXT = { zaplanowana: 'zaplanowany', 'pominięta': 'pominięty', wykonana: 'wykonany' };

  /**
   * Dla każdego szablonu z dniami tygodnia dopisuje sesje na najbliższe 4 tygodnie.
   * Szablon pamięta `zaplanowano_do`, więc dzień, który użytkownik sam usunął z planu,
   * nie wraca przy kolejnym uruchomieniu. W dni, gdzie coś już jest w planie, nic nie dokładamy.
   */
  async function syncRecurring() {
    const [templates, scheduled] = await Promise.all([DB.getAll('templates'), DB.getAll('scheduled_sessions')]);
    const todayIso = WorkoutUtils.dateToISO(new Date());
    const until = WorkoutUtils.addDaysIso(todayIso, RECURRING_HORIZON_DAYS - 1);
    const taken = new Set(scheduled.map((s) => s.data));
    let added = 0;
    for (const tpl of templates) {
      if (!tpl.dni_tygodnia || tpl.dni_tygodnia.length === 0) continue;
      const from = tpl.zaplanowano_do && tpl.zaplanowano_do >= todayIso ? WorkoutUtils.addDaysIso(tpl.zaplanowano_do, 1) : todayIso;
      if (from > until) continue;
      for (const iso of WorkoutUtils.recurringDates(tpl.dni_tygodnia, from, until)) {
        if (taken.has(iso)) continue;
        await DB.add('scheduled_sessions', { data: iso, template_id: tpl.id, status: 'zaplanowana', auto: true });
        taken.add(iso);
        added += 1;
      }
      await DB.put('templates', { ...tpl, zaplanowano_do: until });
    }
    return added;
  }

  /** Usuwa przyszłe (od dziś), jeszcze niewykonane wpisy danego szablonu. onlyAuto = tylko te z dni tygodnia. */
  async function removeFutureScheduled(templateId, onlyAuto) {
    const todayIso = WorkoutUtils.dateToISO(new Date());
    const scheduled = await DB.getAll('scheduled_sessions');
    const toRemove = scheduled.filter(
      (s) => s.template_id === templateId && s.data >= todayIso && s.status === 'zaplanowana' && (!onlyAuto || s.auto)
    );
    for (const s of toRemove) await DB.remove('scheduled_sessions', s.id);
  }

  async function renderSchedule() {
    const [scheduled, history] = await Promise.all([DB.getAll('scheduled_sessions'), DB.getAll('history_entries')]);
    UI.renderCalendar(
      document.getElementById('sched-cal-grid'),
      document.getElementById('sched-cal-label'),
      state.schedDate,
      scheduled,
      history,
      (iso, dayInfo) => openScheduleDay(iso, dayInfo, scheduled)
    );
  }

  async function openScheduleDay(iso, dayInfo, scheduled) {
    const templates = await DB.getAll('templates');
    const existingSession = scheduled.find((s) => s.data === iso);

    if (dayInfo.status === 'wykonany') {
      UI.openSheet(iso, `<p style="color:var(--ink-dim)">Trening z tego dnia zobaczysz w panelu Historia.</p><button class="btn btn-ghost btn-block" id="f-sched-close">Zamknij</button>`, (body) => {
        body.querySelector('#f-sched-close').addEventListener('click', UI.closeSheet);
      });
      return;
    }

    if (existingSession) {
      const tpl = templates.find((t) => t.id === existingSession.template_id);
      const html = `
        <p><strong>${UI.escapeHtml(tpl?.nazwa || 'Trening (usunięty)')}</strong> · status: ${UI.escapeHtml(STATUS_TEXT[existingSession.status] || existingSession.status)}</p>
        <button class="btn btn-ghost btn-block" id="f-sched-skip">${existingSession.status === 'pominięta' ? 'Przywróć do planu' : 'Oznacz jako pominięty'}</button>
        <button class="btn btn-danger btn-block" id="f-sched-remove" style="margin-top:8px">Usuń z planu</button>`;
      UI.openSheet(iso, html, (body) => {
        body.querySelector('#f-sched-skip').addEventListener('click', async () => {
          const restoring = existingSession.status === 'pominięta';
          await DB.put('scheduled_sessions', { ...existingSession, status: restoring ? 'zaplanowana' : 'pominięta' });
          UI.closeSheet();
          UI.showToast(restoring ? 'Przywrócono do planu' : 'Oznaczono jako pominięty');
          renderSchedule();
        });
        body.querySelector('#f-sched-remove').addEventListener('click', async () => {
          await DB.remove('scheduled_sessions', existingSession.id);
          UI.closeSheet();
          UI.showToast('Usunięto z planu');
          renderSchedule();
        });
      });
      return;
    }

    if (templates.length === 0) {
      UI.showToast('Najpierw utwórz trening w zakładce Treningi');
      return;
    }

    const html = `
      <div class="field"><label>Zaplanuj trening na ${iso}</label>
        <select id="f-sched-tpl">${UI.buildOptions(templates, 'id', 'nazwa')}</select>
      </div>
      <button class="btn btn-primary btn-block" id="f-sched-save">Zaplanuj</button>`;
    UI.openSheet('Nowy wpis w planie', html, (body) => {
      body.querySelector('#f-sched-save').addEventListener('click', async () => {
        await DB.add('scheduled_sessions', { data: iso, template_id: Number(body.querySelector('#f-sched-tpl').value), status: 'zaplanowana' });
        UI.closeSheet();
        UI.showToast('Zaplanowano trening');
        renderSchedule();
      });
    });
  }

  window.Planner = { init, render, renderTemplates, renderSchedule, syncRecurring };
})();
