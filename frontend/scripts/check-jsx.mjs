import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile() && /\.(jsx|js)$/.test(path)) files.push(path);
  }
}
await walk(root);
let failed = false;
for (const file of files) {
  const source = await readFile(file, 'utf8');
  const output = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      allowJs: true,
      checkJs: false,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  const errors = (output.diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    failed = true;
    process.stderr.write(`${relative(root, file)}\n`);
    for (const error of errors) process.stderr.write(`${ts.flattenDiagnosticMessageText(error.messageText, '\n')}\n`);
  }
}
if (failed) process.exit(1);
console.log(`Frontend JSX/JavaScript syntax check passed (${files.length} files).`);
