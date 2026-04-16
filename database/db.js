// database/db.js — Koneksi database (opsional, aktifkan jika pakai DB)
// Uncomment kode di bawah jika ingin menggunakan PostgreSQL

// import pg from "pg";
// const { Pool } = pg;
//
// let _pool = null;
//
// export function getDb() {
//   if (!_pool) {
//     _pool = new Pool({ connectionString: process.env.DATABASE_URL });
//     console.log("[db] Database connected");
//   }
//   return _pool;
// }
//
// export async function closeDb() {
//   if (_pool) {
//     await _pool.end();
//     _pool = null;
//     console.log("[db] Database connection closed");
//   }
// }

export const db = null; // placeholder — aktifkan bagian atas jika perlu DB
