// Captura de tela opcional com Playwright. Se não estiver instalado, a ferramenta explica como instalar.
import { ErroCreative } from './config.js';

let modulo;

export async function carregar() {
  if (modulo !== undefined) return modulo;
  for (const nome of ['playwright', 'playwright-core']) {
    try { modulo = await import(nome); return modulo; } catch { /* tenta o próximo */ }
  }
  modulo = null;
  return modulo;
}

export async function abrirNavegador(pw) {
  const chromium = pw.chromium || pw.default?.chromium;
  const args = [];
  if (typeof process.getuid === 'function' && process.getuid() === 0) args.push('--no-sandbox');
  if (process.env.CL_CHROME_ARGS) args.push(...process.env.CL_CHROME_ARGS.split(/\s+/).filter(Boolean));
  const tentativas = process.env.CL_CHROME
    ? [{ executablePath: process.env.CL_CHROME }]
    : [{}, { channel: 'chrome' }, { channel: 'msedge' }];
  let ultimoErro;
  for (const t of tentativas) {
    try { return await chromium.launch({ headless: true, args, ...t }); } catch (e) { ultimoErro = e; }
  }
  throw new ErroCreative('Não consegui abrir um navegador para a captura. ' + INSTRUCOES_CAPTURA + ' Detalhe: ' + String(ultimoErro?.message || ultimoErro).split('\n')[0]);
}

export const INSTRUCOES_CAPTURA = 'Para ativar capturas de tela, na pasta do Creative Lovable rode: npm install playwright-core (usa o Chrome ou Edge já instalados) ou npm install playwright && npx playwright install chromium. Para usar outro navegador, defina CL_CHROME com o caminho do executável.';

/**
 * @returns {Promise<null | {png: string, erros: string[], titulo: string}>} null quando o Playwright não está instalado.
 */
export async function capturarTela(url, { largura = 1280, altura = 800, esperaMs = 900, paginaInteira = false } = {}) {
  const pw = await carregar();
  if (!pw) return null;
  const navegador = await abrirNavegador(pw);
  try {
    const pagina = await navegador.newPage({ viewport: { width: largura, height: altura }, deviceScaleFactor: 1 });
    const erros = [];
    pagina.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
    pagina.on('pageerror', (e) => erros.push('erro: ' + e.message));
    pagina.on('requestfailed', (r) => erros.push('falhou ao carregar: ' + r.url()));
    await pagina.goto(url, { waitUntil: 'load', timeout: 25000 });
    await pagina.waitForTimeout(esperaMs);
    const png = await pagina.screenshot({ type: 'png', fullPage: paginaInteira });
    return { png: Buffer.from(png).toString('base64'), erros: erros.slice(0, 30), titulo: await pagina.title() };
  } finally {
    await navegador.close().catch(() => {});
  }
}
