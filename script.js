let flashcards = [];
let currentKey = null;
let flashcardsByKey = {};
let showingEnglish = false;
let history = [];
let historyPos = -1;
let quizMode = false;
// Scheduling memory: learned flag and last shown date
const memoryKey     = 'memory';
const ALPHA         = 0.01;  // decay rate per hour
const THRESHOLD     = 0.1;   // scheduling threshold
let memory          = {};
let skipRecordWrong = false;
function loadMemory() {
  memory = JSON.parse(localStorage.getItem(memoryKey) || '{}');
}
function saveMemory() {
  localStorage.setItem(memoryKey, JSON.stringify(memory));
}

// Scheduling helpers
function score(key) {
  const memEntry = memory[key];
  if (!memEntry || !memEntry.learned) return 0;
  const t = (Date.now() - memEntry.date) / 3600000; // hours since last shown
  return Math.exp(-ALPHA * t);
}
function nextCardKey() {
  const keys = flashcards.map(c => c.Tagalog);
  // cards due for review
  let due = keys.filter(key => score(key) < THRESHOLD);
  if (due.length === 0) {
    // no cards below threshold, pick random
    return keys[Math.floor(Math.random() * keys.length)];
  }
  // pick highest score among due
  let best = due[0], bestScore = score(best);
  due.forEach(key => {
    const s = score(key);
    if (s > bestScore) {
      best = key;
      bestScore = s;
    }
  });
  const candidates = due.filter(key => Math.abs(score(key) - bestScore) < 1e-9);
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
  const card = flashcardsByKey[currentKey];
  if (!card) return;
  wordEl.textContent = showingEnglish ? card.English : card.Tagalog;
  // Show number of due cards
  const keys = flashcards.map(c => c.Tagalog);
  const dueCount = keys.filter(k => score(k) < THRESHOLD).length;
  progressEl.textContent = `${dueCount} due / ${keys.length}`;
}
function toggleCard() {
  showingEnglish = !showingEnglish;
  updateCard();
}
function nextFlashcard() {
  // Record as not memorized when navigating away
  if (currentKey !== null && !skipRecordWrong) {
    memory[currentKey] = {learned: false, date: Date.now()};
    saveMemory();
  }
  skipRecordWrong = false;
  currentKey = nextCardKey();
  showingEnglish = false;
  history.push(currentKey);
  historyPos = history.length - 1;
  updateCard();
}
function prevFlashcard() {
  // Record as not memorized when navigating away
  if (currentKey !== null) {
    memory[currentKey] = {learned: false, date: Date.now()};
    saveMemory();
  }
  if (historyPos > 0) {
    historyPos--;
    currentKey = history[historyPos];
    showingEnglish = false;
    updateCard();
  }
}
function memorizeCurrent() {
  // Mark as memorized
  memory[currentKey] = {learned: true, date: Date.now()};
  saveMemory();
  // Skip recording as not memorized on next navigation
  skipRecordWrong = true;
  nextFlashcard();
}

// Quiz Mode
function showQuiz() {
  if (!flashcards.length) return;
  const qKey = nextCardKey();
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
  if (chosen === correct) {
    // Mark as memorized on correct answer
    memory[qKey] = {learned: true, date: Date.now()};
    showOverlay('✔', 'lightgreen', showQuiz);
  } else {
    // Mark as not memorized on incorrect answer
    memory[qKey] = {learned: false, date: Date.now()};
    showOverlay('✖', 'tomato', showQuiz);
  }
  saveMemory();
}

// Score View
function showScore() {
  document.getElementById('flashcard-container').style.display='none';
  document.getElementById('quiz-container').style.display='none';
  document.getElementById('score-container').style.display='block';
  renderScore();
}
function renderScore() {
  // Compute overall score as average across all cards, including unshown ones
  const allKeys = flashcards.map(c => c.Tagalog);
  let overall = 0;
  if (allKeys.length) {
    const scores = allKeys.map(key => score(key) * 100);
    overall = Math.round(scores.reduce((a, b) => a + b, 0) / allKeys.length);
  }
  document.getElementById('overall-score').textContent = `Overall: ${overall}%`;

  // List scores for all flashcards (reuse allKeys from above)
  const ul = document.getElementById('word-scores-list');
  ul.innerHTML = '';
  allKeys.forEach(key => {
    const card = flashcardsByKey[key];
    const pct = Math.round(score(key) * 100);
    const li = document.createElement('li');
    li.textContent = `${card.Tagalog} – ${card.English}: ${pct}%`;
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
  // Clear memory
  localStorage.removeItem(memoryKey);
  memory = {};
  history = [];
  historyPos = -1;
  skipRecordWrong = false;
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
    // Load memory and initialize
    loadMemory();
    history = [];
    historyPos = -1;
    skipRecordWrong = false;
    switchToFlashcard();
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
