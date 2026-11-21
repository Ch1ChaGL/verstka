'use strict';

const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

burger.addEventListener('click', () => {
  nav.classList.toggle('open');
  document.body.classList.toggle('no-scroll', nav.classList.contains('open'));
});

nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    document.body.classList.remove('no-scroll');
  });
});
