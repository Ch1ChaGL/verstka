'use strict';

const latin = [
  'Consuetudo est altera natura',
  'Nota bene',
  'Nulla calamitas sola',
  'Per aspera ad astra',
  'Carpe diem',
  'Veni, vidi, vici',
  'Alea iacta est',
  'Tempus fugit',
];

const russian = [
  'Привычка - вторая натура',
  'Заметьте хорошо!',
  'Беда не приходит одна',
  'Через тернии к звёздам',
  'Лови момент',
  'Пришёл, увидел, победил',
  'Жребий брошен',
  'Время бежит',
];

const phrases_indx_array = new Array(latin.length).fill(0).map((_, i) => i);

const btnCreate = document.getElementById('btn-create');
const list = document.getElementById('phrases-list');
const btnBold = document.getElementById('btn-bold');

const counters = document.getElementById('counters');
const total = latin.length;

let clickCount = 0;

btnCreate.addEventListener('click', () => {
  if (phrases_indx_array.length === 0) {
    alert('Фразы закончились');
    return;
  }

  clickCount++;

  const randPos = Math.floor(Math.random() * phrases_indx_array.length);
  const idx = phrases_indx_array.splice(randPos, 1)[0];

  const li = document.createElement('li');
  li.textContent = `"${latin[idx]}"`;

  const ul = document.createElement('ul');
  const innerLi = document.createElement('li');
  innerLi.textContent = `"${russian[idx]}"`;
  ul.appendChild(innerLi);
  li.appendChild(ul);

  li.classList.add(clickCount % 2 === 0 ? 'class1' : 'class2');

  list.appendChild(li);

  const created = total - phrases_indx_array.length;
  counters.textContent = `Количество ${created}/${total}`;
});

btnBold.addEventListener('click', () => {
  list.querySelectorAll('.class1').forEach(li => {
    li.classList.toggle('bold');
  });
});

