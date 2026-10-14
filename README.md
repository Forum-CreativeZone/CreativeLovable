# Creative Lovable

[![Testes](https://github.com/Forum-CreativeZone/CreativeLovable/actions/workflows/testes.yml/badge.svg)](https://github.com/Forum-CreativeZone/CreativeLovable/actions/workflows/testes.yml)

**O laboratório onde a sua IA constrói sites, apps, jogos e sistemas.**

O Creative Lovable é um servidor MCP (Model Context Protocol). Você conecta o Creative Lovable ao app de IA que já usa, e a IA ganha um laboratório completo: cria projetos, escreve e edita arquivos, vê o resultado rodando, recebe os erros do navegador, salva versões e exporta tudo em zip. Você acompanha cada passo num painel local, com o preview atualizando sozinho.

```
 Sua IA (Claude, Cursor, VS Code…)
        │  MCP
        ▼
   Creative Lovable ──► pasta ~/CreativeLovable (seus projetos, no seu computador)
        │
        └──► painel http://localhost:4545 (preview ao vivo, erros, arquivos, versões)
```

A IA é o motor. O Creative Lovable é a bancada, as ferramentas e o espelho.

---

## Requisitos

- **Node.js 18.17 ou mais novo** (`node --version` para conferir). Baixe em nodejs.org.
- Um app de IA com suporte a MCP. Os testados e documentados abaixo são Claude Desktop, Claude Code, Cursor e VS Code.

## Instalação

```bash
git clone https://github.com/Forum-CreativeZone/CreativeLovable.git
cd CreativeLovable
npm install
node bin/creative-lovable-mcp.js --ajuda
```

Prefere sem git? Em **Code › Download ZIP** no GitHub, descompacte numa pasta fixa (por exemplo `C:\ferramentas\CreativeLovable` ou `~/ferramentas/CreativeLovable`) e rode `npm install` dentro dela.

Para ver o painel sozinho, sem IA nenhuma: `npm run http` e abra http://localhost:4545. A tela inicial já mostra a configuração pronta para copiar, com o caminho certo da sua instalação.

---

## Conectar na sua IA

Em todos os exemplos, troque o caminho pelo da sua pasta. No Windows, dentro de JSON, use barras duplas: `C:\\ferramentas\\CreativeLovable\\bin\\creative-lovable-mcp.js`.

### Claude Desktop

1. Menu **Claude › Settings… › Developer › Edit Config**. O arquivo fica em:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
2. Cole (ou acrescente dentro de `mcpServers`, se já houver outros):

```json
{
  "mcpServers": {
    "creative-lovable": {
      "command": "node",
      "args": ["/caminho/para/CreativeLovable/bin/creative-lovable-mcp.js"]
    }
  }
}
```

3. Salve, **feche o Claude por completo** e abra de novo. O Creative Lovable aparece nos conectores da conversa.

### Claude Code

```bash
claude mcp add --transport stdio --scope user creative-lovable -- node /caminho/para/CreativeLovable/bin/creative-lovable-mcp.js
```

Confira com `claude mcp list` no terminal ou `/mcp` dentro do Claude Code.

### Cursor

Em `~/.cursor/mcp.json` (ou pelas configurações de MCP do Cursor):

```json
{
  "mcpServers": {
    "creative-lovable": { "command": "node", "args": ["/caminho/para/CreativeLovable/bin/creative-lovable-mcp.js"] }
  }
}
```

### VS Code (modo agente do Copilot)

Em `.vscode/mcp.json` do seu workspace:

```json
{
  "servers": {
    "creative-lovable": { "type": "stdio", "command": "node", "args": ["/caminho/para/CreativeLovable/bin/creative-lovable-mcp.js"] }
  }
}
```

> Os formatos do Cursor e do VS Code podem mudar entre versões desses apps. Se não funcionar, confira a documentação de MCP do próprio app; o comando é sempre `node` com o caminho do `creative-lovable-mcp.js`.

### Outros apps (conexão por URL)

Alguns apps se conectam a servidores MCP por endereço HTTP em vez de abrir um programa. Para eles:

```bash
node bin/creative-lovable-mcp.js --http
# Endereço MCP: http://localhost:4545/mcp
```

Para um app que roda **fora do seu computador** alcançar o Creative Lovable, você precisa expor a porta com um túnel (por exemplo cloudflared ou ngrok) e **obrigatoriamente** usar um token:

```bash
node bin/creative-lovable-mcp.js --http --token um-segredo-comprido
```

Acessos que não vêm do próprio computador só passam com `Authorization: Bearer um-segredo-comprido` ou com `?token=um-segredo-comprido` no endereço. Sem `--token`, o Creative Lovable recusa qualquer acesso remoto. Não tenho como garantir quais apps de IA aceitam MCP remoto hoje; confira na documentação do app que você usa.

---

## Como usar

Depois de conectado, é só pedir na conversa:

- "Crie no Creative Lovable uma landing page para uma pet shop, com serviços, preços e botão de WhatsApp."
- "Use o Creative Lovable para fazer um jogo de nave em canvas, com fases e placar."
- "No Creative Lovable, monte um app React de controle financeiro com gráfico mensal."
- "Veja os erros do projeto no Creative Lovable e corrija."
- "No Creative Lovable, mude o elemento que eu selecionei para verde."

A IA cria o projeto, escreve os arquivos, verifica, corrige e manda o link do painel. Os arquivos ficam em `~/CreativeLovable/<projeto>` e são seus: dá para abrir no editor, subir num servidor ou mandar para o GitHub.

### O painel

Abra **http://localhost:4545** (ou o link que a IA mandar). Nele você tem:

- **Preview ao vivo** que recarrega a cada mudança, com visão de computador, tablet e celular.
- **Atividade**: tudo o que a IA faz, na hora.
- **Erros**: erros de JavaScript, arquivos que não carregaram e `console.error`, com arquivo e linha. A IA lê os mesmos erros.
- **Arquivos**: o código de cada arquivo, com numeração de linhas.
- **Versões**: o histórico, com botão de restaurar (o estado atual é guardado antes, então nada se perde).
- **Editar visualmente**: clique no botão, clique num elemento do preview e depois diga à IA o que mudar nele. Ela recebe o seletor, o texto e o HTML do elemento.

Se duas IAs estiverem conectadas ao mesmo tempo (por exemplo Claude Desktop e Cursor), elas dividem o mesmo painel.

---

## Ferramentas que a IA recebe

| Ferramenta | O que faz |
|---|---|
| `cl_projetos` | Lista os projetos com versão e link |
| `cl_criar_projeto` | Cria a partir de um modelo e salva a v1 |
| `cl_arquivos` | Lista os arquivos com tamanho |
| `cl_ler` | Lê um arquivo (inteiro ou por intervalo de linhas) |
| `cl_escrever` | Cria ou substitui um arquivo |
| `cl_editar` | Troca trechos; atômico e tolerante a espaços |
| `cl_apagar` / `cl_mover` | Apaga, move ou renomeia |
| `cl_buscar` | Procura texto ou expressão regular no projeto |
| `cl_preview` | Link do painel e do preview |
| `cl_verificar` | Sintaxe de JS/JSX (inclusive dentro do HTML), JSON, arquivos referenciados que faltam e erros do navegador |
| `cl_erros` | Erros do navegador e saída do servidor do projeto |
| `cl_capturar_tela` | Imagem da tela do app, mais os erros do console |
| `cl_selecao` | Elemento escolhido no painel com "Editar visualmente" |
| `cl_salvar_versao` / `cl_versoes` / `cl_restaurar` | Histórico de versões |
| `cl_executar` | Roda um comando na pasta do projeto (npm, node, git…) |
| `cl_iniciar_servidor` / `cl_parar_servidor` | Servidor de desenvolvimento (React, API) |
| `cl_exportar` | Gera um .zip em `~/CreativeLovable/_exportados` |

Também vêm o prompt `cl_novo` (atalho para começar um projeto) e o recurso `creative-lovable://guia`.

### Modelos de projeto

| Modelo | Para quê |
|---|---|
| `html` | Página única com Tailwind. Landing pages, protótipos, apps simples |
| `web` | Site em arquivos: `index.html`, `css/`, `js/` |
| `jogo` | Jogo 2D em canvas: laço com passo fixo, teclado e toque, cenas, colisão |
| `react` | React 18 + Vite. Roda com `cl_iniciar_servidor` |
| `api` | Servidor Node sem dependências, com rotas JSON e página em `public/` |
| `vazio` | Qualquer outro software |

---

## Captura de tela

O `npm install` já tenta instalar o `playwright-core`, que usa o **Chrome ou o Edge que você já tem**. Com isso a IA consegue ver o app que criou e os erros do console. Se não houver Chrome nem Edge:

```bash
npm install playwright
npx playwright install chromium
```

Para usar outro navegador baseado em Chromium, defina `CL_CHROME` com o caminho do executável.

## Segurança

- O painel e o MCP HTTP escutam só em `127.0.0.1` e recusam endereços de outros sites (proteção contra DNS rebinding e requisições forjadas).
- Toda leitura e escrita fica dentro da pasta do projeto; caminhos com `..` e links simbólicos para fora são bloqueados.
- Comandos rodam sem shell, um por vez, e só com programas liberados: `npm, npx, node, pnpm, yarn, bun, deno, git, python, python3, pip, pip3`. Encadeamentos (`;`, `&&`, `|`, `>`) são recusados.
- Mesmo assim, `npm install` e scripts do `package.json` executam código. Revise o que a IA pede para rodar, como você faria com qualquer agente. Para desligar comandos: `CL_SEM_COMANDOS=1`.

## Configuração

| Opção | Variável | Padrão |
|---|---|---|
| `--dir <pasta>` | `CL_DIR` | `~/CreativeLovable` |
| `--porta <n>` | `CL_PORTA` | `4545` (se ocupada, tenta as seguintes) |
| `--host <ip>` | `CL_HOST` | `127.0.0.1` |
| `--http` | `CL_HTTP=1` | desligado (usa stdio) |
| `--token <segredo>` | `CL_TOKEN` | nenhum |
| `--sem-painel` | `CL_SEM_PAINEL=1` | painel ligado |
| | `CL_COMANDOS=npm,node,git` | lista padrão acima |
| | `CL_SEM_COMANDOS=1` | comandos ligados |
| | `CL_CHROME=/caminho/chrome` | Chrome ou Edge instalados |

No Claude Desktop, variáveis entram em `"env": { "CL_DIR": "D:\\Projetos" }` dentro da entrada `creative-lovable`.

## Problemas comuns

- **O Creative Lovable não aparece no Claude Desktop:** confira o JSON (vírgulas e barras duplas no Windows), use caminho absoluto e feche o Claude por completo. Os logs ficam em `~/Library/Logs/Claude` (macOS) ou `%APPDATA%\Claude\logs` (Windows), nos arquivos `mcp*.log`.
- **"node não é reconhecido":** instale o Node.js ou troque `"command": "node"` pelo caminho completo do `node`.
- **Porta 4545 ocupada:** o Creative Lovable usa a próxima livre e avisa no log; ou defina `--porta`.
- **O preview não mostra erros:** os erros chegam quando o preview está aberto (no painel, no navegador ou pela captura de tela).
- **Projeto React em branco:** peça à IA para rodar `cl_iniciar_servidor`; na primeira vez ela instala as dependências.

## Testes

```bash
npm test
```

Sobe o Creative Lovable como um cliente MCP real faria (stdio e HTTP) e passa por todas as ferramentas, pela segurança do servidor e pelo uso por duas IAs ao mesmo tempo.

## Contribuindo

Ideias, bugs e melhorias entram pelas [issues](https://github.com/Forum-CreativeZone/CreativeLovable/issues). Antes de mandar um pull request, rode `npm test`.

Licença MIT. Feito pela comunidade Creative Zone.
