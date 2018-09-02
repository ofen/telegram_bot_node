const request = require('request');
const iconv = require('iconv-lite');
const xml2js = require('xml2js');

var parser = new xml2js.Parser();

var replace = {
  '&laquo;': '«',
  '&raquo;': '»',
  '&ndash;': '–',
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&#769;': '',
  '&quot;': '"',
  '&#352;': '',
  '\n': ''
};
// RegExp list for filter
var keywords = [
  '\bжкх\b',
  '\bжкс\b',
  '\bук\b',
  'жилком',
  'управляющия',
  'жилищн',
];

function keywordsFilter(str) {
  return (new RegExp(keywords.join('|'), 'i').test(str))
}

function getFeed() {
  return new Promise((resolve, reject) => {
    request.get({
      uri: 'https://www.fontanka.ru/fontanka.rss',
      encoding: null
    }, (err, res, body) => {
      if (err) console.error(err);
      body = iconv.decode(body, 'win1251');
      resolve(body);
    });
  });
}

function bodyParser(body) {
  return new Promise((resolve, reject) => {
    for (var [key, value] of Object.entries(replace)) {
      body = body.replace(new RegExp(key, 'g'), value);
    }
    parser.parseString(body, (err, result) => {
      if (err) return reject(err);
      result = result;
      resolve(result);
    });
  });
}

async function get() {
  var data = [];
  var body = await getFeed();
  var result = await bodyParser(body);
  for (item of result.rss.channel[0].item) {
    if (keywordsFilter(item.description[0])) {
      // form data
      data.push({
        title: item.title[0],
        link: item.link[0],
        guid: item.guid[0],
        category: item.category[0],
        description: item.description[0],
        pubDate: item.pubDate[0],
      });
    }
  }
  return data;
}

module.exports.get = get;
