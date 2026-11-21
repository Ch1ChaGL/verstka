// Лабораторная 5 на SVG: перетаскивание, выделение группы, поворот на 90° и линковка
// Группы: после стыковки части двигаются и крутятся вместе.

(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const VW = 960;
  const VH = 560;

  const ROTATE_STEP = 90;
  const SNAP = 25;

  const HOME = {
    'piece--body-front': { x: 84, y: 86 },
    'piece--body-rear': { x: 252, y: 29.5 },
    'piece--head': { x: 2.5, y: -34 },
    'piece--ball': { x: -35, y: 144 },
  };

  const svg = document.getElementById('field');
  if (!svg) return;

  const items = [];

  // ----- превращаем <image> в объекты -----
  svg.querySelectorAll('image').forEach(function (el) {
    const p = {
      el: el,
      w: Number(el.getAttribute('width')),
      h: Number(el.getAttribute('height')),
      x: 0,
      y: 0,
      a: 0,
      group: null,
    };
    for (const cls in HOME) {
      if (el.classList.contains(cls)) {
        p.home = HOME[cls];
        p.cls = cls;
      }
    }
    p.group = { members: [p] };
    items.push(p);
    el.addEventListener('pointerdown', function (e) {
      onDown(e, p);
    });
  });

  let current = null;
  let selected = null;
  let drag = null;
  let solved = false;

  // ----- отрисовка -----
  function render(p) {
    const cx = p.w / 2;
    const cy = p.h / 2;
    p.el.setAttribute(
      'transform',
      'translate(' +
        p.x +
        ' ' +
        p.y +
        ') rotate(' +
        p.a +
        ' ' +
        cx +
        ' ' +
        cy +
        ')',
    );
  }

  function centerOf(p) {
    return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
  }

  function rotateVec(x, y, deg) {
    const k = (((deg % 360) + 360) % 360) / 90;
    const cos = [1, 0, -1, 0][k];
    const sin = [0, 1, 0, -1][k];
    return { x: x * cos - y * sin, y: x * sin + y * cos };
  }

  function setAngle(p, a) {
    p.a = ((a % 360) + 360) % 360;
    render(p);
  }

  // ----- координаты мыши в системе viewBox -----
  function toSvg(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  // ----- границы поля для одной картинки -----
  function limits(p) {
    const turned = p.a === 90 || p.a === 270;
    const vw = turned ? p.h : p.w;
    const vh = turned ? p.w : p.h;
    const gx = (p.w - vw) / 2;
    const gy = (p.h - vh) / 2;
    return {
      minX: -gx,
      maxX: VW - vw - gx,
      minY: -gy,
      maxY: VH - vh - gy,
    };
  }

  // ----- сдвиг группы с учётом границ -----
  function moveGroup(snap, dx, dy) {
    let minDx = -Infinity,
      maxDx = Infinity,
      minDy = -Infinity,
      maxDy = Infinity;
    snap.forEach(function (it) {
      const l = limits(it.p);
      minDx = Math.max(minDx, l.minX - it.x);
      maxDx = Math.min(maxDx, l.maxX - it.x);
      minDy = Math.max(minDy, l.minY - it.y);
      maxDy = Math.min(maxDy, l.maxY - it.y);
    });
    dx = Math.max(minDx, Math.min(dx, maxDx));
    dy = Math.max(minDy, Math.min(dy, maxDy));
    snap.forEach(function (it) {
      it.p.x = it.x + dx;
      it.p.y = it.y + dy;
      render(it.p);
    });
    refreshSelection();
  }

  // ----- снимок позиций группы -----
  function snapshot(members) {
    return members.map(function (m) {
      return { p: m, x: m.x, y: m.y };
    });
  }

  // ----- выделение (общая рамка вокруг группы) -----
  let outlineEl = null;

  function refreshSelection() {
    if (outlineEl) {
      outlineEl.remove();
      outlineEl = null;
    }
    if (!selected) return;

    const members = selected.group.members;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    members.forEach(function (m) {
      const turned = m.a === 90 || m.a === 270;
      const vw = turned ? m.h : m.w;
      const vh = turned ? m.w : m.h;
      const gx = (m.w - vw) / 2;
      const gy = (m.h - vh) / 2;
      const l = m.x + gx;
      const t = m.y + gy;
      minX = Math.min(minX, l);
      minY = Math.min(minY, t);
      maxX = Math.max(maxX, l + vw);
      maxY = Math.max(maxY, t + vh);
    });

    outlineEl = document.createElementNS(NS, 'rect');
    outlineEl.setAttribute('class', 'group-outline');
    outlineEl.setAttribute('x', minX - 4);
    outlineEl.setAttribute('y', minY - 4);
    outlineEl.setAttribute('width', maxX - minX + 8);
    outlineEl.setAttribute('height', maxY - minY + 8);
    outlineEl.setAttribute('rx', 6);
    outlineEl.setAttribute('ry', 6);
    svg.appendChild(outlineEl);
  }

  function select(p) {
    selected = p;
    refreshSelection();
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('.piece')) return;
    if (e.target.closest && e.target.closest('button')) return;
    select(null);
  });

  // ----- анимация победы -----
  function wiggle(group) {
    group.members.forEach(function (m) {
      m.el.classList.remove('piece--wiggle');
      void m.el.getBoundingClientRect();
      m.el.classList.add('piece--wiggle');
    });
  }

  items.forEach(function (p) {
    p.el.addEventListener('animationend', function () {
      p.el.classList.remove('piece--wiggle');
    });
  });

  // ----- линковка -----
  function tryLink(group) {
    let linked = false;
    let found = true;

    while (found) {
      found = false;
      for (const a of group.members) {
        for (const b of items) {
          if (b.group === group) continue;

          const isBall = a.cls === 'piece--ball' || b.cls === 'piece--ball';
          if (!isBall && a.a !== b.a) continue;

          const need = rotateVec(
            a.home.x - b.home.x,
            a.home.y - b.home.y,
            isBall ? 0 : a.a,
          );
          const ca = centerOf(a);
          const cb = centerOf(b);
          const dx = cb.x + need.x - ca.x;
          const dy = cb.y + need.y - ca.y;
          if (Math.hypot(dx, dy) > SNAP) continue;

          group.members.forEach(function (m) {
            m.x += dx;
            m.y += dy;
            render(m);
          });

          const other = b.group;
          group.members.forEach(function (m) {
            other.members.push(m);
            m.group = other;
          });
          group = other;
          linked = true;
          found = true;
          break;
        }
        if (found) break;
      }
    }

    if (linked) {
      moveGroup(snapshot(group.members), 0, 0);
      refreshSelection();
      if (group.members.length === items.length) {
        solved = true;
        wiggle(group);
        const s = document.getElementById('status');
        if (s) s.textContent = '🎉 Собака с мячом собрана!';
      }
    }
  }

  // ----- поворот группы вокруг выбранной картинки -----
  function rotateSelected(delta) {
    if (!selected || solved) return;
    const members = selected.group.members;
    const pivot = centerOf(selected);

    members.forEach(function (m) {
      const c = centerOf(m);
      const v = rotateVec(c.x - pivot.x, c.y - pivot.y, delta);
      m.x = pivot.x + v.x - m.w / 2;
      m.y = pivot.y + v.y - m.h / 2;
      setAngle(m, m.a + delta);
    });

    moveGroup(snapshot(members), 0, 0);
    tryLink(selected.group);
  }

  document.getElementById('rotateLeft').addEventListener('click', function () {
    rotateSelected(-ROTATE_STEP);
  });
  document.getElementById('rotateRight').addEventListener('click', function () {
    rotateSelected(ROTATE_STEP);
  });

  // ----- перетаскивание (всей группы) -----
  function onDown(e, p) {
    if (solved) return;
    e.preventDefault();
    e.stopPropagation();
    current = p;
    select(p);

    // Поднять ВСЮ группу наверх (в SVG порядок = z-index)
    p.group.members.forEach(function (m) {
      svg.appendChild(m.el);
    });

    const pt = toSvg(e);
    drag = {
      p: p,
      sx: pt.x,
      sy: pt.y,
      group: snapshot(p.group.members), // ← снимок ВСЕЙ группы
    };
    svg.setPointerCapture(e.pointerId);
  }

  svg.addEventListener('pointermove', function (e) {
    if (!drag) return;
    const pt = toSvg(e);
    moveGroup(drag.group, pt.x - drag.sx, pt.y - drag.sy); // ← двигаем всю группу
  });

  svg.addEventListener('pointerup', function () {
    if (!drag) return;
    const p = drag.p;
    drag = null;
    tryLink(p.group);
  });

  svg.addEventListener('pointercancel', function () {
    drag = null;
  });

  // ----- перемешать -----
  function shuffle() {
    solved = false;
    const s = document.getElementById('status');
    if (s) s.textContent = '';

    items.forEach(function (p) {
      p.group = { members: [p] };
      p.el.classList.remove('piece--wiggle');
    });

    const spots = [
      { x: 40, y: 30 },
      { x: 400, y: 60 },
      { x: 650, y: 200 },
      { x: 120, y: 300 },
    ];
    const angles = [90, 180, 270];

    items.forEach(function (p, i) {
      p.x = spots[i].x;
      p.y = spots[i].y;
      p.a =
        p.cls === 'piece--ball'
          ? 0
          : angles[Math.floor(Math.random() * angles.length)];
      render(p);
    });

    select(null);
  }

  document.getElementById('shuffle').addEventListener('click', shuffle);

  // старт
  shuffle();
})();
