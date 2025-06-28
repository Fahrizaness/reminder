require('dotenv').config(); // Load environment variables first

const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');
const cron = require('node-cron');

// Enhanced environment validation
console.log("🛠️ Environment Variables Check:");
const envVars = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  CHAT_ID: process.env.CHAT_ID,
  TZ: process.env.TZ || 'Asia/Jakarta'
};

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`${key}: ${value ? "✅ Loaded" : "❌ Missing"}`);
});

if (!envVars.BOT_TOKEN || !envVars.CHAT_ID) {
  console.error("❌ FATAL: Missing required environment variables");
  console.log("Please create a .env file with:");
  console.log("BOT_TOKEN=your_telegram_bot_token");
  console.log("CHAT_ID=your_chat_id");
  console.log("TZ=Asia/Jakarta (optional)");
  process.exit(1);
}

// Initialize bot
const bot = new TelegramBot(envVars.BOT_TOKEN, { polling: true });
const CHAT_ID = envVars.CHAT_ID;

console.log("🤖 Bot Motivasi Quran Aktif...");
console.log(`⏰ Timezone set to: ${envVars.TZ}`);

// Improved error handling for API requests
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, 1000 * (i + 1)));
    }
  }
}

async function getRandomAyah() {
  try {
    console.log('🔄 Mengambil ayat acak...');
    
    const { data: surahs } = await fetchWithRetry('https://api.quran.gading.dev/surah');
    const randomSurah = surahs[Math.floor(Math.random() * surahs.length)];
    
    const { data: surahDetail } = await fetchWithRetry(
      `https://api.quran.gading.dev/surah/${randomSurah.number}`
    );

    const randomVerse = surahDetail.verses[
      Math.floor(Math.random() * surahDetail.verses.length)
    ];

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

// Enhanced message sending with retries
async function sendAyah() {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
      return;
    } catch (error) {
      console.error(`❌ Gagal mengirim ayat (attempt ${attempt}/${maxRetries}):`, error.message);
      if (attempt === maxRetries) {
        console.error('⚠️ Semua percobaan gagal, operasi dibatalkan');
      } else {
        await new Promise(res => setTimeout(res, 2000 * attempt));
      }
    }
  }
}

// Initial send when bot starts
sendAyah();

// Schedule daily sends (5 AM and 9 PM WIB)
const scheduleTimes = '0 5,21 * * *';
console.log(`⏰ Menjadwalkan kirim ayat jam: ${scheduleTimes.replace(' ', ':').replace(',', ' dan ')} WIB`);

cron.schedule(scheduleTimes, sendAyah, {
  timezone: envVars.TZ
});

// Enhanced command handling
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    'Assalamualaikum! Saya akan mengirim ayat Quran harian jam 5 pagi dan 9 malam WIB.\n\n' +
    'Gunakan /ayat untuk mendapatkan ayat sekarang juga!'
  );
});

bot.onText(/\/ayat/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Mengambil ayat acak...');
  sendAyah();
});

// Improved error handling
bot.on('polling_error', (error) => {
  console.error('❌ Polling error:', error.message);
  console.log('⚠️ Bot akan mencoba restart otomatis dalam 5 detik...');
  setTimeout(() => process.exit(1), 5000);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});