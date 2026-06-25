'use strict';

// Telegram MarkdownV2/HTML o'rniga oddiy matn ishlatamiz (xavfsiz, escape kerak emas).

function line(label, value) {
  if (value === undefined || value === null || value === '') return null;
  return `${label}: ${value}`;
}

// getChat natijasini chiroyli matnga aylantiradi (user yoki chat).
function formatChat(chat) {
  const typeEmoji = {
    private: '👤',
    group: '👥',
    supergroup: '👥',
    channel: '📢',
  };
  const emoji = typeEmoji[chat.type] || '🆔';

  const details = [
    line('🆔 ID', `<code>${chat.id}</code>`),
    line('📂 Type', chat.type),
    line('👤 Ism', chat.first_name),
    line('👥 Familiya', chat.last_name),
    line('🏷 Nomi', chat.title),
    line('📛 Username', chat.username ? `@${chat.username}` : null),
    line('📝 Bio', chat.bio),
    line('📝 Tavsif', chat.description),
  ].filter(Boolean);

  return [`${emoji} <b>Topildi</b>`, '', ...details].join('\n');
}

// users_shared / contact dan kelgan oddiy user_id ni formatlaydi.
function formatUserId(userId, extra = {}) {
  const details = [
    line('🆔 ID', `<code>${userId}</code>`),
    line('👤 Ism', extra.first_name),
    line('👥 Familiya', extra.last_name),
    line('📛 Username', extra.username ? `@${extra.username}` : null),
    line('📞 Telefon', extra.phone_number),
  ].filter(Boolean);

  return ['👤 <b>Foydalanuvchi ID</b>', '', ...details].join('\n');
}

module.exports = { formatChat, formatUserId };
