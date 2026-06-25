'use strict';

const TelegramBot = require('node-telegram-bot-api');

const { BOT_TOKEN, isAdmin } = require('./config');
const storage = require('./utils/storage');
const state = require('./utils/state');
const keyboards = require('./utils/keyboards');

const start = require('./handlers/start');
const search = require('./handlers/search');
const getId = require('./handlers/getId');
const admin = require('./handlers/admin');

// Runtime data tayyorlash (seed ko'chirish).
storage.init();

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 ID Topuvchi Bot ishga tushdi (polling).');

// Obuna gate (admin bypass). A'zo bo'lmasa false qaytaradi.
async function gate(chatId, userId) {
  if (isAdmin(userId)) return true;
  return start.ensureSubscribed(bot, chatId, userId);
}

// Asosiy menyuni mavjud xabarda yangilash (callbacklar uchun).
async function editToMainMenu(query) {
  const chatId = query.message.chat.id;
  try {
    await bot.editMessageText(start.WELCOME, {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'HTML',
      ...keyboards.mainMenu(query.from.id),
    });
  } catch (_) {
    await start.sendMainMenu(bot, chatId, query.from.id);
  }
}

// =================== CALLBACK QUERY ROUTING ===================
bot.on('callback_query', async (query) => {
  const data = query.data || '';
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  try {
    // Obunadan oldin ishlaydiganlar.
    if (data === 'sub:check') return start.handleSubCheck(bot, query);

    // Admin bo'limi (adminlar uchun, obuna talab qilinmaydi).
    if (data.startsWith('admin:')) {
      if (data === 'admin:menu') return admin.showAdminMenu(bot, query);
      if (data === 'admin:stats') return admin.showStats(bot, query);
      if (data === 'admin:channels') return admin.showChannels(bot, query);
      if (data === 'admin:chan_add') return admin.promptAddChannel(bot, query);
      if (data.startsWith('admin:chan_del:')) {
        const id = data.slice('admin:chan_del:'.length);
        return admin.deleteChannel(bot, query, id);
      }
      if (data === 'admin:broadcast') return admin.promptBroadcast(bot, query);
      if (data === 'admin:users') return admin.showUsers(bot, query);
      return bot.answerCallbackQuery(query.id);
    }

    // Qolgan barcha amallar uchun obuna talab qilinadi.
    if (!(await gate(chatId, userId))) {
      return bot.answerCallbackQuery(query.id, {
        text: 'Avval kanal(lar)ga a\'zo bo\'ling.',
        show_alert: true,
      });
    }

    if (data === 'menu:main') {
      await bot.answerCallbackQuery(query.id);
      return editToMainMenu(query);
    }

    if (data === 'my:id') {
      await bot.answerCallbackQuery(query.id);
      const u = query.from;
      return bot.sendMessage(
        chatId,
        '👤 <b>Sizning ma\'lumotlaringiz</b>\n\n' +
          `🆔 ID: <code>${u.id}</code>\n` +
          (u.username ? `📛 Username: @${u.username}\n` : '') +
          (u.first_name ? `👤 Ism: ${u.first_name}\n` : ''),
        { parse_mode: 'HTML' }
      );
    }

    // Qidiruv.
    if (data === 'search:menu') return search.showSearchMenu(bot, query);
    if (data === 'search:by_id') return search.promptById(bot, query);
    if (data === 'search:by_username') return search.promptByUsername(bot, query);
    if (data === 'search:by_phone') return search.promptByPhone(bot, query);

    // ID olish.
    if (data === 'getid:menu') return getId.showGetIdMenu(bot, query);
    if (data === 'getid:channel') return getId.promptChannel(bot, query);
    if (data === 'getid:group') return getId.promptGroup(bot, query);
    if (data === 'getid:user') return getId.promptUser(bot, query);

    // Noma'lum callback.
    return bot.answerCallbackQuery(query.id);
  } catch (err) {
    console.error('❌ callback_query xatosi:', err.message);
    try {
      await bot.answerCallbackQuery(query.id, { text: '⚠️ Xatolik yuz berdi.' });
    } catch (_) {
      /* ignore */
    }
  }
});

// =================== MESSAGE ROUTING ===================
bot.on('message', async (msg) => {
  // callback_query ham message keltirmaydi; faqat haqiqiy xabarlar.
  const chatId = msg.chat.id;
  const userId = msg.from && msg.from.id;
  if (!userId) return;

  try {
    const text = (msg.text || '').trim();

    // --- Buyruqlar ---
    if (text === '/start') return start.handleStart(bot, msg);

    if (text === '/cancel') {
      state.clear(userId);
      await bot.sendMessage(chatId, '✖️ Bekor qilindi.', keyboards.removeKeyboard());
      if (await gate(chatId, userId)) await start.sendMainMenu(bot, chatId, userId);
      return;
    }

    if (text === '/menu') {
      if (await gate(chatId, userId)) await start.sendMainMenu(bot, chatId, userId);
      return;
    }

    // "❌ Bekor qilish" reply tugmasi.
    if (text === '❌ Bekor qilish') {
      state.clear(userId);
      await bot.sendMessage(chatId, '✖️ Bekor qilindi.', keyboards.removeKeyboard());
      if (await gate(chatId, userId)) await start.sendMainMenu(bot, chatId, userId);
      return;
    }

    // --- Admin state kiritishi (forward/text) — gate'dan oldin, admin bypass ---
    if (await admin.handleAdminInput(bot, msg)) return;

    // --- request_chat / request_users javoblari ---
    if (msg.chat_shared) {
      if (!(await gate(chatId, userId))) return;
      return getId.handleChatShared(bot, msg);
    }
    if (msg.users_shared) {
      if (!(await gate(chatId, userId))) return;
      return getId.handleUsersShared(bot, msg);
    }

    // --- Kontakt ulashish (telefon orqali qidiruv) ---
    if (msg.contact) {
      if (!(await gate(chatId, userId))) return;
      return search.handleContact(bot, msg);
    }

    // Bu yerdan keyingi amallar uchun obuna talab qilinadi.
    if (!(await gate(chatId, userId))) return;

    // --- Forward orqali ID olish ---
    if (msg.forward_date || msg.forward_from_chat || msg.forward_from) {
      if (await getId.handleForward(bot, msg)) return;
    }

    // --- Qidiruv matnli kiritishi (state) ---
    if (await search.handleTextInput(bot, msg)) return;

    // --- Fallback: menyuni eslatamiz ---
    await bot.sendMessage(
      chatId,
      'ℹ️ Iltimos, menyudan amal tanlang. /menu — asosiy menyu.'
    );
  } catch (err) {
    console.error('❌ message xatosi:', err.message);
    try {
      await bot.sendMessage(chatId, '⚠️ Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    } catch (_) {
      /* ignore */
    }
  }
});

// =================== XATOLAR ===================
bot.on('polling_error', (err) => {
  console.error('⚠️ polling_error:', err.code || '', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ unhandledRejection:', reason);
});
