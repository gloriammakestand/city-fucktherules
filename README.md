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
- Smooth, non-pixel 2.5D rendering with antialiasing for a cleaner 3D city look.
- Camera controls: mouse wheel / zoom buttons, touch pinch, drag-to-pan, and camera follow reset.
- Smooth, stylized 3D citizen models with rounded body parts, face, hair, clothing, and accessories.
- Citizen needs: hunger, thirst, health, and energy saved locally and gradually depleted during play.
- Food, drinks, grocery items, hospital check-up, first aid, rest, and emergency treatment.
- 16 job roles; vacant roles show BOT ON DUTY and return to bot coverage after a player shift.
- Added hospital, café, mini market, garage, newsroom and industrial works buildings.
- Expanded the map to a wider multi-avenue city with dedicated residential streets and no planned overlap between landmark footprints.

Note: citizen needs are local-browser gameplay state in this prototype. Online economy rewards can use the Node.js backend; production-grade shared job roster and cross-device needs require authenticated persistent backend storage.


## City visual update (V8)
- Non-pixel, smooth 2.5D rendering with antialiasing and higher canvas resolution.
- Expanded city footprint with a multi-avenue road grid, marked crosswalks, sidewalks, parks, planters, street lamps, and residential streets.
- Landmark-specific silhouettes: open-sided bus shelter, station platform and rails, restaurant awning and outdoor tables, hospital cross and ambulance bay, workshop/loading doors, pitched-roof houses, apartment balconies, and open stadium bowls.
- Camera panning follows finger movement like a draggable map, with zoom and follow controls.
- Buildings are placed on separate lots away from the main road lanes.
