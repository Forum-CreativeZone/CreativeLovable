// Motor de direção de arte: valida as propostas da IA, barra clichês e propostas parecidas entre si,
// e prepara os dados que o painel mostra para o usuário escolher.
import { ErroCreative } from '../config.js';
import { ehHex, hex, escala, contraste, distancia, clichesDeCor, textoSobre, oklch, ehCreme } from './cor.js';
import { nomeOficial, infoFonte, ehSaturada, urlGoogleFonts } from './fontes.js';

export const OPCOES = {
  modo: ['claro', 'escuro'],
  neutros: ['frio', 'neutro', 'quente'],
  raio: ['reto', 'suave', 'arredondado', 'pilula'],
  borda: ['nenhuma', 'fina', 'marcada'],
  sombra: ['nenhuma', 'sutil', 'marcada', 'dura'],
  densidade: ['compacta', 'confortavel', 'arejada'],
  movimento: ['minimo', 'sutil', 'expressivo'],
  contraste: ['suave', 'alto'],
};

/** Palavras que, sozinhas, não dizem nada sobre um design. */
const VAZIAS = /\b(moderno|moderna|clean|limpo|limpa|minimalista|profissional|bonito|bonita|elegante|sofisticado|sofisticada|inovador|inovadora|intuitivo|intuitiva|simples|atual|premium|criativo|criativa|incr[ií]vel)\b/gi;

function textoConcreto(s, minimo) {
  const t = String(s || '').trim();
  if (t.length < minimo) return false;
  const semVazias = t.replace(VAZIAS, '').replace(/[\s,.;e]+/g, ' ').trim();
  return semVazias.length >= Math.min(minimo, 20);
}

/** Normaliza uma proposta e devolve {proposta, erros, alertas}. */
export function normalizarProposta(p, i, brief) {
  const erros = [];
  const alertas = [];
  const nomeP = String(p.nome || '').trim() || `Direção ${i + 1}`;
  const rot = `"${nomeP}"`;

  if (!textoConcreto(p.conceito, 60)) erros.push(`${rot}: o conceito precisa explicar a ideia e por que ela serve a este público (mínimo 60 caracteres, sem depender de "moderno", "clean", "elegante").`);
  if (!textoConcreto(p.referencia, 15)) erros.push(`${rot}: diga de onde vem a referência visual concreta (ex.: "rótulos de farmácia dos anos 60", "sinalização de metrô"), não "sites modernos".`);
  if (!textoConcreto(p.assinatura, 15)) erros.push(`${rot}: falta a assinatura, o elemento que alguém lembraria depois de fechar a página.`);

  const modo = OPCOES.modo.includes(p.modo) ? p.modo : 'claro';
  const cores = p.cores || {};
  if (!ehHex(cores.marca)) erros.push(`${rot}: cores.marca precisa ser um hex (#RRGGBB).`);
  if (cores.acento && !ehHex(cores.acento)) erros.push(`${rot}: cores.acento precisa ser um hex.`);
  if (cores.fundo && !ehHex(cores.fundo)) erros.push(`${rot}: cores.fundo precisa ser um hex.`);
  const neutros = OPCOES.neutros.includes(cores.neutros) ? cores.neutros : 'neutro';

  const tip = p.tipografia || {};
  const titulos = nomeOficial(tip.titulos);
  const texto = nomeOficial(tip.texto);
  const mono = tip.mono ? nomeOficial(tip.mono) : null;
  if (!titulos) erros.push(`${rot}: a fonte de títulos "${tip.titulos || ''}" não está no catálogo do Google Fonts. Consulte cl_catalogo tipo "fontes".`);
  if (!texto) erros.push(`${rot}: a fonte de texto "${tip.texto || ''}" não está no catálogo do Google Fonts.`);
  if (tip.mono && !mono) erros.push(`${rot}: a fonte mono "${tip.mono}" não está no catálogo.`);
  const marcaFontes = (brief?.marca?.fontes || []).map((f) => nomeOficial(f)).filter(Boolean);
  for (const f of [...new Set([titulos, texto].filter(Boolean))]) {
    if (ehSaturada(f) && !marcaFontes.includes(f)) {
      erros.push(`${rot}: ${f} é uma das fontes mais usadas em sites gerados por IA. Escolha outra (cl_catalogo tipo "fontes"), a menos que ela seja da marca do cliente (informada no briefing).`);
    }
  }
  if (titulos && texto) {
    const it = infoFonte(titulos);
    const ix = infoFonte(texto);
    if (ix.categoria === 'display' || ix.categoria === 'manuscrita') erros.push(`${rot}: ${texto} é uma fonte de exibição; não serve para texto corrido. Use-a só nos títulos.`);
    if (titulos !== texto && it.categoria === ix.categoria && it.categoria === 'sans-serif' && !String(tip.justificativa || '').trim()) {
      alertas.push(`${rot}: duas sans-serif diferentes (${titulos} e ${texto}) costumam brigar. Justifique o contraste ou use uma família só com pesos diferentes.`);
    }
    if (!ix.pesos.some((w) => w >= 600)) alertas.push(`${rot}: ${texto} não tem peso 600 ou mais; negritos vão ser sintetizados pelo navegador.`);
  }
  if (!textoConcreto(tip.justificativa, 25)) alertas.push(`${rot}: explique em tipografia.justificativa por que essas fontes servem a este projeto.`);

  const forma = p.forma || {};
  const norm = {
    raio: OPCOES.raio.includes(forma.raio) ? forma.raio : 'suave',
    borda: OPCOES.borda.includes(forma.borda) ? forma.borda : 'fina',
    sombra: OPCOES.sombra.includes(forma.sombra) ? forma.sombra : 'sutil',
  };
  const densidade = OPCOES.densidade.includes(p.densidade) ? p.densidade : 'confortavel';
  const movimento = OPCOES.movimento.includes(p.movimento) ? p.movimento : 'sutil';
  const nivelContraste = OPCOES.contraste.includes(p.contraste) ? p.contraste : 'alto';

  const marca = ehHex(cores.marca) ? hex(cores.marca) : null;
  const fundo = ehHex(cores.fundo) ? hex(cores.fundo) : (modo === 'escuro' ? '#111214' : '#ffffff');
  if (marca) {
    const cliches = clichesDeCor({ marca, modo, serifDisplay: titulos ? infoFonte(titulos).categoria === 'serif' : false, neutros });
    const marcaCliente = (brief?.marca?.cores || []).some((c) => distancia(c, marca) < 6);
    for (const c of cliches) (marcaCliente ? alertas : erros).push(`${rot}: ${c}`);
    if (cores.fundo && ehCreme(fundo)) {
      const serif = titulos && infoFonte(titulos).categoria === 'serif';
      (serif ? erros : alertas).push(`${rot}: fundo creme/bege (${fundo})${serif ? ' com títulos em serifa' : ''} é a superfície "de bom gosto" padrão das páginas geradas por IA. Use um fundo de uma paleta deliberada ou deixe o estúdio gerar o fundo a partir dos neutros.`);
    }
    if (cores.fundo) {
      const f = oklch(fundo);
      if ((modo === 'escuro') !== (f.l < 0.5)) erros.push(`${rot}: o fundo ${fundo} não combina com o modo "${modo}".`);
    }
    if (contraste(marca, fundo) < 1.6 && !cores.acento) alertas.push(`${rot}: a cor da marca quase some sobre o fundo (${contraste(marca, fundo)}:1). Vai virar fundo de botão; o texto de link usa uma versão ajustada.`);
  }
  if (cores.acento && marca && distancia(cores.acento, marca) < 12) alertas.push(`${rot}: o acento é quase igual à marca; ou diferencie ou retire.`);

  const evitar = (Array.isArray(p.evitar) ? p.evitar : String(p.evitar || '').split(/[;\n]/)).map((s) => String(s).trim()).filter(Boolean);
  if (!evitar.length) alertas.push(`${rot}: liste em "evitar" o que esta direção recusa de propósito (ajuda a IA a não escorregar no genérico).`);

  const proposta = {
    id: `d${i + 1}`,
    nome: nomeP,
    conceito: String(p.conceito || '').trim(),
    referencia: String(p.referencia || '').trim(),
    assinatura: String(p.assinatura || '').trim(),
    layout: String(p.layout || '').trim(),
    modo,
    cores: { marca, acento: ehHex(cores.acento) ? hex(cores.acento) : null, fundo: ehHex(cores.fundo) ? hex(cores.fundo) : null, neutros, estrategia: String(cores.estrategia || '').trim() },
    tipografia: { titulos, texto, mono, justificativa: String(tip.justificativa || '').trim() },
    forma: norm, densidade, movimento, contraste: nivelContraste,
    evitar,
  };
  if (marca) {
    const esc = escala(marca);
    proposta.amostra = {
      escala: [100, 300, 500, 700, 900].map((k) => esc[k]),
      fundo, sobreMarca: textoSobre(marca),
      fontes: urlGoogleFonts([{ nome: titulos, pesos: [400, 700, 800] }, { nome: texto, pesos: [400, 600] }].filter((f) => f.nome)),
    };
  }
  return { proposta, erros, alertas };
}

/** Quantos eixos de design separam duas propostas. */
function eixosDiferentes(a, b) {
  let n = 0;
  if (a.modo !== b.modo) n++;
  if (a.cores.marca && b.cores.marca && distancia(a.cores.marca, b.cores.marca) > 20) n++;
  if (a.tipografia.titulos !== b.tipografia.titulos) n++;
  if (a.tipografia.texto !== b.tipografia.texto) n += 0.5;
  if (a.forma.raio !== b.forma.raio) n += 0.5;
  if (a.forma.sombra !== b.forma.sombra) n += 0.5;
  if (a.densidade !== b.densidade) n += 0.5;
  if (a.movimento !== b.movimento) n += 0.5;
  if (a.cores.neutros !== b.cores.neutros) n += 0.5;
  return n;
}

/**
 * Valida o conjunto de propostas. Lança ErroCreative com tudo o que precisa mudar, ou devolve {propostas, alertas}.
 */
export function validarDirecoes(lista, brief) {
  if (!Array.isArray(lista) || !lista.length) throw new ErroCreative('Envie de 2 a 3 propostas de direção em "propostas".');
  const marcaFechada = !!(brief?.marca?.cores?.length && brief?.marca?.fontes?.length);
  if (lista.length < 2 && !marcaFechada) throw new ErroCreative('Envie pelo menos 2 direções bem diferentes para o usuário escolher. (Uma só é aceita quando a marca já tem cores e fontes definidas no briefing.)');
  if (lista.length > 3) throw new ErroCreative('Envie no máximo 3 direções: mais do que isso cansa quem escolhe.');
  const erros = [];
  const alertas = [];
  const propostas = lista.map((p, i) => {
    const r = normalizarProposta(p || {}, i, brief);
    erros.push(...r.erros);
    alertas.push(...r.alertas);
    return r.proposta;
  });
  for (let i = 0; i < propostas.length; i++) {
    for (let j = i + 1; j < propostas.length; j++) {
      const n = eixosDiferentes(propostas[i], propostas[j]);
      if (n < 2) erros.push(`"${propostas[i].nome}" e "${propostas[j].nome}" são variações da mesma ideia. Mude pelo menos dois eixos fortes (modo, cor da marca, fonte de títulos) e alguns secundários (forma, densidade, movimento).`);
    }
  }
  const nomes = new Set();
  for (const p of propostas) {
    if (nomes.has(p.nome.toLowerCase())) erros.push(`Duas propostas com o mesmo nome "${p.nome}".`);
    nomes.add(p.nome.toLowerCase());
  }
  if (erros.length) {
    throw new ErroCreative('As direções ainda não passam no crivo do estúdio:\n- ' + erros.join('\n- ') +
      (alertas.length ? '\n\nTambém vale ajustar:\n- ' + alertas.join('\n- ') : ''));
  }
  return { propostas, alertas };
}

/** Resumo em texto de uma direção, para a IA e para o DESIGN.md. */
export function resumoDirecao(d) {
  return [
    `${d.nome}: ${d.conceito}`,
    `Referência: ${d.referencia}. Assinatura: ${d.assinatura}.`,
    `Modo ${d.modo}; marca ${d.cores.marca}${d.cores.acento ? `, acento ${d.cores.acento}` : ''}; neutros ${d.cores.neutros}.`,
    `Tipografia: ${d.tipografia.titulos} (títulos) + ${d.tipografia.texto} (texto)${d.tipografia.mono ? ` + ${d.tipografia.mono} (mono)` : ''}.`,
    `Forma: raio ${d.forma.raio}, borda ${d.forma.borda}, sombra ${d.forma.sombra}. Densidade ${d.densidade}. Movimento ${d.movimento}.`,
    d.layout ? `Composição: ${d.layout}.` : '',
    d.evitar.length ? `Evita de propósito: ${d.evitar.join('; ')}.` : '',
  ].filter(Boolean).join('\n');
}
