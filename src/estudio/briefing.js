// Motor de briefing: as perguntas certas para cada tipo de projeto e a validação do que foi respondido.
import { ErroCreative } from '../config.js';

export const TIPOS = ['site', 'landing', 'ecommerce', 'app', 'dashboard', 'jogo', 'outro'];

const PERGUNTAS_BASE = [
  ['assunto', 'Do que exatamente se trata? Um assunto concreto (ex.: "barbearia de bairro em Natal com agendamento"), não uma categoria.'],
  ['publico', 'Quem vai usar? Idade, contexto, o que essa pessoa já sabe e o que ela quer resolver.'],
  ['objetivo', 'Qual é o trabalho principal desta peça? Uma ação mensurável (agendar, comprar, pedir orçamento, aprender, jogar).'],
  ['tom', 'Três a cinco adjetivos de tom (ex.: direto, caloroso, técnico, sofisticado, divertido).'],
  ['conteudo', 'Conteúdo real disponível: textos, serviços, preços, diferenciais, depoimentos, dados de contato.'],
];
const PERGUNTAS_POR_TIPO = {
  site: [['paginas', 'Quais páginas precisa ter?']],
  landing: [['oferta', 'Qual é a oferta e o principal benefício? Existe garantia, prazo ou bônus?'], ['prova', 'Que provas existem: depoimentos, números reais, clientes, certificações?']],
  ecommerce: [['catalogo', 'Quantos produtos e quais categorias? Há variações (tamanho, cor)?'], ['logistica', 'Como é o frete, prazos e formas de pagamento?']],
  app: [['tarefas', 'Quais são as 3 tarefas principais que a pessoa faz no app?'], ['dados', 'Que dados o app guarda e mostra?']],
  dashboard: [['metricas', 'Quais métricas ou decisões o painel precisa apoiar?'], ['dados', 'De onde vêm os dados e com que frequência mudam?']],
  jogo: [['mecanica', 'Qual é a mecânica principal e o objetivo do jogador?'], ['plataforma', 'Teclado, toque ou os dois? Partidas curtas ou longas?']],
  outro: [['detalhes', 'Descreva o que precisa ser construído e como vai ser usado.']],
};
const PERGUNTAS_MARCA = [
  ['marca', 'A marca já tem nome, cores, fontes ou logo? (Se tiver, eles mandam no design.)'],
  ['referencias', 'Sites ou apps que você admira e que você não quer parecer.'],
];

export function perguntasDoBriefing(tipo = 'site') {
  const t = TIPOS.includes(tipo) ? tipo : 'outro';
  return [...PERGUNTAS_BASE, ...PERGUNTAS_POR_TIPO[t], ...PERGUNTAS_MARCA].map(([campo, pergunta]) => ({ campo, pergunta }));
}

const GENERICO = /^(site|app|loja|empresa|neg[oó]cio|projeto|landing ?page|sistema|aplicativo)( (moderno|bonito|profissional|novo))?\.?$/i;

/** Valida e normaliza o briefing. Devolve { brief } ou lança com a lista do que falta. */
export function validarBriefing(b) {
  const faltando = [];
  const tipo = TIPOS.includes(b.tipo) ? b.tipo : null;
  if (!tipo) faltando.push(`tipo (um de: ${TIPOS.join(', ')})`);
  const assunto = String(b.assunto || '').trim();
  if (assunto.length < 12 || GENERICO.test(assunto)) faltando.push('assunto concreto (ex.: "agenda online da barbearia Navalha e Café, em Natal"), não uma categoria');
  if (String(b.publico || '').trim().length < 10) faltando.push('público (quem usa e em que contexto)');
  if (String(b.objetivo || '').trim().length < 8) faltando.push('objetivo principal (a ação que a peça precisa provocar)');
  const tom = (Array.isArray(b.tom) ? b.tom : String(b.tom || '').split(/[,;]/)).map((s) => s.trim()).filter(Boolean);
  if (tom.length < 2) faltando.push('tom (pelo menos 2 adjetivos)');
  if (String(b.conteudo || '').trim().length < 30) faltando.push('conteúdo real (textos, serviços, preços, diferenciais); sem isso o site vira texto genérico');
  if (faltando.length) {
    const perguntas = perguntasDoBriefing(tipo || 'outro').map((p) => `- ${p.pergunta}`).join('\n');
    throw new ErroCreative(`O briefing ainda não está completo. Falta: ${faltando.join('; ')}.\n\nPergunte ao usuário (sem inventar respostas):\n${perguntas}`);
  }
  const cores = (b.marca?.cores || []).filter((c) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(c).trim()));
  return {
    tipo, assunto, publico: String(b.publico).trim(), objetivo: String(b.objetivo).trim(), tom,
    conteudo: String(b.conteudo).trim(), idioma: b.idioma || 'pt-BR',
    nicho: b.nicho ? String(b.nicho).trim() : null,
    marca: b.marca ? { nome: b.marca.nome || null, cores, fontes: b.marca.fontes || [], logo: b.marca.logo || null } : null,
    referencias: b.referencias || null,
    extras: b.extras || null,
    registradoEm: new Date().toISOString(),
  };
}
