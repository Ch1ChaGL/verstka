// Лабораторная 5: перетаскивание, выделение и поворот выбранной картинки на 90°

const field = document.getElementById('field');

const ROTATE_STEP = 90; // на сколько градусов поворачивает одно нажатие

let current = null; // какую картинку сейчас тащим
let selected = null; // какая картинка выделена
let startPointerX = 0; // где была мышь в момент нажатия
let startPointerY = 0;
let startLeft = 0; // где была картинка в момент нажатия
let startTop = 0;
let topZ = 1; // чтобы поднимать взятую картинку поверх остальных

// ---------- угол картинки ----------

// угол хранится в data-angle, а на экране задаётся через CSS transform
function getAngle(piece) {
  return Number(piece.dataset.angle) || 0;
}

function setAngle(piece, angle) {
  angle = ((angle % 360) + 360) % 360; // приводим к диапазону 0..359
  piece.dataset.angle = angle;
  piece.style.transform = 'rotate(' + angle + 'deg)';
}

// ---------- положение картинки ----------

// Поставить картинку в (x, y) и не дать ей выйти за поле.
// Если картинка повёрнута на 90° или 270°, на экране её ширина и высота меняются местами.
function moveTo(piece, x, y) {
  const angle = getAngle(piece);
  const turned = angle === 90 || angle === 270;
  const visibleW = turned ? piece.offsetHeight : piece.offsetWidth; // ширина на экране
  const visibleH = turned ? piece.offsetWidth : piece.offsetHeight; // высота на экране
  const gapX = (piece.offsetWidth - visibleW) / 2; // на сколько left отличается от видимого края
  const gapY = (piece.offsetHeight - visibleH) / 2;

  x = Math.max(-gapX, Math.min(x, field.clientWidth - visibleW - gapX));
  y = Math.max(-gapY, Math.min(y, field.clientHeight - visibleH - gapY));

  piece.style.left = x + 'px';
  piece.style.top = y + 'px';
}

// ---------- выделение ----------

function select(piece) {
  if (selected) selected.classList.remove('piece--selected');
  selected = piece;
  if (piece) piece.classList.add('piece--selected');
}

// Нажали вне картинки и вне кнопок поворота — снимаем выделение
document.addEventListener('pointerdown', function (e) {
  if (e.target.closest('.piece')) return; // нажали на картинку
  if (e.target.closest('#rotateLeft, #rotateRight')) return; // нажали на кнопку поворота
  select(null);
});

// ---------- поворот кнопками ----------

function rotateSelected(delta) {
  if (!selected) return; // ничего не выбрано
  setAngle(selected, getAngle(selected) + delta);
  moveTo(selected, selected.offsetLeft, selected.offsetTop); // после поворота не выпускаем за поле
}

document.getElementById('rotateLeft').addEventListener('click', function () {
  rotateSelected(-ROTATE_STEP);
});
document.getElementById('rotateRight').addEventListener('click', function () {
  rotateSelected(ROTATE_STEP);
});

// ---------- перетаскивание ----------

// 1) Нажали на картинку
field.addEventListener('pointerdown', function (e) {
  if (!e.target.classList.contains('piece')) return; // нажали не на картинку

  current = e.target;
  select(current);

  // Запоминаем, где были мышь и картинка.
  // getBoundingClientRect() здесь нельзя: у повёрнутой картинки он даёт рамку вокруг повёрнутой фигуры,
  // и картинка при перетаскивании «прыгала» бы.
  startPointerX = e.clientX;
  startPointerY = e.clientY;
  startLeft = current.offsetLeft;
  startTop = current.offsetTop;

  current.style.zIndex = ++topZ; // поверх остальных
});

// 2) Двигаем мышь: новая позиция = старая позиция + на сколько сдвинулась мышь
document.addEventListener('pointermove', function (e) {
  if (!current) return;
  moveTo(
    current,
    startLeft + (e.clientX - startPointerX),
    startTop + (e.clientY - startPointerY),
  );
});

// 3) Отпустили кнопку — перестаём тащить
document.addEventListener('pointerup', function () {
  current = null;
});
document.addEventListener('pointercancel', function () {
  current = null;
});
