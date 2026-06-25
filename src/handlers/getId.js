'use strict';

const storage = require('../utils/storage');
const keyboards = require('../utils/keyboards');
const { formatChat, formatUserId } = require('../utils/format');

// ID olish menyusi (callback: getid:menu).
async function showGetIdMenu(bot, query) {
  await bot.answerCallbackQuery(query.id);
  await bot.editMessageText(
    '🆔 <b>ID olish</b>\n\n' +
      'Quyidagidan tanlang yoki kanal/guruhdan istalgan xabarni shu yerga ' +
      '<b>forward</b> qiling — bot ID ni qaytaradi.',
    {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      parse_mode: 'HTML',
      ...keyboards.getIdMenu(),
    }
  );
}

// getid:channel
async function promptChannel(bot, query) {
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(
    query.message.chat.id,
    '📢 Quyidagi tugma orqali <b>kanal</b>ni tanlang:',
    { parse_mode: 'HTML', ...keyboards.requestChannelKeyboard() }
  );
}

// getid:group
async function promptGroup(bot, query) {
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(
    query.message.chat.id,
    '👥 Quyidagi tugma orqali <b>guruh</b>ni tanlang:',
    { parse_mode: 'HTML', ...keyboards.requestGroupKeyboard() }
  );
}

// getid:user
async function promptUser(bot, query) {
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(
    query.message.chat.id,
    '👤 Quyidagi tugma orqali <b>foydalanuvchi</b>ni tanlang:',
    { parse_mode: 'HTML', ...keyboards.requestUsersKeyboard() }
  );
}

// msg.chat_shared — request_chat javobi (kanal yoki guruh).
async function handleChatShared(bot, msg) {
  const chatId = msg.chat.id;
  const shared = msg.chat_shared; // { request_id, chat_id, title?, username? }
  const isChannel = shared.request_id === 1;
  storage.incStat('getId', isChannel ? 'channel' : 'group');

  // request_chat ba'zan faqat chat_id qaytaradi; qo'shimcha ma'lumotni
  // getChat orqali olishga harakat qilamiz.
  let info = {
    id: shared.chat_id,
    type: isChannel ? 'channel' : 'group',
    title: shared.title,
    username: shared.username,
  };
  try {
    const full = await bot.getChat(shared.chat_id);
    info = full;
  } catch (_) {
    /* bot a'zo bo'lmasa getChat ishlamaydi — mavjud ma'lumot bilan davom etamiz */
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
  // Bot API versiyasiga qarab users (yangi) yoki user_ids (eski) bo'lishi mumkin.
  const shared = msg.users_shared;
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

// Forward qilingan xabar — msg.forward_from_chat (kanal/guruh) yoki
// msg.forward_from (foydalanuvchi).
async function handleForward(bot, msg) {
  const chatId = msg.chat.id;

  if (msg.forward_from_chat) {
    storage.incStat('getId', 'forward');
    await bot.sendMessage(chatId, formatChat(msg.forward_from_chat), {
      parse_mode: 'HTML',
    });
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

  // Maxfiylik sababli forward manbai yashirilgan bo'lishi mumkin.
  if (msg.forward_date || msg.forward_sender_name) {
    await bot.sendMessage(
      chatId,
      'ℹ️ Bu xabar forward qilingan, lekin manba maxfiylik sozlamalari ' +
        'sababli yashirilgan — ID ni olishning iloji yo\'q.'
    );
    return true;
  }

  return false;
}

module.exports = {
  showGetIdMenu,
  promptChannel,
  promptGroup,
  promptUser,
  handleChatShared,
  handleUsersShared,
  handleForward,
};
