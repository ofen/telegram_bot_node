const fs = require('fs');
const readline = require('readline');
const querystring = require('querystring');

const request = require('request');

// Getting device list from file
var deviceList = fs.readFileSync('deviceList.txt', 'utf8').toString().split('\n');

// Request headers
var headers = {
  'Host': 'lk.vodokanal.spb.ru',
  'Connection': 'keep-alive',
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/66.0.3359.181 Chrome/66.0.3359.181 Safari/537.36'
}
// Getting cookie
function getCookie() {
  return new Promise((resolve, reject) => {
    request.get({
      uri: 'https://lk.vodokanal.spb.ru/',
      headers: headers,
    }, (err, res, html) => {
      if (err) console.error(err);
      console.log(res.headers)
      headers.cookie = res.headers['set-cookie'].toString();
      resolve();
    });
  });
}
// Authorize
function auth() {
  return new Promise((resolve, reject) => {
    var credentials = {
      login: process.env.VODOKANAL_LOGIN,
      password: process.env.VODOKANAL_PASSWD,
    }
    credentials = querystring.stringify(credentials);
    request.post({
      uri: 'https://lk.vodokanal.spb.ru/login',
      headers: headers,
      body: credentials
    }, (err, res, html) => {
      if (err) console.error(err);
      resolve();
    });
  });
}
// Get info about devices
function getDeviceInfo() {
  return new Promise((resolve, reject) => {
    var device_placecode = {};
    var formData = {
      api_version: 2,
      jsonData: '{"cntr_type_id": [], "cntr_obj_id": [], "cntr_dev_id": [], "dstart": "", "dstop": ""}'
    }
    formData = querystring.stringify(formData);
    request.post({
      uri: 'https://lk.vodokanal.spb.ru/devices/searchDevicesNemo/ajax',
      headers: headers,
      body: formData
    }, (err, res, html) => {
      if (err) console.error(err);
      // Convert data to {device: placecode} object
      var parsed_data = JSON.parse(html);
      for (i of parsed_data.data) {
        device_placecode[i.device] = i.placecode;
      }
      resolve(device_placecode);
    });
  });
}
// Getting value from valid device
function getValue(placecode, date) {
  return new Promise((resolve, reject) => {
    var formData = {
      api_version: 2,
      jsonData: `{"placecode": "${placecode}", "dstart": "${date}", "dstop": "${date}"}`
    }
    formData = querystring.stringify(formData);
    request.post({
      uri: 'https://lk.vodokanal.spb.ru/devices/getHourlyReadings/ajax',
      headers: headers,
      body: formData
    }, (err, res, html) => {
      if (err) console.error(err);
      var parsed_data = JSON.parse(html);
      // Check if value exists
      if (parsed_data.data[0] == null) {
        resolve('NO DATA');
      } else {
        var value = (parsed_data.data[0].value).replace('.', ',');
        resolve(value);
      } 
    });
  });
}
// Getting valid device from list
async function filter(device_placecode, date) {
  var progress = 20;
  var dataCollection = [];
  for (var step = 0; step < deviceList.length; step++) {
    if (parseInt((step + 1) * 100 / deviceList.length) / progress == 1) {
      console.log(`Report complete at ${progress}%`);
      progress += 20;
    }
    var device = deviceList[step];
    // если похоже на номер то обрабатываем или пропускаем
    if (device.match(/\d+\.\d+|\d+/)) {
      var placecode = device_placecode[device];
      if (placecode == null) {
        dataCollection.push('NO DEVICE');
      } else {
        var value = await getValue(placecode, date);
        dataCollection.push(value);
      }
    } else {
      dataCollection.push(device);
    }
  }
  return dataCollection;
}
// Main
async function get(date) {
  console.log('Getting report on ' + date);
  await getCookie();
  await auth();
  var device_placecode = await getDeviceInfo();
  var dataCollection = await filter(device_placecode, date);
  console.log('Report ready');
  return dataCollection;
}

module.exports.get = get;
