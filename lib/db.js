import { createClient } from 'db-vendo-client';
import { profile as dbProfile } from 'db-vendo-client/p/db/index.js';

const client = createClient(dbProfile, 'db-roast-bot/1.0');

// Search for a station by name, returns first match
export async function searchStation(name) {
  try {
    const results = await client.locations(name, { results: 5, stops: true });
    const station = results.find(r => r.type === 'stop' || r.type === 'station');
    return station || null;
  } catch (e) {
    console.error('searchStation error:', e);
    return null;
  }
}

// Find a specific journey/trip
export async function findJourney(trainNumber, originEva, date = new Date()) {
  try {
    const departures = await client.departures(originEva, {
      when: date,
      duration: 120,
      results: 50,
      includeRelatedTrips: true,
    });

    const match = departures.departures?.find(dep => {
      const line = dep.line?.name || dep.line?.fahrtNr || '';
      return line.toLowerCase().includes(trainNumber.toLowerCase());
    });

    return match || null;
  } catch (e) {
    console.error('findJourney error:', e);
    return null;
  }
}

// Get current delay for a trip
export async function getTripDelay(tripId) {
  try {
    const trip = await client.trip(tripId, { stopovers: true });
    if (!trip?.stopovers) return null;

    const delays = trip.stopovers.map(s => {
      const planned = s.plannedArrival || s.plannedDeparture;
      const actual = s.arrival || s.departure;
      if (!planned || !actual) return 0;
      return Math.round((new Date(actual) - new Date(planned)) / 60000);
    });

    const currentDelay = delays[delays.length - 1] || 0;
    const maxDelay = Math.max(...delays);

    return {
      currentDelay,
      maxDelay,
      stopovers: trip.stopovers,
      cancelled: trip.cancelled || false,
    };
  } catch (e) {
    console.error('getTripDelay error:', e);
    return null;
  }
}

// Get disruptions/remarks for a trip
export async function getTripRemarks(tripId) {
  try {
    const trip = await client.trip(tripId, { remarks: true });
    return trip?.remarks || [];
  } catch (e) {
    return [];
  }
}

// Get departures for minigame (guessing delays)
export async function getRandomDelayedDeparture(stationEva) {
  try {
    const result = await client.departures(stationEva, {
      duration: 60,
      results: 30,
    });

    const delayed = result.departures?.filter(d => {
      const planned = d.plannedWhen;
      const actual = d.when;
      if (!planned || !actual) return false;
      const delay = Math.round((new Date(actual) - new Date(planned)) / 60000);
      return delay > 0;
    });

    if (!delayed?.length) return null;
    const pick = delayed[Math.floor(Math.random() * delayed.length)];
    const delay = Math.round((new Date(pick.when) - new Date(pick.plannedWhen)) / 60000);
    return { departure: pick, delay };
  } catch (e) {
    return null;
  }
}

// Real disruption reasons from DB
export const REAL_DB_DISRUPTIONS = [
  'Wegen einer Streckensperrung aufgrund eines Personenschadens',
  'Wegen eines Feuerwehreinsatzes an der Strecke',
  'Wegen einer technischen Störung am Fahrzeug',
  'Wegen einer Weichenstörung',
  'Wegen Personen im Gleis',
  'Wegen eines kurzfristigen Fahrzeugmangels',
  'Wegen einer Signalstörung',
  'Wegen starker Auslastung des Zuges',
  'Wegen einer verspäteten Bereitstellung',
  'Wegen Tieren im Gleis',
  'Wegen Vandalismus',
  'Wegen einer Oberleitungsstörung',
  'Wegen eines Polizeieinsatzes',
  'Wegen Unwetterschäden an der Strecke',
  'Wegen einer Türstörung am Fahrzeug',
];

export const FAKE_DB_DISRUPTIONS = [
  'Wegen zu vieler Fahrgäste mit großem Gepäck',
  'Wegen eines streikenden Bordrestaurants',
  'Wegen Zugführer hat den falschen Bahnhof angefahren',
  'Wegen eines philosophischen Disputs im Stellwerk',
  'Wegen eines Hamsters im Antriebssystem',
  'Wegen kollektiver Entscheidungsunfähigkeit im Betriebswerk',
  'Wegen eines verlorenen WLAN-Passworts im Bordrestaurant',
  'Wegen des Fahrplans der mit der Realität kollidiert ist',
  'Wegen eines Schmetterlings der auf den Notfallknopf geflogen ist',
  'Wegen einer Verspätung der Verspätungsmeldung',
];
