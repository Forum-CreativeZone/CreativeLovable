// Figma simulado: implementa a parte da Plugin API que o plugin gerado usa, com as mesmas regras de erro
// do Figma (fonte carregada antes de texto, coleção como objeto, modo existente). Usado pelos testes.
export function criarFigmaSimulado(fontes, { limiteModos = 4 } = {}) {
  const colecoes = []; const variaveis = []; const textos = []; const efeitos = [];
  let n = 0; const id = () => 'id' + (++n);
  const no = (type) => ({ type, id: id(), children: [], appendChild(c) { this.children.push(c); c.parent = this; }, remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }, resize(w, h) { this.width = w; this.height = h; }, async setTextStyleIdAsync(i) { this.textStyleId = i; } });
  const figma = {
    variables: {
      async getLocalVariableCollectionsAsync() { return colecoes.slice(); },
      async getLocalVariablesAsync() { return variaveis.slice(); },
      createVariableCollection(name) {
        const c = { id: id(), name, modes: [{ modeId: id(), name: 'Mode 1' }],
          renameMode(m, nome) { const x = this.modes.find((y) => y.modeId === m); if (!x) throw new Error('modo inexistente'); x.name = nome; },
          addMode(nome) { if (this.modes.length >= limiteModos) throw new Error('Limite de modos do plano'); const m = { modeId: id(), name: nome }; this.modes.push(m); return m.modeId; } };
        colecoes.push(c); return c;
      },
      createVariable(name, col, tipo) {
        if (!col || typeof col !== 'object') throw new Error('createVariable espera a coleção (objeto)');
        const v = { id: id(), name, variableCollectionId: col.id, resolvedType: tipo, valores: {}, scopes: ['ALL_SCOPES'],
          setValueForMode(m, val) {
            if (!col.modes.some((x) => x.modeId === m)) throw new Error('modo inválido para a coleção');
            if (tipo === 'COLOR' && !(val && (val.type === 'VARIABLE_ALIAS' || ['r', 'g', 'b'].every((k) => typeof val[k] === 'number' && val[k] >= 0 && val[k] <= 1)))) throw new Error('cor inválida');
            if (tipo === 'FLOAT' && typeof val !== 'number') throw new Error('número inválido');
            this.valores[m] = val;
          } };
        variaveis.push(v); return v;
      },
      createVariableAlias(v) { return { type: 'VARIABLE_ALIAS', id: v.id }; },
      setBoundVariableForPaint(paint, campo, v) { if (!v || campo !== 'color') throw new Error('vínculo inválido'); return { ...paint, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: v.id } } }; },
    },
    async listAvailableFontsAsync() { return fontes.map(([family, style]) => ({ fontName: { family, style } })); },
    async loadFontAsync(f) { if (!fontes.some(([a, b]) => a === f.family && b === f.style)) throw new Error(`fonte indisponível: ${f.family} ${f.style}`); figma._carregadas.add(f.family + '|' + f.style); },
    _carregadas: new Set(),
    async getLocalTextStylesAsync() { return textos.slice(); },
    createTextStyle() { const s = { id: id(), set fontName(f) { if (!figma._carregadas.has(f.family + '|' + f.style)) throw new Error('carregue a fonte antes'); this._f = f; }, get fontName() { return this._f; } }; textos.push(s); return s; },
    async getLocalEffectStylesAsync() { return efeitos.slice(); },
    createEffectStyle() { const s = { id: id() }; efeitos.push(s); return s; },
    root: { children: [] },
    createPage() { const p = no('PAGE'); figma.root.children.push(p); return p; },
    async setCurrentPageAsync(p) { figma.currentPage = p; },
    createFrame() { return no('FRAME'); },
    createRectangle() { return no('RECTANGLE'); },
    createText() {
      const t = no('TEXT');
      Object.defineProperty(t, 'characters', { set(v) { if (!this.fontName || !figma._carregadas.has(this.fontName.family + '|' + this.fontName.style)) throw new Error('carregue a fonte antes de escrever'); this._c = v; }, get() { return this._c; } });
      return t;
    },
    viewport: { scrollAndZoomIntoView() {} },
    notify(m) { figma._avisos.push(m); }, _avisos: [],
    closePlugin(m) { figma._fechado = m; },
  };
  return { figma, colecoes, variaveis, textos, efeitos };
}

/** Roda o código do plugin no Figma simulado e espera o closePlugin. */
export async function rodarPlugin(codigo, figma) {
  new Function('figma', codigo)(figma);
  for (let i = 0; i < 200 && figma._fechado === undefined; i++) await new Promise((r) => setTimeout(r, 5));
  return figma._fechado;
}
