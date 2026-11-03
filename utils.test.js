// Testy czystych funkcji z js/utils.js. Uruchom: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../js/utils.js');

test('kg -> lb i z powrotem nie gubi danych', () => {
  assert.equal(U.kgToDisplay(100, 'kg'), 100);
  assert.equal(U.kgToDisplay(100, 'lb'), 220.5); // 220.46 zaokrąglone do 0.5
  assert.equal(U.displayToKg(225, 'lb'), 102.058);
  assert.equal(U.kgToDisplay(U.displayToKg(225, 'lb'), 'lb'), 225);
  assert.equal(U.kgToDisplay(null, 'lb'), null);
  assert.equal(U.displayToKg('', 'kg'), null);
  assert.equal(U.displayToKg('abc', 'kg'), null);
  assert.equal(U.unitLabel('lb'), 'lb');
  assert.equal(U.unitLabel(undefined), 'kg');
});

test('addDaysIso przechodzi przez koniec miesiąca i roku', () => {
  assert.equal(U.addDaysIso('2026-11-30', 1), '2026-12-01');
  assert.equal(U.addDaysIso('2026-12-31', 1), '2027-01-01');
  // zmiana czasu w Polsce (25 X 2026) nie może zgubić ani zdublować dnia
  assert.equal(U.addDaysIso('2026-10-24', 2), '2026-10-26');
});

test('recurringDates zwraca tylko wybrane dni tygodnia', () => {
  // 2026-11-02 to poniedziałek
  assert.deepEqual(U.recurringDates(['pon', 'czw'], '2026-11-02', '2026-11-15'), ['2026-11-02', '2026-11-05', '2026-11-09', '2026-11-12']);
  assert.deepEqual(U.recurringDates(['nd'], '2026-11-02', '2026-11-08'), ['2026-11-08']);
  assert.deepEqual(U.recurringDates([], '2026-11-02', '2026-11-30'), []);
  assert.deepEqual(U.recurringDates(['pon'], '2026-11-10', '2026-11-01'), []);
});

test('objętość liczy tylko kg × powtórzenia w zakresie', () => {
  const history = [
    { data: '2026-11-02', cwiczenia: [{ serie: [{ kg: 50, powt: 10 }, { kg: 50, powt: 8 }] }] },
    { data: '2026-11-03', cwiczenia: [{ serie: [{ kg: null, czas: 60 }] }] },
    { data: '2026-10-30', cwiczenia: [{ serie: [{ kg: 100, powt: 5 }] }] },
  ];
  assert.equal(U.calcVolumeInRange(history, '2026-11-02', '2026-11-08'), 900);
});

test('passa liczy wstecz i toleruje brak treningu dzisiaj', () => {
  const h = ['2026-11-01', '2026-11-02'].map((data) => ({ data }));
  assert.equal(U.calcStreak(h, new Date(2026, 10, 3)), 2);
  assert.equal(U.calcStreak([...h, { data: '2026-11-03' }], new Date(2026, 10, 3)), 3);
  assert.equal(U.calcStreak(h, new Date(2026, 10, 5)), 0);
});

test('kalendarz: wykonany > pominięty > zaplanowany', () => {
  const cal = U.buildCalendarMonth(
    2026, 10,
    [{ data: '2026-11-04', status: 'zaplanowana' }, { data: '2026-11-05', status: 'pominięta' }, { data: '2026-11-06', status: 'zaplanowana' }],
    [{ data: '2026-11-06', nazwa_treningu: 'Push' }]
  );
  const st = (d) => cal.days.find((x) => x.date === d).status;
  assert.equal(st('2026-11-04'), 'zaplanowany');
  assert.equal(st('2026-11-05'), 'pominięty');
  assert.equal(st('2026-11-06'), 'wykonany');
  assert.equal(st('2026-11-07'), null);
  assert.equal(cal.days.length, 30);
});
