# FTTR CITY Online Backend

This root-level backend starter provides an optional Node.js/WebSocket service for online presence, room chat, virtual wallet ledger, and server-validated job rewards. It is deliberately isolated from the FTTR Store database and checkout.

## Run locally

```bash
npm install
DATA_DIR=./data npm start
```

Health: `http://localhost:8787/health`  
WebSocket: `ws://localhost:8787/ws`  
REST: `/api/world`, `/api/leaderboard`, `/api/action`

Set `FTTR_CITY_API` in the browser to your backend URL (for example `https://city-api.example.com`) before deployment, or enter the URL in the Online panel. Set `ALLOWED_ORIGINS` to the exact deployed frontend origin(s). Do not put secrets in frontend files.

## Deploy

Deploy this project root as a Docker service on a Node-compatible host with WebSocket support (Render, Railway, Fly.io, or Cloud Run). Attach a persistent volume and set `DATA_DIR=/data`. Set `PORT` from the hosting environment and `ALLOWED_ORIGINS=https://city.fucktherules.my.id`. Use HTTPS/WSS. GitHub Pages only hosts the frontend and cannot run this Node server.

## Security / production checklist

- This starter has rate limits, input validation, bounded message size, safe text handling, idempotency keys for wallet actions, and server-authoritative rewards. It does **not** provide account authentication yet: displayed names are pseudonyms and must not be treated as verified identities.
- Before public launch, add Firebase ID-token verification on the server, persistent transactional database (Firestore transactions/Postgres), bans/moderation tools, audit logging, abuse reporting, backups, monitoring, and per-account quotas. JSON-file persistence is suitable for a demo/single instance only; it is not safe for multiple replicas and does not provide database transactions.
- The football engine in `football.js` is currently a client-side prototype. For competitive cross-device league state, move fixture generation, results, transfer windows and supporter actions to the server with a unique fixture ID and atomic transaction. Do not trust client-submitted scores.
- The existing store, checkout, payment provider, order records, and store database are not used by this virtual economy. Virtual currency is non-cashable and has no real-money value.


## Job catalogue update
The `/api/action` job allow-list includes store, station, bus, stadium, photo, journalist, food, barista, doctor, medic, police, cleaner, mechanic, builder, security and gardener. Job rewards are server-validated and idempotent. The current browser UI uses a local BOT ON DUTY roster to illustrate vacant-role takeover; this roster is not yet a shared multiplayer claim system. Do not describe the bot roster or browser needs as globally synchronized until a durable authenticated job/needs API is added.
