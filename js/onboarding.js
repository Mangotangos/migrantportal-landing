let current = 0;
const total = 3;
const track = document.getElementById('track');
const btn = document.getElementById('next-btn');

function update() {
  track.style.transform = `translateX(-${current * 100}vw)`;
  for (let i = 0; i < total; i++) {
    document.getElementById('d' + i).className = 'dot' + (i === current ? ' active' : '');
  }
  btn.textContent = current < total - 1 ? 'Next →' : 'Get Started →';
}

function next() {
  if (current < total - 1) {
    current++;
    update();
  } else {
    window.location.href = '/signup';
  }
}

// Handlers were inline attributes; bound here so the page can run without 'unsafe-inline'.
document.getElementById('next-btn').addEventListener('click', next);
