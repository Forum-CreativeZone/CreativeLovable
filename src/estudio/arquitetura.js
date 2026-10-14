// Motor de arquitetura: páginas, seções com propósito, navegação, fluxos e estados.
// Valida o plano antes de qualquer código e gera docs/ARQUITETURA.md.
import { ErroCreative } from '../config.js';

const PLACEHOLDER = /lorem|ipsum|placeholder|texto aqui|seu texto|conte[uú]do aqui|t[ií]tulo aqui|xxx|a definir|tbd/i;
const GENERICAS = ['hero', 'beneficios', 'recursos', 'features', 'depoimentos', 'cta', 'rodape'];

const tipoSecao = (s) => String(s.tipo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

/** Normaliza e valida a arquitetura. Lança ErroCreative com a lista do que falta; devolve {arquitetura, alertas}. */
export function validarArquitetura(a, brief) {
  const erros = [];
  const alertas = [];
  const paginas = Array.isArray(a?.paginas) ? a.paginas : [];
  if (!paginas.length) erros.push('Liste as páginas (ou telas) em "paginas", cada uma com caminho, título, objetivo e seções.');
  const caminhos = new Set();
  const norm = paginas.map((p, i) => {
    const rot = `Página ${i + 1}${p?.titulo ? ` ("${p.titulo}")` : ''}`;
    const caminho = String(p?.caminho || '').trim().replace(/^\/+/, '');
    if (!caminho) erros.push(`${rot}: falta o caminho (ex.: index.html, servicos.html, src/pages/Agenda.jsx).`);
    if (caminhos.has(caminho)) erros.push(`${rot}: caminho repetido "${caminho}".`);
    caminhos.add(caminho);
    if (String(p?.objetivo || '').trim().length < 12) erros.push(`${rot}: diga o objetivo da página (o que a pessoa precisa conseguir fazer nela).`);
    const secoes = Array.isArray(p?.secoes) ? p.secoes : [];
    const minimo = brief?.tipo === 'landing' && i === 0 ? 4 : 2;
    if (secoes.length < minimo) erros.push(`${rot}: precisa de pelo menos ${minimo} seções com propósito.`);
    const ns = secoes.map((s, j) => {
      const rs = `${rot}, seção ${j + 1}${s?.tipo ? ` (${s.tipo})` : ''}`;
      if (String(s?.proposito || '').trim().length < 10) erros.push(`${rs}: falta o propósito (o que essa seção faz pela pessoa ou pelo objetivo).`);
      if (String(s?.conteudo || '').trim().length < 12) erros.push(`${rs}: descreva o conteúdo real que vai nela (do briefing), não "texto sobre a empresa".`);
      if (PLACEHOLDER.test(`${s?.conteudo || ''} ${s?.titulo || ''}`)) erros.push(`${rs}: tem texto de enchimento. Use o conteúdo real ou marque o que falta em "conteudoPendente".`);
      return {
        id: String(s?.id || `${tipoSecao(s) || 'secao'}-${j + 1}`).trim(),
        tipo: String(s?.tipo || 'conteudo').trim(),
        titulo: s?.titulo ? String(s.titulo).trim() : null,
        proposito: String(s?.proposito || '').trim(),
        conteudo: String(s?.conteudo || '').trim(),
        componentes: Array.isArray(s?.componentes) ? s.componentes.map(String) : [],
        layout: s?.layout ? String(s.layout).trim() : null,
      };
    });
    const tipos = ns.map(tipoSecao);
    const genericas = tipos.filter((t) => GENERICAS.some((g) => t.includes(g))).length;
    if (ns.length >= 4 && genericas >= ns.length - 1) {
      alertas.push(`${rot}: a sequência (${ns.map((s) => s.tipo).join(' → ')}) é a estrutura mais repetida da internet. Ela pode servir, mas o que torna esta página diferente? Considere uma seção própria do negócio (processo, bastidores, comparação, calculadora, mapa de horários).`);
    }
    if (ns.filter((s) => /3|tr[eê]s/.test(s.layout || '') && /cart/i.test(s.layout || '')).length >= 2) {
      alertas.push(`${rot}: duas ou mais seções em grade de 3 cartões. Varie o ritmo (lista, tabela, coluna larga, destaque assimétrico).`);
    }
    return { caminho, titulo: String(p?.titulo || caminho).trim(), objetivo: String(p?.objetivo || '').trim(), secoes: ns };
  });

  const nav = a?.navegacao || {};
  const principal = Array.isArray(nav.principal) ? nav.principal : [];
  if (norm.length > 1 && !principal.length) erros.push('Com mais de uma página, descreva a navegação em navegacao.principal ([{ rotulo, destino }]).');

  const interativo = ['app', 'dashboard', 'ecommerce', 'jogo'].includes(brief?.tipo);
  const fluxos = Array.isArray(a?.fluxos) ? a.fluxos : [];
  if (interativo && !fluxos.length) erros.push(`Um ${brief.tipo} precisa dos fluxos principais em "fluxos" ([{ nome, passos: [...] }]), por exemplo "agendar horário: escolher serviço → escolher dia → confirmar".`);
  const estados = a?.estados || {};
  if (interativo) {
    const falta = ['vazio', 'carregando', 'erro', 'sucesso'].filter((k) => !String(estados[k] || '').trim());
    if (falta.length) erros.push(`Descreva os estados ${falta.join(', ')} em "estados" (o que a pessoa vê em cada um). Apps profissionais desenham mais do que o caminho feliz.`);
  }
  if (String(a?.responsivo || '').trim().length < 15) alertas.push('Diga em "responsivo" como o layout se reorganiza no celular (o que empilha, o que some, onde fica a ação principal).');

  if (erros.length) throw new ErroCreative('A arquitetura ainda não está pronta:\n- ' + erros.join('\n- ') + (alertas.length ? '\n\nTambém vale ajustar:\n- ' + alertas.join('\n- ') : ''));
  return {
    arquitetura: {
      paginas: norm,
      navegacao: { principal: principal.map((l) => ({ rotulo: String(l.rotulo || '').trim(), destino: String(l.destino || '').trim() })), rodape: Array.isArray(nav.rodape) ? nav.rodape : [] },
      fluxos: fluxos.map((f) => ({ nome: String(f.nome || '').trim(), passos: (Array.isArray(f.passos) ? f.passos : []).map(String) })),
      estados: Object.fromEntries(Object.entries(estados).map(([k, v]) => [k, String(v)])),
      dados: Array.isArray(a?.dados) ? a.dados : [],
      responsivo: String(a?.responsivo || '').trim(),
      conteudoPendente: Array.isArray(a?.conteudoPendente) ? a.conteudoPendente.map(String) : [],
      registradaEm: new Date().toISOString(),
    },
    alertas,
  };
}

/** docs/ARQUITETURA.md legível para o usuário e para outras IAs. */
export function arquiteturaMarkdown(a, brief) {
  const l = [`# Arquitetura${brief?.assunto ? ` · ${brief.assunto}` : ''}`, ''];
  if (brief?.objetivo) l.push(`**Objetivo:** ${brief.objetivo}`, '');
  l.push('## Páginas', '');
  for (const p of a.paginas) {
    l.push(`### ${p.titulo} (\`${p.caminho}\`)`, '', `Objetivo: ${p.objetivo}`, '');
    p.secoes.forEach((s, i) => {
      l.push(`${i + 1}. **${s.titulo || s.tipo}** · ${s.proposito}`);
      l.push(`   Conteúdo: ${s.conteudo}`);
      if (s.layout) l.push(`   Layout: ${s.layout}`);
      if (s.componentes.length) l.push(`   Componentes: ${s.componentes.join(', ')}`);
    });
    l.push('');
  }
  if (a.navegacao.principal.length) l.push('## Navegação', '', ...a.navegacao.principal.map((n) => `- ${n.rotulo} → ${n.destino}`), '');
  if (a.fluxos.length) l.push('## Fluxos', '', ...a.fluxos.map((f) => `- **${f.nome}:** ${f.passos.join(' → ')}`), '');
  if (Object.keys(a.estados).length) l.push('## Estados', '', ...Object.entries(a.estados).map(([k, v]) => `- **${k}:** ${v}`), '');
  if (a.dados.length) l.push('## Dados', '', ...a.dados.map((d) => `- ${typeof d === 'string' ? d : `${d.entidade}: ${(d.campos || []).join(', ')}`}`), '');
  if (a.responsivo) l.push('## Responsivo', '', a.responsivo, '');
  if (a.conteudoPendente.length) l.push('## Conteúdo pendente (pedir ao cliente)', '', ...a.conteudoPendente.map((c) => `- ${c}`), '');
  return l.join('\n');
}

/** docs/BRIEFING.md (equivalente ao PRODUCT.md): a fonte da verdade do projeto. */
export function briefingMarkdown(b) {
  const l = [`# Briefing · ${b.assunto}`, '', `- **Tipo:** ${b.tipo}`, `- **Público:** ${b.publico}`, `- **Objetivo:** ${b.objetivo}`, `- **Tom:** ${b.tom.join(', ')}`, `- **Idioma:** ${b.idioma}`];
  if (b.nicho) l.push(`- **Nicho:** ${b.nicho}`);
  if (b.marca) {
    l.push('', '## Marca', '');
    if (b.marca.nome) l.push(`- Nome: ${b.marca.nome}`);
    if (b.marca.cores.length) l.push(`- Cores: ${b.marca.cores.join(', ')}`);
    if (b.marca.fontes.length) l.push(`- Fontes: ${b.marca.fontes.join(', ')}`);
    if (b.marca.logo) l.push(`- Logo: ${b.marca.logo}`);
  }
  l.push('', '## Conteúdo real', '', b.conteudo);
  if (b.referencias) l.push('', '## Referências', '', typeof b.referencias === 'string' ? b.referencias : JSON.stringify(b.referencias, null, 2));
  if (b.extras) l.push('', '## Detalhes', '', ...Object.entries(b.extras).map(([k, v]) => `- **${k}:** ${typeof v === 'string' ? v : JSON.stringify(v)}`));
  return l.join('\n') + '\n';
}
