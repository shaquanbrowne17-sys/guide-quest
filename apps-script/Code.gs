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
  G1: 'Be 15 years old and/or in Year 11 or equivalent',
  G2: 'Know and understand the AY Legion of Honour',
  G3: 'Be an active member of the Pathfinder Club',
  G4: 'Read a Teen Book Club book and a local church history book',
  SD1: 'Discuss the gifts of the Spirit from Galatians',
  SD2: 'How the sanctuary service points to the cross and Jesus',
  SD3: 'Outline and tell 3 Adventist pioneer stories at worship',
  SD4: 'Have a current Memory Gem Certificate',
  CO1: 'Friendship visit to a shut-in, or adopt a family in need',
  CO2: 'Discuss witnessing to teens and put it into practice',
  FD1: 'Examine your attitudes on two life topics',
  HF1: 'Present the laws of good health to a younger group',
  HF2: 'Fun Run with a recorded training programme',
  HF3: 'Nutrition Honour, or lead the Physical Fitness Honour',
  OL1: 'Flow chart of church organisation, with your Division',
  OL2: 'Attend a Basic Pathfinder Staff Training Course',
  OL3: 'Plan and teach 2 honour requirements to Juniors',
  NS1: 'Desire of Ages ch. 7 and an original nature parable',
  NS2: 'Ecology or Environmental Conservation Honour',
  OD1: 'Two-night pack camp, and discuss the equipment',
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
  return { done: d.done, signs: d.signs };
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
    var sh = sheet_(SHEET_PF);
    var row = findRow_(sh, t);
    if (row < 0) throw new Error('link-not-found');
    var name = String(sh.getRange(row, COL_NAME).getValue()).trim();
    var now = new Date();
    var ans = null, index = null;
    ops.forEach(function (op) {
      if (op && op.k === 'd') {
        var i = CODES.indexOf(String(op.code));
        if (i < 0) return;
        var on = op.value === true;
        sh.getRange(row, COL_REQ0 + i).setValue(on);
        if (on) tickDate_(t, name, String(op.code), 'Pathfinder');
        log_(name, (on ? 'Completed ' : 'Un-ticked ') + op.code + ' · ' + REQ[op.code]);
      } else if (op && op.k === 'a') {
        var key = String(op.key || '');
        if (!/^[A-Z]{1,2}\d\.[A-Za-z0-9.]{1,24}$/.test(key)) return;
        var code = key.split('.')[0];
        if (CODES.indexOf(code) < 0 && ADVC.indexOf(code) < 0) return;
        if (/^AV\d\.sign$/.test(key)) return; // only counsellors sign off
        var val = op.value;
        if (Array.isArray(val)) {
          val = JSON.stringify(val.slice(0, 20).map(function (x) { return x == null ? '' : String(x).slice(0, 120); }));
        } else {
          val = safe_(String(val == null ? '' : val).slice(0, ADV_LONG[key] ? 12000 : 1500));
        }
        var label = safe_(String(op.label || key).slice(0, 160));
        if (!ans) {
          ans = sheet_(SHEET_ANS);
          if (ans.getLastRow() === 0) setupAnswers_();
          index = {};
          var last = ans.getLastRow();
          if (last >= 2) {
            var tk = ans.getRange(2, 6, last - 1, 2).getValues();
            for (var j = 0; j < tk.length; j++) if (String(tk[j][0]) === t) index[String(tk[j][1])] = j + 2;
          }
        }
        if (index[key]) {
          ans.getRange(index[key], 1, 1, 5).setValues([[name, code, label, val, now]]);
        } else {
          ans.appendRow([name, code, label, val, now, t, key]);
          index[key] = ans.getLastRow();
        }
      }
    });
    sh.getRange(row, COL_UPDATED).setValue(now);
    SpreadsheetApp.flush();
    var d = questData_(t, true);
    return { ok: true, done: d.done, signs: d.signs };
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
  evRows_().forEach(function (x) { photos[x.t] = (photos[x.t] || 0) + 1; });
  return { codes: CODES, pathfinders: list, activity: act, url: baseUrl_(), now: Date.now(), parts: SANCT_PARTS.length, topics: topicList_(),
    extras: extras, attend: attendance_(meets), meetingsTotal: meets.length, evalDate: evalDate_(),
    advanced: advanced, photos: photos, record: recordSettings_(), backup: lastBackup_() };
}

function withRow_(pin, t, fn) {
  checkPin_(pin);
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
    var opts = [r[3], r[4], r[5], r[6]].map(function (x) { return String(x == null ? '' : x).trim(); });
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
'- m4 Mission 4, Two-Night Trek: OD1, OD2, OD3, HF2, SD1, FD1. A two-night pack camp: gear talk, three-course fire meal, lashed gadget, sunrise Fun Run, campfire talks.',
'- m5 Mission 5, Church Map: OL1. Class talk on church organisation, then a flow chart from the General Conference down to the local church.',
'- base Base Camp, records and honours: G1, G3, G4, SD4, OL2, HF3, NS2, OD4, LE1. Personal records and honours, checked one Guide at a time.',
'',
'# THE 24 REQUIREMENTS: what each needs, how to check it, and what covers it',
'G1 (General) Be 15 years old and/or in Year 11 (Grade 10) or equivalent. Personal: check age/grade. Never ticked by a group activity.',
'G2 (General) Know and understand the AY Legion of Honour. Done when the Guide can say it from memory and explain what each line means (eyes, ears, feet, friends, mouth, body). Objective: see how thoughts shape actions and want to honour Christ. Covered when the class recites and explains it, e.g. at a worship. Learning Lab explorer: legion.',
'G3 (General) Be an active member of the Pathfinder club: dues paid and at least 75% attendance, supporting the club and taking leadership when given. Personal; counsellor checks records.',
'G4 (General) Read a Teen Book Club book and a local church history book. Check with a short verbal report on each book. Personal.',
'SD1 (Spiritual Discovery) Discuss how a Christian can have the gifts of the Spirit as Paul describes to the Galatians (Galatians 5:22-23, the fruit of the Spirit; compare the gifts in 1 Corinthians 12, Romans 12, Ephesians 4). Objective: recognise God gives each Guide gifts and grows His character in them. Done by taking part in the discussion (often a campfire talk). Explorer: fruit.',
'SD2 (Spiritual Discovery) Learn the Old Testament sanctuary service and discuss how it points to the cross and Jesus\' ministry now in the heavenly sanctuary (Hebrews 8-9; Daniel 8:14). Parts: court, fence, gate, altar of burnt offering, laver, holy place, lampstand, table of shewbread, altar of incense, veil, most holy place, ark of the covenant. Daily service and yearly Day of Atonement. Done by studying/viewing and discussing. Explorer: Sanctuary Explorer.',
'SD3 (Spiritual Discovery) Outline and tell three Adventist pioneer stories at worship (e.g. William Miller, Hiram Edson, Joseph Bates, Ellen and James White, John Byington, J. N. Andrews). Done when each Guide has told stories in a worship. Explorer: pioneers.',
'SD4 (Spiritual Discovery) Have a current Memory Gem Certificate (pass the conference memory gem test). Personal.',
'CO1 (Community Outreach) As a group or alone, help organise and take part in: a friendship visit to a shut-in, OR adopting a person or family in need and helping them, OR another outreach approved by the leader. Done by taking part. A class visit to a shut-in, elderly or sick person, or a family-help day, covers CO1 for every Guide present.',
'CO2 (Community Outreach) Take part in a discussion on witnessing to other teenagers, then put it into practice (the app suggests bringing a teen friend on the visit and sharing a short testimony). Objective: help Guides become witnesses to their own age group. Teaching points: communication; being a real friend first; personal testimony in three parts (before Jesus, how Jesus met me, life now); a plan for a target friend; understanding barriers; inviting a decision. Only tick when the discussion happened (and, for the app, the Guide practised it).',
'FD1 (Friendship Development / Personal Growth) Examine your attitudes on two life topics through group discussion and personal thought: choosing a career, moral behaviour, sex and dating, choosing a life partner. Two topics, about two sessions each. Done by taking part. Handle with care: biblical, age-appropriate, involve parents/pastor where wise.',
'HF1 (Health and Fitness) Present the laws of good health to a younger group (NEWSTART: Nutrition, Exercise, Water, Sunlight, Temperance, Air, Rest, Trust in God). Done when the Guide has presented/taught it, e.g. at a Junior meeting. Explorer: newstart.',
'HF2 (Health and Fitness) Organise and take part in a Fun Run or similar, after keeping a recorded physical training programme (the app suggests three weeks of training, then a sunrise run at camp). Needs both the training record and the run.',
'HF3 (Health and Fitness) Earn the Nutrition Honour, or lead a group through the Physical Fitness Honour. Explorer: nutrition.',
'OL1 (Organisation and Leadership) After a class discussion, make a flow chart of how the church is organised, with details of our Division (Inter-American). Done by taking part and making the chart. Explorer: church.',
'OL2 (Organisation and Leadership) Attend a Basic Pathfinder Staff Training Course (run by the conference). Personal record.',
'OL3 (Organisation and Leadership) Plan and teach at least two requirements of an honour to younger Pathfinders. Done when taught.',
'NS1 (Nature Study) Read The Desire of Ages chapter 7 (As a Child) and relate it to nature study in Jesus\' education and ministry; then give, before an audience, an original nature lesson (parable) from your own observation. Done when the parable is presented.',
'NS2 (Nature Study) Earn the Ecology Honour or the Environmental Conservation Honour. Explorer: ecology.',
'OD1 (Outdoor Living) Take part in a two-night pack camp (everything carried in packs) and discuss the equipment beforehand. Both parts needed. Explorer: packcamp.',
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
'- LESSON PLANS: when asked for a lesson plan (for example "a lesson plan for this week"), base it on where the class is: call get_class_overview, look at guides_done_per_requirement, what most Guides still need, and upcoming_programme, and plan for the requirement(s) the class most needs next. Say which requirement(s) it covers.',
'',
'# LEARNING LAB EXPLORERS (each has lesson cards, a game and an 8-question challenge)',
'sanctuary (SD2), legion (G2), fruit (SD1), pioneers (SD3), newstart (HF1), nutrition (HF3), church (OL1), ecology (NS2), packcamp (OD1), fire (OD2), lashing (OD3), orienteering (OD4). Counsellors can add questions to any explorer.'
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
  var chal = challengeSummary_(), seen = seenSummary_(), byReq = {};
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
        meetings_attended: (att[g.t] || 0) + ' of ' + meets.length, advanced: advText_(av[g.t]) };
    }),
    guides_done_per_requirement: byReq,
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
  if (String(q.getRange(1, 10).getValue()) === 'Topic') return;
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
  return { seen: seen, best: best };
}

function learnPage_(p, data, t, base, back) {
  var tpl = HtmlService.createTemplateFromFile('Learn');
  var topic = TOPICS[p.k] && p.k !== 'sanctuary' ? String(p.k) : '';
  var st = learnState_(t, data);
  tpl.boot = JSON.stringify({
    token: data ? t : '', name: data ? data.name : '', base: base, join: !data, topic: topic,
    back: back.url, backLabel: back.label, from: String(p.from || ''),
    topics: topicList_(), seen: st.seen, best: st.best,
    questions: readQuestions_(true).filter(function (q) { return q.topic !== 'sanctuary'; })
  }).replace(/</g, '\\u003c');
  return tpl.evaluate()
    .setTitle(topic ? TOPICS[topic].name + ' · Learning Lab' : 'Guide Learning Lab')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** The Learning Lab checks a remembered token (class link). */
function l_whoami(t) {
  t = cleanToken_(t);
  var d = t ? questData_(t) : null;
  if (!d) throw new Error('link-not-found');
  var st = learnState_(t, d);
  return { token: t, name: d.name, seen: st.seen, best: st.best };
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
  api_boot: 1, p_photos: 1, p_photo: 1, p_addPhoto: 1, p_deletePhoto: 1, parent_view: 1, parent_photo: 1 };

function apiGlobal_() { return typeof globalThis !== 'undefined' ? globalThis : this; }

/** Every page on the website calls this. Body: {fn, args, base}. Counsellor functions (c_…) check the PIN themselves. */
function doPost(e) {
  var out;
  try {
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
  ['t', 'p', 'k', 'v', 'f', 'from', 'c', 'parent'].forEach(function (k) { if (q[k] != null) p[k] = String(q[k]).slice(0, 80); });
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
    var topic = TOPICS[p.k] && p.k !== 'sanctuary' ? String(p.k) : '';
    var st = learnState_(t, data);
    return { page: 'Learn', title: topic ? TOPICS[topic].name + ' · Learning Lab' : 'Guide Learning Lab', boot: {
      token: data ? t : '', name: data ? data.name : '', base: base, join: !data, topic: topic,
      back: back.url, backLabel: back.label, from: String(p.from || ''),
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
var ADV_LONG = { 'AV2.report': 1, 'AV4.essay': 1, 'AV4.outline': 1, 'AV5.reflect': 1, 'AV1.project': 1 };

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
  var cols = [[SHEET_ANS, 6], [SHEET_CH, 8], [SHEET_EV, 9], [SHEET_DATES, 5], [SHEET_PAR, 4]];
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
