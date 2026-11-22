// Pulls the question banks and Honour scenarios from the Apps Script build so the 3D games use the same content.
const fs = require('fs'), vm = require('vm');
const dir = process.argv[2];
const code = fs.readFileSync(dir + '/Code.gs', 'utf8');
const ctx = { console };
vm.createContext(ctx);
const stub = 'var PropertiesService={},SpreadsheetApp={},Utilities={},Session={},LockService={},HtmlService={},ContentService={},CacheService={},UrlFetchApp={},DriveApp={},ScriptApp={},MailApp={},Logger={log(){}};';
vm.runInContext(stub + code + '\n;this.__Q = TOPIC_QUESTIONS; this.__T = TOPICS;', ctx);
const learn = fs.readFileSync(dir + '/Learn.html', 'utf8');
function grab(name){ const i = learn.indexOf('var ' + name + ' = '); let d = 0, k = i + ('var ' + name + ' = ').length;
  const open = learn[k], close = open === '{' ? '}' : ']'; for (let p = k; p < learn.length; p++){ if (learn[p] === open) d++; else if (learn[p] === close){ d--; if (!d) return vm.runInNewContext('(' + learn.slice(k, p + 1) + ')'); } } }
const want = ['fitness', 'choices', 'legion', 'honours', 'temperance', 'story', 'nutrition'];
const Q = {}; want.forEach(k => { Q[k] = ctx.__Q[k]; if (!Q[k]) throw new Error('no questions ' + k); });
const out = { Q, HONOUR: grab('HONOUR'), LEGION_SIX: grab('LEGION_SIX') };
fs.writeFileSync('src/data.js', '/* Built from the Apps Script content (Code.gs and Learn.html). Do not edit by hand. */\nexport const DATA = ' + JSON.stringify(out) + ';\n');
console.log(Object.keys(Q).map(k => k + ':' + Q[k].length).join(' '), 'honour:', Object.keys(out.HONOUR).join(','), 'six:', out.LEGION_SIX.length);
