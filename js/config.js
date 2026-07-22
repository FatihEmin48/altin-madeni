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

const BASE_CLICK = 1;         // yükseltmesiz tıklama başına altın
const OFFLINE_MAX_SEC = 8 * 3600; // en fazla 8 saatlik offline kazanç
const OFFLINE_RATE = 0.5;     // offline kazanç, aktif üretimin %50'si
const AUTOSAVE_SEC = 15;
