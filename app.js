// Onur Vatansever — framework yok.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, '0');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const today = () => { const d = new Date(); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; };

  /* =========================================================
     1) KÖPÜKLÜ PLAKA
     ========================================================= */
  const PLATE = '26ONR88';
  const GAPS = new Set([2, 5]);              // "26 ONR 88"
  // Onur'un botundaki matris (B↔8, D↔0, M↔N, S↔5) + plakadaki diğer benzerler
  const LOOKALIKE = { '2': 'Z', '6': 'G', 'O': '0', 'N': 'M', 'R': 'P', '8': 'B' };

  const plate = $('#plate');
  const charsEl = $('#plateChars');
  const canvas = $('#foam');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const rawEl = $('#raw'), fixedEl = $('#fixed'), confEl = $('#conf'), msgEl = $('#msg'), hint = $('#hint');

  [...PLATE].forEach((c, i) => {
    if (GAPS.has(i)) charsEl.appendChild(Object.assign(document.createElement('span'), { className: 'gap' }));
    charsEl.appendChild(Object.assign(document.createElement('span'), { className: 'ch', textContent: c }));
  });
  const chSpans = $$('.ch', charsEl);

  let W = 0, H = 0, dpr = 1, boxes = [], brush = 30, logged = false, prevClean = false;

  function drawFoam() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#eef1f4';
    ctx.fillRect(0, 0, W, H);
    const n = Math.round((W * H) / 900);
    for (let i = 0; i < n; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const r = (3 + Math.random() ** 2 * 26) * dpr;
      const g = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(.75, 'rgba(236,241,245,1)');
      g.addColorStop(1, 'rgba(196,208,218,1)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (r > 8 * dpr && Math.random() < .5) {
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ctx.beginPath(); ctx.arc(x - r * .4, y - r * .4, r * .18, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function measure() {
    const pr = canvas.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    const nw = Math.round(pr.width * dpr), nh = Math.round(pr.height * dpr);
    const resized = nw !== W || nh !== H;
    if (resized) { W = canvas.width = nw; H = canvas.height = nh; }
    brush = pr.height * .36 * dpr;
    boxes = chSpans.map((s) => {
      const r = s.getBoundingClientRect();
      return { x: (r.left - pr.left) * dpr, y: (r.top - pr.top + r.height * .12) * dpr, w: r.width * dpr, h: r.height * .76 * dpr };
    });
    if (resized) { drawFoam(); logged = false; evaluate(); }
  }

  function wipeAt(x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createRadialGradient(x, y, 0, x, y, brush);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(.55, 'rgba(0,0,0,.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, brush, 0, Math.PI * 2); ctx.fill();
  }
  function wipeLine(a, b) {
    const d = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.max(1, Math.ceil(d / (brush * .25)));
    for (let i = 1; i <= steps; i++) wipeAt(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps);
  }

  function coverage() {
    const data = ctx.getImageData(0, 0, W, H).data;
    return boxes.map((b) => {
      let sum = 0, n = 0;
      const step = Math.max(2, Math.round(3 * dpr));
      for (let y = b.y | 0; y < b.y + b.h; y += step) for (let x = b.x | 0; x < b.x + b.w; x += step) {
        sum += data[((y * W + x) << 2) + 3]; n++;
      }
      return n ? sum / n / 255 : 1;
    });
  }

  function fmt(arr) {
    return arr.map((c, i) => (GAPS.has(i) ? ' ' : '') + c).join('');
  }

  function evaluate() {
    const cov = coverage();
    const read = cov.map((c, i) => c > .55 ? '?' : c > .16 ? (LOOKALIKE[PLATE[i]] || PLATE[i]) : PLATE[i]);
    const q = read.filter((c) => c === '?').length;
    const wrong = read.map((c, i) => (c !== '?' && c !== PLATE[i]) ? i : -1).filter((i) => i >= 0);
    rawEl.innerHTML = read.map((c, i) => (GAPS.has(i) ? ' ' : '') + (c !== PLATE[i] ? `<span class="x">${c}</span>` : c)).join('');
    const avg = cov.reduce((a, b) => a + b, 0) / cov.length;
    confEl.textContent = `güven %${Math.max(0, Math.round((1 - avg) * 100 - q * 4))}`;

    if (q === PLATE.length) {
      fixedEl.textContent = '—';
      msgEl.textContent = 'Plaka köpük altında. Okunacak bir şey yok.';
    } else if (q > 0) {
      fixedEl.textContent = '—';
      msgEl.textContent = `${q} karakter okunamıyor. Filo hafızası bile tahmin edemez. Biraz daha sil.`;
    } else if (wrong.length) {
      fixedEl.textContent = fmt([...PLATE]);
      const pairs = wrong.map((i) => `${read[i]}→${PLATE[i]}`).join(', ');
      msgEl.textContent = `Görsel karışıklık matrisi ${wrong.length} karakteri düzeltti (${pairs}). Filo kaydıyla eşleşti.`;
    } else {
      fixedEl.textContent = fmt([...PLATE]);
      if (!prevClean) {
        msgEl.innerHTML = logged
          ? 'Temiz okuma. ℹ️ Bu araç bugün zaten kaydedilmiş.'
          : '✅ <b>Plaka Kaydedildi:</b> 26ONR88 · 📊 Bugünkü toplam: 1 ziyaretçi';
        logged = true;
      }
      prevClean = true;
      hint.textContent = 'çift tıkla: tekrar köpükle';
      return;
    }
    prevClean = false;
  }

  let evalQueued = false;
  const queueEval = () => { if (!evalQueued) { evalQueued = true; setTimeout(() => { evalQueued = false; evaluate(); }, 90); } };

  let last = null;
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr }; };
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); last = pos(e); wipeAt(last.x, last.y); queueEval(); hint.style.opacity = .4; });
  canvas.addEventListener('pointermove', (e) => {
    if (!last) return;
    const p = pos(e); wipeLine(last, p); last = p; queueEval();
  });
  const end = () => { last = null; evaluate(); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('dblclick', () => { drawFoam(); logged = false; hint.textContent = '← sürükle, köpüğü sil →'; hint.style.opacity = 1; evaluate(); });

  // İlk açılışta kısa bir silme hareketi: ne yapılacağını gösterir, ham okumada hatalar belirir.
  async function demoStroke() {
    if (reduced) { wipeLine({ x: boxes[0].x, y: H * .5 }, { x: boxes[3].x + boxes[3].w, y: H * .5 }); evaluate(); return; }
    const a = { x: boxes[0].x - brush * .3, y: H * .78 }, b = { x: boxes[4].x + boxes[4].w * .3, y: H * .3 };
    let prev = a;
    for (let i = 1; i <= 24; i++) {
      const t = i / 24, e = t * t * (3 - 2 * t);
      const p = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e + Math.sin(t * Math.PI) * H * .08 };
      wipeLine(prev, p); prev = p;
      if (i % 4 === 0) evaluate();
      await sleep(28);
    }
    evaluate();
  }

  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(measure, 150); });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { measure(); setTimeout(demoStroke, 500); });

  /* =========================================================
     2) SAHA: gece vardiyası + Telegram botu
     ========================================================= */
  const FLEET = [
    { p: '34 KLN 458', raw: 'KLM 456', why: 'eksik il kodu + M↔N, 6↔8' },
    { p: '34 BDS 120', raw: '34 8D5 120', why: 'B↔8, S↔5' },
    { p: '34 ACE 902', raw: '34 ACE 902', why: null },
    { p: '34 MAR 731', raw: '34 NAR 731', why: 'M↔N' },
    { p: '34 SDB 805', raw: '34 5D8 805', why: 'S↔5, B↔8' },
  ];
  const COLORS = ['#6f6a5c', '#5d6470', '#7a6650', '#5a5a5a', '#6b6f5e'];
  const lot = $('#lot'), carsEl = $('#lotCars'), van = $('#van'), lotTime = $('#lotTime');
  const log = $('#tgLog'), shiftBtn = $('#shiftBtn'), bugunBtn = $('#cmdBugun'), excelBtn = $('#cmdExcel'), tgStatus = $('#tgStatus');

  FLEET.forEach((f, i) => {
    const c = document.createElement('div');
    c.className = 'car'; c.style.background = COLORS[i];
    c.innerHTML = `<span class="dust"></span><span class="pl">${f.p}</span>`;
    carsEl.appendChild(c);
  });
  const cars = $$('.car', carsEl);
  let washed = [], running = false;

  const say = (html, who = 'bot') => {
    const m = document.createElement('div');
    m.className = `msg msg--${who}`; m.innerHTML = html;
    log.appendChild(m); log.scrollTop = log.scrollHeight;
    return m;
  };
  const compact = (p) => p.replace(/\s/g, '');
  const markRaw = (raw, fixed) => {
    if (raw.length !== fixed.length) return `<s>${raw}</s>`;
    return [...raw].map((c, i) => c !== fixed[i] ? `<s>${c}</s>` : c).join('');
  };
  const BTNS = '<span class="btns"><span>↩ Geri al</span><span>✎ Değiştir</span></span>';

  async function report(f) {
    const visible = visibleCars().includes(f);
    if (!visible) { washed.push(f); return; }
    say(`<span class="photo" data-p="${f.raw}"></span>`, 'me');
    tgStatus.textContent = 'yazıyor…';
    await sleep(reduced ? 0 : 420);
    washed.push(f);
    const rawLine = f.why
      ? `<span class="raw">ham: ${markRaw(f.raw, f.p)} → filo eşleşmesi (${f.why})</span>`
      : `<span class="raw">ham: ${f.raw} · temiz okuma</span>`;
    say(`${rawLine}✅ <b>Plaka Kaydedildi:</b> <code>${compact(f.p)}</code><br>📊 Bugünkü toplam: <b>${washed.length} araç</b>${BTNS}`);
    tgStatus.textContent = 'bot · çevrimiçi';
  }
  const visibleCars = () => FLEET.filter((_, i) => getComputedStyle(cars[i]).display !== 'none');

  shiftBtn.addEventListener('click', () => {
    if (running) return;
    running = true; washed = [];
    shiftBtn.disabled = bugunBtn.disabled = excelBtn.disabled = true;
    $$('.msg', log).forEach((m) => m.remove());
    cars.forEach((c, i) => { c.classList.remove('clean'); c.style.background = COLORS[i]; });
    lot.classList.remove('dawn');

    const lotRect = lot.getBoundingClientRect();
    const W = lot.clientWidth + 300, dur = reduced ? 10 : 9000, t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      van.style.transform = `translateX(${p * W}px)`;
      const mins = Math.round(p * 210);
      lotTime.textContent = `${pad(2 + Math.floor(mins / 60))}:${pad(mins % 60)}`;
      const front = van.getBoundingClientRect().right - lotRect.left;
      cars.forEach((c, i) => {
        if (c.classList.contains('clean')) return;
        const r = c.getBoundingClientRect();
        if (front > r.right - lotRect.left + 30) { c.classList.add('clean'); c.style.background = ''; report(FLEET[i]); }
      });
      if (p < 1) return requestAnimationFrame(step);
      cars.forEach((c, i) => { if (!c.classList.contains('clean')) { c.classList.add('clean'); c.style.background = ''; report(FLEET[i]); } });
      lot.classList.add('dawn');
      running = false;
      shiftBtn.disabled = bugunBtn.disabled = excelBtn.disabled = false;
      shiftBtn.textContent = '↻ Tekrar';
    };
    requestAnimationFrame(step);
  });

  bugunBtn.addEventListener('click', async () => {
    say('/bugun', 'me');
    await sleep(300);
    say(`📋 <b>Bugün yıkananlar (${today()})</b><br>${washed.map((f, i) => `${i + 1}. <code>${compact(f.p)}</code>`).join('<br>')}<br>📊 Toplam: <b>${washed.length} araç</b>`);
  });

  excelBtn.addEventListener('click', async () => {
    say('/excel', 'me');
    await sleep(300);
    const rows = [['Plaka', today()], ...washed.map((f) => [compact(f.p), '✓'])];
    const blob = buildXlsx(rows);
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'yikama_takip.xlsx' });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    say(`📎 <b>yikama_takip.xlsx</b> · ${(blob.size / 1024).toFixed(1)} KB<br><span class="raw">pandas yok, openpyxl yok: zip + XML, tarayıcıda.</span>`);
  });

  // --- Sıfır bağımlılıklı .xlsx (Onur'un Lambda'daki yaklaşımının tarayıcı versiyonu) ---
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function buildXlsx(rows) {
    const col = (i) => String.fromCharCode(65 + i);
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => `<c r="${col(ci)}${ri + 1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
    const files = {
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Yikama" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/worksheets/sheet1.xml': sheet,
    };
    const enc = new TextEncoder(), parts = [], central = [];
    let offset = 0;
    const d = new Date();
    const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const [name, text] of Object.entries(files)) {
      const nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nb.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nb, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nb.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nb);
      offset += 30 + nb.length + data.length;
    }
    const cdSize = central.reduce((a, b) => a + b.length, 0);
    const eo = new DataView(new ArrayBuffer(22));
    const n = Object.keys(files).length;
    eo.setUint32(0, 0x06054b50, true); eo.setUint16(8, n, true); eo.setUint16(10, n, true);
    eo.setUint32(12, cdSize, true); eo.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(eo.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /* =========================================================
     3) BETTERMEDIUM: örnek digest
     ========================================================= */
  const STORIES = [
    ['Stop using regex for license plates', 'Deniz K. · 6 dk', 'pub'],
    ['I replaced my cron jobs with Lambda. Here is the bill.', 'M. Arslan · 9 dk', 'fl'],
    ['The quiet death of the dashboard', 'Leah Moreno · 7 dk', 'lock'],
    ['A gentle introduction to model stacking', 'Ece T. · 12 dk', 'pub'],
    ['Your A/B test probably found nothing (and that is fine)', 'J. Park · 5 dk', 'fl'],
    ['10 VS Code themes that will change your life', 'Growth Hacker · 3 dk', 'lock'],
  ];
  const LBL = { pub: ['HERKESE AÇIK', 'lbl--pub'], fl: ['FRIEND LINK', 'lbl--fl'], lock: ['ÜYE ÖZEL · GÖSTERİLMEZ', 'lbl--lock'] };
  const mail = $('.mail'), list = $('#mailList'), bmSum = $('#bmSum');
  STORIES.forEach(([t, a, k]) => {
    const li = document.createElement('li');
    if (k === 'lock') li.className = 'locked';
    li.innerHTML = `<b>${t}</b><small>${a}</small><span class="lbl ${LBL[k][1]}">${LBL[k][0]}</span>`;
    list.appendChild(li);
  });
  $('#bmToggle').addEventListener('change', (e) => {
    mail.classList.toggle('on', e.target.checked);
    const c = (k) => STORIES.filter((s) => s[2] === k).length;
    bmSum.textContent = e.target.checked
      ? `${c('pub')} herkese açık · ${c('fl')} friend link · ${c('lock')} üye özel, ücretsiz diye gösterilmedi.`
      : 'Eklenti kapalı. Hepsi aynı görünüyor. (Örnek digest, başlıklar uydurma.)';
  });
  bmSum.textContent = 'Eklenti kapalı. Hepsi aynı görünüyor. (Örnek digest, başlıklar uydurma.)';

  /* =========================================================
     4) DEFTER: barlar ve korelasyonlar görünür olunca
     ========================================================= */
  const bars = $$('.bar');
  bars.forEach((b) => { if (b.dataset.w) b.dataset.wl = ` · ağırlık %${b.dataset.w}`; });
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    if (en.target.id === 'bars') {
      bars.forEach((b) => b.style.setProperty('--fill', `${((+b.dataset.v - 70) / 10) * 100}%`));
    } else if (en.target.id === 'corr') {
      $$('b[data-r]', en.target).forEach((el) => {
        const target = +el.dataset.r, t0 = performance.now(), D = reduced ? 1 : 1100;
        const f = (t) => {
          const p = Math.min(1, (t - t0) / D), v = target * (1 - (1 - p) ** 3);
          el.textContent = (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
          if (p < 1) requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      });
    }
  }), { threshold: .4 });
  io.observe($('#bars')); io.observe($('#corr'));
})();
