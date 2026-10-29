/* Konfigurasi tunggal FTTR CITY (satu-satunya tempat alamat backend).
   Untuk produksi GitHub Pages, ganti return '' di bawah dengan URL HTTPS server Node.js
   yang mendukung WebSocket, tanpa slash di akhir. Contoh bentuk: https://api.domainmu.id
   String kosong berarti mode solo. Pemain tidak pernah diminta mengisi alamat ini. */
window.FTTR_CITY_API = (() => {
  // GitHub Pages tetap memakai endpoint produksi yang diisi manual di sini.
  // Saat frontend dan server.js disajikan dari origin yang sama, koneksi otomatis.
  if (location.hostname === 'city.fucktherules.my.id') return '';
  if (location.port === '8000') return '';
  return location.origin;
})();
