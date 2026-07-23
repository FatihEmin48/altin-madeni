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
  { id: 'magma',    name: 'Magma Kuyusu',      icon: '🌋', baseCost: 5.5e9,  baseProd: 260000 },
  { id: 'yorunge',  name: 'Yörünge Madeni',    icon: '🪐', baseCost: 90e9,   baseProd: 1.5e6 },
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
  { id: 'vagon_x3', name: 'Raylı Sistem',      desc: 'Maden Vagonu üretimi ×3', cost: 3e5,   effect: { genMult: { vagon: 3 } } },
  { id: 'kuantum',  name: 'Kuantum Sondaj',    desc: 'Tüm üretim ×3',          cost: 5e7,    effect: { prodMult: 3 } },
  { id: 'kazma5',   name: 'Antimadde Kazma',   desc: 'Tıklama gücü ×3',        cost: 1e8,    effect: { clickMult: 3 } },
  { id: 'reaktor_x3', name: 'Füzyon Çekirdeği', desc: 'Elmas Reaktörü üretimi ×3', cost: 1.5e8, effect: { genMult: { reaktor: 3 } } },
  { id: 'galaktik', name: 'Galaktik Ağ',       desc: 'Tüm üretim ×5',          cost: 2e9,    effect: { prodMult: 5 } },
  { id: 'magma_x3', name: 'Termal Zırh',       desc: 'Magma Kuyusu üretimi ×3', cost: 5e10,  effect: { genMult: { magma: 3 } } },
];

// Prestij (Yeniden Doğuş): toplam kazanılan altına göre kalıcı 💎 elmas.
// potansiyel elmas = floor(sqrt(toplamAltın / GEM_DIVISOR)); her elmas tüm
// üretime +GEM_BONUS (%2) kalıcı çarpan verir. İlk elmas 1M toplam altında.
const GEM_DIVISOR = 1e6;
const GEM_BONUS = 0.02;

// Elmas Dükkânı (prestij yükseltmeleri): elmas HARCANARAK alınan kalıcı, kademeli
// perkler. Her satın alma seviyeyi 1 artırır ve maliyet costMult ile büyür:
//   sonraki seviye maliyeti = ceil(baseCost · costMult^mevcutSeviye)
// `per` her seviyenin etki miktarıdır (etki game.js'teki getter'larda uygulanır).
// Not: elmaslar harcansa bile pasif +%2 bonus ve skor "ömür boyu" (gemsClaimed)
// üzerinden hesaplanır — harcamak seni geriletmez.
const GEM_SHOP = [
  { id: 'crit_chance', icon: '🎯', name: 'Şanslı El',      desc: 'Kritik şansı +%2',              baseCost: 2, costMult: 2,   maxLevel: 10, per: 0.02 },
  { id: 'crit_power',  icon: '💥', name: 'Ağır Darbe',     desc: 'Kritik çarpanı +5',             baseCost: 3, costMult: 2,   maxLevel: 8,  per: 5 },
  { id: 'prod',        icon: '⚙️', name: 'Elmas Dişliler',  desc: 'Tüm üretim +%10',               baseCost: 3, costMult: 1.8, maxLevel: 15, per: 0.10 },
  { id: 'offline',     icon: '🌙', name: 'Gece Vardiyası',  desc: 'Offline verimi +%5',            baseCost: 2, costMult: 2,   maxLevel: 10, per: 0.05 },
  { id: 'nugget',      icon: '💫', name: 'Altın Sezgi',     desc: 'Külçe daha sık belirir (-%8)',  baseCost: 3, costMult: 2.2, maxLevel: 6,  per: 0.08 },
  { id: 'start_gold',  icon: '💰', name: 'Miras',           desc: 'Yeniden doğunca başlangıç altını', baseCost: 4, costMult: 3, maxLevel: 12, per: 10 },
];

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
  { id: 'prestige1', name: 'Yeniden Doğuş',   desc: 'İlk kez yeniden doğ',    check: g => g.gemsClaimed >= 1 },
  { id: 'prestige10', name: 'Elmas Avcısı',   desc: '10 elmasa ulaş',         check: g => g.gemsClaimed >= 10 },
  { id: 'prestige50', name: 'Elmas Kralı',    desc: '50 elmasa ulaş',         check: g => g.gemsClaimed >= 50 },
  { id: 'gold1q',    name: 'Katrilyoner',     desc: 'Toplam 1 katrilyon altın', check: g => g.totalGold >= 1e15 },
  { id: 'magma1',    name: 'Yerin Derinliği', desc: 'İlk Magma Kuyusu',       check: g => g.gens.magma >= 1 },
  { id: 'yorunge1',  name: 'Uzay Çağı',       desc: 'İlk Yörünge Madeni',     check: g => g.gens.yorunge >= 1 },
  { id: 'gen100',    name: 'Sanayi Devrimi',  desc: 'Toplam 100 üretici',     check: g => GENERATORS.reduce((s, x) => s + (g.gens[x.id] || 0), 0) >= 100 },
  { id: 'gen500',    name: 'Maden İmparatoru', desc: 'Toplam 500 üretici',    check: g => GENERATORS.reduce((s, x) => s + (g.gens[x.id] || 0), 0) >= 500 },
];

// Üretici kilometre taşları: bir üreticiden belirli sayıda toplanınca o
// üreticinin üretimi kalıcı olarak MILESTONE_MULT ile çarpılır (her eşikte bir
// kez). Tek üreticiye yatırımı ödüllendirir. Türetilmiştir → kayıt gerektirmez.
const GEN_MILESTONES = [25, 50, 100, 150, 200, 250, 300, 400, 500];
const MILESTONE_MULT = 2;

const BASE_CLICK = 1;         // yükseltmesiz tıklama başına altın
// Kritik tıklama: elle KAZ!'a her tıklamada CRIT_CHANCE olasılıkla vuruş
// "kritik" olur ve altın CRIT_MULT ile çarpılır. Aktif oynamayı ödüllendirir;
// otomatik üretim/oto-tıklayıcı kritik yapmaz (sadece manuel).
const CRIT_CHANCE = 0.05;     // %5 kritik şansı
const CRIT_MULT = 10;         // kritik vuruşta altın ×10
// Altın külçesi: ara sıra ekranda beliren, tıklanınca ödül veren bonus.
// İki ödül türü: toplu bonus altın ya da geçici "Altın Hücumu" üretim çarpanı.
const NUGGET = {
  minInterval: 60, maxInterval: 150, // beliriş aralığı (sn)
  lifetime: 12,                      // ekranda kalma süresi (sn)
  frenzyMult: 7, frenzyDuration: 15, // hücum çarpanı ve süresi (sn)
  goldSeconds: 90, goldPct: 0.10, goldClickBonus: 10, // bonus altın hesabı
};

// Otomasyon (tek seferlik satın alınır): oto-tıklayıcı saniyede birkaç kez
// otomatik kazar; oto-alıcı (açık/kapalı) periyodik olarak en ucuz üreticiyi alır.
const AUTOMATION = {
  autoClickCost: 50000, autoClickRate: 5,
  autoBuyerCost: 2e6,   autoBuyInterval: 1.0,
};

// Rastgele mini etkinlikler: oynarken ara sıra kendiliğinden başlayan süreli
// çarpanlar (üretim ya da tıklama). weight = seçilme ağırlığı. Frenzy'den ayrı
// bir sistemdir ve onunla çarpım olarak birikir.
const EVENTS = {
  minInterval: 120, maxInterval: 240, // etkinlik beliriş aralığı (sn)
  list: [
    { id: 'senlik', icon: '🎉', name: 'Maden Şenliği',   desc: 'Üretim ×2',   dur: 30, prodMult: 2,   weight: 3 },
    { id: 'pazar',  icon: '📈', name: 'Pazar Yükselişi', desc: 'Üretim ×2.5', dur: 25, prodMult: 2.5, weight: 2 },
    { id: 'damar',  icon: '💰', name: 'Altın Damarı',    desc: 'Üretim ×3',   dur: 20, prodMult: 3,   weight: 2 },
    { id: 'ates',   icon: '🔥', name: 'Tıklama Ateşi',   desc: 'Tıklama ×5',  dur: 20, clickMult: 5, weight: 2 },
  ],
};

const OFFLINE_MAX_SEC = 8 * 3600; // en fazla 8 saatlik offline kazanç
const OFFLINE_RATE = 0.5;     // offline kazanç, aktif üretimin %50'si
const AUTOSAVE_SEC = 15;      // yerel (localStorage) otomatik kayıt aralığı
const CLOUD_AUTOSAVE_SEC = 45; // girişliyken buluta otomatik kayıt aralığı
