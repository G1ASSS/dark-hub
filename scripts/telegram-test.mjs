/**
 * Telegram origin check: verifies TELEGRAM_BOT_TOKEN (getMe) and that the
 * bot can see the private storage chat (getChat). Run after pasting real
 * values into .env.local:
 *
 *   npm run telegram:test
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID;

if (!token || token === 'PASTE_FROM_BOTFATHER') {
  console.error('FAIL: TELEGRAM_BOT_TOKEN is not set (still placeholder).');
  console.error('  1. Open Telegram, message @BotFather, /newbot, copy the token.');
  console.error('  2. Paste it into .env.local as TELEGRAM_BOT_TOKEN.');
  process.exit(1);
}
if (!chatId || chatId === 'PASTE_PRIVATE_CHANNEL_ID') {
  console.error('FAIL: TELEGRAM_STORAGE_CHAT_ID is not set (still placeholder).');
  console.error('  1. Create a PRIVATE channel, add your bot as admin.');
  console.error('  2. Forward any channel message to @userinfobot to get the -100… id.');
  console.error('  3. Paste it into .env.local as TELEGRAM_STORAGE_CHAT_ID.');
  process.exit(1);
}

const api = (method) => `https://api.telegram.org/bot${token}/${method}`;

const meRes = await fetch(api('getMe'));
const me = await meRes.json();
if (!me.ok) {
  console.error('FAIL: getMe rejected the token:', me.description);
  process.exit(1);
}
console.log(`OK: bot @${me.result.username} (id ${me.result.id})`);

const chatRes = await fetch(api('getChat'), {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ chat_id: chatId }),
});
const chat = await chatRes.json();
if (!chat.ok) {
  console.error('FAIL: bot cannot see the storage chat:', chat.description);
  console.error('  Make the channel PRIVATE and add the bot as an administrator.');
  process.exit(1);
}
console.log(`OK: storage chat "${chat.result.title ?? chat.result.type}" (${chat.result.id})`);

console.log('\nTelegram origin is ready. Uploads will flow: FFmpeg → Bot API → this chat.');
