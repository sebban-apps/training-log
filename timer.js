/* Panel 2 — Timer i start treningu: wybór gotowego treningu, trening bez planu, timer przerwy, aktywna sesja. */
(function () {
  'use strict';

  // Klucz w localStorage pod którym trzymamy aktywny trening. Telefon potrafi ubić
  // aplikację w tle (albo ktoś ją po prostu zamknie), a wpisane serie nie mogą wtedy przepaść.
  const SESSION_KEY = 'dziennik.activeSession';

  const state = {
    tab: 'plan',
    restTotal: 90,
    restRemaining: 90,
    restEndsAt: null, // znacznik czasu (ms) końca przerwy; null = timer nie biegnie
    restInterval: null,
    session: null, // {name, template_id, scheduled_session_id, startedAt, exercises:[{exercise_id,nazwa,typ_pomiaru,serie:[{powt,czas,kg,sprzet_id}]}]}
    sessionInterval: null,
  };

  /* ---------------- ZAPIS SESJI ---------------- */

  function persistSession() {
    try {
      if (state.session) localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
      else localStorage.removeItem(SESSION_KEY);
    } catch (err) {
      // tryb prywatny / brak miejsca: aplikacja działa dalej, tylko bez ochrony przed zamknięciem
    }
  }

  function loadPersistedSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s && Array.isArray(s.exercises) && typeof s.startedAt === 'number' ? s : null;
    } catch (err) {
      return null;
    }
  }

  function hasActiveSession() {
    return !!state.session;
  }

  /* ---------------- INIT ---------------- */

  function init() {
    document.querySelectorAll('#view-timer .subtab').forEach((btn) =>
      btn.addEventListener('click', () => {
        state.tab = btn.getAttribute('data-timer-tab');
        document.querySelectorAll('#view-timer .subtab').forEach((b) => b.classList.toggle('active', b === btn));
        document.getElementById('timer-tab-plan').style.display = state.tab === 'plan' ? '' : 'none';
        document.getElementById('timer-tab-custom').style.display = state.tab === 'custom' ? '' : 'none';
        document.getElementById('timer-tab-rest').style.display = state.tab === 'rest' ? '' : 'none';
      })
    );

    document.querySelectorAll('[data-rest-preset]').forEach((btn) =>
      btn.addEventListener('click', () => {
        stopRest();
        state.restTotal = Number(btn.getAttribute('data-rest-preset'));
        state.restRemaining = state.restTotal;
        updateRestDisplay();
      })
    );
    document.getElementById('btn-rest-toggle').addEventListener('click', toggleRest);
    document.getElementById('btn-rest-reset').addEventListener('click', () => {
      stopRest();
      state.restRemaining = state.restTotal;
      updateRestDisplay();
    });

    document.getElementById('btn-start-custom').addEventListener('click', () => {
      const name = document.getElementById('custom-workout-name').value.trim() || 'Trening bez planu';
      startSession({ name, template_id: null, scheduled_session_id: null, exercises: [] });
      document.getElementById('custom-workout-name').value = '';
    });

    document.getElementById('btn-add-exercise-active').addEventListener('click', openAddExerciseToSession);
    document.getElementById('btn-finish-session').addEventListener('click', finishSession);
    document.getElementById('btn-cancel-session').addEventListener('click', () => {
      if (!UI.confirmAction('Anulować trening? Wpisane dane nie zostaną zapisane.')) return;
      stopSession(false);
    });

    // po powrocie do aplikacji (odblokowanie ekranu) od razu pokaż prawdziwy czas
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      tickRest();
      tickSessionClock();
    });

    updateRestDisplay();

    // przywróć trening przerwany zamknięciem aplikacji; zegar liczy dalej od startedAt
    const restored = loadPersistedSession();
    if (restored) {
      resumeSession(restored);
      UI.showToast('Przywrócono trwający trening');
    }
  }

  /* ---------------- TIMER PRZERWY ----------------
   * Nie odejmujemy 1 co sekundę, bo przeglądarka w tle usypia setInterval i licznik
   * by się spóźniał. Zapamiętujemy moment końca i za każdym razem liczymy różnicę od teraz.
   */

  function toggleRest() {
    if (state.restEndsAt) {
      // pauza: zapamiętaj ile zostało
      state.restRemaining = Math.max(0, Math.ceil((state.restEndsAt - Date.now()) / 1000));
      stopRest();
      updateRestDisplay();
      return;
    }
    if (state.restRemaining <= 0) state.restRemaining = state.restTotal;
    state.restEndsAt = Date.now() + state.restRemaining * 1000;
    document.getElementById('btn-rest-toggle').textContent = 'Pauza';
    clearInterval(state.restInterval);
    state.restInterval = setInterval(tickRest, 250);
    tickRest();
  }

  function tickRest() {
    if (!state.restEndsAt) return;
    state.restRemaining = Math.max(0, Math.ceil((state.restEndsAt - Date.now()) / 1000));
    updateRestDisplay();
    if (state.restRemaining <= 0) {
      stopRest();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      UI.showToast('Koniec przerwy');
    }
  }

  function stopRest() {
    clearInterval(state.restInterval);
    state.restInterval = null;
    state.restEndsAt = null;
    document.getElementById('btn-rest-toggle').textContent = 'Start';
  }

  function updateRestDisplay() {
    document.getElementById('rest-display').textContent = WorkoutUtils.formatDuration(state.restRemaining);
  }

  /* ---------------- LISTA GOTOWYCH TRENINGÓW ---------------- */

  async function render() {
    const showPicker = !state.session;
    document.getElementById('timer-picker').style.display = showPicker ? '' : 'none';
    document.getElementById('active-session').style.display = showPicker ? 'none' : '';
    if (showPicker) await renderPlanList();
    else renderActiveExerciseList();
  }

  async function renderPlanList() {
    const [templates, scheduled] = await Promise.all([DB.getAll('templates'), DB.getAll('scheduled_sessions')]);
    const todayIso = WorkoutUtils.dateToISO(new Date());
    const todaysScheduled = scheduled.find((s) => s.data === todayIso && s.status === 'zaplanowana');
    const list = document.getElementById('timer-plan-list');

    if (templates.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="h-title">Brak gotowych treningów</div><p>Dodaj trening w panelu Plan.</p></div>`;
      return;
    }

    list.innerHTML = templates
      .map((t) => {
        const isToday = todaysScheduled && todaysScheduled.template_id === t.id;
        return `
        <div class="list-item">
          <div>
            <div class="title">${UI.escapeHtml(t.nazwa)} ${isToday ? '<span class="badge badge-good">Dziś</span>' : ''}</div>
            <div class="sub">${(t.cwiczenia || []).length} ćwiczeń</div>
          </div>
          <button class="btn btn-primary" data-start-tpl="${t.id}">Start</button>
        </div>`;
      })
      .join('');

    list.querySelectorAll('[data-start-tpl]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const tpl = templates.find((t) => t.id === Number(btn.getAttribute('data-start-tpl')));
        const linkedSchedule = todaysScheduled && todaysScheduled.template_id === tpl.id ? todaysScheduled.id : null;
        await startFromTemplate(tpl, linkedSchedule);
      })
    );
  }

  async function startFromTemplate(tpl, scheduledSessionId) {
    if (state.session) {
      UI.showToast('Masz już trwający trening');
      return;
    }
    const exercisesLib = await DB.getAll('exercises');
    const exercises = (tpl.cwiczenia || []).map((c) => {
      const ex = exercisesLib.find((e) => e.id === c.exercise_id) || { nazwa: '?', typ_pomiaru: 'powtorzenia', wymaga_sprzetu: false };
      const serie = Array.from({ length: c.docelowe_serie || 1 }, () => ({
        powt: c.docelowe_powt ?? null,
        czas: c.docelowe_czas ?? null,
        kg: c.docelowe_kg ?? null,
        sprzet_id: c.sprzet_id ?? null,
      }));
      return { exercise_id: c.exercise_id, nazwa: ex.nazwa, typ_pomiaru: ex.typ_pomiaru, serie };
    });
    startSession({ name: tpl.nazwa, template_id: tpl.id, scheduled_session_id: scheduledSessionId ?? null, exercises });
  }

  function startSession(session) {
    resumeSession({ ...session, startedAt: Date.now() });
    persistSession();
  }

  /** Pokazuje sesję i uruchamia zegar. Wspólne dla nowego startu i przywrócenia po zamknięciu appki. */
  function resumeSession(session) {
    state.session = session;
    document.getElementById('active-session-name').textContent = state.session.name;
    document.getElementById('timer-picker').style.display = 'none';
    document.getElementById('active-session').style.display = '';
    clearInterval(state.sessionInterval);
    state.sessionInterval = setInterval(tickSessionClock, 1000);
    tickSessionClock();
    renderActiveExerciseList();
  }

  function tickSessionClock() {
    if (!state.session) return;
    const elapsed = Math.floor((Date.now() - state.session.startedAt) / 1000);
    document.getElementById('active-session-clock').textContent = WorkoutUtils.formatDuration(elapsed);
  }

  function stopSession(saved) {
    clearInterval(state.sessionInterval);
    state.session = null;
    persistSession();
    document.getElementById('timer-picker').style.display = '';
    document.getElementById('active-session').style.display = 'none';
    render();
    if (!saved) UI.showToast('Trening anulowany');
  }

  async function openAddExerciseToSession() {
    const exercisesLib = await DB.getAll('exercises');
    if (exercisesLib.length === 0) { UI.showToast('Najpierw dodaj ćwiczenie w panelu Plan'); return; }
    const html = `
      <div class="field"><label>Ćwiczenie</label><select id="f-add-ex">${UI.buildOptions(exercisesLib, 'id', 'nazwa')}</select></div>
      <button class="btn btn-primary btn-block" id="f-add-ex-save">Dodaj do treningu</button>`;
    UI.openSheet('Dodaj ćwiczenie', html, (body) => {
      body.querySelector('#f-add-ex-save').addEventListener('click', () => {
        const exId = Number(body.querySelector('#f-add-ex').value);
        const ex = exercisesLib.find((e) => e.id === exId);
        state.session.exercises.push({ exercise_id: exId, nazwa: ex.nazwa, typ_pomiaru: ex.typ_pomiaru, serie: [{ powt: null, czas: null, kg: null, sprzet_id: null }] });
        persistSession();
        UI.closeSheet();
        renderActiveExerciseList();
      });
    });
  }

  function rowIndexes(el) {
    const row = el.closest('.set-row');
    return { exIdx: Number(row.getAttribute('data-ex')), sIdx: Number(row.getAttribute('data-set')) };
  }

  function renderActiveExerciseList() {
    const container = document.getElementById('active-exercise-list');
    if (!state.session) return;
    const unitLbl = UI.unitLabel();
    container.innerHTML = state.session.exercises
      .map((ex, exIdx) => {
        const isTime = ex.typ_pomiaru === 'czas';
        const rows = ex.serie
          .map(
            (s, sIdx) => `
          <div class="set-row" data-ex="${exIdx}" data-set="${sIdx}">
            <span class="set-idx">${sIdx + 1}</span>
            <input type="number" inputmode="numeric" class="set-cel" placeholder="${isTime ? 'sek.' : 'powt.'}" value="${(isTime ? s.czas : s.powt) ?? ''}" />
            <input type="number" inputmode="decimal" class="set-kg" placeholder="${unitLbl}" value="${UI.kgOut(s.kg) ?? ''}" step="0.5" />
            <button class="icon-btn danger set-remove" aria-label="Usuń serię"><svg><use href="#i-trash"/></svg></button>
          </div>`
          )
          .join('');
        return `
        <div class="card">
          <div class="title" style="margin-bottom:8px">${UI.escapeHtml(ex.nazwa)}</div>
          <div class="set-row" style="color:var(--ink-faint);font-size:10px;text-transform:uppercase">
            <span></span><span>${isTime ? 'Czas' : 'Powt.'}</span><span>${unitLbl}</span><span></span>
          </div>
          ${rows}
          <button type="button" class="btn btn-ghost btn-block add-set-btn" data-ex="${exIdx}" style="margin-top:6px">+ Seria</button>
        </div>`;
      })
      .join('');

    // 'input' zamiast 'change': wartość trafia do stanu (i localStorage) od razu przy wpisywaniu,
    // więc nawet zamknięcie appki w pół serii nic nie gubi
    container.querySelectorAll('.set-cel').forEach((input) =>
      input.addEventListener('input', (e) => {
        const { exIdx, sIdx } = rowIndexes(e.target);
        const ex = state.session.exercises[exIdx];
        const val = e.target.value ? Number(e.target.value) : null;
        if (ex.typ_pomiaru === 'czas') ex.serie[sIdx].czas = val;
        else ex.serie[sIdx].powt = val;
        persistSession();
      })
    );
    container.querySelectorAll('.set-kg').forEach((input) =>
      input.addEventListener('input', (e) => {
        const { exIdx, sIdx } = rowIndexes(e.target);
        state.session.exercises[exIdx].serie[sIdx].kg = UI.kgIn(e.target.value);
        persistSession();
      })
    );
    container.querySelectorAll('.set-remove').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        const { exIdx, sIdx } = rowIndexes(e.currentTarget);
        state.session.exercises[exIdx].serie.splice(sIdx, 1);
        if (state.session.exercises[exIdx].serie.length === 0) state.session.exercises.splice(exIdx, 1);
        persistSession();
        renderActiveExerciseList();
      })
    );
    container.querySelectorAll('.add-set-btn').forEach((btn) =>
      btn.addEventListener('click', () => {
        const exIdx = Number(btn.getAttribute('data-ex'));
        const series = state.session.exercises[exIdx].serie;
        // nowa seria kopiuje poprzednią (zwykle robi się ten sam ciężar), łatwo poprawić
        const last = series[series.length - 1];
        series.push(last ? { ...last } : { powt: null, czas: null, kg: null, sprzet_id: null });
        persistSession();
        renderActiveExerciseList();
      })
    );
  }

  async function finishSession() {
    if (!state.session) return;
    if (state.session.exercises.length === 0) { UI.showToast('Dodaj przynajmniej jedno ćwiczenie'); return; }
    const elapsed = Math.floor((Date.now() - state.session.startedAt) / 1000);
    const entry = {
      // data startu, nie zakończenia: trening zaczęty przed północą liczy się do tamtego dnia
      data: WorkoutUtils.dateToISO(new Date(state.session.startedAt)),
      scheduled_session_id: state.session.scheduled_session_id,
      nazwa_treningu: state.session.name,
      czas_trwania: elapsed,
      cwiczenia: state.session.exercises.map((ex) => ({ exercise_id: ex.exercise_id, typ_pomiaru: ex.typ_pomiaru, serie: ex.serie, notatka: '' })),
      notatka_ogolna: '',
    };
    await DB.add('history_entries', entry);
    if (state.session.scheduled_session_id) {
      const sched = await DB.get('scheduled_sessions', state.session.scheduled_session_id);
      if (sched) await DB.put('scheduled_sessions', { ...sched, status: 'wykonana' });
    }
    stopSession(true);
    UI.showToast('Trening zapisany 💪');
    if (window.Dashboard) window.Dashboard.render();
  }

  window.Timer = { init, render, startFromTemplate, hasActiveSession };
})();
