// Başlatma + döngüler. Üretim gerçek zamanlı dt ile birikir (sekme arkaya
// atılıp geri gelince rAF'ın büyük dt'si üretimi yakalar); UI ~10fps senkron,
// otomatik kaydetme periyodik + sekme kapanırken.

let lastTime = 0;
let uiAccum = 0;
let saveAccum = 0;

function frame(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  if (dt > 0) tick(dt);

  uiAccum += dt;
  if (uiAccum >= 0.1) { UI.sync(); uiAccum = 0; }

  saveAccum += dt;
  if (saveAccum >= AUTOSAVE_SEC) { saveGame(); UI.flashSaved(); saveAccum = 0; }

  requestAnimationFrame(frame);
}

window.addEventListener('DOMContentLoaded', () => {
  const loaded = loadGame();
  UI.init();

  if (loaded) {
    const earned = applyOffline();
    if (earned > 0) {
      const seconds = Math.min(OFFLINE_MAX_SEC, (Date.now() - game.lastSave) / 1000);
      UI.showOffline(earned, seconds);
    }
  }
  UI.sync();

  // Sekme kapanınca / arka plana atılınca kaydet (offline sayacı doğru olsun).
  window.addEventListener('beforeunload', saveGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });

  lastTime = performance.now();
  requestAnimationFrame(frame);
});
