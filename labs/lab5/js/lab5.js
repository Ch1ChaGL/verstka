const field = document.getElementById('field');
const statusEl = document.getElementById('status');
const pieces = Array.from(document.querySelectorAll('.piece')); // все 4 картинки
const base = document.querySelector('[data-part="front"]'); // туловище — основа, к ней клеим остальное

const ROTATE_STEP = 90; // на сколько градусов поворачивает одно нажатие
const SNAP = 25; // с какого расстояния (px) часть «прилипает» к своему месту

// Смещения ниже записаны для туловища шириной 168px.
// Если туловище на странице меньше или больше, всё пересчитывается в tryAttach.
const DESIGN_WIDTH = 168;

// Где должен быть центр каждой части относительно центра туловища в собранной собаке
const OFFSETS = {
  rear: { x: 168, y: -56 }, // конец туловища
  head: { x: -82, y: -120 }, // голова
  ball: { x: -119, y: 58, snap: 50 }, // мяч (круглый, поэтому допуск по расстоянию побольше)
};

let current = null; // какую картинку сейчас тащим
let selected = null; // какая картинка выбрана
let startPointerX = 0; // где была мышь в момент нажатия
let startPointerY = 0;
let dragItems = []; // что тащим: картинки и их стартовые позиции
let topZ = 1; // чтобы поднимать взятую картинку поверх остальных

// ---------- вспомогательные функции ----------

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getLeft(piece) {
  return parseFloat(piece.style.left) || 0;
}
function getTop(piece) {
  return parseFloat(piece.style.top) || 0;
}

function centerOf(piece) {
  return {
    x: getLeft(piece) + piece.offsetWidth / 2,
    y: getTop(piece) + piece.offsetHeight / 2,
  };
}

// Группа: если картинка приклеена к туловищу (или это само туловище) —
// двигается всё собранное вместе. Иначе картинка двигается одна.
function groupOf(piece) {
  if (piece === base || piece.classList.contains('piece--linked')) {
    return pieces.filter(function (p) {
      return p === base || p.classList.contains('piece--linked');
    });
  }
  return [piece];
}

// угол хранится в data-angle, а на экране задаётся через CSS transform
function getAngle(piece) {
  return Number(piece.dataset.angle) || 0;
}

function setAngle(piece, angle) {
  angle = ((angle % 360) + 360) % 360; // приводим к диапазону 0..359
  piece.dataset.angle = angle;
  piece.style.transform = 'rotate(' + angle + 'deg)';
}

// В каких пределах может быть left/top картинки, чтобы она не вышла за поле.
// Если картинка повёрнута на 90° или 270°, на экране её ширина и высота меняются местами.
function limits(piece) {
  const angle = getAngle(piece);
  const turned = angle === 90 || angle === 270;
  const visibleW = turned ? piece.offsetHeight : piece.offsetWidth;
  const visibleH = turned ? piece.offsetWidth : piece.offsetHeight;
  const gapX = (piece.offsetWidth - visibleW) / 2;
  const gapY = (piece.offsetHeight - visibleH) / 2;
  return {
    minX: -gapX,
    maxX: field.clientWidth - visibleW - gapX,
    minY: -gapY,
    maxY: field.clientHeight - visibleH - gapY,
  };
}

// Запомнить позиции картинок
function snapshot(list) {
  return list.map(function (p) {
    return { piece: p, left: getLeft(p), top: getTop(p) };
  });
}

// Сдвинуть картинки на (dx, dy) от запомненных позиций так, чтобы ни одна не вышла за поле.
// Картинки сдвигаются на одно и то же расстояние, поэтому группа не разъезжается.
function moveGroup(items, dx, dy) {
  let minDx = -Infinity;
  let maxDx = Infinity;
  let minDy = -Infinity;
  let maxDy = Infinity;
  items.forEach(function (it) {
    const l = limits(it.piece);
    minDx = Math.max(minDx, l.minX - it.left);
    maxDx = Math.min(maxDx, l.maxX - it.left);
    minDy = Math.max(minDy, l.minY - it.top);
    maxDy = Math.min(maxDy, l.maxY - it.top);
  });
  dx = Math.max(minDx, Math.min(dx, maxDx));
  dy = Math.max(minDy, Math.min(dy, maxDy));

  items.forEach(function (it) {
    it.piece.style.left = it.left + dx + 'px';
    it.piece.style.top = it.top + dy + 'px';
  });
}

// Поставить одну картинку в (x, y) и не дать ей выйти за поле
function moveTo(piece, x, y) {
  moveGroup(snapshot([piece]), x - getLeft(piece), y - getTop(piece));
}

// ---------- выделение ----------

// выделяется вся группа, в которой находится выбранная картинка
function refreshSelection() {
  pieces.forEach(function (p) {
    p.classList.remove('piece--selected');
  });
  if (selected) {
    groupOf(selected).forEach(function (p) {
      p.classList.add('piece--selected');
    });
  }
}

function select(piece) {
  selected = piece;
  refreshSelection();
}

// Нажали вне картинки и вне кнопок поворота — снимаем выделение
document.addEventListener('pointerdown', function (e) {
  if (e.target.closest('.piece')) return;
  if (e.target.closest('#rotateLeft, #rotateRight')) return;
  select(null);
});

// ---------- поворот кнопками ----------

function rotateSelected(delta) {
  if (!selected) return; // ничего не выбрано
  if (groupOf(selected).length > 1) {
    statusEl.textContent =
      'Собранные части поворачивать нельзя — они уже стоят прямо.';
    return;
  }
  setAngle(selected, getAngle(selected) + delta);
  moveTo(selected, getLeft(selected), getTop(selected)); // после поворота не выпускаем за поле
  checkAssembly();
}

document.getElementById('rotateLeft').addEventListener('click', function () {
  rotateSelected(-ROTATE_STEP);
});
document.getElementById('rotateRight').addEventListener('click', function () {
  rotateSelected(ROTATE_STEP);
});

// ---------- защёлкивание частей на туловище ----------

// Подёргать картинки вверх-вниз (все вместе)
function wiggle(list) {
  list.forEach(function (piece) {
    piece.classList.remove('piece--wiggle');
    void piece.offsetWidth; // чтобы анимация запустилась заново
    piece.classList.add('piece--wiggle');
  });
}
pieces.forEach(function (piece) {
  piece.addEventListener('animationend', function () {
    piece.classList.remove('piece--wiggle');
  });
});

// Если часть стоит прямо рядом со своим местом на туловище — приклеиваем её
function tryAttach(piece) {
  if (piece === base || piece.classList.contains('piece--linked')) return false;
  if (getAngle(base) !== 0) return false; // туловище должно стоять прямо
  const isBall = piece.dataset.part === 'ball';
  if (!isBall && getAngle(piece) !== 0) return false; // части должны стоять прямо (мячу угол не важен — он круглый)

  const scale = base.offsetWidth / DESIGN_WIDTH; // во сколько раз картинки уменьшены на странице
  const offset = OFFSETS[piece.dataset.part];
  const b = centerOf(base);
  const targetX = b.x + offset.x * scale; // где должен быть центр части
  const targetY = b.y + offset.y * scale;

  const c = centerOf(piece);
  const snap = (offset.snap || SNAP) * scale; // допуск: у мяча свой, у остальных общий
  if (Math.hypot(targetX - c.x, targetY - c.y) > snap) return false; // ещё далеко

  piece.style.left = targetX - piece.offsetWidth / 2 + 'px'; // ставим точно на место
  piece.style.top = targetY - piece.offsetHeight / 2 + 'px';
  setAngle(piece, 0); // мяч после приклеивания тоже выравниваем
  piece.classList.add('piece--linked');
  return true;
}

// Проверяем все части; если что-то приклеилось — подёргиваем собранное
function checkAssembly() {
  let attached = false;
  pieces.forEach(function (piece) {
    if (tryAttach(piece)) attached = true;
  });
  if (!attached) return;

  const group = groupOf(base);
  moveGroup(snapshot(group), 0, 0); // если группа вылезла за край поля — сдвигаем её внутрь целиком
  refreshSelection();

  if (group.length === pieces.length) {
    field.classList.add('field--done'); // всё собрано: подёргивание дольше
    statusEl.textContent = '🎉 Собака с мячом собрана!';
  } else {
    statusEl.textContent =
      'Собрано частей: ' + group.length + ' из ' + pieces.length + '.';
  }
  wiggle(group);
}

// ---------- перемешать ----------

// Поле делится на 4 клетки, в каждую кладём одну картинку со случайным углом 90/180/270
function shuffle() {
  select(null);
  field.classList.remove('field--done');
  statusEl.textContent = '';

  const cells = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ].sort(function () {
    return Math.random() - 0.5;
  });
  const cellW = field.clientWidth / 2;
  const cellH = field.clientHeight / 2;

  pieces.forEach(function (piece, i) {
    piece.classList.remove('piece--linked', 'piece--wiggle');
    setAngle(piece, randomInt(1, 3) * 90); // 90°, 180° или 270° — картинка всегда повёрнута
    const x =
      cells[i][0] * cellW +
      randomInt(0, Math.max(0, cellW - piece.offsetWidth));
    const y =
      cells[i][1] * cellH +
      randomInt(0, Math.max(0, cellH - piece.offsetHeight));
    moveTo(piece, x, y);
  });
}

document.getElementById('shuffle').addEventListener('click', shuffle);
window.addEventListener('load', shuffle); // размеры картинок известны только после загрузки

// ---------- перетаскивание ----------

// 1) Нажали на картинку
field.addEventListener('pointerdown', function (e) {
  if (!e.target.classList.contains('piece')) return; // нажали не на картинку

  current = e.target;
  select(current);

  // Что тащим: одну картинку или всю собранную группу
  const group = groupOf(current);
  dragItems = snapshot(group);
  startPointerX = e.clientX;
  startPointerY = e.clientY;

  group.forEach(function (p) {
    p.style.zIndex = ++topZ; // поверх остальных
  });
});

// 2) Двигаем мышь: всё, что тащим, сдвигается на столько же, на сколько сдвинулась мышь
document.addEventListener('pointermove', function (e) {
  if (!current) return;
  moveGroup(dragItems, e.clientX - startPointerX, e.clientY - startPointerY);
});

// 3) Отпустили кнопку — перестаём тащить и проверяем, не приклеилось ли что-то
document.addEventListener('pointerup', function () {
  if (!current) return;
  current = null;
  checkAssembly();
});
document.addEventListener('pointercancel', function () {
  current = null;
});
