// Gera data/fontes.json a partir de @capsizecss/metrics (dependência só de desenvolvimento).
// Uso: node scripts/gerar-fontes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { entireMetricsCollection as todas } from '@capsizecss/metrics/entireMetricsCollection';

const SISTEMA = new Set(['Arial', 'Helvetica', 'Helvetica Neue', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Trebuchet MS', 'Tahoma', 'Segoe UI', 'Impact', 'Comic Sans MS', 'Apple System', 'BlinkMacSystemFont', 'Lucida Grande', 'Menlo', 'Monaco', 'Consolas', 'SF Pro', 'Ubuntu', 'Cantarell', 'Oxygen']);
const CAT = { 'sans-serif': 's', serif: 'r', display: 'd', handwriting: 'h', monospace: 'm' };
const saida = {};
for (const m of Object.values(todas)) {
  const nome = m.familyName;
  if (!nome || saida[nome]) continue;
  const variantes = Object.keys(m.variants || {});
  const pesos = [...new Set(variantes.map((v) => (/^(regular|italic)$/.test(v) ? 400 : parseInt(v, 10))).filter((n) => n >= 100 && n <= 900))].sort((a, b) => a - b);
  const italico = variantes.some((v) => /italic/i.test(v));
  const xw = m.subsets?.latin?.xWidthAvg ?? m.xWidthAvg;
  saida[nome] = [CAT[m.category] || 's', m.capHeight, m.ascent, m.descent, m.lineGap, m.unitsPerEm, m.xHeight || 0, xw || 0, pesos.length ? pesos.join(',') : '400', italico ? 1 : 0, SISTEMA.has(nome) ? 0 : 1];
}
const destino = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'fontes.json');
fs.writeFileSync(destino, JSON.stringify({ fonte: '@capsizecss/metrics (MIT)', campos: ['categoria', 'capHeight', 'ascent', 'descent', 'lineGap', 'unitsPerEm', 'xHeight', 'xWidthAvg', 'pesos', 'italico', 'google'], familias: saida }));
console.log(Object.keys(saida).length, 'famílias ·', (fs.statSync(destino).size / 1024).toFixed(0), 'KB');
