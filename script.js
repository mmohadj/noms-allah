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

function escapeQuotes(str) {
  return str.replaceAll("'", "\\'");
}

// =====================
// LocalStorage (progress)
// =====================
const STORAGE_KEY = "asmaUser";

function defaultUserData() {
  return {
    bestScore: 0,
    lastScore: 0,
    wrongAr: [],        // liste des noms (arabe) ratés dans la dernière session
    updatedAt: null
  };
}

function loadUserData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultUserData();
    const obj = JSON.parse(raw);
    return { ...defaultUserData(), ...obj };
  } catch {
    return defaultUserData();
  }
}

function saveUserData(data) {
  const toSave = { ...data, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

let userData = loadUserData();

function updateHomeProgressUI() {
  const el = $("progressText");
  const btnReview = $("reviewWrongBtn");

  if (!el || !btnReview) return;

  const total = names.length;
  const hasSession = userData.lastScore > 0 || userData.bestScore > 0;

  if (!hasSession) {
    el.innerHTML = "Aucune session enregistrée pour l’instant. Fais un quiz 😄";
    btnReview.disabled = true;
    return;
  }

  const wrongCount = (userData.wrongAr || []).length;

  el.innerHTML = `
    Dernière note : <strong>${userData.lastScore} / ${total}</strong><br>
    Meilleure note : <strong>${userData.bestScore} / ${total}</strong><br>
    Erreurs (dernière session) : <strong>${wrongCount}</strong>
  `;

  btnReview.disabled = wrongCount === 0;
}

function resetProgress() {
  userData = defaultUserData();
  saveUserData(userData);
  updateHomeProgressUI();
  alert("Progression réinitialisée ✅");
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
  if (sectionId === "home") updateHomeProgressUI();
}

document.addEventListener("DOMContentLoaded", () => {
  // menu
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => showSection(btn.dataset.target));
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

  // progression
  $("resetProgressBtn").addEventListener("click", resetProgress);
  $("reviewWrongBtn").addEventListener("click", startWrongReviewSession);

  // affichage initial
  showSection("home");
  updateHomeProgressUI();
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
// Quiz (session + score + sauvegarde)
// =====================
let quizOrder = [];
let quizPos = 0;
let score = 0;
let currentQuestion = null;
let wrongArThisSession = []; // noms en arabe ratés dans la session

function startQuiz() {
  quizOrder = shuffle(names);
  quizPos = 0;
  score = 0;
  wrongArThisSession = [];

  $("scoreBox").classList.add("hidden");
  $("scoreBox").innerHTML = "";
  renderQuestion();
}

function renderQuestion() {
  const quizBox = $("quizBox");

  // Fin du quiz
  if (quizPos >= quizOrder.length) {
    const total = names.length;
    const percent = Math.round((score / total) * 100);

    let msg = "";
    if (percent >= 90) msg = "🔥 Excellent ! Tu maîtrises très bien.";
    else if (percent >= 70) msg = "✅ Très bien ! Continue comme ça.";
    else if (percent >= 50) msg = "👍 Bon début ! Refais une session pour progresser.";
    else msg = "🌱 Pas grave ! Révise les cartes et retente.";

    // ✅ SAUVEGARDE
    userData.lastScore = score;
    if (score > userData.bestScore) userData.bestScore = score;
    userData.wrongAr = [...new Set(wrongArThisSession)]; // unique
    saveUserData(userData);
    updateHomeProgressUI();

    quizBox.innerHTML = "";

    $("scoreBox").classList.remove("hidden");
    $("scoreBox").innerHTML = `
      <div class="score-card">
        <div class="chip">Session Quiz terminée</div>
        <h3 style="margin:12px 0 0;">Ta note</h3>

        <div class="score-big">${score} / ${total}</div>
        <div class="score-pill">${percent}%</div>

        <p style="margin-top:12px; color: var(--muted);">${msg}</p>

        ${
          userData.wrongAr.length > 0
            ? `<p style="margin-top:10px;color:var(--muted);">
                 Erreurs à revoir : <strong>${userData.wrongAr.length}</strong>
               </p>`
            : `<p style="margin-top:10px;color:var(--muted);">
                 Aucune erreur, magnifique ✅
               </p>`
        }

        <div class="actions">
          <button class="btn btn-primary" onclick="startQuiz()">Refaire une session</button>
          <button class="btn" onclick="showSection('cards')">Réviser les cartes</button>
          ${
            userData.wrongAr.length > 0
              ? `<button class="btn" onclick="startWrongReviewSession()">Réviser mes erreurs</button>`
              : ``
          }
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

function answer(choice) {
  const feedback = $("feedback");
  const ok = choice === currentQuestion.fr;

  // Désactiver les boutons après réponse
  document.querySelectorAll(".choice-btn").forEach(b => b.disabled = true);

  if (ok) {
    score++;
    feedback.textContent = "✅ Bonne réponse !";
    feedback.classList.add("ok");
  } else {
    wrongArThisSession.push(currentQuestion.ar);
    feedback.innerHTML = `❌ Mauvaise réponse. C’était : <strong>${currentQuestion.fr}</strong>`;
    feedback.classList.add("bad");
  }

  setTimeout(() => {
    quizPos++;
    renderQuestion();
  }, 850);
}

// =====================
// Session “Réviser mes erreurs”
// (quiz uniquement sur les erreurs de la dernière session)
// =====================
let wrongReviewOrder = [];
let wrongReviewPos = 0;
let wrongReviewScore = 0;

function startWrongReviewSession() {
  // recharge au cas où
  userData = loadUserData();

  const wrongAr = userData.wrongAr || [];
  if (wrongAr.length === 0) {
    alert("Tu n’as aucune erreur à réviser ✅");
    return;
  }

  // Construire la liste des noms concernés
  const selected = names.filter(n => wrongAr.includes(n.ar));
  wrongReviewOrder = shuffle(selected);
  wrongReviewPos = 0;
  wrongReviewScore = 0;

  showSection("quiz");
  $("scoreBox").classList.add("hidden");
  $("scoreBox").innerHTML = "";
  renderWrongReviewQuestion();
}

function renderWrongReviewQuestion() {
  const quizBox = $("quizBox");

  if (wrongReviewPos >= wrongReviewOrder.length) {
    const total = wrongReviewOrder.length;
    const percent = Math.round((wrongReviewScore / total) * 100);

    quizBox.innerHTML = "";
    $("scoreBox").classList.remove("hidden");
    $("scoreBox").innerHTML = `
      <div class="score-card">
        <div class="chip">Session “Erreurs” terminée</div>
        <h3 style="margin:12px 0 0;">Ta note</h3>

        <div class="score-big">${wrongReviewScore} / ${total}</div>
        <div class="score-pill">${percent}%</div>

        <p style="margin-top:12px;color:var(--muted);">
          Refaire ce mode 2-3 fois et tu vas solidifier direct 🔥
        </p>

        <div class="actions">
          <button class="btn btn-primary" onclick="startWrongReviewSession()">Refaire erreurs</button>
          <button class="btn" onclick="startQuiz()">Revenir au quiz normal</button>
          <button class="btn" onclick="showSection('cards')">Réviser les cartes</button>
        </div>
      </div>
    `;
    return;
  }

  const q = wrongReviewOrder[wrongReviewPos];

  // 4 choix dont la bonne réponse
  let choices = shuffle(names).slice(0, 3).map(x => x.fr);
  if (!choices.includes(q.fr)) choices[0] = q.fr;
  choices = shuffle(choices);

  quizBox.innerHTML = `
    <div class="q-head">
      <div class="chip">Erreurs ${wrongReviewPos + 1} / ${wrongReviewOrder.length}</div>
    </div>

    <p class="q-title">Quel est le sens de <strong>${q.ar}</strong> ?</p>
    <p class="q-sub">${q.tr}</p>

    <div class="choices">
      ${choices.map(c => `<button class="choice-btn" onclick="answerWrongReview('${escapeQuotes(c)}')">${c}</button>`).join("")}
    </div>

    <div id="feedback" class="feedback"></div>
  `;
}

function answerWrongReview(choice) {
  const feedback = $("feedback");
  const q = wrongReviewOrder[wrongReviewPos];
  const ok = choice === q.fr;

  document.querySelectorAll(".choice-btn").forEach(b => b.disabled = true);

  if (ok) {
    wrongReviewScore++;
    feedback.textContent = "✅ Bien !";
    feedback.classList.add("ok");
  } else {
    feedback.innerHTML = `❌ C’était : <strong>${q.fr}</strong>`;
    feedback.classList.add("bad");
  }

  setTimeout(() => {
    wrongReviewPos++;
    renderWrongReviewQuestion();
  }, 850);
}

// =====================
// Text-to-Speech (vocal)
// =====================
function speakArabic(text) {
  if (!("speechSynthesis" in window)) {
    alert("Ton navigateur ne supporte pas la lecture vocale.");
    return;
  }

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ar-SA";
  utter.rate = 0.9;
  utter.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const arabicVoice = voices.find(v => (v.lang || "").toLowerCase().startsWith("ar"));
  if (arabicVoice) utter.voice = arabicVoice;

  window.speechSynthesis.speak(utter);
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
