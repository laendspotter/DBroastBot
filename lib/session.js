// In-memory session store
// Note: resets on cold starts, good enough for dev/demo
const sessions = {};

export function getSession(chatId) {
  if (!sessions[chatId]) {
    sessions[chatId] = {
      chatId,
      state: 'idle', // idle | awaiting_journey | tracking | game
      journey: null, // { trainNumber, origin, destination, date }
      tracking: null, // { departureEva, arrivalEva, lastDelay, roastThresholds }
      game: null, // { type, question, answer, attempts }
      roastedDelays: [], // which delay milestones already roasted
    };
  }
  return sessions[chatId];
}

export function setSession(chatId, data) {
  sessions[chatId] = { ...getSession(chatId), ...data };
}

export function clearSession(chatId) {
  sessions[chatId] = {
    chatId,
    state: 'idle',
    journey: null,
    tracking: null,
    game: null,
    roastedDelays: [],
  };
}
