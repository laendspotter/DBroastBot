import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const ROAST_SYSTEM = `Du bist ein sarkastischer deutscher Bahnroast-Bot. 
Du roastest Zugverspätungen auf Deutsch, mit echtem deutschen Humor - trocken, sarkastisch, bissig.
Antworte immer auf Deutsch. Maximal 3 Sätze. Keine Emojis außer Bahn-relevante (🚂🚃🕐).
Beziehe dich auf die konkreten Verspätungsminuten und den Zug wenn möglich.`;

export async function roastDelay(trainName, delayMinutes, reason = null) {
  const reasonText = reason ? ` Der offizielle Grund: "${reason}"` : '';
  const prompt = `${trainName} hat ${delayMinutes} Minuten Verspätung.${reasonText} Roaste diese Verspätung.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: ROAST_SYSTEM,
    });
    return result.response.text().trim();
  } catch (e) {
    console.error('roastDelay error:', e);
    return `${delayMinutes} Minuten Verspätung. Die DB hat mal wieder Überstunden gemacht. 🕐`;
  }
}

export async function roastCancellation(trainName, reason = null) {
  const reasonText = reason ? ` Grund: "${reason}"` : '';
  const prompt = `${trainName} wurde komplett gestrichen.${reasonText} Roaste diese Zugausfäll brutal.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: ROAST_SYSTEM,
    });
    return result.response.text().trim();
  } catch (e) {
    return `${trainName} ausgefallen. Herzlichen Glückwunsch, du hast jetzt unendlich viel Zeit. 🚂`;
  }
}

export async function roastMilestone(trainName, delayMinutes) {
  const milestones = {
    5: 'leichte Verspätung',
    10: 'spürbare Verspätung',
    20: 'erhebliche Verspätung',
    30: 'massive Verspätung',
    60: 'epische Verspätung',
    120: 'legendäre Katastrophen-Verspätung',
  };

  const milestone = Object.entries(milestones)
    .reverse()
    .find(([mins]) => delayMinutes >= parseInt(mins));

  const level = milestone ? milestone[1] : 'Verspätung';
  const prompt = `${trainName} hat gerade die ${delayMinutes}-Minuten-Marke erreicht. Das ist eine ${level}. Schreib einen epischen Meilenstein-Roast.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: ROAST_SYSTEM,
    });
    return result.response.text().trim();
  } catch (e) {
    return `🎉 ${delayMinutes} Minuten! Ein neuer Tiefpunkt wurde erreicht. Die DB dankt für deine Geduld.`;
  }
}

// Roast milestones to track (in minutes)
export const ROAST_MILESTONES = [5, 10, 20, 30, 60, 120];
