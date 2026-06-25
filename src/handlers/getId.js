'use strict';

const storage = require('../utils/storage');
const keyboards = require('../utils/keyboards');
const { formatChat, formatUserId } = require('../utils/format');

// /getid — bitta reply keyboard (kanal + guruh + foydalanuvchi).
async function handleGetIdCommand(bot, chatId) {
  await bot.sendMessage(
    chatId,
    '🆔 <b>ID olish</b>\n\n' +
      'Quyidagi tugmalardan birini bosing:\n' +
      '• <b>📢 Kanal</b> — kanal tanlash oynasi ochiladi\n' +
      '• <b>👥 Guruh</b> — guruh tanlash oynasi ochiladi\n' +
      '• <b>👤 Foydalanuvchi</b> — foydalanuvchi tanlash oynasi ochiladi\n\n' +
      'Yoki kanal / guruhdan istalgan xabarni <b>forward</b> qiling — bot ID ni avtomatik qaytaradi.',
    { parse_mode: 'HTML', ...keyboards.getIdKeyboard() }
  );
}

// msg.chat_shared — request_chat javobi.
// request_id 1 = kanal, 2 = guruh.
async function handleChatShared(bot, msg) {
  const chatId = msg.chat.id;
  const shared = msg.chat_shared;
  const isChannel = shared.request_id === 1;
  storage.incStat('getId', isChannel ? 'channel' : 'group');

  let info = {
    id: shared.chat_id,
    type: isChannel ? 'channel' : 'supergroup',
    title: shared.title,
    username: shared.username,
  };
  try {
    const full = await bot.getChat(shared.chat_id);
    info = full;
  } catch (_) {
    /* bot a'zo bo'lmasa getChat ishlamaydi — mavjud ma'lumot bilan davom */
  }

  await bot.sendMessage(chatId, formatChat(info), {
    parse_mode: 'HTML',
    ...keyboards.removeKeyboard(),
  });
}

// msg.users_shared — request_users javobi.
async function handleUsersShared(bot, msg) {
  const chatId = msg.chat.id;
  storage.incStat('getId', 'user');

  const shared = msg.users_shared;
  // Bot API yangi: users[]; eski: user_ids[].
  const list = shared.users || (shared.user_ids || []).map((id) => ({ user_id: id }));

  if (!list.length) {
    await bot.sendMessage(chatId, '❌ Foydalanuvchi tanlanmadi.', keyboards.removeKeyboard());
    return;
  }

  const parts = list.map((u) =>
    formatUserId(u.user_id, {
      first_name: u.first_name,
      last_name: u.last_name,
      username: u.username,
    })
  );
  await bot.sendMessage(chatId, parts.join('\n\n———\n\n'), {
    parse_mode: 'HTML',
    ...keyboards.removeKeyboard(),
  });
}

// Forward qilingan xabar — msg.forward_from_chat yoki msg.forward_from.
async function handleForward(bot, msg) {
  const chatId = msg.chat.id;

  if (msg.forward_from_chat) {
    storage.incStat('getId', 'forward');
    await bot.sendMessage(chatId, formatChat(msg.forward_from_chat), { parse_mode: 'HTML' });
    return true;
  }

  if (msg.forward_from) {
    storage.incStat('getId', 'forward');
    const u = msg.forward_from;
    await bot.sendMessage(
      chatId,
      formatUserId(u.id, {
        first_name: u.first_name,
        last_name: u.last_name,
        username: u.username,
      }),
      { parse_mode: 'HTML' }
    );
    return true;
  }

  if (msg.forward_date || msg.forward_sender_name) {
    await bot.sendMessage(
      chatId,
      'ℹ️ Bu xabar forward qilingan, lekin manba maxfiylik sozlamalari sababli ' +
        'yashirilgan — ID ni olishning iloji yo\'q.'
    );
    return true;
  }

  return false;
}

module.exports = {
  handleGetIdCommand,
  handleChatShared,
  handleUsersShared,
  handleForward,
};
