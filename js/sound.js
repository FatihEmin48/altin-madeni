// Basit ses efektleri — Web Audio ile anlık sentezlenir (ses dosyası yok).
// Tarayıcı otomatik-oynatma politikası gereği AudioContext ilk kullanıcı
// etkileşiminde (ilk play çağrısında) kurulur. Mute tercihi localStorage'da.
const Sound = (function () {
  const MUTE_KEY = 'am_muted';
  let ctx = null;
  let master = null;
  let enabled = true;
  try { enabled = localStorage.getItem(MUTE_KEY) !== '1'; } catch (e) { /* yok */ }

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.25;   // genel ses seviyesi (kulak dostu)
    master.connect(ctx.destination);
    return ctx;
  }

  // Tek bir zarflı ton çalar. freq: Hz (sabit ya da [baş, son] glide),
  // dur: saniye, type: osilatör tipi, vol: 0..1, delay: başlama gecikmesi (sn).
  function tone(freq, dur, type, vol, delay) {
    if (!ensureCtx()) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* yok */ } }
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    if (Array.isArray(freq)) {
      osc.frequency.setValueAtTime(freq[0], t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq[1]), t0 + dur);
    } else {
      osc.frequency.setValueAtTime(freq, t0);
    }
    const v = (vol == null ? 1 : vol);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.008);           // hızlı atak
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);        // yumuşak sönüm
    osc.connect(g); g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // İsimlendirilmiş efektler.
  const fx = {
    click:       () => tone(660, 0.06, 'square', 0.5),
    crit:        () => { tone(880, 0.10, 'sawtooth', 0.7); tone(1320, 0.12, 'square', 0.5, 0.05); },
    buy:         () => { tone(520, 0.08, 'triangle', 0.6); tone(780, 0.10, 'triangle', 0.5, 0.06); },
    nugget:      () => { tone([700, 1400], 0.18, 'sine', 0.6); tone(1760, 0.12, 'sine', 0.4, 0.10); },
    achievement: () => { tone(523, 0.10, 'triangle', 0.6); tone(659, 0.10, 'triangle', 0.6, 0.10); tone(784, 0.16, 'triangle', 0.6, 0.20); },
    prestige:    () => { tone(392, 0.14, 'sine', 0.6); tone(523, 0.14, 'sine', 0.6, 0.10); tone(784, 0.24, 'sine', 0.6, 0.22); },
  };

  function play(name) {
    if (!enabled) return;
    const f = fx[name];
    if (f) { try { f(); } catch (e) { /* sesli hata sessiz geçilir */ } }
  }

  function isEnabled() { return enabled; }
  function toggle() {
    enabled = !enabled;
    try { localStorage.setItem(MUTE_KEY, enabled ? '0' : '1'); } catch (e) { /* yok */ }
    if (enabled) play('click');  // açınca kısa geri bildirim
    return enabled;
  }

  return { play, toggle, isEnabled };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { Sound };
