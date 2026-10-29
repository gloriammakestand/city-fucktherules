# FUCK THE RULES — FTTR CITY

Paket frontend kota virtual dan starter backend online. Semua file diletakkan langsung di root agar bisa diunggah tanpa folder `assets`, `server`, atau `docs`.

## File utama
- `index.html` — halaman utama kota
- `city.html` — alternatif halaman kota
- `city.css`, `city.js`, `football.js`, `online.js` — antarmuka dan logika game
- `logo.png`, `favicon.png`, `mural.png`, `qris.jpg` — aset gambar, semuanya di root
- `server.js`, `package.json`, `Dockerfile`, `.env.example` — starter backend Node.js/WebSocket
- `ONLINE-BACKEND.md` — petunjuk backend
- `DEPLOY-CITY.txt` — petunjuk deployment

## GitHub Pages
Unggah seluruh isi ZIP ke root repositori baru khusus `city.fucktherules.my.id`, lalu aktifkan GitHub Pages dari branch `main`, folder `/ (root)`. `CNAME` sudah disiapkan. Jangan gunakan repositori toko utama.

## Backend online
GitHub Pages hanya menyajikan frontend. Untuk chat/kehadiran bersama, deploy `server.js` sebagai layanan Node.js dengan WebSocket pada host yang mendukung Node 20 dan persistent storage. Panduan lengkap ada di `ONLINE-BACKEND.md`.

## Batasan prototipe
Football simulator pada frontend masih menyimpan sebagian state per browser. Backend starter bukan pengganti autentikasi produksi atau database transaksional multi-instance. Sebelum peluncuran publik, tambahkan autentikasi terverifikasi, database durable/transaksional, moderasi, backup, monitoring, dan validasi keamanan.


## Latest city gameplay update
- Stylized urban 2.5D/isometric city rendering with varied building facades, road markings, sidewalks, green spaces, shops, football venues, and street-art surfaces. The intended direction is colorful city-builder density with FTTR football/street-culture identity, not pixel art.
- Camera controls: mouse wheel / zoom buttons, touch pinch, drag-to-pan, and camera follow reset. Tap-to-move is the primary mobile control; the optional joystick is hidden by default on touch devices and can be enabled using the JOYSTICK toggle.
- Stylized citizen character with gait animation driven by actual movement, plus a pulsing 3D ground marker at the tapped destination.
- Citizen needs: hunger, thirst, health, and energy saved locally and gradually depleted during play.
- Food, drinks, grocery items, hospital check-up, first aid, rest, and emergency treatment.
- 16 job roles; vacant roles show BOT ON DUTY and return to bot coverage after a player shift.
- Added hospital, café, mini market, garage, newsroom and industrial works buildings.

Note: citizen needs are local-browser gameplay state in this prototype. Online economy rewards can use the Node.js backend; production-grade shared job roster and cross-device needs require authenticated persistent backend storage.


## UI / controls update
- Responsive touch-first HUD for compact Android screens and landscape phones.
- Rebalanced top bar, needs indicators, camera controls, quickbar, location card, and chat panel to reduce overlap.
- Optional mobile joystick toggle; tap-to-move remains the default.
- Destination marker now pulses and expands on the ground when tapping walkable terrain or selecting a destination.
- Walking animation phase advances only while the character is actually moving, preventing the idle walk-cycle bug.
- Multiplayer is still solo mode until the owner deploys the Node backend and sets its real HTTPS URL once in `config.js`.
