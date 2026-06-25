'use strict';

const storage = require('../utils/storage');
const keyboards = require('../utils/keyboards');
const { checkSubscription } = require('../utils/subscription');

const WELCOME =
  '👋 <b>ID Topuvchi Bot</b>ga xush kelibsiz!\n\n' +
  'Bu bot orqali siz:\n' +
  '• 🔍 Foydalanuvchini ID, username yoki kontakt orqali qidirishingiz\n' +
  '• 🆔 Kanal, guruh va foydalanuvchilarning ID sini olishingiz\n' +
  '• 👤 O\'zingizning ID\'ingizni bilishingiz mumkin.\n\n' +
  'Boshlash uchun quyidagi menyudan tanlang 👇';

// Asosiy menyuni yuboradi.
function sendMainMenu(bot, chatId, userId, text) {
  return bot.sendMessage(chatId, text || WELCOME, {
    parse_mode: 'HTML',
    ...keyboards.mainMenu(userId),
  });
}

// Obuna talab qiladi. A'zo bo'lmasa — obuna klaviaturasini yuboradi va false qaytaradi.
async function ensureSubscribed(bot, chatId, userId) {
  const { ok, missing } = await checkSubscription(bot, userId);
  if (ok) return true;

  await bot.sendMessage(
    chatId,
    '🔒 Botdan foydalanish uchun quyidagi kanal(lar)ga a\'zo bo\'ling, ' +
      'so\'ngra <b>"✅ Obunani tekshirish"</b> tugmasini bosing:',
    { parse_mode: 'HTML', ...keyboards.subscriptionKeyboard(missing) }
  );
  return false;
}

// /start
async function handleStart(bot, msg) {
  const chatId = msg.chat.id;
  const user = msg.from;

  const isNew = storage.upsertUser({
    id: user.id,
    username: user.username,
    first_name: user.first_name,
  });
  if (isNew) {
    console.log(`🆕 Yangi foydalanuvchi: ${user.id} (@${user.username || '—'})`);
  }

  const subscribed = await ensureSubscribed(bot, chatId, user.id);
  if (!subscribed) return;

  await sendMainMenu(bot, chatId, user.id);
}

// "✅ Obunani tekshirish" tugmasi (callback: sub:check).
async function handleSubCheck(bot, query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  const { ok, missing } = await checkSubscription(bot, userId);
  if (!ok) {
    await bot.answerCallbackQuery(query.id, {
      text: '❌ Hali barcha kanallarga a\'zo bo\'lmadingiz.',
      show_alert: true,
    });
    // Yangilangan ro'yxatni ko'rsatamiz.
    try {
      await bot.editMessageReplyMarkup(keyboards.subscriptionKeyboard(missing).reply_markup, {
        chat_id: chatId,
        message_id: query.message.message_id,
      });
    } catch (_) {
      /* markup o'zgarmagan bo'lishi mumkin */
    }
    return;
  }

  await bot.answerCallbackQuery(query.id, { text: '✅ Obuna tasdiqlandi!' });
  try {
    await bot.deleteMessage(chatId, query.message.message_id);
  } catch (_) {
    /* o'chirib bo'lmasa muhim emas */
  }
  await sendMainMenu(bot, chatId, userId);
}

module.exports = {
  WELCOME,
  sendMainMenu,
  ensureSubscribed,
  handleStart,
  handleSubCheck,
};
