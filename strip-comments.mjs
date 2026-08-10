

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, extname, join } from 'path';
import { argv, stdout, exit } from 'process';


function stripRust(source) {
  const len = source.length;
  let out = '';
  let i = 0;


  let state = 'normal';
  let blockDepth = 0;
  let rawHashes = 0;

  while (i < len) {
    const ch = source[i];
    const next = i + 1 < len ? source[i + 1] : '';

    switch (state) {
      case 'normal': {

        if (i === 0 && ch === '#' && next === '!') {

          while (i < len && source[i] !== '\n') {
            out += source[i];
            i++;
          }
          break;
        }


        if (ch === '/' && next === '/') {
          state = 'line_comment';
          i += 2;
          break;
        }


        if (ch === '/' && next === '*') {
          state = 'block_comment';
          blockDepth = 1;
          i += 2;
          break;
        }


        if (ch === 'r') {

          let j = i + 1;
          let hashes = 0;
          while (j < len && source[j] === '#') {
            hashes++;
            j++;
          }
          if (j < len && source[j] === '"') {

            rawHashes = hashes;
            state = 'string_raw';

            out += source.slice(i, j + 1);
            i = j + 1;
            break;
          }

          out += ch;
          i++;
          break;
        }


        if (ch === '"') {
          state = 'string_double';
          out += ch;
          i++;
          break;
        }


        if (ch === '\'') {


          if (isLifetime(source, i)) {

            state = 'lifetime';
            out += ch;
            i++;
          } else {
            state = 'char_lit';
            out += ch;
            i++;
          }
          break;
        }


        if (ch === 'b' && next === '\'') {
          out += ch;
          i++;

          break;
        }


        if (ch === 'b' && next === '"') {
          out += ch;
          i++;

          break;
        }


        out += ch;
        i++;
        break;
      }

      case 'line_comment': {


        if (ch === '\n') {
          out += ch;
          state = 'normal';
        }

        i++;
        break;
      }

      case 'block_comment': {

        if (ch === '/' && next === '*') {
          blockDepth++;
          i += 2;
          break;
        }
        if (ch === '*' && next === '/') {
          blockDepth--;
          i += 2;
          if (blockDepth === 0) {
            state = 'normal';
          }
          break;
        }

        if (ch === '\n') {
          out += '\n';
        }
        i++;
        break;
      }

      case 'string_double': {
        out += ch;
        if (ch === '\\') {

          if (i + 1 < len) {
            out += source[i + 1];
            i += 2;
          } else {
            i++;
          }
          break;
        }
        if (ch === '"') {
          state = 'normal';
        }
        i++;
        break;
      }

      case 'string_raw': {

        out += ch;
        if (ch === '"') {

          let hCount = 0;
          let j = i + 1;
          while (j < len && source[j] === '#' && hCount < rawHashes) {
            hCount++;
            j++;
          }
          if (hCount === rawHashes) {

            out += source.slice(i + 1, j);
            i = j;
            state = 'normal';
            break;
          }
        }
        i++;
        break;
      }

      case 'char_lit': {
        out += ch;
        if (ch === '\\') {

          if (i + 1 < len) {
            out += source[i + 1];
            i += 2;
          } else {
            i++;
          }
          break;
        }
        if (ch === '\'') {
          state = 'normal';
        }
        i++;
        break;
      }

      case 'lifetime': {

        if (isIdentChar(ch)) {
          out += ch;
          i++;
        } else {
          state = 'normal';

        }
        break;
      }

      default:
        out += ch;
        i++;
        break;
    }
  }

  return out;
}


function isLifetime(source, i) {

  const len = source.length;
  const next = i + 1 < len ? source[i + 1] : '';


  if (next === '\\') return false;


  if (!isIdentStart(next)) return false;


  let j = i + 1;
  while (j < len && isIdentChar(source[j])) {
    j++;
  }


  if (j < len && source[j] === '\'') return false;


  return true;
}

function isIdentStart(ch) {
  return /[a-zA-Z_\u0080-\uFFFF]/.test(ch);
}

function isIdentChar(ch) {
  return /[a-zA-Z0-9_\u0080-\uFFFF]/.test(ch);
}


function stripTS(source) {
  const len = source.length;
  let out = '';
  let i = 0;


  let lastToken = '';


  const stateStack = [];

  let state = 'normal';


  let regexInCharClass = false;


  let templateBraceDepth = 0;


  let lastSignificant = '';

  function recordOutput(str) {
    for (const ch of str) {
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        if (lastSignificant.length > 0) {
          lastToken = lastSignificant;
          lastSignificant = '';
        }
      } else {
        lastSignificant += ch;
      }
    }
  }

  function emit(str) {
    out += str;
    recordOutput(str);
  }

  function slashStartsRegex() {

    const prev = lastSignificant.length > 0 ? lastSignificant : lastToken;

    const regexStarters = new Set([
      '=', '(', '[', '!', '&', '|', '?', ':', ',', '{', '}', ';',
      'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete',
      'throw', 'void', 'case', '+=', '-=', '*=', '/=', '%=', '**=',
      '&&=', '||=', '??=', '==', '===', '!=', '!==', '<', '>', '<=',
      '>=', '=>', '...', '~', '^', '**', '<<', '>>', '>>>',
    ]);

    if (prev === '') return true;
    if (regexStarters.has(prev)) return true;


    const lastChar = prev[prev.length - 1];
    if ('=(<[!&|?:,{};~^'.includes(lastChar) && !isIdentChar(lastChar)) return true;

    return false;
  }

  while (i < len) {
    const ch = source[i];
    const next = i + 1 < len ? source[i + 1] : '';

    switch (state) {
      case 'normal': {

        if (i === 0 && ch === '#' && next === '!') {
          while (i < len && source[i] !== '\n') {
            emit(source[i]);
            i++;
          }
          break;
        }


        if (ch === '{' && next === '/' && i + 2 < len && source[i + 2] === '*') {

          state = 'jsx_comment';
          i += 3;
          break;
        }


        if (ch === '/' && next === '/') {
          state = 'line_comment';
          i += 2;
          break;
        }


        if (ch === '/' && next === '*') {
          state = 'block_comment';
          i += 2;
          break;
        }


        if (ch === '/') {
          if (slashStartsRegex()) {

            state = 'regex_literal';
            regexInCharClass = false;
            emit(ch);
            i++;
            break;
          }

          emit(ch);
          i++;
          break;
        }


        if (ch === '`') {
          state = 'template_literal';
          emit(ch);
          i++;
          break;
        }


        if (ch === '\'') {
          state = 'string_single';
          emit(ch);
          i++;
          break;
        }


        if (ch === '"') {
          state = 'string_double';
          emit(ch);
          i++;
          break;
        }

        emit(ch);
        i++;
        break;
      }

      case 'line_comment': {
        if (ch === '\n') {
          emit(ch);
          state = 'normal';
        }
        i++;
        break;
      }

      case 'block_comment': {

        if (ch === '*' && next === '/') {
          i += 2;
          state = 'normal';
          break;
        }
        if (ch === '\n') {
          emit('\n');
        }
        i++;
        break;
      }

      case 'jsx_comment': {

        if (ch === '*' && next === '/' && i + 2 < len && source[i + 2] === '}') {
          i += 3;
          state = 'normal';
          break;
        }

        if (ch === '*' && next === '/') {
          i += 2;
          state = 'normal';
          break;
        }
        if (ch === '\n') {
          emit('\n');
        }
        i++;
        break;
      }

      case 'string_single': {
        emit(ch);
        if (ch === '\\') {
          if (i + 1 < len) {
            emit(source[i + 1]);
            i += 2;
          } else {
            i++;
          }
          break;
        }
        if (ch === '\'') {
          state = 'normal';
        }
        i++;
        break;
      }

      case 'string_double': {
        emit(ch);
        if (ch === '\\') {
          if (i + 1 < len) {
            emit(source[i + 1]);
            i += 2;
          } else {
            i++;
          }
          break;
        }
        if (ch === '"') {
          state = 'normal';
        }
        i++;
        break;
      }

      case 'template_literal': {
        if (ch === '\\') {
          emit(ch);
          if (i + 1 < len) {
            emit(source[i + 1]);
            i += 2;
          } else {
            i++;
          }
          break;
        }
        if (ch === '`') {

          emit(ch);
          if (stateStack.length > 0) {
            const frame = stateStack.pop();
            state = frame.state;
            templateBraceDepth = frame.braceDepth;
          } else {
            state = 'normal';
          }
          i++;
          break;
        }
        if (ch === '$' && next === '{') {

          emit(ch);
          emit(next);
          i += 2;
          stateStack.push({ state: 'template_literal', braceDepth: templateBraceDepth });
          state = 'template_expr';
          templateBraceDepth = 1;
          break;
        }

        emit(ch);
        i++;
        break;
      }

      case 'template_expr': {


        if (ch === '/' && next === '/') {
          state = 'line_comment_in_expr';
          i += 2;
          break;
        }

        if (ch === '/' && next === '*') {
          state = 'block_comment_in_expr';
          i += 2;
          break;
        }


        if (ch === '`') {
          emit(ch);
          i++;
          stateStack.push({ state: 'template_expr', braceDepth: templateBraceDepth });
          state = 'template_literal';
          templateBraceDepth = 0;
          break;
        }


        if (ch === '\'') {
          emit(ch);
          i++;
          stateStack.push({ state: 'template_expr', braceDepth: templateBraceDepth });
          state = 'string_single_in_expr';
          break;
        }
        if (ch === '"') {
          emit(ch);
          i++;
          stateStack.push({ state: 'template_expr', braceDepth: templateBraceDepth });
          state = 'string_double_in_expr';
          break;
        }

        if (ch === '{') {
          templateBraceDepth++;
          emit(ch);
          i++;
          break;
        }
        if (ch === '}') {
          templateBraceDepth--;
          if (templateBraceDepth === 0) {

            emit(ch);
            i++;
            const frame = stateStack.pop();
            state = frame ? frame.state : 'template_literal';
            templateBraceDepth = frame ? frame.braceDepth : 0;
            break;
          }
          emit(ch);
          i++;
          break;
        }

        emit(ch);
        i++;
        break;
      }

      case 'line_comment_in_expr': {
        if (ch === '\n') {
          emit(ch);
          state = 'template_expr';
        }
        i++;
        break;
      }

      case 'block_comment_in_expr': {
        if (ch === '*' && next === '/') {
          i += 2;
          state = 'template_expr';
          break;
        }
        if (ch === '\n') emit('\n');
        i++;
        break;
      }

      case 'string_single_in_expr': {
        emit(ch);
        if (ch === '\\') {
          if (i + 1 < len) { emit(source[i + 1]); i += 2; } else i++;
          break;
        }
        if (ch === '\'') {
          const frame = stateStack.pop();
          state = frame ? frame.state : 'template_expr';
          templateBraceDepth = frame ? frame.braceDepth : templateBraceDepth;
        }
        i++;
        break;
      }

      case 'string_double_in_expr': {
        emit(ch);
        if (ch === '\\') {
          if (i + 1 < len) { emit(source[i + 1]); i += 2; } else i++;
          break;
        }
        if (ch === '"') {
          const frame = stateStack.pop();
          state = frame ? frame.state : 'template_expr';
          templateBraceDepth = frame ? frame.braceDepth : templateBraceDepth;
        }
        i++;
        break;
      }

      case 'regex_literal': {
        emit(ch);
        if (ch === '\\') {

          if (i + 1 < len) {
            emit(source[i + 1]);
            i += 2;
          } else {
            i++;
          }
          break;
        }
        if (ch === '[') {
          regexInCharClass = true;
          i++;
          break;
        }
        if (ch === ']') {
          regexInCharClass = false;
          i++;
          break;
        }

        if (ch === '/' && !regexInCharClass) {

          i++;
          while (i < len && /[gimsuvyd]/.test(source[i])) {
            emit(source[i]);
            i++;
          }
          state = 'normal';
          break;
        }
        if (ch === '\n') {

          state = 'normal';
        }
        i++;
        break;
      }

      default:
        emit(ch);
        i++;
        break;
    }
  }

  return out;
}


function stripCSS(source) {
  const len = source.length;
  let out = '';
  let i = 0;
  let state = 'normal';

  while (i < len) {
    const ch = source[i];
    const next = i + 1 < len ? source[i + 1] : '';

    switch (state) {
      case 'normal': {
        if (ch === '/' && next === '*') {
          state = 'block_comment';
          i += 2;
          break;
        }
        if (ch === '"') {
          state = 'string_double';
          out += ch;
          i++;
          break;
        }
        if (ch === '\'') {
          state = 'string_single';
          out += ch;
          i++;
          break;
        }
        if (ch === 'u' && source.slice(i, i + 4) === 'url(') {
          out += 'url(';
          i += 4;
          const peekI = i;
          let ws = 0;
          while (peekI + ws < len && (source[peekI + ws] === ' ' || source[peekI + ws] === '\t')) ws++;
          const afterWs = source[peekI + ws];
          if (afterWs === '"' || afterWs === '\'') {
            break;
          }
          state = 'url_unquoted';
          break;
        }
        out += ch;
        i++;
        break;
      }

      case 'block_comment': {
        if (ch === '*' && next === '/') {
          i += 2;
          state = 'normal';
          break;
        }
        if (ch === '\n') out += '\n';
        i++;
        break;
      }

      case 'string_double': {
        out += ch;
        if (ch === '\\' && i + 1 < len) {
          out += source[i + 1];
          i += 2;
          break;
        }
        if (ch === '"') state = 'normal';
        i++;
        break;
      }

      case 'string_single': {
        out += ch;
        if (ch === '\\' && i + 1 < len) {
          out += source[i + 1];
          i += 2;
          break;
        }
        if (ch === '\'') state = 'normal';
        i++;
        break;
      }

      case 'url_unquoted': {
        out += ch;
        if (ch === ')') state = 'normal';
        i++;
        break;
      }

      default:
        out += ch;
        i++;
        break;
    }
  }

  return out;
}


function stripHTML(source) {
  let out = '';
  let i = 0;
  const len = source.length;

  while (i < len) {

    if (source[i] === '<' && source[i+1] === '!' && source[i+2] === '-' && source[i+3] === '-') {
      const end = source.indexOf('-->', i + 4);
      if (end === -1) { out += source.slice(i); break; }

      const skipped = source.slice(i, end + 3);
      out += '\n'.repeat((skipped.match(/\n/g) || []).length);
      i = end + 3;
      continue;
    }


    if (source[i] === '<') {
      const styleOpen = source.slice(i).match(/^<style(\s[^>]*)?\s*>/i);
      if (styleOpen) {
        const openTag = styleOpen[0];
        out += openTag;
        i += openTag.length;
        const closeIdx = source.toLowerCase().indexOf('</style>', i);
        if (closeIdx === -1) { out += source.slice(i); break; }
        out += stripCSS(source.slice(i, closeIdx));
        out += '</style>';
        i = closeIdx + 8;
        continue;
      }


      const scriptOpen = source.slice(i).match(/^<script(\s[^>]*)?\s*>/i);
      if (scriptOpen) {
        const openTag = scriptOpen[0];
        out += openTag;
        i += openTag.length;
        const closeIdx = source.toLowerCase().indexOf('</script>', i);
        if (closeIdx === -1) { out += source.slice(i); break; }
        out += stripTS(source.slice(i, closeIdx));
        out += '</script>';
        i = closeIdx + 9;
        continue;
      }
    }

    out += source[i];
    i++;
  }

  return out;
}


function postProcess(source, hadFinalNewline) {

  const crlfCount = (source.match(/\r\n/g) || []).length;
  const lfCount = (source.match(/(?<!\r)\n/g) || []).length;
  const useCRLF = crlfCount > lfCount;


  const normalized = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');


  const trimmed = lines.map(l => l.replace(/[ \t]+$/, ''));


  const collapsed = [];
  let blankRun = 0;
  for (const line of trimmed) {
    if (line === '') {
      blankRun++;
      if (blankRun <= 2) {
        collapsed.push(line);
      }

    } else {
      blankRun = 0;
      collapsed.push(line);
    }
  }


  const sep = useCRLF ? '\r\n' : '\n';
  let result = collapsed.join(sep);


  if (hadFinalNewline && !result.endsWith(sep)) {
    result += sep;
  }

  return result;
}


function expandGlob(pattern) {

  if (!pattern.includes('*') && !pattern.includes('?')) {
    try {
      const stat = statSync(pattern);
      if (stat.isFile()) return [resolve(pattern)];
      if (stat.isDirectory()) {

        return walkDir(resolve(pattern), () => true);
      }
    } catch {

      return [];
    }
  }


  const absPattern = resolve(pattern);
  const parts = absPattern.split('/');


  let baseIdx = 0;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].includes('*') || parts[i].includes('?')) {
      baseIdx = i;
      break;
    }
    baseIdx = i + 1;
  }

  const baseDir = parts.slice(0, baseIdx).join('/') || '/';
  const globPart = parts.slice(baseIdx).join('/');
  const regexStr = globToRegex(globPart);
  const regex = new RegExp('^' + regexStr + '$');

  return walkDir(baseDir, (relPath) => regex.test(relPath));
}


function globToRegex(glob) {
  let result = '';
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {

      result += '.*';
      i += 2;

      if (glob[i] === '/') i++;
    } else if (ch === '*') {
      result += '[^/]*';
      i++;
    } else if (ch === '?') {
      result += '[^/]';
      i++;
    } else if ('.+^${}()|[]\\'.includes(ch)) {
      result += '\\' + ch;
      i++;
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}


function walkDir(dir, predicate) {
  const results = [];
  function walk(current) {
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(current, entry);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(full);
      } else if (stat.isFile()) {
        const rel = full.slice(dir.length + 1);
        if (predicate(rel)) {
          results.push(full);
        }
      }
    }
  }
  walk(dir);
  return results;
}


function main() {
  const args = argv.slice(2);

  if (args.length === 0) {
    stdout.write('Usage: node strip-comments.mjs [--dry-run] <glob-or-path> [<glob-or-path> ...]\nSupported: .rs  .ts  .tsx  .css  .js  .jsx  .mjs  .cjs  .html\n');
    exit(1);
  }

  let dryRun = false;
  const patterns = [];

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else {
      patterns.push(arg);
    }
  }

  if (patterns.length === 0) {
    stdout.write('Error: no paths or globs specified.\n');
    exit(1);
  }


  const allFiles = new Set();
  for (const pattern of patterns) {
    const expanded = expandGlob(pattern);
    for (const f of expanded) {
      allFiles.add(f);
    }
  }


  const supportedExts = new Set(['.rs', '.ts', '.tsx', '.css', '.js', '.jsx', '.mjs', '.cjs', '.html']);
  const files = [...allFiles].filter(f => supportedExts.has(extname(f)));

  if (files.length === 0) {
    stdout.write('No matching .rs/.ts/.tsx/.css/.js/.html files found.\n');
    return;
  }

  let totalProcessed = 0;
  let totalBytesSaved = 0;
  let totalChanged = 0;

  for (const filePath of files) {
    let source;
    try {
      source = readFileSync(filePath, 'utf8');
    } catch (err) {
      stdout.write(`  SKIP ${filePath}: ${err.message}\n`);
      continue;
    }

    const ext = extname(filePath);
    const lang = ext === '.rs' ? 'rust' : ext === '.css' ? 'css' : ext === '.html' ? 'html' : 'ts';

    const hadFinalNewline = source.endsWith('\n') || source.endsWith('\r\n');

    let stripped;
    try {
      stripped = lang === 'rust' ? stripRust(source) : lang === 'css' ? stripCSS(source) : lang === 'html' ? stripHTML(source) : stripTS(source);
    } catch (err) {
      stdout.write(`  ERROR ${filePath}: ${err.message}\n`);
      continue;
    }

    const processed = postProcess(stripped, hadFinalNewline);

    const bytesBefore = Buffer.byteLength(source, 'utf8');
    const bytesAfter = Buffer.byteLength(processed, 'utf8');
    const saved = bytesBefore - bytesAfter;

    totalProcessed++;

    if (processed === source) {

      if (dryRun) {
        stdout.write(`  unchanged  ${filePath}\n`);
      }
      continue;
    }

    totalChanged++;
    totalBytesSaved += saved;

    if (dryRun) {
      stdout.write(`  would strip  ${filePath}  (${saved >= 0 ? '-' : '+'}${Math.abs(saved)} bytes)\n`);
    } else {
      try {
        writeFileSync(filePath, processed, 'utf8');
        stdout.write(`  stripped  ${filePath}  (${saved >= 0 ? '-' : '+'}${Math.abs(saved)} bytes)\n`);
      } catch (err) {
        stdout.write(`  ERROR writing ${filePath}: ${err.message}\n`);
      }
    }
  }

  stdout.write('\n');
  stdout.write(`Summary:\n`);
  stdout.write(`  Files processed : ${totalProcessed}\n`);
  stdout.write(`  Files changed   : ${totalChanged}\n`);
  stdout.write(`  Bytes saved     : ${totalBytesSaved}\n`);
  if (dryRun) {
    stdout.write(`  (dry run — no files written)\n`);
  }
}

main();
