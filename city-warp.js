/* FTTR CITY — lengkung kota (warp). Kota dibangun di "ruang grid" lalu setiap titik digeser dengan medan halus
   sehingga jalan menjadi melengkung dan blok tidak lagi kotak-kotak. Di tepi (pantai, ujung peta) dan wilayah tani
   efeknya memudar jadi nol, jadi sambungan ke luar kota tetap lurus. Murni matematika (tanpa THREE). */
const sm=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
export const WARP_BOX={x1:-66,x2:196,z1:-190,z2:56,fade:36};
export const WARP_AMP={A1:7,A2:1.9,B1:6,B2:1.5};
/* kota penuh; wilayah tani (z < -95) hanya sedikit melengkung (22%) agar ladang tetap rapi */
const ampScale=z=>.22+.78*sm((z+95)/30);
export function env(x,z){const b=WARP_BOX,F=b.fade;return sm((x-b.x1)/F)*sm((b.x2-x)/F)*sm((z-b.z1)/F)*sm((b.z2-z)/F)*ampScale(z);}
export function warp(x,z){
  return {x,z};
  const e=env(x,z);if(e<=0)return {x,z};const a=WARP_AMP;
  const dx=a.A1*Math.sin(z*.034+1.1)+a.A2*Math.sin((x*.9+z)*.085+.3),dz=a.B1*Math.sin(x*.03+.4)+a.B2*Math.sin((x-z*.8)*.075+2);
  return {x:x+e*dx,z:z+e*dz};
}
/* sudut putar lokal: arah sumbu-x grid setelah dilengkungkan */
export function warpRot(x,z){return 0;
 const h=.6,a=warp(x-h,z),b=warp(x+h,z);return Math.atan2(-(b.z-a.z),b.x-a.x);}
