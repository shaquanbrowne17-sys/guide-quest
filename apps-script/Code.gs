/**
 * GUIDE QUEST — Pathfinder Guide class tracker + Sanctuary Explorer
 * A Google Sheet + a free Apps Script web app.
 *
 *  - Pathfinders open their personal link (no login): missions, the
 *    Sanctuary Explorer and its challenge. Everything saves to this sheet.
 *  - Counsellors open the web app link with ?c=1 on the end and type the
 *    club PIN (no email): live progress, challenge scores, marking,
 *    sign-offs, and an editor for the challenge questions and answers.
 *
 * The sheet builds itself the first time the web app is opened.
 */

var SHEET_PF = 'Pathfinders';
var SHEET_ANS = 'Answers';
var SHEET_LOG = 'Activity';
var SHEET_EVAL = 'Evaluation';
var SHEET_SET = 'Settings';
var SHEET_Q = 'Questions';
var SHEET_CH = 'Challenge';
var SANCT_PARTS = ['court', 'fence', 'gate', 'altar', 'laver', 'holy', 'lampstand', 'table', 'incense', 'veil', 'most', 'ark'];
var FIRST_ROW = 3;
var LAST_FORMULA_ROW = 152; // room for 150 Pathfinders

var MISSIONS = [
  { id: 'm1',   label: 'Mission 1 · Hands of Jesus',    short: 'M1 sign-off',   color: '#C4452C', ink: '#FFFFFF', tasks: ['CO1', 'CO2'] },
  { id: 'm2',   label: 'Mission 2 · Guide for a Day',   short: 'M2 sign-off',   color: '#0E7373', ink: '#FFFFFF', tasks: ['NS1', 'HF1', 'OL3'] },
  { id: 'm3',   label: 'Mission 3 · Worship Takeover',  short: 'M3 sign-off',   color: '#6A3D9A', ink: '#FFFFFF', tasks: ['G2', 'SD2', 'SD3'] },
  { id: 'm4',   label: 'Mission 4 · Two-Night Trek',    short: 'M4 sign-off',   color: '#2E6A3E', ink: '#FFFFFF', tasks: ['OD1', 'OD2', 'OD3', 'HF2', 'SD1', 'FD1'] },
  { id: 'm5',   label: 'Mission 5 · Church Map',        short: 'M5 sign-off',   color: '#E9A91C', ink: '#17231C', tasks: ['OL1'] },
  { id: 'base', label: 'Base Camp · Records & honours', short: 'Base sign-off', color: '#24407A', ink: '#FFFFFF', tasks: ['G1', 'G3', 'G4', 'SD4', 'OL2', 'HF3', 'NS2', 'OD4', 'LE1'] }
];

var REQ = {
  G1: 'Be at least 15, or in Grade 10 (Form 4) or equivalent',
  G2: 'Know and understand the AY Legion of Honour',
  G3: 'Be an active member of the Pathfinder Club',
  G4: 'Read a Teen Book Club book and a local church history book',
  SD1: 'Discuss the gifts of the Spirit from Galatians',
  SD2: 'How the sanctuary service points to the cross and Jesus',
  SD3: 'Outline and tell 3 Adventist pioneer stories at worship',
  SD4: 'Have a current Memory Gem Certificate',
  CO1: 'Visit a shut-in, adopt a family in need, or another approved outreach',
  CO2: 'Discuss witnessing to teens and put it into practice',
  FD1: 'Examine your attitudes on two life topics',
  HF1: 'Present the laws of good health to a younger group',
  HF2: 'Health article or poem, Fun Run with training, or Temperance reading and quiz',
  HF3: 'Nutrition Honour, or lead the Physical Fitness Honour',
  OL1: 'Flow chart of church organisation, with your Division',
  OL2: 'Attend a Basic Pathfinder Staff Training Course',
  OL3: 'Plan and teach 2 honour requirements to Juniors, with a staff mentor',
  NS1: 'Desire of Ages ch. 7 and an original nature parable',
  NS2: 'Ecology or Environmental Conservation Honour',
  OD1: 'Two-night pack camp with a trip log, and discuss the equipment',
  OD2: 'Plan and cook a three-course meal on an open fire',
  OD3: 'Complete an object of lashing or rope work',
  OD4: 'New honour toward a Master award',
  LE1: 'New honour in a lifestyle area'
};

var SECTION_NAMES = { G: 'General', SD: 'Spiritual Discovery', CO: 'Community Outreach', FD: 'Friendship Development', HF: 'Health and Fitness', OL: 'Organisation and Leadership', NS: 'Nature Study', OD: 'Outdoor Living', LE: 'Lifestyle Enrichment' };

/* ---------- column layout of the Pathfinders tab ---------- */
var COL_NAME = 1, COL_SEND = 2, COL_LINK = 3, COL_DONE = 4, COL_BAR = 5, COL_REQ0 = 6;
var CODES = allCodes_();                               // 24 codes, grouped by mission
var COL_SIGN0 = COL_REQ0 + CODES.length;               // first sign-off column
var COL_UPDATED = COL_SIGN0 + MISSIONS.length;         // "Last update"
var COL_TOKEN = COL_UPDATED + 1;                       // hidden token column
var COL_SEXP = COL_TOKEN + 1;                          // Sanctuary parts explored (n/12)
var COL_SBEST = COL_TOKEN + 2;                         // best Sanctuary challenge score
var NCOLS = COL_SBEST;

function allCodes_() {
  var a = [];
  MISSIONS.forEach(function (m) { a = a.concat(m.tasks); });
  return a;
}
function col_(n) {
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
function sheet_(name) {
  var ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
function newToken_() { return Utilities.getUuid().replace(/-/g, ''); }
/** Stop typed text from being read as a spreadsheet formula. */
function safe_(s) { s = String(s == null ? '' : s); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function rememberUrl_() {
  try {
    var c = sheet_(SHEET_SET).getRange('B2');
    if (!String(c.getValue()).trim()) { var u = ScriptApp.getService().getUrl(); if (u) c.setValue(u); }
  } catch (err) { /* not deployed yet */ }
}
function cleanToken_(t) { return String(t || '').replace(/[^a-fA-F0-9]/g, '').slice(0, 64); }
function tz_() { return SpreadsheetApp.getActive().getSpreadsheetTimeZone() || Session.getScriptTimeZone(); }

/* ======================================================================
 * MENU + SETUP
 * ==================================================================== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Guide Quest')
    .addItem('Set up / repair the sheet', 'setup')
    .addItem('Make links for new names', 'makeMissingLinks')
    .addItem('New link for selected Pathfinder(s)', 'newLinkForSelection')
    .addToUi();
}

function setup() {
  setupCore_();
  SpreadsheetApp.getActive().toast('Guide Quest is set up. Next: deploy the web app (see the Settings tab).', 'Guide Quest', 8);
}

/** Builds or repairs every tab. Safe to run again: it never deletes names, ticks or answers. */
function setupCore_() {
  var ss = SpreadsheetApp.getActive();
  setupSettings_();
  setupPathfinders_();
  setupAnswers_();
  setupActivity_();
  setupEvaluation_();
  setupQuestions_();
  setupChallenge_();
  [SHEET_PF, SHEET_CH, SHEET_Q, SHEET_EVAL, SHEET_ANS, SHEET_LOG, SHEET_SET].forEach(function (n, i) {
    ss.setActiveSheet(ss.getSheetByName(n)); ss.moveActiveSheet(i + 1);
  });
  var first = ss.getSheetByName('Sheet1');
  if (first && first.getLastRow() === 0 && ss.getSheets().length > 7) ss.deleteSheet(first);
  ss.setActiveSheet(ss.getSheetByName(SHEET_PF));
  makeMissingLinks();
}

function ensureSetup_() {
  var ss = SpreadsheetApp.getActive();
  var need = [SHEET_PF, SHEET_SET, SHEET_ANS, SHEET_Q, SHEET_CH];
  var missing = function () { return need.some(function (n) { return !ss.getSheetByName(n); }); };
  if (!missing()) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (missing()) setupCore_();
  } finally { lock.releaseLock(); }
}

function setupSettings_() {
  var s = sheet_(SHEET_SET);
  s.getRange('A1:B1').setValues([['GUIDE QUEST · SETTINGS', '']]).setFontWeight('bold').setFontSize(13);
  s.getRange('A2:A4').setValues([['Web app link (fills in by itself)'], ['Counsellor PIN'], ['Counsellor dashboard link']]).setFontWeight('bold');
  s.getRange('B2').setBackground('#FBEFCB');
  s.getRange('B3').setNumberFormat('@').setBackground('#FBEFCB');
  s.getRange('B4').setFormula('=IF(B2="","(appears after the first time the app is opened)",B2&"?c=1")');
  var steps = [
    ['How to finish setting up', ''],
    ['1', 'Counsellor dashboard = the web app link with ?c=1 on the end (shown in B4).'],
    ['2', 'The first time it opens, the dashboard asks you to create the club PIN (6+ digits). It is saved in B3.'],
    ['3', 'Give the PIN and the dashboard link only to the counsellors. No email sign-in is needed.'],
    ['4', 'In the dashboard, add your Pathfinders, then send each one their link with the WhatsApp button.'],
    ['5', 'Pathfinders never need the PIN. Their personal link opens only their own quest.'],
    ['6', 'To change the PIN, type a new one in B3 here.'],
    ['', ''],
    ['Updating the app code later', 'Deploy → Manage deployments → pencil → Version: New version → Deploy. The links stay the same.'],
    ['Lost or shared link?', 'In the dashboard, open the Pathfinder and tap "New link". The old link stops working.']
  ];
  s.getRange(6, 1, steps.length, 2).setValues(steps);
  s.getRange('A6').setFontWeight('bold');
  s.getRange('A14:A15').setFontWeight('bold');
  s.setColumnWidth(1, 260); s.setColumnWidth(2, 620);
  s.getRange('B2:B15').setWrap(true);
}

function setupPathfinders_() {
  var sh = sheet_(SHEET_PF);
  if (sh.getMaxColumns() < NCOLS) sh.insertColumnsAfter(sh.getMaxColumns(), NCOLS - sh.getMaxColumns());
  if (sh.getMaxRows() < LAST_FORMULA_ROW) sh.insertRowsAfter(sh.getMaxRows(), LAST_FORMULA_ROW - sh.getMaxRows());

  // Row 1: group headers
  sh.getRange(1, 1, 2, NCOLS).breakApart();
  // Column A stays unmerged so it can be frozen.
  sh.getRange(1, 1, 1, COL_BAR).setBackground('#1F4D3A').setFontColor('#FFFFFF').setFontWeight('bold');
  sh.getRange(1, 1).setValue('GUIDE QUEST');
  sh.getRange(1, 2, 1, COL_BAR - 1).merge().setValue('Class progress');
  var c = COL_REQ0;
  MISSIONS.forEach(function (m) {
    var r = sh.getRange(1, c, 1, m.tasks.length);
    if (m.tasks.length > 1) r.merge();
    r.setValue(m.tasks.length > 1 ? m.label : m.label.replace('Mission ', 'M'))
      .setBackground(m.color).setFontColor(m.ink).setFontWeight('bold').setHorizontalAlignment('center');
    c += m.tasks.length;
  });
  sh.getRange(1, COL_SIGN0, 1, MISSIONS.length).merge().setValue('Counsellor sign-offs · type initials + date')
    .setBackground('#E9A91C').setFontColor('#17231C').setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(1, COL_UPDATED, 1, 2).setValues([['', '']]).setBackground('#1F4D3A');
  sh.getRange(1, COL_SEXP, 1, 2).merge().setValue('Sanctuary Explorer')
    .setBackground('#2B4C8C').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');

  // Row 2: column headers
  var h = ['Pathfinder name (type here)', 'WhatsApp', 'Personal link', 'Done /24', 'Progress'];
  var notes = ['', '', '', '', ''];
  var bgs = ['#E6EBDF', '#E6EBDF', '#E6EBDF', '#E6EBDF', '#E6EBDF'];
  var fgs = ['#17231C', '#17231C', '#17231C', '#17231C', '#17231C'];
  MISSIONS.forEach(function (m) {
    m.tasks.forEach(function (code) { h.push(code); notes.push(code + ': ' + REQ[code]); bgs.push(m.color); fgs.push(m.ink); });
  });
  MISSIONS.forEach(function (m) { h.push(m.short); notes.push('Type the counsellor\'s initials and the date when ' + m.label + ' is checked, e.g. "JB 3 Oct"'); bgs.push('#FBEFCB'); fgs.push('#17231C'); });
  h.push('Last update'); notes.push(''); bgs.push('#E6EBDF'); fgs.push('#17231C');
  h.push('Token (do not edit)'); notes.push('Secret part of the personal link. Use the Guide Quest menu to make a new one.'); bgs.push('#E6EBDF'); fgs.push('#17231C');
  h.push('Parts explored /12'); notes.push('How many parts of the sanctuary map this Guide has opened.'); bgs.push('#E1E8F5'); fgs.push('#17231C');
  h.push('Best challenge'); notes.push('Best Sanctuary challenge score (after any marking by a counsellor).'); bgs.push('#E1E8F5'); fgs.push('#17231C');
  var hr = sh.getRange(2, 1, 1, NCOLS);
  hr.setValues([h]).setNotes([notes]).setBackgrounds([bgs]).setFontColors([fgs])
    .setFontWeight('bold').setVerticalAlignment('middle').setWrap(true);
  sh.getRange(2, COL_REQ0, 1, CODES.length).setHorizontalAlignment('center');
  sh.setRowHeight(2, 42);
  sh.setFrozenRows(2);
  sh.setFrozenColumns(1);

  // Formulas for every row
  var n = LAST_FORMULA_ROW - FIRST_ROW + 1;
  var L = { name: col_(COL_NAME), link: col_(COL_LINK), done: col_(COL_DONE), r0: col_(COL_REQ0), r1: col_(COL_REQ0 + CODES.length - 1), tok: col_(COL_TOKEN) };
  var f = [];
  for (var i = 0; i < n; i++) {
    var r = FIRST_ROW + i;
    f.push([
      '=IF(OR($' + L.tok + r + '="",$' + L.link + r + '=""),"",HYPERLINK("https://wa.me/?text="&ENCODEURL("Hi "&$' + L.name + r + '&"! Here is your Guide Quest link. Keep it private: "&$' + L.link + r + '),"Send on WhatsApp"))',
      '=IF(OR($' + L.tok + r + '="",Settings!$B$2=""),"",Settings!$B$2&"?t="&$' + L.tok + r + ')',
      '=IF($' + L.name + r + '="","",COUNTIF($' + L.r0 + r + ':$' + L.r1 + r + ',TRUE))',
      '=IF($' + L.name + r + '="","",SPARKLINE($' + L.done + r + ',{"charttype","bar";"max",24;"color1","#E9A91C"}))'
    ]);
  }
  sh.getRange(FIRST_ROW, COL_SEND, n, 4).setFormulas(f);

  // Checkboxes (data validation keeps existing ticks)
  var cb = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sh.getRange(FIRST_ROW, COL_REQ0, n, CODES.length).setDataValidation(cb).setHorizontalAlignment('center');
  sh.getRange(FIRST_ROW, COL_DONE, n, 1).setHorizontalAlignment('center').setFontWeight('bold');
  sh.getRange(FIRST_ROW, COL_UPDATED, n, 1).setNumberFormat('d mmm, h:mm am/pm');
  sh.getRange(FIRST_ROW, COL_SIGN0, n, MISSIONS.length).setNumberFormat('@');

  // Widths
  sh.setColumnWidth(COL_NAME, 190);
  sh.setColumnWidth(COL_SEND, 130);
  sh.setColumnWidth(COL_LINK, 200);
  sh.setColumnWidth(COL_DONE, 70);
  sh.setColumnWidth(COL_BAR, 110);
  sh.setColumnWidths(COL_REQ0, CODES.length, 46);
  sh.setColumnWidths(COL_SIGN0, MISSIONS.length, 110);
  sh.setColumnWidth(COL_UPDATED, 130);
  sh.setColumnWidths(COL_SEXP, 2, 100);
  sh.getRange(FIRST_ROW, COL_SEXP, n, 2).setHorizontalAlignment('center').setNumberFormat('@');
  sh.hideColumns(COL_TOKEN);

  // Conditional formatting
  var reqRange = sh.getRange(FIRST_ROW, COL_REQ0, n, CODES.length);
  var rules = [
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=' + L.r0 + FIRST_ROW + '=TRUE')
      .setBackground('#DDF0E3').setRanges([reqRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberEqualTo(24)
      .setBackground('#E9A91C').setFontColor('#17231C').setRanges([sh.getRange(FIRST_ROW, COL_DONE, n, 1)]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenCellNotEmpty()
      .setBackground('#FBEFCB').setRanges([sh.getRange(FIRST_ROW, COL_SIGN0, n, MISSIONS.length)]).build()
  ];
  sh.setConditionalFormatRules(rules);

  // Gentle protection on formula + token columns (warning only)
  sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) { if (p.getDescription() === 'Guide Quest formulas') p.remove(); });
  [sh.getRange(FIRST_ROW, COL_SEND, n, 4), sh.getRange(FIRST_ROW, COL_TOKEN, n, 1)].forEach(function (r) {
    r.protect().setDescription('Guide Quest formulas').setWarningOnly(true);
  });
}

function setupAnswers_() {
  var s = sheet_(SHEET_ANS);
  s.getRange(1, 1, 1, 7).setValues([['Pathfinder', 'Req', 'Question', 'Answer', 'Updated', 'Token', 'Key']])
    .setFontWeight('bold').setBackground('#1F4D3A').setFontColor('#FFFFFF');
  s.setFrozenRows(1);
  s.getRange('D:D').setNumberFormat('@');
  s.getRange('E:E').setNumberFormat('d mmm, h:mm am/pm');
  s.setColumnWidth(1, 170); s.setColumnWidth(2, 50); s.setColumnWidth(3, 260); s.setColumnWidth(4, 380); s.setColumnWidth(5, 130);
  s.getRange('D:D').setWrap(true);
  s.hideColumns(6, 2);
}

function setupActivity_() {
  var s = sheet_(SHEET_LOG);
  s.getRange(1, 1, 1, 3).setValues([['When', 'Pathfinder', 'What happened']])
    .setFontWeight('bold').setBackground('#1F4D3A').setFontColor('#FFFFFF');
  s.setFrozenRows(1);
  s.getRange('A:A').setNumberFormat('d mmm, h:mm am/pm');
  s.setColumnWidth(1, 140); s.setColumnWidth(2, 180); s.setColumnWidth(3, 420);
}

function setupEvaluation_() {
  var s = sheet_(SHEET_EVAL);
  s.clear();
  s.clearConditionalFormatRules();
  var pf = "'" + SHEET_PF + "'!";
  var nameRng = pf + '$A$' + FIRST_ROW + ':$A$' + LAST_FORMULA_ROW;
  var doneRng = pf + '$' + col_(COL_DONE) + '$' + FIRST_ROW + ':$' + col_(COL_DONE) + '$' + LAST_FORMULA_ROW;
  s.getRange('A1').setValue('GUIDE QUEST · Quest Map for the whole class').setFontWeight('bold').setFontSize(14).setFontColor('#1F4D3A');
  s.getRange('A2:B4').setValues([
    ['Pathfinders', '=COUNTA(' + nameRng + ')'],
    ['Class average (out of 24)', '=IFERROR(ROUND(AVERAGE(' + doneRng + '),1),0)'],
    ['Fully complete (24/24)', '=COUNTIF(' + doneRng + ',24)']
  ]);
  s.getRange('A2:A4').setFontWeight('bold');
  s.getRange('B2:B4').setHorizontalAlignment('left').setFontWeight('bold');
  var head = [['Code', 'Requirement', 'Section', 'Covered by', 'Pathfinders done', '% of class']];
  s.getRange(6, 1, 1, 6).setValues(head).setFontWeight('bold').setBackground('#1F4D3A').setFontColor('#FFFFFF');
  var rows = [], bg = [];
  var order = Object.keys(REQ);
  order.forEach(function (code) {
    var idx = CODES.indexOf(code), cl = col_(COL_REQ0 + idx);
    var m = MISSIONS.filter(function (mm) { return mm.tasks.indexOf(code) > -1; })[0];
    var r = 7 + rows.length;
    rows.push([code, REQ[code], SECTION_NAMES[code.replace(/\d+$/, '')], m.label,
      '=COUNTIF(' + pf + '$' + cl + '$' + FIRST_ROW + ':$' + cl + '$' + LAST_FORMULA_ROW + ',TRUE)',
      '=IFERROR(E' + r + '/$B$2,0)']);
    bg.push(['#FFFFFF', '#FFFFFF', '#FFFFFF', m.color, '#FFFFFF', '#FFFFFF']);
  });
  s.getRange(7, 1, rows.length, 6).setValues(rows);
  s.getRange(7, 4, rows.length, 1).setFontColors(rows.map(function (r) {
    var m = MISSIONS.filter(function (mm) { return mm.label === r[3]; })[0]; return [m.ink];
  })).setBackgrounds(bg.map(function (b) { return [b[3]]; })).setFontWeight('bold');
  s.getRange(7, 6, rows.length, 1).setNumberFormat('0%');
  s.getRange(7, 5, rows.length, 2).setHorizontalAlignment('center');
  s.setColumnWidth(1, 60); s.setColumnWidth(2, 380); s.setColumnWidth(3, 190); s.setColumnWidth(4, 240); s.setColumnWidth(5, 130); s.setColumnWidth(6, 90);
  s.setFrozenRows(6);
  var endRow = 6 + rows.length;
  s.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($B$2>0,$E7=$B$2)')
      .setBackground('#DDF0E3').setRanges([s.getRange(7, 5, rows.length, 2)]).build()
  ]);
  s.getRange(6, 1, endRow - 5, 6).setBorder(true, true, true, true, true, true, '#D2D9CA', SpreadsheetApp.BorderStyle.SOLID);
}

/* ======================================================================
 * LINKS
 * ==================================================================== */
function makeMissingLinks() {
  var sh = sheet_(SHEET_PF);
  var last = Math.max(sh.getLastRow(), FIRST_ROW);
  var n = last - FIRST_ROW + 1;
  var names = sh.getRange(FIRST_ROW, COL_NAME, n, 1).getValues();
  var toks = sh.getRange(FIRST_ROW, COL_TOKEN, n, 1).getValues();
  var changed = false;
  for (var i = 0; i < n; i++) {
    if (String(names[i][0]).trim() && !toks[i][0]) { toks[i][0] = newToken_(); changed = true; }
  }
  if (changed) sh.getRange(FIRST_ROW, COL_TOKEN, n, 1).setValues(toks);
}

function newLinkForSelection() {
  var ss = SpreadsheetApp.getActive(), sh = ss.getActiveSheet();
  if (sh.getName() !== SHEET_PF) { ss.toast('Select Pathfinder rows on the Pathfinders tab first.', 'Guide Quest', 6); return; }
  var rng = sh.getActiveRange(), count = 0, lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
  for (var r = rng.getRow(); r < rng.getRow() + rng.getNumRows(); r++) {
    if (r < FIRST_ROW) continue;
    var name = String(sh.getRange(r, COL_NAME).getValue()).trim();
    if (!name) continue;
    var old = String(sh.getRange(r, COL_TOKEN).getValue()), tok = newToken_();
    sh.getRange(r, COL_TOKEN).setValue(tok);
    retoken_(old, tok);
    log_(name, 'Counsellor made a new personal link (old link stopped working; their work moved to the new link)');
    count++;
  }
  } finally { lock.releaseLock(); }
  ss.toast(count ? 'Made ' + count + ' new link(s). Send them again on WhatsApp.' : 'No named rows selected.', 'Guide Quest', 6);
}

/** Simple trigger: a new name typed in column A gets a token straight away. */
function onEdit(e) {
  try {
    var sh = e.range.getSheet();
    if (sh.getName() !== SHEET_PF) return;
    var r0 = e.range.getRow(), c0 = e.range.getColumn(), nr = e.range.getNumRows(), nc = e.range.getNumColumns();
    if (r0 + nr - 1 < FIRST_ROW) return;
    if (c0 <= COL_NAME) {
      for (var i = 0; i < nr; i++) {
        var r = r0 + i; if (r < FIRST_ROW) continue;
        var name = String(sh.getRange(r, COL_NAME).getValue()).trim();
        var tok = sh.getRange(r, COL_TOKEN);
        if (name && !tok.getValue()) tok.setValue(newToken_());
      }
      return;
    }
    // A counsellor ticked or un-ticked a requirement in the sheet
    if (nr === 1 && nc === 1 && c0 >= COL_REQ0 && c0 < COL_SIGN0 && r0 >= FIRST_ROW) {
      var nm = String(sh.getRange(r0, COL_NAME).getValue()).trim();
      if (!nm) return;
      var code = CODES[c0 - COL_REQ0];
      var on = e.value === 'TRUE' || e.value === true;
      log_(nm, (on ? 'Counsellor ticked ' : 'Counsellor un-ticked ') + code + ' in the sheet');
    } else if (nr === 1 && nc === 1 && c0 >= COL_SIGN0 && c0 < COL_UPDATED && r0 >= FIRST_ROW) {
      var nm2 = String(sh.getRange(r0, COL_NAME).getValue()).trim();
      if (!nm2) return;
      var m = MISSIONS[c0 - COL_SIGN0];
      log_(nm2, e.value ? 'Signed off ' + m.label + ': ' + e.value : 'Removed sign-off for ' + m.label);
    }
  } catch (err) { /* never block editing */ }
}

/* ======================================================================
 * WEB APP (what Pathfinders open)
 * ==================================================================== */
function doGet(e) {
  var p = (e && e.parameter) || {};
  ensureSetup_();
  rememberUrl_();
  var moved = false;
  try { moved = PropertiesService.getScriptProperties().getProperty('GQ_MOVED') === '1'; } catch (err) {}
  if (moved && !('old' in p)) return movedPage_(p);
  var b = bootFor_(p);
  if (b.page === 'Counsellor') {
    return HtmlService.createHtmlOutputFromFile('Counsellor').setTitle(b.title)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
  }
  var tpl = HtmlService.createTemplateFromFile(b.page);
  tpl.boot = JSON.stringify(b.boot).replace(/</g, '\\u003c');
  return tpl.evaluate().setTitle(b.title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function findRow_(sh, t) {
  var last = sh.getLastRow();
  if (!t || last < FIRST_ROW) return -1;
  var toks = sh.getRange(FIRST_ROW, COL_TOKEN, last - FIRST_ROW + 1, 1).getValues();
  for (var i = 0; i < toks.length; i++) if (String(toks[i][0]) === t) return FIRST_ROW + i;
  return -1;
}

function fmtSign_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'd MMM yyyy');
  return String(v).trim();
}

function questData_(t, skipAnswers) {
  var sh = sheet_(SHEET_PF);
  var row = findRow_(sh, t);
  if (row < 0) return null;
  var vals = sh.getRange(row, 1, 1, NCOLS).getValues()[0];
  var name = String(vals[COL_NAME - 1]).trim();
  if (!name) return null;
  var done = {};
  CODES.forEach(function (c, i) { done[c] = vals[COL_REQ0 - 1 + i] === true; });
  var signs = {};
  MISSIONS.forEach(function (m, i) { var v = vals[COL_SIGN0 - 1 + i]; if (v !== '' && v !== null) signs[m.id] = fmtSign_(v); });
  var f = {};
  var best = parseInt(String(vals[COL_SBEST - 1]), 10) || 0;
  if (skipAnswers) return { name: name, done: done, signs: signs, f: f, best: best };
  var a = sheet_(SHEET_ANS), last = a.getLastRow();
  if (last >= 2) {
    var rows = a.getRange(2, 4, last - 1, 4).getValues(); // Answer, Updated, Token, Key
    rows.forEach(function (r) {
      if (String(r[2]) !== t) return;
      var v = r[0];
      if (typeof v === 'string' && v.charAt(0) === '[') { try { v = JSON.parse(v); } catch (err) {} }
      f[String(r[3])] = v === null ? '' : v;
    });
  }
  return { name: name, done: done, signs: signs, f: f, best: best };
}

/** Called by the page to refresh ticks and sign-offs. */
function getQuest(t) {
  t = cleanToken_(t);
  var d = questData_(t, true);
  if (!d) throw new Error('link-not-found');
  var rs = reviewState_(t);
  return { done: d.done, signs: d.signs, claims: rs.claims, notes: rs.notes, adv: rs.adv };
}

/**
 * Called by the page to save a batch of changes, in order.
 * ops: [{k:'a', key, value, label}]  (an answer)
 *      [{k:'d', code, value}]         (a requirement ticked / un-ticked)
 */
function sync(t, ops) {
  t = cleanToken_(t);
  if (!t || !ops || !ops.length) throw new Error('bad-request');
  if (ops.length > 60) ops = ops.slice(0, 60);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    ANS_IDX_ = null;
    var sh = sheet_(SHEET_PF);
    var row = findRow_(sh, t);
    if (row < 0) throw new Error('link-not-found');
    var name = String(sh.getRange(row, COL_NAME).getValue()).trim();
    var now = new Date(), doneRow = null;
    function isDone(code) {
      if (!doneRow) doneRow = sh.getRange(row, COL_REQ0, 1, CODES.length).getValues()[0];
      return doneRow[CODES.indexOf(code)] === true;
    }
    ops.forEach(function (op) {
      if (!op) return;
      // Pages from before Version 15 send a tick. A Guide's tick is now a request for the counsellor to check.
      if (op.k === 'd') op = { k: 'a', key: String(op.code) + '.claim', value: op.value === true ? 'yes' : '' };
      if (op.k !== 'a') return;
      var key = String(op.key || '');
      if (!/^[A-Z]{1,2}\d\.[A-Za-z0-9.]{1,24}$/.test(key)) return;
      var code = key.split('.')[0];
      if (CODES.indexOf(code) < 0 && ADVC.indexOf(code) < 0) return;
      if (/^AV\d\.sign$/.test(key) || /\.revnote$/.test(key)) return; // only counsellors sign off or write notes
      if (/\.claim$/.test(key)) {
        if (CODES.indexOf(code) < 0 || key !== code + '.claim') return;
        var on = String(op.value == null ? '' : op.value) !== '';
        if (on && isDone(code)) return;
        var had = claimMs_((ansIndex_()[t + '|' + key] || {}).val);
        if (on && had) return;
        if (!on && !had) return;
        ansPut_(t, name, code, key, CLAIM_LABEL, on ? 'yes|' + now.getTime() : '');
        if (on) ansPut_(t, name, code, code + '.revnote', NOTE_LABEL, '');
        log_(name, (on ? 'Asked for sign-off: ' : 'Took back the request for ') + code + ' · ' + REQ[code]);
        return;
      }
      var val = op.value;
      if (Array.isArray(val)) {
        val = JSON.stringify(val.slice(0, 20).map(function (x) { return x == null ? '' : String(x).slice(0, 120); }));
      } else {
        val = safe_(String(val == null ? '' : val).slice(0, ADV_LONG[key] ? 12000 : 1500));
      }
      var label = safe_(String(op.label || key).slice(0, 160));
      if (/^AV\d\.done$/.test(key)) {
        var was = String((ansIndex_()[t + '|' + key] || {}).val || '') === 'yes', now2 = val === 'yes';
        if (was !== now2) {
          if (now2) ansPut_(t, name, code, code + '.revnote', NOTE_LABEL, '');
          log_(name, (now2 ? 'Asked for sign-off: Advanced · ' : 'Took back the request for Advanced · ') + ADV_INFO[code].name);
        }
      }
      ansPut_(t, name, code, key, label, val);
    });
    sh.getRange(row, COL_UPDATED).setValue(now);
    SpreadsheetApp.flush();
    var d = questData_(t, true), rs = reviewState_(t);
    return { ok: true, done: d.done, signs: d.signs, claims: rs.claims, notes: rs.notes, adv: rs.adv };
  } finally {
    lock.releaseLock();
  }
}

function log_(name, what) {
  var s = sheet_(SHEET_LOG);
  if (s.getLastRow() === 0) setupActivity_();
  s.appendRow([new Date(), name, what]);
  var last = s.getLastRow();
  if (last > 3000) s.deleteRows(2, last - 2500);
}

/* ======================================================================
 * COUNSELLOR DASHBOARD (open the web app link with ?c=1 on the end)
 * No email sign-in: every call checks the club PIN in Settings!B3.
 * ==================================================================== */
function checkPin_(pin) {
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('gq-pin-fails') || 0);
  if (fails >= 12) throw new Error('locked');
  var real = String(sheet_(SHEET_SET).getRange('B3').getDisplayValue()).trim();
  if (!real) throw new Error('no-pin');
  if (String(pin == null ? '' : pin).trim() !== real) {
    cache.put('gq-pin-fails', String(fails + 1), 900);
    throw new Error('bad-pin');
  }
}
function who_(w) { w = String(w || '').replace(/[^\w .'-]/g, '').trim().slice(0, 24); return w || 'Counsellor'; }
function baseUrl_() {
  if (API_BASE_) return API_BASE_;
  var u = String(sheet_(SHEET_SET).getRange('B2').getValue()).trim();
  if (!u) { try { u = ScriptApp.getService().getUrl() || ''; } catch (err) {} }
  return u;
}

function c_login(pin) { checkPin_(pin); return { ok: true }; }

/** Tells the dashboard whether a PIN exists yet (never reveals it). */
function c_status() { return { hasPin: !!String(sheet_(SHEET_SET).getRange('B3').getDisplayValue()).trim() }; }

/** First time only: the first counsellor to open the dashboard chooses the club PIN. */
function c_setPin(newPin) {
  newPin = String(newPin == null ? '' : newPin).trim();
  if (!/^[0-9A-Za-z]{6,20}$/.test(newPin)) throw new Error('weak-pin');
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var c = sheet_(SHEET_SET).getRange('B3');
    if (String(c.getDisplayValue()).trim()) throw new Error('pin-exists');
    c.setNumberFormat('@').setValue(newPin);
    log_('—', 'Counsellor PIN was created');
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function c_overview(pin) {
  checkPin_(pin);
  ANS_IDX_ = null;
  try { migrateClaims_(); } catch (err) { log_('—', 'Version 15 move to “To review” did not finish: ' + String(err && err.message || err).slice(0, 120)); }
  makeMissingLinks();
  var sh = sheet_(SHEET_PF), last = sh.getLastRow(), list = [];
  var chal = challengeSummary_(), seen = seenSummary_();
  if (last >= FIRST_ROW) {
    var vals = sh.getRange(FIRST_ROW, 1, last - FIRST_ROW + 1, NCOLS).getValues();
    vals.forEach(function (v) {
      var name = String(v[COL_NAME - 1]).trim(), tok = String(v[COL_TOKEN - 1]);
      if (!name || !tok) return;
      var done = CODES.map(function (c, i) { return v[COL_REQ0 - 1 + i] === true; });
      var signs = {};
      MISSIONS.forEach(function (m, i) { var s = v[COL_SIGN0 - 1 + i]; if (s !== '' && s !== null) signs[m.id] = fmtSign_(s); });
      var up = v[COL_UPDATED - 1];
      var all = chal[tok] || {};
      var cs = all.sanctuary || { attempts: 0, best: 0, last: null };
      var exp = parseInt(String(v[COL_SEXP - 1]), 10) || 0;
      var learn = {};
      Object.keys(TOPICS).forEach(function (k) {
        if (k === 'sanctuary') return;
        var a = all[k], s = (seen[tok] || {})[k] || 0;
        if (a || s) learn[k] = { seen: Math.min(s, TOPICS[k].cards || s), attempts: a ? a.attempts : 0, best: a ? a.best : 0, total: a && a.last ? a.last.total : 0 };
      });
      list.push({ t: tok, name: name, done: done, signs: signs, updated: up instanceof Date ? up.getTime() : 0,
        sanct: { explored: exp, attempts: cs.attempts, best: cs.best, last: cs.last }, learn: learn });
    });
  }
  var act = [], log = sheet_(SHEET_LOG), ll = log.getLastRow();
  if (ll >= 2) {
    var n = Math.min(15, ll - 1);
    log.getRange(ll - n + 1, 1, n, 3).getValues().reverse().forEach(function (r) {
      act.push({ when: r[0] instanceof Date ? r[0].getTime() : 0, name: String(r[1]), what: String(r[2]) });
    });
  }
  var meets = meetingsRead_(), xt = extrasMap_(), av = advSummary_(), extras = {}, advanced = {}, photos = {};
  list.forEach(function (p) { if (xt[p.t]) extras[p.t] = xt[p.t]; if (av[p.t]) advanced[p.t] = av[p.t]; });
  var evs = evRows_(), cm = claimsMap_(), revnotes = {};
  evs.forEach(function (x) { photos[x.t] = (photos[x.t] || 0) + 1; });
  list.forEach(function (p) { var n = (cm[p.t] || {}).notes; if (n && Object.keys(n).length) revnotes[p.t] = n; });
  return { codes: CODES, pathfinders: list, activity: act, url: baseUrl_(), now: Date.now(), parts: SANCT_PARTS.length, topics: topicList_(),
    extras: extras, attend: attendance_(meets), meetingsTotal: meets.length, evalDate: evalDate_(),
    advanced: advanced, photos: photos, record: recordSettings_(), backup: lastBackup_(),
    reviews: reviews_(list, cm, av, evs), revnotes: revnotes, paper: PAPER };
}

function withRow_(pin, t, fn) {
  checkPin_(pin);
  ANS_IDX_ = null;
  t = cleanToken_(t);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet_(SHEET_PF), row = findRow_(sh, t);
    if (row < 0) throw new Error('not-found');
    var name = String(sh.getRange(row, COL_NAME).getValue()).trim();
    var out = fn(sh, row, name);
    SpreadsheetApp.flush();
    return out || { ok: true };
  } finally { lock.releaseLock(); }
}

function c_toggle(pin, t, code, value, who) {
  var i = CODES.indexOf(String(code));
  if (i < 0) throw new Error('bad-code');
  return withRow_(pin, t, function (sh, row, name) {
    sh.getRange(row, COL_REQ0 + i).setValue(value === true);
    sh.getRange(row, COL_UPDATED).setValue(new Date());
    if (value === true) tickDate_(cleanToken_(t), name, String(code), who_(who));
    log_(name, who_(who) + (value === true ? ' ticked ' : ' un-ticked ') + code);
  });
}

function c_sign(pin, t, mid, on, who) {
  var i = -1;
  MISSIONS.forEach(function (m, k) { if (m.id === mid) i = k; });
  if (i < 0) throw new Error('bad-mission');
  return withRow_(pin, t, function (sh, row, name) {
    var text = on ? who_(who) + ' · ' + Utilities.formatDate(new Date(), tz_(), 'd MMM yyyy') : '';
    sh.getRange(row, COL_SIGN0 + i).setValue(text);
    log_(name, on ? who_(who) + ' signed off ' + MISSIONS[i].label : who_(who) + ' removed the sign-off for ' + MISSIONS[i].label);
    return { ok: true, text: text };
  });
}

function c_newlink(pin, t, who) {
  return withRow_(pin, t, function (sh, row, name) {
    var old = String(sh.getRange(row, COL_TOKEN).getValue()), tok = newToken_();
    sh.getRange(row, COL_TOKEN).setValue(tok);
    retoken_(old, tok);
    log_(name, who_(who) + ' made a new personal link (the old one stopped working; their answers, scores and notes moved to the new link)');
    return { ok: true, t: tok };
  });
}

function c_remove(pin, t, who) {
  return withRow_(pin, t, function (sh, row, name) {
    sh.getRange(row, COL_NAME).setValue('');
    sh.getRange(row, COL_REQ0, 1, CODES.length).setValue('');
    sh.getRange(row, COL_SIGN0, 1, NCOLS - COL_SIGN0 + 1).setValue('');
    log_(name, who_(who) + ' removed ' + name + ' from the class');
  });
}

function c_add(pin, names, who) {
  checkPin_(pin);
  names = (names || []).map(function (n) { return safe_(String(n || '').replace(/\s+/g, ' ').trim().slice(0, 60)); })
    .filter(function (n) { return n && n !== "'"; }).slice(0, 100);
  if (!names.length) return { ok: true, added: 0 };
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet_(SHEET_PF);
    var n = LAST_FORMULA_ROW - FIRST_ROW + 1;
    var col = sh.getRange(FIRST_ROW, COL_NAME, n, 1).getValues();
    var added = 0;
    for (var i = 0; i < n && added < names.length; i++) {
      if (String(col[i][0]).trim()) continue;
      var r = FIRST_ROW + i;
      sh.getRange(r, COL_NAME).setValue(names[added]);
      sh.getRange(r, COL_TOKEN).setValue(newToken_());
      log_(names[added], who_(who) + ' added ' + names[added] + ' to the class');
      added++;
    }
    SpreadsheetApp.flush();
    if (added < names.length) return { ok: true, added: added, full: true };
    return { ok: true, added: added };
  } finally { lock.releaseLock(); }
}

function c_answers(pin, t) {
  checkPin_(pin);
  t = cleanToken_(t);
  var a = sheet_(SHEET_ANS), last = a.getLastRow(), out = [];
  if (last >= 2) {
    a.getRange(2, 2, last - 1, 6).getValues().forEach(function (r) { // Req, Question, Answer, Updated, Token, Key
      if (String(r[4]) !== t) return;
      var v = r[2];
      if (typeof v === 'string' && v.charAt(0) === '[') {
        try { v = JSON.parse(v).filter(function (x) { return x !== '' && x != null; }).join(', '); } catch (err) {}
      }
      if (v === '' || v === null) return;
      if (/\.(claim|revnote)$/.test(String(r[5]))) return;
      out.push({ code: String(r[0]), q: String(r[1]), a: String(v), key: String(r[5]) });
    });
  }
  var order = CODES.concat(ADVC);
  out.sort(function (x, y) { return order.indexOf(x.code) - order.indexOf(y.code) || (x.key < y.key ? -1 : 1); });
  return out;
}

/* ======================================================================
 * SANCTUARY EXPLORER: question bank, challenge scores, explored parts
 * ==================================================================== */
var DEFAULT_QUESTIONS = [
  ['After coming through the gate, what was the first thing you reached?', ['The altar of burnt offering', 'The laver', 'The golden lampstand', 'The Ark of the Covenant'], 0, 'The altar stood just inside the gate. Every sinner met the sacrifice first.'],
  ['What does the altar of burnt offering point to?', ['Jesus dying on the cross for us', 'Our prayers rising to God', 'Jesus, the Bread of Life', 'The Ten Commandments'], 0, 'Jesus is the Lamb of God who takes away the sin of the world (John 1:29).'],
  ['The laver was made from…', ['The bronze mirrors of the women of Israel', 'Gold brought out of Egypt', 'Stones from the Red Sea', 'Cedar wood from Lebanon'], 0, 'Exodus 38:8.'],
  ['What did the priests do at the laver?', ['Washed their hands and feet', 'Burned incense', 'Ate the showbread', 'Trimmed the lamps'], 0, 'Exodus 30:18–21. It points to being washed clean, like baptism.'],
  ['How many loaves were on the table of showbread?', ['12', '7', '10', '3'], 0, 'One for each tribe of Israel (Leviticus 24:5–6).'],
  ['How often was the showbread replaced?', ['Every Sabbath', 'Every day', 'Once a year', 'Every new moon'], 0, 'Leviticus 24:8.'],
  ['How many lamps did the golden lampstand have?', ['7', '12', '3', '10'], 0, 'Exodus 25:37.'],
  ['The oil that burned in the lampstand is a picture of…', ['The Holy Spirit', 'Our sins', 'The law', 'The manna'], 0, 'Zechariah 4:6.'],
  ['Which piece of furniture stood closest to the Ark?', ['The altar of incense', 'The table of showbread', 'The golden lampstand', 'The laver'], 0, 'It stood right in front of the veil (Exodus 30:6).'],
  ['The incense rising before God is a picture of…', ['Our prayers', 'The cross', 'Baptism', 'The Ten Commandments'], 0, '“Let my prayer be set forth before thee as incense” (Psalm 141:2).'],
  ['What happened to the temple veil when Jesus died?', ['It tore from top to bottom', 'It caught fire', 'It was taken up to heaven', 'Nothing happened to it'], 0, 'Matthew 27:51. Through Jesus we can come boldly to God.'],
  ['What was kept inside the Ark of the Covenant?', ['The Ten Commandments, a pot of manna and Aaron’s rod', 'The twelve loaves of showbread', 'The high priest’s robes', 'Oil for the lampstand'], 0, 'Hebrews 9:4.'],
  ['What was the gold lid of the Ark called?', ['The mercy seat', 'The throne of David', 'The golden altar', 'The veil'], 0, 'Exodus 25:17. Blood was sprinkled on it on the Day of Atonement.'],
  ['Who could go into the Most Holy Place?', ['Only the high priest, once a year', 'Any priest, every day', 'Any Israelite with an offering', 'Nobody, ever'], 0, 'Leviticus 16; Hebrews 9:7.'],
  ['The Day of Atonement points to…', ['Jesus’ final work of judgment before He comes again', 'The creation of the world', 'The flood in Noah’s day', 'The Israelites leaving Egypt'], 0, 'Daniel 8:14; Hebrews 9:24.'],
  ['Jesus said, “I am the door.” Which part of the sanctuary does that match?', ['The gate', 'The veil', 'The laver', 'The Ark'], 0, 'John 10:9. There was only one way in.'],
  ['“I am the light of the world” matches which piece of furniture?', ['The golden lampstand', 'The altar of burnt offering', 'The table of showbread', 'The laver'], 0, 'John 8:12.'],
  ['What does the white linen fence stand for?', ['The righteousness Jesus gives us', 'The clouds of heaven', 'Sin and death', 'The desert sand'], 0, 'Revelation 19:8.'],
  ['Which room held the lampstand, the table and the altar of incense?', ['The Holy Place', 'The Most Holy Place', 'The courtyard', 'Outside the camp'], 0, 'Exodus 26:35; 30:6.'],
  ['In our walk with Jesus, the courtyard is about being…', ['Forgiven at the cross', 'Ready to be with God', 'Growing every day', 'Famous in the church'], 0, 'Courtyard: forgiven. Holy Place: growing. Most Holy Place: ready.']
];

function setupQuestions_() {
  var s = sheet_(SHEET_Q);
  s.getRange(1, 1, 1, 10).setValues([['ID', 'Use it?', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct (A–D)', 'Explanation shown after answering', 'Topic']])
    .setFontWeight('bold').setBackground('#2B4C8C').setFontColor('#FFFFFF').setWrap(true);
  s.setFrozenRows(1);
  if (s.getLastRow() < 2) seedQuestions_(s);
  formatQuestions_(s);
}
function formatQuestions_(s) {
  var n = Math.max(s.getLastRow() - 1, 1);
  s.getRange(2, 2, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  s.getRange(2, 8, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['A', 'B', 'C', 'D'], true).build());
  s.getRange(2, 3, n, 7).setNumberFormat('@').setWrap(true);
  s.setColumnWidth(1, 60); s.setColumnWidth(2, 60); s.setColumnWidth(3, 320);
  s.setColumnWidths(4, 4, 190); s.setColumnWidth(8, 90); s.setColumnWidth(9, 300); s.setColumnWidth(10, 110);
  s.hideColumns(1);
}
/** Adds the default questions for one topic (or every topic) to the end of the Questions tab. */
function seedQuestions_(s, topic) {
  var rows = [];
  var add = function (k, list) {
    list.forEach(function (q, i) {
      rows.push([(k === 'sanctuary' ? 'q' : k + '-') + (i + 1), true, q[0], q[1][0] || '', q[1][1] || '', q[1][2] || '', q[1][3] || '', 'ABCD'.charAt(q[2]), q[3] || '', k]);
    });
  };
  if (!topic || topic === 'sanctuary') add('sanctuary', DEFAULT_QUESTIONS);
  Object.keys(TOPIC_QUESTIONS).forEach(function (k) { if (!topic || topic === k) add(k, TOPIC_QUESTIONS[k]); });
  if (rows.length) s.getRange(Math.max(s.getLastRow(), 1) + 1, 1, rows.length, 10).setValues(rows);
}
function readQuestions_(activeOnly, topic) {
  var s = sheet_(SHEET_Q), last = s.getLastRow(), out = [];
  if (last < 2) return out;
  s.getRange(2, 1, last - 1, 10).getValues().forEach(function (r, i) {
    var tp = String(r[9] || '').trim() || 'sanctuary';
    if (topic && tp !== topic) return;
    var id = String(r[0] || '').trim() || ('row' + (i + 2));
    var active = r[1] === true || String(r[1]).toUpperCase() === 'TRUE';
    var q = String(r[2] || '').trim();
    var opts = [r[3], r[4], r[5], r[6]].map(function (x) { return typeof x === 'boolean' ? (x ? 'True' : 'False') : String(x == null ? '' : x).trim(); });
    var correct = 'ABCD'.indexOf(String(r[7] || '').trim().toUpperCase());
    var filled = opts.filter(function (x) { return x; }).length;
    var valid = !!q && filled >= 2 && correct > -1 && !!opts[correct];
    if (activeOnly && (!active || !valid)) return;
    out.push({ id: id, active: active, valid: valid, q: q, opts: opts, correct: correct, why: String(r[8] || '').trim(), topic: tp });
  });
  return out;
}
function findQuestionRow_(s, id) {
  var last = s.getLastRow();
  if (last < 2) return -1;
  var ids = s.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}

function setupChallenge_() {
  var s = sheet_(SHEET_CH);
  s.getRange(1, 1, 1, 10).setValues([['When', 'Pathfinder', 'Score', 'Out of', 'Marked score', 'Questions missed', 'Attempt ID', 'Token', 'Answers (data)', 'Topic']])
    .setFontWeight('bold').setBackground('#2B4C8C').setFontColor('#FFFFFF');
  s.setFrozenRows(1);
  s.getRange('A:A').setNumberFormat('d mmm, h:mm am/pm');
  s.getRange('F:F').setWrap(true);
  s.setColumnWidth(1, 140); s.setColumnWidth(2, 170); s.setColumnWidths(3, 3, 80); s.setColumnWidth(6, 420);
  s.hideColumns(7, 3);
}

function upsertAnswer_(t, name, key, label, val) {
  var a = sheet_(SHEET_ANS);
  if (a.getLastRow() === 0) setupAnswers_();
  var last = a.getLastRow(), now = new Date(), code = key.split('.')[0];
  if (last >= 2) {
    var tk = a.getRange(2, 6, last - 1, 2).getValues();
    for (var j = 0; j < tk.length; j++) {
      if (String(tk[j][0]) === t && String(tk[j][1]) === key) {
        a.getRange(j + 2, 1, 1, 5).setValues([[name, code, label, val, now]]);
        return;
      }
    }
  }
  a.appendRow([name, code, label, val, now, t, key]);
}

/** Class link: a Guide types their name once; their phone keeps the token after that. */
function s_join(name) {
  name = String(name == null ? '' : name).replace(/\s+/g, ' ').trim().slice(0, 60);
  if (name.length < 2 || !/[A-Za-z]/.test(name)) throw new Error('bad-name');
  var cache = CacheService.getScriptCache();
  var joins = Number(cache.get('gq-joins') || 0);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet_(SHEET_PF);
    var n = LAST_FORMULA_ROW - FIRST_ROW + 1;
    var vals = sh.getRange(FIRST_ROW, 1, n, COL_TOKEN).getValues();
    var key = name.toLowerCase(), empty = -1, row = -1, tok = '', shown = name;
    for (var i = 0; i < n; i++) {
      var nm = String(vals[i][COL_NAME - 1]).replace(/\s+/g, ' ').trim();
      if (!nm) { if (empty < 0) empty = i; continue; }
      if (nm.toLowerCase() === key) { row = FIRST_ROW + i; tok = String(vals[i][COL_TOKEN - 1]); shown = nm; break; }
    }
    if (row > 0) {
      if (!tok) { tok = newToken_(); sh.getRange(row, COL_TOKEN).setValue(tok); }
      log_(shown, 'Signed in to the Sanctuary Explorer from the class link');
    } else {
      if (joins >= 60) throw new Error('busy');
      if (empty < 0) throw new Error('full');
      row = FIRST_ROW + empty;
      tok = newToken_();
      sh.getRange(row, COL_NAME).setValue(safe_(name));
      sh.getRange(row, COL_TOKEN).setValue(tok);
      sh.getRange(row, COL_UPDATED).setValue(new Date());
      cache.put('gq-joins', String(joins + 1), 600);
      log_(name, 'Joined the class from the Sanctuary class link');
    }
    SpreadsheetApp.flush();
    return s_whoami(tok);
  } finally { lock.releaseLock(); }
}

/** Checks a token the phone remembered and returns that Guide's saved progress. */
function s_whoami(t) {
  t = cleanToken_(t);
  var d = t ? questData_(t) : null;
  if (!d) throw new Error('link-not-found');
  return { token: t, name: d.name, visited: Array.isArray(d.f['SD2.visited']) ? d.f['SD2.visited'] : [], best: d.best };
}

/** The Sanctuary page reports which map parts this Guide has opened. */
function s_visit(t, list) {
  t = cleanToken_(t);
  list = (Array.isArray(list) ? list : []).map(String).filter(function (x, i, a) { return SANCT_PARTS.indexOf(x) > -1 && a.indexOf(x) === i; });
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet_(SHEET_PF), row = findRow_(sh, t);
    if (row < 0) throw new Error('link-not-found');
    var name = String(sh.getRange(row, COL_NAME).getValue()).trim();
    upsertAnswer_(t, name, 'SD2.visited', 'Sanctuary parts explored', JSON.stringify(list));
    sh.getRange(row, COL_SEXP).setValue(list.length + '/' + SANCT_PARTS.length);
    sh.getRange(row, COL_UPDATED).setValue(new Date());
    return { ok: true, count: list.length };
  } finally { lock.releaseLock(); }
}

function cleanAnswers_(answers) {
  var bank = {};
  readQuestions_(false).forEach(function (q) { bank[q.id] = q; });
  return (Array.isArray(answers) ? answers : []).slice(0, 20).map(function (a) {
    a = a || {};
    var out = {
      type: a.type === 'tap' ? 'tap' : 'bank',
      qid: String(a.qid || '').slice(0, 40),
      q: String(a.q || '').slice(0, 300),
      chosen: String(a.chosen || '').slice(0, 200),
      correct: String(a.correct || '').slice(0, 200),
      right: a.right === true,
      override: null
    };
    if (out.type === 'bank' && bank[out.qid]) {
      var b = bank[out.qid], idx = Number(a.chosenIndex);
      out.q = b.q; out.correct = b.opts[b.correct];
      out.right = idx === b.correct;
      if (idx >= 0 && b.opts[idx]) out.chosen = b.opts[idx];
    }
    return out;
  });
}
function effectiveScore_(ans) {
  return ans.filter(function (a) { return a.override === true || (a.override !== false && a.right); }).length;
}
function missedSummary_(ans) {
  var miss = [];
  ans.forEach(function (a, i) {
    var ok = a.override === true || (a.override !== false && a.right);
    if (!ok) miss.push('Q' + (i + 1) + ': ' + a.q + ' (answered: ' + (a.chosen || 'skipped') + ')');
  });
  return safe_(miss.join('\n') || 'None');
}
function recomputeBest_(t, topic) {
  topic = topic || 'sanctuary';
  var c = sheet_(SHEET_CH), last = c.getLastRow(), best = -1, total = 0;
  if (last >= 2) c.getRange(2, 4, last - 1, 7).getValues().forEach(function (r) { // Out of, Marked, Missed, ID, Token, Data, Topic
    if (String(r[4]) !== t || (String(r[6] || '').trim() || 'sanctuary') !== topic) return;
    var m = Number(r[1]) || 0;
    if (m > best) { best = m; total = Number(r[0]) || 0; }
  });
  var sh = sheet_(SHEET_PF), row = topic === 'sanctuary' ? findRow_(sh, t) : -1;
  if (row > 0) sh.getRange(row, COL_SBEST).setValue(best >= 0 ? best + '/' + total : '');
  if (best < 0) best = 0;
  return best;
}

/** The Sanctuary page sends a finished challenge here. */
function s_submit(t, attempt) {
  t = cleanToken_(t);
  var ans = cleanAnswers_(attempt && attempt.answers);
  if (!ans.length) throw new Error('bad-request');
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet_(SHEET_PF), row = findRow_(sh, t);
    if (row < 0) throw new Error('link-not-found');
    var name = String(sh.getRange(row, COL_NAME).getValue()).trim();
    var c = sheet_(SHEET_CH);
    if (c.getLastRow() === 0) setupChallenge_();
    var score = effectiveScore_(ans), id = 'a' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    c.appendRow([new Date(), name, score, ans.length, score, missedSummary_(ans), id, t, JSON.stringify(ans), 'sanctuary']);
    sh.getRange(row, COL_UPDATED).setValue(new Date());
    var best = recomputeBest_(t, 'sanctuary');
    log_(name, 'Sanctuary challenge: ' + score + '/' + ans.length);
    return { ok: true, score: score, best: best };
  } finally { lock.releaseLock(); }
}

/* ---------- counsellor side ---------- */
/** For each token: { topic: { attempts, best, last } } */
function challengeSummary_() {
  var c = sheet_(SHEET_CH), last = c.getLastRow(), map = {};
  if (last < 2) return map;
  c.getRange(2, 1, last - 1, 10).getValues().forEach(function (r) {
    var t = String(r[7]); if (!t) return;
    var tp = String(r[9] || '').trim() || 'sanctuary';
    var byT = map[t] || (map[t] = {});
    var m = byT[tp] || (byT[tp] = { attempts: 0, best: 0, last: null });
    var marked = Number(r[4]) || 0;
    m.attempts++; m.best = Math.max(m.best, marked);
    var when = r[0] instanceof Date ? r[0].getTime() : 0;
    if (!m.last || when >= m.last.when) m.last = { when: when, score: marked, total: Number(r[3]) || 0 };
  });
  return map;
}

function c_attempts(pin, t, topic) {
  checkPin_(pin);
  t = cleanToken_(t);
  topic = TOPICS[topic] ? topic : 'sanctuary';
  var c = sheet_(SHEET_CH), last = c.getLastRow(), out = [];
  if (last >= 2) c.getRange(2, 1, last - 1, 10).getValues().forEach(function (r) {
    if (String(r[7]) !== t || (String(r[9] || '').trim() || 'sanctuary') !== topic) return;
    var ans = []; try { ans = JSON.parse(r[8]); } catch (err) {}
    out.push({ id: String(r[6]), when: r[0] instanceof Date ? r[0].getTime() : 0, score: Number(r[2]) || 0, total: Number(r[3]) || 0, marked: Number(r[4]) || 0, answers: ans });
  });
  out.sort(function (a, b) { return b.when - a.when; });
  return out;
}

function c_mark(pin, attemptId, idx, val, who) {
  checkPin_(pin);
  attemptId = String(attemptId || '');
  idx = Number(idx);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var c = sheet_(SHEET_CH), last = c.getLastRow();
    if (last < 2) throw new Error('not-found');
    var ids = c.getRange(2, 7, last - 1, 1).getValues(), row = -1;
    for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === attemptId) { row = i + 2; break; }
    if (row < 0) throw new Error('not-found');
    var r = c.getRange(row, 1, 1, 10).getValues()[0];
    var ans = JSON.parse(r[8]);
    if (!ans[idx]) throw new Error('bad-request');
    ans[idx].override = val === null ? null : val === true;
    var marked = effectiveScore_(ans);
    c.getRange(row, 5, 1, 2).setValues([[marked, missedSummary_(ans)]]);
    c.getRange(row, 9).setValue(JSON.stringify(ans));
    var t = String(r[7]), tp = String(r[9] || '').trim() || 'sanctuary';
    recomputeBest_(t, tp);
    log_(String(r[1]), who_(who) + ' marked Q' + (idx + 1) + ' of a ' + (TOPICS[tp] ? TOPICS[tp].name : 'Sanctuary') + ' challenge ' + (val === null ? 'back to automatic' : (val ? 'right' : 'wrong')) + ' (now ' + marked + '/' + ans.length + ')');
    return { ok: true, marked: marked, answers: ans };
  } finally { lock.releaseLock(); }
}

function c_questions(pin, topic) { checkPin_(pin); ensureLearn_(); return readQuestions_(false, TOPICS[topic] ? topic : 'sanctuary'); }

function c_saveQuestion(pin, q, who) {
  checkPin_(pin);
  q = q || {};
  var text = String(q.q || '').trim().slice(0, 300);
  var opts = (Array.isArray(q.opts) ? q.opts : []).slice(0, 4).map(function (x) { return String(x == null ? '' : x).trim().slice(0, 160); });
  while (opts.length < 4) opts.push('');
  var correct = Number(q.correct);
  if (text.length < 3) throw new Error('q-missing');
  if (opts.filter(function (x) { return x; }).length < 2) throw new Error('q-options');
  if (!(correct >= 0 && correct < 4) || !opts[correct]) throw new Error('q-correct');
  var row = [safe_(text), safe_(opts[0]), safe_(opts[1]), safe_(opts[2]), safe_(opts[3]), 'ABCD'.charAt(correct), safe_(String(q.why || '').trim().slice(0, 300))];
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var s = sheet_(SHEET_Q), id = String(q.id || '').replace(/[^\w-]/g, '').slice(0, 40), r = id ? findQuestionRow_(s, id) : -1;
    var active = q.active !== false, topic = TOPICS[q.topic] ? q.topic : 'sanctuary';
    if (r > 0) {
      s.getRange(r, 2, 1, 8).setValues([[active].concat(row)]);
    } else {
      id = 'q' + Date.now().toString(36);
      s.appendRow([id, active].concat(row).concat([topic]));
      formatQuestions_(s);
    }
    log_('—', who_(who) + (r > 0 ? ' edited' : ' added') + ' a challenge question: ' + text);
    return { ok: true, id: id };
  } finally { lock.releaseLock(); }
}

function c_setQuestionActive(pin, id, on) {
  checkPin_(pin);
  var s = sheet_(SHEET_Q), r = findQuestionRow_(s, String(id || ''));
  if (r < 0) throw new Error('not-found');
  s.getRange(r, 2).setValue(on === true);
  return { ok: true };
}

function c_deleteQuestion(pin, id, who) {
  checkPin_(pin);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var s = sheet_(SHEET_Q), r = findQuestionRow_(s, String(id || ''));
    if (r < 0) throw new Error('not-found');
    var text = s.getRange(r, 3).getValue();
    s.deleteRow(r);
    log_('—', who_(who) + ' deleted a challenge question: ' + text);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function c_resetQuestions(pin, who, topic) {
  checkPin_(pin);
  topic = TOPICS[topic] ? topic : 'sanctuary';
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var s = sheet_(SHEET_Q), last = s.getLastRow();
    if (last >= 2) {
      var tps = s.getRange(2, 10, last - 1, 1).getValues();
      for (var i = tps.length - 1; i >= 0; i--) if ((String(tps[i][0] || '').trim() || 'sanctuary') === topic) s.deleteRow(i + 2);
    }
    seedQuestions_(s, topic);
    formatQuestions_(s);
    log_('—', who_(who) + ' reset the ' + TOPICS[topic].name + ' questions to the defaults');
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ======================================================================
 * COUNSELLOR ASSISTANT (the Assistant tab in the dashboard)
 * Uses Google's Gemini API with the club's own free key. The key is kept
 * in this script's properties: never in the sheet, never sent to Guides.
 * Guides' names are swapped for codes like [G:1a2b3] before anything is
 * sent to Google, and swapped back before the counsellor sees the reply.
 * ==================================================================== */
var AI_KEY_PROP = 'GQ_GEMINI_KEY', AI_MODELS_PROP = 'GQ_GEMINI_MODELS';
var AI_API = 'https://generativelanguage.googleapis.com/v1beta/';

var AI_KNOWLEDGE = [
'# CLUB AND CLASS',
'- A Seventh-day Adventist Pathfinder club in Guyana. Church structure: local church > Guyana Conference > Caribbean Union Conference (office in Trinidad) > Inter-American Division (office in Miami, Florida) > General Conference (Silver Spring, Maryland; organised 1863 in Battle Creek). 13 world divisions; a GC Session every five years.',
'- Pathfinder classes in order: Friend, Companion, Explorer, Ranger, Voyager, Guide. Guide is the last class (about age 15). When a Guide finishes every requirement and the counsellors have checked them, the Guide is examined/evaluated and then invested at an Investiture service.',
'- The class is run by two counsellors. The Guides track their work in the Guide Quest app (personal link, no login). Counsellors use this dashboard (club PIN).',
'- Pathfinder Pledge: By the grace of God, I will be pure and kind and true. I will keep the Pathfinder Law. I will be a servant of God and a friend to man.',
'- Pathfinder Law: Keep the morning watch. Do my honest part. Care for my body. Keep a level eye. Be courteous and obedient. Walk softly in the sanctuary. Keep a song in my heart. Go on God\'s errands.',
'- AY Aim: The Advent message to all the world in my generation. AY Motto: The love of Christ compels me (constrains us, 2 Corinthians 5:14).',
'- AY Legion of Honour (as the club says it): I will honour Christ in that which I choose to behold. I will honour Christ in that to which I choose to listen. I will honour Christ in the choice of places to which I go. I will honour Christ in the choice of my associates. I will honour Christ in that which I choose to speak. I will honour Christ in the care I give my body temple.',
'',
'# HOW GUIDE QUEST GROUPS THE 24 REQUIREMENTS',
'Each requirement has a code. Five missions plus Base Camp; each mission is signed off by a counsellor when all its requirements are done.',
'- m1 Mission 1, Hands of Jesus: CO1, CO2. Visit a shut-in or help a family in need, bring a teen friend, help with a real job, sing, pray and share testimonies.',
'- m2 Mission 2, Guide for a Day: NS1, HF1, OL3. The class runs one Junior Pathfinder meeting: nature parable, health talk, teach two honour requirements.',
'- m3 Mission 3, Worship Takeover: G2, SD2, SD3. The class runs a worship: recite the Legion of Honour, tell three pioneer stories, show how the sanctuary points to Jesus.',
'- m4 Mission 4, Two-Night Trek: OD1, OD2, OD3, HF2, SD1, FD1. A two-night pack camp: gear talk and trip log, three-course fire meal, lashed gadget, a sunrise Fun Run (one of the three HF2 options), campfire talks.',
'- m5 Mission 5, Church Map: OL1. Class talk on church organisation, then a flow chart from the General Conference down to the local church.',
'- base Base Camp, records and honours: G1, G3, G4, SD4, OL2, HF3, NS2, OD4, LE1. Personal records and honours, checked one Guide at a time.',
'',
'# THE 24 REQUIREMENTS: what each needs, how to check it, and what covers it',
'G1 (General) Be at least 15 years old, or in Grade 10 (Form 4 in Guyana) or equivalent. Personal record: check age/grade and file it. Never ticked by a group activity and never a lesson.',
'G2 (General) Know and understand the AY Legion of Honour. Done when the Guide can say it from memory and explain what each line means (eyes, ears, feet, friends, mouth, body). Objective: see how thoughts shape actions and want to honour Christ. Covered when the class recites and explains it, e.g. at a worship. Learning Lab explorer: legion.',
'G3 (General) Be an active member of the Pathfinder club: dues paid and at least 75% attendance, supporting the club and taking leadership when given. Personal; counsellor checks records.',
'G4 (General) Read a Teen Book Club book and a local church history book. Check with a short verbal report on each book. Personal.',
'SD1 (Spiritual Discovery) Discuss how a Christian can have the gifts of the Spirit as Paul describes to the Galatians (Galatians 5:22-23, the fruit of the Spirit; compare the gifts in 1 Corinthians 12, Romans 12, Ephesians 4). Objective: recognise God gives each Guide gifts and grows His character in them. Done by taking part in the discussion (often a campfire talk). Explorer: fruit.',
'SD2 (Spiritual Discovery) Learn the Old Testament sanctuary service and discuss how it points to the cross and Jesus\' ministry now in the heavenly sanctuary (Hebrews 8-9; Daniel 8:14). Parts: court, fence, gate, altar of burnt offering, laver, holy place, lampstand, table of shewbread, altar of incense, veil, most holy place, ark of the covenant. Daily service and yearly Day of Atonement. Done by studying/viewing and discussing. Explorer: Sanctuary Explorer.',
'SD3 (Spiritual Discovery) Outline and tell three Adventist pioneer stories at worship (e.g. William Miller, Hiram Edson, Joseph Bates, Ellen and James White, John Byington, J. N. Andrews). Done when each Guide has told stories in a worship. Explorer: pioneers.',
'SD4 (Spiritual Discovery) Have a current Memory Gem Certificate. Use the local conference youth department\'s Memory Gem list if it has one; if not, the curriculum\'s suggested list in seven groups (Great passages, Salvation, Doctrine, Prayer, Relationships, Behaviour, Promise and praise): the Guide learns one text from each group. Allow one class period for the Memory Gem exam. The club\'s list is in Explorers > Memory Gems, and Guides practise in the Learning Lab Memory Gem trainer. Personal record: check and file the certificate.',
'CO1 (Community Outreach) As a group or alone, help organise and take part in: a friendship visit to a shut-in, OR adopting a person or family in need and helping them, OR another outreach approved by the leader. Done by taking part. A class visit to a shut-in, elderly or sick person, or a family-help day, covers CO1 for every Guide present.',
'CO2 (Community Outreach) Take part in a discussion on witnessing to other teenagers, then put it into practice (the app suggests bringing a teen friend on the visit and sharing a short testimony). Objective: help Guides become witnesses to their own age group. Teaching points: communication; being a real friend first; personal testimony in three parts (before Jesus, how Jesus met me, life now); a plan for a target friend; understanding barriers; inviting a decision. Only tick when the discussion happened (and, for the app, the Guide practised it).',
'FD1 (Friendship Development / Personal Growth) Examine your attitudes on two life topics through group discussion and personal thought: choosing a career, moral behaviour, sex and dating, choosing a life partner. Two topics, about two sessions each. Done by taking part. Handle with care: biblical, age-appropriate, involve parents/pastor where wise.',
'HF1 (Health and Fitness) Present the laws of good health to a younger group (NEWSTART: Nutrition, Exercise, Water, Sunlight, Temperance, Air, Rest, Trust in God). Done when the Guide has presented/taught it, e.g. at a Junior meeting. Explorer: newstart.',
'HF2 (Health and Fitness) Do ONE of three: (a) write a poem or article on health or temperance suitable for a church health or temperance journal; (b) organise or take part in a Fun Run or similar, after keeping a record of a physical training programme (the app suggests three weeks of training, then a sunrise run at camp; needs both the record and the run); (c) read Temperance by Ellen G. White, pages 102-125, and pass a true/false quiz on it with at least 75%. About one class period.',
'HF3 (Health and Fitness) Earn the Nutrition Honour, or lead a group through the Physical Fitness Honour. Explorer: nutrition.',
'OL1 (Organisation and Leadership) After a class discussion, make a flow chart of how the church is organised, with details of our Division (Inter-American). Done by taking part and making the chart. Explorer: church.',
'OL2 (Organisation and Leadership) Attend a Basic Pathfinder Staff Training Course (run by the conference). Personal record.',
'OL3 (Organisation and Leadership) Plan and teach at least two requirements of an honour to younger Pathfinders, under the guidance of a staff member (a staff mentor). Done when taught.',
'NS1 (Nature Study) Read The Desire of Ages chapter 7 (As a Child) and relate it to nature study in Jesus\' education and ministry; then give, before an audience, an original nature lesson (parable) from your own observation. Done when the parable is presented.',
'NS2 (Nature Study) Earn the Ecology Honour or the Environmental Conservation Honour. Explorer: ecology.',
'OD1 (Outdoor Living) Take part in a two-night pack camp (everything carried in packs), discuss the equipment beforehand, and keep a trip log: a pre-log before (plan, route, menu, gear) and a post-log after (what happened, what was learned). All parts needed. Explorer: packcamp.',
'OD2 (Outdoor Living) Plan and cook, in a satisfactory way, a three-course meal on an open fire (balanced menu). Explorer: fire.',
'OD3 (Outdoor Living) Complete an object of lashing or rope work, such as a tower, bridge or camp gadget. Basic lashings first (square, diagonal, shear, tripod, round). Explorer: lashing.',
'OD4 (Outdoor Living) Earn a new honour (not earned before) that counts toward a Master Award such as Aquatic, Sportsman, Recreation, Wilderness or Nature (Orienteering is a good choice). Explorer: orienteering.',
'LE1 (Lifestyle Enrichment) Earn a new honour in Outreach Ministries, Outdoor Industries, Vocational, Health and Science, or Household Arts.',
'',
'# MATCHING ACTIVITIES TO REQUIREMENTS',
'- Visited a shut-in / sick or elderly person, or helped a needy family: CO1. Add CO2 only if the class had the witnessing discussion and the Guides shared their faith/testimony.',
'- Two-night pack camp: OD1 (if the gear was discussed). Three-course meal on an open fire: OD2. Built a lashed tower/bridge/gadget: OD3. Fun run after recorded training: HF2. Campfire study of Galatians 5 / gifts of the Spirit: SD1. Campfire talk on two life topics: FD1.',
'- Ran a Junior meeting: nature parable after reading Desire of Ages ch. 7: NS1; taught NEWSTART: HF1; taught two honour requirements: OL3.',
'- Class worship: recited and explained the Legion of Honour: G2; told three pioneer stories: SD3; sanctuary presentation or study: SD2.',
'- Church organisation talk and flow chart: OL1.',
'- Honours: Nutrition (or led Physical Fitness): HF3. Ecology or Environmental Conservation: NS2. A new honour toward a Master Award: OD4. A new lifestyle-area honour: LE1.',
'- Personal items (G1, G3, G4, SD4, OL2) come from records, not group activities.',
'- If an activity only partly meets a requirement, do not tick it. Say what is still needed.',
'',
'# TEACHING NOTES (from the Guide teaching manual)',
'- The basic Guide class is planned as about 28 class periods of 30 minutes, plus out-of-class activities (camps, visits, outreach). Advanced work needs extra time.',
'- Teaching methods that work with this age: discussion, Bible study with real-life application, small-group projects, hands-on outdoor skills, teens teaching younger Pathfinders, quizzes and games, testimonies.',
'- Method of testing for most discussion requirements is taking part in the discussion; for skills it is completing the task; for honours it is meeting every honour requirement (the instructor certifies; the conference youth department issues certificates).',
'- Outreach: teens can be shy visiting strangers; team them up with friends and prepare them (what to say, a song, a short prayer, a practical job).',
'- Pack camp: plan the menu, visit the site first, carry everything in packs, Leave No Trace, buddy system, safe water.',
'- Fire meal: do it on a normal campout so the menu can be bigger; help them plan a balanced three-course menu.',
'- Lashings: master basic lashings before building; test structures before anyone climbs.',
'- FD1 topics: career (gifts, interests, calling, education); moral behaviour (principles from love for God, not just rules); sex and dating (normal growth within God\'s plan, purity, boundaries, respect); choosing a life partner (character qualities, shared faith).',
'',
'# ADVANCED (optional, from the Guide curriculum the club uses; one Advanced item for six sections)',
'- AV1 General: complete the Stewardship Honour (Bible texts on stewardship and tithe, Counsels on Stewardship reading, how tithe is used, church budget, a 24-hour time chart for a weekday and a weekend day, a one-month money list or a $50 budget, talents study, and a 5-hour talent project that helps others).',
'- AV2 Spiritual Discovery: read Steps to Christ (13 chapters) and write a one-page report or essay.',
'- AV3 Community Outreach: bring 2 friends to at least 2 meetings sponsored by the church, OR help plan and take part in at least 4 youth evangelism (or similar) meetings.',
'- AV4 Friendship Development: write at least 750 words, or give a talk of at least 10 minutes, on how to make and keep friends.',
'- AV5 Health and Fitness: a study of God\'s plan for sexual behaviour, including the facts about AIDS and other sexually transmitted infections. The counsellor leads this as a class session; keep anything about it respectful, factual and age-appropriate.',
'- AV6 Outdoor Living: complete the Wilderness Master Award (earn 7 honours from: Backpacking, Camp Craft, Camp Safety, Camping Skills IV, Cold Weather Survival, Dutch Oven Cooking, Edible Wild Plants, Fire Building & Camp Cookery, Hiking, Knot Tying, Orienteering, Outdoor Leadership, Pioneering, Tents, Wilderness Leadership, Wilderness Living, Winter Camping).',
'- Organisation and Leadership, Nature Study and Lifestyle Enrichment have no Advanced item. Guides work on Advanced in the Advanced section of their app; counsellors sign each item off on the Guide\'s page. get_guide and get_class_overview show the sign-offs.',
'',
'# THE COUNSELLOR DASHBOARD',
'- Tabs: Class (cards, grid, or the class Quest Map; countdown to the evaluation date), Meetings & Plan (the programme planner for coming weeks, logging each meeting with who came, which can tick requirements for everyone present, and attendance), Explorers (Sanctuary, Learning Lab and the Questions editor), Report (class report, photo evidence, printable record sheets for investiture), Assistant (you), Links (class link, personal links, parent links).',
'- A Guide\'s page: ticks and mission sign-offs, Advanced sign-offs, photos, what they typed, private notes, parent link, New link (their work moves to it) and Remove.',
'- LESSON PLANS: when asked for a lesson plan (for example "a lesson plan for this week"), first call get_class_overview. Plan from what each Guide has completed and what is still missing (guides[].missing, class_most_needs_next), never from paperwork (paperwork_check_and_file). Requests in waiting_for_sign_off still need a counsellor to check them, so plan a quick check, not a lesson. Use upcoming_programme, the 20-week sample order and the class-period times below to choose what comes next. Give: the requirement code(s) and plain name(s), aim, Bible base (KJV), materials, opener, the main activity with timings, discussion questions, how to check it (the method of testing), and a short closing. If Guides are missing different things, suggest groups or stations.',
'',
'# HOW A REQUIREMENT GOES ON THE RECORD (Version 15)',
'- A Guide taps "Done - ask my counsellor to check" in their app. That is only a request: it shows in To review on the Class tab and in waiting_for_sign_off. It does not count until a counsellor signs it off (ticks it). "Not yet" sends it back to the Guide with a short note.',
'- Only counsellor ticks and sign-offs count toward the 24 and the record sheets. mark_requirements is a counsellor action, so it does count.',
'- Paperwork (G1 age or grade, G3 active member, SD4 Memory Gem certificate, OL2 staff course) is checked and filed on the Report tab. Never plan a lesson for it.',
'',
'# GUIDE TEACHER\'S MANUAL GUIDANCE (official Guide curriculum used in the Inter-American Division)',
'- Class time: SD1 two class periods; SD2 two periods; FD1 two sessions for each topic; HF2 one period; OL1 one period; NS1 about one hour; OD4 three periods; G2 one session; CO1 one period; CO2 one session; Memory Gem exam one class period.',
'- Sample 20-week order: week 1 Legion of Honour, choose book club books, collect dues; 2 gifts of the Spirit, Basic Staff Course; 3 gifts of the Spirit, attitudes topic A, begin Stewardship (Advanced); 4 attitudes topic B, organise the camp-out; 5 pack camp; 6 sanctuary, Community Outreach (Advanced); 7 nature and recreation, an honour toward a Master award; 8 sanctuary discussion, honour work; 9 three-course meal; 10 pioneer stories, honour work, begin Steps to Christ (Advanced); 11 pioneer stories, organise the health activity, Memory Gem exam; 12 Desire of Ages ch. 7, health activity, assign the Friendship essay (Advanced); 13 teach an honour to Juniors, attitudes topic C; 14 teach an honour to Juniors, start lifestyle honours, attitudes topic D; 15 lashing tower or bridge, witnessing discussion; 16 nature parables, Nutrition Honour; 17 church organisation flow chart, Nutrition Honour continued, Advanced health; 18 outreach visits; 19 presentation at school, Wilderness Master; 20 complete all work. Use it as a guide and adapt it to where the class is.',
'- Investiture: the conference or area youth director (or someone they appoint) presides; the area coordinator calls the service to order; class marshals hand the record forms to the investing officer.',
'',
'# LEARNING LAB EXPLORERS (each has lesson cards, a game and an 8-question challenge)',
'sanctuary (SD2), legion (G2), fruit (SD1), pioneers (SD3), newstart (HF1), nutrition (HF3), church (OL1), ecology (NS2), packcamp (OD1), fire (OD2), lashing (OD3), orienteering (OD4). Counsellors can add questions to any explorer. There is also a Memory Gem trainer (SD4). Version 16 added: hiv (AV5: God’s plan, waiting, HIV/AIDS facts and abbreviations), visit (CO1), witness (CO2), choices (FD1), fitness (HF2), temperance (HF2 option c: Temperance pages 102–125 and a 20-question quiz, 75% to pass), teach (OL3), parable (NS1), honours (LE1 and OD4), story (G4: how the Adventist message came to Guyana, Elder Ovid E. Davis and Mount Roraima, Davis Memorial Hospital, and how to read a local church history book). The Learning Lab also has a Reading room: Steps to Christ (AV2) and The Desire of Ages chapter 7 (NS1) word for word with Listen, Galatians 5:22–23 (SD1), the AV4 friendship verses, and the White Estate’s recorded readings of Temperance pages 102–125 (HF2) and Counsels on Stewardship (AV1).'
].join('\n');

var AI_RULES = [
'You are the Guide Quest Assistant, the helper for the counsellors of a Seventh-day Adventist Pathfinder club in Guyana. You know the Guide class, every requirement, Pathfinder honours, the Bible and the Spirit of Prophecy (Ellen G. White), and you can read and update the class records with your tools.',
'',
'PRIVACY: You never see Guides\' names. Each Guide is a code like [G:1a2b3]. Whenever you mean a Guide, write their code exactly, brackets included: the app shows the counsellor the real name. Never invent a code. If the counsellor uses a name you do not recognise, pass it to the tool as written and the tool will try to match it.',
'',
'LOGGING WHAT THE CLASS DID: When the counsellor says the class (or some Guides) did something, (1) work out which requirements it fully meets, using the requirement guide; (2) call mark_requirements once with those Guides and codes and a short activity note (what, where, when); (3) reply with: what the activity was; each requirement covered, with its code and plain name and why; who was ticked; who already had it; and any names the tool could not match or found ambiguous, asking the counsellor to check them. Mention they can tap Undo. If you are not sure who was there or what was done, ask one short question before ticking. Never tick on a guess. If the counsellor says everyone or the whole class, use every code in the class list. Only un-tick or sign off a mission when the counsellor asks; check with get_class_overview first and warn if requirements are missing.',
'',
'STATUS QUESTIONS: Use get_class_overview for the class, get_guide for one Guide, get_recent_activity for what happened lately. Give a short summary first (how many done, what is left, who is close to finishing, which mission or activity would tick the most boxes next), then details if useful. Offer a next step, such as a lesson plan.',
'',
'TEACHING: You can plan and teach the whole class: lesson plans (aim, Bible base, opener, main activity, discussion questions, application, closing, timings for a 30-45 minute session), worship talks, devotionals, camp plans and gear lists, outreach plans, honour teaching outlines, quizzes, explanations of any requirement or honour, and messages to Guides or parents. When asked, add quiz questions to a Learning Lab explorer with add_questions (one correct answer and three believable wrong answers each).',
'',
'BIBLE AND SPIRIT OF PROPHECY: Answer from a Seventh-day Adventist understanding (the 28 Fundamental Beliefs), kindly and clearly. Give references for everything (book chapter:verse; for Ellen G. White the book and page, e.g. Steps to Christ, p. 93). Use King James wording when quoting the Bible unless asked otherwise. Only quote exact words when you are sure of them; otherwise summarise and give the reference. Never make up a quote or a page number. If unsure, say so and suggest checking the Bible or egwwritings.org. Define words simply when asked.',
'',
'CARE: The Guides are about 15. Keep everything age-appropriate and Christ-centred. For dating, sexuality and moral topics give wholesome, biblical guidance and suggest involving parents or the pastor. If something suggests a Guide may be unsafe or at risk of harm, tell the counsellor to follow the club\'s child-protection policy and contact the right people (parents, director, pastor, authorities) straight away.',
'',
'STYLE: Warm, clear and practical, like an experienced Master Guide. Simple English. Short paragraphs, bullet points, numbered steps and small tables when helpful (Markdown). Keep answers as short as the question allows. The counsellor may be speaking through voice typing, so read past small transcription mistakes.'
].join('\n');

var AI_TOOLS = [{ functionDeclarations: [
  { name: 'get_class_overview', description: 'Progress of every Guide: requirements done and missing, mission sign-offs, Learning Lab progress, and how many Guides have each requirement.' },
  { name: 'get_guide', description: 'Full record for one Guide: requirements done and missing, sign-offs, what they typed in the app, challenge scores.',
    parameters: { type: 'object', properties: { guide: { type: 'string', description: 'The Guide code like [G:1a2b3], or a name as the counsellor said it.' } }, required: ['guide'] } },
  { name: 'mark_requirements', description: 'Tick (or un-tick) requirements for one or more Guides, e.g. after a class activity. Records the activity note on each Guide. The counsellor can undo it.',
    parameters: { type: 'object', properties: {
      guides: { type: 'array', items: { type: 'string' }, description: 'Guide codes like [G:1a2b3], or names as said.' },
      requirements: { type: 'array', items: { type: 'string' }, description: 'Requirement codes such as CO1, OD2.' },
      complete: { type: 'boolean', description: 'true to tick (default), false to un-tick.' },
      activity: { type: 'string', description: 'Short note: what the class did, where and when.' } }, required: ['guides', 'requirements'] } },
  { name: 'sign_off_mission', description: 'Counsellor sign-off for a mission (m1, m2, m3, m4, m5 or base) for one or more Guides. Only when the counsellor asks.',
    parameters: { type: 'object', properties: {
      guides: { type: 'array', items: { type: 'string' } },
      mission: { type: 'string', enum: ['m1', 'm2', 'm3', 'm4', 'm5', 'base'] },
      signed: { type: 'boolean', description: 'true to sign off (default), false to remove the sign-off.' },
      force: { type: 'boolean', description: 'true to sign even if requirements in the mission are still missing (only if the counsellor insists).' } }, required: ['guides', 'mission'] } },
  { name: 'list_questions', description: 'The challenge questions of one Learning Lab explorer.',
    parameters: { type: 'object', properties: { explorer: { type: 'string', enum: ['sanctuary', 'legion', 'fruit', 'pioneers', 'newstart', 'nutrition', 'church', 'ecology', 'packcamp', 'fire', 'lashing', 'orienteering'] } }, required: ['explorer'] } },
  { name: 'add_questions', description: 'Add multiple-choice questions to a Learning Lab explorer challenge. Only when the counsellor asks.',
    parameters: { type: 'object', properties: {
      explorer: { type: 'string', enum: ['sanctuary', 'legion', 'fruit', 'pioneers', 'newstart', 'nutrition', 'church', 'ecology', 'packcamp', 'fire', 'lashing', 'orienteering'] },
      questions: { type: 'array', items: { type: 'object', properties: {
        question: { type: 'string' }, correct_answer: { type: 'string' },
        wrong_answers: { type: 'array', items: { type: 'string' } }, explanation: { type: 'string' } }, required: ['question', 'correct_answer', 'wrong_answers'] } } }, required: ['explorer', 'questions'] } },
  { name: 'get_recent_activity', description: 'The latest entries in the club activity log (ticks, sign-offs, joins, challenge scores).',
    parameters: { type: 'object', properties: { limit: { type: 'integer', description: 'How many entries (max 60).' } } } }
] }];

function aiProps_() { return PropertiesService.getScriptProperties(); }

/** Run this once from the Apps Script editor (select it, then Run) so Google asks permission for the Assistant to reach Gemini. */
function authorizeAssistant() {
  UrlFetchApp.fetch(AI_API + 'models', { muteHttpExceptions: true });
  aiProps_().getProperty(AI_KEY_PROP);
  return 'The Assistant is allowed to reach Gemini.';
}
function aiFetch_(url, opts) {
  try { return UrlFetchApp.fetch(url, opts); }
  catch (err) { throw new Error(/permission|authoriz/i.test(String(err && err.message || err)) ? 'ai-auth' : 'ai-unreachable'); }
}
function aiModels_() { try { return JSON.parse(aiProps_().getProperty(AI_MODELS_PROP) || '[]'); } catch (e) { return []; } }

function c_aiStatus(pin) {
  checkPin_(pin);
  return { ready: !!aiProps_().getProperty(AI_KEY_PROP), model: aiModels_()[0] || '' };
}

/** Saves the club's Gemini key after checking it with Google, and picks the best free models. */
function c_setAiKey(pin, key, who) {
  checkPin_(pin);
  key = String(key || '').replace(/\s+/g, '');
  if (!/^[!-~]{20,400}$/.test(key)) throw new Error('ai-key-format');
  var res = aiFetch_(AI_API + 'models?pageSize=200', { headers: { 'x-goog-api-key': key }, muteHttpExceptions: true });
  var code = res.getResponseCode();
  if (code !== 200) throw new Error(code === 400 || code === 401 || code === 403 ? 'ai-key-bad' : 'ai-unreachable');
  var models = aiPickModels_(JSON.parse(res.getContentText()).models || []);
  if (!models.length) throw new Error('ai-no-model');
  var p = {}; p[AI_KEY_PROP] = key; p[AI_MODELS_PROP] = JSON.stringify(models);
  aiProps_().setProperties(p);
  log_('—', who_(who) + ' switched on the AI assistant');
  return { ok: true, model: models[0] };
}

function c_clearAiKey(pin, who) {
  checkPin_(pin);
  aiProps_().deleteProperty(AI_KEY_PROP);
  aiProps_().deleteProperty(AI_MODELS_PROP);
  log_('—', who_(who) + ' switched off the AI assistant');
  return { ok: true };
}

/** Newest Flash-Lite first (largest free daily allowance), then newest Flash, then the "latest" aliases. */
function aiPickModels_(list) {
  var names = list.filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') > -1; })
    .map(function (m) { return String(m.name || '').replace(/^models\//, ''); });
  var ver = function (n) { var m = n.match(/^gemini-(\d+(?:\.\d+)?)-/); return m ? parseFloat(m[1]) : 0; };
  var byVer = function (a, b) { return ver(b) - ver(a) || a.length - b.length; };
  var lite = names.filter(function (n) { return /^gemini-\d+(\.\d+)?-flash-lite(-\d{3})?$/.test(n); }).sort(byVer);
  var flash = names.filter(function (n) { return /^gemini-\d+(\.\d+)?-flash(-\d{3})?$/.test(n); }).sort(byVer);
  var out = lite.slice(0, 2).concat(flash.slice(0, 2));
  ['gemini-flash-lite-latest', 'gemini-flash-latest'].forEach(function (n) { if (names.indexOf(n) > -1) out.push(n); });
  if (!out.length) out = names.filter(function (n) { return /flash/.test(n) && !/image|tts|audio|live|embed|preview|exp/.test(n); }).sort(byVer).slice(0, 3);
  return out.filter(function (n, i, a) { return a.indexOf(n) === i; });
}

/* ---------- names <-> codes ---------- */
function aiNorm_(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim(); }
function aiRoster_() {
  var sh = sheet_(SHEET_PF), last = sh.getLastRow(), out = [], used = {};
  if (last < FIRST_ROW) return out;
  sh.getRange(FIRST_ROW, 1, last - FIRST_ROW + 1, NCOLS).getValues().forEach(function (v) {
    var name = String(v[COL_NAME - 1]).trim(), tok = String(v[COL_TOKEN - 1]).trim().toLowerCase();
    if (!name || !/^[0-9a-f]{8,}$/.test(tok)) return;
    var len = 5, id = tok.slice(0, len);
    while (used[id] && len < tok.length) id = tok.slice(0, ++len);
    used[id] = true;
    var done = {}, signs = {};
    CODES.forEach(function (c, j) { done[c] = v[COL_REQ0 - 1 + j] === true; });
    MISSIONS.forEach(function (m, j) { var s = v[COL_SIGN0 - 1 + j]; if (s !== '' && s !== null) signs[m.id] = fmtSign_(s); });
    out.push({ id: id, code: '[G:' + id + ']', t: tok, name: name, done: done, signs: signs });
  });
  return out;
}
function aiEsc_(s) { return s.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&'); }
function aiMasker_(roster) {
  var map = {}, firsts = {};
  roster.forEach(function (g) { var f = aiNorm_(g.name).split(' ')[0]; firsts[f] = (firsts[f] || 0) + 1; });
  roster.forEach(function (g) {
    var full = aiNorm_(g.name), f = full.split(' ')[0];
    if (full) map[full] = g.code;
    if (f.length > 1 && firsts[f] === 1 && !map[f]) map[f] = g.code;
  });
  var keys = Object.keys(map).sort(function (a, b) { return b.length - a.length; });
  if (!keys.length) return function (s) { return String(s == null ? '' : s); };
  var re = new RegExp('(^|[^A-Za-z0-9])(' + keys.map(function (k) { return aiEsc_(k).replace(/ /g, '\\s+'); }).join('|') + ')(?=$|[^A-Za-z0-9])', 'gi');
  return function (s) { return String(s == null ? '' : s).replace(re, function (m, pre, nm) { return pre + (map[aiNorm_(nm)] || nm); }); };
}
function aiUnmasker_(roster) {
  var by = {};
  roster.forEach(function (g) { by[g.id] = g.name; });
  return function (s) { return String(s == null ? '' : s).replace(/\[?G:\s?([0-9a-f]{5,16})\]?/g, function (m, id) { return by[id] || m; }); };
}
function aiDist_(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  var d = [], i, j;
  for (i = 0; i <= a.length; i++) d[i] = [i];
  for (j = 1; j <= b.length; j++) d[0][j] = j;
  for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
  return d[a.length][b.length];
}
/** A Guide from a code or a spoken name (allows one small typo in names of 4+ letters). */
function aiFind_(roster, ref) {
  ref = String(ref == null ? '' : ref).trim();
  var m = ref.match(/G:\s?([0-9a-f]{5,16})/);
  if (m) { var hit = roster.filter(function (x) { return x.id === m[1]; })[0]; return hit ? { g: hit } : { miss: ref }; }
  var n = aiNorm_(ref);
  if (!n) return { miss: ref };
  var words = n.split(' '), parts = function (x) { return aiNorm_(x.name).split(' '); };
  var near = function (q, w) { return q === w || (w.length > 3 && q.length > 3 && aiDist_(q, w) <= 1); };
  var exact = roster.filter(function (x) { return aiNorm_(x.name) === n; });
  if (exact.length === 1) return { g: exact[0] };
  var hits = roster.filter(function (x) { var p = parts(x); return words.every(function (w) { return p.indexOf(w) > -1; }); });
  if (!hits.length) hits = roster.filter(function (x) { var p = parts(x); return words.every(function (w) { return p.some(function (q) { return near(q, w); }); }); });
  if (hits.length === 1) return { g: hits[0] };
  if (hits.length > 1) return { ambiguous: ref, options: hits.map(function (x) { return x.code; }) };
  return { miss: ref };
}
function aiTargets_(roster, refs, res) {
  var out = [];
  (Array.isArray(refs) ? refs : [refs]).slice(0, 80).forEach(function (ref) {
    var f = aiFind_(roster, ref);
    if (f.g) { if (out.indexOf(f.g) < 0) out.push(f.g); }
    else if (f.ambiguous) res.ambiguous.push({ said: f.ambiguous, could_be: f.options });
    else res.not_found.push(f.miss);
  });
  return out;
}
function aiGetAnswer_(t, key) {
  var a = sheet_(SHEET_ANS), last = a.getLastRow();
  if (last < 2) return '';
  var rows = a.getRange(2, 4, last - 1, 4).getValues();
  for (var i = 0; i < rows.length; i++) if (String(rows[i][2]) === t && String(rows[i][3]) === key) return rows[i][0];
  return '';
}

/* ---------- tools ---------- */
function aiOverview_(roster) {
  var chal = challengeSummary_(), seen = seenSummary_(), byReq = {}, cm = claimsMap_();
  var meets = meetingsRead_(), att = attendance_(meets), av = advSummary_(), today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  CODES.forEach(function (c) { byReq[c] = roster.filter(function (g) { return g.done[c]; }).length + '/' + roster.length; });
  return {
    guides_in_class: roster.length,
    evaluation_date: evalDate_() || 'not set',
    meetings_logged: meets.length,
    upcoming_programme: programmeRead_().filter(function (x) { return x.date >= today; }).slice(0, 8).map(function (x) { return x.date + ': ' + x.title + (x.codes.length ? ' (' + x.codes.join(', ') + ')' : ''); }),
    guides: roster.map(function (g) {
      var missing = CODES.filter(function (c) { return !g.done[c]; }), all = chal[g.t] || {}, lab = {};
      Object.keys(TOPICS).forEach(function (k) {
        var a = all[k], s = (seen[g.t] || {})[k];
        if (a || s) lab[k] = (s ? s + ' cards opened' : '') + (a ? (s ? ', ' : '') + 'best ' + a.best + '/' + (a.last ? a.last.total : '?') + ' in ' + a.attempts + ' tries' : '');
      });
      return { guide: g.code, done: (CODES.length - missing.length) + ' of ' + CODES.length, missing: missing,
        missions_signed_off: Object.keys(g.signs), learning_lab: lab,
        meetings_attended: (att[g.t] || 0) + ' of ' + meets.length, advanced: advText_(av[g.t]),
        waiting_for_sign_off: Object.keys((cm[g.t] || {}).claims || {}).filter(function (c) { return CODES.indexOf(c) > -1 && !g.done[c]; }) };
    }),
    guides_done_per_requirement: byReq,
    paperwork_check_and_file: PAPER.join(', ') + ': personal records (age or grade, active membership, Memory Gem certificate, staff course). Check and file them on the Report tab; never plan a lesson for them.',
    class_most_needs_next: CODES.filter(function (c) { return PAPER.indexOf(c) < 0; }).map(function (c) { return { c: c, n: roster.filter(function (g) { return !g.done[c]; }).length }; })
      .filter(function (x) { return x.n; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8).map(function (x) { return x.c + ' ' + REQ[x.c] + ' (' + x.n + ' still need it)'; }),
    missions: MISSIONS.map(function (m) { return m.id + ' ' + m.label + ': ' + m.tasks.join(', '); })
  };
}
function aiGuide_(roster, ref, mask) {
  var res = { ambiguous: [], not_found: [] }, g = aiTargets_(roster, [ref], res)[0];
  if (!g) return res;
  var ans = [], a = sheet_(SHEET_ANS), last = a.getLastRow();
  if (last >= 2) a.getRange(2, 2, last - 1, 6).getValues().forEach(function (r) {
    if (String(r[4]) !== g.t) return;
    var v = r[2];
    if (typeof v === 'string' && v.charAt(0) === '[') { try { v = JSON.parse(v).filter(function (x) { return x !== '' && x != null; }).join(', '); } catch (e) {} }
    if (v === '' || v === null) return;
    ans.push(r[0] + ' ' + r[1] + ': ' + mask(String(v)).slice(0, 300));
  });
  var all = challengeSummary_()[g.t] || {}, scores = {};
  Object.keys(all).forEach(function (k) { scores[k] = 'best ' + all[k].best + '/' + (all[k].last ? all[k].last.total : '?') + ', ' + all[k].attempts + ' tries'; });
  var mts = meetingsRead_(), xg = extrasMap_()[g.t], ag = advSummary_()[g.t];
  return { guide: g.code,
    completed: CODES.filter(function (c) { return g.done[c]; }),
    not_completed: CODES.filter(function (c) { return !g.done[c]; }).map(function (c) { return c + ' ' + REQ[c]; }),
    missions_signed_off: g.signs, typed_in_app: ans.slice(0, 80), challenge_scores: scores,
    meetings_attended: (attendance_(mts)[g.t] || 0) + ' of ' + mts.length,
    advanced: advText_(ag), counsellor_notes: mask(String((xg || {}).note || '')).slice(0, 1000) };
}
function aiMark_(roster, args, ctx) {
  var raw = (Array.isArray(args.requirements) ? args.requirements : [args.requirements]).map(function (c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  var codes = raw.filter(function (c, i, a) { return CODES.indexOf(c) > -1 && a.indexOf(c) === i; });
  var res = { requirements: codes, complete: args.complete !== false, updated: [], already_had_it: [], not_found: [], ambiguous: [],
    invalid_codes: raw.filter(function (c) { return c && CODES.indexOf(c) < 0; }) };
  if (!codes.length) { res.error = 'No valid requirement codes. Use codes like CO1 or OD2.'; return res; }
  var targets = aiTargets_(roster, args.guides, res);
  if (!targets.length) return res;
  var want = res.complete, note = ctx.unmask(String(args.activity || '')).replace(/\s+/g, ' ').trim().slice(0, 300);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_(SHEET_PF), changes = [], names = [], now = new Date();
    var stamp = Utilities.formatDate(now, tz_(), 'd MMM yyyy') + ', ' + ctx.who;
    targets.forEach(function (g) {
      var row = findRow_(sh, g.t);
      if (row < 0) { res.not_found.push(g.code); return; }
      var changed = [];
      codes.forEach(function (c) {
        var cell = sh.getRange(row, COL_REQ0 + CODES.indexOf(c)), prev = cell.getValue() === true;
        if (prev === want) return;
        cell.setValue(want); g.done[c] = want; changed.push(c);
        if (want) tickDate_(g.t, g.name, c, ctx.who + ' (assistant)');
        changes.push({ kind: 'req', t: g.t, code: c, prev: prev });
      });
      if (!changed.length) { res.already_had_it.push(g.code); return; }
      sh.getRange(row, COL_UPDATED).setValue(now);
      if (want && note) changed.forEach(function (c) {
        var key = c + '.record';
        changes.push({ kind: 'rec', t: g.t, key: key, prev: String(aiGetAnswer_(g.t, key) || '') });
        upsertAnswer_(g.t, g.name, key, 'Activity record (from the assistant)', safe_(note + ' (' + stamp + ')'));
      });
      log_(g.name, ctx.who + ' via assistant ' + (want ? 'ticked ' : 'un-ticked ') + changed.join(', ') + (note ? ': ' + note : ''));
      res.updated.push({ guide: g.code, changed: changed });
      names.push(g.name);
    });
    SpreadsheetApp.flush();
    if (changes.length) res.undo_saved = !!ctx.saveUndo(changes, (want ? 'Ticked ' : 'Un-ticked ') + codes.join(', ') + ' for ' + names.join(', '));
  } finally { lock.releaseLock(); }
  return res;
}
function aiSign_(roster, args, ctx) {
  var mid = String(args.mission || '').toLowerCase(), i = -1;
  MISSIONS.forEach(function (m, k) { if (m.id === mid) i = k; });
  if (i < 0) return { error: 'Unknown mission. Use m1, m2, m3, m4, m5 or base.' };
  var M = MISSIONS[i], on = args.signed !== false;
  var res = { mission: M.label, signed: on, updated: [], not_ready: [], not_found: [], ambiguous: [] };
  var targets = aiTargets_(roster, args.guides, res);
  if (!targets.length) return res;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_(SHEET_PF), changes = [], names = [];
    var text = on ? ctx.who + ' · ' + Utilities.formatDate(new Date(), tz_(), 'd MMM yyyy') : '';
    targets.forEach(function (g) {
      var missing = M.tasks.filter(function (c) { return !g.done[c]; });
      if (on && missing.length && args.force !== true) { res.not_ready.push({ guide: g.code, missing: missing }); return; }
      var row = findRow_(sh, g.t);
      if (row < 0) { res.not_found.push(g.code); return; }
      var cell = sh.getRange(row, COL_SIGN0 + i), prev = cell.getValue();
      changes.push({ kind: 'sign', t: g.t, i: i, prev: prev instanceof Date ? Utilities.formatDate(prev, tz_(), 'd MMM yyyy') : String(prev) });
      cell.setValue(text);
      log_(g.name, ctx.who + ' via assistant ' + (on ? 'signed off ' : 'removed the sign-off for ') + M.label);
      res.updated.push(g.code); names.push(g.name);
    });
    SpreadsheetApp.flush();
    if (changes.length) res.undo_saved = !!ctx.saveUndo(changes, (on ? 'Signed off ' : 'Removed sign-off for ') + M.label + ': ' + names.join(', '));
  } finally { lock.releaseLock(); }
  return res;
}
function aiAddQuestions_(args, ctx) {
  var topic = String(args.explorer || '');
  if (!TOPICS[topic]) return { error: 'Unknown explorer.', explorers: Object.keys(TOPICS) };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var s = sheet_(SHEET_Q), changes = [], base = Date.now().toString(36);
    (Array.isArray(args.questions) ? args.questions : []).slice(0, 15).forEach(function (q, n) {
      q = q || {};
      var text = String(q.question || '').trim().slice(0, 300), right = String(q.correct_answer || '').trim().slice(0, 160);
      var wrong = (Array.isArray(q.wrong_answers) ? q.wrong_answers : []).map(function (x) { return String(x || '').trim().slice(0, 160); })
        .filter(function (x) { return x && x !== right; }).slice(0, 3);
      if (text.length < 3 || !right || !wrong.length) return;
      var opts = [right].concat(wrong);
      while (opts.length < 4) opts.push('');
      var id = 'q' + base + n;
      s.appendRow([id, true, safe_(text), safe_(opts[0]), safe_(opts[1]), safe_(opts[2]), safe_(opts[3]), 'A', safe_(String(q.explanation || '').trim().slice(0, 300)), topic]);
      changes.push({ kind: 'q', id: id });
    });
    if (!changes.length) return { error: 'No complete questions were given (each needs a question, a correct answer and wrong answers).' };
    formatQuestions_(s);
    log_('—', ctx.who + ' via assistant added ' + changes.length + ' questions to ' + TOPICS[topic].name);
    ctx.saveUndo(changes, 'Added ' + changes.length + ' questions to ' + TOPICS[topic].name);
    return { explorer: TOPICS[topic].name, added: changes.length };
  } finally { lock.releaseLock(); }
}
function aiQuestions_(args) {
  var topic = TOPICS[args.explorer] ? args.explorer : 'sanctuary';
  return { explorer: TOPICS[topic].name, questions: readQuestions_(false, topic).slice(0, 60).map(function (q) {
    return { q: q.q, answers: q.opts.filter(function (o) { return o; }), correct: q.opts[q.correct] || '', in_use: q.active };
  }) };
}
function aiRecent_(args, mask) {
  var n = Math.max(1, Math.min(60, Number(args.limit) || 25)), s = sheet_(SHEET_LOG), last = s.getLastRow(), out = [];
  if (last < 2) return { entries: [] };
  var from = Math.max(2, last - n + 1);
  s.getRange(from, 1, last - from + 1, 3).getValues().reverse().forEach(function (r) {
    var when = r[0] instanceof Date ? Utilities.formatDate(r[0], tz_(), 'd MMM yyyy h:mm a') : String(r[0]);
    out.push(when + ' | ' + mask(String(r[1])) + ' | ' + mask(String(r[2])));
  });
  return { entries: out };
}
function aiRunTool_(name, args, roster, ctx) {
  args = args || {};
  try {
    switch (name) {
      case 'get_class_overview': return aiOverview_(roster);
      case 'get_guide': return aiGuide_(roster, args.guide, ctx.mask);
      case 'mark_requirements': return aiMark_(roster, args, ctx);
      case 'sign_off_mission': return aiSign_(roster, args, ctx);
      case 'list_questions': return aiQuestions_(args);
      case 'add_questions': return aiAddQuestions_(args, ctx);
      case 'get_recent_activity': return aiRecent_(args, ctx.mask);
    }
    return { error: 'Unknown tool ' + name };
  } catch (err) { return { error: String(err && err.message || err) }; }
}

/* ---------- Gemini ---------- */
function aiCall_(key, body, ctx) {
  var models = ctx.models, lastErr = 'ai-error';
  for (var i = 0; i < models.length; i++) {
    for (var attempt = 0; attempt < 2; attempt++) {
      var res = aiFetch_(AI_API + 'models/' + encodeURIComponent(models[i]) + ':generateContent', {
        method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key },
        payload: JSON.stringify(body), muteHttpExceptions: true });
      var code = res.getResponseCode(), text = res.getContentText();
      if (code === 200) {
        if (i > 0) { ctx.models = models.slice(i).concat(models.slice(0, i)); aiProps_().setProperty(AI_MODELS_PROP, JSON.stringify(ctx.models)); }
        ctx.model = models[i];
        return JSON.parse(text);
      }
      var msg = ''; try { msg = JSON.parse(text).error.message || ''; } catch (e) {}
      ctx.detail = code + ' ' + msg.slice(0, 200);
      if (code === 400 && /api key|API_KEY/i.test(msg)) throw new Error('ai-key-bad');
      if (code === 401 || code === 403) throw new Error(/location|region|country/i.test(msg) ? 'ai-region' : 'ai-key-bad');
      if (code === 429) { lastErr = 'ai-busy'; break; }
      if (code === 404 || (code === 400 && /model|not supported|not found/i.test(msg))) { lastErr = 'ai-error'; break; }
      if (code >= 500 && attempt === 0) { Utilities.sleep(1500); continue; }
      if (code === 400) throw new Error('ai-error');
      break;
    }
  }
  throw new Error(lastErr);
}

/** The Assistant tab sends the conversation here. history: [{role:'user'|'model', text}] */
function c_ai(pin, history, who) {
  checkPin_(pin);
  var key = aiProps_().getProperty(AI_KEY_PROP);
  if (!key) throw new Error('ai-off');
  var models = aiModels_();
  if (!models.length) throw new Error('ai-off');
  history = (Array.isArray(history) ? history : []).slice(-20);
  var roster = aiRoster_(), mask = aiMasker_(roster), unmask = aiUnmasker_(roster);
  var ctx = { models: models, who: who_(who), mask: mask, unmask: unmask, actions: [] };
  ctx.saveUndo = function (changes, label) {
    var id = 'u' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    CacheService.getScriptCache().put('gq-undo-' + id, JSON.stringify({ changes: changes, label: label }), 21600);
    ctx.actions.push({ undo: id, text: label });
    return id;
  };
  var contents = history.map(function (m) {
    return { role: m && m.role === 'model' ? 'model' : 'user', parts: [{ text: mask(String(m && m.text || '').slice(0, 6000)) || '...' }] };
  }).filter(function (c, i, a) { return !(i === 0 && c.role === 'model'); });
  if (!contents.length || contents[contents.length - 1].role !== 'user') throw new Error('bad-request');
  var today = Utilities.formatDate(new Date(), tz_(), 'EEEE d MMMM yyyy');
  var system = AI_RULES + '\n\nToday is ' + today + '. You are talking with counsellor ' + ctx.who + '.\n' +
    'Guides in the class (' + roster.length + '): ' + (roster.map(function (g) { return g.code; }).join(', ') || 'none yet') + '.\n\n' + AI_KNOWLEDGE;
  var body = { systemInstruction: { parts: [{ text: system }] }, contents: contents, tools: AI_TOOLS,
    generationConfig: { temperature: 0.5, maxOutputTokens: 8192 } };
  var reply = '';
  for (var round = 0; round < 6; round++) {
    var data = aiCall_(key, body, ctx), cand = (data.candidates || [])[0];
    if (!cand || !cand.content || !cand.content.parts) {
      var why = (data.promptFeedback && data.promptFeedback.blockReason) || (cand && cand.finishReason) || '';
      reply = why ? 'I can\'t answer that one (' + String(why).toLowerCase().replace(/_/g, ' ') + '). Try asking it another way.' : 'I didn\'t get an answer. Please try again.';
      break;
    }
    var calls = cand.content.parts.filter(function (p) { return p.functionCall; });
    if (!calls.length) {
      reply = cand.content.parts.filter(function (p) { return p.text && !p.thought; }).map(function (p) { return p.text; }).join('').trim();
      if (!reply) reply = 'I didn\'t get an answer. Please try again.';
      break;
    }
    body.contents.push(cand.content);
    body.contents.push({ role: 'user', parts: calls.map(function (p) {
      return { functionResponse: { name: p.functionCall.name, response: aiRunTool_(p.functionCall.name, p.functionCall.args, roster, ctx) } };
    }) });
    if (round === 5) reply = 'That took too many steps. Here is what I did so far; please check the class list.';
  }
  return { text: unmask(reply), actions: ctx.actions, model: ctx.model || models[0] };
}

/** Undo one assistant change (kept for 6 hours). */
function c_aiUndo(pin, id, who) {
  checkPin_(pin);
  var key = 'gq-undo-' + String(id || '').replace(/[^\w]/g, ''), cache = CacheService.getScriptCache(), raw = cache.get(key);
  if (!raw) throw new Error('undo-expired');
  var u = JSON.parse(raw), lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_(SHEET_PF), qs = sheet_(SHEET_Q);
    u.changes.slice().reverse().forEach(function (c) {
      if (c.kind === 'q') { var r = findQuestionRow_(qs, c.id); if (r > 0) qs.deleteRow(r); return; }
      var row = findRow_(sh, c.t);
      if (row < 0) return;
      var name = String(sh.getRange(row, COL_NAME).getValue()).trim();
      if (c.kind === 'req') { sh.getRange(row, COL_REQ0 + CODES.indexOf(c.code)).setValue(c.prev === true); sh.getRange(row, COL_UPDATED).setValue(new Date()); }
      else if (c.kind === 'sign') sh.getRange(row, COL_SIGN0 + c.i).setValue(c.prev || '');
      else if (c.kind === 'rec') upsertAnswer_(c.t, name, c.key, 'Activity record (from the assistant)', c.prev || '');
    });
    SpreadsheetApp.flush();
    cache.remove(key);
    log_('—', who_(who) + ' undid an assistant change: ' + u.label);
  } finally { lock.releaseLock(); }
  return { ok: true };
}

/* ======================================================================
 * LEARNING LAB: an explorer (lesson cards, a game and a challenge) for
 * each requirement where one helps. Pages: ?p=learn (all explorers)
 * and ?p=learn&k=<topic>. Results go to the Challenge tab with a Topic.
 * ==================================================================== */
var TOPICS = {
  sanctuary:    { name: 'Sanctuary Explorer',   code: 'SD2', cards: 12 },
  legion:       { name: 'Legion of Honour',     code: 'G2',  cards: 7 },
  fruit:        { name: 'Fruit of the Spirit',  code: 'SD1', cards: 12 },
  pioneers:     { name: 'Adventist Pioneers',   code: 'SD3', cards: 7 },
  newstart:     { name: '8 Laws of Health',     code: 'HF1', cards: 9 },
  nutrition:    { name: 'Nutrition',            code: 'HF3', cards: 8 },
  church:       { name: 'Church Map',           code: 'OL1', cards: 6 },
  ecology:      { name: 'Ecology',              code: 'NS2', cards: 8 },
  packcamp:     { name: 'Pack Camp',            code: 'OD1', cards: 7 },
  fire:         { name: 'Fire & Camp Cooking',  code: 'OD2', cards: 10 },
  lashing:      { name: 'Knots & Lashings',     code: 'OD3', cards: 8 },
  orienteering: { name: 'Orienteering',         code: 'OD4', cards: 9 }
};

// [question, [correct answer first, then 3 others], 0, explanation]. Answers are shuffled on screen.
var TOPIC_QUESTIONS = {
  legion: [
    ['Finish the line: “I will honour Christ in that which I choose to…”', ['behold', 'forget', 'buy', 'hide'], 0, 'Behold: what I choose to watch and look at.'],
    ['Which line is about the friends I spend time with?', ['The choice of my associates', 'The choice of places to which I go', 'That which I choose to speak', 'The care I give my body temple'], 0, 'Associates are the people I choose to be with.'],
    ['“The care I give my ___ temple.”', ['body', 'church', 'home', 'school'], 0, '1 Corinthians 6:19: your body is the temple of the Holy Ghost.'],
    ['How many choices are in the AY Legion of Honour?', ['6', '10', '3', '7'], 0, 'Behold, listen, go, associates, speak, body temple.'],
    ['Which line is about music and what I hear?', ['That to which I choose to listen', 'That which I choose to behold', 'The choice of my associates', 'The care I give my body temple'], 0, 'Listen: music, shows and talk I let into my ears.'],
    ['Which verse fits “that which I choose to speak”?', ['Psalm 19:14: Let the words of my mouth… be acceptable in thy sight', 'Genesis 1:1: In the beginning God created', 'Exodus 20:8: Remember the sabbath day', 'Romans 6:23: The wages of sin is death'], 0, 'Psalm 19:14.'],
    ['“Your body is the temple of the Holy Ghost” is found in…', ['1 Corinthians 6:19', 'Psalm 23:1', 'Matthew 5:14', 'John 3:16'], 0, '1 Corinthians 6:19.'],
    ['What does it mean to honour Christ in my choices?', ['Choosing what Jesus would be happy to share with me', 'Doing whatever my friends do', 'Only thinking about it at church', 'Never making choices'], 0, 'Every choice can say “thank you” to Jesus.']
  ],
  fruit: [
    ['Where is the fruit of the Spirit listed?', ['Galatians 5:22–23', 'Genesis 5:22', 'John 3:16', 'Revelation 22:2'], 0, 'Galatians 5:22–23.'],
    ['How many fruits of the Spirit are listed?', ['9', '7', '12', '10'], 0, 'Love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.'],
    ['Which one is NOT a fruit of the Spirit?', ['Pride', 'Joy', 'Peace', 'Gentleness'], 0, 'Pride is a work of self, not a fruit of the Spirit.'],
    ['In the King James Version, “longsuffering” means…', ['Patience', 'Being sick for a long time', 'Running long distances', 'Being sad'], 0, 'Longsuffering = patience: slow to get angry.'],
    ['In the King James Version, “temperance” means…', ['Self-control', 'Hot weather', 'Anger', 'Being on time'], 0, 'Temperance = self-control.'],
    ['How does the fruit of the Spirit grow in us?', ['By staying connected to Jesus, like a branch on the vine', 'By trying harder on our own', 'Only when we are older', 'By memorising the list'], 0, 'John 15:5: I am the vine, ye are the branches.'],
    ['What is the difference between the fruit and the gifts of the Spirit?', ['Fruit is the character every Christian grows; gifts are different abilities given for service', 'They are exactly the same', 'Gifts are only for pastors', 'Fruit is only for children'], 0, 'Every Christian grows all of the fruit; the gifts are shared out differently (1 Corinthians 12).'],
    ['Sharing your lunch with someone who forgot theirs shows…', ['Kindness', 'Temperance', 'Faith', 'Peace'], 0, 'Kindness: doing good to others.']
  ],
  pioneers: [
    ['Which preacher taught, from Daniel 8:14, that Jesus would come around 1844?', ['William Miller', 'John Byington', 'J. N. Andrews', 'Uriah Smith'], 0, 'William Miller, a Baptist farmer-preacher from New York.'],
    ['What happened on 22 October 1844?', ['The Great Disappointment', 'The first General Conference session', 'The first missionary sailed to Europe', 'The church chose its name'], 0, 'Jesus did not come as expected, and believers wept.'],
    ['Who understood, while crossing a cornfield, that Jesus had begun a new work in the Most Holy Place?', ['Hiram Edson', 'Joseph Bates', 'James White', 'William Miller'], 0, 'Hiram Edson, on 23 October 1844.'],
    ['Which sea captain wrote a tract about the seventh-day Sabbath in 1846?', ['Joseph Bates', 'J. N. Andrews', 'Hiram Edson', 'John Byington'], 0, 'Joseph Bates.'],
    ['How old was Ellen Harmon (White) when she had her first vision in December 1844?', ['17', '12', '25', '40'], 0, 'She was 17.'],
    ['Who was the first president of the General Conference, in 1863?', ['John Byington', 'James White', 'William Miller', 'Joseph Bates'], 0, 'John Byington.'],
    ['Who was the first official Adventist missionary sent overseas, to Switzerland in 1874?', ['J. N. Andrews', 'Hiram Edson', 'William Miller', 'Joseph Bates'], 0, 'John Nevins Andrews.'],
    ['Which paper did James White start in 1849?', ['Present Truth', 'The Desire of Ages', 'Steps to Christ', 'The Great Controversy'], 0, 'Present Truth, the first Sabbatarian Adventist paper.']
  ],
  newstart: [
    ['What does the first T in NEWSTART stand for?', ['Temperance', 'Trust in God', 'Training', 'Time'], 0, 'N-E-W-S-T-A-R-T: the first T is Temperance.'],
    ['What does the last T in NEWSTART stand for?', ['Trust in God', 'Temperance', 'Talking', 'Television'], 0, 'Trust in God.'],
    ['Which law of health helps your body make vitamin D?', ['Sunlight', 'Water', 'Rest', 'Air'], 0, 'Sunlight on the skin makes vitamin D.'],
    ['About how many hours of sleep do teenagers need each night?', ['8 to 10', '4 to 5', '12 to 14', 'It does not matter'], 0, 'Teens need about 8–10 hours.'],
    ['Temperance means…', ['Using good things in moderation and avoiding harmful ones', 'Eating only once a day', 'Never exercising', 'Drinking lots of soda'], 0, 'Self-control with good things; saying no to harmful ones.'],
    ['Which verse says “Come ye yourselves apart… and rest a while”?', ['Mark 6:31', 'Genesis 1:29', 'Proverbs 3:5', 'John 10:10'], 0, 'Mark 6:31.'],
    ['What was God’s first diet for people in Genesis 1:29?', ['Seeds, fruits and plants', 'Only meat', 'Bread and milk', 'Fast food'], 0, 'Genesis 1:29.'],
    ['Breathing deeply outdoors, away from smoke, is the law of…', ['Air', 'Exercise', 'Water', 'Nutrition'], 0, 'Fresh air.']
  ],
  nutrition: [
    ['Which nutrient is the body’s main source of energy?', ['Carbohydrates', 'Minerals', 'Vitamins', 'Water'], 0, 'Carbohydrates: rice, bread, cassava, ground provisions.'],
    ['Which nutrient builds and repairs muscles and tissues?', ['Protein', 'Fat', 'Sugar', 'Water'], 0, 'Protein.'],
    ['Which is a good plant source of protein?', ['Beans and peas', 'White rice', 'Sugar-cane juice', 'Lettuce'], 0, 'Beans, peas, lentils, nuts and soy.'],
    ['Guavas, oranges and limes are rich in which vitamin?', ['Vitamin C', 'Vitamin D', 'Vitamin K', 'Vitamin B12'], 0, 'Vitamin C helps fight infection and heal cuts.'],
    ['Which mineral helps build strong bones and teeth?', ['Calcium', 'Iron', 'Sodium', 'Iodine'], 0, 'Calcium.'],
    ['On a healthy plate, about how much should be fruits and vegetables?', ['Half', 'None', 'A tenth', 'All of it'], 0, 'Half the plate: fruits and vegetables.'],
    ['On a food label, the ingredients are listed…', ['From the most to the least', 'In alphabetical order', 'From cheapest to dearest', 'In random order'], 0, 'The first ingredient is the one there is most of.'],
    ['What did Daniel ask to eat during his 10-day test?', ['Pulse (vegetables) and water', 'The king’s meat and wine', 'Only bread', 'Nothing at all'], 0, 'Daniel 1:12.']
  ],
  church: [
    ['What is the right order, starting from your own church?', ['Local church → Conference → Union → Division → General Conference', 'Local church → Division → Conference → Union → General Conference', 'General Conference → Local church → Union → Division → Conference', 'Conference → Local church → Division → Union → General Conference'], 0, 'Local church, Conference, Union, Division, General Conference.'],
    ['Which conference are our churches part of?', ['Guyana Conference', 'Florida Conference', 'South England Conference', 'Ghana Conference'], 0, 'Guyana Conference.'],
    ['Which union is the Guyana Conference part of?', ['Caribbean Union Conference', 'North American Union', 'Pacific Union Conference', 'East African Union'], 0, 'The Caribbean Union Conference.'],
    ['Which division are we in?', ['Inter-American Division', 'South American Division', 'North American Division', 'Trans-European Division'], 0, 'The Inter-American Division.'],
    ['Where is the Inter-American Division office?', ['Miami, Florida', 'Georgetown, Guyana', 'Silver Spring, Maryland', 'Kingston, Jamaica'], 0, 'Miami, Florida, the only division office outside its own territory.'],
    ['Where is the General Conference (world headquarters)?', ['Silver Spring, Maryland, USA', 'Miami, Florida', 'Battle Creek, Michigan', 'London, England'], 0, 'Silver Spring, Maryland. It began in Battle Creek in 1863.'],
    ['How many world divisions does the church have?', ['13', '5', '24', '100'], 0, '13 divisions, plus a few attached fields.'],
    ['How often is a General Conference Session held?', ['Every 5 years', 'Every year', 'Every 10 years', 'Every 50 years'], 0, 'Every five years, delegates from around the world meet.']
  ],
  ecology: [
    ['What is ecology?', ['The study of how living things relate to each other and their surroundings', 'The study of rocks', 'The study of the stars', 'The study of money'], 0, 'Eco = home. Ecology studies life in its home.'],
    ['In a food chain, green plants are called…', ['Producers', 'Consumers', 'Decomposers', 'Predators'], 0, 'Plants produce food from sunlight.'],
    ['Fungi and bacteria that break down dead things are…', ['Decomposers', 'Producers', 'Herbivores', 'Predators'], 0, 'Decomposers return nutrients to the soil.'],
    ['Water vapour cooling into clouds is called…', ['Condensation', 'Evaporation', 'Precipitation', 'Collection'], 0, 'Evaporation → condensation → precipitation → collection.'],
    ['A habitat is an animal’s…', ['Home or address', 'Job or role', 'Food', 'Enemy'], 0, 'Habitat = address; niche = job.'],
    ['What is the biggest threat to rainforest wildlife?', ['Habitat loss from cutting down forests', 'Too much rain', 'Too many plants', 'Moonlight'], 0, 'When the forest goes, the animals lose their homes.'],
    ['What do plants give off during photosynthesis?', ['Oxygen', 'Carbon dioxide', 'Smoke', 'Salt'], 0, 'Plants take in carbon dioxide and give off oxygen.'],
    ['Genesis 2:15 says God put Adam in the garden to…', ['Dress it and keep it', 'Leave it', 'Sell it', 'Burn it'], 0, 'We are God’s caretakers of the earth.']
  ],
  packcamp: [
    ['Where should the heaviest things go in a backpack?', ['Close to your back, in the middle', 'At the very top', 'In the outside pockets', 'Hanging off the bottom'], 0, 'Heavy items close to your back keep you balanced.'],
    ['Which of these belongs in every pack?', ['First-aid kit', 'Video game', 'Glass jar', 'Hair dryer'], 0, 'A first-aid kit is one of the essentials.'],
    ['Three blasts on a whistle means…', ['Help, I need help', 'Time to eat', 'All is well', 'Go to sleep'], 0, 'Three of anything (whistles, flashes) is a call for help.'],
    ['How can you make stream water safe to drink?', ['Boil it, filter it, or use purifying tablets', 'If it looks clear it is safe', 'Add sugar', 'Let it sit for 5 minutes'], 0, 'Clear water can still carry germs.'],
    ['Which shelter item is a must in Guyana’s interior?', ['A mosquito net', 'A snow shovel', 'Ski boots', 'An electric fan'], 0, 'Mosquitoes carry malaria and dengue.'],
    ['“Leave No Trace” means…', ['Leave the campsite as clean as you found it, or cleaner', 'Hide your tracks from the counsellor', 'Never take photos', 'Leave food out for animals'], 0, 'Take only pictures, leave only footprints.'],
    ['Your full pack should weigh no more than about…', ['A fifth of your body weight', 'Half your body weight', 'Your whole body weight', 'Twice your body weight'], 0, 'About 20% of your body weight.'],
    ['What should be easy to reach at the top of your pack?', ['Rain jacket, snacks and first-aid kit', 'Sleeping bag', 'Spare shoes', 'Your pillow'], 0, 'Things you may need quickly go on top.']
  ],
  fire: [
    ['What are the three sides of the fire triangle?', ['Heat, fuel and oxygen', 'Wood, water and wind', 'Matches, paper and smoke', 'Sun, sand and sticks'], 0, 'Take one away and the fire goes out.'],
    ['Dry grass, wood shavings and paper are called…', ['Tinder', 'Kindling', 'Fuel wood', 'Coals'], 0, 'Tinder catches the first spark or flame.'],
    ['Pencil-thick sticks that catch from the tinder are called…', ['Kindling', 'Tinder', 'Logs', 'Ash'], 0, 'Kindling.'],
    ['Which fire lay is best for long-lasting coals for cooking?', ['Log cabin', 'Teepee', 'Lean-to', 'No fire lay works'], 0, 'The log cabin burns down into a good bed of coals.'],
    ['Which fire lay burns hot and fast, good for boiling water quickly?', ['Teepee', 'Log cabin', 'Star', 'Reflector'], 0, 'The teepee.'],
    ['What should you always have nearby when you light a fire?', ['A bucket of water or sand', 'A can of fuel', 'Extra paper', 'A fan'], 0, 'Water or sand, ready before you strike the match.'],
    ['What is the right way to put out a campfire?', ['Drown it, stir it, drown it again, then feel for heat', 'Walk away when the flames are small', 'Cover it with leaves', 'Let it burn out by morning'], 0, 'Drown, stir, feel. If it is too hot to touch, it is too hot to leave.'],
    ['Food cooks best over…', ['Hot glowing coals', 'Tall flames', 'Wet wood', 'Smoke'], 0, 'Coals give steady heat; flames burn the outside.']
  ],
  lashing: [
    ['Which knot starts and finishes most lashings?', ['Clove hitch', 'Square knot', 'Bowline', 'Sheet bend'], 0, 'The clove hitch.'],
    ['Which lashing joins two poles that cross at a right angle?', ['Square lashing', 'Shear lashing', 'Round lashing', 'Tripod lashing'], 0, 'Square lashing.'],
    ['Which lashing starts with a timber hitch around both poles?', ['Diagonal lashing', 'Square lashing', 'Round lashing', 'Shear lashing'], 0, 'Diagonal lashing.'],
    ['Which lashing joins two poles to make one longer pole?', ['Round lashing', 'Diagonal lashing', 'Square lashing', 'Tripod lashing'], 0, 'Round lashing (use two of them).'],
    ['Turns that go between the poles to tighten the lashing are called…', ['Frapping turns', 'Wrapping turns', 'Clove turns', 'Timber turns'], 0, 'Frapping turns pull the wraps tight.'],
    ['Which lashing makes an A-frame (sheer legs)?', ['Shear lashing', 'Square lashing', 'Round lashing', 'Diagonal lashing'], 0, 'Shear lashing.'],
    ['Which lashing holds three poles for a camp stand or cooking tripod?', ['Tripod lashing', 'Square lashing', 'Round lashing', 'Diagonal lashing'], 0, 'Tripod lashing.'],
    ['Which knot joins two ropes of the same size?', ['Square (reef) knot', 'Clove hitch', 'Timber hitch', 'Half hitch'], 0, 'Right over left, left over right.']
  ],
  orienteering: [
    ['On an orienteering map, what does blue show?', ['Water', 'Open land', 'Rocks and paths', 'Thick bushes'], 0, 'Blue = water.'],
    ['Brown lines that show the shape of the land are…', ['Contour lines', 'Paths', 'Rivers', 'Fences'], 0, 'Contour lines join points of the same height.'],
    ['Contour lines very close together mean the ground is…', ['Steep', 'Flat', 'Wet', 'Sandy'], 0, 'Close lines = steep; far apart = gentle.'],
    ['Which direction is 90°?', ['East', 'North', 'South', 'West'], 0, 'N 0°, E 90°, S 180°, W 270°.'],
    ['What bearing is south-west?', ['225°', '135°', '315°', '45°'], 0, 'SW is halfway between S (180°) and W (270°).'],
    ['Which end of the compass needle points north?', ['The red end', 'The white end', 'Either end', 'Neither; it points south'], 0, 'Red points north.'],
    ['On a 1:10,000 map, 1 cm on the map is…', ['100 metres on the ground', '10 metres', '1 kilometre', '1 metre'], 0, '10,000 cm = 100 m.'],
    ['When you follow a bearing, you keep the red needle…', ['Inside the orienting arrow (“red in the shed”)', 'Pointing at your feet', 'On the direction-of-travel arrow', 'Outside the compass'], 0, 'Red in the shed, then walk where the travel arrow points.']
  ]
};

function topicList_() {
  return Object.keys(TOPICS).map(function (k) { return { id: k, name: TOPICS[k].name, code: TOPICS[k].code, cards: TOPICS[k].cards }; });
}

/** One-time upgrade of older sheets: adds the Topic column and the Learning Lab questions. */
function ensureLearn_() {
  var q = sheet_(SHEET_Q);
  if (String(q.getRange(1, 10).getValue()) === 'Topic') { ensureTopics_(); return; }
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (String(q.getRange(1, 10).getValue()) === 'Topic') return;
    var last = q.getLastRow();
    if (last >= 2) q.getRange(2, 10, last - 1, 1).setValue('sanctuary');
    Object.keys(TOPIC_QUESTIONS).forEach(function (k) { seedQuestions_(q, k); });
    q.getRange(1, 10).setValue('Topic').setFontWeight('bold').setBackground('#2B4C8C').setFontColor('#FFFFFF');
    formatQuestions_(q);
    var c = sheet_(SHEET_CH);
    if (c.getLastRow() === 0) setupChallenge_();
    var cl = c.getLastRow();
    if (cl >= 2) c.getRange(2, 10, cl - 1, 1).setValue('sanctuary');
    c.getRange(1, 10).setValue('Topic').setFontWeight('bold').setBackground('#2B4C8C').setFontColor('#FFFFFF');
  } finally { lock.releaseLock(); }
}

/** Where the explorer's back button goes: the mission, the Quest Map, the Learning Lab, or home. */
function backInfo_(p, t, base) {
  if (!t || !base) return { url: '', label: '' };
  var from = String(p.from || ''), f = CODES.indexOf(String(p.f || '')) > -1 ? String(p.f) : '';
  var m = MISSIONS.filter(function (x) { return x.id === from; })[0];
  var url = base + '?t=' + t;
  if (m) return { url: url + '&v=' + m.id + (f ? '&f=' + f : ''), label: 'Back to ' + m.label.split(' · ')[0] };
  if (from === 'map') return { url: url + '&v=map' + (f ? '&f=' + f : ''), label: 'Back to the Quest Map' };
  if (from === 'adv') return { url: url + '&v=adv', label: 'Back to Advanced' };
  if (from === 'lab') return { url: url + '&p=learn', label: 'Back to the Learning Lab' };
  return { url: url, label: 'Back to my missions' };
}

/** For each token: { topic: number of lesson cards opened } */
function seenSummary_() {
  var a = sheet_(SHEET_ANS), last = a.getLastRow(), out = {};
  if (last < 2) return out;
  a.getRange(2, 4, last - 1, 4).getValues().forEach(function (r) { // Answer, Updated, Token, Key
    var key = String(r[3]), m = key.match(/^[A-Z]{1,2}\d\.([a-z]+)Seen$/);
    if (!m || !TOPICS[m[1]]) return;
    var n = 0; try { n = JSON.parse(r[0]).length; } catch (err) {}
    (out[String(r[2])] || (out[String(r[2])] = {}))[m[1]] = n;
  });
  return out;
}

function learnState_(t, d) {
  var seen = {}, best = {};
  if (d) {
    Object.keys(TOPICS).forEach(function (k) {
      var v = k === 'sanctuary' ? d.f['SD2.visited'] : d.f[TOPICS[k].code + '.' + k + 'Seen'];
      if (Array.isArray(v)) seen[k] = v;
    });
    var sum = challengeSummary_()[t] || {};
    Object.keys(sum).forEach(function (k) { best[k] = { best: sum[k].best, total: sum[k].last ? sum[k].last.total : 0 }; });
  }
  return { seen: seen, best: best, gp: d ? gemsMine_(d.f) : { picked: [], learned: [] } };
}

function learnPage_(p, data, t, base, back) {
  var tpl = HtmlService.createTemplateFromFile('Learn');
  var topic = (TOPICS[p.k] && p.k !== 'sanctuary') || p.k === 'gems' ? String(p.k) : '';
  var st = learnState_(t, data);
  tpl.boot = JSON.stringify({
    gems: gemsRead_().list, gp: st.gp,
    token: data ? t : '', name: data ? data.name : '', base: base, join: !data, topic: topic,
    back: back.url, backLabel: back.label, from: String(p.from || ''), read: READINGS_.indexOf(String(p.r || '')) > -1 ? String(p.r) : '', rch: Math.max(0, Math.min(20, Number(p.ch) || 0)),
    topics: topicList_(), seen: st.seen, best: st.best,
    questions: readQuestions_(true).filter(function (q) { return q.topic !== 'sanctuary'; })
  }).replace(/</g, '\\u003c');
  return tpl.evaluate()
    .setTitle(topic === 'gems' ? 'Memory Gems · Learning Lab' : topic ? TOPICS[topic].name + ' · Learning Lab' : 'Guide Learning Lab')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** The Learning Lab checks a remembered token (class link). */
function l_whoami(t) {
  t = cleanToken_(t);
  var d = t ? questData_(t) : null;
  if (!d) throw new Error('link-not-found');
  var st = learnState_(t, d);
  return { token: t, name: d.name, seen: st.seen, best: st.best, gp: st.gp };
}
function l_join(name) { var me = s_join(name); return l_whoami(me.token); }

/** Lesson cards a Guide has opened in one explorer. */
function l_visit(t, topic, list) {
  t = cleanToken_(t);
  var T = TOPICS[topic];
  if (!T || topic === 'sanctuary') throw new Error('bad-request');
  list = (Array.isArray(list) ? list : []).map(function (x) { return String(x).replace(/[^\w-]/g, '').slice(0, 30); })
    .filter(function (x, i, a) { return x && a.indexOf(x) === i; }).slice(0, 40);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet_(SHEET_PF), row = findRow_(sh, t);
    if (row < 0) throw new Error('link-not-found');
    var name = String(sh.getRange(row, COL_NAME).getValue()).trim();
    upsertAnswer_(t, name, T.code + '.' + topic + 'Seen', T.name + ': lesson cards opened', JSON.stringify(list));
    sh.getRange(row, COL_UPDATED).setValue(new Date());
    return { ok: true, count: list.length };
  } finally { lock.releaseLock(); }
}

/** A finished explorer challenge. */
function l_submit(t, topic, attempt) {
  t = cleanToken_(t);
  var T = TOPICS[topic];
  if (!T || topic === 'sanctuary') throw new Error('bad-request');
  var ans = cleanAnswers_(attempt && attempt.answers);
  if (!ans.length) throw new Error('bad-request');
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet_(SHEET_PF), row = findRow_(sh, t);
    if (row < 0) throw new Error('link-not-found');
    var name = String(sh.getRange(row, COL_NAME).getValue()).trim();
    var c = sheet_(SHEET_CH);
    if (c.getLastRow() === 0) setupChallenge_();
    var score = effectiveScore_(ans), id = 'a' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    c.appendRow([new Date(), name, score, ans.length, score, missedSummary_(ans), id, t, JSON.stringify(ans), topic]);
    sh.getRange(row, COL_UPDATED).setValue(new Date());
    var best = recomputeBest_(t, topic);
    log_(name, T.name + ' challenge: ' + score + '/' + ans.length);
    return { ok: true, score: score, best: best };
  } finally { lock.releaseLock(); }
}

/* ======================================================================
 * MEETINGS, NOTES, ADVANCED AND THE EVALUATION DATE (counsellors only)
 * Meetings: each class meeting with who came; saving one can tick the
 * requirements it covered for everyone present.
 * Counsellor notes: private notes and the Advanced checklist per Guide.
 * ==================================================================== */
var SHEET_MEET = 'Meetings', SHEET_XTRA = 'Counsellor notes';
var EVAL_PROP = 'GQ_EVAL_DATE';

function sheetIf_(name) { return SpreadsheetApp.getActive().getSheetByName(name); }

function setupMeetings_() {
  var s = sheet_(SHEET_MEET);
  s.getRange(1, 1, 1, 9).setValues([['Date', 'What we did', 'Requirements covered', 'Present', 'Notes', 'Logged by', 'Saved', 'Meeting ID', 'Present (links)']])
    .setFontWeight('bold').setBackground('#1F4D3A').setFontColor('#FFFFFF');
  s.setFrozenRows(1);
  s.getRange('A:A').setNumberFormat('d mmm yyyy');
  s.getRange('G:G').setNumberFormat('d mmm, h:mm am/pm');
  s.getRange('B:E').setWrap(true);
  s.setColumnWidth(1, 110); s.setColumnWidth(2, 260); s.setColumnWidth(3, 170); s.setColumnWidth(4, 300); s.setColumnWidth(5, 220);
  s.hideColumns(8, 2);
}




function meetingsRead_() {
  var s = sheetIf_(SHEET_MEET), out = [];
  if (!s || s.getLastRow() < 2) return out;
  s.getRange(2, 1, s.getLastRow() - 1, 9).getValues().forEach(function (r, i) {
    var id = String(r[7]); if (!id) return;
    var d = r[0] instanceof Date ? Utilities.formatDate(r[0], tz_(), 'yyyy-MM-dd') : String(r[0]).slice(0, 10);
    out.push({ id: id, row: i + 2, date: d, title: String(r[1]),
      codes: String(r[2]).split(/[,\s]+/).filter(function (c) { return CODES.indexOf(c) > -1; }),
      names: String(r[3]), notes: String(r[4]), by: String(r[5]),
      present: String(r[8]).split(',').filter(Boolean) });
  });
  out.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.row - a.row; });
  return out;
}

function c_meetings(pin) {
  checkPin_(pin);
  return meetingsRead_().map(function (m) { delete m.row; return m; });
}

/** Logs a class meeting. With tick on, it ticks the covered requirements for every Guide who came. */
function c_saveMeeting(pin, m, who) {
  checkPin_(pin);
  m = m || {};
  var dm = String(m.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dm) throw new Error('bad-date');
  var title = String(m.title || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!title) throw new Error('no-title');
  var codes = (Array.isArray(m.codes) ? m.codes : []).map(String).filter(function (c, i, a) { return CODES.indexOf(c) > -1 && a.indexOf(c) === i; });
  var want = (Array.isArray(m.present) ? m.present : []).map(cleanToken_).filter(function (t, i, a) { return t && a.indexOf(t) === i; });
  var tick = m.tick !== false;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_(SHEET_PF), last = sh.getLastRow(), names = [], toks = [], ticked = 0, people = 0, now = new Date();
    if (last >= FIRST_ROW) {
      var n = last - FIRST_ROW + 1;
      var tk = sh.getRange(FIRST_ROW, COL_TOKEN, n, 1).getValues();
      var nm = sh.getRange(FIRST_ROW, COL_NAME, n, 1).getValues();
      var req = sh.getRange(FIRST_ROW, COL_REQ0, n, CODES.length).getValues();
      for (var i = 0; i < n; i++) {
        var t = String(tk[i][0]), name = String(nm[i][0]).trim();
        if (!t || !name || want.indexOf(t) < 0) continue;
        names.push(name); toks.push(t);
        if (!tick || !codes.length) continue;
        var changed = [], mday = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), 12);
        codes.forEach(function (c) { var k = CODES.indexOf(c); if (k > -1 && req[i][k] !== true) { sh.getRange(FIRST_ROW + i, COL_REQ0 + k).setValue(true); changed.push(c); tickDate_(t, name, c, who_(who), mday); } });
        if (changed.length) {
          sh.getRange(FIRST_ROW + i, COL_UPDATED).setValue(now);
          log_(name, who_(who) + ' ticked ' + changed.join(', ') + ' (meeting: ' + title + ')');
          ticked += changed.length; people++;
        }
      }
    }
    var s = sheet_(SHEET_MEET);
    if (s.getLastRow() === 0) setupMeetings_();
    var id = 'mt' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    var d = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), 12);
    s.appendRow([d, safe_(title), codes.join(', '), safe_(names.join(', ')), safe_(String(m.notes || '').replace(/\s+/g, ' ').trim().slice(0, 1000)), who_(who), now, id, toks.join(',')]);
    log_('Class', who_(who) + ' logged a meeting: ' + title + (codes.length ? ' (' + codes.join(', ') + ')' : '') + ' · ' + names.length + ' came'
      + (ticked ? ' · ticked ' + ticked + ' box' + (ticked === 1 ? '' : 'es') + ' for ' + people + ' Guide' + (people === 1 ? '' : 's') : ''));
    SpreadsheetApp.flush();
    return { ok: true, id: id, present: names.length, ticked: ticked, people: people };
  } finally { lock.releaseLock(); }
}

/** Deletes a meeting record. Requirements it ticked stay ticked. */
function c_deleteMeeting(pin, id, who) {
  checkPin_(pin);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var m = meetingsRead_().filter(function (x) { return x.id === String(id); })[0];
    if (!m) throw new Error('not-found');
    sheet_(SHEET_MEET).deleteRow(m.row);
    log_('Class', who_(who) + ' deleted the meeting record “' + m.title + '” (' + m.date + ')');
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function attendance_(meets) {
  var out = {};
  meets.forEach(function (m) { m.present.forEach(function (t) { out[t] = (out[t] || 0) + 1; }); });
  return out;
}

function evalDate_() { return String(PropertiesService.getScriptProperties().getProperty(EVAL_PROP) || ''); }

function c_setEvalDate(pin, date, who) {
  checkPin_(pin);
  date = String(date || '').trim();
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('bad-date');
  var p = PropertiesService.getScriptProperties();
  if (date) p.setProperty(EVAL_PROP, date); else p.deleteProperty(EVAL_PROP);
  log_('Class', who_(who) + (date ? ' set the evaluation date to ' + date : ' cleared the evaluation date'));
  return { ok: true, evalDate: date };
}


/* ======================================================================
 * VERSION 13
 * - The website on GitHub Pages talks to this script through doPost.
 * - Advanced (the six items from the Guide curriculum).
 * - Photo evidence, record sheets, the programme planner, parent links,
 *   and a weekly backup of this Sheet.
 * ==================================================================== */
var SITE = 'https://shaquanbrowne17-sys.github.io/guide-quest/';
var API_BASE_ = '';
var SHEET_EV = 'Evidence', SHEET_DATES = 'Completed dates', SHEET_PROG = 'Programme', SHEET_PAR = 'Parent links';

/* ---------- the website's connection ---------- */
var API_FNS = { getQuest: 1, sync: 1, s_join: 1, s_whoami: 1, s_visit: 1, s_submit: 1, l_whoami: 1, l_join: 1, l_visit: 1, l_submit: 1,
  api_boot: 1, p_photos: 1, p_photo: 1, p_addPhoto: 1, p_deletePhoto: 1, parent_view: 1, parent_photo: 1, l_game: 1, l_top: 1 };

function apiGlobal_() { return typeof globalThis !== 'undefined' ? globalThis : this; }

/** Every page on the website calls this. Body: {fn, args, base}. Counsellor functions (c_…) check the PIN themselves. */
function doPost(e) {
  var out;
  try {
    ANS_IDX_ = null;
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var fn = String(body.fn || ''), g = apiGlobal_();
    if (body.base === SITE) API_BASE_ = SITE;
    if (!(API_FNS[fn] === 1 || /^c_[A-Za-z]+$/.test(fn)) || typeof g[fn] !== 'function') throw new Error('bad-request');
    var res = g[fn].apply(null, Array.isArray(body.args) ? body.args : []);
    out = { ok: true, result: res === undefined ? null : res };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** The page data each screen needs, for the website (the same data doGet puts into the Google pages). */
function api_boot(q) {
  q = q || {};
  var p = {};
  ['t', 'p', 'k', 'v', 'f', 'from', 'c', 'parent', 'r', 'ch'].forEach(function (k) { if (q[k] != null) p[k] = String(q[k]).slice(0, 80); });
  ensureSetup_();
  if (API_BASE_ === SITE) {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('GQ_MOVED') !== '1') props.setProperty('GQ_MOVED', '1');
  }
  var b = bootFor_(p);
  return { page: b.page, boot: b.boot, title: b.title };
}

/** Works out which page to show and its data. Used by doGet (Google pages) and api_boot (website). */
function bootFor_(p) {
  if ('c' in p) return { page: 'Counsellor', boot: null, title: 'Guide Quest · Counsellors' };
  if (p.parent) return { page: 'Parent', boot: { key: String(p.parent).replace(/[^a-f0-9]/gi, '').slice(0, 40), base: baseUrl_() }, title: 'Guide Quest · Parents' };
  var t = cleanToken_(p.t), data = null;
  if (t) { try { data = questData_(t); } catch (err) { data = null; } }
  var base = baseUrl_();
  ensureLearn_();
  var back = backInfo_(p, data ? t : '', base);
  if (p.p === 'learn') {
    var topic = (TOPICS[p.k] && p.k !== 'sanctuary') || p.k === 'gems' ? String(p.k) : '';
    var st = learnState_(t, data);
    return { page: 'Learn', title: topic === 'gems' ? 'Memory Gems · Learning Lab' : topic ? TOPICS[topic].name + ' · Learning Lab' : 'Guide Learning Lab', boot: {
      gems: gemsRead_().list, gp: st.gp,
      token: data ? t : '', name: data ? data.name : '', base: base, join: !data, topic: topic,
      back: back.url, backLabel: back.label, from: String(p.from || ''), read: READINGS_.indexOf(String(p.r || '')) > -1 ? String(p.r) : '', rch: Math.max(0, Math.min(20, Number(p.ch) || 0)),
      topics: topicList_(), seen: st.seen, best: st.best,
      questions: readQuestions_(true).filter(function (x) { return x.topic !== 'sanctuary'; }) } };
  }
  if (p.p === 's') {
    var visited = data && Array.isArray(data.f['SD2.visited']) ? data.f['SD2.visited'] : [];
    return { page: 'Sanctuary', title: 'Sanctuary Explorer', boot: {
      token: data ? t : '', name: data ? data.name : '', base: base, join: !data, back: back.url, backLabel: back.label,
      questions: readQuestions_(true, 'sanctuary'), visited: visited, best: data ? data.best : 0 } };
  }
  var view = String(p.v || ''), focus = CODES.concat(ADVC).indexOf(String(p.f || '')) > -1 ? String(p.f) : '';
  if (view !== 'map' && view !== 'adv' && !MISSIONS.some(function (m) { return m.id === view; })) view = '';
  return { page: 'Index', title: 'Guide Quest', boot: { token: data ? t : '', data: data, base: base, view: view, focus: focus, topics: topicList_(), asked: !!t } };
}

/** After the website has opened once, the old Google links show a page pointing to the website. ?old=1 still opens the old page. */
function movedPage_(p) {
  var q = [];
  Object.keys(p).forEach(function (k) { if (k !== 'old' && /^[a-z]{1,8}$/.test(k)) q.push(k + '=' + encodeURIComponent(String(p[k]).slice(0, 80))); });
  var url = SITE + (q.length ? '?' + q.join('&') : '');
  var safe = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  var html = '<!doctype html><html><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<style>body{margin:0;font:17px/1.5 system-ui,sans-serif;background:#F4F1EA;color:#1C2A22;display:grid;place-items:center;min-height:100vh}'
    + '.c{max-width:420px;margin:24px;padding:28px;background:#fff;border-radius:22px;box-shadow:0 2px 14px rgba(0,0,0,.08);text-align:center}'
    + 'h1{font-size:24px;margin:0 0 8px}a.b{display:block;margin:20px 0 12px;padding:15px;border-radius:14px;background:#1F4D3A;color:#fff;font-weight:800;text-decoration:none}'
    + 'small{color:#5C6A61;word-break:break-all}@media(prefers-color-scheme:dark){body{background:#101712;color:#E7EEE9}.c{background:#18231C}small{color:#9DB0A4}a.b{background:#7FD3A6;color:#0E1A13}}</style></head>'
    + '<body><div class="c"><h1>Guide Quest has a new link</h1><p>It opens in any browser, even with more than one Google account, and saves your work.</p>'
    + '<a class="b" href="' + safe + '">Open Guide Quest</a><small>Save this new link: ' + safe + '</small></div>'
    + '<scr' + 'ipt>try{window.top.location.replace(' + JSON.stringify(url) + ')}catch(e){}</scr' + 'ipt></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Guide Quest').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------- Advanced ---------- */
var ADVC = ['AV1', 'AV2', 'AV3', 'AV4', 'AV5', 'AV6'];
var ADV_INFO = {
  AV1: { sec: 'G', name: 'Stewardship Honour', req: 'Complete the Stewardship Honour.' },
  AV2: { sec: 'SD', name: 'Steps to Christ', req: 'Read Steps to Christ and write a one-page report or essay.' },
  AV3: { sec: 'CO', name: 'Outreach', req: 'Bring 2 friends to at least 2 meetings sponsored by your church, or help plan and take part in at least 4 youth evangelism (or similar) meetings.' },
  AV4: { sec: 'FD', name: 'Making and keeping friends', req: 'Write at least 750 words, or give a talk of at least 10 minutes, on how to make and keep friends.' },
  AV5: { sec: 'HF', name: 'God’s plan for sexuality', req: 'Take part in a study of God’s plan for sexual behaviour, including the facts about AIDS and other sexually transmitted infections.' },
  AV6: { sec: 'OD', name: 'Wilderness Master Award', req: 'Complete the Wilderness Master Award.' }
};
var ADV_LONG = { 'AV2.report': 1, 'AV4.essay': 1, 'AV4.outline': 1, 'AV5.reflect': 1, 'AV1.project': 1, 'HF2.atext': 1, 'OD1.prelog': 1, 'OD1.postlog': 1 };

/** Writes one Answers row (one key for one Guide). */
function ansSet_(t, name, code, key, label, val) {
  var a = sheet_(SHEET_ANS);
  if (a.getLastRow() === 0) setupAnswers_();
  var last = a.getLastRow(), row = -1;
  if (last >= 2) {
    var tk = a.getRange(2, 6, last - 1, 2).getValues();
    for (var j = 0; j < tk.length; j++) if (String(tk[j][0]) === t && String(tk[j][1]) === key) { row = j + 2; break; }
  }
  if (row > 0) a.getRange(row, 1, 1, 5).setValues([[name, code, label, val, new Date()]]);
  else a.appendRow([name, code, label, val, new Date(), t, key]);
}

/** {token: {AV1: {done: true, sign: 'JB · 3 Dec 2026'}, …}} */
function advSummary_() {
  var a = sheet_(SHEET_ANS), last = a.getLastRow(), out = {};
  if (last < 2) return out;
  a.getRange(2, 4, last - 1, 4).getValues().forEach(function (r) { // Answer, Updated, Token, Key
    var m = String(r[3]).match(/^(AV\d)\.(done|sign)$/);
    if (!m || ADVC.indexOf(m[1]) < 0) return;
    var g = out[String(r[2])] || (out[String(r[2])] = {}), x = g[m[1]] || (g[m[1]] = { done: false, sign: '' });
    if (m[2] === 'done') x.done = String(r[0]) === 'yes'; else x.sign = String(r[0] || '');
  });
  return out;
}

/** Counsellor signs off (or un-signs) one Advanced item. */
function c_advSign(pin, t, code, on, who) {
  if (ADVC.indexOf(String(code)) < 0) throw new Error('bad-code');
  return withRow_(pin, t, function (sh, row, name) {
    var text = on ? who_(who) + ' · ' + Utilities.formatDate(new Date(), tz_(), 'd MMM yyyy') : '';
    ansSet_(cleanToken_(t), name, code, code + '.sign', 'Advanced sign-off · ' + ADV_INFO[code].name, text);
    log_(name, who_(who) + (on ? ' signed off Advanced: ' : ' removed the sign-off for Advanced: ') + ADV_INFO[code].name);
    return { ok: true, sign: text };
  });
}

/* ---------- counsellor notes (now notes only; Advanced moved to the Advanced items above) ---------- */
function xtCols_(s) {
  var head = s.getRange(1, 1, 1, 20).getValues()[0].map(function (h) { return String(h).trim(); });
  var c = { note: head.indexOf('Notes') + 1, updated: head.indexOf('Updated') + 1, by: head.indexOf('By') + 1, token: head.indexOf('Token') + 1 };
  c.width = Math.max(c.note, c.updated, c.by, c.token, 1);
  return c;
}

/* ---------- photo evidence ---------- */
function folderProp_(prop, name, parent) {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty(prop);
  if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (err) {} }
  var folder = parent ? parent.createFolder(name) : DriveApp.createFolder(name);
  props.setProperty(prop, folder.getId());
  return folder;
}
function evFolder_() { return folderProp_('GQ_EV_FOLDER', 'Guide Quest photos (evidence)'); }
function evPreviewFolder_() { return folderProp_('GQ_EV_PREVIEWS', 'Previews (small copies for the app)', evFolder_()); }

function setupEvidence_() {
  var s = sheet_(SHEET_EV);
  s.getRange(1, 1, 1, 9).setValues([['Date', 'Pathfinder', 'Requirement', 'Caption', 'Photo', 'Preview', 'Added by', 'Photo ID', 'Token']])
    .setFontWeight('bold').setBackground('#7A4A12').setFontColor('#FFFFFF');
  s.setFrozenRows(1);
  s.getRange('A:A').setNumberFormat('d mmm yyyy, h:mm am/pm');
  s.setColumnWidth(2, 170); s.setColumnWidth(4, 260);
  s.hideColumns(6, 4);
}

function evRows_() {
  var s = sheetIf_(SHEET_EV), out = [];
  if (!s || s.getLastRow() < 2) return out;
  s.getRange(2, 1, s.getLastRow() - 1, 9).getValues().forEach(function (r, i) {
    if (!String(r[7])) return;
    out.push({ row: i + 2, date: r[0] instanceof Date ? r[0].getTime() : 0, name: String(r[1]), code: String(r[2]), caption: String(r[3]),
      file: String(r[4]).replace(/^.*\/d\/([^/]+).*$/, '$1'), preview: String(r[5]), by: String(r[6]), id: String(r[7]), t: String(r[8]) });
  });
  return out;
}
function evPublic_(x) { return { id: x.id, code: x.code, caption: x.caption, date: x.date, by: x.by }; }

/** ph = {data: base64 of the original photo, mime, preview: base64 JPEG for the app, caption} */
function addPhoto_(t, name, code, ph, by) {
  code = String(code || '');
  if (CODES.indexOf(code) < 0 && ADVC.indexOf(code) < 0) throw new Error('bad-code');
  ph = ph || {};
  var mime = String(ph.mime || 'image/jpeg');
  if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(mime)) throw new Error('not-a-photo');
  var data = String(ph.data || '').replace(/^data:[^,]*,/, ''), prev = String(ph.preview || '').replace(/^data:[^,]*,/, '');
  if (!data || data.length > 20000000) throw new Error('too-big');
  if (prev.length > 1500000) prev = '';
  var mine = evRows_().filter(function (x) { return x.t === t && x.code === code; });
  if (mine.length >= 8) throw new Error('photo-limit');
  var id = 'ph' + Utilities.getUuid().replace(/-/g, '').slice(0, 14);
  var stamp = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  var ext = mime.split('/')[1].replace('jpeg', 'jpg');
  var fname = String(name).replace(/[^\w .'-]/g, '').slice(0, 40) + ' · ' + code + ' · ' + stamp + ' · ' + id.slice(2, 8) + '.' + ext;
  var file = evFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(data), mime, fname));
  var pid = '';
  if (prev) pid = evPreviewFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(prev), 'image/jpeg', 'preview ' + fname.replace(/\.\w+$/, '.jpg'))).getId();
  var s = sheet_(SHEET_EV);
  if (s.getLastRow() === 0) setupEvidence_();
  var caption = safe_(String(ph.caption || '').replace(/\s+/g, ' ').trim().slice(0, 200));
  s.appendRow([new Date(), name, code, caption, 'https://drive.google.com/file/d/' + file.getId() + '/view', pid, by, id, t]);
  log_(name, by + ' added a photo for ' + code);
  return { id: id, code: code, caption: caption, date: Date.now(), by: by };
}

function photoData_(x) {
  var fid = x.preview || x.file, blob;
  try { blob = DriveApp.getFileById(fid).getBlob(); } catch (err) { throw new Error('photo-missing'); }
  var type = blob.getContentType() || 'image/jpeg';
  if (!x.preview && blob.getBytes().length > 4000000) throw new Error('photo-too-big-to-show');
  return { id: x.id, data: 'data:' + type + ';base64,' + Utilities.base64Encode(blob.getBytes()), url: 'https://drive.google.com/file/d/' + x.file + '/view' };
}
function removePhoto_(x) {
  [x.file, x.preview].forEach(function (fid) { if (fid) { try { DriveApp.getFileById(fid).setTrashed(true); } catch (err) {} } });
  sheet_(SHEET_EV).deleteRow(x.row);
}
function guideByToken_(t) {
  t = cleanToken_(t);
  var d = t ? questData_(t, true) : null;
  if (!d) throw new Error('link-not-found');
  return { t: t, name: d.name };
}

function p_photos(t) { var g = guideByToken_(t); return evRows_().filter(function (x) { return x.t === g.t; }).map(evPublic_); }
function p_photo(t, id) {
  var g = guideByToken_(t), x = evRows_().filter(function (r) { return r.id === String(id) && r.t === g.t; })[0];
  if (!x) throw new Error('not-found');
  return photoData_(x);
}
function p_addPhoto(t, code, ph) {
  var g = guideByToken_(t);
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try { return addPhoto_(g.t, g.name, code, ph, 'Pathfinder'); } finally { lock.releaseLock(); }
}
/** A Pathfinder can remove photos they added themselves. */
function p_deletePhoto(t, id) {
  var g = guideByToken_(t);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var x = evRows_().filter(function (r) { return r.id === String(id) && r.t === g.t; })[0];
    if (!x) throw new Error('not-found');
    if (x.by !== 'Pathfinder') throw new Error('counsellor-photo');
    removePhoto_(x); log_(g.name, 'Removed a photo from ' + x.code);
    return { ok: true };
  } finally { lock.releaseLock(); }
}
function c_photos(pin, t) {
  checkPin_(pin); t = cleanToken_(t);
  return evRows_().filter(function (x) { return !t || x.t === t; }).map(function (x) { var o = evPublic_(x); o.t = x.t; o.url = 'https://drive.google.com/file/d/' + x.file + '/view'; return o; });
}
function c_photo(pin, id) {
  checkPin_(pin);
  var x = evRows_().filter(function (r) { return r.id === String(id); })[0];
  if (!x) throw new Error('not-found');
  return photoData_(x);
}
function c_addPhoto(pin, t, code, ph, who) {
  return withRow_(pin, t, function (sh, row, name) { return addPhoto_(cleanToken_(t), name, code, ph, who_(who)); });
}
function c_deletePhoto(pin, id, who) {
  checkPin_(pin);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var x = evRows_().filter(function (r) { return r.id === String(id); })[0];
    if (!x) throw new Error('not-found');
    removePhoto_(x); log_(x.name, who_(who) + ' removed a photo from ' + x.code);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ---------- the date each requirement was completed (for the record sheet) ---------- */
function setupDates_() {
  var s = sheet_(SHEET_DATES);
  s.getRange(1, 1, 1, 5).setValues([['Pathfinder', 'Requirement', 'Completed', 'Ticked by', 'Token']]).setFontWeight('bold').setBackground('#1F4D3A').setFontColor('#FFFFFF');
  s.setFrozenRows(1); s.getRange('C:C').setNumberFormat('d mmm yyyy'); s.hideColumns(5);
}
/** Records when a requirement was ticked (only when it is ticked on). */
function tickDate_(t, name, code, by, when) {
  try {
    var s = sheet_(SHEET_DATES);
    if (s.getLastRow() === 0) setupDates_();
    var last = s.getLastRow(), row = -1;
    if (last >= 2) {
      var v = s.getRange(2, 2, last - 1, 4).getValues();
      for (var i = 0; i < v.length; i++) if (String(v[i][3]) === t && String(v[i][0]) === code) { row = i + 2; break; }
    }
    var vals = [[name, code, when || new Date(), by]];
    if (row > 0) s.getRange(row, 1, 1, 4).setValues(vals); else s.appendRow([name, code, when || new Date(), by, t]);
  } catch (err) { /* never block a tick */ }
  if (by !== 'Pathfinder') claimClear_(t, code);
}
/** {token: {code: {date: ms, by}}}; falls back to the Activity log for ticks made before Version 13. */
function tickDates_() {
  var out = {}, s = sheetIf_(SHEET_DATES);
  if (s && s.getLastRow() >= 2) s.getRange(2, 1, s.getLastRow() - 1, 5).getValues().forEach(function (r) {
    if (!(r[2] instanceof Date)) return;
    (out[String(r[4])] || (out[String(r[4])] = {}))[String(r[1])] = { date: r[2].getTime(), by: String(r[3]) };
  });
  return out;
}
function logDates_(name) {
  var s = sheetIf_(SHEET_LOG), out = {};
  if (!s || s.getLastRow() < 2) return out;
  var key = String(name).toLowerCase();
  s.getRange(2, 1, s.getLastRow() - 1, 3).getValues().forEach(function (r) {
    if (String(r[1]).toLowerCase() !== key || !(r[0] instanceof Date)) return;
    var w = String(r[2]), m = w.match(/^Completed ([A-Z]{1,2}\d)\b/), by = 'Pathfinder', codes = [];
    if (m) codes = [m[1]];
    else {
      var m2 = w.match(/^(.*?) (?:via assistant )?ticked ((?:[A-Z]{1,2}\d(?:, )?)+)/);
      if (m2) { by = m2[1].replace(/ via assistant$/, ''); codes = m2[2].split(/,\s*/); }
    }
    codes.forEach(function (c) { if (CODES.indexOf(c) > -1) out[c] = { date: r[0].getTime(), by: by }; });
  });
  return out;
}

/* ---------- record sheet settings ---------- */
var RECORD_DEFAULT = { club: '', titles: ['Pathfinder', 'Counsellor', 'Club Director', 'Area Coordinator (examiner)', 'Conference Youth Director'] };
function recordSettings_() {
  try { var r = JSON.parse(PropertiesService.getScriptProperties().getProperty('GQ_RECORD') || 'null'); if (r && Array.isArray(r.titles)) return r; } catch (err) {}
  return JSON.parse(JSON.stringify(RECORD_DEFAULT));
}
function c_setRecordSettings(pin, r, who) {
  checkPin_(pin);
  r = r || {};
  var titles = (Array.isArray(r.titles) ? r.titles : []).map(function (x) { return String(x || '').replace(/\s+/g, ' ').trim().slice(0, 50); }).filter(Boolean).slice(0, 8);
  var out = { club: String(r.club || '').replace(/\s+/g, ' ').trim().slice(0, 80), titles: titles.length ? titles : RECORD_DEFAULT.titles.slice() };
  PropertiesService.getScriptProperties().setProperty('GQ_RECORD', JSON.stringify(out));
  log_('Class', who_(who) + ' updated the record sheet settings');
  return out;
}

/** Everything the printable record sheet needs. t = one Guide, or '' for the whole class. */
function c_record(pin, t) {
  checkPin_(pin);
  t = cleanToken_(t);
  var sh = sheet_(SHEET_PF), last = sh.getLastRow(), out = [];
  if (last < FIRST_ROW) return { guides: out, settings: recordSettings_(), evalDate: evalDate_() };
  var n = last - FIRST_ROW + 1, vals = sh.getRange(FIRST_ROW, 1, n, NCOLS).getValues();
  var dates = tickDates_(), adv = advSummary_(), att = attendance_(meetingsRead_()), total = meetingsRead_().length, ev = evRows_();
  vals.forEach(function (r) {
    var tok = String(r[COL_TOKEN - 1]), name = String(r[COL_NAME - 1]).trim();
    if (!tok || !name || (t && tok !== t)) return;
    var done = {}, when = {}, logd = null;
    CODES.forEach(function (c, i) {
      done[c] = r[COL_REQ0 - 1 + i] === true;
      if (!done[c]) return;
      var d = (dates[tok] || {})[c];
      if (!d) { if (!logd) logd = logDates_(name); d = logd[c]; }
      if (d) when[c] = d;
    });
    var signs = {};
    MISSIONS.forEach(function (m, i) { var v = r[COL_SIGN0 - 1 + i]; if (v !== '' && v !== null) signs[m.id] = fmtSign_(v); });
    out.push({ t: tok, name: name, done: done, when: when, signs: signs, adv: adv[tok] || {}, came: att[tok] || 0, total: total,
      photos: ev.filter(function (x) { return x.t === tok; }).map(evPublic_) });
  });
  out.sort(function (a, b) { return a.name.localeCompare(b.name); });
  return { guides: out, settings: recordSettings_(), evalDate: evalDate_() };
}

/* ---------- programme planner ---------- */
function setupProgramme_() {
  var s = sheet_(SHEET_PROG);
  s.getRange(1, 1, 1, 8).setValues([['Date', 'Topic', 'Requirements', 'Bring', 'Notes', 'Updated', 'By', 'ID']]).setFontWeight('bold').setBackground('#2C5F8A').setFontColor('#FFFFFF');
  s.setFrozenRows(1); s.getRange('A:A').setNumberFormat('d mmm yyyy'); s.getRange('B:E').setWrap(true); s.setColumnWidth(2, 240); s.hideColumns(8);
}
function programmeRead_() {
  var s = sheetIf_(SHEET_PROG), out = [];
  if (!s || s.getLastRow() < 2) return out;
  s.getRange(2, 1, s.getLastRow() - 1, 8).getValues().forEach(function (r, i) {
    if (!String(r[7])) return;
    out.push({ id: String(r[7]), row: i + 2, date: r[0] instanceof Date ? Utilities.formatDate(r[0], tz_(), 'yyyy-MM-dd') : String(r[0]).slice(0, 10),
      title: String(r[1]), codes: String(r[2]).split(/[,\s]+/).filter(function (c) { return CODES.indexOf(c) > -1 || ADVC.indexOf(c) > -1; }),
      bring: String(r[3]), notes: String(r[4]), by: String(r[6]) });
  });
  out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.row - b.row; });
  return out;
}
function c_programme(pin) { checkPin_(pin); return programmeRead_().map(function (x) { delete x.row; return x; }); }
function c_saveProgramme(pin, it, who) {
  checkPin_(pin);
  it = it || {};
  var dm = String(it.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dm) throw new Error('bad-date');
  var title = String(it.title || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!title) throw new Error('no-title');
  var codes = (Array.isArray(it.codes) ? it.codes : []).map(String).filter(function (c, i, a) { return (CODES.indexOf(c) > -1 || ADVC.indexOf(c) > -1) && a.indexOf(c) === i; });
  var lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    var s = sheet_(SHEET_PROG);
    if (s.getLastRow() === 0) setupProgramme_();
    var d = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), 12);
    var row = [d, safe_(title), codes.join(', '), safe_(String(it.bring || '').replace(/\s+/g, ' ').trim().slice(0, 300)), safe_(String(it.notes || '').replace(/\s+/g, ' ').trim().slice(0, 600)), new Date(), who_(who)];
    var x = it.id ? programmeRead_().filter(function (p) { return p.id === String(it.id); })[0] : null, id = x ? x.id : 'pg' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    if (x) s.getRange(x.row, 1, 1, 8).setValues([row.concat([id])]); else s.appendRow(row.concat([id]));
    log_('Class', who_(who) + (x ? ' updated' : ' planned') + ' “' + title + '” for ' + it.date);
    return { ok: true, id: id };
  } finally { lock.releaseLock(); }
}
function c_deleteProgramme(pin, id, who) {
  checkPin_(pin);
  var lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    var x = programmeRead_().filter(function (p) { return p.id === String(id); })[0];
    if (!x) throw new Error('not-found');
    sheet_(SHEET_PROG).deleteRow(x.row);
    log_('Class', who_(who) + ' removed “' + x.title + '” from the programme');
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ---------- parent links (read only) ---------- */
function parentRows_() {
  var s = sheetIf_(SHEET_PAR), out = [];
  if (!s || s.getLastRow() < 2) return out;
  s.getRange(2, 1, s.getLastRow() - 1, 4).getValues().forEach(function (r, i) { if (String(r[1])) out.push({ row: i + 2, name: String(r[0]), key: String(r[1]), t: String(r[3]) }); });
  return out;
}
function c_parentLink(pin, t, who) {
  return withRow_(pin, t, function (sh, row, name) {
    var tok = cleanToken_(t), x = parentRows_().filter(function (r) { return r.t === tok; })[0], key = x ? x.key : '';
    if (!key) {
      var s = sheet_(SHEET_PAR);
      if (s.getLastRow() === 0) {
        s.getRange(1, 1, 1, 4).setValues([['Pathfinder', 'Parent key', 'Created', 'Token']]).setFontWeight('bold').setBackground('#5A3188').setFontColor('#FFFFFF');
        s.setFrozenRows(1); s.hideColumns(4);
      }
      key = newToken_().slice(0, 24);
      s.appendRow([name, key, new Date(), tok]);
      log_(name, who_(who) + ' made a parent link');
    }
    return { key: key, url: baseUrl_() + '?parent=' + key };
  });
}
function parentGuide_(key) {
  key = String(key || '').replace(/[^a-f0-9]/gi, '');
  var x = key.length >= 16 ? parentRows_().filter(function (r) { return r.key === key; })[0] : null;
  if (!x) throw new Error('link-not-found');
  var d = questData_(x.t, true);
  if (!d) throw new Error('link-not-found');
  return { t: x.t, d: d };
}
function parent_view(key) {
  var g = parentGuide_(key), meets = meetingsRead_(), today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  return { name: g.d.name, done: g.d.done, signs: g.d.signs, adv: advSummary_()[g.t] || {},
    came: attendance_(meets)[g.t] || 0, total: meets.length, evalDate: evalDate_(), club: recordSettings_().club,
    photos: evRows_().filter(function (x) { return x.t === g.t; }).map(evPublic_),
    programme: programmeRead_().filter(function (p) { return p.date >= today; }).slice(0, 8).map(function (p) { return { date: p.date, title: p.title, codes: p.codes, bring: p.bring }; }) };
}
function parent_photo(key, id) {
  var g = parentGuide_(key), x = evRows_().filter(function (r) { return r.id === String(id) && r.t === g.t; })[0];
  if (!x) throw new Error('not-found');
  return photoData_(x);
}

/* ---------- weekly backup ---------- */
function backupFolder_() { return folderProp_('GQ_BACKUP_FOLDER', 'Guide Quest backups'); }
/** Copies every tab of this Sheet into a new spreadsheet in the "Guide Quest backups" folder. Keeps the newest 8. */
function weeklyBackup() {
  var ss = SpreadsheetApp.getActive(), folder = backupFolder_();
  var dest = SpreadsheetApp.create('Guide Quest backup ' + Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'));
  var tmp = dest.getSheets()[0].setName('gq-tmp-' + Date.now());
  ss.getSheets().forEach(function (s) { s.copyTo(dest).setName(s.getName()); });
  dest.deleteSheet(tmp);
  DriveApp.getFileById(dest.getId()).moveTo(folder);
  var files = [], it = folder.getFiles();
  while (it.hasNext()) files.push(it.next());
  files.sort(function (a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
  files.slice(8).forEach(function (f) { f.setTrashed(true); });
  PropertiesService.getScriptProperties().setProperty('GQ_LAST_BACKUP', String(Date.now()));
}
/** Run this once from the editor. Google asks for permission to use Drive (photos, backups) and to run the weekly backup. */
function setupNewFeatures() {
  evFolder_(); evPreviewFolder_(); backupFolder_();
  var has = ScriptApp.getProjectTriggers().some(function (tr) { return tr.getHandlerFunction() === 'weeklyBackup'; });
  if (!has) ScriptApp.newTrigger('weeklyBackup').timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(2).create();
  weeklyBackup();
  return 'Photos folder, backups folder and the weekly backup are ready.';
}
function lastBackup_() { var v = PropertiesService.getScriptProperties().getProperty('GQ_LAST_BACKUP'); return v ? Number(v) : 0; }

/* ---------- counsellor notes (header-based, works with the Version 12 layout too) ---------- */
function setupExtras_() {
  var s = sheet_(SHEET_XTRA);
  s.getRange(1, 1, 1, 5).setValues([['Pathfinder', 'Notes', 'Updated', 'By', 'Token']]).setFontWeight('bold').setBackground('#5A3188').setFontColor('#FFFFFF');
  s.setFrozenRows(1); s.getRange('B:B').setWrap(true); s.setColumnWidth(1, 170); s.setColumnWidth(2, 360);
  s.getRange('C:C').setNumberFormat('d mmm, h:mm am/pm'); s.hideColumns(5);
}
function extrasMap_() {
  var s = sheetIf_(SHEET_XTRA), out = {};
  if (!s || s.getLastRow() < 2) return out;
  var c = xtCols_(s);
  if (!c.token || !c.note) return out;
  s.getRange(2, 1, s.getLastRow() - 1, c.width).getValues().forEach(function (r) {
    var t = String(r[c.token - 1]); if (!t) return;
    var up = c.updated ? r[c.updated - 1] : '';
    out[t] = { note: String(r[c.note - 1] || ''), updated: up instanceof Date ? up.getTime() : 0, by: c.by ? String(r[c.by - 1] || '') : '' };
  });
  return out;
}
/** Saves a Guide's private counsellor notes. patch = { note: '...' } */
function c_saveExtras(pin, t, patch, who) {
  t = cleanToken_(t);
  patch = patch || {};
  return withRow_(pin, t, function (sh, row, name) {
    var s = sheet_(SHEET_XTRA);
    if (s.getLastRow() === 0) setupExtras_();
    var c = xtCols_(s), last = s.getLastRow(), r = -1, vals = [];
    if (last >= 2) {
      var tk = s.getRange(2, c.token, last - 1, 1).getValues();
      for (var i = 0; i < tk.length; i++) if (String(tk[i][0]) === t) { r = i + 2; break; }
    }
    if (r > 0) vals = s.getRange(r, 1, 1, c.width).getValues()[0];
    else for (var k = 0; k < c.width; k++) vals.push('');
    vals[0] = name;
    if (typeof patch.note === 'string') vals[c.note - 1] = safe_(patch.note.slice(0, 2000));
    if (c.updated) vals[c.updated - 1] = new Date();
    if (c.by) vals[c.by - 1] = who_(who);
    vals[c.token - 1] = t;
    if (r > 0) s.getRange(r, 1, 1, c.width).setValues([vals]); else s.appendRow(vals);
    log_(name, who_(who) + ' updated the counsellor notes');
    return { ok: true, extra: extrasMap_()[t] || null };
  });
}
/** A new personal link keeps everything the Guide has done: answers, scores, photos, dates, notes, parent link and attendance follow it. */
function retoken_(old, tok) {
  if (!old || !tok) return;
  var cols = [[SHEET_ANS, 6], [SHEET_CH, 8], [SHEET_EV, 9], [SHEET_DATES, 5], [SHEET_PAR, 4], [SHEET_GAME, 6]];
  var xs = sheetIf_(SHEET_XTRA);
  if (xs && xs.getLastRow() >= 2) { var xc = xtCols_(xs); if (xc.token) cols.push([SHEET_XTRA, xc.token]); }
  cols.forEach(function (x) {
    var s = sheetIf_(x[0]); if (!s || s.getLastRow() < 2) return;
    var rg = s.getRange(2, x[1], s.getLastRow() - 1, 1), v = rg.getValues(), ch = false;
    v.forEach(function (r) { if (String(r[0]) === old) { r[0] = tok; ch = true; } });
    if (ch) rg.setValues(v);
  });
  var m = sheetIf_(SHEET_MEET);
  if (m && m.getLastRow() >= 2) {
    var rg2 = m.getRange(2, 9, m.getLastRow() - 1, 1), v2 = rg2.getValues(), ch2 = false;
    v2.forEach(function (r) { var a = String(r[0]).split(','), k = a.indexOf(old); if (k > -1) { a[k] = tok; r[0] = a.join(','); ch2 = true; } });
    if (ch2) rg2.setValues(v2);
  }
}
/** Plain-text Advanced summary for the Assistant. */
function advText_(a) {
  a = a || {};
  var signed = ADVC.filter(function (c) { return a[c] && a[c].sign; }), ready = ADVC.filter(function (c) { return a[c] && a[c].done && !a[c].sign; });
  return signed.length + ' of 6 signed off' + (signed.length ? ' (' + signed.map(function (c) { return ADV_INFO[c].name; }).join(', ') + ')' : '')
    + (ready.length ? '; marked done and waiting for sign-off: ' + ready.map(function (c) { return ADV_INFO[c].name; }).join(', ') : '');
}

/* =====================================================================
   GAMES (version 14): each Guide's best score in each new game, and the
   class top-scores board.
   ===================================================================== */
var SHEET_GAME = 'Game scores';
var GAME_IDS = {
  'church:ladder': 'Church Map · Climb the church ladder',
  'sanctuary:setup': 'Sanctuary · Set up the sanctuary',
  'fire:build': 'Fire · Build the right fire',
  'lashing:tower': 'Knots and Lashings · Build the tower',
  'orienteering:race': 'Orienteering · Map race',
  'packcamp:pack': 'Pack Camp · Pack the backpack',
  'nutrition:run': 'Nutrition · Healthy run',
  'fruit:basket': 'Fruit of the Spirit · Fruit basket',
  'pioneers:timeline': 'Adventist Pioneers · Timeline and memory',
  'ecology:creek': 'Ecology · Save the creek',
  'legion:path': 'Legion of Honour · Choose your path'
};

function setupGames_() {
  var sh = sheet_(SHEET_GAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Guide', 'Game', 'Best score', 'Times played', 'Last played', 'Token']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 6).setFontWeight('bold');
    sh.setColumnWidth(1, 180); sh.setColumnWidth(2, 260);
  }
  return sh;
}
function gameRows_() {
  var sh = sheetIf_(SHEET_GAME);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues().map(function (r, i) {
    return { row: i + 2, name: String(r[0]), game: String(r[1]), best: Number(r[2]) || 0, plays: Number(r[3]) || 0, last: r[4], t: String(r[5]) };
  });
}
/** "Ann Smith" -> "Ann S." so the class board shows first names only. */
function boardName_(n) {
  var p = String(n || '').trim().split(/\s+/);
  return p.length > 1 ? p[0] + ' ' + p[p.length - 1].charAt(0).toUpperCase() + '.' : (p[0] || 'Guide');
}
function gameTop_(rows, game, n, t) {
  var list = rows.filter(function (x) { return x.game === game && x.best > 0; })
    .sort(function (a, b) { return b.best - a.best || (a.last < b.last ? -1 : 1); });
  var out = list.slice(0, n).map(function (x, i) { return { rank: i + 1, name: boardName_(x.name), score: x.best, me: !!t && x.t === t }; });
  if (t && !out.some(function (x) { return x.me; })) {
    for (var i = n; i < list.length; i++) if (list[i].t === t) { out.push({ rank: i + 1, name: boardName_(list[i].name), score: list[i].best, me: true }); break; }
  }
  return out;
}
function cleanGame_(game) {
  game = String(game || '');
  if (!GAME_IDS[game]) throw new Error('bad-request');
  return game;
}

/** A finished game. Keeps the Guide's best and returns the class top 5. */
function l_game(t, game, score) {
  t = cleanToken_(t); game = cleanGame_(game);
  score = Math.round(Number(score));
  if (!(score >= 0 && score <= 100000)) throw new Error('bad-request');
  var g = guideByToken_(t);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = setupGames_(), rows = gameRows_(), mine = rows.filter(function (x) { return x.t === g.t && x.game === GAME_IDS[game]; })[0];
    var best = score, now = new Date(), prev = mine ? mine.best : 0;
    if (mine) {
      best = Math.max(mine.best, score);
      sh.getRange(mine.row, 1, 1, 5).setValues([[safe_(g.name), GAME_IDS[game], best, mine.plays + 1, now]]);
      mine.best = best; mine.plays++; mine.last = now; mine.name = g.name;
    } else {
      sh.appendRow([safe_(g.name), GAME_IDS[game], best, 1, now, g.t]);
      rows.push({ row: sh.getLastRow(), name: g.name, game: GAME_IDS[game], best: best, plays: 1, last: now, t: g.t });
    }
    return { best: best, newBest: score > prev, top: gameTop_(rows, GAME_IDS[game], 5, g.t) };
  } finally { lock.releaseLock(); }
}
/** The class board for one game, for anyone with the class link. */
function l_top(game, t) {
  game = cleanGame_(game); t = cleanToken_(t);
  var rows = gameRows_(), mine = t ? rows.filter(function (x) { return x.t === t && x.game === GAME_IDS[game]; })[0] : null;
  return { best: mine ? mine.best : 0, top: gameTop_(rows, GAME_IDS[game], 5, t) };
}
/** Dashboard: every game with every Guide's best. */
function c_games(pin) {
  checkPin_(pin);
  var rows = gameRows_();
  return Object.keys(GAME_IDS).map(function (id) {
    var name = GAME_IDS[id];
    var list = rows.filter(function (x) { return x.game === name; }).sort(function (a, b) { return b.best - a.best; })
      .map(function (x) { return { name: x.name, t: x.t, best: x.best, plays: x.plays, last: x.last ? Utilities.formatDate(new Date(x.last), Session.getScriptTimeZone(), 'd MMM') : '' }; });
    return { id: id, name: name, rows: list };
  });
}

/* =====================================================================
   VERSION 15: a Guide asks, a counsellor signs off. Only counsellor
   ticks count. Memory Gems. Paperwork kept out of planning.
   ===================================================================== */
var PAPER = ['G1', 'G3', 'SD4', 'OL2'];      // personal records: check and file, never a lesson
var CLAIM_LABEL = 'Asked the counsellor to check';
var NOTE_LABEL = 'Counsellor’s note';

function claimMs_(v) { v = String(v == null ? '' : v); if (v.indexOf('yes') !== 0) return 0; return Number(v.split('|')[1]) || 1; }
function dayText_(d) { return Utilities.formatDate(d || new Date(), tz_(), 'd MMM'); }

/* One read of the Answers sheet per run: 'token|key' -> {row, val}. Writes below keep it current. */
var ANS_IDX_ = null;
function ansIndex_() {
  if (ANS_IDX_) return ANS_IDX_;
  ANS_IDX_ = {};
  var a = sheetIf_(SHEET_ANS);
  if (!a || a.getLastRow() < 2) return ANS_IDX_;
  a.getRange(2, 4, a.getLastRow() - 1, 4).getValues().forEach(function (r, i) { // Answer, Updated, Token, Key
    ANS_IDX_[String(r[2]) + '|' + String(r[3])] = { row: i + 2, val: r[0] };
  });
  return ANS_IDX_;
}
/** Sets one answer cell; with val '' it only clears a row that already holds something. */
function ansPut_(t, name, code, key, label, val) {
  var idx = ansIndex_(), x = idx[t + '|' + key], a = sheet_(SHEET_ANS);
  if (x) {
    if (String(x.val) === String(val)) return;
    if (name) a.getRange(x.row, 1, 1, 5).setValues([[name, code, label, val, new Date()]]);
    else a.getRange(x.row, 4, 1, 2).setValues([[val, new Date()]]);
    x.val = val;
    return;
  }
  if (val === '' || val == null) return;
  if (a.getLastRow() === 0) setupAnswers_();
  a.appendRow([name, code, label, val, new Date(), t, key]);
  idx[t + '|' + key] = { row: a.getLastRow(), val: val };
}
/** A requirement went on the record: its request and any old note are finished. */
function claimClear_(t, code) {
  try {
    var idx = ansIndex_();
    [code + '.claim', code + '.revnote'].forEach(function (k) {
      var x = idx[t + '|' + k];
      if (x && String(x.val) !== '') ansPut_(t, '', code, k, k === code + '.claim' ? CLAIM_LABEL : NOTE_LABEL, '');
    });
  } catch (err) { /* never block a tick */ }
}

/** What one Guide is waiting on, and notes sent back to them. */
function reviewState_(t) {
  var claims = {}, notes = {}, adv = {};
  var a = sheetIf_(SHEET_ANS);
  if (a && a.getLastRow() >= 2) a.getRange(2, 4, a.getLastRow() - 1, 4).getValues().forEach(function (r) {
    if (String(r[2]) !== t) return;
    var m = String(r[3]).match(/^([A-Z]{1,2}\d)\.(claim|revnote|done)$/);
    if (!m) return;
    if (m[2] === 'claim') { var ms = claimMs_(r[0]); if (ms) claims[m[1]] = ms; }
    else if (m[2] === 'done') { if (String(r[0]) === 'yes') adv[m[1]] = 1; }
    else if (String(r[0])) notes[m[1]] = String(r[0]);
  });
  return { claims: claims, notes: notes, adv: adv };
}

/** Everyone: {token: {claims:{code:ms}, notes:{code:text}, counts:{code:n}, avAt:{AVn:ms}}} */
function claimsMap_() {
  var out = {}, a = sheetIf_(SHEET_ANS);
  if (!a || a.getLastRow() < 2) return out;
  a.getRange(2, 4, a.getLastRow() - 1, 4).getValues().forEach(function (r) {
    var t = String(r[2]), key = String(r[3]), code = key.split('.')[0], what = key.slice(code.length + 1);
    if (!t || !code) return;
    var g = out[t] || (out[t] = { claims: {}, notes: {}, counts: {}, avAt: {} });
    if (what === 'claim') { var ms = claimMs_(r[0]); if (ms) g.claims[code] = ms; return; }
    if (what === 'revnote') { if (String(r[0])) g.notes[code] = String(r[0]); return; }
    if (what === 'done') { if (String(r[0]) === 'yes') g.avAt[code] = r[1] instanceof Date ? r[1].getTime() : 0; return; }
    if (what === 'sign' || /Seen$|^visited$/.test(what)) return;
    var v = String(r[0] == null ? '' : r[0]);
    if (v === '' || v === '[]' || /^\[(?:"",?)+\]$/.test(v)) return;
    g.counts[code] = (g.counts[code] || 0) + 1;
  });
  return out;
}

/** The "To review" list for the dashboard: oldest request first. */
function reviews_(list, cm, av, evs) {
  var out = [], ph = {};
  (evs || []).forEach(function (x) { var k = x.t + '|' + x.code; ph[k] = (ph[k] || 0) + 1; });
  list.forEach(function (p) {
    var c = cm[p.t] || { claims: {}, counts: {}, avAt: {} };
    CODES.forEach(function (code, i) {
      if (p.done[i] || !c.claims[code]) return;
      out.push({ t: p.t, name: p.name, code: code, at: c.claims[code], answers: c.counts[code] || 0, photos: ph[p.t + '|' + code] || 0 });
    });
    var a = av[p.t] || {};
    ADVC.forEach(function (code) {
      var x = a[code];
      if (!x || !x.done || x.sign) return;
      out.push({ t: p.t, name: p.name, code: code, at: c.avAt[code] || 0, answers: c.counts[code] || 0, photos: ph[p.t + '|' + code] || 0 });
    });
  });
  out.sort(function (x, y) { return (x.at || 0) - (y.at || 0); });
  return out;
}

/**
 * Runs once (the first time the dashboard opens after Version 15).
 * Ticks a Guide made for themselves were never checked, so they move to "To review".
 * Ticks in a mission a counsellor already signed off stay: that sign-off was the check.
 */
function migrateClaims_() {
  var P = PropertiesService.getScriptProperties();
  if (P.getProperty('GQ_V15_CLAIMS')) return 0;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return 0;
  try {
    if (P.getProperty('GQ_V15_CLAIMS')) return 0;
    var sh = sheet_(SHEET_PF), last = sh.getLastRow(), moved = 0, people = 0;
    if (last >= FIRST_ROW) {
      var n = last - FIRST_ROW + 1, vals = sh.getRange(FIRST_ROW, 1, n, NCOLS).getValues();
      var dates = tickDates_(), idx = ansIndex_(), add = [];
      vals.forEach(function (r, i) {
        var tok = String(r[COL_TOKEN - 1]), name = String(r[COL_NAME - 1]).trim();
        if (!tok || !name) return;
        var row = r.slice(COL_REQ0 - 1, COL_REQ0 - 1 + CODES.length), logd = null, mine = [];
        CODES.forEach(function (c, j) {
          if (row[j] !== true) return;
          var mi = -1;
          MISSIONS.forEach(function (m, k) { if (m.tasks.indexOf(c) > -1) mi = k; });
          var sv = mi > -1 ? r[COL_SIGN0 - 1 + mi] : '';
          if (sv !== '' && sv !== null) return;
          var d = (dates[tok] || {})[c];
          if (!d) { if (!logd) logd = logDates_(name); d = logd[c]; }
          if (!d || d.by !== 'Pathfinder') return;
          row[j] = false; mine.push(c);
          var val = 'yes|' + (d.date || Date.now()), key = c + '.claim';
          if (idx[tok + '|' + key]) ansPut_(tok, safe_(name), c, key, CLAIM_LABEL, val);
          else add.push([safe_(name), c, CLAIM_LABEL, val, new Date(), tok, key]);
        });
        if (mine.length) {
          sh.getRange(FIRST_ROW + i, COL_REQ0, 1, CODES.length).setValues([row]);
          moved += mine.length; people++;
          log_(name, 'Version 15: ' + mine.join(', ') + ' moved to “To review” (only counsellor sign-offs count now)');
        }
      });
      if (add.length) {
        var a = sheet_(SHEET_ANS);
        if (a.getLastRow() === 0) setupAnswers_();
        a.getRange(a.getLastRow() + 1, 1, add.length, 7).setValues(add);
        ANS_IDX_ = null;
      }
    }
    P.setProperty('GQ_V15_CLAIMS', String(Date.now()));
    if (moved) log_('Class', 'Version 15: ' + moved + ' tick' + (moved === 1 ? '' : 's') + ' that ' + people + ' Guide' + (people === 1 ? '' : 's') + ' made for themselves now wait in “To review” for a counsellor to sign off');
    SpreadsheetApp.flush();
    return moved;
  } finally { lock.releaseLock(); }
}

/** Counsellor signs off one or more items a Guide asked about (requirements and Advanced). */
function c_reviewSign(pin, t, codes, who) {
  codes = (Array.isArray(codes) ? codes : [codes]).map(String).filter(function (c, i, a) { return (CODES.indexOf(c) > -1 || ADVC.indexOf(c) > -1) && a.indexOf(c) === i; }).slice(0, 40);
  if (!codes.length) throw new Error('bad-code');
  return withRow_(pin, t, function (sh, row, name) {
    t = cleanToken_(t);
    var now = new Date(), text = who_(who) + ' · ' + Utilities.formatDate(now, tz_(), 'd MMM yyyy'), reqs = [], advs = [];
    codes.forEach(function (c) {
      if (CODES.indexOf(c) > -1) {
        sh.getRange(row, COL_REQ0 + CODES.indexOf(c)).setValue(true);
        tickDate_(t, name, c, who_(who));
        claimClear_(t, c);
        reqs.push(c);
      } else {
        ansPut_(t, name, c, c + '.sign', 'Advanced sign-off · ' + ADV_INFO[c].name, text);
        ansPut_(t, name, c, c + '.revnote', NOTE_LABEL, '');
        advs.push(ADV_INFO[c].name);
      }
    });
    sh.getRange(row, COL_UPDATED).setValue(now);
    log_(name, who_(who) + ' signed off ' + reqs.concat(advs.map(function (x) { return 'Advanced: ' + x; })).join(', ') + ' (the Guide asked)');
    return { ok: true, sign: text, codes: codes };
  });
}

/** "Not yet": the request goes back to the Guide with a short note. */
function c_reviewBack(pin, t, code, note, who) {
  code = String(code);
  if (CODES.indexOf(code) < 0 && ADVC.indexOf(code) < 0) throw new Error('bad-code');
  return withRow_(pin, t, function (sh, row, name) {
    t = cleanToken_(t);
    var msg = String(note || '').replace(/\s+/g, ' ').trim().slice(0, 300) || 'Not yet. Talk to your counsellor about what is missing.';
    var text = safe_(msg + ' (' + who_(who) + ', ' + dayText_() + ')');
    if (CODES.indexOf(code) > -1) ansPut_(t, name, code, code + '.claim', CLAIM_LABEL, '');
    else ansPut_(t, name, code, code + '.done', 'Marked complete', '');
    ansPut_(t, name, code, code + '.revnote', NOTE_LABEL, text);
    log_(name, who_(who) + ' sent ' + (CODES.indexOf(code) > -1 ? code : 'Advanced: ' + ADV_INFO[code].name) + ' back: ' + msg);
    return { ok: true, note: text };
  });
}

/* ---------- Memory Gems (SD4) ---------- */
var SHEET_GEMS = 'Memory Gems';
var GEM_CATS = ['Great passages', 'Salvation', 'Doctrine', 'Prayer', 'Relationships', 'Behaviour', 'Promise and praise'];
function gemsDefault_() { return GEMS_DEFAULT.map(function (g) { return { cat: g[0], ref: g[1], text: g[2] }; }); }
function setupGems_(rows) {
  var s = sheet_(SHEET_GEMS);
  s.clear();
  s.getRange(1, 1, 1, 3).setValues([['Group', 'Reference', 'Text (KJV)']]).setFontWeight('bold').setBackground('#1F4D3A').setFontColor('#FFFFFF');
  s.setFrozenRows(1); s.setColumnWidth(1, 150); s.setColumnWidth(2, 170); s.setColumnWidth(3, 620);
  if (rows.length) s.getRange(2, 1, rows.length, 3).setValues(rows.map(function (g) { return [safe_(g.cat), safe_(g.ref), safe_(g.text)]; })).setWrap(true).setVerticalAlignment('top');
  return s;
}
/** The club's list: the Memory Gems tab of the sheet, or the official suggested list until a counsellor changes it. */
function gemsRead_() {
  var s = sheetIf_(SHEET_GEMS);
  if (!s || s.getLastRow() < 2) return { list: gemsDefault_(), custom: false };
  var list = s.getRange(2, 1, s.getLastRow() - 1, 3).getDisplayValues().map(function (r) {
    return { cat: String(r[0]).replace(/^'/, '').trim() || 'Memory Gems', ref: String(r[1]).replace(/^'/, '').trim(), text: String(r[2]).replace(/^'/, '').trim() };
  }).filter(function (g) { return g.ref && g.text; }).slice(0, 80);
  if (!list.length) return { list: gemsDefault_(), custom: false };
  var d = gemsDefault_(), same = list.length === d.length && list.every(function (g, i) { return g.ref === d[i].ref && g.text === d[i].text && g.cat === d[i].cat; });
  return { list: list, custom: !same };
}
function gemsMine_(f) {
  var p = Array.isArray(f['SD4.gems']) ? f['SD4.gems'] : [], l = Array.isArray(f['SD4.learned']) ? f['SD4.learned'] : [];
  return { picked: p.map(String), learned: l.map(String) };
}
function c_gems(pin) {
  checkPin_(pin);
  var g = gemsRead_(), prog = {};
  if (!sheetIf_(SHEET_GEMS)) { try { setupGems_(g.list); } catch (err) {} }
  var a = sheetIf_(SHEET_ANS);
  if (a && a.getLastRow() >= 2) a.getRange(2, 4, a.getLastRow() - 1, 4).getValues().forEach(function (r) {
    var k = String(r[3]);
    if (k !== 'SD4.gems' && k !== 'SD4.learned') return;
    var v = []; try { v = JSON.parse(String(r[0] || '[]')); } catch (err) {}
    var x = prog[String(r[2])] || (prog[String(r[2])] = { picked: [], learned: [] });
    x[k === 'SD4.gems' ? 'picked' : 'learned'] = Array.isArray(v) ? v : [];
  });
  return { list: g.list, custom: g.custom, cats: GEM_CATS, progress: prog };
}
/** rows: [{cat, ref, text}], or null to go back to the official suggested list. */
function c_setGems(pin, rows, who) {
  checkPin_(pin);
  var list = rows === null ? gemsDefault_() : (Array.isArray(rows) ? rows : []).map(function (g) {
    return { cat: String(g && g.cat || '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Memory Gems', ref: String(g && g.ref || '').replace(/\s+/g, ' ').trim().slice(0, 60), text: String(g && g.text || '').replace(/\s+/g, ' ').trim().slice(0, 2500) };
  }).filter(function (g) { return g.ref && g.text; }).slice(0, 80);
  if (!list.length) throw new Error('empty');
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    setupGems_(list);
    log_('Class', who_(who) + (rows === null ? ' put back the suggested Memory Gem list' : ' saved the Memory Gem list (' + list.length + ' texts)'));
  } finally { lock.releaseLock(); }
  return gemsRead_();
}

/* The suggested list in the official Guide curriculum (seven groups), King James Version text. */
var GEMS_DEFAULT = [["Great passages","2 Timothy 3:15–16","And that from a child thou hast known the holy scriptures, which are able to make thee wise unto salvation through faith which is in Christ Jesus. All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness:"],["Great passages","Romans 10:17","So then faith cometh by hearing, and hearing by the word of God."],["Great passages","Daniel 8:14","And he said unto me, Unto two thousand and three hundred days; then shall the sanctuary be cleansed."],["Salvation","Philippians 3:7–9","But what things were gain to me, those I counted loss for Christ. Yea doubtless, and I count all things but loss for the excellency of the knowledge of Christ Jesus my Lord: for whom I have suffered the loss of all things, and do count them but dung, that I may win Christ, And be found in him, not having mine own righteousness, which is of the law, but that which is through the faith of Christ, the righteousness which is of God by faith:"],["Salvation","Ezekiel 36:26–27","A new heart also will I give you, and a new spirit will I put within you: and I will take away the stony heart out of your flesh, and I will give you an heart of flesh. And I will put my spirit within you, and cause you to walk in my statutes, and ye shall keep my judgments, and do them."],["Salvation","1 John 5:11–12","And this is the record, that God hath given to us eternal life, and this life is in his Son. He that hath the Son hath life; and he that hath not the Son of God hath not life."],["Salvation","1 Corinthians 5:7–8","Purge out therefore the old leaven, that ye may be a new lump, as ye are unleavened. For even Christ our passover is sacrificed for us: Therefore let us keep the feast, not with old leaven, neither with the leaven of malice and wickedness; but with the unleavened bread of sincerity and truth."],["Salvation","1 Corinthians 6:19–20","What? know ye not that your body is the temple of the Holy Ghost which is in you, which ye have of God, and ye are not your own? For ye are bought with a price: therefore glorify God in your body, and in your spirit, which are God’s."],["Doctrine","Matthew 24:24–27","For there shall arise false Christs, and false prophets, and shall shew great signs and wonders; insomuch that, if it were possible, they shall deceive the very elect. Behold, I have told you before. Wherefore if they shall say unto you, Behold, he is in the desert; go not forth: behold, he is in the secret chambers; believe it not. For as the lightning cometh out of the east, and shineth even unto the west; so shall also the coming of the Son of man be."],["Doctrine","Ecclesiastes 9:5–6, 10","For the living know that they shall die: but the dead know not any thing, neither have they any more a reward; for the memory of them is forgotten. Also their love, and their hatred, and their envy, is now perished; neither have they any more a portion for ever in any thing that is done under the sun. Whatsoever thy hand findeth to do, do it with thy might; for there is no work, nor device, nor knowledge, nor wisdom, in the grave, whither thou goest."],["Doctrine","Hebrews 4:14–16","Seeing then that we have a great high priest, that is passed into the heavens, Jesus the Son of God, let us hold fast our profession. For we have not an high priest which cannot be touched with the feeling of our infirmities; but was in all points tempted like as we are, yet without sin. Let us therefore come boldly unto the throne of grace, that we may obtain mercy, and find grace to help in time of need."],["Doctrine","Exodus 20:3–7","Thou shalt have no other gods before me. Thou shalt not make unto thee any graven image, or any likeness of any thing that is in heaven above, or that is in the earth beneath, or that is in the water under the earth: Thou shalt not bow down thyself to them, nor serve them: for I the LORD thy God am a jealous God, visiting the iniquity of the fathers upon the children unto the third and fourth generation of them that hate me; And shewing mercy unto thousands of them that love me, and keep my commandments. Thou shalt not take the name of the LORD thy God in vain; for the LORD will not hold him guiltless that taketh his name in vain."],["Prayer","Philippians 4:6–7","Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus."],["Prayer","Ephesians 3:20–21","Now unto him that is able to do exceeding abundantly above all that we ask or think, according to the power that worketh in us, Unto him be glory in the church by Christ Jesus throughout all ages, world without end. Amen."],["Prayer","Matthew 5:44","But I say unto you, Love your enemies, bless them that curse you, do good to them that hate you, and pray for them which despitefully use you, and persecute you;"],["Relationships","Acts 17:26–27","And hath made of one blood all nations of men for to dwell on all the face of the earth, and hath determined the times before appointed, and the bounds of their habitation; That they should seek the Lord, if haply they might feel after him, and find him, though he be not far from every one of us:"],["Relationships","1 Peter 4:10","As every man hath received the gift, even so minister the same one to another, as good stewards of the manifold grace of God."],["Relationships","1 Peter 3:15","But sanctify the Lord God in your hearts: and be ready always to give an answer to every man that asketh you a reason of the hope that is in you with meekness and fear:"],["Relationships","1 Corinthians 12:9","To another faith by the same Spirit; to another the gifts of healing by the same Spirit;"],["Behaviour","Luke 12:15","And he said unto them, Take heed, and beware of covetousness: for a man’s life consisteth not in the abundance of the things which he possesseth."],["Behaviour","1 Corinthians 10:31","Whether therefore ye eat, or drink, or whatsoever ye do, do all to the glory of God."],["Behaviour","James 4:7–8","Submit yourselves therefore to God. Resist the devil, and he will flee from you. Draw nigh to God, and he will draw nigh to you. Cleanse your hands, ye sinners; and purify your hearts, ye double minded."],["Promise and praise","Psalm 46","God is our refuge and strength, a very present help in trouble. Therefore will not we fear, though the earth be removed, and though the mountains be carried into the midst of the sea; Though the waters thereof roar and be troubled, though the mountains shake with the swelling thereof. Selah. There is a river, the streams whereof shall make glad the city of God, the holy place of the tabernacles of the most High. God is in the midst of her; she shall not be moved: God shall help her, and that right early. The heathen raged, the kingdoms were moved: he uttered his voice, the earth melted. The LORD of hosts is with us; the God of Jacob is our refuge. Selah. Come, behold the works of the LORD, what desolations he hath made in the earth. He maketh wars to cease unto the end of the earth; he breaketh the bow, and cutteth the spear in sunder; he burneth the chariot in the fire. Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth. The LORD of hosts is with us; the God of Jacob is our refuge. Selah."],["Promise and praise","Philippians 4:13","I can do all things through Christ which strengtheneth me."],["Promise and praise","Psalm 55:22","Cast thy burden upon the LORD, and he shall sustain thee: he shall never suffer the righteous to be moved."],["Promise and praise","Psalm 95:6–7","O come, let us worship and bow down: let us kneel before the LORD our maker. For he is our God; and we are the people of his pasture, and the sheep of his hand. To day if ye will hear his voice,"],["Promise and praise","1 Corinthians 10:13","There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able; but will with the temptation also make a way to escape, that ye may be able to bear it."]];

/* =====================================================================
   VERSION 16: eight more explorers (lesson cards, a game, a challenge)
   ===================================================================== */
TOPICS.hiv = { name: "HIV, AIDS & God’s Plan", code: 'AV5', cards: 10 };
TOPIC_QUESTIONS.hiv = [["What does HIV stand for?", ["Human Immunodeficiency Virus", "Health Infection Vaccine", "Human Immune Vitamin", "Highly Infectious Virus"], 0, "H-I-V: Human Immunodeficiency Virus."], ["What does AIDS stand for?", ["Acquired Immune Deficiency Syndrome", "Active Infection Disease Syndrome", "Acquired Infection Defence System", "Anti Immune Disease Sickness"], 0, "A-I-D-S: Acquired Immune Deficiency Syndrome."], ["What does STI stand for?", ["Sexually Transmitted Infection", "Serious Throat Infection", "Simple Test Information", "Skin Treatment Injection"], 0, "An infection passed on through sex."], ["Which of these can pass on HIV?", ["Sharing needles", "Hugging", "Sharing a cup", "A mosquito bite"], 0, "HIV is in blood, so sharing needles is risky. Everyday contact is safe."], ["AIDS is…", ["The late stage of HIV if it isn’t treated", "A different virus from mosquitoes", "A kind of cold", "Caught from toilet seats"], 0, "With treatment (ART), most people with HIV never get AIDS."], ["How can you know if you have HIV or another STI?", ["Get tested", "You can tell by looking", "Wait for a rash", "Ask a friend"], 0, "Many people have no signs. Only a test can tell."], ["God’s plan for sex is…", ["For a husband and wife in marriage", "For anyone who is in love", "Something shameful", "Only for adults over 30"], 0, "Genesis 2:24 and Hebrews 13:4."], ["How should we treat someone living with HIV?", ["With love and respect, like Jesus", "Stay away from them", "Tell everyone", "Refuse to eat with them"], 0, "Bear ye one another’s burdens (Galatians 6:2)."]];
GAME_IDS['hiv:know'] = "HIV & God’s plan · Know it, live it";
TOPICS.visit = { name: "Serving Others", code: 'CO1', cards: 6 };
TOPIC_QUESTIONS.visit = [["Matthew 25:40 says that when we help “the least of these”…", ["We do it for Jesus", "It doesn’t count", "Only pastors should do it", "We will get paid"], 0, "“Ye have done it unto me.”"], ["Who should go on a visit to a stranger’s home?", ["A group, with an adult", "You on your own", "Anyone, late at night", "Nobody ever"], 0, "Always go as a group with an adult."], ["Where should you sit when you visit someone in a chair or bed?", ["At their eye level", "Standing over them", "Across the room", "Outside"], 0, "Eye level feels friendly and respectful."], ["What should you do with your phone during a visit?", ["Put it away", "Scroll quietly", "Play music", "Video-call friends"], 0, "Give them your full attention."], ["About how long should you stay with someone who is unwell?", ["30 to 45 minutes", "Five hours", "All day", "Two minutes"], 0, "Long enough to help, short enough not to tire them."], ["What does “adopt a family in need” mean?", ["Help a person or family more than once", "Move into their house", "Give money once", "Take their children"], 0, "Adopting means you keep helping."], ["If they tell you something private, you should…", ["Keep it private", "Tell the class", "Post it online", "Tell their neighbours"], 0, "Respect their privacy."], ["James 1:19 says be swift to…", ["Hear", "Speak", "Anger", "Leave"], 0, "“Swift to hear, slow to speak, slow to wrath.”"]];
GAME_IDS['visit:day'] = "Serving Others · Visit day";
TOPICS.witness = { name: "Sharing Jesus", code: 'CO2', cards: 6 };
TOPIC_QUESTIONS.witness = [["What comes first when sharing Jesus with a friend?", ["Being a real friend", "Handing them a tract", "Arguing about beliefs", "Asking them to be baptised"], 0, "People listen to friends."], ["1 Peter 3:15 says be ready to give a reason for…", ["The hope that is in you", "Your grades", "Your favourite team", "Your money"], 0, "Be ready always to give an answer."], ["The three parts of your testimony are…", ["Before, how Jesus met me, now", "Name, age, address", "Past, future, dreams", "Bible, Sabbath, tithe"], 0, "Keep it short and real."], ["About how long should your story be when you tell a friend?", ["A minute or two", "An hour", "Ten seconds", "It doesn’t matter"], 0, "Short and real."], ["If a friend asks something you don’t know, you should…", ["Say you don’t know, and you’ll find out", "Make something up", "Change the subject", "Laugh"], 0, "Honesty builds trust."], ["Colossians 4:6 says let your speech be…", ["Alway with grace", "Loud", "Short", "Clever"], 0, "“Let your speech be alway with grace, seasoned with salt.”"], ["A good first invitation for a friend who thinks church is boring is…", ["A fun activity, like a camp-out", "A three-hour sermon", "Nothing", "A Bible test"], 0, "Start where they are."], ["Who changes a person’s heart?", ["The Holy Spirit", "You, by arguing", "Their parents", "Nobody"], 0, "John 6:44 and 16:8."]];
GAME_IDS['witness:chat'] = "Sharing Jesus · Chat with a friend";
TOPICS.choices = { name: "Life Choices", code: 'FD1', cards: 7 };
TOPIC_QUESTIONS.choices = [["Proverbs 3:6: “In all thy ways acknowledge him, and he shall…”", ["Direct thy paths", "Give thee riches", "Make thee famous", "Leave thee"], 0, "God guides us when we put Him first."], ["A good way to find a career that fits you is to…", ["Look where your gifts and interests meet a real need", "Pick whatever pays most", "Copy your best friend", "Never think about it"], 0, "Gifts + interests + a need."], ["2 Corinthians 6:14 says do not be…", ["Unequally yoked together with unbelievers", "Late for church", "Quiet", "Rich"], 0, "Shared faith matters in a life partner."], ["Which one is a red flag in a relationship?", ["Pressure to keep secrets from your parents", "Respecting your “no”", "Being kind to your family", "Encouraging your faith"], 0, "Pressure and secrets are warning signs."], ["When should you decide your limits?", ["Before you are in the moment", "In the moment", "Never", "Afterwards"], 0, "Decide before."], ["Going out in groups is…", ["Safer, and often more fun", "Not allowed", "Always boring", "Only for adults"], 0, "Group activities help you keep your limits."], ["John 14:15: “If ye love me…”", ["Keep my commandments", "Go to sleep", "Be quiet", "Work hard"], 0, "We obey because we love Him."], ["What lasts longer in a husband or wife?", ["Character", "Looks", "Money", "Popularity"], 0, "Looks change; character lasts."]];
GAME_IDS['choices:flags'] = "Life Choices · Flags and choices";
TOPICS.fitness = { name: "Fit & Free", code: 'HF2', cards: 6 };
TOPIC_QUESTIONS.fitness = [["How much physical activity do teens need each day?", ["At least 60 minutes", "5 minutes", "4 hours", "None"], 0, "At least an hour a day."], ["Why take rest days?", ["Your body gets stronger while it rests", "To be lazy", "They’re not needed", "To eat more"], 0, "Rest is part of training."], ["The best time to run in Guyana’s heat is…", ["Early morning or late afternoon", "Midday", "2 pm", "Whenever it’s hottest"], 0, "Run when it’s cooler."], ["Which addictive drug is in cigarettes and most vapes?", ["Nicotine", "Calcium", "Vitamin C", "Iron"], 0, "Nicotine."], ["Alcohol slows down your…", ["Brain", "Hair growth", "Fingernails", "Shoes"], 0, "Judgement, balance and reactions get worse."], ["What should a training record include?", ["Date, what you did and how long", "Your shoe size", "Nothing", "Your friends’ names"], 0, "HF 2 needs a record of your training."], ["Proverbs 20:1 says “Wine is a…”", ["Mocker", "Medicine", "Gift", "Friend"], 0, "“Wine is a mocker, strong drink is raging.”"], ["A good way to say no to drugs is…", ["“No thanks, I’m in training,” then walk away", "Try it once", "Hide it", "Argue for an hour"], 0, "Short and clear, then leave."]];
GAME_IDS['fitness:guard'] = "Fit & Free · Train and guard";
TOPICS.teach = { name: "Teach It", code: 'OL3', cards: 6 };
TOPIC_QUESTIONS.teach = [["Who guides you when you teach Juniors for OL 3?", ["A staff mentor", "Nobody", "A Junior", "A friend"], 0, "OL 3 is done with a staff member as your mentor."], ["The four teaching steps are…", ["Explain, show, let them try, check", "Read, sleep, eat, leave", "Talk, talk, talk, quiz", "Show, leave, test, repeat"], 0, "Explain, show, try, check."], ["How many honour requirements must you teach?", ["At least two", "One", "Ten", "All of them"], 0, "At least two."], ["A Junior is bored. A good move is to…", ["Give them a helper job", "Send them home", "Shout at them", "Ignore it"], 0, "Busy hands help focus."], ["Juniors learn best when lessons are…", ["Short and hands-on", "Long talks", "Silent", "Only reading"], 0, "Talk less, do more."], ["Your lesson plan should include…", ["An aim, materials and timings", "Only the date", "Nothing", "Jokes only"], 0, "Plan it, then teach it."], ["How do you know they learned it?", ["Each one shows you they can do it", "You hope so", "They say yes", "You don’t"], 0, "Check every Junior."], ["Proverbs 27:17: “Iron sharpeneth iron; so a man sharpeneth…”", ["The countenance of his friend", "His sword", "His tools", "Nothing"], 0, "We learn from each other, like you and your mentor."]];
GAME_IDS['teach:class'] = "Teach It · Lead the class";
TOPICS.parable = { name: "Nature Parables", code: 'NS1', cards: 6 };
TOPIC_QUESTIONS.parable = [["Where did Jesus grow up?", ["Nazareth", "Jerusalem", "Rome", "Egypt"], 0, "Luke 2:39–40."], ["Who was Jesus’ first teacher, according to The Desire of Ages, chapter 7?", ["His mother", "A Roman tutor", "The high priest", "Nobody"], 0, "He learned the Scriptures from His mother."], ["Did Jesus study in the schools of the rabbis?", ["No: He learned from Scripture, nature and His work", "Yes, for many years", "Yes, in Rome", "Yes, in Egypt"], 0, "The Desire of Ages, chapter 7."], ["A parable is…", ["An earthly story with a heavenly meaning", "A kind of plant", "A long sermon", "A song"], 0, "Jesus taught with stories people could see."], ["Luke 2:52 says Jesus increased in…", ["Wisdom and stature, and in favour with God and man", "Money and power", "Fame", "Height only"], 0, "Luke 2:52."], ["In Matthew 6:26, what does Jesus point to so we won’t worry?", ["The birds of the air", "The stars", "The mountains", "Gold"], 0, "God feeds them."], ["The first step in making a nature parable is to…", ["Observe something closely", "Write the ending", "Choose a song", "Find a microphone"], 0, "Look closely first."], ["Proverbs 6:6 tells us to learn from…", ["The ant", "The lion", "The eagle", "The snake"], 0, "“Go to the ant, thou sluggard; consider her ways, and be wise.”"]];
GAME_IDS['parable:build'] = "Nature Parables · Parable builder";
TOPICS.honours = { name: "Honours Guide", code: 'LE1', cards: 6 };
TOPIC_QUESTIONS.honours = [["For LE 1, the honour must be…", ["New: one you haven’t earned before", "One you already have", "A Master award", "A class"], 0, "New means new."], ["Carpentry is in which area?", ["Vocational", "Household Arts", "Outreach Ministries", "Health and Science"], 0, "Trades are Vocational."], ["Cooking and Baking are in…", ["Household Arts", "Vocational", "Outdoor Industries", "Health and Science"], 0, "Household Arts."], ["First Aid is in…", ["Health and Science", "Household Arts", "Vocational", "Outreach Ministries"], 0, "Health and Science."], ["Gardening and Poultry Raising are in…", ["Outdoor Industries", "Household Arts", "Health and Science", "Vocational"], 0, "Outdoor Industries."], ["Christian Storytelling is in…", ["Outreach Ministries", "Vocational", "Household Arts", "Outdoor Industries"], 0, "Outreach Ministries."], ["Which honour counts toward the Wilderness Master?", ["Orienteering", "Cooking", "Computers", "Chemistry"], 0, "Orienteering is on the Wilderness Master list."], ["Who signs off an honour?", ["A qualified instructor", "You", "A friend", "Nobody"], 0, "An instructor checks your work."]];
GAME_IDS['honours:sort'] = "Honours Guide · Patch drop";
TOPICS.temperance = { name: "Temperance", code: 'HF2', cards: 7 };
TOPIC_QUESTIONS.temperance = [["True temperance work aims for Christ’s grace to reshape the character and bring us close to God.", ["True", "False"], 0, "Page 102: this is the purpose of all true temperance effort."], ["Habits that weaken the body don’t affect the mind.", ["True", "False"], 1, "Pages 102–103: the body is how the mind and character grow."], ["Controlling our desires doesn’t matter much, because we are free to do as we please.", ["True", "False"], 1, "Pages 102–103: self-control must be regained, with the will under God’s control."], ["Satan has no power over someone who says “No” firmly and holds on to Jesus.", ["True", "False"], 0, "Page 103."], ["Someone who sincerely asks God for help to stop smoking will receive it.", ["True", "False"], 0, "Page 103: ask for grace, and believe He will give it."], ["With every temptation, God promises a way of escape.", ["True", "False"], 0, "Page 105, and 1 Corinthians 10:13."], ["There are many different remedies for sin.", ["True", "False"], 1, "Page 106: the only remedy is the grace and power of Christ."], ["Good resolutions made in our own strength cannot break an evil habit.", ["True", "False"], 0, "Page 106."], ["God doesn’t ask for perfect obedience, because He knows we are sinners.", ["True", "False"], 1, "Page 106: nothing less than perfect obedience, reached only by Christ’s grace."], ["When you’ve sinned and feel discouraged, wait until you feel better before you pray.", ["True", "False"], 1, "Page 107: that is the very time to pray."], ["Knowing we are safe in Christ can even improve our physical health.", ["True", "False"], 0, "Page 108."], ["We can’t offer our bodies as a living sacrifice to God while holding on to harmful habits.", ["True", "False"], 0, "Page 108, and Romans 12:1."], ["We cannot win the victory over temptation alone.", ["True", "False"], 0, "Page 108: we have a living Saviour ready to help."], ["Victory comes mainly from our own efforts.", ["True", "False"], 1, "Pages 108–114: we do our part, but the power is Christ’s."], ["Some people just can’t resist evil.", ["True", "False"], 1, "Page 111: tell them they can, and they must, resist."], ["Anyone who joins their will to God’s will can win the victory over habits like smoking and drinking.", ["True", "False"], 0, "Page 112."], ["Jesus hears even the feeblest prayer.", ["True", "False"], 0, "Page 114."], ["Breaking the laws of health can lay the foundation for the liquor habit.", ["True", "False"], 0, "Page 115."], ["Outside Eden, people cannot resist Satan’s temptations in their own strength.", ["True", "False"], 0, "Page 121: so Christ came to give us His strength."], ["Christ refused to heal people who had brought their sickness on themselves.", ["True", "False"], 1, "Page 121: He did not refuse to heal them."], ["According to the reading, what is the only remedy for sin and harmful habits?", ["The grace and power of Christ", "Signing a pledge", "Strong willpower alone", "Quitting slowly"], 0, "Page 106."], ["What does the reading call the governing power in our nature?", ["The will: our power to choose", "Our feelings", "Our habits", "Our friends"], 0, "Pages 112–113."], ["Planning to give up a habit “by degrees” (a little at a time) is…", ["A plan that leaves you in the habit’s power", "The safest way", "What the reading recommends", "The only way that works"], 0, "Page 103."], ["How did Jesus answer every temptation?", ["“It is written”: with God’s word", "By arguing", "By running away", "By keeping silent"], 0, "Page 107."], ["What did the man in the old blue coat do after the meeting?", ["Prayed and struggled all night until he won", "Gave up the next week", "Moved away", "Bought a new coat"], 0, "Page 109."], ["What helps a person who is breaking free from a harmful habit?", ["Healthy living and useful work", "Having nothing to do", "Telling the story of their sins in public often", "Being praised as a hero"], 0, "Pages 115–116."], ["Once someone has been set free, the reading says they should…", ["Help others who are struggling", "Keep away from church", "Never talk to anyone about Jesus", "Boast about how bad they were"], 0, "Pages 116–117."], ["What happened when the fisherman gave up tea?", ["After a headache, he felt better and thought more clearly", "He couldn’t work any more", "Nothing changed", "He started again"], 0, "Page 119."], ["Jesus invites everyone who is weary and burdened to…", ["Find rest in Him", "Try harder on their own", "Hide their problems", "Wait until they are strong"], 0, "Page 120, and Matthew 11:29."], ["Hebrews 4:15 says Jesus…", ["Was tempted in all points like us, yet without sin", "Was never tempted", "Only understands adults", "Gave in to temptation once"], 0, "Page 120."]];
GAME_IDS['temperance:free'] = "Temperance · Break free";
TOPICS.story = { name: "Our Church’s Story", code: 'G4', cards: 7 };
TOPIC_QUESTIONS.story = [["How did the Adventist message first reach British Guiana?", ["Through tracts and printed pages", "Through radio", "Through television", "Through a big hospital"], 0, "Tracts came before any minister."], ["Who was the first minister the General Conference sent, arriving in Georgetown in 1887?", ["G. G. Rupert", "Ellen White", "Roy McGarrell", "O. E. Davis"], 0, "He arrived on 31 January 1887."], ["In 1895 W. G. Kneeland baptised six members of which family and organised a church?", ["The Fleming family", "The Davis family", "The Cott family", "The Giddings family"], 0, "July 1895."], ["Where did Elder Ovid E. Davis take the message in 1910 and 1911?", ["The Mount Roraima area", "Barbados", "Trinidad", "Suriname"], 0, "Far inland, near Mount Roraima."], ["Who walked to Georgetown in 1922 to ask for a teacher?", ["Chief Jeremiah", "G. G. Rupert", "Dr Duerksen", "Philip Giddings"], 0, "After Elder Davis died, the people kept asking for a teacher."], ["Davis Memorial Hospital is named after…", ["Elder Ovid E. Davis", "A city in America", "A doctor from England", "A Guyanese president"], 0, "Named in 1955."], ["Who was the first Guyanese president of the Guyana Mission (1971)?", ["Wallace W. Weithers", "G. G. Rupert", "W. G. Kneeland", "A. W. Cott"], 0, "Then in 1976 the mission became a conference."], ["The Guyana Conference belongs to which union?", ["The Caribbean Union Conference", "The Jamaica Union", "The Atlantic Union", "The South Pacific Union"], 0, "Part of the Inter-American Division."]];
GAME_IDS['story:river'] = "Our Church’s Story · Time river";
var TOPICS_SEEDED = 'v16';
/** Adds the challenge questions for any explorer that has none in the Questions tab yet (runs once per version). */
function ensureTopics_() {
  var P = PropertiesService.getScriptProperties();
  if (P.getProperty('GQ_TOPICS_SEEDED') === TOPICS_SEEDED) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    if (P.getProperty('GQ_TOPICS_SEEDED') === TOPICS_SEEDED) return;
    var q = sheet_(SHEET_Q), last = q.getLastRow(), have = {};
    if (last >= 2) q.getRange(2, 10, last - 1, 1).getValues().forEach(function (r) { have[String(r[0]).trim()] = 1; });
    var added = [];
    Object.keys(TOPIC_QUESTIONS).forEach(function (k) { if (!have[k]) { seedQuestions_(q, k); added.push(k); } });
    if (added.length) formatQuestions_(q);
    P.setProperty('GQ_TOPICS_SEEDED', TOPICS_SEEDED);
  } finally { lock.releaseLock(); }
}
/** The Learning Lab's reading room (the readings live on the website, in readings/). */
var READINGS_ = ['sc', 'da7', 'te', 'cs', 'gal5', 'friends'];
