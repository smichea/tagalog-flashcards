let flashcards = [];
let currentIndex = 0;
let showingEnglish = false;
let learningSet = [];
const memorizedKey = 'memorized';
const statsKey     = 'stats';
let stats = {};
let history = [];
let historyPos = -1;
let quizMode = false;

function loadMemorized() {
  return JSON.parse(localStorage.getItem(memorizedKey) || '[]');
}
function saveMemorized(list) {
  localStorage.setItem(memorizedKey, JSON.stringify(list));
}
function loadStats() {
  return JSON.parse(localStorage.getItem(statsKey) || '{}');
}
function saveStats() {
  localStorage.setItem(statsKey, JSON.stringify(stats));
}

function computeLearningSet() {
  const memorized = new Set(loadMemorized());
  learningSet = flashcards
    .map((_, i) => i)
    .filter(i => !memorized.has(i));
}

function weightedRandomIndex() {
  const weights = learningSet.map(i => {
    const s = stats[i] || {correct:0, total:0};
    return s.total > 0 ? 1 - (s.correct / s.total) : 1;
  });
  const sum = weights.reduce((a,b)=>a+b, 0);
  let r = Math.random() * sum;
  for (let j = 0; j < learningSet.length; j++) {
    r -= weights[j];
    if (r <= 0) return learningSet[j];
  }
  return learningSet[learningSet.length-1];
}

function showOverlay(symbol, color, callback) {
  const overlay = document.getElementById('overlay');
  overlay.textContent = symbol;
  overlay.style.color = color;
  overlay.style.opacity = '1';
  setTimeout(() => {
    overlay.style.opacity = '0';
    if (callback) callback();
  }, 1000);
}

// — Flashcard Mode —
function updateCard() {
  const wordEl     = document.getElementById("word");
  const progressEl = document.getElementById("progress");
  if (learningSet.length === 0) {
    wordEl.textContent = "🎉 All memorized!";
    progressEl.textContent = "";
    return;
  }
  const card = flashcards[currentIndex];
  wordEl.textContent = showingEnglish ? card.English : card.Tagalog;
  progressEl.textContent = `${learningSet.indexOf(currentIndex)+1} / ${learningSet.length}`;
}

function toggleCard() {
  if (!learningSet.length) return;
  showingEnglish = !showingEnglish;
  updateCard();
}

function nextFlashcard() {
  if (!learningSet.length) return;
  currentIndex = weightedRandomIndex();
  showingEnglish = false;
  history.push(currentIndex);
  historyPos = history.length -1;
  updateCard();
}

function prevFlashcard() {
  if (historyPos > 0) {
    historyPos--;
    currentIndex = history[historyPos];
    showingEnglish = false;
    updateCard();
  }
}

function memorizeCurrent() {
  const mem = loadMemorized();
  if (!mem.includes(currentIndex)) {
    mem.push(currentIndex);
    saveMemorized(mem);
  }
  computeLearningSet();
  nextFlashcard();
}

// — Quiz Mode —
function showQuiz() {
  if (!learningSet.length) {
    document.getElementById("quiz-word").textContent = "🎉 All memorized!";
    return;
  }
  const qIndex = learningSet[Math.floor(Math.random() * learningSet.length)];
  const card = flashcards[qIndex];
  const options = [card.English];
  while (options.length < 4) {
    const rnd = flashcards[Math.floor(Math.random() * flashcards.length)].English;
    if (!options.includes(rnd)) options.push(rnd);
  }
  options.sort(() => Math.random() - 0.5);

  document.getElementById("quiz-word").textContent = card.Tagalog;
  const optsEl = document.querySelector(".options");
  optsEl.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.onclick = () => handleAnswer(qIndex, opt);
    optsEl.appendChild(btn);
  });
}

function handleAnswer(qIndex, chosen) {
  const correct = flashcards[qIndex].English;
  stats[qIndex] = stats[qIndex] || {correct:0, total:0};
  stats[qIndex].total++;
  if (chosen === correct) {
    stats[qIndex].correct++;
    showOverlay('✔', 'lightgreen', showQuiz);
  } else {
    showOverlay('✖', 'tomato', showQuiz);
  }
  saveStats();
}

// — Mode Switching —
function switchToFlashcard() {
  quizMode = false;
  document.getElementById("quiz-container").style.display = 'none';
  document.getElementById("flashcard-container").style.display = 'block';
}

function switchToQuiz() {
  quizMode = true;
  document.getElementById("flashcard-container").style.display = 'none';
  document.getElementById("quiz-container").style.display = 'block';
  showQuiz();
}

// — CSV Load & Init —
function parseCSV(text) {
  const lines  = text.trim().split('\n');
  const heads  = lines[0].split(',').map(h=>h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v=>v.trim());
    return { Tagalog: vals[0], English: vals[1] };
  });
}

fetch('./flashcards.csv')
  .then(r => r.text())
  .then(txt => {
    flashcards = parseCSV(txt);
    stats      = loadStats();
    computeLearningSet();
    nextFlashcard();
  })
  .catch(err => {
    console.error("Could not load CSV:", err);
    document.getElementById("word").textContent = "Error loading flashcards.";
  });

// register SW for offline (if available)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(console.error);
}

// wire buttons
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nextBtn').addEventListener('click', nextFlashcard);
  document.getElementById('prevBtn').addEventListener('click', prevFlashcard);
  document.getElementById('memorizedBtn').addEventListener('click', memorizeCurrent);
  document.getElementById('flashcardModeBtn').addEventListener('click', switchToFlashcard);
  document.getElementById('quizModeBtn').addEventListener('click', switchToQuiz);
});
