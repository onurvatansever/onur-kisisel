// Hat O — framework yok, sadece DOM.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const up = (s) => s.toLocaleUpperCase('tr-TR');
  const pad = (n) => String(n).padStart(2, '0');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Saat ---------- */
  const clock = $('#clock');
  const nowCell = $('#nowCell');
  const tick = () => {
    const d = new Date();
    clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    nowCell.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  tick(); setInterval(tick, 1000);

  /* ---------- Kalkış panosu (split-flap) ---------- */
  const DEST_LEN = 22, MIN_LEN = 6;
  const CHARS = ' ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789:·-';
  const rows = [
    { color: 'var(--green)', msgs: [['ANADOLU REHBER', 'PERON 2'], ['İKİ EYLÜL', '4 DK'], ['YUNUS EMRE', '7 DK']] },
    { color: 'var(--orange)', msgs: [['CARVO · GECE SEFERİ', '02:00'], ['İSTANBUL · KOCAELİ', 'SAHA'], ['CARVOV2', 'V2']] },
    { color: 'var(--blue)', msgs: [['FİZİKÇİLER MEYDANI', '4 HAT'], ['NOBEL · HEISENBERG', 'AKT.'], ['FERMI · MEITNER', 'AKT.']] },
    { color: 'var(--red)', msgs: [['İNŞAAT HALİNDEKİ DURAK', 'BELİRS'], ['SON DURAK DEĞİL', '∞'], ['ONUR VATANSEVER', 'ŞİMDİ']] },
  ];
  const boardRows = $('#boardRows');
  const makeFlaps = (el, len) => {
    el.innerHTML = '';
    for (let i = 0; i < len; i++) {
      const f = document.createElement('span');
      f.className = 'flap'; f.textContent = '\u00a0';
      el.appendChild(f);
    }
    return $$('.flap', el);
  };
  const setFlaps = (flaps, text, alignRight = false) => {
    text = up(text).slice(0, flaps.length);
    const padded = alignRight ? text.padStart(flaps.length, ' ') : text.padEnd(flaps.length, ' ');
    flaps.forEach((f, i) => {
      const target = padded[i] === ' ' ? '\u00a0' : padded[i];
      if (reduced) { f.textContent = target; return; }
      let n = 0;
      const steps = 4 + Math.floor(Math.random() * 6) + i % 5;
      clearInterval(f._t);
      f.classList.add('spin');
      f._t = setInterval(() => {
        if (++n >= steps) {
          clearInterval(f._t); f.textContent = target; f.classList.remove('spin');
        } else {
          f.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }, 45);
    });
  };
  const live = rows.map((r) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span class="row__line" style="background:${r.color}">O</span><span class="row__dest"></span><span class="row__min"></span>`;
    boardRows.appendChild(row);
    const dest = makeFlaps($('.row__dest', row), DEST_LEN);
    const min = makeFlaps($('.row__min', row), MIN_LEN);
    return { r, dest, min, i: 0 };
  });
  const show = (L) => {
    const [d, m] = L.r.msgs[L.i % L.r.msgs.length];
    setFlaps(L.dest, d); setFlaps(L.min, m, true);
  };
  live.forEach((L, k) => setTimeout(() => show(L), 200 + k * 250));
  setInterval(() => {
    live.forEach((L, k) => setTimeout(() => { L.i++; show(L); }, k * 400));
  }, 5200);

  /* ---------- Tramvay & hat ---------- */
  const line = $('#line');
  const tram = $('#tram');
  const done = $('#lineDone');
  const stops = $$('.stop');
  stops.forEach((s) => s.style.setProperty('--c', s.dataset.color));

  let ticking = false;
  const place = () => {
    ticking = false;
    const rect = line.getBoundingClientRect();
    const h = line.offsetHeight;
    const y = Math.max(0, Math.min(h - tram.offsetHeight, innerHeight * 0.45 - rect.top));
    tram.style.transform = `translateY(${y}px)`;
    done.style.height = `${y + tram.offsetHeight / 2}px`;
    let current = null;
    stops.forEach((s) => {
      const dot = $('.stop__dot', s);
      const dotY = s.offsetTop + dot.offsetTop;
      const passed = y + tram.offsetHeight / 2 >= dotY;
      s.classList.toggle('passed', passed);
      if (passed) current = s;
    });
    done.style.background = current ? current.dataset.color : 'var(--red)';
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(place); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  place();

  /* ---------- Carvo gece vardiyası ---------- */
  const lot = $('#lot');
  const carsEl = $('#lotCars');
  const van = $('#van');
  const lotTime = $('#lotTime');
  const shiftBtn = $('#shiftBtn');
  const CAR_COLORS = ['#6f6a5c', '#5d6470', '#7a6650', '#5a5a5a', '#6b6f5e'];
  for (let i = 0; i < 6; i++) {
    const c = document.createElement('div');
    c.className = 'car';
    c.style.background = CAR_COLORS[i % CAR_COLORS.length];
    c.innerHTML = '<span class="dust"></span><span class="sparkle">✓</span>';
    carsEl.appendChild(c);
  }
  const cars = $$('.car', carsEl);
  let running = false, finished = false;

  const resetLot = () => {
    cars.forEach((c, i) => { c.classList.remove('clean'); c.style.background = CAR_COLORS[i % CAR_COLORS.length]; });
    lot.classList.remove('dawn');
    van.style.transform = 'translateX(0)';
    lotTime.textContent = '02:00';
    finished = false;
  };

  shiftBtn.addEventListener('click', () => {
    if (running) return;
    if (finished) resetLot();
    running = true;
    shiftBtn.disabled = true;
    shiftBtn.textContent = 'Vardiya sürüyor…';
    const W = lot.clientWidth + 300;
    const dur = reduced ? 10 : 5200;
    const t0 = performance.now();
    const lotLeft = lot.getBoundingClientRect().left;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const x = p * W;
      van.style.transform = `translateX(${x}px)`;
      const mins = Math.round(p * 210); // 02:00 → 05:30
      lotTime.textContent = `${pad(2 + Math.floor(mins / 60))}:${pad(mins % 60)}`;
      const vanFront = van.getBoundingClientRect().right - lotLeft;
      cars.forEach((c) => {
        const r = c.getBoundingClientRect();
        if (!c.classList.contains('clean') && vanFront > r.right - lotLeft + 30) {
          c.classList.add('clean'); c.style.background = '';
        }
      });
      if (p < 1) return requestAnimationFrame(step);
      cars.forEach((c) => { c.classList.add('clean'); c.style.background = ''; });
      lot.classList.add('dawn');
      running = false; finished = true;
      shiftBtn.disabled = false;
      shiftBtn.textContent = 'Filo temiz, şebeke suyu: 0 L. Tekrar?';
    };
    requestAnimationFrame(step);
  });

  /* ---------- Fizikçiler ---------- */
  $$('.sci__card').forEach((b) => b.addEventListener('click', () => b.classList.toggle('open')));

  /* ---------- İnşaat halindeki duraklar ---------- */
  const questions = [
    ['bolum', 'Hangi bölümde okuyorsun?'],
    ['takim', 'Eskişehirspor mu, başka bir takım mı, hiçbiri mi?'],
    ['icecek', 'Çay mı, kahve mi?'],
    ['carvo', 'Carvo gerçek bir girişim mi, ders projesi mi?'],
    ['muzik', 'Kod yazarken ne dinliyorsun?'],
    ['mekan', 'Eskişehir\'de en sevdiğin yer?'],
  ];
  const KEY = 'hatO.answers';
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  const wip = $('#wip');
  questions.forEach(([k, q]) => {
    const item = document.createElement('div');
    item.className = 'wip__item';
    item.innerHTML = `
      <label for="q-${k}">${q}</label>
      <input id="q-${k}" type="text" maxlength="60" placeholder="—" autocomplete="off">
      <span class="state"></span>`;
    const input = $('input', item);
    const state = $('.state', item);
    const render = () => {
      const v = (saved[k] || '').trim();
      item.classList.toggle('done', !!v);
      state.textContent = v ? 'DURAK HİZMETE AÇILDI' : 'YAPIM AŞAMASINDA · BİLGİ YOK';
    };
    input.value = saved[k] || '';
    input.addEventListener('input', () => {
      saved[k] = input.value;
      localStorage.setItem(KEY, JSON.stringify(saved));
      render();
    });
    render();
    wip.appendChild(item);
  });

  /* ---------- Kart okut ---------- */
  const pass = $('#pass');
  const stamp = $('#stamp');
  let rides = 0;
  $('#validate').addEventListener('click', () => {
    const d = new Date();
    rides++;
    pass.classList.remove('ok'); void pass.offsetWidth; pass.classList.add('ok');
    stamp.textContent = `OKUNDU\n${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}\n${pad(d.getHours())}:${pad(d.getMinutes())}\nBİNİŞ ${rides}`;
  });
})();
