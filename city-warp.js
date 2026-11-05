/* FTTR CITY v19 — lengkung kota (warp). Kota dibangun di "ruang grid" lalu setiap titik digeser dengan medan
   gelombang bertingkat: jalan melengkung, jarak antarjalan tidak seragam, blok tidak lagi kotak-kotak.
   Di tepi kotak kota efeknya memudar jadi nol, wilayah tani (z < -95) hanya sedikit melengkung. Murni matematika. */
const sm=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
export const WARP_BOX={x1:-66,x2:196,z1:-190,z2:56,fade:34};
export const WARP_AMP={A1:10,A2:3,S1:3.4,B1:8,B2:2.6,S2:2.6};
const ampScale=z=>.22+.78*sm((z+95)/30);
export function env(x,z){const b=WARP_BOX,F=b.fade;return sm((x-b.x1)/F)*sm((b.x2-x)/F)*sm((z-b.z1)/F)*sm((b.z2-z)/F)*ampScale(z);}
export function warp(x,z){
  const e=env(x,z);if(e<=0)return {x,z};const a=WARP_AMP;
  const dx=a.A1*Math.sin(z*.031+1.1)+a.A2*Math.sin((x*.9+z)*.07+.3)+a.S1*Math.sin(x*.05+.6),
        dz=a.B1*Math.sin(x*.027+.4)+a.B2*Math.sin((x-z*.8)*.065+2)+a.S2*Math.sin(z*.055+2);
  return {x:x+e*dx,z:z+e*dz};
}
/* sudut putar lokal: arah sumbu-x grid setelah dilengkungkan */
export function warpRot(x,z){
 const h=.6,a=warp(x-h,z),b=warp(x+h,z);return Math.atan2(-(b.z-a.z),b.x-a.x);}
