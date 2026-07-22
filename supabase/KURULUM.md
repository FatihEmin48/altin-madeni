# Supabase kurulumu (bulut kayıt + skor tablosu)

Oyun statik (backend'siz) olduğu için online özellikler ücretsiz bir Supabase
projesiyle sağlanır. ~5 dakika. Adımlar:

## 1. Proje oluştur
1. https://supabase.com → **Sign up** (GitHub ile giriş yapılabilir).
2. **New project** → bir ad ver, bir **Database Password** belirle (bir yere not al),
   **Region**: Türkiye'ye yakın olan (ör. *Central EU (Frankfurt)*). **Create**.
3. Proje hazırlanana kadar ~2 dk bekle.

## 2. Tabloları oluştur
1. Sol menü → **SQL Editor** → **New query**.
2. `schema.sql` dosyasının içeriğini yapıştır → **Run**. (2 tablo + güvenlik kuralları oluşur.)

## 3. E-posta girişini aç (cihazlar arası yedek için)
1. **Authentication → Providers → Email**: açık olmalı (varsayılan açık).
2. **Authentication → Sign In / Providers** (veya **Settings**) → **Confirm email**
   seçeneğini **kapat** (böylece kayıt anında olur, e-posta onayı beklemezsin).
   *(İstersen açık bırakabilirsin ama o zaman kayıt sonrası e-posta onayı gerekir.)*

## 4. Anahtarları al ve paylaş
1. Sol menü → **Project Settings → API**.
2. Şunları kopyala:
   - **Project URL** (ör. `https://xxxx.supabase.co`)
   - **anon public** anahtarı (uzun bir JWT; **service_role DEĞİL!**)
3. Bu ikisini bana ver. `anon` anahtarı istemcide açıkça durur — bu normaldir,
   güvenlik RLS kurallarıyla sağlanır (herkes yalnız kendi kaydını yazabilir).

## Sonra ben ne yaparım
`js/cloud.js` modülünü + arayüzü yazarım:
- **Giriş/Kayıt** (e-posta + şifre), takma ad
- **Buluta Kaydet / Buluttan Yükle** (JSON kaydın `saves` tablosuna)
- **Skor Tablosu** paneli (elmasa göre ilk 20, kendi sıran vurgulu)

> Not: Oyun tarayıcıda çalıştığından skorlar teknik olarak elle değiştirilebilir
> (idle oyunlarda sunucu-doğrulaması zordur). Hobi/eğlence amaçlı; buna göre.
