// Comandos de refinamento e rubrica de crítica visual: o "olhar de diretor de arte" aplicado ao projeto,
// sempre com os tokens do próprio design system e os achados da última auditoria.
import { CATEGORIAS } from './auditoria.js';

export const COMANDOS = {
  polir: {
    titulo: 'Polir', objetivo: 'Acabamento de estúdio: alinhamento, estados, detalhes e consistência. Sem mudar a ideia.',
    categorias: ['design', 'sistema', 'tecnica'],
    passos: [
      'Alinhamento: todo bloco começa numa linha da grade do .conteiner; nada a 1 ou 2px fora. Ícone e texto alinhados pelo centro óptico.',
      'Espaço por proximidade: distância título→texto menor que texto→próximo bloco, que é menor que entre seções (--espaco-secao). Só valores --espaco-*.',
      'Tipografia: text-wrap: balance nos títulos, pretty nos parágrafos, linhas até --largura-texto, font-variant-numeric: tabular-nums em preços, horários e tabelas.',
      'Estados em todo elemento interativo: hover, :focus-visible (contorno --cor-foco), :active, desabilitado e carregando (aria-busy).',
      'Imagens com aspect-ratio e object-fit definidos (nada de imagem esticada ou pulando ao carregar); ícones do mesmo traço e tamanho (1.1em).',
      'Bordas, raios e sombras só dos tokens (--raio-*, --sombra-*). Não combine borda forte com sombra forte no mesmo bloco.',
      'Detalhes que se notam: favicon, ::selection com --cor-selecao, rodapé completo (contato, endereço, horário), título da aba com a marca.',
      'Rode cl_auditar no fim e zere os problemas críticos e altos.',
    ],
  },
  ousar: {
    titulo: 'Ousar', objetivo: 'Mais presença e memória, sem enfeite: ousadia vem de escala, contraste e composição.',
    categorias: ['design'],
    passos: [
      'Escala: um título curto em .display (--tamanho-4xl) com --espacamento-titulos; os outros títulos ficam bem menores para o contraste aparecer. Frase longa em tamanho gigante não é ousadia, é falta de edição.',
      'Uma superfície grande com a cor da marca (um bloco inteiro de seção em --cor-marca com texto --cor-sobre-marca), não cor espalhada em pequenos detalhes.',
      'Quebre a grade uma vez por página: um elemento (número, foto, palavra) que atravessa colunas ou sai do contêiner.',
      'Traga a assinatura da direção aprovada para o primeiro scroll; ela precisa ser vista em 3 segundos.',
      'Contraste de densidade: uma seção muito arejada seguida de uma compacta e informativa.',
      'Não faça: gradiente, brilho neon, sombras coloridas, partículas, vidro. Isso é ruído, não ousadia.',
    ],
  },
  acalmar: {
    titulo: 'Acalmar', objetivo: 'Baixar o volume visual para a mensagem e a ação aparecerem.',
    categorias: ['design', 'sistema'],
    passos: [
      'Cores: só neutros + marca. A marca fica para a ação principal e um destaque por tela.',
      'Troque sombras por bordas finas (--cor-borda) ou só espaço. Um nível de elevação por tela.',
      'Dois pesos de fonte no máximo no texto (--peso-texto e --peso-forte). Títulos em um peso só.',
      'Animações viram fades curtos (--duracao-rapida) ou somem.',
      'Mais espaço em branco: aumente o espaço entre seções em um passo da escala, nunca aperte texto.',
      'Uma ação primária por tela; as outras viram botão secundário ou link.',
    ],
  },
  simplificar: {
    titulo: 'Simplificar', objetivo: 'Tirar tudo o que não serve ao objetivo do briefing.',
    categorias: ['conteudo', 'design'],
    passos: [
      'Para cada seção, pergunte: ela ajuda a pessoa a cumprir o objetivo? Se não, corte ou junte com outra.',
      'Corte 30% do texto: frases curtas, voz ativa, sem adjetivos vazios.',
      'Tire ícones e ilustrações decorativos que não explicam nada.',
      'Uma ideia por seção, um título que diz a ideia, uma ação (quando houver).',
      'Formulários: só os campos indispensáveis; o resto depois.',
    ],
  },
  animar: {
    titulo: 'Animar', objetivo: 'Movimento com propósito: orientar, dar retorno e mostrar mudança de estado.',
    categorias: ['tecnica', 'acessibilidade'],
    passos: [
      'Escolha 2 ou 3 momentos: entrada do conteúdo principal, retorno das ações (clique, envio) e transição entre estados.',
      'Use só transform e opacity, com --duracao-rapida/--duracao-media e --curva-saida (entrada) / --curva-entrada (saída).',
      'Sequências em cascata de no máximo 5 itens, 40 a 60ms entre eles.',
      'Tudo dentro de @media (prefers-reduced-motion: no-preference), ou com o estado final garantido para quem pede menos movimento.',
      'Nada de quicar (bounce), girar ou pulsar em loop sem motivo. Movimento contínuo só para indicar carregamento.',
      'Revele no scroll com IntersectionObserver e uma vez só; o conteúdo precisa existir mesmo sem JavaScript.',
    ],
  },
  tipografia: {
    titulo: 'Tipografia', objetivo: 'Hierarquia clara e leitura confortável com as fontes do sistema.',
    categorias: ['sistema', 'design'],
    passos: [
      'Três ou quatro níveis visíveis: título da página, títulos de seção, texto e apoio. Cada nível um passo da escala --tamanho-*.',
      'Um único <h1>; títulos em --fonte-titulos, texto em --fonte-texto, dados e código em --fonte-mono.',
      'Títulos grandes com --espacamento-titulos (levemente negativo) e entrelinha curta; texto corrido com --entrelinha-texto.',
      'Nada de rótulo pequeno em caixa alta acima de cada título (o "sobretítulo" de IA): o título carrega o próprio peso.',
      'Use .display (--tamanho-4xl) só para títulos de 1 a 4 palavras; frases longas ficam no h1 (--tamanho-3xl) ou menor.',
      'Use hyphens: auto com lang="pt-BR" em colunas estreitas; evite justificar texto.',
      'Não sintetize pesos: use só os pesos que a família tem.',
    ],
  },
  cores: {
    titulo: 'Cores', objetivo: 'Cor com função: estrutura, ação e significado.',
    categorias: ['sistema', 'design', 'acessibilidade'],
    passos: [
      'Proporção 60/30/10: neutros (--cor-fundo) dominam, superfícies (--cor-superficie, --cor-superficie-2) organizam, a marca marca.',
      '--cor-marca para ação e destaque; --cor-marca-texto para links e palavras coloridas sobre o fundo (já tem contraste garantido).',
      'Status sempre com texto ou ícone além da cor (--cor-sucesso-texto, --cor-aviso-texto, --cor-perigo-texto).',
      'Nenhuma cor fixa no CSS da página: tudo var(--cor-…). Se faltar uma cor, gere o sistema de novo, não invente.',
      'Teste o tema alternativo (data-tema) e corrija qualquer contraste que o axe apontar.',
    ],
  },
  ritmo: {
    titulo: 'Ritmo e composição', objetivo: 'Fugir da pilha de seções iguais: guiar o olho com variação.',
    categorias: ['design'],
    passos: [
      'Alterne larguras: texto em coluna estreita (--largura-texto), mídia larga (.conteiner--largo), dados em grade.',
      'Varie a composição: uma seção em duas colunas assimétricas (7/5), outra em lista, outra em destaque único.',
      'Evite três seções seguidas com a mesma estrutura (título centralizado + grade de cartões).',
      'Use espaço negativo como elemento: um bloco com muito ar destaca o que importa.',
      'O primeiro scroll mostra quem é, o que oferece e a ação principal, sem precisar rolar.',
    ],
  },
  responsivo: {
    titulo: 'Responsivo', objetivo: 'Funcionar bem do celular de 360px ao monitor largo.',
    categorias: ['responsivo'],
    passos: [
      'Confira em 360, 390, 768, 1024 e 1280px (cl_capturar_tela com largura).',
      'Alvos de toque com pelo menos 44px de altura; nada que dependa só de hover.',
      'A ação principal aparece no primeiro scroll do celular.',
      'Tabelas dentro de .tabela-rolagem; imagens com width/height ou aspect-ratio e sizes adequados.',
      'Campos com fonte de 16px ou mais (evita o zoom do iPhone) e teclado certo (inputmode, type).',
      'Nada pode rolar para o lado: confira elementos com largura fixa, grades sem minmax e textos longos sem quebra.',
    ],
  },
  acessibilidade: {
    titulo: 'Acessibilidade', objetivo: 'WCAG 2.2 AA de verdade, não só no contraste.',
    categorias: ['acessibilidade'],
    passos: [
      'Marcos: <header>, <nav>, <main id="conteudo">, <footer>; link "Pular para o conteúdo" (.pular-conteudo) no topo.',
      'Navegue só com o teclado: ordem lógica, foco sempre visível, nada preso, Esc fecha menus e diálogos.',
      'Todo campo com <label>; erros ligados por aria-describedby e anunciados.',
      'Imagens com alt que descreve a função; decorativas com alt="".',
      'Use ARIA só quando o HTML não resolve; os componentes do sistema já seguem os padrões WAI-ARIA.',
      'Respeite prefers-reduced-motion e não transmita informação só por cor.',
    ],
  },
  textos: {
    titulo: 'Textos', objetivo: 'Escrever como o negócio fala com o seu público, com o conteúdo real.',
    categorias: ['conteudo'],
    passos: [
      'Título principal com o benefício concreto para este público, nas palavras dele (sem "Bem-vindo", "soluções", "excelência").',
      'Use os dados reais do briefing: preços, horários, nomes, lugares, números. Nada inventado.',
      'Botões com verbo + objeto: "Agendar corte", "Ver cardápio de hoje". Nunca "Saiba mais" sozinho.',
      'Frases curtas, voz ativa, segunda pessoa quando o tom permitir. Parágrafos de até 3 linhas no celular.',
      'Microtextos: confirmação, erro (o que houve + como resolver), vazio (o que vai aparecer aqui).',
    ],
  },
  estados: {
    titulo: 'Estados', objetivo: 'Desenhar além do caminho feliz: vazio, carregando, erro, sucesso.',
    categorias: ['tecnica', 'conteudo'],
    passos: [
      'Vazio: explica o que vai aparecer e oferece a primeira ação (.estado-vazio).',
      'Carregando: esqueleto no formato do conteúdo (.esqueleto), nunca tela em branco.',
      'Erro: mensagem humana + como resolver + botão de tentar de novo; o que a pessoa digitou não se perde.',
      'Sucesso: confirmação clara (aviso flutuante ou tela) e o próximo passo.',
      'Desabilitado: diga por quê (texto de ajuda), em vez de só apagar o botão.',
    ],
  },
};

/** Instruções do comando, com os tokens e os achados atuais do projeto. */
export function instrucoesDeRefino(comando, { sistema, direcao, auditoria, foco }) {
  const c = COMANDOS[comando];
  const l = [`# ${c.titulo}`, c.objetivo, ''];
  if (foco) l.push(`Foco pedido: ${foco}`, '');
  if (direcao) l.push(`Direção aprovada: ${direcao.nome}. Assinatura: ${direcao.assinatura}.${direcao.evitar?.length ? ` Evitar: ${direcao.evitar.join('; ')}.` : ''}`, '');
  l.push('Passos:');
  c.passos.forEach((p, i) => l.push(`${i + 1}. ${p}`));
  if (sistema) {
    l.push('', 'Tokens à mão:',
      `- Cores: --cor-fundo, --cor-superficie, --cor-superficie-2, --cor-texto, --cor-texto-suave, --cor-borda, --cor-marca (${sistema.temas[sistema.modo].marca}), --cor-marca-texto, --cor-marca-suave, --cor-acento, --cor-foco`,
      `- Tipografia: --fonte-titulos (${sistema.tipografia.titulos.familia}), --fonte-texto (${sistema.tipografia.texto.familia}), --tamanho-xs … --tamanho-4xl, --peso-titulos, --peso-forte`,
      '- Espaço: --espaco-3xs … --espaco-3xl, --espaco-secao, --espaco-pagina; larguras --largura-texto, --largura-conteudo',
      '- Forma e movimento: --raio-sm/md/lg/botao/campo/cartao, --sombra-1/2/3, --duracao-rapida/media/lenta, --curva-saida/entrada');
  }
  if (auditoria) {
    const rel = auditoria.achados.filter((a) => c.categorias.includes(a.categoria)).slice(0, 12);
    l.push('', `Achados da última auditoria (nota ${auditoria.nota}) nesta área:`);
    l.push(...(rel.length ? rel.map((a) => `- [${a.severidade}] ${a.mensagem}${a.arquivo ? ` (${a.arquivo}${a.linha ? ':' + a.linha : ''})` : ''}`) : ['- nenhum']));
  } else {
    l.push('', 'Ainda não há auditoria: rode cl_auditar antes e depois do refino para medir a melhora.');
  }
  l.push('', 'Faça as mudanças com cl_editar (trechos pequenos), confira com cl_capturar_tela e termine com cl_auditar.');
  return l.join('\n');
}

/** Rubrica que a IA usa para criticar o próprio trabalho olhando as capturas. */
export function rubricaDeCritica({ brief, direcao, metricas }) {
  const l = ['# Crítica de direção de arte', 'Olhe as capturas como um diretor de arte exigente. Dê nota de 1 a 5 a cada critério, com uma frase de motivo e a correção concreta (arquivo e tokens). Seja duro: 3 é "ok, mas genérico".', ''];
  const criterios = [
    ['Primeiros 5 segundos', `Dá para entender o que é${brief?.assunto ? ` ("${brief.assunto}")` : ''}, para quem é e qual a ação${brief?.objetivo ? ` ("${brief.objetivo}")` : ''} sem rolar?`],
    ['Hierarquia', 'O olho sabe para onde ir primeiro, segundo e terceiro? Há um único ponto focal por tela?'],
    ['Distinção', `Isto parece feito para este negócio ou poderia ser de qualquer um? ${direcao ? `A assinatura ("${direcao.assinatura}") está visível?` : ''}`],
    ['Fidelidade à direção', direcao ? `Lembra a referência "${direcao.referencia}"? Respeita o que a direção evita (${(direcao.evitar || []).join('; ') || 'nada listado'})?` : 'Segue o design system?'],
    ['Tipografia', 'Contraste de tamanho entre níveis, medida de linha, entrelinha, quebras de título bonitas.'],
    ['Cor', 'Cor com função (ação, destaque, status) e não espalhada; neutros fazem o trabalho pesado.'],
    ['Ritmo e espaço', 'As seções variam em composição e densidade? O espaço agrupa o que é relacionado?'],
    ['Conteúdo', `Textos reais, específicos, no tom ${(brief?.tom || []).join(', ') || 'definido'}; nenhum clichê, nenhum número inventado.`],
    ['Celular', 'A versão de 390px é pensada (não só empilhada)? Ação principal visível, alvos grandes, nada cortado.'],
    ['Acabamento', 'Alinhamentos, estados de foco e hover, imagens bem recortadas, rodapé completo.'],
  ];
  criterios.forEach(([n, p], i) => l.push(`${i + 1}. **${n}**: ${p}`));
  if (metricas?.paginas?.length) {
    l.push('', 'Medidas do navegador:');
    for (const p of metricas.paginas) l.push(`- ${p.pagina}: fontes ${p.familias.map(([f, n]) => `${f} (${n})`).join(', ')}; ${p.tamanhos.length} tamanhos de fonte (${p.tamanhos.join(', ')}px); altura ${p.altura}px.`);
  }
  l.push('', 'Depois da crítica, corrija os 3 pontos de nota mais baixa (cl_refinar ajuda) e audite de novo.');
  return l.join('\n');
}

export const NOMES_CATEGORIAS = CATEGORIAS;
