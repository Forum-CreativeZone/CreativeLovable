import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { lerConfig, log, AJUDA, VERSAO } from './config.js';
import { Workspace } from './workspace.js';
import { Processos } from './processos.js';
import { Painel } from './painel.js';
import { criarServidorMcp } from './ferramentas.js';
import { Estudio } from './estudio/estado.js';

/** Monta as peças do Creative Lovable sem iniciar transporte nenhum (útil para testes e para embutir). */
export async function montarCreative(config) {
  const workspace = new Workspace(config.dir);
  await workspace.garantir();
  let painel;
  const processos = new Processos(config, (ev) => painel?.notificar(ev));
  const estudio = new Estudio(workspace);
  painel = new Painel({ config, workspace, processos, estudio });
  const fabricaMcp = () => criarServidorMcp({ workspace, processos, painel, config, estudio });
  return { config, workspace, processos, painel, estudio, fabricaMcp };
}

export async function iniciar(argv = process.argv.slice(2)) {
  const config = lerConfig(argv);
  if (config.ajuda) { process.stdout.write(AJUDA); return; }
  if (config.versao) { process.stdout.write(VERSAO + '\n'); return; }

  const app = await montarCreative(config);
  const { painel, processos, fabricaMcp } = app;

  const encerrar = async (codigo = 0) => {
    processos.pararTodos();
    await painel.fechar().catch(() => {});
    process.exit(codigo);
  };
  process.on('SIGINT', () => encerrar(0));
  process.on('SIGTERM', () => encerrar(0));

  if (config.http) {
    await painel.iniciar({ fabricaMcp });
    if (!painel.proprio) { log('não foi possível abrir a porta HTTP.'); return encerrar(1); }
    log(`Creative Lovable ${VERSAO} pronto. Projetos em ${config.dir}`);
    if (config.host !== '127.0.0.1' && config.host !== 'localhost' && !config.token) {
      log('atenção: escutando fora do computador sem --token; só acessos locais serão aceitos.');
    }
    return app;
  }

  if (!config.semPainel) await painel.iniciar();
  const transporte = new StdioServerTransport();
  transporte.onclose = () => encerrar(0);
  process.stdin.on('end', () => encerrar(0));
  await fabricaMcp().connect(transporte);
  log(`Creative Lovable ${VERSAO} conectado via stdio. Projetos em ${config.dir}` + (painel.url ? ` · painel ${painel.url}` : ''));
  return app;
}
