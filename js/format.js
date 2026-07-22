// Büyük sayı biçimlendirme: 1000 altında ondalıklı/tam, üstünde K/M/B/T...
// kısaltmalı. Idle oyunda sayılar hızla büyüdüğü için okunabilirlik şart.
function formatNum(n) {
  if (n === Infinity) return '∞';
  n = Math.max(0, n);
  if (n < 1000) return (n < 100 ? Math.floor(n * 10) / 10 : Math.floor(n)).toString();
  const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const tier = Math.min(units.length - 1, Math.floor(Math.log10(n) / 3));
  const scaled = n / Math.pow(1000, tier);
  return (Math.floor(scaled * 100) / 100) + units[tier];
}

// Süreyi (saniye) "2sa 5dk" gibi biçimler — offline kazanç açıklaması için.
function formatDuration(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}sa ${m}dk`;
  if (m > 0) return `${m}dk ${s}sn`;
  return `${s}sn`;
}
