import { REAL_DB_DISRUPTIONS, FAKE_DB_DISRUPTIONS } from './db.js';

// Game types
export const GAMES = {
  REAL_OR_FAKE: 'real_or_fake',
  DELAY_GUESS: 'delay_guess',
  STATION_QUIZ: 'station_quiz',
};

// ---- REAL OR FAKE ----
export function createRealOrFakeGame() {
  const isReal = Math.random() > 0.5;
  const pool = isReal ? REAL_DB_DISRUPTIONS : FAKE_DB_DISRUPTIONS;
  const disruption = pool[Math.floor(Math.random() * pool.length)];

  return {
    type: GAMES.REAL_OR_FAKE,
    question: disruption,
    answer: isReal ? 'real' : 'fake',
    attempts: 0,
  };
}

export function formatRealOrFakeQuestion(game) {
  return (
    `🎮 *MINIGAME: Real oder Fake?*\n\n` +
    `Folgende Störungsmeldung von der DB:\n\n` +
    `_"${game.question}"_\n\n` +
    `Ist das eine echte DB-Meldung?\n` +
    `Antworte mit *real* oder *fake*`
  );
}

export function checkRealOrFake(game, answer) {
  const normalized = answer.toLowerCase().trim();
  if (!['real', 'fake'].includes(normalized)) return null; // invalid input
  return normalized === game.answer;
}

// ---- DELAY GUESS ----
export function createDelayGuessGame(departure, actualDelay) {
  const trainName = departure.line?.name || 'Unbekannter Zug';
  const origin = departure.stop?.name || 'Unbekannt';
  const destination = departure.destination?.name || 'Unbekannt';

  return {
    type: GAMES.DELAY_GUESS,
    question: { trainName, origin, destination },
    answer: actualDelay,
    attempts: 0,
  };
}

export function formatDelayGuessQuestion(game) {
  const { trainName, origin, destination } = game.question;
  return (
    `🎮 *MINIGAME: Verspätungs-Schätzung*\n\n` +
    `${trainName} von ${origin} nach ${destination}\n\n` +
    `Wie viele Minuten Verspätung hat der Zug gerade?\n` +
    `Antworte mit einer Zahl (z.B. *15*)`
  );
}

export function checkDelayGuess(game, answer) {
  const guess = parseInt(answer.trim());
  if (isNaN(guess)) return null;
  const diff = Math.abs(guess - game.answer);
  return { guess, actual: game.answer, diff, correct: diff <= 3 };
}

// ---- STATION QUIZ ----
const STATION_FACTS = [
  {
    question: 'Wie viele Gleise hat der Stuttgarter Hauptbahnhof (Tiefbahnhof, nach Stuttgart 21)?',
    answer: '8',
    options: ['6', '8', '10', '16'],
  },
  {
    question: 'Wie lang ist die Schnellfahrstrecke Mannheim–Stuttgart?',
    answer: '99 km',
    options: ['67 km', '99 km', '112 km', '145 km'],
  },
  {
    question: 'Welche Höchstgeschwindigkeit hat der ICE 3 Neo?',
    answer: '320 km/h',
    options: ['250 km/h', '300 km/h', '320 km/h', '350 km/h'],
  },
  {
    question: 'In welchem Jahr wurde der erste ICE in Betrieb genommen?',
    answer: '1991',
    options: ['1988', '1991', '1994', '1997'],
  },
  {
    question: 'Wie heißt die längste Eisenbahnbrücke Deutschlands?',
    answer: 'Hochdonner Brücke',
    options: ['Rendsburger Hochbrücke', 'Hochdonner Brücke', 'Elbebrücke Wittenberge', 'Rheinbrücke Wesel'],
  },
];

export function createStationQuizGame() {
  const fact = STATION_FACTS[Math.floor(Math.random() * STATION_FACTS.length)];
  return {
    type: GAMES.STATION_QUIZ,
    question: fact.question,
    answer: fact.answer,
    options: fact.options,
    attempts: 0,
  };
}

export function formatStationQuizQuestion(game) {
  const letters = ['A', 'B', 'C', 'D'];
  const opts = game.options.map((o, i) => `${letters[i]}) ${o}`).join('\n');
  return (
    `🎮 *MINIGAME: Bahn-Quiz*\n\n` +
    `${game.question}\n\n` +
    `${opts}\n\n` +
    `Antworte mit *A*, *B*, *C* oder *D*`
  );
}

export function checkStationQuiz(game, answer) {
  const letters = ['A', 'B', 'C', 'D'];
  const normalized = answer.toUpperCase().trim();
  const idx = letters.indexOf(normalized);
  if (idx === -1) return null;
  const chosen = game.options[idx];
  return chosen === game.answer;
}

// Pick a random game (excluding delay_guess if no data)
export function pickRandomGame(hasDelayData = false) {
  const available = [GAMES.REAL_OR_FAKE, GAMES.STATION_QUIZ];
  if (hasDelayData) available.push(GAMES.DELAY_GUESS);
  return available[Math.floor(Math.random() * available.length)];
}
