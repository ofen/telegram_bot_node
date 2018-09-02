const fs = require('fs');

const TelegramBot = require('node-telegram-bot-api');
const request = require('request');
const moment = require('moment');
const log4js = require('log4js');

const getReport = require('./getReport');
const getNews = require('./getNews');

// Issue 319
process.env.NTBA_FIX_319 = 1;
// Issue 350
process.env.NTBA_FIX_350 = 1;
// Logging config
log4js.configure('./config.json');

const logger = log4js.getLogger('Bot');

// Bot initialization
const bot_token = process.env.BOT_TOKEN;

const bot = new TelegramBot(bot_token, {polling: true});
logger.info('Bot online');

// Returns current date and time in format hh:mm:ss-dd.mm.yyyy
function get_datetime() {
  return moment().format('DD.MM.YYYY-HH:mm:ss');
}
// Returns current date in format dd.mm.yyyy
function get_date() {
  return moment().format('DD.MM.YYYY');
}
// Format input date to dd.mm.yyyy format
function format_date(date) {
  return moment(date, 'DD.MM.YYYY').format('DD.MM.YYYY');
}
// Greeting
function get_greeting() {
  var greet = [
    'Hello',
    'Hi',
    'What?',
    'Speak',
    'What you need?',
    'Good day to you',
    'How can i help you?',
  ];
  return greet[Math.floor(Math.random() * greet.length)];
}
// State management
var state = {};

function state_init(msg) {
  state[msg.from.id] = null;
}

function state_update(msg, user_state) {
  state[msg.from.id] = user_state;
}

// Logging
bot.on('message', (msg) => {
  if (!state[msg.from.id]) {
    state_init(msg);
  }
  return logger.info(msg);
});

// Start
bot.onText(/\/start/i, (msg) => {
  return bot.sendMessage(msg.chat.id, get_greeting());
});
// Me
bot.onText(/^\/me$/, (msg) => {
  return bot.sendMessage(msg.from.id, 'Your ID: ' + msg.from.id);
});
// Get report
bot.onText(/^\/getreport$|^\/getreport (\d.+)$/, async (msg, match) => {
  if (state[msg.from.id] == 'report') {
    return bot.sendMessage(msg.from.id, 'In progress...');
  }

  var date = match[1];
  if (date == null) {
    date = get_date();
  } else {
    date = format_date(date);
  }

  if (date == 'Invalid date') {
    return bot.sendMessage(msg.from.id, 'Incorrect date');
  }

  state_update(msg, 'report');
  bot.sendMessage(msg.from.id, 'Getting report on ' + date);
  var fileOptions = {
    filename: 'report_' + date + '.txt',
    contentType: 'text/plain',
  };

  var data = (await getReport.get(date)).join('\n');
  bot.sendDocument(msg.from.id, Buffer.from(data), {}, fileOptions);
  state_init(msg);
  return;
});
// Get news
bot.onText(/^\/getnews$/, async (msg) => {
  var news = await getNews.get();
  if (news.length > 0) {
    for (item of news) {
      bot.sendMessage(msg.from.id, item.guid);
    }
  } else {
    bot.sendMessage(msg.from.id, 'No news today');
  }
});
