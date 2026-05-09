// State
let state = { level: null, subject: null, lessonIdx: 0, completed: {} };

// Canvas étoiles
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let stars = [];
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; initStars(); }
function initStars() { stars = []; for(let i=0;i<120;i++) stars.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:Math.random()*1.5,a:Math.random(),speed:0.003+Math.random()*0.005,drift:(Math.random()-.5)*.2}); }
function drawStars() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  stars.forEach(s=>{s.a+=s.speed;s.x+=s.drift;if(s.x<0)s.x=canvas.width;if(s.x>canvas.width)s.x=0;const al=(Math.sin(s.a)*.5+.5)*.6+.1;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(180,160,255,${al})`;ctx.fill();});
  requestAnimationFrame(drawStars);
}
window.addEventListener('resize',resize); resize(); drawStars();

// Curseur custom
const cursor=document.getElementById('cursor'),trail=document.getElementById('cursor-trail');
let mx=0,my=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cursor.style.left=mx-6+'px';cursor.style.top=my-6+'px';setTimeout(()=>{trail.style.left=mx-15+'px';trail.style.top=my-15+'px';},80);});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const t=document.querySelector(a.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth'});}));

// --- Navigation ---
function openLevel(level) {
  state.level = level;
  state.subject = null;
  state.lessonIdx = 0;
  const data = curriculum[level];
  document.getElementById('levels-grid').style.display = 'none';
  const panel = document.getElementById('study-panel');
  panel.classList.add('visible');

  // breadcrumb
  document.getElementById('breadcrumb').innerHTML = `<button class="back-btn" onclick="backToLevels()">← Niveaux</button> <b>${data.title}</b>`;

  // tabs matières
  const tabs = document.getElementById('subject-tabs');
  tabs.innerHTML = '';
  Object.keys(data.subjects).forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'stab' + (i === 0 ? ' active' : '');
    b.textContent = s;
    b.onclick = () => openSubject(level, s);
    tabs.appendChild(b);
  });

  // ouvre première matière
  openSubject(level, Object.keys(data.subjects)[0]);
  panel.scrollIntoView({ behavior: 'smooth' });
}

function openSubject(level, subject) {
  state.subject = subject;
  state.lessonIdx = 0;

  // update tabs
  document.querySelectorAll('.stab').forEach(b => {
    b.classList.toggle('active', b.textContent === subject);
  });

  // sidebar
  const lessons = curriculum[level].subjects[subject];
  const sidebar = document.getElementById('lesson-sidebar-list');
  sidebar.innerHTML = '';
  lessons.forEach((l, i) => {
    const key = level + '_' + subject + '_' + i;
    const done = state.completed[key];
    const li = document.createElement('li');
    li.className = 'litem' + (i === 0 ? ' active' : '') + (done ? ' done' : '');
    li.id = 'litem-' + i;
    li.onclick = () => openLesson(i);
    li.innerHTML = `<span class="lnum">${l.id}</span>${l.title}<span class="lcheck">✓</span>`;
    sidebar.appendChild(li);
  });

  openLesson(0);
}

function openLesson(idx) {
  state.lessonIdx = idx;
  const lessons = curriculum[state.level].subjects[state.subject];
  const lesson = lessons[idx];
  const c = lesson.content;

  // sidebar highlight
  document.querySelectorAll('.litem').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });

  // progress
  const pct = Math.round((idx / lessons.length) * 100);
  document.getElementById('prog-fill').style.width = pct + '%';

  // contenu
  let html = `
    <div class="lesson-title-big">${lesson.title}</div>
    <div class="lesson-counter">Leçon ${idx + 1} / ${lessons.length} — ${state.subject}</div>
    <p class="explain">${c.explain}</p>
    <div class="formula-box">${c.formula}</div>`;

  if (c.example) {
    html += `<div class="example-box"><strong>${c.example.title}</strong><p>${c.example.text}</p></div>`;
  }
  html += `<div class="tip-box">${c.tip}</div>`;

  // Quiz
  html += `<hr class="sep"><div class="quiz-title">⚡ QUIZ RAPIDE</div>`;
  c.quiz.forEach((q, qi) => {
    html += `<div class="quiz-q"><p>${q.q}</p><div class="quiz-opts">`;
    q.opts.forEach((opt, oi) => {
      html += `<button class="qopt" onclick="checkAnswer(this,${oi === q.c})">${opt}</button>`;
    });
    html += `</div></div>`;
  });

  // Flashcard
  html += `<hr class="sep">
    <div class="fc-title">🎮 FLASHCARD</div>
    <p class="fc-hint">Clique sur la carte pour révéler la réponse 👆</p>
    <div class="flashcard" id="fc-card" onclick="flipCard(this)">
      <div class="fc-inner">
        <div class="fc-front">${c.card.front}</div>
        <div class="fc-back">${c.card.back}</div>
      </div>
    </div>`;

  // Navigation
  html += `<div class="lesson-nav">
    <button onclick="prevLesson()" ${idx === 0 ? 'disabled' : ''}>← Leçon précédente</button>
    <button onclick="markAndNext()" style="background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;border:none;">
      ${idx === lessons.length - 1 ? '✓ Terminer' : 'Leçon suivante →'}
    </button>
  </div>`;

  document.getElementById('lesson-main').innerHTML = html;

  // marquer comme vu
  const key = state.level + '_' + state.subject + '_' + idx;
  state.completed[key] = true;
  const litem = document.getElementById('litem-' + idx);
  if (litem) litem.classList.add('done');
}

function markAndNext() {
  const lessons = curriculum[state.level].subjects[state.subject];
  if (state.lessonIdx < lessons.length - 1) {
    openLesson(state.lessonIdx + 1);
    document.getElementById('lesson-main').scrollIntoView({ behavior: 'smooth' });
  } else {
    document.getElementById('lesson-main').innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;">
        <div style="font-size:3rem;margin-bottom:1rem;">🏆</div>
        <div class="lesson-title-big">Matière terminée !</div>
        <p style="color:var(--muted);margin-top:0.5rem;">Tu as complété toutes les leçons de ${state.subject}. Choisis une autre matière ou un autre niveau.</p>
      </div>`;
  }
}

function prevLesson() {
  if (state.lessonIdx > 0) {
    openLesson(state.lessonIdx - 1);
    document.getElementById('lesson-main').scrollIntoView({ behavior: 'smooth' });
  }
}

function backToLevels() {
  document.getElementById('levels-grid').style.display = '';
  document.getElementById('study-panel').classList.remove('visible');
  document.getElementById('niveaux').scrollIntoView({ behavior: 'smooth' });
}

function checkAnswer(btn, correct) {
  btn.parentElement.querySelectorAll('.qopt').forEach(b => b.disabled = true);
  btn.classList.add(correct ? 'correct' : 'wrong');
  btn.textContent += correct ? ' ✓' : ' ✗';
  if (!correct) {
    btn.parentElement.querySelectorAll('.qopt').forEach(b => {
      if (b.onclick.toString().includes('true')) b.classList.add('correct');
    });
  }
}

function flipCard(el) { el.classList.toggle('flipped'); }

// Easter egg
const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let ki = 0, sc = 0;
document.addEventListener('keydown', e => {
  if (e.key === konami[ki]) { ki++; if (ki === konami.length) { triggerEgg(); ki = 0; } } else ki = 0;
});
document.getElementById('djessim-avatar').addEventListener('click', () => {
  sc++; if (sc >= 5) { triggerEgg(); sc = 0; }
});
function triggerEgg() {
  document.getElementById('egg-modal').classList.add('show');
  spawnConfetti();
}
function closeEgg() { document.getElementById('egg-modal').classList.remove('show'); }
function spawnConfetti() {
  const c = document.getElementById('confetti'); c.innerHTML = '';
  const cols = ['#7c3aed','#06b6d4','#f59e0b','#10b981','#ef4444','#fff'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div'); p.className = 'confetti-piece';
    p.style.left = Math.random()*100+'%';
    p.style.background = cols[Math.floor(Math.random()*cols.length)];
    p.style.animationDuration = (2+Math.random()*3)+'s';
    p.style.animationDelay = Math.random()*2+'s';
    p.style.transform = `rotate(${Math.random()*360}deg)`;
    c.appendChild(p);
  }
}
