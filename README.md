# FUCK THE RULES — FTTR CITY

Paket frontend kota virtual dan starter backend online. Semua file diletakkan langsung di root agar bisa diunggah tanpa folder `assets`, `server`, atau `docs`.

## File utama
- `index.html` — halaman utama kota
- `city.html` — alternatif halaman kota
- `city.css`, `ui-game.css`, `ui-game.js` — antarmuka (HUD, kartu, HP virtual); `ui-game.css` adalah satu-satunya sumber gaya HUD
- `city.js`, `city-world.js`, `football.js`, `online.js`, `art.js` — logika game; `city-world.js` berisi pantai/laut, menara kota, taman, dan penggabungan geometri
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
- Pixel/low-resolution 2.5D rendering for a retro game look.
- Camera controls: mouse wheel / zoom buttons, touch pinch, drag-to-pan, and camera follow reset.
- Blocky voxel citizen character model.
- Citizen needs: hunger, thirst, health, and energy saved locally and gradually depleted during play.
- Food, drinks, grocery items, hospital check-up, first aid, rest, and emergency treatment.
- 16 job roles; vacant roles show BOT ON DUTY and return to bot coverage after a player shift.
- Added hospital, café, mini market, garage, newsroom and industrial works buildings.

Note: citizen needs are local-browser gameplay state in this prototype. Online economy rewards can use the Node.js backend; production-grade shared job roster and cross-device needs require authenticated persistent backend storage.

## Pembaruan tampilan v13
- **HUD baru** untuk HP dan desktop. Di HP, saldo dan status lapar/haus/energi selalu tampil; kesehatan/mood dibuka lewat panah, sedangkan menu (Peta, Travel, Bola, Kerja, HP) dan kontrol kamera dibuka lewat tombol menu di kanan bawah. Di desktop semuanya tampil permanen.
- **Kota lebih hidup**: pantai dan laut animasi di sisi selatan, pier yang bisa dijalani, bianglala, mercusuar, Sky Tower di plaza pantai, kios, payung, palem, perahu dan kapal. Menara kota bervariasi (kaca, kapur, bata, silinder, bertingkat) dan kolam taman dengan bebek. Rumput bertekstur, palet warna lebih cerah, kanal mengalir ke laut dan hanya bisa diseberangi lewat jembatan.
- **Semi-pixel tajam**: dunia dirender di resolusi rendah lalu dibesarkan tanpa blur. Tombol di panel kamera berpindah antara semi-pixel dan HD halus (pilihan tersimpan).
- **Lebih ringan**: ribuan mesh statis digabung per bahan dan area, sehingga jumlah draw call turun drastis di ponsel Android.
- Penanda panah kuning di atas karakter tetap terlihat saat karakter berada di balik gedung tinggi.
- Nama default pemain kini `WARGA_xxxx` (bukan nama tetap yang sama untuk semua orang).

## Pembaruan v14
- **Kota terasa lebih besar**: bangunan dan landmark diperbesar ±25%, karakter dikecilkan ke 70% dan kamera default diperbesar 1,3× (di dalam gedung skala tetap). Kamera dibuat lebih tegak (sudut ±52°) supaya gedung tidak menutupi jalan di belakangnya.
- **Tata letak rapi**: bangunan berderet menghadap jalan, baik di jalan barat-timur maupun utara-selatan. Sisi yang menghadap kamera (selatan/timur jalan) hanya diisi bangunan rendah. Tinggi menara dibatasi otomatis oleh jarak ke jalan di belakangnya (lihat `make()` di `fillCity`). Bagian dalam blok diisi pohon, bukan bangunan acak.
- **Animasi jalan sungguhan**: semua warga (pemain, pejalan kaki, NPC, pemain online) memakai rig berporos pinggul dan bahu: kaki dan tangan berayun berlawanan, badan naik-turun dan condong, dan ada bayangan di tanah. Penyebab "ngambang" di versi lama: sepatu melayang 0,11 di atas tanah dan badan hanya naik-turun tanpa langkah. Mobil juga diperbesar, punya roda, dan menapak.
- **Penanda tap**: riak putih saat layar disentuh, lalu cincin emas berdenyut dan panah di titik tujuan sampai karakter tiba. Penanda hilang otomatis bila karakter tidak bisa maju (mis. titik berada di dalam bangunan).
- Konstanta yang bisa disetel di atas `city.js`: `CITIZEN_S` (ukuran karakter), `BASE_ZOOM` (zoom awal), `CAM_OFF` (sudut kamera).
