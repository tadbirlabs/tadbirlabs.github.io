/* Tadbir Labs calculators (savings goal, debt payoff).
   Everything is computed in the browser; nothing is sent or stored.
   Money is handled as whole minor units (hundredths) so sums never drift,
   and amounts are rounded up, so a plan never falls short of its target.
   The same file runs under Node for the tests (module.exports). */
(function (root) {
  'use strict';

  var MAX_MINOR = 1e14; // 1,000,000,000,000.00

  // Latin digits and a "." for the decimal mark, whatever the user typed.
  function normalise(value) {
    return String(value == null ? '' : value).trim()
      .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
      .replace(/٫/g, '.')            // Arabic decimal separator
      .replace(/[٬,\s ]/g, ''); // thousands separators and spaces
  }

  // "1,500.5", "١٥٠٠٫٥", "1 500" -> 150050. Read from the text itself, with no
  // floating point. Digits beyond the second decimal round the amount up, or
  // down when `down` is true: a target or a debt never shrinks, and an amount
  // already saved or paid never grows. Returns NaN for anything else.
  function toMinor(value, down) {
    var m = /^(\d{1,13})(?:\.(\d*))?$/.exec(normalise(value));
    if (!m) return NaN;
    var decimals = (m[2] || '') + '00';
    var minor = parseInt(m[1], 10) * 100 + parseInt(decimals.slice(0, 2), 10);
    if (!down && /[1-9]/.test(decimals.slice(2))) minor += 1;
    return minor > MAX_MINOR ? NaN : minor;
  }

  // 150050 -> "1,500.50"; 150000 -> "1,500"
  function format(minor) {
    var whole = Math.floor(minor / 100), cents = minor % 100;
    var text = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return cents ? text + '.' + (cents < 10 ? '0' : '') + cents : text;
  }

  function ceilDiv(a, b) { return Math.floor((a + b - 1) / b); }

  // A count of months: whole numbers only ("12" or "12.0", never "1.001").
  function wholeNumber(value, max) {
    var m = /^(\d{1,6})(?:\.0*)?$/.exec(normalise(value));
    if (!m) return NaN;
    var n = parseInt(m[1], 10);
    return n >= 1 && n <= max ? n : NaN;
  }

  // Savings goal, period known: how much per month, week and day.
  function savingsPlan(target, saved, months) {
    var remaining = Math.max(target - saved, 0);
    return {
      remaining: remaining,
      monthly: ceilDiv(remaining, months),
      weekly: ceilDiv(remaining * 12, 52 * months),
      daily: ceilDiv(remaining * 12, 365 * months)
    };
  }

  // Savings goal, monthly amount known: how many months, and the last deposit.
  function savingsTime(target, saved, monthly) {
    var remaining = Math.max(target - saved, 0);
    var months = remaining === 0 ? 0 : ceilDiv(remaining, monthly);
    return {
      remaining: remaining,
      months: months,
      last: months === 0 ? 0 : remaining - monthly * (months - 1)
    };
  }

  function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }

  // The k-th monthly date after a start date. Keeps the start's day of month
  // and falls back to the month's last day (31 Jan -> 28 Feb -> 31 Mar).
  function addMonths(start, k) {
    var total = start.month + k;
    var year = start.year + Math.floor(total / 12), month = total % 12;
    return { year: year, month: month, day: Math.min(start.day, daysInMonth(year, month)) };
  }

  // Debt without interest: equal payments, the last one takes what is left.
  function debtSchedule(remaining, payment, start) {
    var rows = [], left = remaining, k = 0;
    while (left > 0) {
      var pay = Math.min(payment, left);
      left -= pay;
      rows.push({ n: k + 1, date: addMonths(start, k), payment: pay, left: left });
      k += 1;
    }
    return rows;
  }

  function debtByPayment(amount, paid, payment, start) {
    var remaining = Math.max(amount - paid, 0);
    var rows = debtSchedule(remaining, payment, start);
    return { remaining: remaining, payment: payment, months: rows.length, rows: rows };
  }

  function debtByMonths(amount, paid, months, start) {
    var remaining = Math.max(amount - paid, 0);
    var payment = remaining === 0 ? 0 : ceilDiv(remaining, months);
    var rows = remaining === 0 ? [] : debtSchedule(remaining, payment, start);
    return { remaining: remaining, payment: payment, months: rows.length, rows: rows };
  }

  var api = {
    toMinor: toMinor, format: format, wholeNumber: wholeNumber,
    savingsPlan: savingsPlan, savingsTime: savingsTime,
    addMonths: addMonths, debtByPayment: debtByPayment, debtByMonths: debtByMonths
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.TadbirCalc = api;

  // ---- Page wiring -------------------------------------------------------
  var MAX_MONTHS = 600, MAX_ROWS = 120;

  function dateText(d) {
    var lang = document.documentElement.lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB';
    try {
      return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' })
        .format(new Date(d.year, d.month, d.day));
    } catch (e) { return d.day + '/' + (d.month + 1) + '/' + d.year; }
  }

  function parseDate(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!m) return null;
    var y = +m[1], mo = +m[2] - 1, d = +m[3];
    if (mo < 0 || mo > 11 || d < 1 || d > daysInMonth(y, mo)) return null;
    return { year: y, month: mo, day: d };
  }

  function setup(form) {
    var kind = form.getAttribute('data-calc');
    var box = form.parentNode.querySelector('[data-result]');
    var error = form.querySelector('[data-error]');
    function field(name) { return form.elements[name]; }
    function mode() { var m = form.querySelector('input[name="mode"]:checked'); return m ? m.value : ''; }
    function put(name, text) {
      var nodes = box.querySelectorAll('[data-out="' + name + '"]');
      for (var i = 0; i < nodes.length; i++) nodes[i].textContent = text;
    }
    function show(name, on) {
      var nodes = box.querySelectorAll('[data-show="' + name + '"]');
      for (var i = 0; i < nodes.length; i++) nodes[i].hidden = !on;
    }
    function fail(key) {
      box.hidden = true;
      error.textContent = error.getAttribute('data-' + key) || '';
      error.hidden = false;
    }
    function switchMode() {
      var groups = form.querySelectorAll('[data-mode]');
      for (var i = 0; i < groups.length; i++) groups[i].hidden = groups[i].getAttribute('data-mode') !== mode();
    }

    function run() {
      error.hidden = true;
      var total = toMinor(field(kind === 'savings' ? 'target' : 'amount').value);
      var done = field(kind === 'savings' ? 'saved' : 'paid').value.trim();
      var before = done ? toMinor(done, true) : 0;
      if (isNaN(total) || total <= 0 || isNaN(before)) return fail('amount');
      var byPeriod = mode() === 'period';
      var months = byPeriod ? wholeNumber(field('months').value, MAX_MONTHS) : 0;
      var each = byPeriod ? 0 : toMinor(field('each').value, true);
      if (byPeriod && isNaN(months)) return fail('months');
      if (!byPeriod && (isNaN(each) || each <= 0)) return fail('each');

      if (kind === 'savings') {
        var plan = byPeriod ? savingsPlan(total, before, months) : savingsTime(total, before, each);
        if (!byPeriod && plan.months > MAX_MONTHS) return fail('long');
        put('remaining', format(plan.remaining));
        show('reached', plan.remaining === 0);
        show('plan', plan.remaining > 0 && byPeriod);
        show('time', plan.remaining > 0 && !byPeriod);
        if (byPeriod) {
          put('monthly', format(plan.monthly)); put('weekly', format(plan.weekly)); put('daily', format(plan.daily));
          put('months', String(months));
        } else {
          put('months', String(plan.months)); put('each', format(each)); put('last', format(plan.last));
          show('last', plan.months > 1 && plan.last !== each);
        }
      } else {
        var start = parseDate(field('start').value);
        if (!start) return fail('date');
        if (!byPeriod && before < total && ceilDiv(total - before, each) > MAX_MONTHS) return fail('long');
        var debt = byPeriod ? debtByMonths(total, before, months, start) : debtByPayment(total, before, each, start);
        put('remaining', format(debt.remaining));
        show('reached', debt.remaining === 0);
        show('plan', debt.remaining > 0);
        if (debt.remaining > 0) {
          var lastRow = debt.rows[debt.rows.length - 1];
          put('payment', format(debt.payment)); put('months', String(debt.months));
          put('end', dateText(lastRow.date)); put('last', format(lastRow.payment));
          show('last', debt.months > 1 && lastRow.payment !== debt.payment);
          var body = box.querySelector('[data-rows]');
          body.textContent = '';
          var rows = debt.rows.slice(0, MAX_ROWS);
          for (var i = 0; i < rows.length; i++) {
            var tr = document.createElement('tr');
            var cells = [String(rows[i].n), dateText(rows[i].date), format(rows[i].payment), format(rows[i].left)];
            for (var c = 0; c < cells.length; c++) {
              var td = document.createElement('td');
              td.textContent = cells[c];
              tr.appendChild(td);
            }
            body.appendChild(tr);
          }
          show('more', debt.rows.length > MAX_ROWS);
        }
      }
      box.hidden = false;
    }

    var radios = form.querySelectorAll('input[name="mode"]');
    for (var r = 0; r < radios.length; r++) radios[r].addEventListener('change', function () { switchMode(); box.hidden = true; error.hidden = true; });
    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    var startField = form.elements.start;
    if (startField && !startField.value) {
      var now = new Date();
      startField.value = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
    }
    switchMode();
  }

  function init() {
    var forms = document.querySelectorAll('form[data-calc]');
    for (var i = 0; i < forms.length; i++) setup(forms[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : this);
