# 🤖 XYABOT AI

Website AI chat yang didukung Claude AI, dengan login Google, riwayat chat, dan support Bahasa Indonesia/Inggris.

---

## 🚀 Deploy ke Railway (Step by Step)

### 1. Persiapan: Buat Google OAuth Credentials

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project baru (atau pakai yang sudah ada)
3. Pergi ke **APIs & Services → Credentials**
4. Klik **Create Credentials → OAuth Client ID**
5. Pilih **Web Application**
6. Isi nama: `XYABOT AI`
7. Di **Authorized redirect URIs**, tambahkan:
   ```
   https://YOUR_RAILWAY_DOMAIN.up.railway.app/auth/google/callback
   ```
   *(Ganti setelah kamu deploy dan dapat domain Railway)*
8. Simpan **Client ID** dan **Client Secret**

### 2. Dapatkan Anthropic API Key

1. Buka [console.anthropic.com](https://console.anthropic.com)
2. Buat API Key baru
3. Simpan key-nya

### 3. Deploy ke Railway

1. **Push ke GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial XYABOT AI"
   git remote add origin https://github.com/USERNAME/xyabot-ai.git
   git push -u origin main
   ```

2. **Buka [railway.app](https://railway.app)** dan login

3. Klik **New Project → Deploy from GitHub repo**

4. Pilih repo yang baru kamu buat

5. Railway akan auto-detect Node.js dan deploy 🎉

### 4. Set Environment Variables di Railway

Di Railway, buka project → **Variables** → tambahkan:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | sk-ant-... |
| `GOOGLE_CLIENT_ID` | dari Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | dari Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `https://YOUR_DOMAIN.up.railway.app/auth/google/callback` |
| `SESSION_SECRET` | string acak panjang (contoh: `xya-secret-2024-abcdefgh`) |
| `NODE_ENV` | `production` |

### 5. Update Google OAuth Callback URL

Setelah Railway memberikan domain (contoh: `xyabot-ai.up.railway.app`):

1. Kembali ke Google Cloud Console → Credentials
2. Edit OAuth Client ID kamu
3. Update **Authorized redirect URIs** dengan domain Railway yang sesungguhnya
4. Simpan

### 6. Done! 🎉

Website kamu siap di:
```
https://YOUR_DOMAIN.up.railway.app
```

---

## 📁 Struktur File

```
xyabot/
├── server.js          # Backend Express + API
├── package.json       # Dependencies
├── .env.example       # Template environment variables
├── xyabot.db          # Database SQLite (auto-created)
└── public/
    ├── index.html     # Landing page
    └── chat.html      # Chat interface
```

## 🛠 Fitur

- ✅ Landing page yang menarik
- ✅ Login dengan Google (OAuth 2.0)
- ✅ Chat AI dengan streaming
- ✅ Riwayat chat tersimpan (SQLite)
- ✅ Toggle Bahasa Indonesia / English
- ✅ Responsive (mobile-friendly)
- ✅ Auto-title percakapan

## ⚠️ Catatan Penting

- **Database SQLite** tersimpan di server. Di Railway, data akan **reset** setiap deploy ulang. Untuk data permanen, upgrade ke PostgreSQL.
- Untuk upgrade database, install `pg` package dan update koneksi database di `server.js`.
