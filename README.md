# Altın Madeni İmparatorluğu

Tarayıcıda oynanan bir **idle / artırımlı (incremental)** oyun. Saf HTML5 + CSS + vanilla JavaScript — framework yok, build adımı yok. `index.html`'i çift tıklayarak da çalışır.

**Canlı oyna:** https://fatihemin48.github.io/altin-madeni/

## Nasıl oynanır

- **KAZ!** butonuna tıklayarak elle altın kazan.
- **Üreticiler** (Kazmacı, Matkap, Vagon...) satın al; her biri saniyede otomatik altın üretir. Maliyet her alımda %15 artar.
- **Alım miktarı** (×1 / ×10 / Max) ile toplu alım yap.
- **Yükseltmeler** tıklama gücünü ya da üretimi çarpar (tek seferlik).
- Oyun otomatik kaydedilir (localStorage). Kapatıp döndüğünde madencilerin sen yokken de çalışır — **offline kazanç** (en fazla 8 saat, %50 verimle).

## Çalıştırma (yerelde)

```
python3 -m http.server 8000
```

sonra `http://localhost:8000/`. Ya da `index.html`'e çift tıkla.

## Mimari

Saf mantık (`js/game.js`) DOM'dan bağımsızdır, bu yüzden Node ile test edilebilir:

| Dosya | Amaç |
|---|---|
| `js/format.js` | Büyük sayı biçimlendirme (K/M/B/T…) + süre |
| `js/config.js` | Sabitler: `GENERATORS`, `UPGRADES`, maliyet eğrisi, offline ayarları |
| `js/game.js` | Durum + saf mantık: üretim, satın alma, tıklama, kaydet/yükle, offline |
| `js/ui.js` | DOM arayüzü (satırları kurar, sayaçları senkronlar) |
| `js/main.js` | rAF döngüsü (dt ile birikim), UI senkron, otomatik kayıt |

## Doğrulama

`node --check` tüm `js/*.js` dosyalarında; ayrıca `js/game.js` mantığı (biçimlendirme, maliyet, gps, satın alma, offline, kaydet/yükle) Node'da headless test edilir.

## Henüz kapsam dışı (sonraki sürümler)

Prestij/yeniden doğuş, başarımlar, daha fazla üretici/yükseltme, ses, istatistik ekranı.
