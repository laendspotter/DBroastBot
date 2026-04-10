import { sendMessage } from '../lib/telegram.js';
import { getSession, setSession, clearSession } from '../lib/session.js';
import { searchStation, findJourney, getTripDelay, getTripRemarks, getRandomDelayedDeparture } from '../lib/db.js';
import { roastDelay, roastCancellation, roastMilestone, ROAST_MILESTONES } from '../lib/roast.js';
import {
  createRealOrFakeGame, formatRealOrFakeQuestion, checkRealOrFake,
  createDelayGuessGame, formatDelayGuessQuestion, checkDelayGuess,
  createStationQuizGame, formatStationQuizQuestion, checkStationQuiz,
  pickRandomGame, GAMES,
} from '../lib/games.js';

// Parse journey input like "ICE 123 Stuttgart München" or "RE 5 Hamburg Hannover"
function parseJourneyInput(text) {
  // Match: train type + number + origin + destination
  const match = text.match(/^([A-Za-z]+\s*\d+)\s+(.+?)\s*[→\-–]\s*(.+)$/i)
    || text.match(/^([A-Za-z]+\s*\d+)\s+(\S+(?:\s\S+)?)\s+(\S+(?:\s\S+)?)$/i);

  if (!match) return null;
  return {
    trainNumber: match[1].replace(/\s+/, ' ').trim(),
    origin: match[2].trim(),
    destination: match[3].trim(),
  };
}

// Format delay nicely
function formatDelay(minutes) {
  if (minutes <= 0) return '✅ pünktlich';
  if (minutes < 5) return `⏱ +${minutes} Min`;
  if (minutes < 20) return `🟡 +${minutes} Min`;
  if (minutes < 60) return `🔴 +${minutes} Min`;
  return `💀 +${minutes} Min`;
}

// Handle /start
async function handleStart(chatId) {
  await sendMessage(chatId,
    `🚂 *DB Roast Bot*\n\n` +
    `Ich tracke deine Zugfahrt live und roaste jede Verspätung.\n\n` +
    `*So geht's:*\n` +
    `Schick mir deine Zugfahrt in diesem Format:\n\n` +
    `\`ICE 123 Stuttgart → München\`\n` +
    `\`RE 5 Hamburg - Hannover\`\n` +
    `\`IC 2012 Köln Frankfurt\`\n\n` +
    `Zwischendrin gibt's Minigames 🎮\n\n` +
    `Befehle:\n` +
    `/status - aktuelle Verspätung\n` +
    `/game - Minigame starten\n` +
    `/stop - Tracking beenden`
  );
}

// Handle /status
async function handleStatus(chatId, session) {
  if (!session.tracking) {
    return sendMessage(chatId, 'Kein aktives Tracking. Schick mir zuerst deine Zugfahrt.');
  }

  const { tripId, trainName } = session.tracking;
  const delayData = await getTripDelay(tripId);

  if (!delayData) {
    return sendMessage(chatId, 'Konnte keine aktuellen Daten laden. DB-API streikt gerade 🙃');
  }

  if (delayData.cancelled) {
    const roast = await roastCancellation(trainName);
    return sendMessage(chatId, `❌ *${trainName} wurde gestrichen*\n\n${roast}`);
  }

  const delay = delayData.currentDelay;
  return sendMessage(chatId,
    `🚂 *${trainName}*\n` +
    `Aktuelle Verspätung: ${formatDelay(delay)}\n` +
    `Max. Verspätung: ${formatDelay(delayData.maxDelay)}`
  );
}

// Handle /stop
async function handleStop(chatId, session) {
  if (!session.tracking) {
    return sendMessage(chatId, 'Kein aktives Tracking.');
  }
  const { trainName } = session.tracking;
  clearSession(chatId);
  await sendMessage(chatId, `Tracking für *${trainName}* beendet. War wieder typisch DB 🙃`);
}

// Start a minigame
async function startGame(chatId, session) {
  const hasDelayData = !!session.tracking;
  const gameType = pickRandomGame(hasDelayData);

  let game;

  if (gameType === GAMES.REAL_OR_FAKE) {
    game = createRealOrFakeGame();
    setSession(chatId, { state: 'game', game });
    return sendMessage(chatId, formatRealOrFakeQuestion(game));
  }

  if (gameType === GAMES.DELAY_GUESS) {
    // Use a random major station
    const stations = ['8000105', '8000261', '8000244', '8000068', '8000085']; // Frankfurt, Munich, Hamburg, Cologne, Stuttgart
    const stationEva = stations[Math.floor(Math.random() * stations.length)];
    const data = await getRandomDelayedDeparture(stationEva);

    if (!data) {
      // Fall back to station quiz
      game = createStationQuizGame();
      setSession(chatId, { state: 'game', game });
      return sendMessage(chatId, formatStationQuizQuestion(game));
    }

    game = createDelayGuessGame(data.departure, data.delay);
    setSession(chatId, { state: 'game', game });
    return sendMessage(chatId, formatDelayGuessQuestion(game));
  }

  if (gameType === GAMES.STATION_QUIZ) {
    game = createStationQuizGame();
    setSession(chatId, { state: 'game', game });
    return sendMessage(chatId, formatStationQuizQuestion(game));
  }
}

// Handle game answer
async function handleGameAnswer(chatId, session, text) {
  const { game } = session;
  if (!game) return;

  let correct = null;
  let resultText = '';

  if (game.type === GAMES.REAL_OR_FAKE) {
    correct = checkRealOrFake(game, text);
    if (correct === null) return sendMessage(chatId, 'Antworte mit *real* oder *fake* 😅');
    resultText = correct
      ? `✅ *Richtig!* "${game.question}" ist tatsächlich ${game.answer === 'real' ? 'eine echte DB-Meldung' : 'fake'}.`
      : `❌ *Falsch!* Das war ${game.answer === 'real' ? 'eine echte DB-Meldung' : 'fake'}. Die Wahrheit ist manchmal schwerer zu erkennen als die DB-Pünktlichkeit.`;
  }

  if (game.type === GAMES.DELAY_GUESS) {
    const result = checkDelayGuess(game, text);
    if (result === null) return sendMessage(chatId, 'Schick mir eine Zahl, z.B. *15* 😅');
    resultText = result.correct
      ? `✅ *Fast genau!* Du hast ${result.guess} Min geschätzt, tatsächlich waren es ${result.actual} Min. Respekt!`
      : `❌ Du hast ${result.guess} Min geschätzt, tatsächlich: *${result.actual} Min*. Differenz: ${result.diff} Min.`;
  }

  if (game.type === GAMES.STATION_QUIZ) {
    correct = checkStationQuiz(game, text);
    if (correct === null) return sendMessage(chatId, 'Antworte mit *A*, *B*, *C* oder *D* 😅');
    resultText = correct
      ? `✅ *Richtig!* Die Antwort ist: ${game.answer}`
      : `❌ *Falsch!* Die richtige Antwort wäre: *${game.answer}*`;
  }

  setSession(chatId, { state: session.tracking ? 'tracking' : 'idle', game: null });
  await sendMessage(chatId, resultText + '\n\n_/game für ein neues Spiel_');
}

// Main journey lookup
async function handleJourneyLookup(chatId, text) {
  const parsed = parseJourneyInput(text);

  if (!parsed) {
    return sendMessage(chatId,
      'Format nicht erkannt 😅\n\nBitte so:\n`ICE 123 Stuttgart → München`'
    );
  }

  await sendMessage(chatId, `🔍 Suche *${parsed.trainNumber}* von ${parsed.origin}...`);

  const originStation = await searchStation(parsed.origin);
  if (!originStation) {
    return sendMessage(chatId, `Bahnhof "${parsed.origin}" nicht gefunden 🤔`);
  }

  const journey = await findJourney(parsed.trainNumber, originStation.id);
  if (!journey) {
    return sendMessage(chatId,
      `*${parsed.trainNumber}* ab ${originStation.name} nicht gefunden.\n\nLäuft der Zug heute? Oder hat ihn die DB schon heimlich gestrichen? 🫠`
    );
  }

  const trainName = journey.line?.name || parsed.trainNumber;
  const tripId = journey.tripId;

  // Get initial delay
  const delayData = await getTripDelay(tripId);
  const remarks = await getTripRemarks(tripId);
  const delay = delayData?.currentDelay || 0;
  const reason = remarks?.[0]?.text || null;

  setSession(chatId, {
    state: 'tracking',
    journey: parsed,
    tracking: {
      tripId,
      trainName,
      originName: originStation.name,
      lastDelay: delay,
      roastedDelays: [],
    },
  });

  let statusMsg = `✅ *${trainName}* wird jetzt getrackt!\n` +
    `Von: ${originStation.name}\n` +
    `Aktuelle Verspätung: ${formatDelay(delay)}\n\n`;

  if (delay > 0) {
    const roast = await roastDelay(trainName, delay, reason);
    statusMsg += `🔥 *Roast:*\n${roast}\n\n`;
  } else {
    statusMsg += `Der Zug ist noch pünktlich. Genieß es solange es dauert. 🙃\n\n`;
  }

  statusMsg += `Ich melde mich bei Änderungen.\n/status /game /stop`;

  await sendMessage(chatId, statusMsg);
}

// Main webhook handler
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('DB Roast Bot läuft 🚂');

  const update = req.body;

  // Handle message
  const message = update.message;
  if (!message?.text) return res.status(200).json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text.trim();
  const session = getSession(chatId);

  try {
    // Commands
    if (text === '/start' || text === '/hilfe' || text === '/help') {
      return await handleStart(chatId).then(() => res.status(200).json({ ok: true }));
    }

    if (text === '/status') {
      return await handleStatus(chatId, session).then(() => res.status(200).json({ ok: true }));
    }

    if (text === '/stop') {
      return await handleStop(chatId, session).then(() => res.status(200).json({ ok: true }));
    }

    if (text === '/game') {
      return await startGame(chatId, session).then(() => res.status(200).json({ ok: true }));
    }

    // Game answer
    if (session.state === 'game') {
      return await handleGameAnswer(chatId, session, text).then(() => res.status(200).json({ ok: true }));
    }

    // Journey lookup
    return await handleJourneyLookup(chatId, text).then(() => res.status(200).json({ ok: true }));

  } catch (e) {
    console.error('Handler error:', e);
    await sendMessage(chatId, 'Interner Fehler 😵 Versuch es nochmal.');
    return res.status(200).json({ ok: true });
  }
}
