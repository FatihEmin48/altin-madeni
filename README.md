# Altın Madeni İmparatorluğu

Tarayıcıda oynanan bir **idle / artırımlı (incremental)** oyun. Saf HTML5 + CSS + vanilla JavaScript — framework yok, build adımı yok. `index.html`'i çift tıklayarak da çalışır.

**Canlı oyna:** https://fatihemin48.github.io/altin-madeni/

## Nasıl oynanır

- **KAZ!** butonuna tıklayarak elle altın kazan.
- **Üreticiler** (Kazmacı, Matkap, Vagon...) satın al; her biri saniyede otomatik altın üretir. Maliyet her alımda %15 artar.
- **Alım miktarı** (×1 / ×10 / Max) ile toplu alım yap.
- **Yükseltmeler** tıklama gücünü ya da üretimi çarpar (tek seferlik).
- **Başarımlar** (tıklama/altın/üretici kilometre taşları) açıldıkça bildirim çıkar ve her biri tüm üretime kalıcı **+%1** ekler.
- **Altın külçesi:** Ara sıra ekranda parlayan bir külçe belirir; tıklarsan ya toplu **bonus altın** ya da geçici **Altın Hücumu** (üretim ×7, 15 sn) kazanırsın. Aktif oynamayı ödüllendirir.
- **Otomasyon:** **Oto-Tıklayıcı** (saniyede otomatik kazar) ve **Oto-Alıcı** (açık/kapalı; en ucuz üreticiyi otomatik satın alır) satın alınabilir.
- **İstatistikler:** Toplam altın, altın/sn, tıklama, elmas/bonuslar, üretici sayısı, oynama süresi.
- **Online (Supabase):** E-posta ile giriş/kayıt → **buluta kaydet / buluttan yükle** (cihazlar arası yedek) ve **skor tablosu** (elmasa göre ilk 20). Kurulum: `supabase/KURULUM.md` + `supabase/schema.sql`. İstemcideki `publishable` anahtar güvenlidir; erişim RLS ile korunur.
- **Yeniden Doğuş (prestij):** Yeterince altın biriktirince (1M+) her şeyi sıfırlayıp kalıcı **💎 elmas** kazanırsın; her elmas tüm üretime **+%2** kalıcı çarpan verir. Elmaslar toplam kazanılan altına göre hesaplanır ve sıfırlanmaz.
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

Ses/müzik, kaydı dışa/içe aktar, kritik tıklama, daha fazla üretici/yükseltme katmanı.
