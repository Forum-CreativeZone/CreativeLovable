import os from 'node:os';
import path from 'node:path';

export const VERSAO = '2.0.0';

export const COMANDOS_PADRAO = ['npm', 'npx', 'node', 'pnpm', 'yarn', 'bun', 'deno', 'git', 'python', 'python3', 'pip', 'pip3'];

export class ErroCreative extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroCreative';
  }
}

export function log(...partes) {
  // Em modo stdio a saída padrão é do protocolo MCP: tudo que é log vai para stderr.
  console.error('[creative-lovable]', ...partes);
}

export function lerConfig(argv = process.argv.slice(2), env = process.env) {
  const valor = (nome) => {
    const i = argv.indexOf(nome);
    if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(nome + '='));
    return eq ? eq.slice(nome.length + 1) : undefined;
  };
  const tem = (nome) => argv.includes(nome);

  let comandos = COMANDOS_PADRAO;
  if (env.CL_SEM_COMANDOS === '1') comandos = [];
  else if (env.CL_COMANDOS) comandos = env.CL_COMANDOS.split(',').map((s) => s.trim()).filter(Boolean);

  return {
    dir: path.resolve(valor('--dir') || env.CL_DIR || path.join(os.homedir(), 'CreativeLovable')),
    porta: Number(valor('--porta') || env.CL_PORTA || 4545),
    host: valor('--host') || env.CL_HOST || '127.0.0.1',
    http: tem('--http') || env.CL_HTTP === '1',
    token: valor('--token') || env.CL_TOKEN || '',
    semPainel: tem('--sem-painel') || env.CL_SEM_PAINEL === '1',
    comandos,
    ajuda: tem('--ajuda') || tem('--help') || tem('-h'),
    versao: tem('--versao') || tem('--version') || tem('-v'),
  };
}

export const AJUDA = `Creative Lovable ${VERSAO}: laboratório de criação para IAs via MCP.

Uso:
  creative-lovable-mcp                 Servidor MCP via stdio (Claude Desktop, Claude Code, Cursor, VS Code...)
  creative-lovable-mcp --http          Servidor MCP via HTTP em http://127.0.0.1:4545/mcp

Opções:
  --dir <pasta>             Onde ficam os projetos (padrão: ~/CreativeLovable)        [CL_DIR]
  --porta <n>               Porta do painel e do MCP HTTP (padrão: 4545)    [CL_PORTA]
  --host <ip>               Interface de rede (padrão: 127.0.0.1)           [CL_HOST]
  --token <segredo>         Exige token em acessos que não sejam locais     [CL_TOKEN]
  --sem-painel              Não abre o painel local (só no modo stdio)      [CL_SEM_PAINEL=1]

Comandos permitidos para a IA: CL_COMANDOS=npm,node,git  (ou CL_SEM_COMANDOS=1)

Estúdio de design:
  CL_MODO_PADRAO=livre      Projetos novos sem as etapas do estúdio (padrão: estúdio para html, web, react e jogo)
  CL_APROVACAO=painel       Aprovações só no painel (outros: painel-ou-conversa, automatica)
  CL_SEM_IMPECCABLE=1       Não roda o detector opcional do Impeccable na auditoria
`;
