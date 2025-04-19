let flashcards = [];
let index = 0;
let showingEnglish = false;

function updateCard() {
  const word = document.getElementById("word");
  const progress = document.getElementById("progress");

  if (flashcards.length === 0) {
    word.textContent = "Loading...";
    progress.textContent = "";
    return;
  }

  const card = flashcards[index];
  word.textContent = showingEnglish ? card.English : card.Tagalog;
  progress.textContent = `${index + 1} / ${flashcards.length}`;
}

function toggleCard() {
  showingEnglish = !showingEnglish;
  updateCard();
}

function nextCard() {
  index = (index + 1) % flashcards.length;
  showingEnglish = false;
  updateCard();
}

function prevCard() {
  index = (index - 1 + flashcards.length) % flashcards.length;
  showingEnglish = false;
  updateCard();
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, i) => {
      obj[header.trim()] = values[i].trim();
      return obj;
    }, {});
  });
}

// Fetch and load the CSV as soon as available
fetch('./flashcards.csv')
  .then(response => response.text())
  .then(data => {
    flashcards = parseCSV(data);
    updateCard();
  })
  .catch(err => {
    console.error("Failed to load flashcards.csv:", err);
    document.getElementById("word").textContent = "Error loading flashcards.";
  });

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log("Service Worker registered"))
    .catch(err => console.error("Service Worker error", err));
}
