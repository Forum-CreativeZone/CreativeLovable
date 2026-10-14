// Exportação para o Figma: um plugin de desenvolvimento que cria variáveis (primitivos + tema claro/escuro),
// estilos de texto, estilos de sombra e uma página de referência com amostras ligadas às variáveis.
import { PASSOS } from './cor.js';

/** Camadas de sombra em números (o Figma não entende color-mix), espelhando sistema.js. */
const SOMBRAS = {
  nenhuma: { 1: [], 2: [[0, 0, 0, 1, 0.18]], 3: [[0, 20, 48, -12, 0.3]] },
  sutil: { 1: [[0, 1, 2, 0, 0.08], [0, 1, 1, 0, 0.04]], 2: [[0, 2, 4, 0, 0.06], [0, 10, 24, -6, 0.14]], 3: [[0, 4, 8, 0, 0.08], [0, 24, 56, -12, 0.28]] },
  marcada: { 1: [[0, 2, 4, 0, 0.1], [0, 8, 20, -6, 0.18]], 2: [[0, 4, 8, 0, 0.1], [0, 18, 40, -10, 0.3]], 3: [[0, 8, 16, 0, 0.12], [0, 36, 80, -16, 0.42]] },
  dura: { 1: [[3, 3, 0, 0, 1]], 2: [[5, 5, 0, 0, 1]], 3: [[8, 8, 0, 0, 1]] },
};

/** Dados enxutos que o plugin precisa. */
export function dadosFigma(s, direcao) {
  const tamanhos = s.tipografia.tamanhos;
  const estilosTexto = [
    ['Display', 'titulos', '4xl', s.tipografia.titulos.peso, 105, s.tipografia.espacamentoTitulos],
    ['Título 1', 'titulos', '3xl', s.tipografia.titulos.peso, 112, s.tipografia.espacamentoTitulos],
    ['Título 2', 'titulos', 'xl', s.tipografia.titulos.peso, 120, s.tipografia.espacamentoTitulos],
    ['Título 3', 'titulos', 'lg', s.tipografia.titulos.peso, 125, '0em'],
    ['Destaque', 'texto', 'md', s.tipografia.texto.peso, 150, '0em'],
    ['Texto', 'texto', 'base', s.tipografia.texto.peso, Math.round(s.tipografia.entrelinhas.texto * 100), '0em'],
    ['Texto forte', 'texto', 'base', s.tipografia.texto.pesoForte, Math.round(s.tipografia.entrelinhas.texto * 100), '0em'],
    ['Pequeno', 'texto', 'sm', s.tipografia.texto.peso, 150, '0em'],
    ['Rótulo', 'texto', 'sm', s.tipografia.texto.pesoForte, 120, '0.01em'],
    ['Legenda', 'texto', 'xs', s.tipografia.texto.peso, 140, '0.01em'],
    ['Mono', 'mono', 'sm', 400, 150, '0em'],
  ].map(([nome, fam, tam, peso, entrelinha, espacamento]) => ({
    nome, familia: s.tipografia[fam].familia, tamanho: tamanhos[tam].max, peso, entrelinha, espacamento: parseFloat(espacamento) * 100,
  }));
  return {
    nome: s.nome,
    modo: s.modo,
    escalas: Object.fromEntries(Object.entries(s.escalas).map(([k, v]) => [k, PASSOS.map((p) => [String(p), v[p]])])),
    temas: s.temas,
    espacos: Object.fromEntries(Object.entries(s.espacos).map(([k, v]) => [k, v.max])),
    raios: s.raios,
    sombras: SOMBRAS[direcao.forma.sombra] || SOMBRAS.sutil,
    estilosTexto,
    conceito: direcao.conceito,
  };
}

const MANIFESTO = (s) => JSON.stringify({
  name: `Creative Lovable · ${s.nome}`.slice(0, 60),
  id: 'creative-lovable-design-system',
  api: '1.0.0',
  main: 'code.js',
  editorType: ['figma'],
  documentAccess: 'dynamic-page',
  networkAccess: { allowedDomains: ['none'] },
}, null, 2) + '\n';

/** Código do plugin (roda dentro do Figma, sem rede). */
export function codigoPlugin(dados) {
  return `// Plugin gerado pelo Creative Lovable: importa o design system "${dados.nome.replace(/[\r\n*/]/g, ' ')}" para este arquivo do Figma.
// Rodar de novo atualiza as variáveis e os estilos com o mesmo nome (não duplica).
const DADOS = ${JSON.stringify(dados)};

const PESO_ESTILO = { 100: ['Thin', 'Hairline'], 200: ['ExtraLight', 'Extra Light', 'UltraLight'], 300: ['Light'], 400: ['Regular', 'Book', 'Normal'], 500: ['Medium'], 600: ['SemiBold', 'Semi Bold', 'Semibold', 'DemiBold', 'Demi Bold'], 700: ['Bold'], 800: ['ExtraBold', 'Extra Bold', 'UltraBold', 'Heavy'], 900: ['Black', 'Heavy'] };

function rgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 };
}

async function colecao(nome, existentes) {
  return existentes.find((c) => c.name === nome) || figma.variables.createVariableCollection(nome);
}

const TOCADAS = new Set();
async function variavel(nome, col, tipo, todas) {
  let v = todas.find((x) => x.name === nome && x.variableCollectionId === col.id);
  if (!v) { v = figma.variables.createVariable(nome, col, tipo); todas.push(v); }
  TOCADAS.add(v.id);
  return v;
}

async function fonteDisponivel(familia, peso, disponiveis) {
  const estilos = disponiveis.filter((f) => f.fontName.family === familia).map((f) => f.fontName.style);
  if (!estilos.length) return null;
  const candidatos = PESO_ESTILO[peso] || ['Regular'];
  const exato = estilos.find((st) => candidatos.includes(st));
  if (exato) return { family: familia, style: exato };
  const sem = estilos.find((st) => candidatos.some((c) => st.replace(/\\s/g, '').toLowerCase() === c.replace(/\\s/g, '').toLowerCase()));
  return { family: familia, style: sem || (estilos.includes('Regular') ? 'Regular' : estilos[0]) };
}

async function principal() {
  const resumo = { variaveis: 0, textos: 0, sombras: 0, avisos: [] };
  const colecoes = await figma.variables.getLocalVariableCollectionsAsync();
  const todas = await figma.variables.getLocalVariablesAsync();

  // 1. Primitivos: escalas de cor, espaço e raio.
  const prim = await colecao(DADOS.nome + ' · Primitivos', colecoes);
  const modoPrim = prim.modes[0].modeId;
  prim.renameMode(modoPrim, 'Valor');
  const porHex = {};
  for (const [grupo, passos] of Object.entries(DADOS.escalas)) {
    for (const [passo, hex] of passos) {
      const v = await variavel(grupo + '/' + passo, prim, 'COLOR', todas);
      v.setValueForMode(modoPrim, rgb(hex));
      porHex[hex.toLowerCase()] = porHex[hex.toLowerCase()] || v;
    }
  }
  for (const [nome, valor] of Object.entries(DADOS.espacos)) {
    const v = await variavel('espaco/' + nome, prim, 'FLOAT', todas);
    v.setValueForMode(modoPrim, valor);
    v.scopes = ['GAP', 'WIDTH_HEIGHT'];
  }
  for (const [nome, valor] of Object.entries(DADOS.raios)) {
    const v = await variavel('raio/' + nome, prim, 'FLOAT', todas);
    v.setValueForMode(modoPrim, valor);
    v.scopes = ['CORNER_RADIUS'];
  }

  // 2. Tema: cores semânticas com modos Claro e Escuro (ou duas coleções, se o plano não permitir modos).
  const tema = await colecao(DADOS.nome + ' · Tema', colecoes);
  const ordem = DADOS.modo === 'escuro' ? ['escuro', 'claro'] : ['claro', 'escuro'];
  const nomeModo = { claro: 'Claro', escuro: 'Escuro' };
  const modos = {};
  tema.renameMode(tema.modes[0].modeId, nomeModo[ordem[0]]);
  modos[ordem[0]] = { col: tema, id: tema.modes[0].modeId };
  const existente = tema.modes.find((m) => m.name === nomeModo[ordem[1]]);
  if (existente) modos[ordem[1]] = { col: tema, id: existente.modeId };
  else {
    try { modos[ordem[1]] = { col: tema, id: tema.addMode(nomeModo[ordem[1]]) }; }
    catch (e) {
      const extra = await colecao(DADOS.nome + ' · Tema ' + nomeModo[ordem[1]].toLowerCase(), colecoes);
      modos[ordem[1]] = { col: extra, id: extra.modes[0].modeId };
      resumo.avisos.push('O plano do Figma não permite mais de um modo por coleção; o tema ' + nomeModo[ordem[1]].toLowerCase() + ' ficou numa coleção separada.');
    }
  }
  const escopo = (nome) => /^(texto|sobre-|marca-texto|acento-texto|sucesso-texto|aviso-texto|perigo-texto)/.test(nome) ? ['TEXT_FILL'] : /^borda/.test(nome) ? ['STROKE_COLOR'] : /^(foco|sombra|selecao)$/.test(nome) ? ['ALL_SCOPES'] : ['FRAME_FILL', 'SHAPE_FILL'];
  for (const chave of ordem) {
    const { col, id } = modos[chave];
    for (const [nome, hex] of Object.entries(DADOS.temas[chave])) {
      const v = await variavel('cor/' + nome, col, 'COLOR', todas);
      const base = porHex[hex.toLowerCase()];
      v.setValueForMode(id, base ? figma.variables.createVariableAlias(base) : rgb(hex));
      v.scopes = escopo(nome);
    }
  }

  // 3. Estilos de texto (tamanhos da tela larga; no código eles são fluidos).
  const disponiveis = await figma.listAvailableFontsAsync();
  const estilosTexto = await figma.getLocalTextStylesAsync();
  const criados = {};
  for (const e of DADOS.estilosTexto) {
    let fonte = await fonteDisponivel(e.familia, e.peso, disponiveis);
    if (!fonte) {
      resumo.avisos.push('A fonte ' + e.familia + ' não está instalada no Figma; usei Inter no estilo "' + e.nome + '". Instale a fonte e rode o plugin de novo.');
      fonte = await fonteDisponivel('Inter', e.peso, disponiveis) || { family: 'Inter', style: 'Regular' };
    }
    await figma.loadFontAsync(fonte);
    const nome = DADOS.nome + '/' + e.nome;
    const st = estilosTexto.find((x) => x.name === nome) || figma.createTextStyle();
    st.name = nome;
    st.fontName = fonte;
    st.fontSize = e.tamanho;
    st.lineHeight = { unit: 'PERCENT', value: e.entrelinha };
    st.letterSpacing = { unit: 'PERCENT', value: e.espacamento };
    criados[e.nome] = st;
    resumo.textos++;
  }

  // 4. Estilos de sombra.
  const estilosEfeito = await figma.getLocalEffectStylesAsync();
  const corSombra = rgb(DADOS.modo === 'escuro' ? DADOS.temas.escuro.sombra : DADOS.temas.claro.sombra);
  const corDura = rgb(DADOS.temas[DADOS.modo].texto);
  for (const [nivel, camadas] of Object.entries(DADOS.sombras)) {
    if (!camadas.length) continue;
    const nome = DADOS.nome + '/Sombra ' + nivel;
    const st = estilosEfeito.find((x) => x.name === nome) || figma.createEffectStyle();
    st.name = nome;
    st.effects = camadas.map(([x, y, raio, spread, alfa]) => ({
      type: 'DROP_SHADOW', color: Object.assign({}, raio === 0 && alfa === 1 ? corDura : corSombra, { a: alfa }),
      offset: { x, y }, radius: raio, spread, visible: true, blendMode: 'NORMAL',
    }));
    resumo.sombras++;
  }

  // 5. Página de referência com amostras ligadas às variáveis.
  let pagina = figma.root.children.find((p) => p.name === 'Design system · ' + DADOS.nome);
  if (!pagina) { pagina = figma.createPage(); pagina.name = 'Design system · ' + DADOS.nome; }
  await figma.setCurrentPageAsync(pagina);
  for (const filho of pagina.children.slice()) filho.remove();
  const quadro = figma.createFrame();
  quadro.name = DADOS.nome;
  quadro.layoutMode = 'VERTICAL';
  quadro.primaryAxisSizingMode = 'AUTO';
  quadro.counterAxisSizingMode = 'AUTO';
  quadro.itemSpacing = 40;
  quadro.paddingTop = quadro.paddingBottom = quadro.paddingLeft = quadro.paddingRight = 64;
  const fundo = todas.find((v) => v.name === 'cor/fundo' && v.variableCollectionId === tema.id);
  if (fundo) quadro.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }, 'color', fundo)];
  pagina.appendChild(quadro);
  const texto = async (conteudo, estilo) => {
    const t = figma.createText();
    const st = criados[estilo];
    await figma.loadFontAsync(st.fontName);
    t.fontName = st.fontName;
    t.characters = conteudo;
    await t.setTextStyleIdAsync(st.id);
    const corTexto = todas.find((v) => v.name === 'cor/texto' && v.variableCollectionId === tema.id);
    if (corTexto) t.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', corTexto)];
    return t;
  };
  quadro.appendChild(await texto(DADOS.nome, 'Display'));
  quadro.appendChild(await texto(DADOS.conceito, 'Destaque'));
  for (const [grupo, passos] of Object.entries(DADOS.escalas)) {
    const linha = figma.createFrame();
    linha.name = grupo;
    linha.layoutMode = 'HORIZONTAL';
    linha.primaryAxisSizingMode = 'AUTO';
    linha.counterAxisSizingMode = 'AUTO';
    linha.itemSpacing = 8;
    linha.fills = [];
    for (const [passo] of passos) {
      const v = todas.find((x) => x.name === grupo + '/' + passo && x.variableCollectionId === prim.id);
      const r = figma.createRectangle();
      r.name = grupo + '/' + passo;
      r.resize(72, 72);
      r.cornerRadius = 8;
      r.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v)];
      linha.appendChild(r);
    }
    quadro.appendChild(await texto(grupo, 'Rótulo'));
    quadro.appendChild(linha);
  }
  for (const e of DADOS.estilosTexto) quadro.appendChild(await texto(e.nome + ' · ' + e.familia + ' ' + e.tamanho + 'px', e.nome));
  figma.viewport.scrollAndZoomIntoView([quadro]);
  resumo.variaveis = TOCADAS.size;
  return resumo;
}

principal().then((r) => {
  const msg = 'Design system importado: ' + r.variaveis + ' variáveis, ' + r.textos + ' estilos de texto, ' + r.sombras + ' sombras.';
  if (r.avisos.length) figma.notify(r.avisos[0], { timeout: 8000 });
  figma.closePlugin(msg);
}).catch((e) => figma.closePlugin('Não consegui importar: ' + (e && e.message ? e.message : e)));
`;
}

export function arquivosFigma(s, direcao) {
  const dados = dadosFigma(s, direcao);
  return {
    'design-system/figma/manifest.json': MANIFESTO(s),
    'design-system/figma/code.js': codigoPlugin(dados),
    'design-system/figma/LEIA-ME.md': `# Levar o design system "${s.nome}" para o Figma

1. Abra o **Figma para desktop** (plugins de desenvolvimento não rodam no navegador).
2. No arquivo onde quer o sistema: menu **Plugins › Desenvolvimento › Importar plugin do manifesto…**
3. Escolha \`design-system/figma/manifest.json\` desta pasta.
4. Rode em **Plugins › Desenvolvimento › Creative Lovable · ${s.nome}**.

O plugin cria (ou atualiza, se rodar de novo):

- Coleção **${s.nome} · Primitivos**: escalas de cor (${Object.keys(s.escalas).join(', ')}), espaço e raio.
- Coleção **${s.nome} · Tema**: cores semânticas com os modos Claro e Escuro, ligadas aos primitivos.
- Estilos de texto (${s.tipografia.titulos.familia} e ${s.tipografia.texto.familia}) e estilos de sombra.
- Uma página "Design system · ${s.nome}" com amostras ligadas às variáveis.

Instale antes as fontes ${[s.tipografia.titulos.familia, s.tipografia.texto.familia, s.tipografia.mono.familia].join(', ')} (Google Fonts) para os estilos usarem a fonte certa.
No plano gratuito do Figma, se a coleção não aceitar dois modos, o tema alternativo vai para uma coleção separada.

Os tokens também estão em \`design-system/tokens.json\` (formato DTCG 2025.10), que plugins como Tokens Studio e outras ferramentas leem.
`,
  };
}
