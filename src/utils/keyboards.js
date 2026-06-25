'use strict';

const { isAdmin } = require('../config');

// ---- Asosiy menyu (inline) ----
function mainMenu(userId) {
  const rows = [
    [{ text: '🔍 Foydalanuvchini qidirish', callback_data: 'search:menu' }],
    [{ text: '🆔 Kanal / Group / User ID olish', callback_data: 'getid:menu' }],
    [{ text: '👤 Mening ID\'im', callback_data: 'my:id' }],
  ];
  if (isAdmin(userId)) {
    rows.push([{ text: '🛠 Admin panel', callback_data: 'admin:menu' }]);
  }
  return { reply_markup: { inline_keyboard: rows } };
}

// ---- Obuna tekshiruv klaviaturasi ----
function subscriptionKeyboard(missingChannels) {
  const rows = missingChannels.map((c) => {
    const url = c.username
      ? `https://t.me/${c.username.replace(/^@/, '')}`
      : c.invite_link || 'https://t.me/';
    return [{ text: `📢 ${c.title || c.username || c.id}`, url }];
  });
  rows.push([{ text: '✅ Obunani tekshirish', callback_data: 'sub:check' }]);
  return { reply_markup: { inline_keyboard: rows } };
}

// ---- Qidiruv usuli menyusi ----
function searchMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔢 User ID orqali', callback_data: 'search:by_id' }],
        [{ text: '📛 Username orqali', callback_data: 'search:by_username' }],
        [{ text: '📞 Telefon orqali', callback_data: 'search:by_phone' }],
        [{ text: '⬅️ Orqaga', callback_data: 'menu:main' }],
      ],
    },
  };
}

// ---- ID olish menyusi (inline) ----
function getIdMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📢 Kanal tanlash', callback_data: 'getid:channel' }],
        [{ text: '👥 Group tanlash', callback_data: 'getid:group' }],
        [{ text: '👤 Foydalanuvchi tanlash', callback_data: 'getid:user' }],
        [{ text: '⬅️ Orqaga', callback_data: 'menu:main' }],
      ],
    },
  };
}

// ---- Reply keyboardlar (request_contact / request_chat / request_users) ----

// Kontakt ulashish (telefon orqali qidiruv uchun).
function contactKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '📲 Kontakt ulashish', request_contact: true }],
        [{ text: '❌ Bekor qilish' }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
}

// request_chat — kanal tanlash (chat_is_channel: true).
function requestChannelKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [
          {
            text: '📢 Kanalni tanlash',
            request_chat: {
              request_id: 1,
              chat_is_channel: true,
            },
          },
        ],
        [{ text: '❌ Bekor qilish' }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
}

// request_chat — group tanlash (chat_is_channel: false).
function requestGroupKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [
          {
            text: '👥 Guruhni tanlash',
            request_chat: {
              request_id: 2,
              chat_is_channel: false,
            },
          },
        ],
        [{ text: '❌ Bekor qilish' }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
}

// request_users — foydalanuvchi tanlash.
function requestUsersKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [
          {
            text: '👤 Foydalanuvchini tanlash',
            request_users: {
              request_id: 3,
              user_is_bot: false,
              max_quantity: 1,
            },
          },
        ],
        [{ text: '❌ Bekor qilish' }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
}

// Reply keyboardni olib tashlash.
function removeKeyboard() {
  return { reply_markup: { remove_keyboard: true } };
}

// ---- Admin panel ----
function adminMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Statistika', callback_data: 'admin:stats' }],
        [{ text: '📢 Majburiy kanallar', callback_data: 'admin:channels' }],
        [{ text: '📣 Broadcast', callback_data: 'admin:broadcast' }],
        [{ text: '👥 Foydalanuvchilar', callback_data: 'admin:users' }],
        [{ text: '⬅️ Orqaga', callback_data: 'menu:main' }],
      ],
    },
  };
}

// Admin: kanallar boshqaruvi.
function adminChannelsMenu(channels) {
  const rows = channels.map((c) => [
    {
      text: `🗑 ${c.title || c.username || c.id}`,
      callback_data: `admin:chan_del:${c.id}`,
    },
  ]);
  rows.push([{ text: '➕ Kanal qo\'shish', callback_data: 'admin:chan_add' }]);
  rows.push([{ text: '⬅️ Orqaga', callback_data: 'admin:menu' }]);
  return { reply_markup: { inline_keyboard: rows } };
}

module.exports = {
  mainMenu,
  subscriptionKeyboard,
  searchMenu,
  getIdMenu,
  contactKeyboard,
  requestChannelKeyboard,
  requestGroupKeyboard,
  requestUsersKeyboard,
  removeKeyboard,
  adminMenu,
  adminChannelsMenu,
};
