// Survey pen, drawn tip-first so the canvas anchor is the actual contact point.
const pen = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 96 96">
<g stroke="#183c40" stroke-width="1.7" stroke-linejoin="round" transform="translate(6 6) rotate(-41)">
<path fill="#f1e8d3" d="M0 0 -5 20 -4 65 Q-4 70 1 70 Q6 70 6 65 L5 20 Z"/>
<path fill="#264e51" d="M-4 20H5V59H-4Z"/><path d="M-3 19H4M-3 56H5" stroke="#e7c18b"/>
<path fill="#cc684d" d="M-4 60H6V65Q6 70 1 70Q-4 70 -4 65Z"/>
<path d="M0 1 0 11" stroke-width="1"/><path d="M2 26V47" stroke="#99bbb3" stroke-width="1"/>
</g></svg>`;
export const DEFAULT_HAND = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pen);

// Identify only the v1 stock bitmap, without shipping another copy of it.
export function isRetiredHand(value) {
  if (typeof value !== 'string' || value.length !== 111550 || !value.startsWith('data:image/png;base64,')) return false;
  let hash = 2166136261;
  for (let i=0; i<value.length; i++) hash=Math.imul(hash ^ value.charCodeAt(i),16777619);
  return (hash>>>0)===0x48951f4e;
}
