import fs from 'node:fs/promises';
import path from 'node:path';

// Same raw-text import contract in portable builds and Node render tests.
export const rawSourcePlugin = { name: 'raw-source', setup(builder) {
  builder.onResolve({ filter: /\?raw$/ }, args => ({
    path: path.resolve(args.resolveDir, args.path.slice(0, -4)), namespace: 'raw-source',
  }));
  builder.onLoad({ filter: /.*/, namespace: 'raw-source' }, async args => ({
    contents: await fs.readFile(args.path, 'utf8'), loader: 'text',
  }));
} };
