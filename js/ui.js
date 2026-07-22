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

  return { init, sync, flashSaved, showOffline };
})();
