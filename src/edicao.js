// Edição por trechos: cada "buscar" precisa existir uma única vez (ou use "todas").
// Se o texto exato não existir, tenta casar linha a linha ignorando espaços e indentação.

const normalizar = (s) => s.trim().replace(/\s+/g, ' ');

function contar(texto, trecho) {
  if (!trecho) return 0;
  let n = 0;
  let i = texto.indexOf(trecho);
  while (i >= 0) { n++; i = texto.indexOf(trecho, i + trecho.length); }
  return n;
}

function buscaTolerante(texto, trecho) {
  const alvo = trecho.split('\n').map(normalizar);
  while (alvo.length && !alvo[0]) alvo.shift();
  while (alvo.length && !alvo[alvo.length - 1]) alvo.pop();
  if (!alvo.length) return [];
  const linhas = texto.split('\n');
  const inicios = [];
  let pos = 0;
  for (const l of linhas) { inicios.push(pos); pos += l.length + 1; }
  const norm = linhas.map(normalizar);
  const achados = [];
  fora: for (let i = 0; i <= norm.length - alvo.length; i++) {
    for (let j = 0; j < alvo.length; j++) if (norm[i + j] !== alvo[j]) continue fora;
    const fim = i + alvo.length - 1;
    achados.push([inicios[i], inicios[fim] + linhas[fim].length]);
  }
  return achados;
}

function bigramas(s) {
  const t = normalizar(s).toLowerCase();
  const m = new Map();
  for (let i = 0; i < t.length - 1; i++) { const b = t.slice(i, i + 2); m.set(b, (m.get(b) || 0) + 1); }
  return m;
}
function semelhanca(a, b) {
  const A = bigramas(a), B = bigramas(b);
  let inter = 0, tot = 0;
  for (const [k, v] of A) { tot += v; if (B.has(k)) inter += Math.min(v, B.get(k)); }
  for (const v of B.values()) tot += v;
  return tot ? (2 * inter) / tot : 0;
}

/** Linha do arquivo mais parecida com a primeira linha do trecho procurado. */
export function maisParecida(texto, trecho) {
  const ref = trecho.split('\n').map((l) => l.trim()).find(Boolean);
  if (!ref) return null;
  let melhor = null;
  texto.split('\n').forEach((linha, i) => {
    if (!linha.trim()) return;
    const s = semelhanca(ref, linha);
    if (!melhor || s > melhor.s) melhor = { s, linha: i + 1, texto: linha.trim().slice(0, 160) };
  });
  return melhor && melhor.s > 0.35 ? melhor : null;
}

/**
 * Aplica edições em sequência. Atômico: se qualquer uma falhar, nada muda.
 * @param {string} texto
 * @param {{buscar:string, substituir:string, todas?:boolean}[]} edicoes
 */
export function aplicarEdicoes(texto, edicoes) {
  let atual = texto.replace(/\r\n/g, '\n');
  const resultados = [];
  for (let i = 0; i < edicoes.length; i++) {
    const { buscar, substituir, todas } = edicoes[i];
    const busca = String(buscar ?? '').replace(/\r\n/g, '\n');
    const novo = String(substituir ?? '').replace(/\r\n/g, '\n');
    const rotulo = `Edição ${i + 1}`;
    if (!busca.trim()) return { ok: false, erro: `${rotulo}: o trecho "buscar" está vazio.` };

    const n = contar(atual, busca);
    if (n === 1 || (n > 1 && todas)) {
      atual = todas ? atual.split(busca).join(novo) : atual.replace(busca, () => novo);
      resultados.push({ edicao: i + 1, modo: 'exato', trocas: todas ? n : 1 });
      continue;
    }
    if (n > 1) {
      return { ok: false, erro: `${rotulo}: o trecho aparece ${n} vezes. Inclua mais linhas de contexto para ficar único, ou use "todas": true.` };
    }
    const tol = buscaTolerante(atual, busca);
    if (tol.length === 1 || (tol.length > 1 && todas)) {
      const lista = todas ? tol : tol.slice(0, 1);
      for (const [ini, fim] of lista.slice().reverse()) atual = atual.slice(0, ini) + novo + atual.slice(fim);
      resultados.push({ edicao: i + 1, modo: 'ignorando espaços', trocas: lista.length });
      continue;
    }
    if (tol.length > 1) {
      return { ok: false, erro: `${rotulo}: o trecho (ignorando espaços) aparece ${tol.length} vezes. Inclua mais contexto.` };
    }
    const dica = maisParecida(atual, busca);
    return {
      ok: false,
      erro: `${rotulo}: trecho não encontrado.` + (dica ? ` A linha mais parecida é a ${dica.linha}: ${dica.texto}` : '') +
        ' Leia o arquivo de novo com cl_ler e copie o trecho exatamente.',
    };
  }
  return { ok: true, texto: atual, resultados };
}
