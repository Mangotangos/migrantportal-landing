function toggleStep(n) {
  const body = document.getElementById('body' + n);
  const btn  = document.getElementById('btn' + n);
  const open = body.classList.toggle('open');
  btn.classList.toggle('open', open);
  btn.querySelector('.arrow').textContent = open ? '▴' : '▾';
  btn.childNodes[0].textContent = open ? 'Read less ' : 'Read more ';
}

[1, 2, 3, 4].forEach(function (n) {
  document.getElementById('btn' + n).addEventListener('click', function () { toggleStep(n); });
});
