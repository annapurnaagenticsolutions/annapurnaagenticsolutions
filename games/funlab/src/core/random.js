export function hashString(value='') {
  let h = 2166136261 >>> 0;
  for (let i=0;i<value.length;i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seeded01(seed='') {
  let x = hashString(seed) || 1;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return (x >>> 0) / 4294967295;
}

export function pick(list, seed='') {
  if (!list.length) return undefined;
  return list[Math.floor(seeded01(seed) * list.length) % list.length];
}

export function localDayKey(date=new Date()) {
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,'0');
  const d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

export function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
