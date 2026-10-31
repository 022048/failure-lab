// 진행 상황 저장 (localStorage가 막힌 환경에서도 게임이 동작하도록 모든 접근을 보호)
const KEY = 'casefiles.v1';
let mem = {};

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return mem; }
}
function write(obj) {
  mem = obj;
  try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch { /* 저장 불가 환경: 메모리만 사용 */ }
}

export const store = {
  case(id) { return read()[id] || { best: 0, rank: null, done: false, runs: 0 }; },
  saveCase(id, patch) { const all = read(); all[id] = { ...(all[id] || { best: 0, rank: null, done: false, runs: 0 }), ...patch }; write(all); },
  get(key, fallback) { const v = read()._prefs?.[key]; return v === undefined ? fallback : v; },
  set(key, val) { const all = read(); all._prefs = { ...(all._prefs || {}), [key]: val }; write(all); },
  reset() { write({}); },
};
