// Supabase ile online: e-posta girişi, bulut kayıt/yükle, skor tablosu.
// publishable (anon) anahtar istemcide açıkça durur — güvenlik veritabanı
// tarafındaki RLS kurallarıyla sağlanır (herkes yalnız kendi kaydını yazabilir;
// skor tablosu herkese açık okunur).
const Cloud = (function () {
  const URL = 'https://ldkwvzjfqmewnkxmslje.supabase.co';
  const KEY = 'sb_publishable_wY1iBazBjliGwkHgtX4VHg_ddoF0J89';

  let sb = null;
  let user = null;

  function available() {
    return typeof window !== 'undefined' && window.supabase && window.supabase.createClient;
  }

  // onChange: oturum değişince UI'yi tazelemek için geri çağrı.
  function init(onChange) {
    if (!available()) return false;
    sb = window.supabase.createClient(URL, KEY);
    sb.auth.getSession().then(({ data }) => {
      user = (data && data.session && data.session.user) || null;
      if (onChange) onChange();
    });
    sb.auth.onAuthStateChange((_event, session) => {
      user = (session && session.user) || null;
      if (onChange) onChange();
    });
    return true;
  }

  function isReady() { return !!sb; }
  function getUser() { return user; }

  async function signUp(email, password) { return sb.auth.signUp({ email, password }); }
  async function signIn(email, password) { return sb.auth.signInWithPassword({ email, password }); }
  async function signOut() { return sb.auth.signOut(); }

  // Mevcut oyunu buluta yaz + skor tablosunu güncelle.
  async function saveToCloud(nickname) {
    if (!user) throw new Error('Önce giriş yap');
    const data = JSON.parse(JSON.stringify(game));
    const now = new Date().toISOString();
    const r1 = await sb.from('saves').upsert({ user_id: user.id, data, updated_at: now });
    if (r1.error) throw r1.error;
    const nick = (nickname || 'Madenci').toString().slice(0, 24);
    const r2 = await sb.from('leaderboard').upsert({
      user_id: user.id, nickname: nick,
      gems: Math.floor(game.gems), total_gold: Math.floor(game.totalGold), updated_at: now,
    });
    if (r2.error) throw r2.error;
  }

  // Buluttaki kaydı getirir (obje ya da null).
  async function loadFromCloud() {
    if (!user) throw new Error('Önce giriş yap');
    const { data, error } = await sb.from('saves').select('data').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data ? data.data : null;
  }

  // Elmasa göre en iyi `limit` oyuncu.
  async function fetchLeaderboard(limit) {
    const { data, error } = await sb.from('leaderboard')
      .select('nickname,gems,total_gold,user_id')
      .order('gems', { ascending: false }).order('total_gold', { ascending: false })
      .limit(limit || 20);
    if (error) throw error;
    return data || [];
  }

  return { available, init, isReady, getUser, signUp, signIn, signOut, saveToCloud, loadFromCloud, fetchLeaderboard };
})();
