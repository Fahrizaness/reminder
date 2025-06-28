import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import cron from 'node-cron';

// Debugging environment variables
console.log("🛠️ Environment Variables Check:");
console.log("BOT_TOKEN:", process.env.BOT_TOKEN ? "✅ Loaded" : "❌ Missing");
console.log("CHAT_ID:", process.env.CHAT_ID ? "✅ Loaded" : "❌ Missing");
console.log("TZ:", process.env.TZ || "Not set (default: UTC)");

// Validate required env variables
if (!process.env.BOT_TOKEN || !process.env.CHAT_ID) {
  console.error("❌ FATAL: Missing required environment variables");
  process.exit(1);
}

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const CHAT_ID = process.env.CHAT_ID;

console.log("🤖 Bot Motivasi Quran Aktif...");

async function getRandomAyah() {
  try {
    console.log('🔄 Mengambil ayat acak...');
    
    // Fetch list of surahs
    const surahsRes = await fetch('https://api.quran.gading.dev/surah');
    if (!surahsRes.ok) throw new Error(`Failed to fetch surahs: ${surahsRes.status}`);
    const { data: surahs } = await surahsRes.json();

    // Select random surah
    const randomSurah = surahs[Math.floor(Math.random() * surahs.length)];
    
    // Fetch surah details
    const surahRes = await fetch(`https://api.quran.gading.dev/surah/${randomSurah.number}`);
    if (!surahRes.ok) throw new Error(`Failed to fetch surah: ${surahRes.status}`);
    const { data: surahDetail } = await surahRes.json();

    // Select random verse
    const randomVerse = surahDetail.verses[Math.floor(Math.random() * surahDetail.verses.length)];

    return {
      surahName: randomSurah.name.transliteration.id,
      surahNumber: randomSurah.number,
      verseNumber: randomVerse.number.inSurah,
      arabicText: randomVerse.text.arab,
      translation: randomVerse.translation.id
    };
  } catch (error) {
    console.error('❌ Gagal mengambil ayat:', error.message);
    return null;
  }
}

async function sendAyah() {
  try {
    const ayah = await getRandomAyah();
    if (!ayah) {
      console.log('⏭️ Tidak ada ayat yang didapat, operasi dibatalkan.');
      return;
    }

    const message = `
📖 *Ayat Al-Quran Hari Ini*

🕌 *Surah ${ayah.surahName} (${ayah.surahNumber}:${ayah.verseNumber})*

${ayah.arabicText}

📌 *Terjemahan:*
_"${ayah.translation}"_

#QuranHariIni #MotivasiIslami
    `;

    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
    console.log(`[${new Date().toLocaleString('id-ID')}] ✅ Ayat terkirim!`);
  } catch (error) {
    console.error('❌ Gagal mengirim ayat:', error.message);
  }
}

// Initial send when bot starts
sendAyah();

// Schedule daily sends
const scheduleTimes = '0 5,21 * * *'; // 5 AM and 9 PM
console.log(`⏰ Menjadwalkan kirim ayat dengan pola cron: ${scheduleTimes} (WIB)`);
cron.schedule(scheduleTimes, sendAyah, {
  timezone: process.env.TZ || 'Asia/Jakarta'
});

// Handle commands
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    'Assalamualaikum! Saya akan mengirim ayat Quran harian jam 5 pagi dan 9 malam WIB.'
  );
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('❌ Polling error:', error.message);
});