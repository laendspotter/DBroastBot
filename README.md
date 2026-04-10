# DB Roast Bot 🚂

Telegram bot der deine Zugfahrt trackt und jede Verspätung roastet.

## Setup

### 1. Repo clonen & deployen
```bash
git clone ...
cd db-roast-bot
vercel
```

### 2. Env Variables in Vercel setzen
```
TELEGRAM_BOT_TOKEN=dein_bot_token_von_botfather
GEMINI_API_KEY=dein_gemini_api_key
SETUP_SECRET=irgendeinzufälligespasswort
```

### 3. Webhook registrieren
Nach dem Deploy einmal aufrufen:
```
https://deine-domain.vercel.app/api/setup?secret=DEIN_SETUP_SECRET
```

## Benutzung

Telegram Bot starten → `/start`

Zugfahrt schicken:
```
ICE 123 Stuttgart → München
RE 5 Hamburg - Hannover
IC 2012 Köln Frankfurt
```

Befehle:
- `/status` - aktuelle Verspätung
- `/game` - Minigame starten  
- `/stop` - Tracking beenden

## Minigames
- 🎮 Real oder Fake? - echte vs. erfundene DB-Störungsmeldungen
- 🔢 Verspätungs-Schätzung - wie viel Verspätung hat der Zug?
- 🧠 Bahn-Quiz - Wissen über die DB
