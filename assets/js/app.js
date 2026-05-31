/* =============================================================================
   Mesa Zoning Modernization — UI wiring & content rendering
   ========================================================================== */
(function () {
  'use strict';

  /* ---- inline SVG icons for the standards grid --------------------------- */
  const ICONS = {
    canopy: '<path d="M3 11l9-5 9 5"/><path d="M5 11v8M19 11v8M9 19v-4h6v4"/>',
    light:  '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10c.7.7 1 1.4 1 2h6c0-.6.3-1.3 1-2a6 6 0 0 0-4-10z"/>',
    queue:  '<rect x="3" y="14" width="6" height="5" rx="1"/><rect x="11" y="14" width="6" height="5" rx="1"/><path d="M6 14V9a3 3 0 0 1 3-3h0M14 14V9a3 3 0 0 1 3-3h2"/>',
    home:   '<path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/><path d="M10 19v-5h4v5"/>',
    screen: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9h16M4 14h16M9 4v16M14 4v16"/>',
    park:   '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 16V8h3.5a2.5 2.5 0 0 1 0 5H9"/>',
  };
  function svgIcon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
            stroke-linecap="round" stroke-linejoin="round" class="std-icon">${ICONS[name] || ''}</svg>`;
  }

  /* ---- render: technology cards ----------------------------------------- */
  function techCard(t) {
    const media = `<div class="tech-media${t.img2 ? ' tech-media-2' : ''}">
        <img src="${t.img}" alt="${t.name}" loading="lazy" />
        ${t.img2 ? `<img src="${t.img2}" alt="${t.name}" loading="lazy" />` : ''}
      </div>`;
    const tag = t.tag ? `<div class="tech-tag">${t.tag}</div>` : '';
    const link = t.link
      ? `<a class="tech-link" href="${t.link}" target="_blank" rel="noopener">${t.linkLabel || 'Learn more'} ↗</a>`
      : '';
    const credit = t.credit ? `<span class="credit">${t.credit}</span>` : '';
    return `
      <article class="tech-card">
        ${media}
        <div class="tech-body">
          ${tag}
          <h4>${t.name}</h4>
          <p>${t.body}</p>
          <div class="tech-foot">${link}${credit}</div>
        </div>
      </article>`;
  }
  function renderTech() {
    document.getElementById('droneGrid').innerHTML = TECH_DRONES.map(techCard).join('');
    document.getElementById('evGrid').innerHTML = TECH_EV.map(techCard).join('');
  }

  /* ---- render: pending-legislation note --------------------------------- */
  function renderLegislation() {
    const L2 = LEGISLATION;
    document.getElementById('legNote').innerHTML = `
      <div class="leg-mark">⚖︎</div>
      <div class="leg-body">
        <div class="leg-head">
          <span class="leg-badge">${L2.status}</span>
          <h4>Why the code says “aerial-based vehicles,” not “drones”</h4>
        </div>
        <ul>${L2.points.map((p) => `<li>${p}</li>`).join('')}</ul>
        <p class="leg-take">${L2.takeaway}
          <a href="${L2.url}" target="_blank" rel="noopener">Read ${L2.bill} ↗</a></p>
      </div>`;
  }

  /* ---- render: comparison chart ----------------------------------------- */
  function cell(useKey, code) {
    const cur = getStatus(useKey, 'current', code);
    const pro = getStatus(useKey, 'proposed', code);
    const glyph = (s) => (s.key === 'P' ? 'P' : s.key === 'A' ? 'A' : '—');
    const cls = (s) => (s.key === 'P' ? 'c-p' : s.key === 'A' ? 'c-a' : 'c-n');
    const wasAllowed = cur.key === 'P' || cur.key === 'A';
    const nowAllowed = pro.key === 'P' || pro.key === 'A';
    // A real change is a flip in allowed-ness, or a P<->A reclassification.
    // "not allowed -> not allowed" (incl. a new use that still isn't permitted here) is NOT a change.
    let changed = false, dir = '';
    if (wasAllowed !== nowAllowed) {
      changed = true;
      dir = nowAllowed ? ' ch-add' : ' ch-rem';
    } else if (wasAllowed && nowAllowed && cur.key !== pro.key) {
      changed = true; dir = ' ch-mod';
    }
    return `<td class="cell${changed ? ' changed' + dir : ''}">
        <span class="dot ${cls(cur)}">${glyph(cur)}</span>
        <span class="arrow">→</span>
        <span class="dot ${cls(pro)}">${glyph(pro)}</span>
      </td>`;
  }

  function renderChart() {
    const uses = USE_ORDER; // light_fleet, heavy_fleet, accessory_ev
    // header
    let head = `<thead>
      <tr class="h-top">
        <th class="sticky-col" rowspan="2">Zoning District</th>
        ${uses.map((u) => `<th colspan="1" class="use-h">${USES[u].short}${USES[u].isNew ? ' <span class="mini-new">NEW</span>' : ''}</th>`).join('')}
      </tr>
      <tr class="h-sub">
        ${uses.map(() => `<th class="sub-h">Today&nbsp;→&nbsp;Proposed</th>`).join('')}
      </tr></thead>`;
    // body grouped
    let body = '<tbody>';
    CHART_GROUPS.forEach((g) => {
      body += `<tr class="grp"><td class="sticky-col grp-label" colspan="${uses.length + 1}">${g.group} districts</td></tr>`;
      g.codes.forEach((code) => {
        const d = DISTRICTS[code];
        body += `<tr>
          <th class="sticky-col row-h"><span class="rcode">${code}</span><span class="rname">${d ? d.name : ''}</span></th>
          ${uses.map((u) => cell(u, code)).join('')}
        </tr>`;
      });
    });
    body += '</tbody>';
    document.getElementById('changeChart').innerHTML = head + body;

    document.getElementById('chartLegend').innerHTML = [
      ['c-p', 'P', 'Permitted'],
      ['c-a', 'A', 'Accessory use'],
      ['c-n', '—', 'Not permitted'],
    ].map(([c, g, l]) => `<span class="cl-item"><span class="dot ${c}">${g}</span>${l}</span>`).join('') +
      `<span class="cl-item"><span class="dot ch-add-sw"></span>Newly allowed</span>` +
      `<span class="cl-item"><span class="dot ch-rem-sw"></span>No longer allowed</span>`;

    document.getElementById('chartNote').innerHTML =
      `<strong>In words:</strong> ${USES.light_fleet.notes} ${USES.heavy_fleet.notes} ${USES.accessory_ev.notes}`;
  }

  /* ---- render: standards ------------------------------------------------- */
  function renderStandards() {
    document.getElementById('standardsGrid').innerHTML = STANDARDS.map((s) => `
      <article class="std-card">
        <div class="std-head">${svgIcon(s.icon)}<h4>${s.title}</h4></div>
        <ul>${s.items.map((i) => `<li>${i}</li>`).join('')}</ul>
      </article>`).join('');
  }

  /* ---- render: FAQ accordion -------------------------------------------- */
  function renderFaq() {
    const el = document.getElementById('faqList');
    el.innerHTML = FAQ.map((f, i) => `
      <div class="faq-item">
        <button class="faq-q" aria-expanded="false" aria-controls="faq-a-${i}">
          <span>${f.q}</span><span class="faq-ico" aria-hidden="true">+</span>
        </button>
        <div class="faq-a" id="faq-a-${i}" role="region"><div class="faq-a-inner"><p>${f.a}</p></div></div>
      </div>`).join('');
    el.querySelectorAll('.faq-q').forEach((btn) => {
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        const panel = btn.nextElementSibling;
        panel.style.maxHeight = open ? null : panel.scrollHeight + 'px';
        btn.querySelector('.faq-ico').textContent = open ? '+' : '–';
      });
    });
  }

  /* ---- render: timeline -------------------------------------------------- */
  function renderTimeline() {
    document.getElementById('timeline').innerHTML = TIMELINE.map((t) => `
      <li class="tl-item">
        <div class="tl-dot"></div>
        <div class="tl-card">
          <div class="tl-date">${t.date}</div>
          <h4>${t.title}</h4>
          <p>${t.body}</p>
        </div>
      </li>`).join('');
  }

  /* ---- map controls ------------------------------------------------------ */
  function renderUseButtons() {
    const wrap = document.getElementById('useButtons');
    wrap.innerHTML = USE_ORDER.map((k, i) =>
      `<button data-use="${k}" class="${i === 0 ? 'active' : ''}">${USES[k].short}</button>`).join('');
    wrap.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        wrap.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        MesaMap.setUse(b.dataset.use);
        updateUseHelp(b.dataset.use);
      });
    });
    updateUseHelp(USE_ORDER[0]);
  }
  function updateUseHelp(useKey) {
    const u = USES[useKey];
    const el = document.getElementById('useHelp');
    const isNew = u.isNew ? '<span class="badge-new">NEW USE</span> ' : '';
    el.innerHTML = `${isNew}<strong>${u.label}.</strong> ${u.tagline}`;
  }

  function wireScenario() {
    const wrap = document.getElementById('scenarioButtons');
    wrap.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        wrap.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        MesaMap.setScenario(b.dataset.sc);
      });
    });
  }
  function wireBase() {
    const wrap = document.getElementById('baseButtons');
    wrap.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        wrap.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        MesaMap.setBasemap(b.dataset.base);
      });
    });
  }
  function wireToggles() {
    const labels = document.getElementById('tglLabels');
    const council = document.getElementById('tglCouncil');
    const official = document.getElementById('tglOfficial');
    if (labels) labels.addEventListener('change', () => MesaMap.setLabels(labels.checked));
    if (council) council.addEventListener('change', () => MesaMap.setCouncil(council.checked));
    if (official) official.addEventListener('change', () => MesaMap.setOfficial(official.checked));
  }

  /* ---- nav: mobile toggle, scrollspy, shrink ----------------------------- */
  function wireNav() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    const nav = document.getElementById('nav');
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }));

    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 24);
    }, { passive: true });

    const sections = ['overview', 'technology', 'map-section', 'chart', 'standards', 'faq'];
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = e.target.id;
          links.querySelectorAll('a').forEach((a) =>
            a.classList.toggle('active', a.getAttribute('href') === '#' + id));
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((id) => { const s = document.getElementById(id); if (s) obs.observe(s); });
  }

  /* ---- lazy-init the map when it nears the viewport ---------------------- */
  function wireMapLazyInit() {
    const stage = document.getElementById('map-section');
    const obs = new IntersectionObserver((entries, o) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          MesaMap.init();
          setTimeout(() => MesaMap.refreshSize(), 250);
          o.disconnect();
        }
      });
    }, { rootMargin: '300px 0px' });
    obs.observe(stage);
  }

  /* ---- boot -------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    renderTech();
    renderLegislation();
    renderChart();
    renderStandards();
    renderFaq();
    renderTimeline();
    renderUseButtons();
    wireScenario();
    wireBase();
    wireToggles();
    wireNav();
    wireMapLazyInit();
  });
})();
