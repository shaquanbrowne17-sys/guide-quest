/* Class rooms on Firebase (loaded only when someone plays with their class).
   Anonymous sign-in, no emails or passwords. The database rules (rules.json) only allow rooms/<CODE>/{meta, players/<uid>, chat/<id>}:
   names are letters only, and chat is a number that picks one of the ready-made phrases. */
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, set, get, update, push, onValue, onChildAdded, onDisconnect, query, limitToLast, serverTimestamp, off } from 'firebase/database';
import { FIREBASE } from './firebase-config.js';

let app = null, db = null, uid = null, offset = 0;
export async function connect() {
  if (uid) return uid;
  app = initializeApp(FIREBASE); const auth = getAuth(app); db = getDatabase(app);
  const cred = await signInAnonymously(auth); uid = cred.user.uid;
  onValue(ref(db, '.info/serverTimeOffset'), s => { offset = s.val() || 0; });
  return uid;
}
export const now = () => Date.now() + offset;
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCode() { let c = ''; for (let i = 0; i < 5; i++) c += ABC[Math.floor(Math.random() * ABC.length)]; return c; }
export const cleanCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
export const cleanName = n => String(n || '').replace(/[^A-Za-z .'-]/g, '').replace(/^[^A-Za-z]+/, '').slice(0, 24).trim();

export class Room {
  constructor(code, game) { this.code = code; this.game = game; this.players = {}; this.meta = null; this.cb = {}; this.subs = []; }
  path(p) { return ref(db, 'rooms/' + this.code + (p ? '/' + p : '')); }
  async host(seed) {
    this.isHost = true; this.meta = { host: uid, game: this.game, at: now(), state: 'lobby', seed };
    await set(this.path('meta'), this.meta); onDisconnect(this.path('meta')).remove(); return this;
  }
  async join() {
    const m = (await get(this.path('meta'))).val();
    if (!m || m.game !== this.game) throw new Error('nomatch');
    if (m.state !== 'lobby') throw new Error('started');
    const ps = (await get(this.path('players'))).val() || {}; if (Object.keys(ps).length >= 8 && !ps[uid]) throw new Error('full');
    this.meta = m; this.isHost = m.host === uid; return this;
  }
  listen(on) {
    this.cb = on;
    const a = onValue(this.path('meta'), s => { this.meta = s.val(); on.meta && on.meta(this.meta); });
    const b = onValue(this.path('players'), s => { this.players = s.val() || {}; on.players && on.players(this.players); });
    const c = onChildAdded(query(this.path('chat'), limitToLast(10)), s => { const v = s.val(); if (v && on.chat) on.chat(v); });
    this.subs.push(() => off(this.path('meta')), () => off(this.path('players')), () => off(query(this.path('chat'), limitToLast(10))));
    void a; void b; void c;
  }
  async me(state) { const p = this.path('players/' + uid); await set(p, state); if (!this.dc) { this.dc = true; onDisconnect(p).remove(); } }
  send(state) { return set(this.path('players/' + uid), state).catch(() => {}); }
  say(i) { return push(this.path('chat'), { u: uid, p: i, t: serverTimestamp() }).catch(() => {}); }
  async start(seed, at) { this.meta = Object.assign({}, this.meta, { state: 'run', seed, start: at, at: now() }); await update(this.path('meta'), { state: 'run', seed, start: at, at: now() }); }
  async finish() { if (this.isHost) await update(this.path('meta'), { state: 'done', at: now() }).catch(() => {}); }
  async back() { if (this.isHost) await update(this.path('meta'), { state: 'lobby', at: now() }).catch(() => {}); }
  leave() { this.subs.forEach(f => { try { f(); } catch (e) { /* gone */ } }); this.subs = []; set(this.path('players/' + uid), null).catch(() => {}); if (this.isHost) set(this.path('meta'), null).catch(() => {}); }
  get uid() { return uid; }
}
