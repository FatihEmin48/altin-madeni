// Oyun sabitleri. Yeni üretici/yükseltme eklemek = buraya bir obje eklemek.

const SAVE_KEY = 'altin_madeni_save';

// Üreticiler: her biri saniyede otomatik altın üretir. Maliyet her alımda
// costMult ile çarpılarak artar (klasik idle eğrisi, ×1.15).
const COST_MULT = 1.15;
const GENERATORS = [
  { id: 'kazmaci',  name: 'Kazmacı',          icon: '⛏️', baseCost: 15,     baseProd: 0.1 },
  { id: 'elarabasi', name: 'El Arabası',       icon: '🛒', baseCost: 100,    baseProd: 1 },
  { id: 'matkap',   name: 'Matkap',            icon: '🔩', baseCost: 1100,   baseProd: 8 },
  { id: 'vagon',    name: 'Maden Vagonu',      icon: '🚃', baseCost: 12000,  baseProd: 47 },
  { id: 'asansor',  name: 'Maden Asansörü',    icon: '🛗', baseCost: 130000, baseProd: 260 },
  { id: 'makine',   name: 'Kazı Makinesi',     icon: '🏗️', baseCost: 1.4e6,  baseProd: 1400 },
  { id: 'reaktor',  name: 'Elmas Reaktörü',    icon: '💎', baseCost: 20e6,   baseProd: 7800 },
  { id: 'ussu',     name: 'Maden Üssü',        icon: '🛰️', baseCost: 330e6,  baseProd: 44000 },
];

// Tek seferlik yükseltmeler. effect:
//  clickMult  → tıklama gücü çarpanı
//  prodMult   → tüm üretim çarpanı
//  genMult    → { genId: çarpan } belirli üreticinin üretim çarpanı
const UPGRADES = [
  { id: 'kazma2',   name: 'Keskin Kazma',     desc: 'Tıklama gücü ×2',        cost: 200,    effect: { clickMult: 2 } },
  { id: 'kazmaci_x3', name: 'Kazmacı Eğitimi', desc: 'Kazmacı üretimi ×3',     cost: 1000,   effect: { genMult: { kazmaci: 3 } } },
  { id: 'verim2',   name: 'Verimli İşçiler',   desc: 'Tüm üretim ×2',          cost: 5000,   effect: { prodMult: 2 } },
  { id: 'kazma3',   name: 'Elmas Uçlu Kazma',  desc: 'Tıklama gücü ×2',        cost: 25000,  effect: { clickMult: 2 } },
  { id: 'matkap_x3', name: 'Süper Matkap',     desc: 'Matkap üretimi ×3',      cost: 50000,  effect: { genMult: { matkap: 3 } } },
  { id: 'otomasyon', name: 'Otomasyon',        desc: 'Tüm üretim ×2',          cost: 250000, effect: { prodMult: 2 } },
  { id: 'ai',       name: 'Yapay Zekâ Yönetim', desc: 'Tüm üretim ×3',         cost: 5e6,    effect: { prodMult: 3 } },
  { id: 'kazma4',   name: 'Lazer Kazma',       desc: 'Tıklama gücü ×3',        cost: 1e6,    effect: { clickMult: 3 } },
];

// Prestij (Yeniden Doğuş): toplam kazanılan altına göre kalıcı 💎 elmas.
// potansiyel elmas = floor(sqrt(toplamAltın / GEM_DIVISOR)); her elmas tüm
// üretime +GEM_BONUS (%2) kalıcı çarpan verir. İlk elmas 1M toplam altında.
const GEM_DIVISOR = 1e6;
const GEM_BONUS = 0.02;

// Başarımlar (js/game.js): check(game) doğruysa kilidi açılır ve kalıcı olarak
// tüm üretime +ACH_BONUS (%1) ekler. Hedef + küçük bonus.
const ACH_BONUS = 0.01;
const ACHIEVEMENTS = [
  { id: 'click100',  name: 'Acemi Madenci',   desc: '100 kez kaz',            check: g => g.clicks >= 100 },
  { id: 'click1k',   name: 'Kaslı Kollar',    desc: '1.000 kez kaz',          check: g => g.clicks >= 1000 },
  { id: 'click10k',  name: 'Kazma Ustası',    desc: '10.000 kez kaz',         check: g => g.clicks >= 10000 },
  { id: 'gold1k',    name: 'İlk Kazanç',      desc: 'Toplam 1.000 altın',     check: g => g.totalGold >= 1000 },
  { id: 'gold1m',    name: 'Milyoner',        desc: 'Toplam 1M altın',        check: g => g.totalGold >= 1e6 },
  { id: 'gold1b',    name: 'Milyarder',       desc: 'Toplam 1B altın',        check: g => g.totalGold >= 1e9 },
  { id: 'gold1t',    name: 'Trilyoner',       desc: 'Toplam 1T altın',        check: g => g.totalGold >= 1e12 },
  { id: 'kazmaci10', name: 'Ekip Kur',        desc: '10 Kazmacı',             check: g => g.gens.kazmaci >= 10 },
  { id: 'kazmaci50', name: 'Kazmacı Ordusu',  desc: '50 Kazmacı',             check: g => g.gens.kazmaci >= 50 },
  { id: 'reaktor1',  name: 'Elmas Çağı',      desc: 'İlk Elmas Reaktörü',     check: g => g.gens.reaktor >= 1 },
  { id: 'alltypes',  name: 'Çeşitlilik',      desc: 'Her üreticiden en az 1', check: g => GENERATORS.every(x => (g.gens[x.id] || 0) >= 1) },
  { id: 'up5',       name: 'Yükseltme Sever',  desc: '5 yükseltme al',        check: g => g.upgrades.length >= 5 },
  { id: 'upall',     name: 'Tam Donanım',     desc: 'Tüm yükseltmeleri al',   check: g => g.upgrades.length >= UPGRADES.length },
  { id: 'prestige1', name: 'Yeniden Doğuş',   desc: 'İlk kez yeniden doğ',    check: g => g.gems >= 1 },
  { id: 'prestige10', name: 'Elmas Avcısı',   desc: '10 elmasa ulaş',         check: g => g.gems >= 10 },
];

const BASE_CLICK = 1;         // yükseltmesiz tıklama başına altın
// Altın külçesi: ara sıra ekranda beliren, tıklanınca ödül veren bonus.
// İki ödül türü: toplu bonus altın ya da geçici "Altın Hücumu" üretim çarpanı.
const NUGGET = {
  minInterval: 60, maxInterval: 150, // beliriş aralığı (sn)
  lifetime: 12,                      // ekranda kalma süresi (sn)
  frenzyMult: 7, frenzyDuration: 15, // hücum çarpanı ve süresi (sn)
  goldSeconds: 90, goldPct: 0.10, goldClickBonus: 10, // bonus altın hesabı
};

const OFFLINE_MAX_SEC = 8 * 3600; // en fazla 8 saatlik offline kazanç
const OFFLINE_RATE = 0.5;     // offline kazanç, aktif üretimin %50'si
const AUTOSAVE_SEC = 15;
