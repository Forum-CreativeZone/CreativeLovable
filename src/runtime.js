// Script injetado nas páginas do preview. Fica numa linha só, logo depois de <head>,
// para que os números de linha dos erros batam com o arquivo original.
function creativeRuntime(SLUG) {
  var base = '/api/projetos/' + encodeURIComponent(SLUG);
  var post = function (rota, d) { try { fetch(base + rota, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Creative': '1' }, body: JSON.stringify(d), keepalive: true }).catch(function () {}); } catch (e) {} };
  var pagina = function () { return location.pathname.replace(/^\/preview\/[^/]+/, '') || '/'; };
  var arq = function (u) { if (!u) return ''; try { var x = new URL(u, location.href); return x.origin === location.origin ? x.pathname.replace(/^\/preview\/[^/]+\//, '') : u; } catch (e) { return String(u); } };
  var erro = function (d) { d.pagina = pagina(); post('/erros', d); };
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) { erro({ tipo: 'recurso', mensagem: 'Não carregou: ' + arq(t.src || t.href) }); return; }
    if (!e.message) return;
    erro({ tipo: 'erro', mensagem: e.message === 'Script error.' ? 'Erro num script de outro domínio (o navegador não dá detalhes)' : e.message, arquivo: arq(e.filename), linha: e.lineno || 0, coluna: e.colno || 0, pilha: e.error && e.error.stack ? String(e.error.stack).slice(0, 900) : '' });
  }, true);
  window.addEventListener('unhandledrejection', function (e) { var r = e.reason; erro({ tipo: 'promessa', mensagem: 'Promise rejeitada: ' + (r && r.message ? r.message : String(r)), pilha: r && r.stack ? String(r.stack).slice(0, 900) : '' }); });
  var ce = console.error;
  console.error = function () {
    try { erro({ tipo: 'console', mensagem: Array.prototype.map.call(arguments, function (a) { if (a && a.message) return a.message; if (a && typeof a === 'object') { try { return JSON.stringify(a); } catch (x) { return String(a); } } return String(a); }).join(' ').slice(0, 600) }); } catch (e) {}
    return ce.apply(console, arguments);
  };
  try {
    var t = 0;
    var es = new EventSource('/api/eventos?projeto=' + encodeURIComponent(SLUG));
    es.addEventListener('arquivos', function () { clearTimeout(t); t = setTimeout(function () { location.reload(); }, 150); });
    window.addEventListener('pagehide', function () { es.close(); });
  } catch (e) {}
  var selecionando = false, caixa = null, rotulo = null;
  var garantirCaixa = function () {
    if (caixa) return;
    caixa = document.createElement('div'); caixa.setAttribute('data-creative-ui', '');
    caixa.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;border:2px solid #ff6a3d;background:rgba(255,106,61,.08);border-radius:4px;display:none';
    rotulo = document.createElement('div');
    rotulo.style.cssText = 'position:absolute;left:-2px;top:-22px;background:#ff6a3d;color:#1c0d06;font:600 11px/1 system-ui,sans-serif;padding:4px 6px;border-radius:4px;white-space:nowrap';
    caixa.appendChild(rotulo); document.documentElement.appendChild(caixa);
  };
  var desenhar = function (el) {
    garantirCaixa();
    if (!el || !el.getBoundingClientRect) { caixa.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    caixa.style.display = 'block'; caixa.style.left = r.left + 'px'; caixa.style.top = r.top + 'px'; caixa.style.width = r.width + 'px'; caixa.style.height = r.height + 'px';
    rotulo.textContent = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '');
    rotulo.style.top = r.top < 24 ? 'calc(100% + 2px)' : '-22px';
  };
  var ligar = function (v) { selecionando = v; document.documentElement.style.cursor = v ? 'crosshair' : ''; if (!v && caixa) caixa.style.display = 'none'; };
  var caminhoCss = function (el) {
    var partes = [];
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      var p = el.tagName.toLowerCase();
      if (el.id) { partes.unshift(p + '#' + el.id); break; }
      var pai = el.parentElement;
      if (pai) { var iguais = Array.prototype.filter.call(pai.children, function (c) { return c.tagName === el.tagName; }); if (iguais.length > 1) p += ':nth-of-type(' + (iguais.indexOf(el) + 1) + ')'; }
      partes.unshift(p); el = pai;
    }
    return partes.join(' > ');
  };
  var ehUi = function (el) { return el && el.closest && el.closest('[data-creative-ui]'); };
  document.addEventListener('mouseover', function (e) { if (selecionando && !ehUi(e.target)) desenhar(e.target); }, true);
  document.addEventListener('click', function (e) {
    if (!selecionando) return;
    e.preventDefault(); e.stopPropagation();
    var el = e.target; if (ehUi(el)) return;
    var texto = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    var sel = { tag: el.tagName.toLowerCase(), caminho: caminhoCss(el), texto: texto, html: el.outerHTML.slice(0, 2000), pagina: pagina(), classes: String(el.className || '').slice(0, 300) };
    post('/selecao', sel);
    try { parent.postMessage({ creative: 1, tipo: 'selecionado', selecao: sel }, '*'); } catch (x) {}
    ligar(false);
  }, true);
  document.addEventListener('keydown', function (e) { if (selecionando && e.key === 'Escape') { ligar(false); try { parent.postMessage({ creative: 1, tipo: 'selecao-cancelada' }, '*'); } catch (x) {} } }, true);
  window.addEventListener('scroll', function () { if (selecionando && caixa) caixa.style.display = 'none'; }, true);
  window.addEventListener('message', function (e) { var d = e.data; if (d && d.creative === 1 && d.tipo === 'selecionar') ligar(!!d.ativo); });
}

const FONTE = creativeRuntime.toString().replace(/\n\s*/g, ' ');

export function scriptRuntime(slug) {
  return `<script data-creative-runtime>(${FONTE})(${JSON.stringify(slug).replace(/</g, '\\u003c')});</script>`;
}

/** Insere o runtime logo depois de <head> (ou de <html>, ou do doctype) sem criar linhas novas. */
export function injetarRuntime(html, slug) {
  const tag = scriptRuntime(slug);
  const depois = (re) => { const m = html.match(re); return m ? m.index + m[0].length : -1; };
  let i = depois(/<head(\s[^>]*)?>/i);
  if (i < 0) i = depois(/<html(\s[^>]*)?>/i);
  if (i < 0) i = depois(/<!doctype[^>]*>/i);
  return i < 0 ? tag + html : html.slice(0, i) + tag + html.slice(i);
}
