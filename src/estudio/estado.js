// Governança do estúdio: fases, portões, aprovações e permissões de cada projeto.
// Tudo fica em <projeto>/.creative/ como JSON legível.
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ErroCreative } from '../config.js';

export const FASES = ['briefing', 'direcao', 'sistema', 'arquitetura', 'construcao', 'auditoria', 'entrega'];
export const NOME_FASE = {
  briefing: 'Briefing', direcao: 'Direção de arte', sistema: 'Design system', arquitetura: 'Arquitetura',
  construcao: 'Construção', auditoria: 'Auditoria', entrega: 'Entrega',
};
export const APROVACOES = ['painel', 'painel-ou-conversa', 'automatica'];
export const CONFIG_PADRAO = {
  modo: 'estudio',
  notaMinima: 80,
  aprovacao: 'painel-ou-conversa',
  permissoes: { comandos: true, rede: true, apagar: true },
};
/** Caminhos que podem ser escritos antes da arquitetura aprovada (documentação, design system e mídia). */
const LIVRES_ANTES = [/^design-system\//, /^docs\//, /^README\.md$/i, /^\.gitignore$/, /^(assets|img|imagens|images|fotos|fontes|fonts|midia)\//i];
/** Comandos que acessam a internet. */
const COM_REDE = /^(npm\s+(i|install|add|ci|update|exec)|npx\s|pnpm\s+(i|install|add|dlx)|yarn(\s+(add|install|dlx))?$|bun\s+(i|install|add|x)|pip3?\s+install|git\s+(clone|pull|fetch|push))/i;

export class Estudio {
  constructor(workspace) {
    this.workspace = workspace;
    this.aprovacaoForcada = APROVACOES.includes(process.env.CL_APROVACAO) ? process.env.CL_APROVACAO : null;
  }

  dir(slug) { return path.join(this.workspace.raiz(slug), '.creative'); }

  /** Impressão digital do que a auditoria avalia (documentação e o plugin do Figma não contam). */
  async hashAuditavel(slug) {
    const foto = await this.workspace.fotografar(slug);
    const h = crypto.createHash('sha1');
    for (const a of foto.arquivos) {
      if (/^(docs|design-system\/figma)\//.test(a.caminho) || /^README\.md$/i.test(a.caminho)) continue;
      h.update(a.caminho + '\0' + (a.conteudo ?? a.base64) + '\0');
    }
    return h.digest('hex');
  }

  async ler(slug, nome, padrao = null) {
    try { return JSON.parse(await fs.readFile(path.join(this.dir(slug), nome), 'utf8')); } catch { return padrao; }
  }

  async gravar(slug, nome, dados) {
    const alvo = path.join(this.dir(slug), nome);
    await fs.mkdir(path.dirname(alvo), { recursive: true });
    await fs.writeFile(alvo, JSON.stringify(dados, null, 2));
    await this.workspace.tocar(slug);
  }

  async apagar(slug, nome) {
    await fs.rm(path.join(this.dir(slug), nome), { force: true });
  }

  /** Configuração do projeto. Projetos da v1 (sem bloco "estudio") ficam no modo livre. */
  async config(slug) {
    const meta = await this.workspace.meta(slug);
    const base = meta.estudio
      ? { ...CONFIG_PADRAO, ...meta.estudio, permissoes: { ...CONFIG_PADRAO.permissoes, ...(meta.estudio.permissoes || {}) } }
      : { ...CONFIG_PADRAO, modo: 'livre', permissoes: { ...CONFIG_PADRAO.permissoes } };
    if (this.aprovacaoForcada) base.aprovacao = this.aprovacaoForcada;
    return base;
  }

  async salvarConfig(slug, parcial) {
    const meta = await this.workspace.meta(slug);
    const atual = await this.config(slug);
    const nova = { ...atual };
    if (parcial.modo === 'estudio' || parcial.modo === 'livre') nova.modo = parcial.modo;
    if (APROVACOES.includes(parcial.aprovacao)) nova.aprovacao = parcial.aprovacao;
    if (Number.isFinite(Number(parcial.notaMinima))) nova.notaMinima = Math.min(100, Math.max(0, Math.round(Number(parcial.notaMinima))));
    if (parcial.permissoes && typeof parcial.permissoes === 'object') {
      nova.permissoes = { ...atual.permissoes };
      for (const k of ['comandos', 'rede', 'apagar']) if (typeof parcial.permissoes[k] === 'boolean') nova.permissoes[k] = parcial.permissoes[k];
    }
    meta.estudio = nova;
    await this.workspace.salvarMeta(meta);
    return nova;
  }

  async tudo(slug) {
    const [config, brief, direcoes, direcao, sistema, arquitetura, entrega, auditorias] = await Promise.all([
      this.config(slug), this.ler(slug, 'brief.json'), this.ler(slug, 'direcoes.json'), this.ler(slug, 'direcao.json'),
      this.ler(slug, 'sistema.json'), this.ler(slug, 'arquitetura.json'), this.ler(slug, 'entrega.json'), this.listarAuditorias(slug),
    ]);
    return { config, brief, direcoes, direcao, sistema, arquitetura, entrega, auditoria: auditorias[auditorias.length - 1] || null };
  }

  async listarAuditorias(slug) {
    const pasta = path.join(this.dir(slug), 'auditorias');
    let nomes = [];
    try { nomes = (await fs.readdir(pasta)).filter((n) => /^\d+\.json$/.test(n)).sort(); } catch { return []; }
    const out = [];
    for (const n of nomes.slice(-20)) {
      try { out.push(JSON.parse(await fs.readFile(path.join(pasta, n), 'utf8'))); } catch { /* ignora */ }
    }
    return out;
  }

  /**
   * Situação do projeto: em que fase está, o que falta e o próximo passo. É o "maestro" do processo.
   */
  async situacao(slug) {
    const t = await this.tudo(slug);
    const { config, brief, direcoes, direcao, sistema, arquitetura, entrega, auditoria } = t;
    const hashAtual = auditoria ? await this.hashAuditavel(slug) : null;
    const sistemaEmDia = !!(sistema && direcao && sistema.direcaoId === direcao.id);
    const auditoriaEmDia = !!(auditoria && auditoria.hash === hashAtual);
    const passou = !!(auditoriaEmDia && auditoria.aprovada && auditoria.nota >= config.notaMinima);
    const arquiteturaAprovada = !!arquitetura?.aprovada;

    const etapas = [
      { fase: 'briefing', feita: !!brief, detalhe: brief ? `${brief.tipo}: ${brief.assunto}` : 'Ainda sem briefing.' },
      {
        fase: 'direcao', feita: !!direcao,
        aguardando: !direcao && !!direcoes?.propostas?.length,
        detalhe: direcao ? `Aprovada: ${direcao.nome}` : direcoes?.propostas?.length ? `${direcoes.propostas.length} propostas aguardando aprovação no painel.` : 'Nenhuma proposta ainda.',
      },
      { fase: 'sistema', feita: sistemaEmDia, detalhe: sistemaEmDia ? `Gerado em ${sistema.geradoEm}` : sistema ? 'Desatualizado: a direção aprovada mudou. Gere de novo.' : 'Ainda não gerado.' },
      {
        fase: 'arquitetura', feita: arquiteturaAprovada,
        aguardando: !!arquitetura && !arquiteturaAprovada,
        detalhe: arquiteturaAprovada ? `${arquitetura.paginas.length} página(s) aprovadas.` : arquitetura ? 'Aguardando aprovação no painel.' : 'Ainda sem arquitetura.',
      },
      { fase: 'construcao', feita: !!auditoria, detalhe: auditoria ? 'Páginas construídas e auditadas ao menos uma vez.' : 'Construa as páginas seguindo a arquitetura e o design system.' },
      {
        fase: 'auditoria', feita: passou,
        detalhe: !auditoria ? 'Ainda não auditado.' : !auditoriaEmDia ? `Última nota ${auditoria.nota}, mas houve mudanças depois. Audite de novo.` : passou ? `Nota ${auditoria.nota} (mínimo ${config.notaMinima}).` : `Nota ${auditoria.nota}; precisa de ${config.notaMinima} e nenhum problema crítico.`,
      },
      {
        fase: 'entrega', feita: !!entrega?.aprovada && passou,
        aguardando: passou && !entrega?.aprovada,
        detalhe: entrega?.aprovada && passou ? `Entregue em ${entrega.aprovada.em}.` : passou ? 'Pronto para o usuário aprovar a entrega no painel.' : 'Depende da auditoria aprovada.',
      },
    ];
    const atual = etapas.find((e) => !e.feita);
    const faseAtual = atual ? atual.fase : 'entrega';
    for (const e of etapas) e.estado = e.feita ? 'feita' : e.fase === faseAtual ? (e.aguardando ? 'aguardando-aprovacao' : 'atual') : 'pendente';

    const feedback = [];
    if (direcoes?.feedback && !direcoes.feedback.lido) feedback.push({ etapa: 'direcao', texto: direcoes.feedback.texto, em: direcoes.feedback.em });
    if (arquitetura?.feedback && !arquitetura.feedback.lido) feedback.push({ etapa: 'arquitetura', texto: arquitetura.feedback.texto, em: arquitetura.feedback.em });

    return { modo: config.modo, config, etapas, faseAtual, proximoPasso: proximoPasso(faseAtual, etapas, feedback, config), feedback, dados: t };
  }

  /** Portão de escrita: no modo estúdio, código das páginas só depois de direção, sistema e arquitetura. */
  async podeEscrever(slug, rel) {
    const config = await this.config(slug);
    if (config.modo !== 'estudio') return;
    if (LIVRES_ANTES.some((re) => re.test(rel))) return;
    const s = await this.situacao(slug);
    const falta = [];
    for (const f of ['briefing', 'direcao', 'sistema', 'arquitetura']) {
      const e = s.etapas.find((x) => x.fase === f);
      if (!e.feita) falta.push(`${NOME_FASE[f]} (${e.detalhe})`);
    }
    if (falta.length) {
      throw new ErroCreative(`Modo estúdio: o código do site só pode ser escrito depois de ${falta.map((x) => x.split(' (')[0]).join(', ')}. ` +
        `Pendente: ${falta.join('; ')} Próximo passo: ${s.proximoPasso}`);
    }
  }

  async podeApagar(slug) {
    const c = await this.config(slug);
    if (!c.permissoes.apagar) throw new ErroCreative('Apagar arquivos está desligado neste projeto. O usuário pode liberar em Configurações, no painel.');
  }

  async podeExecutar(slug, comando) {
    const c = await this.config(slug);
    if (!c.permissoes.comandos) throw new ErroCreative('Rodar comandos está desligado neste projeto. O usuário pode liberar em Configurações, no painel.');
    if (!c.permissoes.rede && COM_REDE.test(String(comando).trim())) throw new ErroCreative('Este comando acessa a internet, e o acesso à rede está desligado neste projeto. O usuário pode liberar em Configurações, no painel.');
  }

  async podeExportar(slug) {
    const s = await this.situacao(slug);
    if (s.modo !== 'estudio') return;
    const a = s.etapas.find((e) => e.fase === 'auditoria');
    if (!a.feita) throw new ErroCreative(`Modo estúdio: a exportação só libera com a auditoria aprovada e em dia. ${a.detalhe} Rode cl_auditar e corrija o que aparecer.`);
  }

  /** Registra uma aprovação humana (painel) ou automática (CL_APROVACAO=automatica). */
  async aprovar(slug, etapa, { id, por = 'painel', palavras = null } = {}) {
    const em = new Date().toISOString();
    const registro = { em, por, ...(palavras ? { palavras: String(palavras).slice(0, 300) } : {}) };
    if (etapa === 'direcao') {
      const direcoes = await this.ler(slug, 'direcoes.json');
      const p = direcoes?.propostas?.find((x) => x.id === id) || (direcoes?.propostas?.length === 1 ? direcoes.propostas[0] : null);
      if (!p) throw new ErroCreative('Proposta de direção não encontrada.');
      await this.gravar(slug, 'direcao.json', { ...p, aprovada: registro });
      if (direcoes.feedback) { direcoes.feedback.lido = true; await this.gravar(slug, 'direcoes.json', direcoes); }
      return p;
    }
    if (etapa === 'arquitetura') {
      const a = await this.ler(slug, 'arquitetura.json');
      if (!a) throw new ErroCreative('Não há arquitetura para aprovar.');
      a.aprovada = registro;
      if (a.feedback) a.feedback.lido = true;
      await this.gravar(slug, 'arquitetura.json', a);
      return a;
    }
    if (etapa === 'entrega') {
      const s = await this.situacao(slug);
      if (!s.etapas.find((e) => e.fase === 'auditoria').feita) throw new ErroCreative('A entrega só pode ser aprovada com a auditoria aprovada e em dia.');
      const entrega = { aprovada: registro, nota: s.dados.auditoria.nota };
      await this.gravar(slug, 'entrega.json', entrega);
      return entrega;
    }
    throw new ErroCreative(`Etapa "${etapa}" não tem aprovação.`);
  }

  async registrarFeedback(slug, etapa, texto) {
    const nome = etapa === 'arquitetura' ? 'arquitetura.json' : 'direcoes.json';
    const dados = await this.ler(slug, nome);
    if (!dados) throw new ErroCreative('Nada para comentar nessa etapa ainda.');
    dados.feedback = { texto: String(texto || '').slice(0, 2000), em: new Date().toISOString(), lido: false };
    await this.gravar(slug, nome, dados);
  }

  async marcarFeedbackLido(slug) {
    for (const nome of ['direcoes.json', 'arquitetura.json']) {
      const d = await this.ler(slug, nome);
      if (d?.feedback && !d.feedback.lido) { d.feedback.lido = true; await this.gravar(slug, nome, d); }
    }
  }

  async proximaAuditoria(slug) {
    let nomes = [];
    try { nomes = (await fs.readdir(path.join(this.dir(slug), 'auditorias'))).filter((n) => /^\d+(\.json)?$/.test(n)); } catch { /* nenhuma */ }
    return (nomes.length ? Math.max(...nomes.map((n) => parseInt(n, 10))) : 0) + 1;
  }

  dirCapturas(slug, n) { return path.join(this.dir(slug), 'auditorias', String(n).padStart(4, '0')); }

  async gravarAuditoria(slug, relatorio, n) {
    n = n || await this.proximaAuditoria(slug);
    relatorio.n = n;
    await this.gravar(slug, path.join('auditorias', String(n).padStart(4, '0') + '.json'), relatorio);
    return n;
  }

  existe(slug) { return fss.existsSync(this.dir(slug)); }
}

function comoAprovar(config, oque) {
  if (config.aprovacao === 'automatica') return `Aprovação automática ligada: escolha ${oque} e registre com cl_aprovar.`;
  if (config.aprovacao === 'painel') return `Peça ao usuário para aprovar ${oque} no painel do Creative Lovable. Não continue antes disso.`;
  return `Mostre ${oque} ao usuário e peça a aprovação: ele pode clicar no painel ou responder na conversa. Se responder na conversa, registre com cl_aprovar passando as palavras dele. Não continue antes disso.`;
}

function proximoPasso(fase, etapas, feedback, config) {
  const fb = feedback.length ? ` O usuário deixou um pedido de ajuste (${feedback.map((f) => NOME_FASE[f.etapa]).join(', ')}): leia em cl_status e atenda antes de seguir.` : '';
  switch (fase) {
    case 'briefing': return 'Converse com o usuário e registre o briefing com cl_briefing (sem ele, nada de design).' + fb;
    case 'direcao': return etapas[1].aguardando
      ? comoAprovar(config, 'uma das direções de arte') + fb
      : 'Consulte cl_catalogo (tipo "direcoes") e envie 2 ou 3 direções bem diferentes com cl_propor_direcoes.' + fb;
    case 'sistema': return 'Gere o design system da direção aprovada com cl_gerar_design_system.' + fb;
    case 'arquitetura': return etapas[3].aguardando
      ? comoAprovar(config, 'a arquitetura (páginas e seções)') + fb
      : 'Consulte cl_catalogo (tipo "estruturas") e registre páginas, seções, fluxos e estados com cl_arquitetura.' + fb;
    case 'construcao': return 'Construa as páginas da arquitetura usando só os tokens de design-system/tokens.css e os componentes de cl_componente. Depois rode cl_auditar.' + fb;
    case 'auditoria': return 'Rode cl_auditar, corrija os problemas apontados (comece pelos críticos) e audite de novo até passar. Use cl_criticar e cl_refinar para subir o nível.' + fb;
    default: return etapas[6].feita ? 'Projeto entregue. Novas mudanças pedem nova auditoria.' : comoAprovar(config, 'a entrega (com a nota da auditoria)') + ' Depois use cl_exportar.' + fb;
  }
}
