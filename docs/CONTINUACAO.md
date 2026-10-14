# Creative Lovable 2.0: relatório de continuação

Este arquivo existe para quem for continuar o trabalho (outra pessoa, outra conta ou outra IA). Ele diz o que já está pronto, o que falta, onde mexer e como testar.

Última atualização: 14/10/2026.

---

## 1. Onde paramos

**Objetivo da versão 2.0:** transformar o Creative Lovable de "laboratório" em **estúdio de design**. A IA continua sendo o motor, mas o Creative Lovable conduz o processo com etapas, portões, aprovações do usuário, permissões e auditoria de qualidade, para nunca entregar site com "cara de feito por IA".

**Estado:** os motores estão prontos e funcionando de ponta a ponta através de um cliente MCP real. Em teste manual, uma página genérica com cara de IA tirou **0/100** e uma página feita pelo processo do estúdio tirou **97/100**.

**Commits na `main`:**

- `3727e56` Estúdio de design (em andamento): todos os motores.
- `77160aa` Testes novos e este relatório.
- Commit seguinte: testes corrigidos (**132 ok, 0 falhas** com navegador), versão 2.0.0 em `src/config.js` e variáveis novas no `--ajuda`.

---

## 2. O que já está pronto

### Fluxo do modo estúdio (com portões)

1. `cl_criar_projeto` (modelos html, web, react e jogo nascem no modo **estúdio**; api e vazio no modo **livre**).
2. `cl_briefing`: valida assunto concreto, público, objetivo, tom e conteúdo real. Se faltar algo, devolve as perguntas certas. Grava `docs/BRIEFING.md`.
3. `cl_catalogo` tipo `direcoes`: convenção do setor, estilos candidatos, fontes curadas e pares.
4. `cl_propor_direcoes`: 2 ou 3 direções de arte. Recusa fontes saturadas, paletas-clichê, conceito vago e propostas parecidas entre si.
5. Aprovação do usuário (painel ou conversa, via `cl_aprovar` com as palavras dele).
6. `cl_gerar_design_system`: gera `design-system/` completo.
7. `cl_arquitetura`: páginas, seções com propósito e conteúdo real, fluxos, estados e responsivo. Grava `docs/ARQUITETURA.md`. Precisa de aprovação.
8. Só então o código das páginas é liberado (`cl_escrever`, `cl_editar`, `cl_mover`).
9. `cl_auditar` (nota 0 a 100), `cl_criticar`, `cl_refinar` até passar.
10. Aprovação da entrega, depois `cl_exportar` e `cl_exportar_figma`.

### Ferramentas novas (12, total de 33)

| Ferramenta | Arquivo principal |
|---|---|
| `cl_status` | `src/ferramentas-estudio.js` + `src/estudio/estado.js` |
| `cl_briefing` | `src/estudio/briefing.js` |
| `cl_catalogo` | `src/estudio/catalogo.js` |
| `cl_propor_direcoes` | `src/estudio/direcao.js` |
| `cl_aprovar` | `src/estudio/estado.js` |
| `cl_gerar_design_system` | `src/estudio/sistema.js` |
| `cl_arquitetura` | `src/estudio/arquitetura.js` |
| `cl_componente` | `src/estudio/componentes.js` |
| `cl_auditar` | `src/estudio/auditoria.js` |
| `cl_criticar` | `src/estudio/refino.js` (rubrica) + `src/captura.js` |
| `cl_refinar` | `src/estudio/refino.js` |
| `cl_exportar_figma` | `src/estudio/figma.js` |

Recurso novo: `creative-lovable://principios` (manual do estúdio, em `src/estudio/principios.js`).

### Motores

- **Governança** (`src/estudio/estado.js`): 7 fases, portões de escrita, aprovações (painel, painel-ou-conversa, automática), pedidos de ajuste, permissões por projeto (comandos, internet, apagar), nota mínima, histórico de auditorias, hash que ignora `docs/` e `design-system/figma/` para saber se a auditoria está em dia. Tudo salvo em `<projeto>/.creative/*.json`.
- **Cor** (`src/estudio/cor.js`): OKLCH com culori, escalas de 11 passos, contraste WCAG, detecção de clichês (roxo saturado, terracota do Claude, creme com serifa, verde-ácido no escuro) e de fundo creme (heurística do Impeccable).
- **Fontes** (`src/estudio/fontes.js` + `data/fontes.json`): 1.969 famílias com métricas (Capsize), fontes saturadas (inclui a lista do Impeccable), ~100 fontes curadas por papel e tom, URL do Google Fonts e pilha de reserva sem salto de layout.
- **Biblioteca de referência** (`src/estudio/catalogo.js` + `data/referencias.json`): 192 setores, 50 estilos, 74 pares, 34 estruturas, 151 diretrizes de UX, movimento e gráficos (UI/UX Pro Max, MIT), com tradução de termos do português.
- **Design system** (`src/estudio/sistema.js`): temas claro e escuro com contraste verificado (38 pares), escala tipográfica e de espaço fluidas (Utopia), raio, borda, sombra, movimento. Gera `tokens.css`, `base.css`, `componentes.css`, `componentes.js`, `tokens.json` (DTCG 2025.10), `DESIGN.md` (formato aberto do Google Labs), `index.html` (apresentação), `tailwind-tema.js`, `tailwind.preset.js`, `tailwind-v4.css` e, em projetos React, `react/*.jsx`.
- **Componentes** (`src/estudio/componentes.js`): 17 componentes acessíveis (botão, campo, interruptor, cartão, selo, alerta, diálogo, abas, sanfona, topo, tabela, avatar, esqueleto, migalhas, paginação, estado vazio, avisos), em HTML/CSS/JS e 15 em React.
- **Arquitetura** (`src/estudio/arquitetura.js`): validação e markdown de briefing e arquitetura.
- **Auditoria** (`src/estudio/auditoria.js`): regras próprias no código (parse5) e no navegador (Playwright + axe-core): visual de IA, valores fora do sistema, textos clichê, números inventados, acessibilidade, responsivo, título gigante, ação abaixo da dobra, rótulo acima de título, erros. Impeccable opcional (só em Node 22.18+). Nota com teto por regra e notas por área. Capturas JPEG em `.creative/auditorias/NNNN/`.
- **Refino e crítica** (`src/estudio/refino.js`): 12 comandos (polir, ousar, acalmar, simplificar, animar, tipografia, cores, ritmo, responsivo, acessibilidade, textos, estados) e a rubrica de crítica com 10 critérios.
- **Figma** (`src/estudio/figma.js`): plugin de desenvolvimento que cria variáveis (primitivos + tema com modos Claro/Escuro), estilos de texto, sombras e uma página de referência. Testado só com a API simulada em `test/figma-simulado.mjs`.

### Painel (servidor)

As rotas já existem em `src/painel.js` (método `tratarEstudio`):

- `GET  /api/projetos/:slug/estudio` situação completa + histórico de notas
- `POST /api/projetos/:slug/estudio/aprovar` `{ etapa: 'direcao'|'arquitetura'|'entrega', id? }`
- `POST /api/projetos/:slug/estudio/ajuste` `{ etapa, texto }`
- `POST /api/projetos/:slug/estudio/config` `{ modo?, aprovacao?, notaMinima?, permissoes? }`
- `GET  /api/projetos/:slug/estudio/captura?n=2&nome=computador.jpg`
- `GET  /api/projetos` agora devolve `fase` de cada projeto (ex.: `direcao:aguardando`, `entregue`).
- Evento SSE novo: `estudio` (com `projeto`), emitido a cada mudança de etapa.

Todo POST exige o cabeçalho `X-Creative: 1` (como as outras rotas).

---

## 3. O que falta (em ordem de prioridade)

### 3.1 Testes (feito localmente; conferir no CI)

- `test/e2e.mjs` cobre o fluxo inteiro do estúdio (seções **"# Estúdio: …"**) e passa localmente: **132 ok, 0 falhas**. Confira se o GitHub Actions também ficou verde (Windows e macOS podem revelar diferenças de caminho ou de navegador).
- Para os testes com navegador funcionarem localmente: `CL_CHROME=/caminho/do/chrome npm test`. Sem navegador, a auditoria cai para "só código" e o teste se adapta (verifica `navegadorReal`).
- Atenção ao tempo: `cl_auditar` com navegador leva alguns segundos; o teste usa `chamarLongo` (timeout de 240 s).
- O workflow `.github/workflows/testes.yml` usa Node 20 e 22. O mínimo agora é **Node 20.19** (por causa do `parse5`/`entities`). Avaliar trocar a matriz para `[20, 22, 24]`.

### 3.2 Aba "Estúdio" no painel (`painel/index.html`), ainda não começou

O painel atual tem as abas Atividade, Erros, Arquivos e Versões. Falta uma aba **Estúdio** (primeira aba quando o projeto está no modo estúdio), consumindo as rotas acima:

- Linha do tempo das 7 etapas com estado (feita, atual, aguardando aprovação, pendente).
- **Direções de arte** aguardando: um cartão por proposta com nome, conceito, referência, assinatura, amostra de cores (`amostra.escala`, `amostra.fundo`), "Aa" nas fontes (carregar `amostra.fontes` com `<link>`), chips de forma/densidade/movimento, botão **Aprovar esta direção** e caixa **Pedir ajuste**.
- **Design system**: botão que abre `design-system/index.html` no preview central.
- **Arquitetura** aguardando: páginas e seções (ler de `dados.arquitetura`), aprovar ou pedir ajuste.
- **Auditoria**: nota grande, aprovada/reprovada, notas por área, lista dos problemas, miniaturas das capturas (rota `/estudio/captura`), histórico de notas.
- **Entrega**: botão de aprovar quando a auditoria passou.
- **Configurações**: modo (estúdio/livre), aprovação (painel / painel ou conversa / automática), nota mínima, permissões (comandos, internet, apagar).
- Escutar o evento SSE `estudio` para recarregar.
- Na lista de projetos, mostrar um selo com a `fase` (ex.: "aguardando você").
- Seguir o visual atual do painel (tokens em `:root`, tema escuro, sem travessão nos textos).

### 3.3 Detalhes de código

- Projetos novos no modo estúdio ainda nascem com o `index.html` genérico do modelo. Ideia: no modo estúdio, criar um `index.html` de "canteiro" que mostre que o projeto está nas etapas iniciais.
- Modelo `jogo` no modo estúdio: algumas regras de auditoria (landmarks, h1, ação abaixo da dobra) podem pesar demais em jogos de canvas. Avaliar um perfil de auditoria por tipo de briefing.
- Projetos React: a auditoria no navegador só roda com o servidor de desenvolvimento ligado (`cl_iniciar_servidor`); a análise estática de JSX é mais simples que a de HTML.
- Impeccable: no modo URL ele tenta abrir o Chrome e falha quando roda como root (sem `--no-sandbox`). Por isso usamos o modo arquivo e ignoramos as regras de layout (falsos positivos com variáveis CSS). Lista em `LAYOUT_IMPECCABLE`.
- O plugin do Figma nunca rodou num Figma de verdade, só na API simulada. Testar no Figma desktop (Plugins › Desenvolvimento › Importar plugin do manifesto) e ajustar nomes de estilo de fonte se necessário.

### 3.4 Documentação

- **README.md**: explicar o modo estúdio e o modo livre, a tabela das 12 ferramentas novas, aprovações, permissões, variáveis de ambiente novas, requisito de Node 20.19+, exportação para o Figma, Impeccable opcional e o que a auditoria mede.
- **CHANGELOG.md** (criar) com a versão 2.0.0.
- **THIRD_PARTY_NOTICES.md** (criar) com as licenças e créditos:
  - UI/UX Pro Max, Next Level Builder (MIT): dados em `data/referencias.json`.
  - @capsizecss/metrics e @capsizecss/core (MIT): métricas em `data/fontes.json` e pilhas de fonte.
  - Impeccable, Paul Bakaus (Apache-2.0): dependência opcional; heurísticas inspiradas (lista de fontes saturadas, regra do fundo creme).
  - axe-core (MPL-2.0), culori (MIT), utopia-core, parse5 (MIT): conferir as licenças exatas no `node_modules` antes de publicar.
  - Formato DESIGN.md do Google Labs (Apache-2.0) e formato DTCG (W3C Community Group).
- Depois de tudo: tag `v2.0.0` e release no GitHub.

---

## 4. Como retomar

```bash
git clone https://github.com/Forum-CreativeZone/CreativeLovable.git
cd CreativeLovable
npm install
CL_CHROME=/caminho/do/chrome npm test
```

Para ver o estúdio funcionando sem IA nenhuma: `npm run http`, abrir http://localhost:4545 e usar um cliente MCP (o próprio `test/e2e.mjs` mostra como chamar cada ferramenta).

Arquivos de exemplo usados nos testes:

- `test/fixtures/direcoes.json`: duas direções de arte válidas ("Oficina de bairro" e "Noite de sábado").
- `test/fixtures/generico.html`: página com todos os tiques de IA (deve tirar nota baixa).
- `test/fixtures/navalha/`: landing page feita no processo do estúdio (deve passar).

Scripts de dados (só se precisar regenerar):

- `npm run gerar-fontes` regenera `data/fontes.json` a partir de `@capsizecss/metrics`.
- `node scripts/gerar-referencias.mjs <pasta src/ui-ux-pro-max/data do repositório nextlevelbuilder/ui-ux-pro-max-skill>` regenera `data/referencias.json`.

### Preferências do dono do projeto (Dalton, comunidade Creative Zone)

- Comunicação em português do Brasil, informal e direta.
- Entregas completas e prontas para usar.
- **Nunca usar travessão (—)** em textos.
