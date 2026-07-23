// DOM arayüzü: üretici/yükseltme satırlarını bir kez kurar, her sync'te
// sayıları/karşılanabilirliği günceller (listeyi her seferinde yeniden kurmaz).
const UI = (function () {
  let els = {};
  let buyAmount = 1; // 1 | 10 | 'max'
  const genRows = {};
  const upRows = {};
  const gemRows = {};

  // innerHTML'i yalnızca DEĞİŞTİĞİNDE yazar. sync() 10/sn çalıştığı için
  // değişmeyen satırları her karede yeniden kurmak (özellikle mobilde) ana iş
  // parçacığını doldurup dokunmayı geciktiriyordu; bu onu önler.
  function setHTML(el, html) { if (el.__h !== html) { el.__h = html; el.innerHTML = html; } }

  function init() {
    els.gold = document.getElementById('gold');
    els.gps = document.getElementById('gps');
    els.clickVal = document.getElementById('click-val');
    els.mineBtn = document.getElementById('mine-btn');
    els.clickFx = document.getElementById('click-fx');
    els.generators = document.getElementById('generators');
    els.upgrades = document.getElementById('upgrades');
    els.saveStatus = document.getElementById('save-status');
    els.offlinePopup = document.getElementById('offline-popup');
    els.offlineText = document.getElementById('offline-text');
    els.prestigeInfo = document.getElementById('prestige-info');
    els.prestigeBtn = document.getElementById('prestige-btn');
    els.gemshop = document.getElementById('gemshop');
    els.gemshopBal = document.getElementById('gemshop-bal');
    els.achievements = document.getElementById('achievements');
    els.achCount = document.getElementById('ach-count');
    els.toast = document.getElementById('toast');
    els.frenzyBanner = document.getElementById('frenzy-banner');
    els.automation = document.getElementById('automation');
    els.stats = document.getElementById('stats');
    els.cloudStatus = document.getElementById('cloud-status');
    els.cloudLoggedout = document.getElementById('cloud-loggedout');
    els.cloudLoggedin = document.getElementById('cloud-loggedin');
    els.cloudEmail = document.getElementById('cloud-email');
    els.cloudPass = document.getElementById('cloud-pass');
    els.cloudNick = document.getElementById('cloud-nick');
    els.leaderboard = document.getElementById('leaderboard');

    // Kazma: masaüstünde click, dokunmatikte touchstart (preventDefault ile
    // hem çift-dokun zoom'unu hem emüle edilen click'i engeller → çift saymaz).
    function doMine(pointer) {
      const r = clickMine();
      spawnClickFx(r.amount, pointer, r.crit);
      Sound.play(r.crit ? 'crit' : 'click');
    }
    els.mineBtn.addEventListener('click', (e) => doMine(e));
    els.mineBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      doMine(e.changedTouches[0]);
    }, { passive: false });

    document.querySelectorAll('.amt-btn').forEach(b => {
      b.addEventListener('click', () => {
        const a = b.getAttribute('data-amt');
        buyAmount = a === 'max' ? 'max' : parseInt(a, 10);
        document.querySelectorAll('.amt-btn').forEach(x => x.classList.toggle('active', x === b));
        syncGenerators();
      });
    });

    els.soundBtn = document.getElementById('sound-btn');
    const syncSoundBtn = () => {
      const on = Sound.isEnabled();
      els.soundBtn.textContent = on ? '🔊' : '🔇';
      els.soundBtn.classList.toggle('muted', !on);
    };
    els.soundBtn.addEventListener('click', () => { Sound.toggle(); syncSoundBtn(); });
    syncSoundBtn();

    els.saveCode = document.getElementById('save-code');
    els.backupStatus = document.getElementById('backup-status');
    document.getElementById('export-btn').addEventListener('click', doExport);
    document.getElementById('import-btn').addEventListener('click', doImport);

    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('Tüm ilerlemen silinsin mi? Bu geri alınamaz.')) {
        hardReset();
        buildGenerators();
        buildUpgrades();
        syncGemShop();
      }
    });
    document.getElementById('offline-close').addEventListener('click', () => {
      els.offlinePopup.classList.add('hidden');
    });
    els.prestigeBtn.addEventListener('click', () => {
      const p = pendingGems();
      if (p <= 0) return;
      if (confirm(`Yeniden doğ: +${formatNum(p)} 💎 elmas kazanacaksın. Altının, üreticilerin ve yükseltmelerin sıfırlanacak (elmasların kalıcı). Emin misin?`)) {
        prestige();
        Sound.play('prestige');
        syncGenerators();
        syncUpgrades();
        syncPrestige();
        syncGemShop();
      }
    });

    buildGenerators();
    buildUpgrades();
    buildAchievements();
    buildAutomation();
    buildGemShop();
    initCloud();
  }

  const NICK_KEY = 'am_nick';
  function cloudMsg(text, ok) {
    els.cloudStatus.textContent = text || '';
    els.cloudStatus.className = ok ? 'ok' : (text ? 'err' : '');
  }

  function initCloud() {
    document.getElementById('cloud-signup').addEventListener('click', () => cloudAuth('signup'));
    document.getElementById('cloud-signin').addEventListener('click', () => cloudAuth('signin'));
    document.getElementById('cloud-signout').addEventListener('click', async () => { await Cloud.signOut(); cloudMsg('Çıkış yapıldı'); });
    document.getElementById('cloud-save').addEventListener('click', cloudSave);
    document.getElementById('cloud-load').addEventListener('click', cloudLoad);
    document.getElementById('lb-refresh').addEventListener('click', refreshLeaderboard);
    try { els.cloudNick.value = localStorage.getItem(NICK_KEY) || ''; } catch (e) { /* yok */ }

    if (!Cloud.available()) { cloudMsg('Online şu an kullanılamıyor (bağlantı yok).'); return; }
    Cloud.init(syncCloud);
  }

  async function cloudAuth(mode) {
    const email = els.cloudEmail.value.trim();
    const pass = els.cloudPass.value;
    if (!email || !pass) { cloudMsg('E-posta ve şifre gerekli'); return; }
    cloudMsg('...');
    try {
      const { data, error } = mode === 'signup' ? await Cloud.signUp(email, pass) : await Cloud.signIn(email, pass);
      if (error) { cloudMsg('Hata: ' + error.message); return; }
      if (mode === 'signup' && !(data && data.session)) cloudMsg('Kayıt oldu — e-posta onayı gerekiyor olabilir.', true);
      else cloudMsg('', true);
    } catch (e) { cloudMsg('Hata: ' + (e.message || e)); }
  }

  // İki durumun ilerleme özetini uyarı metni için biçimler.
  function progressLine(s) {
    return `💎 ${formatNum((s && s.gems) || 0)} · toplam ${formatNum((s && s.totalGold) || 0)} altın`;
  }

  async function cloudSave() {
    const nick = (els.cloudNick.value || '').trim() || 'Madenci';
    try { localStorage.setItem(NICK_KEY, nick); } catch (e) { /* yok */ }
    cloudMsg('Kaydediliyor...');
    try {
      saveGame();
      // Üzerine yazma koruması: buluttaki kayıt seninkinden ileriyse uyar.
      let cloudData = null;
      try { cloudData = await Cloud.loadFromCloud(); } catch (e) { cloudData = null; }
      if (cloudData && compareProgress(game, cloudData) < 0) {
        const ok = confirm(
          `⚠️ Buluttaki kayıt seninkinden daha İLERİ görünüyor:\n\n` +
          `Bulut:  ${progressLine(cloudData)}\n` +
          `Senin:  ${progressLine(game)}\n\n` +
          `Üzerine yazarsan buluttaki ileri kayıt SİLİNİR. ` +
          `(Genelde bu cihazda önce "⬇️ Buluttan Yükle" demelisin.)\n\n` +
          `Yine de üzerine yazılsın mı?`
        );
        if (!ok) { cloudMsg('Kayıt iptal edildi — buluttaki ileri kayıt korundu.'); return; }
      }
      await Cloud.saveToCloud(nick);
      cloudMsg('☁️ Buluta kaydedildi', true);
      showToast('☁️ Buluta kaydedildi');
      refreshLeaderboard();
    } catch (e) { cloudMsg('Kayıt hatası: ' + (e.message || e)); }
  }

  async function cloudLoad() {
    cloudMsg('Yükleniyor...');
    try {
      const data = await Cloud.loadFromCloud();
      if (!data) { cloudMsg('Bulutta kayıt bulunamadı'); return; }
      // Geri gitme koruması: buluttaki kayıt seninkinden geriyse ekstra uyar.
      const behind = compareProgress(data, game) < 0;
      const msg = behind
        ? `⚠️ Buluttaki kayıt seninkinden daha GERİ görünüyor:\n\n` +
          `Bulut:  ${progressLine(data)}\n` +
          `Senin:  ${progressLine(game)}\n\n` +
          `Yüklersen mevcut ilerlemen GERİLER. Yine de yüklensin mi?`
        : 'Buluttaki kayıt yüklenecek; mevcut ilerlemenin üzerine yazılır. Emin misin?';
      if (!confirm(msg)) { cloudMsg('Yükleme iptal edildi.'); return; }
      applySaveData(data);
      saveGame();
      sync();
      syncAchievements();
      cloudMsg('⬇️ Buluttan yüklendi', true);
      showToast('⬇️ Buluttan yüklendi');
    } catch (e) { cloudMsg('Yükleme hatası: ' + (e.message || e)); }
  }

  function syncCloud() {
    const user = Cloud.getUser();
    const inLog = !!user;
    els.cloudLoggedin.classList.toggle('hidden', !inLog);
    els.cloudLoggedout.classList.toggle('hidden', inLog);
    if (inLog) { cloudMsg('Giriş: ' + user.email, true); autoCloudLoad(); }
    refreshLeaderboard();
  }

  // --- Otomatik bulut senkron (v13) ---
  // Aynı anda birden fazla ağ işlemini engeller (yükle/kaydet çakışmasın).
  let cloudSyncBusy = false;

  // Buluttaki kayıt bu cihazınkinden İLERİYSE sessizce çeker (açılışta ve
  // sekmeye geri dönünce çağrılır → "hangi cihazda açarsam güncelini görürüm").
  async function autoCloudLoad() {
    if (cloudSyncBusy || !Cloud.isReady() || !Cloud.getUser()) return;
    cloudSyncBusy = true;
    try {
      const data = await Cloud.loadFromCloud();
      if (data && compareProgress(data, game) > 0) {
        applySaveData(data);
        saveGame();
        sync();
        syncAchievements();
        showToast('☁️ Buluttan güncel kayıt yüklendi');
        cloudMsg('☁️ Buluttan güncel kayıt yüklendi', true);
      }
    } catch (e) { /* sessiz — ağ hatası oyunu bozmasın */ }
    finally { cloudSyncBusy = false; }
  }

  // Yerel durumu sessizce buluta yazar (periyodik + sekme gizlenince/kapanınca).
  async function autoCloudSave() {
    if (cloudSyncBusy || !Cloud.isReady() || !Cloud.getUser()) return;
    cloudSyncBusy = true;
    try {
      saveGame();
      let nick = 'Madenci';
      try { nick = localStorage.getItem(NICK_KEY) || 'Madenci'; } catch (e) { /* yok */ }
      await Cloud.saveToCloud(nick);
      cloudMsg('☁️ Otomatik kaydedildi', true);
    } catch (e) { /* sessiz */ }
    finally { cloudSyncBusy = false; }
  }

  async function refreshLeaderboard() {
    if (!Cloud.isReady()) return;
    try {
      const list = await Cloud.fetchLeaderboard(20);
      renderLeaderboard(list);
    } catch (e) { /* sessizce geç */ }
  }

  function renderLeaderboard(list) {
    els.leaderboard.innerHTML = '';
    if (!list.length) { els.leaderboard.innerHTML = '<div class="lb-empty">Henüz skor yok — ilk sen ol!</div>'; return; }
    const me = Cloud.getUser();
    list.forEach((row, i) => {
      const div = document.createElement('div');
      div.className = 'lb-row' + (me && row.user_id === me.id ? ' me' : '');
      const rank = document.createElement('span'); rank.className = 'lb-rank'; rank.textContent = '#' + (i + 1);
      const name = document.createElement('span'); name.className = 'lb-name'; name.textContent = row.nickname; // textContent → XSS yok
      const gems = document.createElement('span'); gems.className = 'lb-gems'; gems.textContent = '💎 ' + formatNum(row.gems);
      div.appendChild(rank); div.appendChild(name); div.appendChild(gems);
      els.leaderboard.appendChild(div);
    });
  }

  let autoClickRow, autoBuyRow;
  function buildAutomation() {
    els.automation.innerHTML = '';
    autoClickRow = document.createElement('button');
    autoClickRow.className = 'auto-row';
    autoClickRow.addEventListener('click', () => { if (buyAutoClicker()) syncAutomation(); });
    autoBuyRow = document.createElement('button');
    autoBuyRow.className = 'auto-row';
    autoBuyRow.addEventListener('click', () => {
      if (!game.autoBuyer) { if (buyAutoBuyer()) syncAutomation(); }
      else { toggleAutoBuyer(); syncAutomation(); }
    });
    els.automation.appendChild(autoClickRow);
    els.automation.appendChild(autoBuyRow);
    syncAutomation();
  }

  function syncAutomation() {
    // Oto-tıklayıcı
    if (game.autoClicker) {
      setHTML(autoClickRow, `<div class="auto-name">🖱️ Oto-Tıklayıcı</div><div class="auto-state on">✓ Aktif · ${AUTOMATION.autoClickRate}/sn</div>`);
      autoClickRow.classList.add('done'); autoClickRow.disabled = true;
    } else {
      setHTML(autoClickRow, `<div class="auto-name">🖱️ Oto-Tıklayıcı</div><div class="auto-desc">Saniyede ${AUTOMATION.autoClickRate} otomatik kaz</div><div class="auto-cost">🪙 ${formatNum(AUTOMATION.autoClickCost)}</div>`);
      const afford = game.gold >= AUTOMATION.autoClickCost;
      autoClickRow.classList.toggle('locked', !afford); autoClickRow.disabled = !afford;
    }
    // Oto-alıcı
    if (game.autoBuyer) {
      const on = game.autoBuyerOn;
      setHTML(autoBuyRow, `<div class="auto-name">🛒 Oto-Alıcı</div><div class="auto-state ${on ? 'on' : 'off'}">${on ? 'Açık' : 'Kapalı'} (değiştir)</div>`);
      autoBuyRow.classList.remove('locked', 'done'); autoBuyRow.disabled = false;
    } else {
      setHTML(autoBuyRow, `<div class="auto-name">🛒 Oto-Alıcı</div><div class="auto-desc">En ucuz üreticiyi otomatik alır</div><div class="auto-cost">🪙 ${formatNum(AUTOMATION.autoBuyerCost)}</div>`);
      const afford = game.gold >= AUTOMATION.autoBuyerCost;
      autoBuyRow.classList.toggle('locked', !afford); autoBuyRow.disabled = !afford;
    }
  }

  function buildGemShop() {
    els.gemshop.innerHTML = '';
    for (const it of GEM_SHOP) {
      const row = document.createElement('button');
      row.className = 'gem-row';
      row.addEventListener('click', () => {
        if (buyGemUpgrade(it.id)) { Sound.play('buy'); syncGemShop(); syncStats(); syncPrestige(); }
      });
      els.gemshop.appendChild(row);
      gemRows[it.id] = row;
    }
    syncGemShop();
  }

  function syncGemShop() {
    setHTML(els.gemshopBal, `Harcanabilir: 💎 <b>${formatNum(game.gems)}</b>`);
    for (const it of GEM_SHOP) {
      const row = gemRows[it.id];
      const lvl = gemLevel(it.id);
      const maxed = lvl >= it.maxLevel;
      const head = `<div class="gem-icon">${it.icon}</div><div class="gem-info"><div class="gem-name">${it.name} <span class="gem-lvl">Sv ${lvl}/${it.maxLevel}</span></div><div class="gem-desc">${it.desc}</div></div>`;
      if (maxed) {
        setHTML(row, head + `<div class="gem-cost">✓ Maks</div>`);
        row.classList.add('done'); row.classList.remove('locked'); row.disabled = true;
      } else {
        const cost = gemUpgradeCost(it.id);
        setHTML(row, head + `<div class="gem-cost">💎 ${formatNum(cost)}</div>`);
        const afford = game.gems >= cost;
        row.classList.toggle('locked', !afford); row.classList.remove('done'); row.disabled = !afford;
      }
    }
  }

  function syncStats() {
    const totalOwned = GENERATORS.reduce((s, g) => s + (game.gens[g.id] || 0), 0);
    const rows = [
      ['Toplam kazanılan altın', formatNum(game.totalGold)],
      ['Altın / sn', formatNum(getGps())],
      ['Toplam tıklama', formatNum(Math.floor(game.clicks))],
      ['💎 Elmas (harcanabilir)', formatNum(game.gems)],
      ['💎 Elmas (ömür boyu)', `${formatNum(game.gemsClaimed)} (+${Math.round((getPrestigeMult() - 1) * 100)}%)`],
      ['Başarım bonusu', `+${Math.round((getAchievementMult() - 1) * 100)}%`],
      ['Kritik tıklama', `%${Math.round(getCritChance() * 100)} şans · ×${formatNum(getCritMult())}`],
      ['Toplam üretici', formatNum(totalOwned)],
      ['Açılan başarım', `${game.achievements.length}/${ACHIEVEMENTS.length}`],
      ['Oynama süresi', formatDuration(game.playtime)],
    ];
    setHTML(els.stats, rows.map(([k, v]) => `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`).join(''));
  }

  const achRows = {};
  function buildAchievements() {
    els.achievements.innerHTML = '';
    for (const a of ACHIEVEMENTS) {
      const row = document.createElement('div');
      row.className = 'ach-row';
      row.innerHTML = `<div class="ach-icon">🔒</div><div class="ach-body"><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>`;
      els.achievements.appendChild(row);
      achRows[a.id] = { row, icon: row.querySelector('.ach-icon') };
    }
    syncAchievements();
  }

  function syncAchievements() {
    let done = 0;
    for (const a of ACHIEVEMENTS) {
      const unlocked = game.achievements.indexOf(a.id) !== -1;
      if (unlocked) done++;
      const r = achRows[a.id];
      r.row.classList.toggle('done', unlocked);
      r.icon.textContent = unlocked ? '🏅' : '🔒';
    }
    els.achCount.textContent = `(${done}/${ACHIEVEMENTS.length})`;
  }

  // Rastgele konumda tıklanabilir altın külçesi; tıklanınca ödül + toast,
  // tıklanmazsa `lifetime` sonra kaybolur.
  function spawnNugget() {
    const el = document.createElement('button');
    el.className = 'nugget';
    el.textContent = '💰';
    el.style.left = (8 + Math.random() * 78) + 'vw';
    el.style.top = (22 + Math.random() * 55) + 'vh';
    let done = false;
    const claim = (e) => {
      if (done) return;
      done = true;
      e.preventDefault();
      const r = grantNugget();
      Sound.play('nugget');
      if (r.type === 'gold') showToast(`💰 Altın külçesi! <b>+${formatNum(r.amount)}</b> altın`);
      else showToast(`⚡ Altın Hücumu! Üretim <b>×${r.mult}</b> · ${r.dur}sn`);
      el.remove();
    };
    el.addEventListener('click', claim);
    el.addEventListener('touchstart', claim, { passive: false });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), NUGGET.lifetime * 1000);
  }

  function syncFrenzy() {
    if (game.frenzyLeft > 0) {
      els.frenzyBanner.textContent = `⚡ Altın Hücumu ×${NUGGET.frenzyMult} · ${Math.ceil(game.frenzyLeft)}sn`;
      els.frenzyBanner.classList.remove('hidden');
    } else {
      els.frenzyBanner.classList.add('hidden');
    }
  }

  function backupMsg(text, ok) {
    els.backupStatus.textContent = text || '';
    els.backupStatus.className = ok ? 'ok' : (text ? 'err' : '');
  }

  function doExport() {
    saveGame();
    const code = exportSave();
    els.saveCode.value = code;
    els.saveCode.focus();
    els.saveCode.select();
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(code); copied = true; }
      else if (document.execCommand) { copied = document.execCommand('copy'); }
    } catch (e) { copied = false; }
    Sound.play('buy');
    backupMsg(copied ? '📤 Kayıt kodu panoya kopyalandı — güvenli bir yere sakla.' : '📤 Kod aşağıda — seçip elle kopyala.', true);
  }

  function doImport() {
    const text = (els.saveCode.value || '').trim();
    if (!text) { backupMsg('Önce kayıt kodunu yapıştır.', false); return; }
    if (!confirm('İçe aktarılan kayıt mevcut ilerlemenin ÜZERİNE yazılacak. Emin misin?')) return;
    if (importSave(text)) {
      saveGame();
      sync();
      syncAchievements();
      Sound.play('achievement');
      backupMsg('📥 Kayıt başarıyla içe aktarıldı.', true);
      showToast('📥 Kayıt içe aktarıldı');
    } else {
      Sound.play('click');
      backupMsg('Geçersiz kayıt kodu — içe aktarılamadı.', false);
    }
  }

  let toastTimer = null;
  function showToast(text) {
    els.toast.innerHTML = text;
    els.toast.classList.remove('hidden');
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }

  function spawnClickFx(amount, e, crit) {
    const fx = document.createElement('div');
    fx.className = 'click-float' + (crit ? ' crit' : '');
    fx.textContent = (crit ? 'KRİTİK! +' : '+') + formatNum(amount);
    const rect = els.mineBtn.getBoundingClientRect();
    const px = (e && e.clientX ? e.clientX : rect.left + rect.width / 2) - rect.left;
    fx.style.left = px + 'px';
    els.clickFx.appendChild(fx);
    setTimeout(() => fx.remove(), crit ? 1100 : 900);
  }

  function buildGenerators() {
    els.generators.innerHTML = '';
    for (const g of GENERATORS) {
      const row = document.createElement('button');
      row.className = 'gen-row';
      row.innerHTML =
        `<div class="gen-icon">${g.icon}</div>` +
        `<div class="gen-info"><div class="gen-name">${g.name} <span class="gen-owned"></span></div>` +
        `<div class="gen-prod"></div></div>` +
        `<div class="gen-buy"></div>`;
      row.addEventListener('click', () => {
        if (buyGenerator(g.id, buyAmount) > 0) { Sound.play('buy'); syncGenerators(); syncUpgrades(); }
      });
      els.generators.appendChild(row);
      genRows[g.id] = {
        row,
        owned: row.querySelector('.gen-owned'),
        prod: row.querySelector('.gen-prod'),
        buy: row.querySelector('.gen-buy'),
      };
    }
    syncGenerators();
  }

  function buildUpgrades() {
    els.upgrades.innerHTML = '';
    for (const u of UPGRADES) {
      const row = document.createElement('button');
      row.className = 'up-row';
      row.innerHTML = `<div class="up-name">${u.name}</div><div class="up-desc">${u.desc}</div><div class="up-cost"></div>`;
      row.addEventListener('click', () => {
        if (buyUpgrade(u.id)) { Sound.play('buy'); syncUpgrades(); }
      });
      els.upgrades.appendChild(row);
      upRows[u.id] = { row, cost: row.querySelector('.up-cost') };
    }
    syncUpgrades();
  }

  function syncGenerators() {
    for (const g of GENERATORS) {
      const r = genRows[g.id];
      const owned = game.gens[g.id] || 0;
      r.owned.textContent = owned > 0 ? `(${owned})` : '';
      let msText = '';
      if (owned > 0) {
        const cnt = genMilestoneCount(g.id);
        if (cnt > 0) msText += ` · 🏁×${formatNum(Math.pow(MILESTONE_MULT, cnt))}`;
        const nx = nextMilestone(g.id);
        if (nx != null) msText += ` <span class="ms-next">(→${nx})</span>`;
      }
      setHTML(r.prod, `${formatNum(g.baseProd)}/sn · toplam ${formatNum(genProduction(g.id))}/sn${msText}`);
      const count = buyAmount === 'max' ? Math.max(1, genMaxAffordable(g.id)) : buyAmount;
      const cost = genBulkCost(g.id, count);
      const label = buyAmount === 'max' ? `Al ×${genMaxAffordable(g.id)}` : `Al ×${count}`;
      setHTML(r.buy, `<div class="buy-label">${label}</div><div class="buy-cost">🪙 ${formatNum(cost)}</div>`);
      const affordable = game.gold >= cost && (buyAmount !== 'max' || genMaxAffordable(g.id) > 0);
      r.row.classList.toggle('locked', !affordable);
      r.row.disabled = !affordable;
    }
  }

  function syncUpgrades() {
    for (const u of UPGRADES) {
      const r = upRows[u.id];
      const bought = hasUpgrade(u.id);
      r.row.classList.toggle('owned', bought);
      if (bought) {
        r.cost.textContent = '✓ Alındı';
        r.row.disabled = true;
      } else {
        r.cost.textContent = `🪙 ${formatNum(u.cost)}`;
        const affordable = game.gold >= u.cost;
        r.row.classList.toggle('locked', !affordable);
        r.row.disabled = !affordable;
      }
    }
  }

  function syncPrestige() {
    const bonus = Math.round((getPrestigeMult() - 1) * 100);
    els.prestigeInfo.innerHTML = `💎 <b>${formatNum(game.gemsClaimed)}</b> elmas (ömür boyu) · tüm üretim <b>+${bonus}%</b> · harcanabilir: 💎 ${formatNum(game.gems)}`;
    const pending = pendingGems();
    if (pending > 0) {
      els.prestigeBtn.textContent = `Yeniden Doğ  (+${formatNum(pending)} 💎)`;
      els.prestigeBtn.disabled = false;
      els.prestigeBtn.classList.remove('locked');
    } else {
      els.prestigeBtn.textContent = `Sonraki 💎: ${formatNum(goldForNextGem())} toplam altın`;
      els.prestigeBtn.disabled = true;
      els.prestigeBtn.classList.add('locked');
    }
  }

  // Her ~100ms: üst sayaçlar + karşılanabilirlikler.
  function sync() {
    els.gold.textContent = formatNum(game.gold);
    els.gps.textContent = formatNum(getGps());
    els.clickVal.textContent = '+' + formatNum(getClickValue());
    syncGenerators();
    syncUpgrades();
    syncPrestige();
    syncGemShop();
    syncFrenzy();
    syncAutomation();
    syncStats();

    const newly = checkAchievements();
    if (newly.length) {
      syncAchievements();
      Sound.play('achievement');
      showToast(`🏅 Başarım: <b>${newly.map(a => a.name).join(', ')}</b>`);
    }
  }

  function flashSaved() {
    els.saveStatus.textContent = '💾 Kaydedildi';
    els.saveStatus.classList.add('flash');
    setTimeout(() => els.saveStatus.classList.remove('flash'), 600);
  }

  function showOffline(earned, seconds) {
    els.offlineText.innerHTML = `Sen yokken (${formatDuration(seconds)}) madencilerin çalıştı:<br><b>🪙 ${formatNum(earned)}</b> altın kazandın!`;
    els.offlinePopup.classList.remove('hidden');
  }

  return { init, sync, flashSaved, showOffline, spawnNugget, autoCloudSave, autoCloudLoad };
})();
