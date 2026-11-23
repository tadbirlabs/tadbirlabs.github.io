// Home pages only: the hero story, one continuous scene built from the real
// app screens. The screens come from the page's own language folder, and the
// captions and numbers from the page itself, so a new language needs only its
// screens and its captions. Sends nothing and stores nothing.
(function () {
  var root = document.querySelector('[data-story]');
  if (!root || !root.animate || !window.Promise) return;

  var view = root.querySelector('.story-view');
  var phone = root.querySelector('.story-phone');
  var rig = root.querySelector('.story-rig');
  var toggle = root.querySelector('.story-toggle');
  var progress = root.querySelector('.story-progress');
  var captions = [].slice.call(root.querySelectorAll('.story-steps li'));
  var data = root.dataset;
  var rtl = getComputedStyle(root).direction === 'rtl';
  var W = 720, H = 1436, FULL = [0, 0, W, H];
  var T = 15000; // one loop, in milliseconds
  var OUT = 'cubic-bezier(.2,.8,.2,1)', BOTH = 'cubic-bezier(.45,0,.2,1)';
  var PLANE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';

  var load = function (name) {
    return new Promise(function (done, fail) {
      var image = new Image();
      image.onload = done;
      image.onerror = fail;
      image.src = data.screens + name + '.webp';
    });
  };

  // Layers. Every box is [x, y, width, height] in pixels of the 720 x 1436
  // screens; `shot` fills the box with that part of a real screen.
  var add = function (parent, name, box, shot) {
    var node = document.createElement('span');
    var from = parent.at || [0, 0];
    var style = node.style;
    node.className = 'story-l' + (name ? ' ' + name : '') + (shot ? ' story-s' : '');
    style.setProperty('--x', box[0] - from[0]);
    style.setProperty('--y', box[1] - from[1]);
    style.setProperty('--w', box[2]);
    style.setProperty('--h', box[3]);
    if (shot) {
      style.setProperty('--img', 'url("' + data.screens + shot + '.webp")');
      style.setProperty('--bx', box[0]);
      style.setProperty('--by', box[1]);
    }
    node.at = [box[0], box[1]];
    parent.appendChild(node);
    return node;
  };
  var plain = function (parent, name, html) {
    var node = document.createElement('span');
    node.className = name;
    node.setAttribute('aria-hidden', 'true');
    if (html) node.innerHTML = html;
    parent.appendChild(node);
    return node;
  };
  // Screens mirror with the language; the keypad and the status bar do not.
  var flip = function (box) {
    return rtl ? [W - box[0] - (box[2] || 0), box[1], box[2], box[3]] : box;
  };

  // Reduced motion: one still frame, the debts screen under the promise.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    load('debts').then(function () {
      add(view, '', FULL, 'debts').setAttribute('aria-hidden', 'true');
      captions.forEach(function (caption, i) {
        caption.classList.toggle('is-active', i === captions.length - 1);
      });
    }, function () {});
    return;
  }

  // Tilt: the phone settles flat, where the small text of the screens is
  // sharpest, and leans only while the pointer or the page is moving.
  var pose = [7, rtl ? 17 : -17, 0];
  var point = [0, 0], lean = 0, spin = 0, stamp = 0, pace = 420, idle = 0, glare = null;
  var turn = function (now) {
    var dt = Math.min(64, now - (stamp || now));
    var k = 1 - Math.exp(-dt / pace);
    var goal = [lean * 6 - point[1] * 4, point[0] * 7, lean * -8];
    var still = true;
    stamp = now;
    for (var i = 0; i < 3; i++) {
      var gap = goal[i] - pose[i];
      if (Math.abs(gap) > .03) { still = false; pose[i] += gap * k; } else pose[i] = goal[i];
    }
    rig.style.transform = pose[0] || pose[1] || pose[2]
      ? 'rotateX(' + pose[0].toFixed(2) + 'deg) rotateY(' + pose[1].toFixed(2) + 'deg) translate3d(0,' + pose[2].toFixed(1) + 'px,0)'
      : 'none';
    if (glare) glare.style.transform = 'translate3d(' + (pose[1] * 2.4).toFixed(1) + '%,0,0)';
    if (still) { spin = 0; stamp = 0; pace = 240; } else spin = window.requestAnimationFrame(turn);
  };
  var nudge = function () {
    if (!spin) spin = window.requestAnimationFrame(turn);
  };
  var settle = function () {
    window.clearTimeout(idle);
    idle = window.setTimeout(function () { point = [0, 0]; lean = 0; pace = 420; nudge(); }, 700);
  };
  var onScroll = function () {
    var box = phone.getBoundingClientRect(), tall = window.innerHeight || 1;
    lean = Math.max(-.7, Math.min(1, (tall / 2 - box.top - box.height / 2) / tall));
    nudge();
    settle();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  var hero = root.closest('.hero');
  if (hero && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    hero.addEventListener('pointermove', function (event) {
      var box = hero.getBoundingClientRect();
      point = [
        Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1)),
        Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1))
      ];
      nudge();
      settle();
    });
  }
  nudge();

  // The story. Every moving part is one looping animation of the same length,
  // so they stay in step, pause together and can be set to any moment.
  var anims = [];
  var track = function (node, frames) {
    var list = frames.map(function (frame) {
      var key = { offset: Math.max(0, Math.min(1, frame[0] / T)) };
      for (var name in frame[1]) key[name] = frame[1][name];
      if (frame[2]) key.easing = frame[2];
      return key;
    });
    var edge = function (key, offset) {
      var copy = {};
      for (var name in key) if (name !== 'easing') copy[name] = key[name];
      copy.offset = offset;
      return copy;
    };
    if (list[0].offset > 0) list.unshift(edge(list[0], 0));
    if (list[list.length - 1].offset < 1) list.push(edge(list[list.length - 1], 1));
    var anim = node.animate(list, { duration: T, iterations: Infinity });
    anim.pause();
    anims.push(anim);
  };
  var fade = function (node, points) {
    track(node, points.map(function (point) { return [point[0], { opacity: point[1] }, point[2]]; }));
  };
  var enter = function (node, at, from) {
    fade(node, [[at, 0], [at + 160, 1]]);
    track(node, [[at, { transform: from }, OUT], [at + 380, { transform: 'none' }]]);
  };
  var rise = function (node, at) {
    track(node, [[at, { opacity: 0, transform: 'translate3d(0,3%,0)' }, OUT], [at + 420, { opacity: 1, transform: 'none' }]]);
  };

  // Numbers, written the way the app writes them: "SAR 45." and a lighter "00".
  var cents = function (text) { return Math.round(parseFloat(text) * 100) || 0; };
  var number = function (parent) {
    var node = plain(parent, 'story-num');
    var whole = document.createTextNode('');
    var part = document.createElement('b');
    node.appendChild(whole);
    node.appendChild(part);
    return function (value, faint) {
      var units = Math.floor(value / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      whole.data = (data.money || '{n}').replace('{n}', units + '.');
      part.textContent = ('0' + value % 100).slice(-2);
      node.classList.toggle('is-faint', !!faint);
    };
  };

  // Moments of the story, in milliseconds.
  var keys = (data.keys || '').split(' ').filter(Boolean);
  var pause = keys.length > 1 ? Math.min(600, 950 / (keys.length - 1)) : 0;
  var tFab = 1000, tKey = 1900, tOk = 3300, tCat = 4150, tSave = 5050;
  var tHome = 5700, tDebts = 7400, tPlane = 9300, tBudgets = 10500, tEnd = 14500;
  var cuts = [0, 1150, 3450, 5300, tDebts, tPlane, 10900, 12700, 14740];
  var keyBox = function (key) {
    var i = '123456789'.indexOf(key);
    var col = key === '0' ? 0 : key === '.' ? 1 : i % 3;
    var row = i < 0 ? 3 : Math.floor(i / 3);
    return [32 + col * 166, [870, 984, 1098, 1211][row], 158, 105];
  };
  var middle = function (box) { return [box[0] + box[2] / 2, box[1] + box[3] / 2]; };
  var okBox = [530, 1098, 158, 218], cellBox = flip([363, 398, 357, 129]), saveBox = [28, 1345, 664, 70];
  var balance = (data.balance || '0 0').split(' ').map(cents);

  var scenes = [], setAmount, setBalance;
  var build = function () {
    var scene = function (from, to) {
      var node = add(view, 'story-scene', FULL);
      node.setAttribute('aria-hidden', 'true');
      node.hidden = true;
      scenes.push([node, from, to]);
      return node;
    };

    // Home after the expense: the other figures change and the balance counts down.
    var home = scene(5100, 12100);
    var after = add(home, '', FULL, 'home_after');
    var ring = add(home, 'story-ring', [118, 290, 484, 132]);
    var total = add(home, 'story-bal', [190, 300, 340, 66]);
    setBalance = number(total);
    fade(after, [[tHome, 0, BOTH], [tHome + 800, 1], [12000, 1], [12001, 0]]);
    fade(total, [[5200, 0], [5350, 1], [12000, 1], [12001, 0]]);
    track(ring, [[tHome - 200, { opacity: 0, transform: 'scale(1.05)' }, OUT], [tHome + 150, { opacity: 1, transform: 'none' }], [7100, { opacity: 1, transform: 'none' }], [7400, { opacity: 0, transform: 'none' }]]);

    // New expense: the real form under the real keypad sheet.
    var form = scene(1100, 5600);
    add(form, '', FULL, 'form');
    var blank = add(form, 'story-undim', cellBox, 'amount'); // the category before it is chosen
    var tapCell = add(form, 'story-flash is-light', cellBox);
    var ringA = add(form, 'story-ring', flip([10, 405, 342, 114]));
    var ringC = add(form, 'story-ring', flip([370, 405, 340, 114]));
    var tapSave = add(form, 'story-flash is-light is-pill', saveBox);
    var dim = add(form, '', [0, 0, W, 566], 'amount');
    var scrim = add(form, 'story-scrim', [0, 566, W, 870]);
    var sheet = add(form, 'story-sheet', [0, 566, W, 870], 'amount');
    setAmount = number(add(sheet, 'story-amt', [30, 752, 660, 70]));
    var flash = function (node, at) { fade(node, [[at - 1, 0], [at + 50, 1], [at + 330, 0]]); };
    keys.forEach(function (key, i) {
      if (key === '.') fade(add(sheet, 'story-key', keyBox(key)), [[tKey + i * pause, 1], [tKey + i * pause + 80, 0]]);
      flash(add(sheet, 'story-flash', keyBox(key)), tKey + i * pause);
    });
    flash(add(sheet, 'story-flash is-light', okBox), tOk);
    flash(tapCell, tCat);
    flash(tapSave, tSave);
    fade(form, [[1150, 0], [1310, 1], [tSave + 200, 1], [tSave + 420, 0]]);
    track(form, [[1150, { transform: 'translate3d(0,5%,0)' }, OUT], [1530, { transform: 'none' }], [tSave + 150, { transform: 'none' }, BOTH], [tSave + 470, { transform: 'translate3d(0,6%,0)' }]]);
    track(sheet, [[1250, { transform: 'translate3d(0,101%,0)' }, OUT], [1700, { transform: 'none' }], [tOk + 150, { transform: 'none' }, BOTH], [tOk + 500, { transform: 'translate3d(0,101%,0)' }]]);
    fade(dim, [[tOk + 150, 1], [tOk + 450, 0]]);
    fade(scrim, [[tOk + 150, 1], [tOk + 450, 0]]);
    fade(ringA, [[tOk + 450, 0], [tOk + 650, 1], [tCat - 150, 1], [tCat, 0]]);
    fade(blank, [[tCat + 50, 1], [tCat + 300, 0]]);
    fade(ringC, [[tCat + 50, 0], [tCat + 250, 1], [tSave - 250, 1], [tSave - 50, 0]]);

    // Debts: what is owed to you, then what you owe.
    var side = 'translate3d(' + (rtl ? -7 : 7) + '%,0,0)';
    var debts = scene(tDebts - 50, tBudgets + 400);
    add(debts, '', FULL, 'debts');
    add(debts, 'story-paper', [0, 392, W, 1044]);
    rise(add(debts, '', [0, 396, W, 680], 'debts'), tDebts + 350);
    rise(add(debts, '', [0, 1076, W, 360], 'debts'), tDebts + 1100);
    enter(debts, tDebts, side);

    // Airplane mode: the app keeps working, here by opening the budgets.
    var budgets = scene(tBudgets - 50, T + 1);
    add(budgets, '', FULL, 'budgets');
    add(budgets, 'story-paper', [0, 250, W, 570]);
    rise(add(budgets, '', [0, 254, W, 279], 'budgets'), tBudgets + 250);
    rise(add(budgets, '', [0, 533, W, 280], 'budgets'), tBudgets + 400);
    fade(budgets, [[tBudgets, 0], [tBudgets + 160, 1], [tEnd, 1], [T, 0]]);
    track(budgets, [[tBudgets, { transform: side }, OUT], [tBudgets + 380, { transform: 'none' }]]);
    var air = add(view, 'story-air', [566, 17, 98, 32]);
    air.setAttribute('aria-hidden', 'true');
    air.innerHTML = PLANE;
    fade(air, [[tPlane + 500, 0], [tPlane + 750, 1], [tEnd, 1], [T, 0]]);
    glare = plain(view, 'story-glare');

    var chip = plain(phone, 'story-chip', PLANE + '<span></span><span class="story-switch"><span></span><i></i></span>');
    chip.children[1].textContent = data.plane || '';
    var up = 'translate3d(0,0,44px)';
    track(chip, [[tPlane, { opacity: 0, transform: 'translate3d(0,10px,44px)' }, OUT], [tPlane + 350, { opacity: 1, transform: up }], [tEnd, { opacity: 1, transform: up }], [tEnd + 300, { opacity: 0, transform: up }]]);
    fade(chip.querySelector('.story-switch span'), [[tPlane + 400, 0, BOTH], [tPlane + 600, 1]]);
    track(chip.querySelector('i'), [[tPlane + 400, { transform: 'none' }, BOTH], [tPlane + 600, { transform: 'translate3d(' + (rtl ? -12 : 12) + 'px,0,0)' }]]);

    // The finger: one dot that travels between the taps.
    var taps = [[tFab, flip([582, 1220])]];
    keys.forEach(function (key, i) { taps.push([tKey + i * pause, middle(keyBox(key))]); });
    taps.push([tOk, middle(okBox)], [tCat, middle(cellBox)], [tSave, middle(saveBox)]);
    var at = function (spot) {
      return { transform: 'translate3d(' + (spot[0] / W * 100).toFixed(2) + '%,' + (spot[1] / H * 100).toFixed(2) + '%,0)' };
    };
    var tap = plain(plain(phone, 'story-touch'), 'story-tap');
    var dot = plain(tap, 'story-dot'), ripple = plain(tap, 'story-ripple');
    var path = [[tFab - 450, at([taps[0][1][0] + (rtl ? -46 : 46), taps[0][1][1] + 96]), OUT]];
    var press = [], rings = [];
    taps.forEach(function (item, i) {
      var next = taps[i + 1] ? taps[i + 1][0] - item[0] : 600;
      path.push([item[0] - 110, at(item[1])], [item[0] + 160, at(item[1]), BOTH]);
      press.push([item[0] - 110, { transform: 'none' }], [item[0], { transform: 'scale(.8)' }], [item[0] + 200, { transform: 'none' }]);
      rings.push([item[0] - 1, { opacity: 0, transform: 'none' }], [item[0], { opacity: .8, transform: 'none' }, OUT], [item[0] + Math.min(420, next - 30), { opacity: 0, transform: 'scale(2.4)' }]);
    });
    track(tap, path);
    fade(tap, [[tFab - 450, 0], [tFab - 200, 1], [tSave + 200, 1], [tSave + 450, 0]]);
    track(dot, press);
    track(ripple, rings);

    // Captions, and the line that shows how far the story has come.
    captions.forEach(function (caption, i) {
      var shown = { opacity: 1, transform: 'none' }, low = { opacity: 0, transform: 'translate3d(0,6px,0)' };
      track(caption, i
        ? [[cuts[i], low, OUT], [cuts[i] + 280, shown], [cuts[i + 1], shown], [cuts[i + 1] + 220, { opacity: 0, transform: 'none' }]]
        : [[0, shown], [cuts[1], shown], [cuts[1] + 220, { opacity: 0, transform: 'none' }], [cuts[8], low, OUT], [T, shown]]);
    });
    if (progress) {
      [0, 1, 2, 3, 4, 5, 7].forEach(function (first, i, all) {
        var bar = document.createElement('i');
        progress.appendChild(document.createElement('span')).appendChild(bar);
        track(bar, [[cuts[first], { transform: 'scaleX(0)' }], [cuts[all[i + 1] || 8], { transform: 'scaleX(1)' }]]);
      });
      fade(progress, [[cuts[8], 1], [T, 0]]);
    }
  };

  // What changes with time but cannot be animated: which scenes exist, and the digits.
  var seen = {};
  var render = function (now) {
    scenes.forEach(function (item) {
      var hide = now < item[1] || now > item[2];
      if (item[0].hidden !== hide) item[0].hidden = hide;
    });
    var typed = '';
    if (now > 1100 && now < 5600) keys.forEach(function (key, i) { if (now >= tKey + i * pause) typed += key; });
    if (typed !== seen.typed) {
      seen.typed = typed;
      setAmount(cents(typed || '0'), typed.indexOf('.') < 0);
    }
    var part = Math.max(0, Math.min(1, (now - tHome) / 1200));
    part = part < .5 ? 4 * part * part * part : 1 - Math.pow(2 - 2 * part, 3) / 2;
    var value = Math.round(balance[0] + (balance[1] - balance[0]) * part);
    if (value !== seen.value) {
      seen.value = value;
      setBalance(value);
    }
  };

  var ready = false, paused = false, visible = true, playing = false, frame = 0;
  var tick = function () {
    render(anims[0].currentTime % T);
    frame = window.requestAnimationFrame(tick);
  };
  var sync = function () {
    var want = ready && !paused && visible && !document.hidden;
    if (want === playing) return;
    playing = want;
    var now = anims[0].currentTime;
    anims.forEach(function (anim) {
      if (want) { anim.currentTime = now; anim.play(); } else anim.pause();
    });
    window.cancelAnimationFrame(frame);
    if (want) tick();
  };
  var setPaused = function (value) {
    paused = value;
    if (toggle) {
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      toggle.setAttribute('aria-label', paused ? toggle.dataset.play : toggle.dataset.pause);
    }
    sync();
  };

  var start = function () {
    var fonts = document.fonts && document.fonts.load
      ? [200, 500, 700].map(function (weight) { return document.fonts.load(weight + ' 10px "Cairo Digits"'); })
      : [];
    Promise.all(['home_after', 'amount', 'form', 'debts', 'budgets'].map(load).concat(fonts)).then(function () {
      build();
      render(0);
      ready = true;
      root.classList.add('is-live');
      if (toggle) {
        toggle.hidden = false;
        toggle.addEventListener('click', function () { setPaused(!paused); });
      }
      document.addEventListener('visibilitychange', sync);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          visible = entries[entries.length - 1].isIntersecting;
          sync();
        }, { threshold: 0.2 }).observe(root);
      }
      // Lets a test, or a later control, hold the story at one moment.
      root.addEventListener('story-seek', function (event) {
        var now = Number(event.detail) || 0;
        setPaused(true);
        anims.forEach(function (anim) { anim.currentTime = now; });
        render(now % T);
      });
      sync();
    }, function () {});
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
