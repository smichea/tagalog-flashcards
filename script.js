let flashcards = [];
let currentKey = null;
let flashcardsByKey = {};
let showingEnglish = false;
let learningSet = [];
const memorizedKey = 'memorized';
const statsKey     = 'stats';
let stats = {};
let history = [];
let historyPos = -1;
let quizMode = false;

// LocalStorage helpers
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

// Compute which cards remain
function computeLearningSet() {
  const memorized = new Set(loadMemorized());
  learningSet = flashcards
    .map(c => c.Tagalog)
    .filter(key => !memorized.has(key));
}

// Compute score for a card (0..1)
function cardScore(key) {
  const s = stats[key] || {correct:0, total:0};
  return s.total ? (s.correct / s.total) : 0;
}

// Pick next card: choose among lowest-score cards (random tie-breaker)
function nextCardKey() {
  if (!learningSet.length) return null;
  let lowest = Infinity;
  learningSet.forEach(key => {
    const score = cardScore(key);
    if (score < lowest) lowest = score;
  });
  const candidates = learningSet.filter(key => cardScore(key) === lowest);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Show overlay check/cross
function showOverlay(symbol, color, callback) {
  const overlayId = quizMode ? 'quiz-overlay' : 'overlay';
  const overlay = document.getElementById(overlayId);
  overlay.textContent = symbol;
  overlay.style.color = color;
  overlay.style.opacity = '1';
  setTimeout(() => {
    overlay.style.opacity = '0';
    if (callback) callback();
  }, 1000);
}

// Flashcard Mode
function updateCard() {
  const wordEl = document.getElementById("word");
  const progressEl = document.getElementById("progress");
  if (!learningSet.length) {
    wordEl.textContent = "🎉 All memorized!";
    progressEl.textContent = "";
    return;
  }
  const card = flashcardsByKey[currentKey];
  wordEl.textContent = showingEnglish ? card.English : card.Tagalog;
  progressEl.textContent = `${learningSet.indexOf(currentKey)+1} / ${learningSet.length}`;
}
function toggleCard() {
  if (!learningSet.length) return;
  showingEnglish = !showingEnglish;
  updateCard();
}
function nextFlashcard() {
  if (!learningSet.length) return;
  currentKey = nextCardKey();
  showingEnglish = false;
  history.push(currentKey);
  historyPos = history.length - 1;
  updateCard();
}
function prevFlashcard() {
  if (historyPos > 0) {
    historyPos--;
    currentKey = history[historyPos];
    showingEnglish = false;
    updateCard();
  }
}
function memorizeCurrent() {
  const mem = loadMemorized();
  if (!mem.includes(currentKey)) {
    mem.push(currentKey);
    saveMemorized(mem);
  }
  computeLearningSet();
  nextFlashcard();
}

// Quiz Mode
function showQuiz() {
  if (!learningSet.length) {
    document.getElementById("quiz-word").textContent = "🎉 All memorized!";
    return;
  }
  const qKey = learningSet[Math.floor(Math.random() * learningSet.length)];
  const card = flashcardsByKey[qKey];
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
    btn.onclick = () => handleAnswer(qKey, opt);
    optsEl.appendChild(btn);
  });
}
function handleAnswer(qKey, chosen) {
  const correct = flashcardsByKey[qKey].English;
  stats[qKey] = stats[qKey] || {correct:0, total:0};
  stats[qKey].total++;
  if (chosen === correct) {
    stats[qKey].correct++;
    showOverlay('✔', 'lightgreen', showQuiz);
  } else {
    showOverlay('✖', 'tomato', showQuiz);
  }
  saveStats();
}

// Score View
function showScore() {
  document.getElementById('flashcard-container').style.display='none';
  document.getElementById('quiz-container').style.display='none';
  document.getElementById('score-container').style.display='block';
  renderScore();
}
function renderScore() {
  const memKeys = loadMemorized();
  let overall = 0;
  if (memKeys.length) {
    const scores = memKeys.map(key => {
      const s = stats[key] || {correct:0, total:0};
      return s.total ? (s.correct / s.total) : 0;
    });
    overall = Math.round((scores.reduce((a,b) => a+b, 0) / memKeys.length) * 100);
  }
  document.getElementById('overall-score').textContent =
    `Overall: ${overall}%`;

  const ul = document.getElementById('memorized-list');
  ul.innerHTML = '';
  memKeys.forEach(key => {
    const card = flashcardsByKey[key];
    const s = stats[key] || {correct:0, total:0};
    const pct = s.total ? Math.round((s.correct/s.total)*100) : 0;
    const li = document.createElement('li');
    li.textContent = `${card.Tagalog} – ${card.English}: ${pct}% (${s.correct}/${s.total})`;
    ul.appendChild(li);
  });
}

// Mode Switching
function switchToFlashcard() {
  quizMode = false;
  document.getElementById('score-container').style.display='none';
  document.getElementById('quiz-container').style.display='none';
  document.getElementById('flashcard-container').style.display='block';
}
function switchToQuiz() {
  quizMode = true;
  document.getElementById('score-container').style.display='none';
  document.getElementById('flashcard-container').style.display='none';
  document.getElementById('quiz-container').style.display='block';
  showQuiz();
}
// Reset memorization and stats
function resetProgress() {
  if (!confirm('This will clear all your progress. Continue?')) return;
  localStorage.removeItem(memorizedKey);
  localStorage.removeItem(statsKey);
  stats = {};
  computeLearningSet();
  history = [];
  historyPos = -1;
  switchToFlashcard();
  nextFlashcard();
}

// CSV Load & Init
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(?:"([^"]*)"|([^,]*)),(?:"([^"]*)"|([^,]*))$/);
    if (match) {
      data.push({
        Tagalog: (match[1] || match[2] || '').trim(),
        English: (match[3] || match[4] || '').trim()
      });
    }
  }
  return data;
}
fetch('./flashcards.csv')
  .then(r => r.text())
  .then(txt => {
    flashcards = parseCSV(txt);
    // build lookup by tagalog key
    flashcardsByKey = {};
    flashcards.forEach(c => {
      flashcardsByKey[c.Tagalog] = c;
    });
    stats = loadStats();
    computeLearningSet();
    nextFlashcard();
  })
  .catch(err => {
    console.error("Load CSV error:", err);
    const wordEl = document.getElementById('word');
    if (wordEl) wordEl.textContent = '⚠️ Error loading flashcards.';
    const controls = document.querySelector('.controls');
    if (controls) controls.style.display = 'none';
  });

// Register SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .catch(console.error);
}

// Wire up buttons
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nextBtn').addEventListener('click', nextFlashcard);
  document.getElementById('prevBtn').addEventListener('click', prevFlashcard);
  document.getElementById('memorizedBtn').addEventListener('click', memorizeCurrent);
  document.getElementById('flashcardModeBtn').addEventListener('click', switchToFlashcard);
  document.getElementById('quizModeBtn').addEventListener('click', switchToQuiz);
  document.getElementById('scoreModeBtn').addEventListener('click', showScore);
  document.getElementById('backBtn').addEventListener('click', switchToFlashcard);
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', resetProgress);
});
