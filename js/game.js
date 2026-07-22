// Oyun durumu + saf mantık (satın alma, üretim, kaydet/yükle, offline kazanç).
// DOM'a dokunmaz (UI ayrı), böylece Node ile de test edilebilir.

function createState() {
  const gens = {};
  for (const g of GENERATORS) gens[g.id] = 0;
  return {
    gold: 0,
    totalGold: 0,   // ömür boyu üretilen (prestij eğrisini besler, sıfırlanmaz)
    gems: 0,        // prestij parası (💎), kalıcı
    achievements: [], // açılan başarım id'leri (kalıcı)
    clicks: 0,
    gens,
    upgrades: [],   // satın alınan yükseltme id'leri
    lastSave: Date.now(),
  };
}

let game = createState();

function hasUpgrade(id) { return game.upgrades.indexOf(id) !== -1; }

// --- Çarpan hesapları (satın alınan yükseltmelerden) ---
function getClickMult() {
  let m = 1;
  for (const u of UPGRADES) if (hasUpgrade(u.id) && u.effect.clickMult) m *= u.effect.clickMult;
  return m;
}
function getGlobalProdMult() {
  let m = 1;
  for (const u of UPGRADES) if (hasUpgrade(u.id) && u.effect.prodMult) m *= u.effect.prodMult;
  return m;
}
function getGenMult(genId) {
  let m = 1;
  for (const u of UPGRADES) if (hasUpgrade(u.id) && u.effect.genMult && u.effect.genMult[genId]) m *= u.effect.genMult[genId];
  return m;
}

// Prestij çarpanı: sahip olunan her elmas tüm üretime +GEM_BONUS.
function getPrestigeMult() { return 1 + game.gems * GEM_BONUS; }
// Başarım çarpanı: açılan her başarım tüm üretime +ACH_BONUS.
function getAchievementMult() { return 1 + game.achievements.length * ACH_BONUS; }

function getClickValue() { return BASE_CLICK * getClickMult() * getPrestigeMult() * getAchievementMult(); }

// Karşılanan başarımların kilidini açar; yeni açılanları dizi olarak döndürür.
function checkAchievements() {
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (game.achievements.indexOf(a.id) !== -1) continue;
    let ok = false;
    try { ok = !!a.check(game); } catch (e) { ok = false; }
    if (ok) { game.achievements.push(a.id); newly.push(a); }
  }
  return newly;
}

// Tek bir üreticinin saniyelik üretimi (sahip olunan × taban × çarpanlar).
function genProduction(genId) {
  const def = GENERATORS.find(g => g.id === genId);
  const owned = game.gens[genId] || 0;
  return owned * def.baseProd * getGenMult(genId) * getGlobalProdMult() * getPrestigeMult() * getAchievementMult();
}

// Toplam altın/saniye.
function getGps() {
  let total = 0;
  for (const g of GENERATORS) total += genProduction(g.id);
  return total;
}

// `count` adet üreticiyi (mevcut sahiplikten itibaren) almanın toplam maliyeti.
function genBulkCost(genId, count) {
  const def = GENERATORS.find(g => g.id === genId);
  const owned = game.gens[genId] || 0;
  // Geometrik toplam: baseCost·mult^owned·(mult^count − 1)/(mult − 1)
  const first = def.baseCost * Math.pow(COST_MULT, owned);
  return first * (Math.pow(COST_MULT, count) - 1) / (COST_MULT - 1);
}

// Mevcut altınla en fazla kaç adet alınabilir.
function genMaxAffordable(genId) {
  const def = GENERATORS.find(g => g.id === genId);
  const owned = game.gens[genId] || 0;
  const first = def.baseCost * Math.pow(COST_MULT, owned);
  if (game.gold < first) return 0;
  // gold ≥ first·(mult^k − 1)/(mult − 1) → k çöz
  const k = Math.log(game.gold * (COST_MULT - 1) / first + 1) / Math.log(COST_MULT);
  return Math.max(0, Math.floor(k));
}

// amount: sayı ya da 'max'. Karşılanabildiği kadarını satın alır.
function buyGenerator(genId, amount) {
  let count = amount === 'max' ? genMaxAffordable(genId) : amount;
  if (count <= 0) return 0;
  const cost = genBulkCost(genId, count);
  if (game.gold < cost) {
    // 'max' zaten sığar; sabit sayıda ve para yetmiyorsa sığan kadarını dene
    count = Math.min(count, genMaxAffordable(genId));
    if (count <= 0) return 0;
  }
  const finalCost = genBulkCost(genId, count);
  if (game.gold < finalCost) return 0;
  game.gold -= finalCost;
  game.gens[genId] += count;
  return count;
}

function buyUpgrade(id) {
  const u = UPGRADES.find(x => x.id === id);
  if (!u || hasUpgrade(id) || game.gold < u.cost) return false;
  game.gold -= u.cost;
  game.upgrades.push(id);
  return true;
}

// Toplam kazanılan altına göre ulaşılabilecek toplam elmas.
function potentialGems() { return Math.floor(Math.sqrt(Math.max(0, game.totalGold) / GEM_DIVISOR)); }
// Şimdi yeniden doğunca kazanılacak elmas (henüz alınmamış kısım).
function pendingGems() { return Math.max(0, potentialGems() - game.gems); }
// Bir sonraki elmas için gereken toplam altın (ipucu için).
function goldForNextGem() { return Math.pow(potentialGems() + 1, 2) * GEM_DIVISOR; }

// Yeniden doğ: bekleyen elması al, run ilerlemesini (altın/üretici/yükseltme)
// sıfırla; elmas + toplam altın (+ ileride başarımlar) kalıcıdır.
function prestige() {
  const gain = pendingGems();
  if (gain <= 0) return 0;
  game.gems += gain;
  game.gold = 0;
  for (const g of GENERATORS) game.gens[g.id] = 0;
  game.upgrades = [];
  return gain;
}

function clickMine() {
  const v = getClickValue();
  game.gold += v;
  game.totalGold += v;
  game.clicks += 1;
  return v;
}

// dt saniye kadar otomatik üretim ekler.
function tick(dt) {
  const g = getGps() * dt;
  game.gold += g;
  game.totalGold += g;
}

// --- Kaydet / yükle / offline ---
function saveGame() {
  game.lastSave = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch (e) { /* yok */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return false;
    const s = createState();
    s.gold = +d.gold || 0;
    s.totalGold = +d.totalGold || 0;
    s.gems = +d.gems || 0;
    if (Array.isArray(d.achievements)) s.achievements = d.achievements.filter(id => ACHIEVEMENTS.some(a => a.id === id));
    s.clicks = +d.clicks || 0;
    s.lastSave = +d.lastSave || Date.now();
    if (d.gens && typeof d.gens === 'object') for (const g of GENERATORS) s.gens[g.id] = +d.gens[g.id] || 0;
    if (Array.isArray(d.upgrades)) s.upgrades = d.upgrades.filter(id => UPGRADES.some(u => u.id === id));
    game = s;
    return true;
  } catch (e) {
    return false;
  }
}

// Kayıttan bu yana geçen süre için (sınırlı ve indirimli) offline kazanç.
// Dönüş: eklenen altın miktarı (0 ise popup gösterme).
function applyOffline() {
  const elapsed = Math.min(OFFLINE_MAX_SEC, (Date.now() - game.lastSave) / 1000);
  if (elapsed < 1) return 0;
  const earned = getGps() * elapsed * OFFLINE_RATE;
  game.gold += earned;
  game.totalGold += earned;
  return earned;
}

function hardReset() {
  game = createState();
  saveGame();
}
