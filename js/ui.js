// DOM arayüzü: üretici/yükseltme satırlarını bir kez kurar, her sync'te
// sayıları/karşılanabilirliği günceller (listeyi her seferinde yeniden kurmaz).
const UI = (function () {
  let els = {};
  let buyAmount = 1; // 1 | 10 | 'max'
  const genRows = {};
  const upRows = {};

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
    els.achievements = document.getElementById('achievements');
    els.achCount = document.getElementById('ach-count');
    els.toast = document.getElementById('toast');
    els.frenzyBanner = document.getElementById('frenzy-banner');
    els.automation = document.getElementById('automation');
    els.stats = document.getElementById('stats');

    // Kazma: masaüstünde click, dokunmatikte touchstart (preventDefault ile
    // hem çift-dokun zoom'unu hem emüle edilen click'i engeller → çift saymaz).
    function doMine(pointer) {
      const v = clickMine();
      spawnClickFx(v, pointer);
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

    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('Tüm ilerlemen silinsin mi? Bu geri alınamaz.')) {
        hardReset();
        buildGenerators();
        buildUpgrades();
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
        syncGenerators();
        syncUpgrades();
        syncPrestige();
      }
    });

    buildGenerators();
    buildUpgrades();
    buildAchievements();
    buildAutomation();
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
      autoClickRow.innerHTML = `<div class="auto-name">🖱️ Oto-Tıklayıcı</div><div class="auto-state on">✓ Aktif · ${AUTOMATION.autoClickRate}/sn</div>`;
      autoClickRow.classList.add('done'); autoClickRow.disabled = true;
    } else {
      autoClickRow.innerHTML = `<div class="auto-name">🖱️ Oto-Tıklayıcı</div><div class="auto-desc">Saniyede ${AUTOMATION.autoClickRate} otomatik kaz</div><div class="auto-cost">🪙 ${formatNum(AUTOMATION.autoClickCost)}</div>`;
      const afford = game.gold >= AUTOMATION.autoClickCost;
      autoClickRow.classList.toggle('locked', !afford); autoClickRow.disabled = !afford;
    }
    // Oto-alıcı
    if (game.autoBuyer) {
      const on = game.autoBuyerOn;
      autoBuyRow.innerHTML = `<div class="auto-name">🛒 Oto-Alıcı</div><div class="auto-state ${on ? 'on' : 'off'}">${on ? 'Açık' : 'Kapalı'} (değiştir)</div>`;
      autoBuyRow.classList.remove('locked', 'done'); autoBuyRow.disabled = false;
    } else {
      autoBuyRow.innerHTML = `<div class="auto-name">🛒 Oto-Alıcı</div><div class="auto-desc">En ucuz üreticiyi otomatik alır</div><div class="auto-cost">🪙 ${formatNum(AUTOMATION.autoBuyerCost)}</div>`;
      const afford = game.gold >= AUTOMATION.autoBuyerCost;
      autoBuyRow.classList.toggle('locked', !afford); autoBuyRow.disabled = !afford;
    }
  }

  function syncStats() {
    const totalOwned = GENERATORS.reduce((s, g) => s + (game.gens[g.id] || 0), 0);
    const rows = [
      ['Toplam kazanılan altın', formatNum(game.totalGold)],
      ['Altın / sn', formatNum(getGps())],
      ['Toplam tıklama', formatNum(Math.floor(game.clicks))],
      ['💎 Elmas', `${formatNum(game.gems)} (+${Math.round((getPrestigeMult() - 1) * 100)}%)`],
      ['Başarım bonusu', `+${Math.round((getAchievementMult() - 1) * 100)}%`],
      ['Toplam üretici', formatNum(totalOwned)],
      ['Açılan başarım', `${game.achievements.length}/${ACHIEVEMENTS.length}`],
      ['Oynama süresi', formatDuration(game.playtime)],
    ];
    els.stats.innerHTML = rows.map(([k, v]) => `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`).join('');
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

  let toastTimer = null;
  function showToast(text) {
    els.toast.innerHTML = text;
    els.toast.classList.remove('hidden');
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }

  function spawnClickFx(amount, e) {
    const fx = document.createElement('div');
    fx.className = 'click-float';
    fx.textContent = '+' + formatNum(amount);
    const rect = els.mineBtn.getBoundingClientRect();
    const px = (e && e.clientX ? e.clientX : rect.left + rect.width / 2) - rect.left;
    fx.style.left = px + 'px';
    els.clickFx.appendChild(fx);
    setTimeout(() => fx.remove(), 900);
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
        if (buyGenerator(g.id, buyAmount) > 0) { syncGenerators(); syncUpgrades(); }
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
        if (buyUpgrade(u.id)) { syncUpgrades(); }
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
      r.prod.textContent = `${formatNum(g.baseProd)}/sn · toplam ${formatNum(genProduction(g.id))}/sn`;
      const count = buyAmount === 'max' ? Math.max(1, genMaxAffordable(g.id)) : buyAmount;
      const cost = genBulkCost(g.id, count);
      const label = buyAmount === 'max' ? `Al ×${genMaxAffordable(g.id)}` : `Al ×${count}`;
      r.buy.innerHTML = `<div class="buy-label">${label}</div><div class="buy-cost">🪙 ${formatNum(cost)}</div>`;
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
    els.prestigeInfo.innerHTML = `💎 <b>${formatNum(game.gems)}</b> elmas · tüm üretim <b>+${bonus}%</b>`;
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
    syncFrenzy();
    syncAutomation();
    syncStats();

    const newly = checkAchievements();
    if (newly.length) {
      syncAchievements();
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

  return { init, sync, flashSaved, showOffline, spawnNugget };
})();
