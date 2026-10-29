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


## V13 — UI, mobile, dan visual kota
- HUD desktop ditata ulang dengan panel status yang ringkas, hierarki informasi yang konsisten, dan kontrol utama yang tidak saling menutupi.
- Layout mobile dibuat khusus untuk layar sempit: status horizontal, wallet ringkas, joystick, kamera, dan quickbar dengan target sentuh besar.
- Phone menjadi layar penuh di ponsel; peta, chat, kartu bangunan, serta dialog dibuat responsif.
- Kamera awal diperluas, warna dan pencahayaan diseimbangkan, serta variasi gedung, plaza, kios, bangku, lampu lalu lintas, manhole, perahu, dan pejalan kaki ditambahkan.
- Pinch zoom, swipe kamera, tap-to-move, dan joystick dipisahkan agar tidak memicu interaksi yang salah.
- `server.js` juga dapat menyajikan frontend pada origin yang sama. Konfigurasi same-origin terhubung otomatis; GitHub Pages tetap memakai endpoint produksi di `config.js`.

## Pengujian V13
- Syntax seluruh file JavaScript diperiksa.
- Browser test pada 375×812, 390×844, 768×1024, 1024×768, dan 1440×900 tanpa horizontal overflow.
- Map, chat online otomatis, phone, travel, football, jobs, status makanan, masuk/keluar FTTR Store, dan kontrol kamera diklik dan diverifikasi.
- Pinch, swipe, joystick, tap-to-move, serta pengiriman posisi WebSocket diuji pada konteks mobile.
- Tidak ada console error atau response 404 pada alur uji final.

Catatan: pengujian dilakukan di browser Chromium, bukan perangkat Android fisik. Citizen needs tetap tersimpan lokal. Football simulator pada frontend masih menyimpan sebagian state per browser. Backend starter bukan pengganti autentikasi produksi atau database transaksional multi-instance.
