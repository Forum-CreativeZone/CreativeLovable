// Biblioteca de componentes do estúdio: CSS guiado por tokens, comportamento acessível em JS puro
// e versões React. Tudo usa só as variáveis de design-system/tokens.css.

/** CSS por componente. A ordem importa: variantes depois da base. */
const CSS = {
  botao: `
.botao{--_fundo:var(--cor-marca);--_texto:var(--cor-sobre-marca);--_borda:transparent;
  display:inline-flex;align-items:center;justify-content:center;gap:var(--espaco-2xs);min-block-size:2.75rem;padding:0 var(--espaco-s);
  border:var(--borda-largura) solid var(--_borda);border-radius:var(--raio-botao);background:var(--_fundo);color:var(--_texto);
  font:var(--peso-forte) var(--tamanho-sm)/1.1 var(--fonte-texto);letter-spacing:.01em;text-decoration:none;cursor:pointer;
  box-shadow:var(--sombra-botao);transition:background-color var(--duracao-rapida) var(--curva-saida),border-color var(--duracao-rapida) var(--curva-saida),color var(--duracao-rapida) var(--curva-saida),transform var(--duracao-rapida) var(--curva-saida)}
.botao:hover{--_fundo:var(--cor-marca-hover)}
.botao:active{transform:translateY(1px)}
.botao:focus-visible{outline:2px solid var(--cor-foco);outline-offset:2px}
.botao:disabled,.botao[aria-disabled="true"]{opacity:.5;cursor:not-allowed;transform:none}
.botao svg{inline-size:1.1em;block-size:1.1em;flex:none}
.botao--secundario{--_fundo:transparent;--_texto:var(--cor-texto);--_borda:var(--cor-borda-forte);box-shadow:none}
.botao--secundario:hover{--_fundo:var(--cor-superficie-2)}
.botao--fantasma{--_fundo:transparent;--_texto:var(--cor-marca-texto);box-shadow:none}
.botao--fantasma:hover{--_fundo:var(--cor-marca-suave)}
.botao--acento{--_fundo:var(--cor-acento);--_texto:var(--cor-sobre-acento)}
.botao--acento:hover{--_fundo:var(--cor-acento-hover)}
.botao--perigo{--_fundo:var(--cor-perigo);--_texto:var(--cor-sobre-perigo)}
.botao--perigo:hover{--_fundo:var(--cor-perigo-hover)}
.botao--pequeno{min-block-size:2.25rem;padding:0 var(--espaco-xs);font-size:var(--tamanho-xs)}
.botao--grande{min-block-size:3.25rem;padding:0 var(--espaco-m);font-size:var(--tamanho-base)}
.botao--icone{inline-size:2.75rem;padding:0}
.botao[aria-busy="true"]{position:relative;color:transparent;pointer-events:none}
.botao[aria-busy="true"]::after{content:"";position:absolute;inline-size:1.1em;block-size:1.1em;border:2px solid var(--_texto);border-inline-end-color:transparent;border-radius:50%;animation:ds-girar .7s linear infinite}
@keyframes ds-girar{to{transform:rotate(1turn)}}`,

  campo: `
.campo{display:grid;gap:var(--espaco-3xs);min-inline-size:0}
.campo__rotulo{font-weight:var(--peso-forte);font-size:var(--tamanho-sm);color:var(--cor-texto)}
.campo__opcional{font-weight:var(--peso-texto);color:var(--cor-texto-suave)}
.campo__entrada{inline-size:100%;min-block-size:2.75rem;padding:0 var(--espaco-xs);border:1px solid var(--cor-borda-campo);border-radius:var(--raio-campo);
  background:var(--cor-superficie);color:var(--cor-texto);font:inherit;font-size:max(16px,var(--tamanho-base));
  transition:border-color var(--duracao-rapida) var(--curva-saida),box-shadow var(--duracao-rapida) var(--curva-saida)}
textarea.campo__entrada{padding:var(--espaco-xs);min-block-size:7rem;resize:vertical;line-height:var(--entrelinha-texto)}
select.campo__entrada{appearance:none;padding-inline-end:2.5rem;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);
  background-position:calc(100% - 1.15rem) 55%,calc(100% - .8rem) 55%;background-size:.35rem .35rem;background-repeat:no-repeat}
.campo__entrada::placeholder{color:var(--cor-texto-fraco)}
.campo__entrada:hover{border-color:var(--cor-texto-suave)}
.campo__entrada:focus-visible{outline:2px solid var(--cor-foco);outline-offset:1px;border-color:var(--cor-foco)}
.campo__entrada[aria-invalid="true"]{border-color:var(--cor-perigo)}
.campo__entrada:disabled{background:var(--cor-superficie-2);color:var(--cor-texto-suave);cursor:not-allowed}
.campo__ajuda{margin:0;font-size:var(--tamanho-xs);color:var(--cor-texto-suave)}
.campo__erro{margin:0;font-size:var(--tamanho-xs);font-weight:var(--peso-forte);color:var(--cor-perigo-texto)}
.opcao{display:flex;align-items:flex-start;gap:var(--espaco-2xs);cursor:pointer;line-height:1.4}
.opcao input{accent-color:var(--cor-marca);inline-size:1.15rem;block-size:1.15rem;margin:.1rem 0 0;flex:none}
.opcao input:focus-visible{outline:2px solid var(--cor-foco);outline-offset:2px}`,

  interruptor: `
.interruptor{display:inline-flex;align-items:center;gap:var(--espaco-xs);padding:0;border:0;background:none;color:var(--cor-texto);font:inherit;cursor:pointer;min-block-size:2.75rem}
.interruptor__trilho{position:relative;inline-size:2.6rem;block-size:1.5rem;border-radius:999px;background:var(--cor-borda-campo);transition:background-color var(--duracao-rapida) var(--curva-saida);flex:none}
.interruptor__pino{position:absolute;inset-block-start:.2rem;inset-inline-start:.2rem;inline-size:1.1rem;block-size:1.1rem;border-radius:50%;background:var(--cor-superficie);box-shadow:var(--sombra-1);transition:transform var(--duracao-rapida) var(--curva-saida)}
.interruptor[aria-checked="true"] .interruptor__trilho{background:var(--cor-marca)}
.interruptor[aria-checked="true"] .interruptor__pino{transform:translateX(1.1rem)}
.interruptor:focus-visible{outline:none}
.interruptor:focus-visible .interruptor__trilho{outline:2px solid var(--cor-foco);outline-offset:2px}`,

  cartao: `
.cartao{display:flex;flex-direction:column;gap:var(--espaco-xs);padding:var(--espaco-m);background:var(--cor-superficie);color:var(--cor-texto);
  border:var(--borda-cartao);border-radius:var(--raio-cartao);box-shadow:var(--sombra-1)}
.cartao__titulo{margin:0;font:var(--peso-titulos) var(--tamanho-lg)/var(--entrelinha-compacta) var(--fonte-titulos);letter-spacing:var(--espacamento-titulos)}
.cartao__texto{margin:0;color:var(--cor-texto-suave)}
.cartao--interativo{position:relative;transition:box-shadow var(--duracao-media) var(--curva-saida),transform var(--duracao-media) var(--curva-saida),border-color var(--duracao-media) var(--curva-saida)}
.cartao--interativo:hover{box-shadow:var(--sombra-2);border-color:var(--cor-borda-forte)}
.cartao--interativo a::after{content:"";position:absolute;inset:0;border-radius:inherit}
.cartao--interativo:focus-within{outline:2px solid var(--cor-foco);outline-offset:2px}
.cartao--interativo a:focus-visible{outline:none}
.cartao--plano{box-shadow:none;background:var(--cor-superficie-2);border-color:transparent}`,

  selo: `
.selo{display:inline-flex;align-items:center;gap:.35em;padding:.2em .6em;border-radius:var(--raio-sm);font-size:var(--tamanho-xs);font-weight:var(--peso-forte);line-height:1.3;
  background:var(--cor-marca-suave);color:var(--cor-marca-texto);white-space:nowrap}
.selo--neutro{background:var(--cor-superficie-2);color:var(--cor-texto-suave)}
.selo--sucesso{background:var(--cor-sucesso-suave);color:var(--cor-sucesso-texto)}
.selo--aviso{background:var(--cor-aviso-suave);color:var(--cor-aviso-texto)}
.selo--perigo{background:var(--cor-perigo-suave);color:var(--cor-perigo-texto)}`,

  alerta: `
.alerta{display:grid;grid-template-columns:auto 1fr;gap:var(--espaco-3xs) var(--espaco-xs);align-items:start;padding:var(--espaco-s);border-radius:var(--raio-md);
  background:var(--cor-marca-suave);color:var(--cor-texto);border:1px solid color-mix(in oklch,var(--cor-marca-texto) 25%,transparent)}
.alerta>svg{inline-size:1.25rem;block-size:1.25rem;color:var(--cor-marca-texto);margin-block-start:.1rem}
.alerta__titulo{margin:0;font-weight:var(--peso-forte)}
.alerta__texto{margin:0;grid-column:2;color:var(--cor-texto-suave)}
.alerta--sucesso{background:var(--cor-sucesso-suave);border-color:color-mix(in oklch,var(--cor-sucesso-texto) 25%,transparent)}
.alerta--sucesso>svg{color:var(--cor-sucesso-texto)}
.alerta--aviso{background:var(--cor-aviso-suave);border-color:color-mix(in oklch,var(--cor-aviso-texto) 25%,transparent)}
.alerta--aviso>svg{color:var(--cor-aviso-texto)}
.alerta--perigo{background:var(--cor-perigo-suave);border-color:color-mix(in oklch,var(--cor-perigo-texto) 25%,transparent)}
.alerta--perigo>svg{color:var(--cor-perigo-texto)}`,

  dialogo: `
.dialogo{inline-size:min(32rem,calc(100vw - 2rem));max-block-size:calc(100dvh - 2rem);padding:0;border:var(--borda-cartao);border-radius:var(--raio-cartao);
  background:var(--cor-elevada);color:var(--cor-texto);box-shadow:var(--sombra-3)}
.dialogo::backdrop{background:color-mix(in oklch,var(--cor-texto) 45%,transparent);backdrop-filter:blur(2px)}
.dialogo[open]{animation:ds-surgir var(--duracao-media) var(--curva-saida)}
.dialogo__corpo{display:grid;gap:var(--espaco-s);padding:var(--espaco-m)}
.dialogo__titulo{margin:0;font:var(--peso-titulos) var(--tamanho-lg)/var(--entrelinha-compacta) var(--fonte-titulos)}
.dialogo__acoes{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:var(--espaco-xs);padding:var(--espaco-s) var(--espaco-m);border-block-start:1px solid var(--cor-borda)}
@keyframes ds-surgir{from{opacity:0;transform:translateY(6px) scale(.98)}}`,

  abas: `
.abas__lista{display:flex;gap:var(--espaco-3xs);border-block-end:1px solid var(--cor-borda);overflow-x:auto;scrollbar-width:thin}
.abas__aba{position:relative;min-block-size:2.75rem;padding:0 var(--espaco-s);border:0;background:none;color:var(--cor-texto-suave);font:var(--peso-forte) var(--tamanho-sm)/1 var(--fonte-texto);cursor:pointer;white-space:nowrap}
.abas__aba:hover{color:var(--cor-texto)}
.abas__aba[aria-selected="true"]{color:var(--cor-texto)}
.abas__aba[aria-selected="true"]::after{content:"";position:absolute;inset-inline:var(--espaco-xs);inset-block-end:-1px;block-size:2px;background:var(--cor-marca)}
.abas__aba:focus-visible{outline:2px solid var(--cor-foco);outline-offset:-2px;border-radius:var(--raio-sm)}
.abas__painel{padding-block:var(--espaco-m)}
.abas__painel:focus-visible{outline:2px solid var(--cor-foco);outline-offset:4px;border-radius:var(--raio-sm)}`,

  sanfona: `
.sanfona{border-block-end:1px solid var(--cor-borda)}
.sanfona>summary{display:flex;align-items:center;justify-content:space-between;gap:var(--espaco-s);min-block-size:3rem;padding-block:var(--espaco-xs);
  font:var(--peso-forte) var(--tamanho-md)/1.3 var(--fonte-texto);cursor:pointer;list-style:none}
.sanfona>summary::-webkit-details-marker{display:none}
.sanfona>summary::after{content:"";inline-size:.55rem;block-size:.55rem;border-inline-end:2px solid currentColor;border-block-end:2px solid currentColor;transform:rotate(45deg) translateY(-2px);transition:transform var(--duracao-media) var(--curva-saida);flex:none}
.sanfona[open]>summary::after{transform:rotate(-135deg) translateY(-2px)}
.sanfona>summary:focus-visible{outline:2px solid var(--cor-foco);outline-offset:2px;border-radius:var(--raio-sm)}
.sanfona__conteudo{padding-block-end:var(--espaco-s);color:var(--cor-texto-suave);max-inline-size:var(--largura-texto)}`,

  topo: `
.topo{position:sticky;inset-block-start:0;z-index:var(--z-menu);background:color-mix(in oklch,var(--cor-fundo) 92%,transparent);backdrop-filter:saturate(1.4) blur(10px);border-block-end:1px solid var(--cor-borda)}
.topo__interno{display:flex;align-items:center;gap:var(--espaco-s);inline-size:min(100% - 2 * var(--espaco-pagina),var(--largura-conteudo));margin-inline:auto;min-block-size:4rem}
.topo__marca{display:inline-flex;align-items:center;min-block-size:2.75rem;font:var(--peso-titulos) var(--tamanho-md)/1 var(--fonte-titulos);color:var(--cor-texto);text-decoration:none;letter-spacing:var(--espacamento-titulos);margin-inline-end:auto}
.topo__nav ul{display:flex;gap:var(--espaco-2xs);margin:0;padding:0;list-style:none}
.topo__nav a{display:inline-flex;align-items:center;min-block-size:2.75rem;padding:0 var(--espaco-xs);border-radius:var(--raio-sm);color:var(--cor-texto-suave);text-decoration:none;font-weight:var(--peso-forte);font-size:var(--tamanho-sm)}
.topo__nav a:hover{color:var(--cor-texto);background:var(--cor-superficie-2)}
.topo__nav a[aria-current="page"]{color:var(--cor-texto);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:.4em;text-decoration-color:var(--cor-marca)}
.topo__menu{display:none}
@media (max-width:48rem){
  .topo__menu{display:inline-flex}
  .topo__nav{position:absolute;inset-inline:0;inset-block-start:100%;background:var(--cor-fundo);border-block-end:1px solid var(--cor-borda);padding:var(--espaco-xs) var(--espaco-pagina) var(--espaco-s)}
  .topo__nav:not([data-aberto]){display:none}
  .topo__nav ul{flex-direction:column}
}`,

  tabela: `
.tabela-rolagem{overflow-x:auto;border:1px solid var(--cor-borda);border-radius:var(--raio-md)}
.tabela{inline-size:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:var(--tamanho-sm)}
.tabela caption{caption-side:top;text-align:start;padding:var(--espaco-xs) var(--espaco-s);font-weight:var(--peso-forte)}
.tabela th,.tabela td{padding:var(--espaco-xs) var(--espaco-s);text-align:start;border-block-end:1px solid var(--cor-borda);vertical-align:top}
.tabela thead th{background:var(--cor-superficie-2);color:var(--cor-texto-suave);font-weight:var(--peso-forte);font-size:var(--tamanho-xs);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
.tabela tbody tr:hover{background:var(--cor-superficie-2)}
.tabela tbody tr:last-child td{border-block-end:0}
.tabela .num{text-align:end}`,

  avatar: `
.avatar{display:inline-grid;place-items:center;inline-size:2.5rem;aspect-ratio:1;border-radius:50%;overflow:hidden;background:var(--cor-marca-suave);color:var(--cor-marca-texto);font-weight:var(--peso-forte);font-size:var(--tamanho-sm);flex:none}
.avatar img{inline-size:100%;block-size:100%;object-fit:cover}
.avatar--grande{inline-size:4rem;font-size:var(--tamanho-lg)}`,

  esqueleto: `
.esqueleto{display:block;block-size:1em;border-radius:var(--raio-sm);background:linear-gradient(90deg,var(--cor-superficie-2) 25%,var(--cor-borda) 50%,var(--cor-superficie-2) 75%);background-size:200% 100%;animation:ds-brilho 1.4s ease-in-out infinite}
@keyframes ds-brilho{to{background-position:-200% 0}}`,

  migalhas: `
.migalhas ol{display:flex;flex-wrap:wrap;align-items:center;gap:var(--espaco-3xs);margin:0;padding:0;list-style:none;font-size:var(--tamanho-sm);color:var(--cor-texto-suave)}
.migalhas li+li::before{content:"/";margin-inline-end:var(--espaco-3xs);color:var(--cor-texto-fraco)}
.migalhas a{color:inherit;text-underline-offset:.25em}
.migalhas a:hover{color:var(--cor-texto)}
.migalhas [aria-current="page"]{color:var(--cor-texto);font-weight:var(--peso-forte);text-decoration:none}`,

  paginacao: `
.paginacao{display:flex;flex-wrap:wrap;gap:var(--espaco-3xs);align-items:center}
.paginacao a,.paginacao span{display:inline-grid;place-items:center;min-inline-size:2.75rem;min-block-size:2.75rem;padding:0 var(--espaco-2xs);border-radius:var(--raio-sm);color:var(--cor-texto);text-decoration:none;font-variant-numeric:tabular-nums}
.paginacao a:hover{background:var(--cor-superficie-2)}
.paginacao [aria-current="page"]{background:var(--cor-marca);color:var(--cor-sobre-marca);font-weight:var(--peso-forte)}
.paginacao a:focus-visible{outline:2px solid var(--cor-foco);outline-offset:2px}`,

  vazio: `
.estado-vazio{display:grid;justify-items:start;gap:var(--espaco-xs);padding:var(--espaco-l);border:1px dashed var(--cor-borda-forte);border-radius:var(--raio-cartao);background:var(--cor-superficie)}
.estado-vazio__titulo{margin:0;font:var(--peso-titulos) var(--tamanho-lg)/var(--entrelinha-compacta) var(--fonte-titulos)}
.estado-vazio__texto{margin:0;color:var(--cor-texto-suave);max-inline-size:48ch}`,

  avisos: `
.avisos{position:fixed;inset-inline:var(--espaco-s);inset-block-end:var(--espaco-s);z-index:var(--z-aviso);display:grid;justify-items:start;gap:var(--espaco-2xs);pointer-events:none}
.aviso-flutuante{pointer-events:auto;max-inline-size:min(28rem,100%);padding:var(--espaco-xs) var(--espaco-s);border-radius:var(--raio-md);background:var(--cor-texto);color:var(--cor-fundo);box-shadow:var(--sombra-3);font-size:var(--tamanho-sm);animation:ds-surgir var(--duracao-media) var(--curva-saida)}
.aviso-flutuante--perigo{background:var(--cor-perigo);color:var(--cor-sobre-perigo)}`,
};

/** Comportamento em JS puro (sem dependências): menu, abas, diálogos, interruptores e avisos. */
export const JS_COMPONENTES = `// Comportamento dos componentes do design system (gerado pelo Creative Lovable).
(function () {
  'use strict';
  function iniciar(raiz) {
    raiz = raiz || document;
    raiz.querySelectorAll('.topo__menu[aria-controls]').forEach(function (botao) {
      if (botao.dataset.dsPronto) return; botao.dataset.dsPronto = '1';
      var nav = document.getElementById(botao.getAttribute('aria-controls'));
      if (!nav) return;
      botao.addEventListener('click', function () {
        var aberto = botao.getAttribute('aria-expanded') === 'true';
        botao.setAttribute('aria-expanded', String(!aberto));
        if (aberto) nav.removeAttribute('data-aberto'); else nav.setAttribute('data-aberto', '');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && botao.getAttribute('aria-expanded') === 'true') { botao.click(); botao.focus(); }
      });
    });
    raiz.querySelectorAll('[role="tablist"]').forEach(function (lista) {
      if (lista.dataset.dsPronto) return; lista.dataset.dsPronto = '1';
      var abas = Array.prototype.slice.call(lista.querySelectorAll('[role="tab"]'));
      function selecionar(aba, focar) {
        abas.forEach(function (a) {
          var ativa = a === aba;
          a.setAttribute('aria-selected', String(ativa));
          a.tabIndex = ativa ? 0 : -1;
          var painel = document.getElementById(a.getAttribute('aria-controls'));
          if (painel) painel.hidden = !ativa;
        });
        if (focar) aba.focus();
      }
      abas.forEach(function (aba, i) {
        aba.addEventListener('click', function () { selecionar(aba, false); });
        aba.addEventListener('keydown', function (e) {
          var alvo = null;
          if (e.key === 'ArrowRight') alvo = abas[(i + 1) % abas.length];
          else if (e.key === 'ArrowLeft') alvo = abas[(i - 1 + abas.length) % abas.length];
          else if (e.key === 'Home') alvo = abas[0];
          else if (e.key === 'End') alvo = abas[abas.length - 1];
          if (alvo) { e.preventDefault(); selecionar(alvo, true); }
        });
      });
      selecionar(abas.filter(function (a) { return a.getAttribute('aria-selected') === 'true'; })[0] || abas[0], false);
    });
    raiz.querySelectorAll('[data-abrir-dialogo]').forEach(function (botao) {
      if (botao.dataset.dsPronto) return; botao.dataset.dsPronto = '1';
      botao.addEventListener('click', function () {
        var d = document.getElementById(botao.getAttribute('data-abrir-dialogo'));
        if (d && typeof d.showModal === 'function') d.showModal();
      });
    });
    raiz.querySelectorAll('dialog.dialogo').forEach(function (d) {
      if (d.dataset.dsPronto) return; d.dataset.dsPronto = '1';
      d.addEventListener('click', function (e) {
        if (e.target.closest('[data-fechar-dialogo]')) d.close();
        else if (e.target === d) d.close();
      });
    });
    raiz.querySelectorAll('[role="switch"]').forEach(function (s) {
      if (s.dataset.dsPronto) return; s.dataset.dsPronto = '1';
      s.addEventListener('click', function () {
        var v = s.getAttribute('aria-checked') !== 'true';
        s.setAttribute('aria-checked', String(v));
        s.dispatchEvent(new CustomEvent('mudou', { detail: { ligado: v }, bubbles: true }));
      });
    });
  }
  function avisar(texto, opcoes) {
    opcoes = opcoes || {};
    var area = document.querySelector('.avisos');
    if (!area) { area = document.createElement('div'); area.className = 'avisos'; area.setAttribute('role', 'status'); area.setAttribute('aria-live', 'polite'); document.body.appendChild(area); }
    var item = document.createElement('div');
    item.className = 'aviso-flutuante' + (opcoes.tipo === 'perigo' ? ' aviso-flutuante--perigo' : '');
    item.textContent = texto;
    area.appendChild(item);
    setTimeout(function () { item.remove(); }, opcoes.duracao || 4000);
  }
  window.ds = { iniciar: iniciar, avisar: avisar };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { iniciar(); });
  else iniciar();
})();
`;

/** Ícones de linha usados nos exemplos (desenhados para o kit, traço de 2px). */
const ICONE_INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';

/** Catálogo: HTML de exemplo, uso em React e notas de acessibilidade. */
export const COMPONENTES = {
  botao: {
    nome: 'Botão', descricao: 'Ação principal, secundária, discreta, de acento ou destrutiva. Estados: hover, foco, desabilitado e carregando.',
    html: `<button class="botao" type="button">Agendar horário</button>
<button class="botao botao--secundario" type="button">Ver serviços</button>
<button class="botao botao--fantasma" type="button">Cancelar</button>
<button class="botao" type="submit" aria-busy="true">Enviando</button>
<a class="botao botao--grande" href="#agenda">Escolher horário</a>`,
    react: `<Botao>Agendar horário</Botao>
<Botao variante="secundario">Ver serviços</Botao>
<Botao carregando>Enviando</Botao>
<Botao como="a" href="#agenda" tamanho="grande">Escolher horário</Botao>`,
    notas: 'Use <button> para ações e <a class="botao"> só para navegação. Um primário por tela. O rótulo diz o que acontece ("Agendar horário"), nunca "Clique aqui" ou "Saiba mais".',
  },
  campo: {
    nome: 'Campo de formulário', descricao: 'Rótulo visível, ajuda, erro, opcional; input, textarea e select. Mais caixas de seleção e rádio (.opcao).',
    html: `<div class="campo">
  <label class="campo__rotulo" for="nome">Seu nome</label>
  <input class="campo__entrada" id="nome" name="nome" autocomplete="name" required>
</div>
<div class="campo">
  <label class="campo__rotulo" for="fone">WhatsApp</label>
  <input class="campo__entrada" id="fone" name="fone" type="tel" inputmode="tel" autocomplete="tel" aria-invalid="true" aria-describedby="fone-erro">
  <p class="campo__erro" id="fone-erro">Digite o número com DDD, por exemplo (84) 99999-0000.</p>
</div>
<label class="opcao"><input type="checkbox" name="lembrete"> Quero receber lembrete um dia antes</label>`,
    react: `<Campo rotulo="Seu nome" name="nome" autoComplete="name" required />
<Campo rotulo="WhatsApp" name="fone" type="tel" erro="Digite o número com DDD." />
<Campo rotulo="Observações" como="textarea" opcional ajuda="Algo que o barbeiro precise saber?" />`,
    notas: 'Todo campo tem <label> visível (placeholder não é rótulo). Erros ligados por aria-describedby e aria-invalid. Use autocomplete e inputmode certos. Fonte de 16px ou mais evita zoom no iPhone.',
  },
  interruptor: {
    nome: 'Interruptor', descricao: 'Liga/desliga com efeito imediato (role="switch").',
    html: `<button class="interruptor" type="button" role="switch" aria-checked="false">
  <span class="interruptor__trilho"><span class="interruptor__pino"></span></span>
  <span>Lembrete por WhatsApp</span>
</button>`,
    react: `<Interruptor ligado={lembrete} aoMudar={setLembrete}>Lembrete por WhatsApp</Interruptor>`,
    notas: 'Só para escolhas que valem na hora. Para algo que depende de "Salvar", use caixa de seleção.',
  },
  cartao: {
    nome: 'Cartão', descricao: 'Agrupa conteúdo relacionado. Variante interativa (o cartão inteiro clica) e plana.',
    html: `<article class="cartao cartao--interativo">
  <h3 class="cartao__titulo"><a href="servicos.html#corte">Corte na tesoura</a></h3>
  <p class="cartao__texto">40 minutos, lavagem inclusa. R$ 45.</p>
</article>`,
    react: `<Cartao titulo="Corte na tesoura" href="servicos.html#corte">40 minutos, lavagem inclusa. R$ 45.</Cartao>`,
    notas: 'Não transforme toda seção em grade de 3 cartões iguais com ícone em cima: é a marca registrada de site feito por IA. Varie tamanho, use listas, tabelas ou texto corrido quando o conteúdo pedir.',
  },
  selo: {
    nome: 'Selo', descricao: 'Rótulo curto de status ou categoria.',
    html: `<span class="selo">Novo</span> <span class="selo selo--sucesso">Confirmado</span> <span class="selo selo--aviso">Aguardando</span> <span class="selo selo--perigo">Cancelado</span>`,
    react: `<Selo tom="sucesso">Confirmado</Selo>`,
    notas: 'O texto carrega o significado; a cor só reforça.',
  },
  alerta: {
    nome: 'Alerta', descricao: 'Mensagem em linha: informação, sucesso, aviso ou erro.',
    html: `<div class="alerta alerta--aviso" role="status">
  ${ICONE_INFO}
  <p class="alerta__titulo">Sábados lotam rápido</p>
  <p class="alerta__texto">Os horários da manhã costumam acabar até quarta-feira.</p>
</div>`,
    react: `<Alerta tom="aviso" titulo="Sábados lotam rápido">Os horários da manhã costumam acabar até quarta-feira.</Alerta>`,
    notas: 'role="status" para avisos neutros e role="alert" só para erros que exigem atenção imediata. Nada de borda grossa só de um lado: é um tique visual de IA.',
  },
  dialogo: {
    nome: 'Diálogo', descricao: 'Janela modal com <dialog> nativo: foco preso, Esc fecha, foco volta ao botão.',
    html: `<button class="botao" type="button" data-abrir-dialogo="confirmar">Confirmar agendamento</button>
<dialog class="dialogo" id="confirmar" aria-labelledby="confirmar-titulo">
  <div class="dialogo__corpo">
    <h2 class="dialogo__titulo" id="confirmar-titulo">Confirmar sábado, 10h?</h2>
    <p>Você recebe a confirmação por WhatsApp.</p>
  </div>
  <div class="dialogo__acoes">
    <button class="botao botao--secundario" type="button" data-fechar-dialogo>Voltar</button>
    <button class="botao" type="button" data-fechar-dialogo>Confirmar</button>
  </div>
</dialog>`,
    react: `<Dialogo aberto={aberto} aoFechar={() => setAberto(false)} titulo="Confirmar sábado, 10h?" acoes={<Botao onClick={confirmar}>Confirmar</Botao>}>
  Você recebe a confirmação por WhatsApp.
</Dialogo>`,
    notas: 'Use para decisões que bloqueiam o fluxo. Para avisos rápidos, prefira o aviso flutuante.',
  },
  abas: {
    nome: 'Abas', descricao: 'Padrão WAI-ARIA completo: setas, Home/End e tabindex móvel.',
    html: `<div class="abas">
  <div class="abas__lista" role="tablist" aria-label="Serviços">
    <button class="abas__aba" role="tab" id="aba-cabelo" aria-controls="painel-cabelo" aria-selected="true">Cabelo</button>
    <button class="abas__aba" role="tab" id="aba-barba" aria-controls="painel-barba" aria-selected="false" tabindex="-1">Barba</button>
  </div>
  <div class="abas__painel" role="tabpanel" id="painel-cabelo" aria-labelledby="aba-cabelo" tabindex="0">…</div>
  <div class="abas__painel" role="tabpanel" id="painel-barba" aria-labelledby="aba-barba" tabindex="0" hidden>…</div>
</div>`,
    react: `<Abas rotulo="Serviços" abas={[{ id: 'cabelo', rotulo: 'Cabelo', conteudo: <ListaCabelo /> }, { id: 'barba', rotulo: 'Barba', conteudo: <ListaBarba /> }]} />`,
    notas: 'Abas escondem conteúdo: use só quando as seções são alternativas paralelas. Para FAQ, use sanfona.',
  },
  sanfona: {
    nome: 'Sanfona', descricao: 'Perguntas e respostas com <details>, sem JS.',
    html: `<details class="sanfona">
  <summary>Precisa marcar com antecedência?</summary>
  <div class="sanfona__conteudo"><p>Durante a semana dá para encaixar no mesmo dia; no sábado, marque até quarta.</p></div>
</details>`,
    react: `<Sanfona titulo="Precisa marcar com antecedência?">Durante a semana dá para encaixar no mesmo dia.</Sanfona>`,
    notas: 'Perguntas reais do público, escritas como ele pergunta.',
  },
  topo: {
    nome: 'Topo com navegação', descricao: 'Cabeçalho fixo com marca, links e menu recolhível no celular.',
    html: `<header class="topo">
  <div class="topo__interno">
    <a class="topo__marca" href="index.html">Navalha &amp; Café</a>
    <button class="topo__menu botao botao--fantasma" type="button" aria-expanded="false" aria-controls="menu-principal">Menu</button>
    <nav class="topo__nav" id="menu-principal" aria-label="Principal">
      <ul>
        <li><a href="index.html" aria-current="page">Início</a></li>
        <li><a href="servicos.html">Serviços</a></li>
        <li><a href="#agenda">Agendar</a></li>
      </ul>
    </nav>
  </div>
</header>`,
    react: `<Topo marca="Navalha & Café" links={[{ rotulo: 'Início', href: '/', atual: true }, { rotulo: 'Serviços', href: '/servicos' }]} />`,
    notas: 'aria-current="page" no link da página atual. No celular o menu abre e fecha com o botão e com Esc.',
  },
  tabela: {
    nome: 'Tabela', descricao: 'Dados comparáveis, com rolagem horizontal segura no celular e números alinhados.',
    html: `<div class="tabela-rolagem" role="region" aria-label="Preços" tabindex="0">
  <table class="tabela">
    <caption>Preços de outubro</caption>
    <thead><tr><th scope="col">Serviço</th><th scope="col">Duração</th><th scope="col" class="num">Preço</th></tr></thead>
    <tbody><tr><td>Corte</td><td>40 min</td><td class="num">R$ 45</td></tr></tbody>
  </table>
</div>`,
    react: `<Tabela legenda="Preços de outubro" colunas={[{ chave: 'servico', rotulo: 'Serviço' }, { chave: 'preco', rotulo: 'Preço', numero: true }]} linhas={linhas} />`,
    notas: 'th com scope, caption descrevendo a tabela e .num para valores à direita com algarismos tabulares.',
  },
  avatar: {
    nome: 'Avatar', descricao: 'Foto ou iniciais de uma pessoa.',
    html: `<span class="avatar"><img src="fotos/rafael.jpg" alt="Rafael, barbeiro"></span> <span class="avatar" aria-label="Marina Costa" role="img">MC</span>`,
    react: `<Avatar nome="Marina Costa" foto="/fotos/marina.jpg" />`,
    notas: 'Iniciais precisam de nome acessível (role="img" + aria-label).',
  },
  esqueleto: {
    nome: 'Esqueleto', descricao: 'Lugar reservado enquanto o conteúdo carrega.',
    html: `<div aria-busy="true" aria-live="polite"><span class="esqueleto" style="inline-size:60%"></span><span class="esqueleto" style="inline-size:40%;margin-top:.5rem"></span></div>`,
    react: `<Esqueleto largura="60%" />`,
    notas: 'Imite o formato do conteúdo real. A animação some com prefers-reduced-motion.',
  },
  migalhas: {
    nome: 'Migalhas', descricao: 'Onde a pessoa está na hierarquia (3 níveis ou mais).',
    html: `<nav class="migalhas" aria-label="Você está em"><ol><li><a href="index.html">Início</a></li><li><a href="servicos.html">Serviços</a></li><li><a aria-current="page">Barba</a></li></ol></nav>`,
    react: `<Migalhas itens={[{ rotulo: 'Início', href: '/' }, { rotulo: 'Barba' }]} />`,
    notas: 'Não use em sites de uma página só.',
  },
  paginacao: {
    nome: 'Paginação', descricao: 'Navegação entre páginas de uma lista.',
    html: `<nav class="paginacao" aria-label="Paginação"><a href="?p=1" aria-label="Página anterior">‹</a><a href="?p=1">1</a><a href="?p=2" aria-current="page">2</a><a href="?p=3">3</a><a href="?p=3" aria-label="Próxima página">›</a></nav>`,
    react: `<Paginacao atual={2} total={8} hrefDe={(p) => '?p=' + p} />`,
    notas: 'Alvos de 44px e rótulo acessível nas setas.',
  },
  vazio: {
    nome: 'Estado vazio', descricao: 'Quando ainda não há dados: explica e oferece a próxima ação.',
    html: `<div class="estado-vazio">
  <h3 class="estado-vazio__titulo">Nenhum agendamento ainda</h3>
  <p class="estado-vazio__texto">Quando alguém marcar um horário, ele aparece aqui com nome e serviço.</p>
  <button class="botao" type="button">Criar agendamento</button>
</div>`,
    react: `<EstadoVazio titulo="Nenhum agendamento ainda" acao={<Botao>Criar agendamento</Botao>}>Quando alguém marcar um horário, ele aparece aqui.</EstadoVazio>`,
    notas: 'Todo app precisa dos estados vazio, carregando e erro desenhados, não só o caminho feliz.',
  },
  avisos: {
    nome: 'Aviso flutuante', descricao: 'Confirmação rápida que some sozinha (toast), anunciada para leitores de tela.',
    html: `<button class="botao" type="button" onclick="ds.avisar('Horário reservado.')">Reservar</button>`,
    react: `const avisar = useAvisos(); avisar('Horário reservado.');`,
    notas: 'Só para confirmações. Erros que impedem o fluxo ficam na tela, perto do campo.',
  },
};

export const ORDEM_CSS = Object.keys(CSS);

/** CSS completo da biblioteca. */
export function cssComponentes() {
  return `/* Componentes do design system (gerado pelo Creative Lovable). Use só com tokens.css carregado antes. */\n` +
    ORDEM_CSS.map((k) => `/* ${COMPONENTES[k]?.nome || k} */${CSS[k]}`).join('\n\n') + '\n\n' +
    '@media (prefers-reduced-motion: reduce){.botao,.cartao--interativo,.interruptor__pino,.interruptor__trilho,.sanfona>summary::after{transition:none}.esqueleto,.dialogo[open],.aviso-flutuante{animation:none}}\n';
}

export function cssDoComponente(id) { return CSS[id] ? CSS[id].trim() : null; }

/** Componentes React (JSX, sem dependências além do React). */
export const REACT = {
  'Botao.jsx': `import { forwardRef } from 'react';

/** Botão do design system. variante: primario | secundario | fantasma | acento | perigo. */
export const Botao = forwardRef(function Botao({ como: Tag = 'button', variante = 'primario', tamanho, carregando = false, className = '', children, ...resto }, ref) {
  const classes = ['botao', variante !== 'primario' && 'botao--' + variante, tamanho && 'botao--' + tamanho, className].filter(Boolean).join(' ');
  const extra = Tag === 'button' ? { type: resto.type || 'button' } : {};
  return (
    <Tag ref={ref} className={classes} aria-busy={carregando || undefined} {...extra} {...resto}>
      {children}
    </Tag>
  );
});
`,
  'Campo.jsx': `import { useId } from 'react';

/** Campo com rótulo, ajuda e erro ligados por aria-describedby. como: input | textarea | select. */
export function Campo({ rotulo, como: Tag = 'input', ajuda, erro, opcional = false, id, className = '', children, ...resto }) {
  const gerado = useId();
  const campoId = id || gerado;
  const descricao = [ajuda && campoId + '-ajuda', erro && campoId + '-erro'].filter(Boolean).join(' ') || undefined;
  return (
    <div className={'campo ' + className}>
      <label className="campo__rotulo" htmlFor={campoId}>
        {rotulo}{opcional && <span className="campo__opcional"> (opcional)</span>}
      </label>
      <Tag id={campoId} className="campo__entrada" aria-invalid={erro ? true : undefined} aria-describedby={descricao} {...resto}>
        {children}
      </Tag>
      {ajuda && <p className="campo__ajuda" id={campoId + '-ajuda'}>{ajuda}</p>}
      {erro && <p className="campo__erro" id={campoId + '-erro'}>{erro}</p>}
    </div>
  );
}

export function Opcao({ children, ...resto }) {
  return (
    <label className="opcao"><input type="checkbox" {...resto} /> {children}</label>
  );
}
`,
  'Interruptor.jsx': `/** Liga/desliga com efeito imediato. */
export function Interruptor({ ligado, aoMudar, children, ...resto }) {
  return (
    <button type="button" role="switch" aria-checked={!!ligado} className="interruptor" onClick={() => aoMudar && aoMudar(!ligado)} {...resto}>
      <span className="interruptor__trilho"><span className="interruptor__pino" /></span>
      <span>{children}</span>
    </button>
  );
}
`,
  'Cartao.jsx': `/** Cartão. Com href, o cartão inteiro vira um link acessível. */
export function Cartao({ titulo, href, nivel = 3, plano = false, className = '', children, ...resto }) {
  const Titulo = 'h' + nivel;
  const classes = ['cartao', href && 'cartao--interativo', plano && 'cartao--plano', className].filter(Boolean).join(' ');
  return (
    <article className={classes} {...resto}>
      {titulo && <Titulo className="cartao__titulo">{href ? <a href={href}>{titulo}</a> : titulo}</Titulo>}
      {typeof children === 'string' ? <p className="cartao__texto">{children}</p> : children}
    </article>
  );
}
`,
  'Selo.jsx': `/** Selo de status. tom: marca | neutro | sucesso | aviso | perigo. */
export function Selo({ tom = 'marca', children }) {
  return <span className={'selo' + (tom !== 'marca' ? ' selo--' + tom : '')}>{children}</span>;
}
`,
  'Alerta.jsx': `/** Alerta em linha. tom: info | sucesso | aviso | perigo. */
export function Alerta({ tom = 'info', titulo, children }) {
  return (
    <div className={'alerta' + (tom !== 'info' ? ' alerta--' + tom : '')} role={tom === 'perigo' ? 'alert' : 'status'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
      {titulo && <p className="alerta__titulo">{titulo}</p>}
      <p className="alerta__texto">{children}</p>
    </div>
  );
}
`,
  'Dialogo.jsx': `import { useEffect, useId, useRef } from 'react';

/** Diálogo modal com <dialog> nativo (foco preso e Esc de graça). */
export function Dialogo({ aberto, aoFechar, titulo, acoes, children }) {
  const ref = useRef(null);
  const tituloId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  return (
    <dialog ref={ref} className="dialogo" aria-labelledby={tituloId} onClose={aoFechar} onClick={(e) => { if (e.target === ref.current) aoFechar && aoFechar(); }}>
      <div className="dialogo__corpo">
        <h2 className="dialogo__titulo" id={tituloId}>{titulo}</h2>
        {typeof children === 'string' ? <p>{children}</p> : children}
      </div>
      <div className="dialogo__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoFechar}>Voltar</button>
        {acoes}
      </div>
    </dialog>
  );
}
`,
  'Abas.jsx': `import { useId, useRef, useState } from 'react';

/** Abas com navegação por setas, Home e End. abas: [{ id, rotulo, conteudo }] */
export function Abas({ rotulo, abas, inicial }) {
  const base = useId();
  const [atual, setAtual] = useState(inicial || (abas[0] && abas[0].id));
  const refs = useRef({});
  const mover = (indice) => {
    const alvo = abas[(indice + abas.length) % abas.length];
    setAtual(alvo.id);
    refs.current[alvo.id] && refs.current[alvo.id].focus();
  };
  return (
    <div className="abas">
      <div className="abas__lista" role="tablist" aria-label={rotulo}>
        {abas.map((a, i) => (
          <button key={a.id} ref={(el) => { refs.current[a.id] = el; }} type="button" role="tab" className="abas__aba"
            id={base + '-aba-' + a.id} aria-controls={base + '-painel-' + a.id} aria-selected={atual === a.id} tabIndex={atual === a.id ? 0 : -1}
            onClick={() => setAtual(a.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); mover(i + 1); }
              if (e.key === 'ArrowLeft') { e.preventDefault(); mover(i - 1); }
              if (e.key === 'Home') { e.preventDefault(); mover(0); }
              if (e.key === 'End') { e.preventDefault(); mover(abas.length - 1); }
            }}>
            {a.rotulo}
          </button>
        ))}
      </div>
      {abas.map((a) => (
        <div key={a.id} className="abas__painel" role="tabpanel" id={base + '-painel-' + a.id} aria-labelledby={base + '-aba-' + a.id} tabIndex={0} hidden={atual !== a.id}>
          {a.conteudo}
        </div>
      ))}
    </div>
  );
}
`,
  'Sanfona.jsx': `/** Pergunta e resposta com <details>. */
export function Sanfona({ titulo, aberta = false, children }) {
  return (
    <details className="sanfona" open={aberta || undefined}>
      <summary>{titulo}</summary>
      <div className="sanfona__conteudo">{typeof children === 'string' ? <p>{children}</p> : children}</div>
    </details>
  );
}
`,
  'Topo.jsx': `import { useEffect, useId, useState } from 'react';

/** Cabeçalho com navegação e menu recolhível no celular. links: [{ rotulo, href, atual }] */
export function Topo({ marca, hrefMarca = '/', links = [], acao }) {
  const [aberto, setAberto] = useState(false);
  const navId = useId();
  useEffect(() => {
    const fechar = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('keydown', fechar);
    return () => document.removeEventListener('keydown', fechar);
  }, []);
  return (
    <header className="topo">
      <div className="topo__interno">
        <a className="topo__marca" href={hrefMarca}>{marca}</a>
        <button type="button" className="topo__menu botao botao--fantasma" aria-expanded={aberto} aria-controls={navId} onClick={() => setAberto(!aberto)}>Menu</button>
        <nav className="topo__nav" id={navId} aria-label="Principal" data-aberto={aberto ? '' : undefined}>
          <ul>
            {links.map((l) => (
              <li key={l.href}><a href={l.href} aria-current={l.atual ? 'page' : undefined}>{l.rotulo}</a></li>
            ))}
          </ul>
        </nav>
        {acao}
      </div>
    </header>
  );
}
`,
  'Tabela.jsx': `/** Tabela acessível. colunas: [{ chave, rotulo, numero }] linhas: [{...}] */
export function Tabela({ legenda, colunas, linhas, chaveLinha = (l, i) => i }) {
  return (
    <div className="tabela-rolagem" role="region" aria-label={legenda} tabIndex={0}>
      <table className="tabela">
        <caption>{legenda}</caption>
        <thead>
          <tr>{colunas.map((c) => <th key={c.chave} scope="col" className={c.numero ? 'num' : undefined}>{c.rotulo}</th>)}</tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={chaveLinha(l, i)}>{colunas.map((c) => <td key={c.chave} className={c.numero ? 'num' : undefined}>{l[c.chave]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`,
  'Avatar.jsx': `/** Foto ou iniciais. */
export function Avatar({ nome, foto, grande = false }) {
  const iniciais = String(nome || '?').trim().split(/\\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return foto
    ? <span className={'avatar' + (grande ? ' avatar--grande' : '')}><img src={foto} alt={nome} /></span>
    : <span className={'avatar' + (grande ? ' avatar--grande' : '')} role="img" aria-label={nome}>{iniciais}</span>;
}
`,
  'Esqueleto.jsx': `/** Lugar reservado enquanto carrega. */
export function Esqueleto({ largura = '100%', altura = '1em' }) {
  return <span className="esqueleto" style={{ inlineSize: largura, blockSize: altura }} aria-hidden="true" />;
}
`,
  'EstadoVazio.jsx': `/** Estado vazio com explicação e próxima ação. */
export function EstadoVazio({ titulo, acao, children }) {
  return (
    <div className="estado-vazio">
      <h3 className="estado-vazio__titulo">{titulo}</h3>
      {children && <p className="estado-vazio__texto">{children}</p>}
      {acao}
    </div>
  );
}
`,
  'Avisos.jsx': `import { createContext, useCallback, useContext, useState } from 'react';

const Contexto = createContext(() => {});

/** Envolva o app com <ProvedorDeAvisos> e use const avisar = useAvisos(). */
export function ProvedorDeAvisos({ children }) {
  const [avisos, setAvisos] = useState([]);
  const avisar = useCallback((texto, { tipo, duracao = 4000 } = {}) => {
    const id = Math.random().toString(36).slice(2);
    setAvisos((lista) => [...lista, { id, texto, tipo }]);
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), duracao);
  }, []);
  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => <div key={a.id} className={'aviso-flutuante' + (a.tipo === 'perigo' ? ' aviso-flutuante--perigo' : '')}>{a.texto}</div>)}
      </div>
    </Contexto.Provider>
  );
}

export const useAvisos = () => useContext(Contexto);
`,
  'index.js': `// Componentes do design system (gerado pelo Creative Lovable).
// Importe uma vez no main.jsx: import '../design-system/tokens.css'; import '../design-system/base.css'; import '../design-system/componentes.css';
export { Botao } from './Botao.jsx';
export { Campo, Opcao } from './Campo.jsx';
export { Interruptor } from './Interruptor.jsx';
export { Cartao } from './Cartao.jsx';
export { Selo } from './Selo.jsx';
export { Alerta } from './Alerta.jsx';
export { Dialogo } from './Dialogo.jsx';
export { Abas } from './Abas.jsx';
export { Sanfona } from './Sanfona.jsx';
export { Topo } from './Topo.jsx';
export { Tabela } from './Tabela.jsx';
export { Avatar } from './Avatar.jsx';
export { Esqueleto } from './Esqueleto.jsx';
export { EstadoVazio } from './EstadoVazio.jsx';
export { ProvedorDeAvisos, useAvisos } from './Avisos.jsx';
`,
};

/** Qual arquivo React corresponde a cada componente. */
export const REACT_DO_COMPONENTE = {
  botao: 'Botao.jsx', campo: 'Campo.jsx', interruptor: 'Interruptor.jsx', cartao: 'Cartao.jsx', selo: 'Selo.jsx', alerta: 'Alerta.jsx',
  dialogo: 'Dialogo.jsx', abas: 'Abas.jsx', sanfona: 'Sanfona.jsx', topo: 'Topo.jsx', tabela: 'Tabela.jsx', avatar: 'Avatar.jsx',
  esqueleto: 'Esqueleto.jsx', vazio: 'EstadoVazio.jsx', avisos: 'Avisos.jsx',
};
