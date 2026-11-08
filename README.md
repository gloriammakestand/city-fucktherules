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

## Pembaruan v15
- **Bug pohon**: pohon sebelumnya bisa tumbuh di tengah jalan utara-selatan. Semua pohon kini lewat pengecekan `onRoad()` di `scenery()`.
- **Kota diperbesar**: ditambah Distrik Stadion di timur (jalan baru, tanah dan pantai diperluas hingga x≈200). Kereta dan jalur rel kini berkelok mengikuti kurva, berhenti di stasiun, lalu berbalik arah. Plaza air mancur dipindah ke utara agar jalur rel muat. Kanal berakhir di kolam. Tersedia tujuan perjalanan baru "Stadium District".
- **Stadion besar**: Old Trafford (empat tribun beratap kantilever), Stadion Maguwo (atap gelombang) dan GBK (oval beratap cincin). Semuanya bentuk terinspirasi tanpa logo. Place card, tiket matchday, dan pekerjaan stadion tersedia di tiap stadion.
- **Pekerjaan berbasis misi** (`city-jobs.js`): 17 pekerjaan dengan lima pola (antar paket, patroli, jemput-antar, tugas di beberapa titik, dan shift). Kurir mengambil motor lalu mengantar paket ke rumah-rumah warga. Polisi mengambil mobil patroli, memeriksa pos, dan menangani laporan. Paramedis menjemput pasien dengan ambulans, sopir menaikkan penumpang dengan bus, dan seterusnya. Ada penanda misi di dunia, panah penunjuk di tepi layar, HUD misi, gaji, bonus level (naik tiap 3 misi), dan kendaraan yang bisa dikendarai. **Tidak ada slot eksklusif**: semua warga boleh mengambil pekerjaan yang sama kapan saja. Saat terhubung ke server, gaji dicatat server (`type:'job'`, bonus level dibatasi maksimal 150).

## Pembaruan v16
- **Wilayah Tani & Ternak** (`city-farm.js`) di utara kota (z -70 s.d. -190), terhubung lewat jalan baru: ladang gandum, jagung, sawah, kebun apel, kebun sayur dan rumah kaca, lumbung, silo, Pasar Tani, peternakan sapi, kandang domba, kandang ayam, padang kuda, kincir angin, menara air, dan rumah petani. Hewan berkeliaran, traktor bekerja di ladang, dan ada petani NPC. Tujuan baru "Farmland" ada di menu Travel.
- **Pekerjaan tani**: Petani Traktor, Peternak Sapi & Ayam, Penggembala Domba, Sopir Truk Hasil Tani (traktor dan truk bisa dikendarai).
- **Kantor berbeda tiap pekerjaan**: tiap pekerjaan punya kantor sendiri (lihat `office` di `DEFS`, `city-jobs.js`), misalnya Dinas Kebersihan, Dinas Pertamanan, Pos Ambulans 118, PO Bus Kota, Studio Foto, Lumbung Tani, dan seterusnya. Kantor baru dibuat di slot rumah deret (`OFF` di `houses()`).
- **Properti wajib**: langkah pertama setiap misi adalah mengambil perlengkapan di kantor (kamera untuk wartawan, sapu untuk kebersihan, radio untuk polisi, topi untuk petani, dan seterusnya). Propertinya tampak di tangan karakter selama misi.
- **Zoom-out lebih lebar**: zoom minimum diturunkan sehingga separuh kota (atau hampir seluruh kota utama di layar landscape) bisa terlihat.

## Pembaruan v17
- **Jalan tidak lagi kotak-kotak**: kota dibangun di ruang grid lalu dilengkungkan oleh medan halus di `city-warp.js` (`warp()`), sehingga jalan, blok, trotoar, sungai, rel, dan bangunan ikut melengkung secara konsisten. Jalan juga dipotong per ruas (`H_ROADS`/`V_ROADS` di `city.js`) dan ada tiga bundaran. Wilayah tani hanya melengkung ringan (22%) supaya ladang tetap rapi. Pantai dan tepi peta tidak ikut melengkung.
- **Tiga stadion di tiga sudut kota** (barat laut: Old Trafford, timur laut: GBK, tenggara: Stadion Maguwo), tanpa tulisan nama di bangunannya. Tersedia di menu Travel.
- **Tidak ada objek di atas jalan**: semua penempatan (bangunan, place, pohon, mobil parkir) memakai `roadDist()`/`rectOnRoad()` yang mengenal potongan jalan dan bundaran. Hasil akhirnya diperiksa otomatis di ruang grid: 0 pelanggaran dari 236 objek.
- Baris bangunan kedua di blok besar (timur) supaya kota padat. Bangunan menghadap jalan mengikuti tikungan. Collision memakai kotak berotasi (`rot`) dan titik depan place berasal dari `fx/fz`.
- Mobil dan pejalan kaki mengikuti jalan yang melengkung (posisi grid dipetakan lewat `warp()` tiap frame).
- Tuas stabil: tinggi menara dibatasi dengan memindai jalan di belakang bangunan (`behindMax`).

## V20 — kota tidak simetris
- Jaringan jalan dipangkas: perempatan jauh berkurang (sisa T-junction, tikungan, jalan buntu), blok berukuran beda-beda. Lengkung gelombang dihapus, hanya kemiringan halus.
- Pulau organik, 4 kabupaten di sudut, hutan, sungai ke pantai barat, danau tengah lebih besar.

## V21 — jaringan jalan organik
- Jalan dibangun ulang dari nol (`city-layout.js`): diagram Voronoi + kurva halus, jadi ada T-junction, tikungan, jalan buntu, jalan diagonal/melengkung, dan blok berbeda-beda ukuran. Perempatan sangat jarang.
- Bangunan, rumah, dan gedung kini diletakkan menghadap jalan baru (berputar sesuai arah jalan), lalu lahan kosong diisi bangunan tambahan dan pohon.
- Sungai berkelok membelah pusat kota dari danau di timur ke pantai barat, dengan jembatan di tempat jalan menyeberang.
- Warp lama dimatikan (`city-warp.js` kini identitas). Mobil dan pejalan kaki mengikuti jalan baru. Tembok seni, rel, plaza, kolam, dan lapangan dipindah ke lokasi yang cocok.
- Jalan di wilayah tani (utara) tetap lurus dan tersambung ke kota.

## V22 — kota diperluas
- Wilayah kota melebar ke barat (x -112) dan timur (x 258); jaringan jalan Voronoi ikut meluas otomatis.
- Sungai kini juga mengalir ke timur dari danau; rel diperpanjang; 3 kolam baru; kabupaten Barat & Timur dipindah ke utara-sisi.

## V23 — padat + pedesaan
- Kota dipadatkan (infill tambahan, batas lot 1700). Wilayah utara diisi 14 desa (rumah atap gelap, ladang berpetak, jalan tanah antar-desa), hutan pinus lebat, 3 danau.

## V24
- Jalan tanah dihitung dulu; rumah, ladang, balai & warung menghindarinya. Dermaga + perahu di 3 danau utara. Pagar dan hewan (sapi/domba) bergerak di ladang. Tiap desa punya Balai Desa (kerja bakti, istirahat) dan Warung (makan/minum). Auto-lite: bila FPS rendah, bayangan dimatikan dan resolusi turun.

## V25
- Memperbaiki V24 (perubahan city.js belum ikut tersimpan). Interior Warung & Balai Desa, dermaga: mancing & berlayar, hewan bisa disentuh (suara + mood), penjaga performa bertingkat, batas tap-move diperluas, distrik 'Pedesaan'.

## V27
- Kamera: rentang kedalaman (near/far) kini mengikuti zoom, jadi tanah di bawah layar tidak terpotong lagi saat zoom out (strip biru).
- Lapisan jalan/pasir/buih: offset polygon dikompensasi terhadap zoom, urutan lapisan sama di semua zoom (jalan tidak "naik" ke pantai).
- Rel: jalur panjang Kota Lain (seberang laut) ⇄ Desa ⇄ Central City ⇄ terowongan. Kereta berhenti di tiap stasiun dan berbalik di ujung, tidak lagi hilang di tengah kota.
- Perlintasan: di tempat rel bertemu jalan, aspal menutup balas dan bantalan; rel baja tertanam rata dengan jalan.
- boot-guard.js: error saat memuat tampil di layar loading. Modul diberi ?v= supaya cache ikut ter-refresh.
- Air danau, sungai, dan kolam kini memakai material air yang mengikuti urutan lapisan datar, jadi tidak tertutup tepi pasir (dulu tampak berwarna pasir).
- Geser kamera (drag) kini bisa sampai seluruh pojok pulau (sebelumnya dibatasi x -60..190, z -185..60).
- Tap di pojok/pantai/laut (di luar mesh tanah) tetap menggerakkan karakter: titik tap ditempelkan ke daratan terdekat.
- Jalan: kalau terhalang bangunan/sungai/danau, karakter menyusuri dinding penghalang, bukan berhenti. Batas waktu jalan 25 detik.

## V28
- Jaringan jalan ditata ulang: lebih sedikit ruas dan kelokan lebih halus. Panjang jalan 1690 → 1488, ruas 87 → 70.
- Hirarki jalan: jalan utama (lebar, garis tengah ganda), jalan desa, jalan komplek, dan lorong buntu komplek (dengan putaran di ujung). Kelas ditentukan dari seberapa sering ruas dilalui jalur terpendek antar simpul.
- Aturan akses: semua rumah/bangunan kini menghadap jalan atau lorong. Baris rumah kedua dan isian acak yang jauh dari jalan dihapus (dulu sekitar 45% pintu rumah lebih dari 9 unit dari jalan, sekarang 0).
- Jenis bangunan mengikuti kelas jalan: jalan utama lebih banyak toko/apartemen/kantor, jalan komplek lebih banyak rumah.
- Lebar aspal, trotoar, lampu, zebra cross, simpang, dan pohon pinggir jalan mengikuti kelas jalan. Perlintasan rel mengikuti lebar jalan.

## V29
- Tata kota diganti jadi grid kotak-kotak (jaringan jalan eksplisit): jalan utama, jalan, dan lorong komplek di dalam blok. Jembatan pendek di tempat jalan memotong sungai.
- Jalan desa: tiap desa/kabupaten punya dua jalan lurus bercabang dari pusat desa, dan rumah desa dibangun menghadap jalan itu.
- Hunian (city-housing.js): rumah, apartemen, dan rumah desa bisa ditekan. Kartu menampilkan nama, alamat, dan status: KOSONG (dijual, ada harga), DIHUNI n/kapasitas, atau MILIKMU. Rumah kecil kapasitas 4 orang.
- Beli rumah kosong lewat kartu rumah atau lewat app Housing di HP (daftar rumah dijual + RUMAHKU). Rumah milik pemain bisa dipakai istirahat (Energy +20, Mood +8). Kepemilikan tersimpan di localStorage.
