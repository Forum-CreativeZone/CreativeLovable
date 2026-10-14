// Biblioteca de referência do estúdio: setores, estilos visuais, pares tipográficos, estruturas de página,
// diretrizes de UX, movimento e gráficos (dados do UI/UX Pro Max, MIT) + recomendações a partir do briefing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sugerirFontes, ehSaturada, nomeOficial } from './fontes.js';

const ARQUIVO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'referencias.json');
let REF = null;
export function referencias() {
  if (!REF) REF = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
  return REF;
}

export const TIPOS_CATALOGO = ['direcoes', 'estilos', 'setores', 'fontes', 'pares', 'estruturas', 'ux', 'movimento', 'graficos'];

/** Português → termos usados na base de referência (que está em inglês). */
const PT_EN = [
  [/barbe/, 'barber beauty salon booking appointment hyperlocal'], [/sal[aã]o|cabele|manicure|est[eé]tica|beleza|cosm[eé]t/, 'beauty spa wellness salon'],
  [/spa\b|massag/, 'spa wellness'], [/restaur|bistr[oô]|lanchonete|hamburg|pizz|comida|gastron/, 'restaurant food'], [/caf[eé]|cafeter|padar|confeit|doce/, 'bakery cafe coffee'],
  [/cervej|vinho|vin[ií]col|bebida/, 'brewery winery'], [/academ|muscula|crossfit|fitness|treino|personal/, 'fitness gym'], [/yoga|pilates|alongam/, 'yoga stretching wellness'],
  [/medita|mindful/, 'meditation mindfulness'], [/cl[ií]nica|consult[oó]rio|m[eé]dic|sa[uú]de|hospital/, 'medical clinic healthcare'], [/dentist|odonto/, 'dental practice'],
  [/psic|terap|sa[uú]de mental/, 'mental health therapy'], [/veterin|pet|cachorr|gato|animal/, 'pet veterinary'], [/farm[aá]c|drogaria/, 'pharmacy'],
  [/advoga|advocac|jur[ií]dic|direito/, 'legal services law'], [/contab|contador|fiscal|impost/, 'accounting b2b service finance'], [/seguro/, 'insurance'],
  [/banco|financ|cr[eé]dito|empr[eé]stim|investim|fintech/, 'banking finance fintech'], [/cripto|bitcoin|web3|nft|blockchain/, 'crypto web3'],
  [/imobili|im[oó]ve|apartament|aluguel|condom/, 'real estate property'], [/arquitet|interior|decora|m[oó]ve/, 'architecture interior home decoration'],
  [/constru|reforma|engenharia civil|obra/, 'construction architecture'], [/eletric|encanad|marido de aluguel|manuten/, 'home services plumber electrician'],
  [/loja|e-?commerce|vend|produto|cat[aá]logo/, 'ecommerce store shop retail'], [/moda|roupa|vestu|bout/, 'fashion ecommerce'], [/joia|j[oó]ias|rel[oó]gio|luxo|premium/, 'luxury premium brand'],
  [/floricul|flor|planta|jardin/, 'florist plant shop'], [/brinquedo|infantil|crian[cç]|beb[eê]|creche|escola infantil/, 'childcare kids children'],
  [/idos|terceira idade|cuidador/, 'senior care elderly'], [/escola|curso|aula|ensino|educa|professor|aprend|treinament/, 'education online course e-learning'],
  [/idioma|ingl[eê]s|espanhol|l[ií]ngua/, 'language learning'], [/programa[cç]|bootcamp|c[oó]digo/, 'coding bootcamp developer'],
  [/portf[oó]lio|curr[ií]culo|pessoal|freelan/, 'portfolio personal freelancer'], [/ag[eê]ncia|marketing|publicid/, 'creative agency marketing agency'],
  [/fot[oó]gra|ensaio/, 'photography studio'], [/casament|noiv|festa|evento|confer[eê]ncia|congresso|show/, 'wedding event planning conference'],
  [/hotel|pousada|hostel|resort|hosped/, 'hotel hospitality'], [/viagem|turism|passeio|roteiro/, 'travel tourism agency'],
  [/igreja|minist[eé]rio|comunidade crist|par[oó]quia/, 'church religious organization'], [/ong\b|institui[cç][aã]o|caridade|doa[cç]/, 'non-profit charity'],
  [/m[uú]sica|banda|artista|cantor|est[uú]dio de som/, 'music streaming creation'], [/podcast/, 'podcast'], [/v[ií]deo|filme|cinema|teatro/, 'video streaming theater cinema'],
  [/not[ií]cia|jornal|revista|blog|artigo|conte[uú]do/, 'news media magazine blog'], [/newsletter/, 'newsletter'], [/museu|galeria|exposi/, 'museum gallery'],
  [/jogo|game|arcade|quiz|puzzle|plataforma 2d/, 'gaming game arcade casual puzzle'], [/time|clube|futebol|esporte/, 'sports team club'],
  [/emprego|vaga|recrut|rh\b|recursos humanos/, 'job board recruitment'], [/marketplace|classific/, 'marketplace classifieds'],
  [/entrega|delivery|log[ií]stic|frete|transport/, 'logistics delivery'], [/agro|fazenda|rural|agricult/, 'agriculture farm'], [/carro|autom[oó]v|oficina mec|concession/, 'automotive car dealership'],
  [/energia solar|sustent|clima|ecol[oó]g|reciclag/, 'sustainable energy climate'], [/coworking|escrit[oó]rio compartilh/, 'coworking space'],
  [/saas|software|startup|plataforma|sistema/, 'saas software'], [/aplicativo|\bapp\b/, 'app mobile'], [/painel|dashboard|m[eé]trica|relat[oó]rio|indicador|kpi/, 'analytics dashboard data'],
  [/crm|cliente|vendas/, 'crm client management'], [/estoque|invent[aá]rio/, 'inventory stock management'], [/agend|reserva|hor[aá]rio|marca[cç][aã]o/, 'booking appointment calendar'],
  [/fatura|cobran[cç]|nota fiscal|boleto/, 'invoice billing'], [/tarefa|produtiv|to-?do|organiza/, 'productivity tool habit'], [/receita|culin[aá]ri|cozinha/, 'recipe cooking'],
  [/ia\b|intelig[eê]ncia artificial|chatbot|assistente/, 'ai chatbot platform'], [/seguran[cç]a|ciber|privacidade/, 'cybersecurity security privacy'],
  [/governo|prefeitura|p[uú]blic|cidad[aã]/, 'government public service civic'], [/doa[cç][aã]o|vaquinha|financiamento coletivo/, 'crowdfunding'],
  [/ingress|bilhet/, 'ticketing box office'], [/assinatura|clube de/, 'subscription membership'], [/f[oó]rum|comunidade/, 'forum community membership'],
  [/documenta[cç]|manual|wiki|ajuda/, 'knowledge base documentation wiki'], [/link na bio|linktree/, 'link-in-bio'], [/tatua/, 'tattoo studio beauty'],
  // termos de interface
  [/formul[aá]ri|campo|cadastr|valida[cç]/, 'forms data entry input validation'], [/navega[cç]|menu|rodap[eé]|cabe[cç]alho/, 'navigation'],
  [/acessib/, 'accessibility'], [/carregament|espera|lentid/, 'loading feedback performance'], [/anima[cç]|movimento|transi[cç]/, 'animation motion'],
  [/busca|pesquisa|filtro/, 'search'], [/toque|celular|mobile|responsiv/, 'touch responsive mobile'], [/tipograf|fonte|letra/, 'typography'],
  [/erro|vazio|estado/, 'feedback state'], [/primeiro acesso|boas-vindas|onboarding/, 'onboarding'], [/tabela|lista|dados/, 'data table content'],
  // tom e estilo
  [/calor|acolhe|afetu|aconcheg/, 'warm friendly approachable'], [/artesan|feito [àa] m[aã]o|manual|of[ií]cio/, 'handmade artisan craft organic natural'],
  [/diret|objetiv|claro\b|sem rodeio/, 'clear bold direct functional'], [/eleg|sofistic|refin|chique/, 'elegant sophisticated refined'],
  [/luxo|premium|exclusiv/, 'luxury premium high-end'], [/divert|l[uú]dic|brincal|alegr/, 'playful fun friendly'], [/t[eé]cnic|preciso|engenh/, 'technical precise functional'],
  [/confi|seguran|s[eé]rio|institu/, 'trustworthy professional corporate'], [/minimal|simples|enxut/, 'minimal clean simple'], [/ousad|impact|forte|marcante/, 'bold energetic expressive'],
  [/calm|sereno|tranquil|suave/, 'calm soft serene'], [/retr|vintage|nost[aá]lg|antig/, 'retro vintage nostalgic'], [/futur|tecnol/, 'futuristic tech'],
  [/jovem|descolad|urbano|street/, 'youthful vibrant modern'], [/human|gentil|empat/, 'humanist approachable warm'], [/editor|revista|leitura/, 'editorial magazine'],
  [/org[aâ]nic|natural|sustent/, 'organic natural earthy'], [/brutal|cru|industrial/, 'brutalist raw'], [/acess[ií]vel|inclus/, 'accessible inclusive'],
];

/** Estilos que são sistemas de empresas (não servem de direção para marca própria). */
const SISTEMAS_DE_FORNECEDOR = /fluent|spectrum|polaris|material 3|liquid glass|visionos/i;

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const tokens = (s) => semAcento(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

/** Traduz um texto em português para termos de busca da base (mantém também as palavras originais). */
export function termosDeBusca(texto) {
  const base = semAcento(texto);
  const extra = [];
  for (const [re, en] of PT_EN) if (re.test(base)) extra.push(en);
  return [...new Set([...tokens(texto), ...tokens(extra.join(' '))])];
}

function pontuar(item, termos, campos) {
  let s = 0;
  for (const [campo, peso] of campos) {
    const v = item[campo];
    const texto = semAcento(Array.isArray(v) ? v.join(' ') : v);
    if (!texto) continue;
    for (const t of termos) {
      if (texto.includes(t)) s += peso * (new RegExp('\\b' + t + '\\b').test(texto) ? 1 : 0.4);
    }
  }
  return s;
}

const CAMPOS = {
  setores: [['nome', 4], ['palavras', 3], ['consideracoes', 1]],
  estilos: [['nome', 4], ['palavras', 2], ['idealPara', 2], ['efeitos', 0.5]],
  pares: [['nome', 2], ['humor', 3], ['idealPara', 2], ['titulos', 3], ['texto', 3]],
  estruturas: [['nome', 4], ['palavras', 3], ['ordem', 1]],
  ux: [['tema', 4], ['categoria', 3], ['descricao', 1], ['fazer', 1]],
  movimento: [['categoria', 3], ['palavras', 3], ['fazer', 1]],
  graficos: [['dado', 4], ['palavras', 3], ['quando', 1]],
};

/** Busca livre num conjunto da base. Sem termo, devolve os primeiros itens. */
export function buscar(tipo, termo = '', limite = 8) {
  const ref = referencias();
  const lista = ref[tipo];
  if (!lista) return [];
  const termos = termo ? termosDeBusca(termo) : [];
  if (!termos.length) return lista.slice(0, limite);
  return lista.map((item) => ({ item, s: pontuar(item, termos, CAMPOS[tipo] || []) }))
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, limite).map((x) => x.item);
}

/** Setor mais próximo do briefing (a "convenção" do mercado). */
export function setorDoBriefing(brief) {
  const texto = [brief.assunto, brief.nicho, brief.publico, brief.objetivo, brief.tipo === 'jogo' ? 'game' : ''].join(' ');
  return buscar('setores', texto, 3);
}

/** Pares tipográficos da base, marcando quais usam fontes saturadas. */
function paresParaTom(tom) {
  const lista = buscar('pares', (tom || []).join(' '), 12);
  return lista.map((p) => ({
    ...p,
    saturado: ehSaturada(p.titulos) || ehSaturada(p.texto),
    existe: !!(nomeOficial(p.titulos) && nomeOficial(p.texto)),
  })).filter((p) => p.existe);
}

/**
 * Recomendação para a fase de direção de arte. A ideia é profissional: entender a convenção do setor
 * (o que o público espera) e divergir de propósito em pelo menos dois eixos, sem quebrar a usabilidade.
 */
export function recomendarDirecoes(brief) {
  const setores = setorDoBriefing(brief);
  const setor = setores[0] || null;
  const textoTom = (brief.tom || []).join(' ') + ' ' + (brief.assunto || '');
  const evitar = setor ? semAcento(setor.nome + ' ' + setor.palavras.join(' ')) : '';
  const estilos = buscar('estilos', textoTom + ' ' + (setor ? setor.palavras.join(' ') : ''), 20)
    .filter((e) => !SISTEMAS_DE_FORNECEDOR.test(e.nome))
    .filter((e) => !evitar || !tokens(e.evitarEm).some((t) => t.length > 4 && evitar.includes(t)))
    .slice(0, 8);
  const fontes = sugerirFontes(brief.tom || []);
  const pares = paresParaTom(brief.tom || []);
  return {
    setor: setor && {
      nome: setor.nome, estilo: setor.estilo, estrutura: setor.estrutura, cor: setor.cor, tipografia: setor.humorTipo,
      efeitos: setor.efeitos, antiPadroes: setor.antiPadroes, consideracoes: setor.consideracoes, paleta: setor.paleta,
    },
    outrosSetores: setores.slice(1).map((s) => s.nome),
    estilos: estilos.map((e) => ({
      nome: e.nome, palavras: e.palavras.slice(0, 8), idealPara: e.idealPara, evitarEm: e.evitarEm, efeitos: e.efeitos,
      acessibilidade: e.acessibilidade, checklist: e.checklist.slice(0, 6),
    })),
    fontes,
    pares: pares.slice(0, 8).map((p) => ({ nome: p.nome, titulos: p.titulos, texto: p.texto, humor: p.humor.slice(0, 5), saturado: p.saturado })),
  };
}

/** Estruturas de página sugeridas para o tipo de projeto e o objetivo. */
export function recomendarEstruturas(brief) {
  const setores = setorDoBriefing(brief);
  const termo = [brief.objetivo, brief.tipo, setores[0]?.estrutura].join(' ');
  return {
    convencao: setores[0]?.estrutura || null,
    estruturas: buscar('estruturas', termo, 6),
    ux: buscar('ux', [brief.tipo === 'app' || brief.tipo === 'dashboard' ? 'state feedback forms navigation' : 'navigation layout content', brief.objetivo].join(' '), 8),
    graficos: brief.tipo === 'dashboard' ? buscar('graficos', brief.extras?.metricas || brief.objetivo || '', 6) : [],
  };
}
