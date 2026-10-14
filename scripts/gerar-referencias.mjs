// Gera data/referencias.json a partir dos CSVs do UI/UX Pro Max (MIT, Next Level Builder).
// Uso: node scripts/gerar-referencias.mjs <pasta src/ui-ux-pro-max/data do repositório nextlevelbuilder/ui-ux-pro-max-skill>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEM = process.argv[2];
if (!ORIGEM || !fs.existsSync(path.join(ORIGEM, 'styles.csv'))) {
  console.error('Informe a pasta de dados do UI/UX Pro Max (a que contém styles.csv).');
  process.exit(1);
}

/** Leitor de CSV com aspas, vírgulas e quebras de linha dentro dos campos. */
function lerCsv(arquivo) {
  const t = fs.readFileSync(path.join(ORIGEM, arquivo), 'utf8').replace(/^﻿/, '');
  const linhas = [];
  let campo = '', linha = [], aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo); campo = '';
      if (linha.some((x) => x !== '')) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas;
  return resto.map((l) => Object.fromEntries(cab.map((k, i) => [k.trim(), (l[i] ?? '').trim()])));
}

const limpar = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const lista = (s) => limpar(s).split(/\s*,\s*/).filter(Boolean);
const slug = (s) => limpar(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const produtos = lerCsv('products.csv');
const raciocinio = new Map(lerCsv('ui-reasoning.csv').map((r) => [r.UI_Category, r]));
const paletas = new Map(lerCsv('colors.csv').map((r) => [r['Product Type'], r]));

const setores = produtos.map((p) => {
  const r = raciocinio.get(p['Product Type']) || {};
  const c = paletas.get(p['Product Type']) || {};
  return {
    id: slug(p['Product Type']),
    nome: p['Product Type'],
    palavras: lista(p.Keywords),
    estilo: limpar(p['Primary Style Recommendation']),
    estilosSecundarios: lista(p['Secondary Styles']),
    estrutura: limpar(p['Landing Page Pattern']),
    painel: limpar(p['Dashboard Style (if applicable)']),
    cor: limpar(p['Color Palette Focus']),
    consideracoes: limpar(p['Key Considerations']),
    humorCor: limpar(r.Color_Mood),
    humorTipo: limpar(r.Typography_Mood),
    efeitos: limpar(r.Key_Effects),
    antiPadroes: limpar(r.Anti_Patterns),
    paleta: c.Primary ? {
      primaria: c.Primary, secundaria: c.Secondary, acento: c.Accent, fundo: c.Background, texto: c.Foreground,
      cartao: c.Card, suave: c.Muted, textoSuave: c['Muted Foreground'], borda: c.Border, perigo: c.Destructive, nota: limpar(c.Notes),
    } : null,
  };
});

const estilos = lerCsv('styles.csv').filter((s) => (s.Status || 'active') === 'active').map((s) => ({
  id: s['Style ID'] || slug(s['Style Category']),
  nome: s['Style Category'],
  tipo: s.Type,
  palavras: lista(s.Keywords),
  cores: limpar(s['Primary Colors']),
  coresSecundarias: limpar(s['Secondary Colors']),
  efeitos: limpar(s['Effects & Animation']),
  idealPara: limpar(s['Best For']),
  evitarEm: limpar(s['Do Not Use For']),
  claro: s['Light Mode ✓'], escuro: s['Dark Mode ✓'],
  acessibilidade: limpar(s.Accessibility),
  desempenho: limpar(s.Performance),
  complexidade: s.Complexity,
  era: s['Era/Origin'],
  css: limpar(s['CSS/Technical Keywords']),
  checklist: limpar(s['Implementation Checklist']).split(/\s*☐\s*/).map((x) => x.replace(/,\s*$/, '').trim()).filter(Boolean),
  variaveis: limpar(s['Design System Variables']),
}));

const pares = lerCsv('typography.csv').map((t) => ({
  nome: t['Font Pairing Name'], categoria: t.Category, titulos: t['Heading Font'], texto: t['Body Font'],
  humor: lista(t['Mood/Style Keywords']), idealPara: limpar(t['Best For']), notas: limpar(t.Notes),
}));

const estruturas = lerCsv('landing.csv').map((l) => ({
  id: l['Pattern ID'] || slug(l['Pattern Name']), nome: l['Pattern Name'], palavras: lista(l.Keywords),
  ordem: limpar(l['Section Order']).split(/\s*>\s*/).filter(Boolean), cta: limpar(l['Primary CTA Placement']),
  cor: limpar(l['Color Strategy']), efeitos: limpar(l['Recommended Effects']), conversao: limpar(l['Conversion Optimization']),
}));

const ux = [...lerCsv('ux-guidelines.csv'), ...lerCsv('app-interface.csv')].map((u) => ({
  categoria: u.Category, tema: u.Issue, plataforma: u.Platform, descricao: limpar(u.Description),
  fazer: limpar(u.Do), naoFazer: limpar(u["Don't"]), bom: limpar(u['Code Example Good']), ruim: limpar(u['Code Example Bad']),
  severidade: u.Severity,
}));

const movimento = lerCsv('motion.csv').map((m) => ({
  categoria: m.Category, intensidade: m['Intensity Tier'], palavras: lista(m.Keywords), gatilho: limpar(m.Trigger),
  duracao: limpar(m.Duration), easing: limpar(m.Easing), fazer: limpar(m.Do), naoFazer: limpar(m["Don't"]),
  desempenho: limpar(m['Performance Notes']), notas: limpar(m['Framework Notes']),
}));

const graficos = lerCsv('charts.csv').map((g) => ({
  dado: g['Data Type'], palavras: lista(g.Keywords), melhor: limpar(g['Best Chart Type']), alternativas: limpar(g['Secondary Options']),
  quando: limpar(g['When to Use']), quandoNao: limpar(g['When NOT to Use']), volume: limpar(g['Data Volume Threshold']),
  cor: limpar(g['Color Guidance']), acessibilidade: limpar(g['Accessibility Notes']), alternativaAcessivel: limpar(g['A11y Fallback']),
  bibliotecas: limpar(g['Library Recommendation']), interacao: limpar(g['Interactive Level']),
}));

const saida = {
  fonte: 'UI/UX Pro Max, de Next Level Builder (licença MIT). Convertido por scripts/gerar-referencias.mjs.',
  geradoEm: new Date().toISOString().slice(0, 10),
  setores, estilos, pares, estruturas, ux, movimento, graficos,
};
fs.mkdirSync(path.join(RAIZ, 'data'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'data', 'referencias.json'), JSON.stringify(saida));
console.log(Object.entries(saida).filter(([, v]) => Array.isArray(v)).map(([k, v]) => `${k}: ${v.length}`).join(' · '));
