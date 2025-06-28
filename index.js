import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import cron from 'node-cron';
import dotenv from 'dotenv';
dotenv.config();

console.log("🤖 Bot Motivasi Quran Aktif...");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const CHAT_ID = process.env.CHAT_ID;

// Fungsi untuk mengambil ayat acak dari API
async function ambilAyatAcak() {
  try {
    console.log('🔄 Mengambil ayat acak...');
    const res = await fetch('https://api.quran.gading.dev/surah');
    if (!res.ok) throw new Error(`Gagal mengambil daftar surah: ${res.status}`);

    const data = await res.json();
    const semuaSurah = data.data;
    const surahAcak = semuaSurah[Math.floor(Math.random() * semuaSurah.length)];

    const resSurah = await fetch(`https://api.quran.gading.dev/surah/${surahAcak.number}`);
    if (!resSurah.ok) throw new Error(`Gagal mengambil detail surah: ${resSurah.status}`);

    const detailSurah = await resSurah.json();
    const ayatAcak = detailSurah.data.verses[Math.floor(Math.random() * detailSurah.data.verses.length)];

    return {
      namaSurah: surahAcak.name.transliteration.id,
      nomorSurah: surahAcak.number,
      nomorAyat: ayatAcak.number.inSurah,
      teksArab: ayatAcak.text.arab,
      terjemahan: ayatAcak.translation.id
    };
  } catch (error) {
    console.error('❌ Gagal mengambil ayat:', error.message);
    return null;
  }
}

// Fungsi untuk mengirim ayat ke Telegram
async function kirimAyat() {
  try {
    const ayat = await ambilAyatAcak();
    if (!ayat) {
      console.log('⚠️ Tidak ada ayat yang didapat, operasi dibatalkan.');
      return;
    }

    const pesan = `
📖 *Ayat Al-Quran Hari Ini*

🕌 *Surah ${ayat.namaSurah} (${ayat.nomorSurah}:${ayat.nomorAyat})*

${ayat.teksArab}

📌 *Terjemahan:*
_"${ayat.terjemahan}"_

#QuranHariIni #MotivasiIslami
    `;

    await bot.sendMessage(CHAT_ID, pesan, { parse_mode: 'Markdown' });
    console.log(`[${new Date().toLocaleString('id-ID')}] ✅ Ayat terkirim!`);
  } catch (error) {
    console.error('❌ Gagal mengirim ayat:', error);
  }
}

// Kirim sekali saat bot pertama kali dijalankan
kirimAyat();

// Jadwalkan pengiriman otomatis
console.log('⏰ Menjadwalkan kirim ayat jam 5 pagi dan 9 malam WIB...');
cron.schedule('0 5 * * *', kirimAyat, { timezone: 'Asia/Jakarta' });    // Jam 5 pagi
cron.schedule('0 21 * * *', kirimAyat, { timezone: 'Asia/Jakarta' });   // Jam 9 malam

// Catatan: Gunakan '0 5,21 * * *' jika ingin menggabungkan dalam satu baris cron