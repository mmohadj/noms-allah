// =====================
// Données (10 noms)
// =====================
const names = [
  { ar: "الرَّحْمٰن", tr: "Ar-Rahman", fr: "Le Tout Miséricordieux" },
  { ar: "الرَّحِيم", tr: "Ar-Rahim", fr: "Le Très Miséricordieux" },
  { ar: "الْمَلِك", tr: "Al-Malik", fr: "Le Souverain" },
  { ar: "الْقُدُّوس", tr: "Al-Quddus", fr: "Le Très Pur" },
  { ar: "السَّلَام", tr: "As-Salam", fr: "La Paix" },
  { ar: "الْمُؤْمِن", tr: "Al-Mu’min", fr: "Le Protecteur" },
  { ar: "الْعَزِيز", tr: "Al-‘Aziz", fr: "Le Tout-Puissant" },
  { ar: "الْغَفُور", tr: "Al-Ghafur", fr: "Le Très Pardonneur" },
  { ar: "الرَّزَّاق", tr: "Ar-Razzaq", fr: "Le Grand Pourvoyeur" },
  { ar: "الْوَكِيل", tr: "Al-Wakil", fr: "Le Garant" }
];

// =====================
// Helpers
// =====================
function $(id) { return document.getElementById(id); }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// =====================
// Navigation
// =====================
function showSection(sectionId) {
  document.querySelectorAll("main section").forEach(s => s.classList.add("hidden"));
  $(sectionId).classList.remove("hidden");

  // active nav button
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  const btn = document.querySelector(`.nav-btn[data-target="${sectionId}"]`);
  if (btn) btn.classList.add("active");

  if (sectionId === "cards") renderCard();
}

document.addEventListener("DOMContentLoaded", () => {
  // menu
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showSection(btn.dataset.target);
    });
  });

  // raccourcis accueil
  $("goCards").addEventListener("click", () => showSection("cards"));
  $("goQuiz").addEventListener("click", () => showSection("quiz"));

  // boutons cartes
  $("prevBtn").addEventListener("click", prevCard);
  $("nextBtn").addEventListener("click", nextCard);
  $("toggleBtn").addEventListener("click", toggleDetails);

  // quiz
  $("startQuizBtn").addEventListener("click", startQuiz);

  // affichage initial
  showSection("home");
});

// =====================
// Cartes mémo
// =====================
let cardIndex = 0;
let showDetails = false;

function renderCard() {
  const n = names[cardIndex];
  const card = $("card");

  card.innerHTML = `
    <div class="card-top">
      <div class="chip">Carte ${cardIndex + 1} / ${names.length}</div>

      <div class="tts-row">
        <button class="tts-btn" onclick="speakArabic('${escapeHtml(n.ar)}')">🔊 Écouter</button>
      </div>
    </div>

    <h1 class="arabic">${n.ar}</h1>
    <h3 class="translit">${n.tr}</h3>

    ${showDetails
      ? `<p class="meaning"><strong>${n.fr}</strong></p>`
      : `<p class="hint">Clique sur “Afficher la traduction”</p>`
    }
  `;

  $("toggleBtn").textContent = showDetails ? "Masquer la traduction" : "Afficher la traduction";
}

function toggleDetails() {
  showDetails = !showDetails;
  renderCard();
}

function nextCard() {
  cardIndex = (cardIndex + 1) % names.length;
  showDetails = false;
  renderCard();
}

function prevCard() {
  cardIndex = (cardIndex - 1 + names.length) % names.length;
  showDetails = false;
  renderCard();
}

// =====================
// Quiz (score sur 10)
// =====================
let quizOrder = [];
let quizPos = 0;
let score = 0;
let currentQuestion = null;

function startQuiz() {
  quizOrder = shuffle(names);
  quizPos = 0;
  score = 0;

  $("scoreBox").classList.add("hidden");
  renderQuestion();
}

function renderQuestion() {
  const quizBox = $("quizBox");

  // Fin du quiz
  if (quizPos >= quizOrder.length) {
    quizBox.innerHTML = "";
    $("scoreBox").classList.remove("hidden");
    $("scoreBox").innerHTML = `
      <div class="score-card">
        <h3>Résultat</h3>
        <p>Score : <strong>${score} / ${names.length}</strong></p>
        <div class="actions">
          <button class="btn btn-primary" onclick="startQuiz()">Rejouer</button>
          <button class="btn" onclick="showSection('cards')">Réviser les cartes</button>
        </div>
      </div>
    `;
    return;
  }

  currentQuestion = quizOrder[quizPos];

  // 4 choix
  let choices = shuffle(names).slice(0, 3).map(x => x.fr);
  if (!choices.includes(currentQuestion.fr)) {
    choices[0] = currentQuestion.fr;
  }
  choices = shuffle(choices);

  quizBox.innerHTML = `
    <div class="q-head">
      <div class="chip">Question ${quizPos + 1} / ${names.length}</div>
    </div>

    <p class="q-title">Quel est le sens de <strong>${currentQuestion.ar}</strong> ?</p>
    <p class="q-sub">${currentQuestion.tr}</p>

    <div class="choices">
      ${choices.map(c => `<button class="choice-btn" onclick="answer('${escapeQuotes(c)}')">${c}</button>`).join("")}
    </div>

    <div id="feedback" class="feedback"></div>
  `;
}

function escapeQuotes(str) {
  return str.replaceAll("'", "\\'");
}

function answer(choice) {
  const feedback = $("feedback");
  const ok = choice === currentQuestion.fr;

  // Désactiver les boutons après réponse
  document.querySelectorAll(".choice-btn").forEach(b => b.disabled = true);

  if (ok) {
    score++;
    feedback.innerHTML = `✅ Bonne réponse !`;
    feedback.classList.add("ok");
  } else {
    feedback.innerHTML = `❌ Mauvaise réponse. C’était : <strong>${currentQuestion.fr}</strong>`;
    feedback.classList.add("bad");
  }

  // passer à la question suivante
  setTimeout(() => {
    quizPos++;
    renderQuestion();
  }, 900);
}

// =====================
// Text-to-Speech (vocal)
// =====================
function speakArabic(text) {
  if (!("speechSynthesis" in window)) {
    alert("Ton navigateur ne supporte pas la lecture vocale.");
    return;
  }

  // Stop si une voix est déjà en cours
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ar-SA";     // arabe (Arabie Saoudite) - tu peux tester "ar" aussi
  utter.rate = 0.9;         // vitesse (0.5 -> 2)
  utter.pitch = 1.0;        // tonalité (0 -> 2)

  // Essayer de choisir une voix arabe si dispo
  const voices = window.speechSynthesis.getVoices();
  const arabicVoice = voices.find(v => (v.lang || "").toLowerCase().startsWith("ar"));
  if (arabicVoice) utter.voice = arabicVoice;

  window.speechSynthesis.speak(utter);
}

// petit helper pour éviter les problèmes de caractères dans HTML
function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

