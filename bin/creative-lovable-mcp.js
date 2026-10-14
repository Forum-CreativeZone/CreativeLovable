#!/usr/bin/env node
import { iniciar } from '../src/servidor.js';

iniciar().catch((e) => {
  console.error('[creative-lovable] não foi possível iniciar:', e?.message || e);
  process.exit(1);
});
