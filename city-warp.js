/* FTTR CITY v21 — warp dimatikan: dunia sudah dibangun langsung di ruang dunia (jalan organik, lihat city-layout.js).
   Fungsi dipertahankan sebagai identitas supaya modul lain (tani, rel, dunia) tetap kompatibel. */
export const WARP_BOX={x1:-66,x2:196,z1:-190,z2:56,fade:34};
export const WARP_AMP={A1:0,A2:0,S1:0,B1:0,B2:0,S2:0};
export function env(){return 0;}
export function warp(x,z){return {x,z};}
export function warpRot(){return 0;}
