// Ferramentas do estúdio: o Creative Lovable conduz briefing, direção de arte, design system, arquitetura,
// componentes, auditoria, crítica, refino e exportação para o Figma. A IA executa; o estúdio decide a ordem e o padrão.
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ErroCreative } from './config.js';
import { MODELOS } from './modelos.js';
import { NOME_FASE } from './estudio/estado.js';
import { validarBriefing, perguntasDoBriefing, TIPOS } from './estudio/briefing.js';
import { TIPOS_CATALOGO, recomendarDirecoes, recomendarEstruturas, buscar } from './estudio/catalogo.js';
import { sugerirFontes, buscarFontes, ehSaturada, FONTES_SATURADAS } from './estudio/fontes.js';
import { validarDirecoes, resumoDirecao, OPCOES } from './estudio/direcao.js';
import { gerarSistema, arquivosDoSistema, cabecalhoHtml } from './estudio/sistema.js';
import { validarArquitetura, arquiteturaMarkdown, briefingMarkdown } from './estudio/arquitetura.js';
import { COMPONENTES, cssDoComponente, REACT, REACT_DO_COMPONENTE } from './estudio/componentes.js';
import { auditar, relatorioTexto } from './estudio/auditoria.js';
import { COMANDOS, instrucoesDeRefino, rubricaDeCritica } from './estudio/refino.js';
import { arquivosFigma } from './estudio/figma.js';
import { capturarTela, INSTRUCOES_CAPTURA } from './captura.js';

const PROJETO = z.string().min(1).describe('Identificador do projeto (slug) ou nome, como aparece em cl_projetos.');

const lista = (xs) => xs.map((x) => `- ${x}`).join('\n');

export function registrarEstudio({ servidor, ferramenta, workspace, painel, processos, estudio, texto, falha, avisar, mudouArquivos }) {
  const avisarEstudio = (slug) => painel.notificar({ tipo: 'estudio', projeto: slug });

  async function gravarArquivos(slug, arquivos) {
    for (const [rel, conteudo] of Object.entries(arquivos)) await workspace.escrever(slug, rel, conteudo);
    mudouArquivos(slug);
  }

  async function exigirBrief(slug) {
    const brief = await estudio.ler(slug, 'brief.json');
    if (!brief) throw new ErroCreative('Este projeto ainda não tem briefing. Converse com o usuário e registre com cl_briefing primeiro.');
    return brief;
  }

  const linkPainel = (slug) => (painel.disponivel ? `\nPainel: ${painel.urlPainel(slug)}` : '');

  // ---------- situação ----------
  ferramenta('cl_status', {
    title: 'Situação do estúdio',
    description: 'Mostra em que etapa o projeto está (briefing, direção de arte, design system, arquitetura, construção, auditoria, entrega), o que foi aprovado, pedidos de ajuste do usuário, permissões e o próximo passo. Consulte no início de cada sessão e sempre que não souber o que fazer.',
    inputSchema: { projeto: PROJETO },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ projeto }) => {
    const meta = await workspace.projeto(projeto);
    const s = await estudio.situacao(meta.slug);
    const c = s.config;
    const marca = { feita: '✓', atual: '→', 'aguardando-aprovacao': '⏳', pendente: '·' };
    const l = [`Projeto ${meta.slug} · modo ${c.modo === 'estudio' ? 'estúdio (etapas com portões)' : 'livre (sem portões)'} · aprovação: ${c.aprovacao} · nota mínima ${c.notaMinima}`];
    l.push(`Permissões: comandos ${c.permissoes.comandos ? 'sim' : 'não'}, internet ${c.permissoes.rede ? 'sim' : 'não'}, apagar ${c.permissoes.apagar ? 'sim' : 'não'} (só o usuário muda, no painel).`, '');
    for (const e of s.etapas) l.push(`${marca[e.estado]} ${NOME_FASE[e.fase]}: ${e.detalhe}`);
    if (s.feedback.length) {
      l.push('', 'Pedidos de ajuste do usuário:');
      for (const f of s.feedback) l.push(`- ${NOME_FASE[f.etapa]}: "${f.texto}"`);
      await estudio.marcarFeedbackLido(meta.slug);
    }
    if (s.dados.direcao) l.push('', 'Direção aprovada:', resumoDirecao(s.dados.direcao));
    l.push('', `Próximo passo: ${s.proximoPasso}`);
    return texto(l.join('\n') + linkPainel(meta.slug));
  });

  // ---------- briefing ----------
  ferramenta('cl_briefing', {
    title: 'Registrar briefing',
    description: 'Registra o briefing do projeto: tipo, assunto concreto, público, objetivo, tom, conteúdo real e marca. Sem dados suficientes, devolve as perguntas que você deve fazer ao usuário (não invente respostas). Grava docs/BRIEFING.md.',
    inputSchema: {
      projeto: PROJETO,
      tipo: z.enum(TIPOS).describe('site, landing, ecommerce, app, dashboard, jogo ou outro.'),
      assunto: z.string().optional().describe('Assunto concreto: "agenda online da barbearia Navalha e Café, em Natal".'),
      publico: z.string().optional().describe('Quem usa, em que contexto, o que quer resolver.'),
      objetivo: z.string().optional().describe('A ação principal que a peça precisa provocar.'),
      tom: z.array(z.string()).optional().describe('2 a 5 adjetivos de tom.'),
      conteudo: z.string().optional().describe('Conteúdo real: serviços, preços, diferenciais, contatos, textos que o usuário passou.'),
      nicho: z.string().optional(),
      idioma: z.string().optional().describe('Padrão pt-BR.'),
      marca: z.object({ nome: z.string().optional(), cores: z.array(z.string()).optional(), fontes: z.array(z.string()).optional(), logo: z.string().optional() }).optional().describe('Identidade que já existe (manda no design).'),
      referencias: z.string().optional().describe('Referências que o usuário admira ou rejeita.'),
      extras: z.record(z.string(), z.any()).optional().describe('Respostas específicas do tipo (páginas, oferta, provas, tarefas, métricas, mecânica...).'),
      apenas_perguntas: z.boolean().optional().describe('Só devolver as perguntas certas para este tipo.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (a) => {
    const meta = await workspace.projeto(a.projeto);
    if (a.apenas_perguntas) return texto(`Perguntas para um briefing de ${a.tipo}:\n${lista(perguntasDoBriefing(a.tipo).map((p) => p.pergunta))}`);
    const brief = validarBriefing(a);
    const anterior = await estudio.ler(meta.slug, 'brief.json');
    await estudio.gravar(meta.slug, 'brief.json', brief);
    await workspace.escrever(meta.slug, 'docs/BRIEFING.md', briefingMarkdown(brief));
    mudouArquivos(meta.slug);
    avisar(meta.slug, `Briefing ${anterior ? 'atualizado' : 'registrado'}: ${brief.assunto}`);
    avisarEstudio(meta.slug);
    const s = await estudio.situacao(meta.slug);
    return texto(`Briefing ${anterior ? 'atualizado' : 'registrado'} e salvo em docs/BRIEFING.md.\n` +
      (anterior && s.dados.direcao ? 'Atenção: já havia uma direção aprovada. Se o briefing mudou de verdade, proponha novas direções.\n' : '') +
      `Próximo passo: ${s.proximoPasso}`);
  });

  // ---------- catálogo ----------
  ferramenta('cl_catalogo', {
    title: 'Biblioteca de referência de design',
    description: 'Consulta a biblioteca do estúdio. tipo "direcoes": convenção do setor do projeto, estilos candidatos, fontes curadas e pares, para criar direções de arte. "estruturas": padrões de página, diretrizes de UX e de gráficos para o briefing. "fontes": fontes curadas por tom (ou busca no catálogo de 1.900 famílias). Também: estilos, setores, pares, ux, movimento, graficos (busca livre por termo).',
    inputSchema: {
      tipo: z.enum(TIPOS_CATALOGO),
      projeto: PROJETO.optional(),
      termo: z.string().optional().describe('Termo de busca (português ou inglês).'),
      limite: z.number().int().min(1).max(20).optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ tipo, projeto, termo = '', limite = 8 }) => {
    const brief = projeto ? await estudio.ler((await workspace.projeto(projeto)).slug, 'brief.json') : null;
    if (tipo === 'direcoes') {
      if (!brief) throw new ErroCreative('Para recomendar direções, informe um projeto com briefing registrado.');
      const r = recomendarDirecoes(brief);
      const l = ['# Material para as direções de arte', ''];
      if (r.setor) {
        l.push(`## Convenção do setor (${r.setor.nome})`, 'É o que a maioria faz. Use para entender o que o público espera e diverja de propósito em pelo menos dois eixos.');
        l.push(`- Estilo comum: ${r.setor.estilo}`, `- Estrutura comum: ${r.setor.estrutura}`, `- Cor comum: ${r.setor.cor}${r.setor.paleta ? ` (ex.: ${r.setor.paleta.primaria}, ${r.setor.paleta.acento} sobre ${r.setor.paleta.fundo})` : ''}`, `- Tipografia comum: ${r.setor.tipografia}`, `- Armadilhas do setor: ${r.setor.antiPadroes}`, `- Cuidados: ${r.setor.consideracoes}`);
        if (r.outrosSetores.length) l.push(`- Setores próximos: ${r.outrosSetores.join(', ')}`);
      }
      l.push('', '## Estilos candidatos (combine, não copie)');
      for (const e of r.estilos) l.push(`- **${e.nome}**: ${e.palavras.join(', ')}. Bom para: ${e.idealPara}. Evitar em: ${e.evitarEm}. Como fazer: ${e.checklist.join('; ')}.`);
      l.push('', `## Fontes curadas para o tom (${r.fontes.humores.join(', ') || 'neutro'})`);
      l.push(`- Títulos: ${r.fontes.titulos.map((f) => `${f.nome} (${f.categoria}; ${f.humor.join('/')})`).join(', ')}`);
      l.push(`- Texto: ${r.fontes.texto.map((f) => `${f.nome} (${f.categoria})`).join(', ')}`);
      l.push(`- Mono: ${r.fontes.mono.map((f) => f.nome).join(', ')}`);
      if (r.pares.length) l.push('', '## Pares conhecidos (os marcados com * usam fonte saturada e serão recusados)', ...r.pares.map((p) => `- ${p.nome}: ${p.titulos} + ${p.texto}${p.saturado ? ' *' : ''} (${p.humor.join(', ')})`));
      l.push('', '## Como enviar', `cl_propor_direcoes com 2 ou 3 propostas. Cada uma: nome, conceito (por que serve a este público), referencia (do mundo real), assinatura, modo (${OPCOES.modo.join('/')}), cores { marca, acento?, fundo?, neutros (${OPCOES.neutros.join('/')}), estrategia }, tipografia { titulos, texto, mono?, justificativa }, forma { raio (${OPCOES.raio.join('/')}), borda (${OPCOES.borda.join('/')}), sombra (${OPCOES.sombra.join('/')}) }, densidade (${OPCOES.densidade.join('/')}), movimento (${OPCOES.movimento.join('/')}), layout, evitar [].`);
      l.push(`Fontes recusadas sem justificativa de marca: ${FONTES_SATURADAS.join(', ')}.`);
      return texto(l.join('\n'));
    }
    if (tipo === 'estruturas') {
      const r = recomendarEstruturas(brief || { tipo: 'site', objetivo: termo });
      const l = ['# Estruturas e diretrizes', ''];
      if (r.convencao) l.push(`Estrutura comum no setor: ${r.convencao} (ponto de partida, não receita).`, '');
      l.push('## Padrões de página');
      for (const e of r.estruturas) l.push(`- **${e.nome}**: ${e.ordem.join(' → ')}. CTA: ${e.cta}. Conversão: ${e.conversao}`);
      l.push('', '## Diretrizes de UX relevantes');
      for (const u of r.ux) l.push(`- ${u.categoria} · ${u.tema} (${u.severidade}): faça "${u.fazer}"; evite "${u.naoFazer}".`);
      if (r.graficos.length) { l.push('', '## Gráficos'); for (const g of r.graficos) l.push(`- ${g.dado}: ${g.melhor} (alternativa: ${g.alternativas}). Quando: ${g.quando}. Acessível: ${g.acessibilidade}`); }
      l.push('', 'Registre com cl_arquitetura: paginas [{ caminho, titulo, objetivo, secoes: [{ tipo, titulo, proposito, conteudo, layout, componentes }] }], navegacao { principal: [{ rotulo, destino }] }, fluxos, estados { vazio, carregando, erro, sucesso }, dados, responsivo, conteudoPendente.');
      return texto(l.join('\n'));
    }
    if (tipo === 'fontes') {
      if (termo) {
        const achadas = buscarFontes({ termo, limite });
        return texto(achadas.length ? achadas.map((f) => `- ${f.nome} (${f.categoria}; pesos ${f.pesos.join(', ')})${f.saturada ? ' [saturada]' : ''}`).join('\n') : `Nenhuma família com "${termo}" no catálogo.`);
      }
      const r = sugerirFontes(brief?.tom || [], { limite });
      return texto([`Fontes curadas${brief ? ` para o tom ${brief.tom.join(', ')}` : ''}:`, `Títulos: ${r.titulos.map((f) => f.nome).join(', ')}`, `Texto: ${r.texto.map((f) => f.nome).join(', ')}`, `Mono: ${r.mono.map((f) => f.nome).join(', ')}`, `\nSaturadas (evite): ${FONTES_SATURADAS.join(', ')}`].join('\n'));
    }
    const itens = buscar(tipo, termo, limite);
    if (!itens.length) return texto(`Nada encontrado em ${tipo} para "${termo}".`);
    const fmt = {
      estilos: (e) => `- **${e.nome}**: ${e.palavras.join(', ')}. Bom para: ${e.idealPara}. Evitar em: ${e.evitarEm}. Efeitos: ${e.efeitos}. Checklist: ${e.checklist.join('; ')}`,
      setores: (s) => `- **${s.nome}**: estilo ${s.estilo}; estrutura ${s.estrutura}; cor ${s.cor}; cuidado: ${s.consideracoes}; armadilhas: ${s.antiPadroes}`,
      pares: (p) => `- **${p.nome}**: ${p.titulos} + ${p.texto}${ehSaturada(p.titulos) || ehSaturada(p.texto) ? ' [usa fonte saturada]' : ''}. ${p.humor.join(', ')}. ${p.notas}`,
      ux: (u) => `- ${u.categoria} · ${u.tema} (${u.plataforma}, ${u.severidade}): ${u.descricao} Faça: ${u.fazer} Evite: ${u.naoFazer}`,
      movimento: (m) => `- ${m.categoria} (${m.intensidade}): ${m.duracao}, ${m.easing}. Faça: ${m.fazer} Evite: ${m.naoFazer}`,
      graficos: (g) => `- ${g.dado}: ${g.melhor}. Quando: ${g.quando}. Evite quando: ${g.quandoNao}. Acessível: ${g.acessibilidade}`,
    }[tipo];
    return texto(itens.map(fmt).join('\n'));
  });

  // ---------- direção de arte ----------
  ferramenta('cl_propor_direcoes', {
    title: 'Propor direções de arte',
    description: 'Envia 2 ou 3 direções de arte bem diferentes para o usuário escolher. O estúdio recusa propostas genéricas (fontes saturadas, paletas-clichê, conceitos vagos, propostas parecidas entre si). As aprovadas viram o design system. Veja o formato em cl_catalogo tipo "direcoes".',
    inputSchema: {
      projeto: PROJETO,
      propostas: z.array(z.object({
        nome: z.string(), conceito: z.string(), referencia: z.string(), assinatura: z.string(),
        modo: z.enum(OPCOES.modo).optional(),
        cores: z.object({ marca: z.string(), acento: z.string().optional(), fundo: z.string().optional(), neutros: z.enum(OPCOES.neutros).optional(), estrategia: z.string().optional() }),
        tipografia: z.object({ titulos: z.string(), texto: z.string(), mono: z.string().optional(), justificativa: z.string().optional() }),
        forma: z.object({ raio: z.enum(OPCOES.raio).optional(), borda: z.enum(OPCOES.borda).optional(), sombra: z.enum(OPCOES.sombra).optional() }).optional(),
        densidade: z.enum(OPCOES.densidade).optional(),
        movimento: z.enum(OPCOES.movimento).optional(),
        contraste: z.enum(OPCOES.contraste).optional(),
        layout: z.string().optional(),
        evitar: z.array(z.string()).optional(),
      })).min(1).max(3),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ projeto, propostas }) => {
    const meta = await workspace.projeto(projeto);
    const brief = await exigirBrief(meta.slug);
    const r = validarDirecoes(propostas, brief);
    await estudio.gravar(meta.slug, 'direcoes.json', { propostas: r.propostas, alertas: r.alertas, em: new Date().toISOString() });
    await estudio.apagar(meta.slug, 'direcao.json');
    avisar(meta.slug, `${r.propostas.length} direções de arte propostas: ${r.propostas.map((p) => p.nome).join(', ')}`);
    avisarEstudio(meta.slug);
    const s = await estudio.situacao(meta.slug);
    return texto([
      `Direções registradas (${r.propostas.map((p) => `${p.id} "${p.nome}"`).join(', ')}).`,
      ...r.propostas.map((p) => `\n${p.id}. ${resumoDirecao(p)}`),
      r.alertas.length ? `\nPontos de atenção:\n${lista(r.alertas)}` : '',
      `\n${s.proximoPasso}${linkPainel(meta.slug)}`,
    ].filter(Boolean).join('\n'));
  });

  ferramenta('cl_aprovar', {
    title: 'Registrar aprovação do usuário',
    description: 'Registra a aprovação de uma etapa (direção de arte, arquitetura ou entrega) dada pelo usuário NA CONVERSA. Passe as palavras exatas dele. Só funciona se o projeto aceita aprovação pela conversa; senão, ele precisa aprovar no painel. Nunca aprove por conta própria.',
    inputSchema: {
      projeto: PROJETO,
      etapa: z.enum(['direcao', 'arquitetura', 'entrega']),
      id: z.string().optional().describe('Para direção: o id da proposta escolhida (d1, d2, d3).'),
      palavras_do_usuario: z.string().min(2).describe('O que o usuário disse ao aprovar, literalmente.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ projeto, etapa, id, palavras_do_usuario }) => {
    const meta = await workspace.projeto(projeto);
    const c = await estudio.config(meta.slug);
    if (c.aprovacao === 'painel') return falha(`Neste projeto as aprovações são só pelo painel. Peça ao usuário para aprovar lá.${linkPainel(meta.slug)}`);
    const por = c.aprovacao === 'automatica' ? 'ia (aprovação automática)' : 'conversa';
    const r = await estudio.aprovar(meta.slug, etapa, { id, por, palavras: palavras_do_usuario });
    avisar(meta.slug, `${NOME_FASE[etapa]} aprovada na conversa${etapa === 'direcao' ? `: ${r.nome}` : ''}`);
    avisarEstudio(meta.slug);
    const s = await estudio.situacao(meta.slug);
    return texto(`${NOME_FASE[etapa]} aprovada${etapa === 'direcao' ? ` ("${r.nome}")` : ''}, registrada com as palavras do usuário.\nPróximo passo: ${s.proximoPasso}`);
  });

  // ---------- design system ----------
  ferramenta('cl_gerar_design_system', {
    title: 'Gerar design system',
    description: 'Gera o design system da direção aprovada: cores em OKLCH com contraste WCAG garantido (temas claro e escuro), tipografia e espaços fluidos, forma, sombra e movimento, componentes acessíveis (HTML e React), tokens DTCG, tema do Tailwind, DESIGN.md e uma página de apresentação. Tudo em design-system/.',
    inputSchema: { projeto: PROJETO },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ projeto }) => {
    const meta = await workspace.projeto(projeto);
    const brief = await exigirBrief(meta.slug);
    const direcao = await estudio.ler(meta.slug, 'direcao.json');
    if (!direcao) throw new ErroCreative('Ainda não há direção de arte aprovada. Proponha com cl_propor_direcoes e espere a aprovação do usuário.');
    const s = gerarSistema(direcao, brief);
    const react = meta.modelo === 'react';
    const arquivos = arquivosDoSistema(s, direcao, brief, { react });
    await gravarArquivos(meta.slug, arquivos);
    await estudio.gravar(meta.slug, 'sistema.json', { ...s, geradoEm: new Date().toISOString(), arquivos: Object.keys(arquivos) });
    avisar(meta.slug, `Design system "${s.nome}" gerado (${Object.keys(arquivos).length} arquivos)`);
    avisarEstudio(meta.slug);
    const t = s.temas[s.modo];
    const st = await estudio.situacao(meta.slug);
    return texto([
      `Design system "${s.nome}" gerado em design-system/ (${Object.keys(arquivos).length} arquivos). Apresentação: design-system/index.html${painel.disponivel ? ` (${painel.urlPreview(meta.slug)}design-system/index.html)` : ''}.`,
      '',
      `Cores (${s.modo}): fundo ${t.fundo}, superfície ${t.superficie}, texto ${t.texto}, texto suave ${t['texto-suave']}, marca ${t.marca} (texto sobre ela ${t['sobre-marca']}), marca para links ${t['marca-texto']}, acento ${t.acento}.`,
      `Tipografia: ${s.tipografia.titulos.familia} ${s.tipografia.titulos.peso} nos títulos, ${s.tipografia.texto.familia} no texto, ${s.tipografia.mono.familia} para dados. Escala fluida de ${s.tipografia.tamanhos.base.min}–${s.tipografia.tamanhos.base.max}px (base) a ${s.tipografia.tamanhos['4xl'].max}px.`,
      `Contraste: ${s.contrastes.filter((c) => c.ok).length}/${s.contrastes.length} pares passam no WCAG AA.${s.ajustes.length ? ' Falham: ' + s.ajustes.map((a) => `${a.tema} ${a.frente}/${a.fundo} ${a.razao}:1`).join(', ') : ''}`,
      '',
      react
        ? 'Uso no React: no src/main.jsx importe "../design-system/tokens.css", "../design-system/base.css" e "../design-system/componentes.css"; ponha o <link> das fontes no index.html; componentes em design-system/react (import { Botao, Campo } from "../design-system/react").'
        : `Uso: coloque no <head> de cada página:\n${cabecalhoHtml(s)}`,
      'Com Tailwind 3 pelo CDN: carregue design-system/tailwind-tema.js depois do script do Tailwind e use bg-marca, text-texto-suave, font-titulos, p-m, rounded-cartao etc.',
      'Regras: só var(--cor-*), var(--fonte-*), var(--tamanho-*), var(--espaco-*), var(--raio-*), var(--sombra-*), var(--duracao-*). Componentes prontos com cl_componente.',
      '',
      `Próximo passo: ${st.proximoPasso}`,
    ].join('\n'));
  });

  // ---------- arquitetura ----------
  ferramenta('cl_arquitetura', {
    title: 'Registrar arquitetura',
    description: 'Registra a arquitetura antes do código: páginas (ou telas) com objetivo e seções com propósito e conteúdo real, navegação, fluxos, estados (vazio, carregando, erro, sucesso) e estratégia de responsivo. Grava docs/ARQUITETURA.md e fica aguardando a aprovação do usuário.',
    inputSchema: {
      projeto: PROJETO,
      paginas: z.array(z.object({
        caminho: z.string(), titulo: z.string(), objetivo: z.string(),
        secoes: z.array(z.object({
          id: z.string().optional(), tipo: z.string(), titulo: z.string().optional(), proposito: z.string(), conteudo: z.string(),
          layout: z.string().optional(), componentes: z.array(z.string()).optional(),
        })),
      })).min(1),
      navegacao: z.object({ principal: z.array(z.object({ rotulo: z.string(), destino: z.string() })).optional(), rodape: z.array(z.any()).optional() }).optional(),
      fluxos: z.array(z.object({ nome: z.string(), passos: z.array(z.string()) })).optional(),
      estados: z.object({ vazio: z.string().optional(), carregando: z.string().optional(), erro: z.string().optional(), sucesso: z.string().optional() }).optional(),
      dados: z.array(z.any()).optional(),
      responsivo: z.string().optional(),
      conteudoPendente: z.array(z.string()).optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ projeto, ...a }) => {
    const meta = await workspace.projeto(projeto);
    const brief = await exigirBrief(meta.slug);
    const r = validarArquitetura(a, brief);
    await estudio.gravar(meta.slug, 'arquitetura.json', r.arquitetura);
    await workspace.escrever(meta.slug, 'docs/ARQUITETURA.md', arquiteturaMarkdown(r.arquitetura, brief));
    mudouArquivos(meta.slug);
    avisar(meta.slug, `Arquitetura registrada: ${r.arquitetura.paginas.length} página(s)`);
    avisarEstudio(meta.slug);
    const s = await estudio.situacao(meta.slug);
    return texto([`Arquitetura registrada (${r.arquitetura.paginas.map((p) => p.caminho).join(', ')}) e salva em docs/ARQUITETURA.md.`,
      r.alertas.length ? `Pontos de atenção:\n${lista(r.alertas)}` : '', `Próximo passo: ${s.proximoPasso}${linkPainel(meta.slug)}`].filter(Boolean).join('\n'));
  });

  // ---------- componentes ----------
  ferramenta('cl_componente', {
    title: 'Componente do design system',
    description: `Devolve um componente pronto e acessível do design system: HTML, CSS (só tokens), uso em React e notas de acessibilidade. Sem "nome", lista todos. Componentes: ${Object.keys(COMPONENTES).join(', ')}.`,
    inputSchema: {
      nome: z.enum(Object.keys(COMPONENTES)).optional(),
      projeto: PROJETO.optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ nome, projeto }) => {
    if (!nome) return texto('Componentes do design system (CSS em design-system/componentes.css, comportamento em componentes.js, React em design-system/react):\n' + Object.entries(COMPONENTES).map(([k, c]) => `- ${k}: ${c.nome}. ${c.descricao}`).join('\n'));
    const c = COMPONENTES[nome];
    let react = false;
    if (projeto) react = (await workspace.projeto(projeto)).modelo === 'react';
    const arq = REACT_DO_COMPONENTE[nome];
    return texto([
      `# ${c.nome}`, c.descricao, '', '## HTML', '```html', c.html, '```',
      '', '## CSS (já incluído em design-system/componentes.css)', '```css', cssDoComponente(nome), '```',
      arq ? `\n## React (${react ? 'design-system/react/' + arq : 'arquivo design-system/react/' + arq + ' nos projetos React'})\n\`\`\`jsx\n${c.react}\n\`\`\`` + (react ? '' : `\n\nCódigo do componente:\n\`\`\`jsx\n${REACT[arq]}\`\`\``) : '',
      '', `Acessibilidade e uso: ${c.notas}`,
    ].join('\n'));
  });

  // ---------- auditoria ----------
  async function urlDoProjeto(meta) {
    const srv = processos.info(meta.slug);
    if (srv.ativo && srv.url) return srv.url;
    if (MODELOS[meta.modelo]?.servidor === 'dev') return null;
    return painel.disponivel ? painel.urlPreview(meta.slug) : null;
  }

  async function imagemBase64(arquivo) {
    try { return (await fs.readFile(arquivo)).toString('base64'); } catch { return null; }
  }

  ferramenta('cl_auditar', {
    title: 'Auditar o projeto',
    description: 'Audita como um diretor de arte e um especialista em acessibilidade: detecta o visual genérico de IA, valores fora do design system, textos clichê e inventados, acessibilidade WCAG 2.2 (axe-core no navegador), responsivo no celular, erros e problemas técnicos. Devolve nota 0-100, problemas com arquivo e linha, e as capturas do computador e do celular. No modo estúdio, a entrega só libera com a nota mínima e zero críticos.',
    inputSchema: {
      projeto: PROJETO,
      navegador: z.boolean().optional().describe('Abrir no navegador real (padrão: sim, se o Playwright estiver instalado).'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ projeto, navegador = true }) => {
    const meta = await workspace.projeto(projeto);
    const config = await estudio.config(meta.slug);
    const [brief, sistemaSalvo] = await Promise.all([estudio.ler(meta.slug, 'brief.json'), estudio.ler(meta.slug, 'sistema.json')]);
    const sistema = sistemaSalvo;
    const hash = await estudio.hashAuditavel(meta.slug);
    const n = await estudio.proximaAuditoria(meta.slug);
    const dirCapturas = estudio.dirCapturas(meta.slug, n);
    avisar(meta.slug, 'Auditando o projeto…');
    const r = await auditar({
      workspace, slug: meta.slug, brief, sistema, exigirSistema: config.modo === 'estudio' || !!sistema,
      urlBase: await urlDoProjeto(meta), notaMinima: config.notaMinima, dirCapturas, navegador,
    });
    const capturas = r.capturas.map((c) => ({ nome: c.nome, pagina: c.pagina, arquivo: path.basename(c.arquivo) }));
    await estudio.gravarAuditoria(meta.slug, { ...r, capturas, hash, aprovada: r.aprovada }, n);
    avisar(meta.slug, `Auditoria ${n}: nota ${r.nota}${r.aprovada ? ' (aprovada)' : ''}`);
    avisarEstudio(meta.slug);
    const s = await estudio.situacao(meta.slug);
    const conteudo = [{ type: 'text', text: relatorioTexto(r) + (r.navegadorIndisponivel ? `\n\nNavegador: ${r.navegadorIndisponivel}. ${INSTRUCOES_CAPTURA}` : '') + `\n\nPróximo passo: ${s.proximoPasso}` }];
    for (const c of r.capturas.filter((x) => x.nome === 'computador' || x.nome === 'celular')) {
      const b64 = await imagemBase64(c.arquivo);
      if (b64) conteudo.push({ type: 'image', data: b64, mimeType: 'image/jpeg' }, { type: 'text', text: `Captura: ${c.pagina} no ${c.nome}.` });
    }
    return { content: conteudo };
  });

  ferramenta('cl_criticar', {
    title: 'Crítica visual',
    description: 'Mostra a página no computador e no celular com a rubrica de crítica de um diretor de arte (primeiros 5 segundos, hierarquia, distinção, fidelidade à direção, tipografia, cor, ritmo, conteúdo, celular, acabamento). Use para se autoavaliar com rigor antes de refinar.',
    inputSchema: { projeto: PROJETO, pagina: z.string().optional().describe('Ex.: servicos.html. Padrão: a inicial.') },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ projeto, pagina = '' }) => {
    const meta = await workspace.projeto(projeto);
    const [brief, direcao] = await Promise.all([estudio.ler(meta.slug, 'brief.json'), estudio.ler(meta.slug, 'direcao.json')]);
    const ultima = (await estudio.listarAuditorias(meta.slug)).pop();
    const base = await urlDoProjeto(meta);
    const conteudo = [{ type: 'text', text: rubricaDeCritica({ brief, direcao, metricas: ultima?.metricas }) }];
    if (!base) {
      conteudo.push({ type: 'text', text: '\nSem preview disponível (o app precisa estar rodando ou o painel ligado), então não há capturas.' });
      return { content: conteudo };
    }
    const alvo = pagina ? new URL(pagina.replace(/^\/+/, ''), base.endsWith('/') ? base : base + '/').href : base;
    for (const [nome, largura, altura] of [['computador', 1280, 800], ['celular', 390, 844]]) {
      const r = await capturarTela(alvo, { largura, altura, paginaInteira: nome === 'celular' }).catch((e) => ({ erro: e.message }));
      if (!r) { conteudo.push({ type: 'text', text: '\nCaptura indisponível. ' + INSTRUCOES_CAPTURA }); break; }
      if (r.erro) { conteudo.push({ type: 'text', text: `\nNão consegui capturar (${nome}): ${r.erro}` }); continue; }
      conteudo.push({ type: 'image', data: r.png, mimeType: 'image/png' }, { type: 'text', text: `${nome} (${largura}px)${r.erros.length ? ` · erros: ${r.erros.slice(0, 3).join('; ')}` : ''}` });
    }
    avisar(meta.slug, 'Crítica visual feita');
    return { content: conteudo };
  });

  ferramenta('cl_refinar', {
    title: 'Refinar',
    description: `Comandos de refino de estúdio, com os tokens do projeto e os achados da última auditoria: ${Object.entries(COMANDOS).map(([k, c]) => `${k} (${c.objetivo.split(':')[0].split('.')[0].toLowerCase()})`).join('; ')}.`,
    inputSchema: {
      projeto: PROJETO,
      comando: z.enum(Object.keys(COMANDOS)),
      foco: z.string().optional().describe('Onde aplicar, ex.: "seção de preços" ou "página de serviços".'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ projeto, comando, foco }) => {
    const meta = await workspace.projeto(projeto);
    const [sistema, direcao] = await Promise.all([estudio.ler(meta.slug, 'sistema.json'), estudio.ler(meta.slug, 'direcao.json')]);
    const auditoria = (await estudio.listarAuditorias(meta.slug)).pop() || null;
    avisar(meta.slug, `Refino: ${COMANDOS[comando].titulo}${foco ? ` (${foco})` : ''}`);
    return texto(instrucoesDeRefino(comando, { sistema, direcao, auditoria, foco }));
  });

  ferramenta('cl_exportar_figma', {
    title: 'Exportar para o Figma',
    description: 'Gera em design-system/figma/ um plugin do Figma que cria as variáveis (primitivos + tema claro/escuro), estilos de texto, estilos de sombra e uma página de referência do design system. O usuário importa pelo Figma desktop.',
    inputSchema: { projeto: PROJETO },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ projeto }) => {
    const meta = await workspace.projeto(projeto);
    const [sistema, direcao] = await Promise.all([estudio.ler(meta.slug, 'sistema.json'), estudio.ler(meta.slug, 'direcao.json')]);
    if (!sistema || !direcao) throw new ErroCreative('Gere o design system antes (cl_gerar_design_system).');
    const arquivos = arquivosFigma(sistema, direcao);
    await gravarArquivos(meta.slug, arquivos);
    avisar(meta.slug, 'Plugin do Figma gerado em design-system/figma/');
    return texto([
      `Plugin gerado em ${path.join(workspace.raiz(meta.slug), 'design-system', 'figma')}.`,
      'Para o usuário: no Figma desktop, Plugins › Desenvolvimento › Importar plugin do manifesto… e escolha design-system/figma/manifest.json; depois rode o plugin no arquivo desejado. Instruções em design-system/figma/LEIA-ME.md.',
      'Se você também tiver o servidor MCP oficial do Figma conectado, pode criar as variáveis direto a partir de design-system/tokens.json (formato DTCG).',
    ].join('\n'));
  });

  return { urlDoProjeto };
}
