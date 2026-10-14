import { z } from 'zod';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VERSAO, ErroCreative, log } from './config.js';
import { MODELOS } from './modelos.js';
import { verificarProjeto } from './verificar.js';
import { capturarTela, INSTRUCOES_CAPTURA } from './captura.js';
import { registrarEstudio } from './ferramentas-estudio.js';
import { NOME_FASE } from './estudio/estado.js';
import { PRINCIPIOS } from './estudio/principios.js';

export const INSTRUCOES = `O Creative Lovable é um laboratório e estúdio de criação. Você é o motor: escreve o código. O Creative Lovable conduz o processo, guarda os projetos no computador do usuário, mostra tudo ao vivo no painel dele, devolve erros e audita a qualidade.

Projetos no modo estúdio (o padrão para sites, landing pages, apps e jogos) seguem etapas com portões:
1. cl_criar_projeto, depois cl_briefing com público, objetivo, tom e conteúdo real. Se faltar algo, pergunte ao usuário; nunca invente dados.
2. cl_catalogo (tipo "direcoes") e cl_propor_direcoes com 2 ou 3 direções de arte bem diferentes. O usuário escolhe (no painel ou na conversa; registre com cl_aprovar e as palavras dele).
3. cl_gerar_design_system: tokens, temas, componentes e DESIGN.md em design-system/.
4. cl_catalogo (tipo "estruturas") e cl_arquitetura com páginas, seções com propósito, fluxos e estados. O usuário aprova.
5. Só então o código das páginas pode ser escrito (cl_escrever/cl_editar). Use somente os tokens de design-system/tokens.css e os componentes de cl_componente.
6. cl_auditar (nota 0-100 com capturas), cl_criticar e cl_refinar até passar na nota mínima sem problemas críticos. O usuário aprova a entrega; aí cl_exportar e cl_exportar_figma liberam.
Consulte cl_status sempre que retomar um projeto: ele diz a etapa, os pedidos de ajuste do usuário e o próximo passo. Leia o recurso creative-lovable://principios (manual do estúdio).

No modo livre (projetos api, vazio ou quando o usuário pede explicitamente para pular o processo), não há portões: crie, escreva, rode cl_verificar e corrija.

Em qualquer modo: cl_verificar depois de cada rodada de mudanças; cl_editar com trechos curtos e únicos (leia antes com cl_ler); cl_capturar_tela para ver o resultado; cl_salvar_versao nos marcos; cl_selecao quando o usuário falar do elemento que escolheu; cl_iniciar_servidor para react e api; mande o link do painel (cl_preview). Textos reais no idioma do usuário, nada de lorem ipsum, tudo funcionando de verdade. Permissões (comandos, internet, apagar) e aprovações são do usuário: respeite as recusas.`;

const texto = (t) => ({ content: [{ type: 'text', text: t }] });
const falha = (t) => ({ content: [{ type: 'text', text: t }], isError: true });
const kb = (n) => (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

const PROJETO = z.string().min(1).describe('Identificador do projeto (slug) ou nome, como aparece em cl_projetos.');
const CAMINHO = z.string().min(1).describe('Caminho relativo à raiz do projeto, ex.: index.html, css/estilo.css, src/App.jsx.');

export function criarServidorMcp({ workspace, processos, painel, config, estudio }) {
  const servidor = new McpServer(
    { name: 'creative-lovable', title: 'Creative Lovable', version: VERSAO },
    { instructions: INSTRUCOES },
  );

  const avisar = (projeto, txt, extra = {}) => painel.notificar({ tipo: 'atividade', projeto, texto: txt, ...extra });
  const mudouArquivos = (projeto) => painel.notificar({ tipo: 'arquivos', projeto });

  const ferramenta = (nome, def, fn) => {
    servidor.registerTool(nome, def, async (args) => {
      try {
        return await fn(args || {});
      } catch (e) {
        if (e instanceof ErroCreative) return falha(e.message);
        log(`erro em ${nome}:`, e);
        return falha(`Erro interno do Creative Lovable em ${nome}: ${e?.message || e}`);
      }
    });
  };

  /** Aviso (não bloqueia) quando uma página nova não está na arquitetura aprovada. */
  const foraDaArquitetura = async (slug, rel) => {
    if (!/\.html?$/i.test(rel) || /^(design-system|docs)\//.test(rel)) return '';
    const c = await estudio.config(slug);
    if (c.modo !== 'estudio') return '';
    const a = await estudio.ler(slug, 'arquitetura.json');
    if (!a?.paginas?.length || a.paginas.some((p) => p.caminho === rel)) return '';
    return `\nAtenção: ${rel} não está na arquitetura aprovada (${a.paginas.map((p) => p.caminho).join(', ')}). Se for uma página nova, atualize com cl_arquitetura e peça aprovação.`;
  };

  const linkPreview = async (meta) => {
    const srv = processos.info(meta.slug);
    if (srv.ativo && srv.url) return srv.url;
    if (MODELOS[meta.modelo]?.servidor === 'dev') return null;
    return painel.urlPreview(meta.slug);
  };

  // ---------- projetos ----------
  ferramenta('cl_projetos', {
    title: 'Listar projetos',
    description: 'Lista os projetos do Creative Lovable com modelo, quantidade de arquivos, versão atual e link de preview.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => {
    const lista = await workspace.listar();
    if (!lista.length) return texto(`Nenhum projeto ainda em ${workspace.dir}. Crie um com cl_criar_projeto.`);
    const linhas = [];
    for (const p of lista) {
      const versoes = await workspace.versoes(p.slug);
      const link = await linkPreview(p);
      const sit = p.estudio ? await estudio.situacao(p.slug).catch(() => null) : null;
      const etapa = sit ? ` · estúdio: ${sit.etapas.every((e) => e.feita) ? 'entregue' : NOME_FASE[sit.faseAtual]}` : ' · modo livre';
      linhas.push(`- ${p.slug} · "${p.nome}" · modelo ${p.modelo}${etapa} · v${versoes.length ? versoes[versoes.length - 1].n : 0} · atualizado ${p.atualizadoEm}` + (link ? ` · ${link}` : ''));
    }
    return texto(`${plural(lista.length, 'projeto', 'projetos')} em ${workspace.dir}:\n${linhas.join('\n')}` + (painel.disponivel ? `\n\nPainel: ${painel.url}` : ''));
  });

  ferramenta('cl_criar_projeto', {
    title: 'Criar projeto',
    description: 'Cria um projeto novo a partir de um modelo e salva a v1. Modelos: ' +
      Object.entries(MODELOS).map(([k, v]) => `${k} (${v.descricao})`).join(' | '),
    inputSchema: {
      nome: z.string().min(1).max(80).describe('Nome do projeto, ex.: "Agenda da Barbearia".'),
      modelo: z.enum(Object.keys(MODELOS)).default('html').describe('Modelo inicial.'),
      descricao: z.string().max(600).optional().describe('Resumo do que o usuário pediu, para referência futura.'),
      modo: z.enum(['estudio', 'livre']).optional().describe('estudio (padrão para html, web, react e jogo): briefing, direção de arte, design system, arquitetura e auditoria com portões. livre (padrão para api e vazio): sem portões. Use "livre" em projetos visuais só se o usuário pedir explicitamente.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ nome, modelo = 'html', descricao, modo }) => {
    const padrao = process.env.CL_MODO_PADRAO === 'livre' || ['api', 'vazio'].includes(modelo) ? 'livre' : 'estudio';
    const modoFinal = modo || padrao;
    const { meta, arquivos } = await workspace.criar({ nome, modelo, descricao });
    if (modoFinal === 'estudio') await estudio.salvarConfig(meta.slug, { modo: 'estudio' });
    avisar(meta.slug, `Projeto "${meta.nome}" criado (modelo ${modelo}, modo ${modoFinal === 'estudio' ? 'estúdio' : 'livre'})`);
    painel.notificar({ tipo: 'projetos' });
    const dev = MODELOS[modelo].servidor === 'dev';
    const link = painel.urlPainel(meta.slug);
    return texto([
      `Projeto criado: ${meta.slug} (modelo ${modelo}, modo ${modoFinal === 'estudio' ? 'estúdio' : 'livre'}) em ${workspace.raiz(meta.slug)}`,
      `Arquivos iniciais: ${arquivos.join(', ')}`,
      dev ? 'Para ver rodando, use cl_iniciar_servidor (instala as dependências na primeira vez).' : `Preview: ${painel.urlPreview(meta.slug) || 'painel indisponível'}`,
      link ? `Painel do projeto: ${link}` : '',
      modoFinal === 'estudio'
        ? 'Próximo passo: registre o briefing com cl_briefing (pergunte ao usuário o que faltar). O código das páginas só libera depois de direção de arte, design system e arquitetura aprovados.'
        : 'Próximo passo: escreva os arquivos do app com cl_escrever e rode cl_verificar.',
    ].filter(Boolean).join('\n'));
  });

  // ---------- arquivos ----------
  ferramenta('cl_arquivos', {
    title: 'Listar arquivos',
    description: 'Lista os arquivos do projeto com tamanho (ignora node_modules, dist e .git).',
    inputSchema: { projeto: PROJETO },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ projeto }) => {
    const meta = await workspace.projeto(projeto);
    const arquivos = await workspace.listarArquivos(meta.slug);
    if (!arquivos.length) return texto(`${meta.slug} não tem arquivos.`);
    return texto(`${meta.slug}: ${workspace.resumoArvore(arquivos)}\n` + arquivos.map((a) => `${a.caminho} (${kb(a.bytes)})`).join('\n'));
  });

  ferramenta('cl_ler', {
    title: 'Ler arquivo',
    description: 'Lê um arquivo do projeto. Para arquivos grandes, use linha_inicio e linha_fim. Copie trechos daqui ao usar cl_editar.',
    inputSchema: {
      projeto: PROJETO, caminho: CAMINHO,
      linha_inicio: z.number().int().min(1).optional().describe('Primeira linha (1 = início).'),
      linha_fim: z.number().int().min(1).optional().describe('Última linha.'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ projeto, caminho, linha_inicio, linha_fim }) => {
    const meta = await workspace.projeto(projeto);
    const r = await workspace.ler(meta.slug, caminho, linha_inicio, linha_fim);
    if (r.binario) return texto(`${r.rel} é um arquivo binário (${kb(r.bytes)}); o conteúdo não é exibido.`);
    const cab = `${r.rel} · linhas ${r.ini}-${r.fim} de ${r.total}` + (r.cortado ? ` · cortado por tamanho; continue com linha_inicio=${r.fim + 1}` : '');
    return texto(`${cab}\n\n${r.texto}`);
  });

  ferramenta('cl_escrever', {
    title: 'Escrever arquivo',
    description: 'Cria ou substitui um arquivo inteiro (cria as pastas que faltarem). Para mudanças pontuais em arquivo existente, prefira cl_editar.',
    inputSchema: { projeto: PROJETO, caminho: CAMINHO, conteudo: z.string().describe('Conteúdo completo do arquivo.') },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ projeto, caminho, conteudo }) => {
    const meta = await workspace.projeto(projeto);
    const { rel } = workspace.resolver(meta.slug, caminho);
    await estudio.podeEscrever(meta.slug, rel);
    const r = await workspace.escrever(meta.slug, caminho, conteudo);
    avisar(meta.slug, `${r.existia ? 'Atualizou' : 'Criou'} ${r.rel} (${plural(r.linhas, 'linha', 'linhas')})`, { arquivo: r.rel });
    mudouArquivos(meta.slug);
    const fora = await foraDaArquitetura(meta.slug, r.rel);
    return texto(`${r.existia ? 'Atualizado' : 'Criado'}: ${r.rel} (${plural(r.linhas, 'linha', 'linhas')}, ${kb(r.bytes)}).` + fora);
  });

  ferramenta('cl_editar', {
    title: 'Editar trechos',
    description: 'Troca trechos de um arquivo. Cada "buscar" precisa aparecer uma única vez (ou use "todas": true). Se não achar o texto exato, tenta ignorando espaços e indentação. É atômico: se uma edição falhar, nada muda.',
    inputSchema: {
      projeto: PROJETO, caminho: CAMINHO,
      edicoes: z.array(z.object({
        buscar: z.string().min(1).describe('Trecho atual, copiado do arquivo.'),
        substituir: z.string().describe('Texto novo (pode ser vazio para apagar).'),
        todas: z.boolean().optional().describe('Trocar todas as ocorrências.'),
      })).min(1).max(50),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ projeto, caminho, edicoes }) => {
    const meta = await workspace.projeto(projeto);
    await estudio.podeEscrever(meta.slug, workspace.resolver(meta.slug, caminho).rel);
    const r = await workspace.editar(meta.slug, caminho, edicoes);
    avisar(meta.slug, `Editou ${r.rel} (${plural(r.resultados.length, 'trecho', 'trechos')})`, { arquivo: r.rel });
    mudouArquivos(meta.slug);
    const det = r.resultados.map((x) => `edição ${x.edicao}: ${x.modo}${x.trocas > 1 ? `, ${x.trocas} trocas` : ''}`).join('; ');
    return texto(`Editado: ${r.rel} agora tem ${plural(r.linhas, 'linha', 'linhas')}. ${det}.`);
  });

  ferramenta('cl_apagar', {
    title: 'Apagar arquivo ou pasta',
    description: 'Apaga um arquivo ou pasta do projeto. O que foi salvo em versões pode ser recuperado com cl_restaurar.',
    inputSchema: { projeto: PROJETO, caminho: CAMINHO },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  }, async ({ projeto, caminho }) => {
    const meta = await workspace.projeto(projeto);
    await estudio.podeApagar(meta.slug);
    const r = await workspace.apagar(meta.slug, caminho);
    avisar(meta.slug, `Apagou ${r.rel}`);
    mudouArquivos(meta.slug);
    return texto(`Apagado: ${r.rel}.`);
  });

  ferramenta('cl_mover', {
    title: 'Mover ou renomear',
    description: 'Move ou renomeia um arquivo ou pasta dentro do projeto.',
    inputSchema: { projeto: PROJETO, de: CAMINHO, para: CAMINHO },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ projeto, de, para }) => {
    const meta = await workspace.projeto(projeto);
    await estudio.podeEscrever(meta.slug, workspace.resolver(meta.slug, de).rel);
    await estudio.podeEscrever(meta.slug, workspace.resolver(meta.slug, para).rel);
    const r = await workspace.mover(meta.slug, de, para);
    avisar(meta.slug, `Moveu ${r.de} para ${r.para}`);
    mudouArquivos(meta.slug);
    return texto(`Movido: ${r.de} → ${r.para}.`);
  });

  ferramenta('cl_buscar', {
    title: 'Buscar no projeto',
    description: 'Procura um texto (ou expressão regular) em todos os arquivos de texto do projeto. Devolve arquivo:linha: trecho.',
    inputSchema: {
      projeto: PROJETO,
      termo: z.string().min(1).describe('Texto ou expressão regular.'),
      regex: z.boolean().optional().describe('Tratar o termo como expressão regular.'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ projeto, termo, regex }) => {
    const meta = await workspace.projeto(projeto);
    const achados = await workspace.buscar(meta.slug, termo, { regex: !!regex });
    return texto(achados.length ? `${plural(achados.length, 'ocorrência', 'ocorrências')}${achados.length >= 200 ? ' (limite de 200)' : ''}:\n${achados.join('\n')}` : `Nada encontrado para "${termo}".`);
  });

  // ---------- preview, verificação e erros ----------
  ferramenta('cl_preview', {
    title: 'Link do preview',
    description: 'Devolve o link do painel e do preview ao vivo do projeto para mostrar ao usuário.',
    inputSchema: { projeto: PROJETO },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ projeto }) => {
    const meta = await workspace.projeto(projeto);
    if (!painel.disponivel) return falha('O painel do Creative Lovable não está rodando (talvez a porta esteja ocupada). Os arquivos estão em ' + workspace.raiz(meta.slug));
    const srv = processos.info(meta.slug);
    const dev = MODELOS[meta.modelo]?.servidor === 'dev';
    const linhas = [`Painel: ${painel.urlPainel(meta.slug)}`];
    if (srv.ativo && srv.url) linhas.push(`App rodando em: ${srv.url}`);
    else if (dev) linhas.push('Este projeto precisa de servidor: rode cl_iniciar_servidor para ver o app.');
    else linhas.push(`Preview direto: ${painel.urlPreview(meta.slug)}`);
    linhas.push('O preview recarrega sozinho a cada mudança.');
    return texto(linhas.join('\n'));
  });

  ferramenta('cl_verificar', {
    title: 'Verificar projeto',
    description: 'Checa sintaxe de JS/JSX (inclusive dentro do HTML), JSON, arquivos referenciados que não existem e erros que o navegador já relatou. Rode depois de cada rodada de mudanças.',
    inputSchema: { projeto: PROJETO },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ projeto }) => {
    const meta = await workspace.projeto(projeto);
    const { problemas, verificados } = await verificarProjeto(workspace, meta.slug);
    const navegador = await painel.lerErros(meta.slug);
    const proc = processos.ultimasLinhas(meta.slug, 12, { soErros: true });
    const partes = [];
    const erros = problemas.filter((p) => p.tipo === 'erro');
    const avisos = problemas.filter((p) => p.tipo === 'aviso');
    const fmt = (p) => `- ${p.arquivo || '(projeto)'}${p.linha ? `:${p.linha}${p.coluna ? ':' + p.coluna : ''}` : ''} ${p.mensagem}`;
    if (erros.length) partes.push(`Erros (${erros.length}):\n${erros.map(fmt).join('\n')}`);
    if (avisos.length) partes.push(`Avisos (${avisos.length}):\n${avisos.map(fmt).join('\n')}`);
    if (navegador.length) partes.push(`Erros vistos no navegador (${navegador.length}):\n` + navegador.slice(-10).map((e) => `- [${e.tipo}] ${e.mensagem}${e.arquivo ? ` em ${e.arquivo}` : ''}${e.linha ? `:${e.linha}` : ''}${e.vezes > 1 ? ` (${e.vezes}x)` : ''}`).join('\n'));
    if (proc.length) partes.push('Saída de erro do servidor:\n' + proc.map((l) => '  ' + l.texto).join('\n'));
    const resumo = partes.length ? '' : `Nenhum problema encontrado em ${plural(verificados, 'arquivo verificado', 'arquivos verificados')}.`;
    avisar(meta.slug, `Verificou o projeto: ${erros.length} erro(s), ${avisos.length} aviso(s)`);
    return texto((resumo || partes.join('\n\n')) + (navegador.length ? '\n\nDepois de corrigir, use cl_erros com limpar=true para zerar a lista do navegador.' : ''));
  });

  ferramenta('cl_erros', {
    title: 'Erros do navegador e do servidor',
    description: 'Mostra erros de JavaScript, recursos que não carregaram e console.error vindos do preview aberto no navegador, além da saída recente do servidor do projeto.',
    inputSchema: { projeto: PROJETO, limpar: z.boolean().optional().describe('Zerar a lista depois de ler.') },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ projeto, limpar }) => {
    const meta = await workspace.projeto(projeto);
    const navegador = await painel.lerErros(meta.slug, { limpar: !!limpar });
    const srv = processos.info(meta.slug);
    const logs = processos.ultimasLinhas(meta.slug, 30);
    const partes = [];
    partes.push(navegador.length
      ? `Navegador (${navegador.length}):\n` + navegador.map((e) => `- [${e.tipo}] ${e.mensagem}${e.arquivo ? ` em ${e.arquivo}` : ''}${e.linha ? `:${e.linha}:${e.coluna}` : ''}${e.pagina ? ` (página ${e.pagina})` : ''}${e.vezes > 1 ? ` (${e.vezes}x)` : ''}${e.pilha ? '\n    ' + e.pilha.split('\n').slice(0, 4).join('\n    ') : ''}`).join('\n')
      : 'Navegador: nenhum erro registrado. (Os erros só chegam com o preview aberto no painel ou no navegador.)');
    if (srv.comando) partes.push(`Servidor: ${srv.ativo ? 'rodando' : 'parado'} (${srv.comando})${srv.url ? ' em ' + srv.url : ''}${srv.codigo != null ? `, saiu com código ${srv.codigo}` : ''}`);
    if (logs.length) partes.push('Saída recente:\n' + logs.map((l) => `  ${l.fonte === 'stderr' ? '!' : ' '} ${l.texto}`).join('\n'));
    if (limpar) partes.push('Lista do navegador zerada.');
    return texto(partes.join('\n\n'));
  });

  ferramenta('cl_capturar_tela', {
    title: 'Capturar tela do preview',
    description: 'Abre o preview num navegador invisível e devolve a imagem da tela, mais os erros do console. Precisa do Playwright instalado no Creative Lovable.',
    inputSchema: {
      projeto: PROJETO,
      largura: z.number().int().min(320).max(2560).optional().describe('Largura em pixels (390 para celular, 1280 para computador).'),
      altura: z.number().int().min(320).max(2000).optional(),
      pagina: z.string().optional().describe('Página dentro do projeto, ex.: sobre.html. Padrão: index.'),
      pagina_inteira: z.boolean().optional().describe('Capturar a página inteira, não só a parte visível.'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ projeto, largura = 1280, altura = 800, pagina = '', pagina_inteira = false }) => {
    const meta = await workspace.projeto(projeto);
    const ehDev = MODELOS[meta.modelo]?.servidor === 'dev';
    if (!ehDev && !painel.disponivel) return falha('O painel do Creative Lovable está desligado (--sem-painel ou porta ocupada), então não há preview para capturar.');
    const base = await linkPreview(meta);
    if (!base) return falha('Este projeto precisa de servidor rodando. Use cl_iniciar_servidor antes de capturar a tela.');
    const alvo = pagina ? new URL(pagina.replace(/^\/+/, ''), base.endsWith('/') ? base : base + '/').href : base;
    const r = await capturarTela(alvo, { largura, altura, paginaInteira: pagina_inteira });
    if (!r) return texto('Captura de tela indisponível nesta instalação. ' + INSTRUCOES_CAPTURA);
    avisar(meta.slug, `Capturou a tela (${largura}x${altura})`);
    return {
      content: [
        { type: 'image', data: r.png, mimeType: 'image/png' },
        { type: 'text', text: `Tela de ${alvo} em ${largura}x${altura}. Título: ${r.titulo || '(sem título)'}.\n` + (r.erros.length ? `Erros no navegador:\n- ${r.erros.join('\n- ')}` : 'Nenhum erro no console.') },
      ],
    };
  });

  ferramenta('cl_selecao', {
    title: 'Elemento selecionado pelo usuário',
    description: 'Lê o elemento que o usuário escolheu no painel com "Editar visualmente": tag, seletor CSS, texto e HTML. Use quando ele disser "este botão", "o que eu selecionei" etc.',
    inputSchema: { projeto: PROJETO },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ projeto }) => {
    const meta = await workspace.projeto(projeto);
    const s = await painel.lerSelecao(meta.slug);
    if (!s) return texto('Nenhum elemento selecionado. Peça ao usuário para clicar em "Editar visualmente" no painel do Creative Lovable e escolher o elemento.');
    return texto(`Selecionado há ${Math.round((Date.now() - s.ts) / 1000)} s na página ${s.pagina}:\nTag: <${s.tag}>\nSeletor: ${s.caminho}\nClasses: ${s.classes || '(nenhuma)'}\nTexto: ${s.texto || '(sem texto)'}\nHTML:\n${s.html}\n\nUse cl_buscar com um pedaço desse HTML ou texto para achar o arquivo.`);
  });

  // ---------- versões ----------
  ferramenta('cl_salvar_versao', {
    title: 'Salvar versão',
    description: 'Guarda um retrato de todos os arquivos do projeto (marco). Se nada mudou desde a última versão, não cria outra.',
    inputSchema: { projeto: PROJETO, mensagem: z.string().min(1).max(200).describe('O que mudou, em poucas palavras.') },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ projeto, mensagem }) => {
    const meta = await workspace.projeto(projeto);
    const r = await workspace.salvarVersao(meta.slug, mensagem);
    if (!r.criada) return texto(`Nada mudou desde a v${r.n} ("${r.mensagem}"). Nenhuma versão nova.`);
    avisar(meta.slug, `Salvou a v${r.n}: ${mensagem}`);
    painel.notificar({ tipo: 'versao', projeto: meta.slug });
    return texto(`Versão v${r.n} salva (${plural(r.arquivos, 'arquivo', 'arquivos')}, ${kb(r.bytes)}).` + (r.pulados.length ? ` Ficaram de fora por tamanho: ${r.pulados.join(', ')}.` : ''));
  });

  ferramenta('cl_versoes', {
    title: 'Listar versões',
    description: 'Lista as versões salvas do projeto.',
    inputSchema: { projeto: PROJETO },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ projeto }) => {
    const meta = await workspace.projeto(projeto);
    const lista = await workspace.versoes(meta.slug);
    if (!lista.length) return texto('Nenhuma versão salva.');
    return texto(lista.slice().reverse().map((v) => `v${v.n} · ${v.data} · ${plural(v.arquivos, 'arquivo', 'arquivos')} · ${v.mensagem}`).join('\n'));
  });

  ferramenta('cl_restaurar', {
    title: 'Restaurar versão',
    description: 'Volta o projeto para uma versão anterior. Antes, guarda o estado atual como versão de segurança.',
    inputSchema: { projeto: PROJETO, versao: z.number().int().min(1).describe('Número da versão (ex.: 3 para v3).') },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  }, async ({ projeto, versao }) => {
    const meta = await workspace.projeto(projeto);
    const r = await workspace.restaurar(meta.slug, versao);
    avisar(meta.slug, `Restaurou a v${versao} (agora v${r.nova})`);
    painel.notificar({ tipo: 'versao', projeto: meta.slug });
    mudouArquivos(meta.slug);
    return texto(`Projeto voltou para a v${versao} e isso virou a v${r.nova}.` + (r.seguranca ? ` O estado anterior ficou guardado na v${r.seguranca}.` : ''));
  });

  // ---------- comandos e servidores ----------
  ferramenta('cl_executar', {
    title: 'Rodar comando',
    description: `Roda um comando dentro da pasta do projeto e espera terminar (ex.: npm install, npm run build, npm test, node script.js). Sem shell: um comando por vez. Programas liberados: ${config.comandos.join(', ') || 'nenhum'}.`,
    inputSchema: {
      projeto: PROJETO,
      comando: z.string().min(1).describe('Ex.: npm install chart.js'),
      tempo_limite_s: z.number().int().min(5).max(900).optional().describe('Tempo máximo em segundos (padrão 120).'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  }, async ({ projeto, comando, tempo_limite_s }) => {
    const meta = await workspace.projeto(projeto);
    await estudio.podeExecutar(meta.slug, comando);
    const r = await processos.executar(meta.slug, workspace.raiz(meta.slug), comando, tempo_limite_s);
    avisar(meta.slug, `Comando "${comando}" terminou com código ${r.codigo}`);
    mudouArquivos(meta.slug);
    const saida = r.saida.length > 8000 ? '…\n' + r.saida.slice(-8000) : r.saida;
    const res = `$ ${comando}\nCódigo de saída: ${r.codigo}${r.estourou ? ' (parado por tempo limite)' : ''} · ${(r.duracaoMs / 1000).toFixed(1)} s\n\n${saida.trim() || '(sem saída)'}`;
    return r.codigo === 0 ? texto(res) : falha(res);
  });

  ferramenta('cl_iniciar_servidor', {
    title: 'Iniciar servidor do projeto',
    description: 'Inicia o servidor de desenvolvimento do projeto (padrão: npm run dev, ou npm start) e devolve a URL. Instala as dependências antes, se faltarem. Use em projetos react e api.',
    inputSchema: { projeto: PROJETO, comando: z.string().optional().describe('Comando alternativo, ex.: npm run preview') },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  }, async ({ projeto, comando }) => {
    const meta = await workspace.projeto(projeto);
    const raiz = workspace.raiz(meta.slug);
    const cmd = comando || processos.comandoPadrao(raiz);
    if (!cmd) return falha('Não achei script "dev" nem "start" no package.json. Informe o comando.');
    await estudio.podeExecutar(meta.slug, cmd);
    const partes = [];
    if (processos.precisaInstalar(raiz)) {
      await estudio.podeExecutar(meta.slug, 'npm install');
      avisar(meta.slug, 'Instalando dependências (npm install)…');
      const inst = await processos.executar(meta.slug, raiz, 'npm install', 600);
      partes.push(`npm install terminou com código ${inst.codigo} em ${(inst.duracaoMs / 1000).toFixed(0)} s.`);
      if (inst.codigo !== 0) return falha(partes.join('\n') + '\n\n' + inst.saida.slice(-4000));
    }
    const r = await processos.iniciar(meta.slug, raiz, cmd);
    const logs = processos.ultimasLinhas(meta.slug, 15).map((l) => '  ' + l.texto).join('\n');
    if (r.url) {
      avisar(meta.slug, `Servidor rodando em ${r.url}`);
      partes.push(`Servidor rodando: ${r.url} (${cmd}). O painel já mostra esse endereço.`);
      return texto(partes.join('\n'));
    }
    if (!r.ativo) return falha(partes.concat([`O servidor encerrou (código ${r.codigo}).`, 'Saída:', logs]).join('\n'));
    partes.push(`Servidor iniciado com "${cmd}", mas ainda não anunciou uma URL. Veja cl_erros em instantes.`, logs);
    return texto(partes.join('\n'));
  });

  ferramenta('cl_parar_servidor', {
    title: 'Parar servidor do projeto',
    description: 'Para o servidor de desenvolvimento iniciado por cl_iniciar_servidor.',
    inputSchema: { projeto: PROJETO },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ projeto }) => {
    const meta = await workspace.projeto(projeto);
    const parou = await processos.parar(meta.slug);
    if (parou) avisar(meta.slug, 'Servidor parado');
    return texto(parou ? 'Servidor parado.' : 'Não havia servidor rodando para este projeto.');
  });

  ferramenta('cl_exportar', {
    title: 'Exportar em zip',
    description: 'Gera um .zip do projeto (sem node_modules, .git e .creative) na pasta _exportados do Creative Lovable.',
    inputSchema: { projeto: PROJETO },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ projeto }) => {
    const meta = await workspace.projeto(projeto);
    await estudio.podeExportar(meta.slug);
    const r = await workspace.exportarZip(meta.slug);
    avisar(meta.slug, `Exportou ${path.basename(r.arquivo)}`);
    return texto(`Zip criado: ${r.arquivo} (${plural(r.arquivos, 'arquivo', 'arquivos')}, ${kb(r.bytes)}).`);
  });

  // ---------- prompt e guia ----------
  servidor.registerPrompt('cl_novo', {
    title: 'Criar algo novo no Creative Lovable',
    description: 'Começa um projeto novo no Creative Lovable a partir de uma descrição.',
    argsSchema: {
      descricao: z.string().describe('O que você quer criar.'),
      modelo: z.string().optional().describe('html, web, jogo, react, api ou vazio. Deixe vazio para a IA escolher.'),
    },
  }, ({ descricao, modelo }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Use o Creative Lovable para criar: ${descricao}\n\n` +
          (modelo ? `Use o modelo "${modelo}".\n` : 'Escolha o modelo mais adequado.\n') +
          'Crie o projeto e siga o processo do estúdio do Creative Lovable (cl_status diz o próximo passo): briefing comigo, direções de arte para eu escolher, design system, arquitetura, construção e auditoria até passar. Me mande o link do painel. Nada genérico: quero um trabalho com cara de estúdio profissional.',
      },
    }],
  }));

  registrarEstudio({ servidor, ferramenta, workspace, painel, processos, estudio, texto, falha, avisar, mudouArquivos });

  servidor.registerResource('principios', 'creative-lovable://principios', {
    title: 'Manual do estúdio',
    description: 'Como o Creative Lovable espera que o design seja pensado: direção, sistema, composição, o que denuncia site feito por IA e o ciclo de auditoria.',
    mimeType: 'text/markdown',
  }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: PRINCIPIOS }] }));

  servidor.registerResource('guia', 'creative-lovable://guia', {
    title: 'Guia do Creative Lovable',
    description: 'Como usar as ferramentas do Creative Lovable em sequência.',
    mimeType: 'text/markdown',
  }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: '# Guia do Creative Lovable\n\n' + INSTRUCOES }] }));

  return servidor;
}

