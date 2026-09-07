const SUPER = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };

export function normalizeLatex(source) {
  let value = String(source || '').trim();
  value = value.replace(/fract\s*\{/gi, '\\frac{');
  value = value.replace(/(^|[^\\])frac\s*\{/g, '$1\\frac{');
  value = value.replace(/dfrac\s*\{/gi, '\\dfrac{');
  value = value.replace(/tfrac\s*\{/gi, '\\tfrac{');
  value = value.replace(/sqrt\s*\{/gi, (match, offset, full) => (
    offset > 0 && full[offset - 1] === '\\' ? match : '\\sqrt{'
  ));
  value = value.replace(/\\\\frac/g, '\\frac');
  value = value.replace(/\\n(?![a-zA-Z])/g, ' ');
  return value.trim();
}

export function latexFallback(source) {
  return normalizeLatex(source)
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^{}]+)\}/g, '√($1)')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\infty/g, '∞')
    .replace(/\\pi/g, 'π')
    .replace(/\\theta/g, 'θ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\left|\\right/g, '')
    .replace(/\^(\d)/g, (_, digit) => SUPER[digit] || `^${digit}`)
    .replace(/_(\d)/g, (_, digit) => SUB[digit] || `_${digit}`)
    .replace(/[{}]/g, '');
}

function looksLikeMath(value) {
  const inner = String(value || '').trim();
  if (!inner) return false;
  if (/\\[a-zA-Z]+|[_\^{}]/.test(inner)) return true;
  if (/^[0-9A-Za-z+\-*/=().,\s^_]+$/.test(inner) && /[+\-*/=^]/.test(inner)) return true;
  return inner.length <= 48 && /[0-9]/.test(inner) && /[a-zA-Z+\-*/=]/.test(inner);
}

function wrapBareLatex(text) {
  let value = String(text || '');
  value = value.replace(/\bfract\s*\{/gi, '\\frac{');
  if (/\$|\\\(|\\\[/.test(value)) return value;
  if (!/\\(frac|sqrt|sum|int|cdot|times|div|left|right|text|overline|bar)/.test(value)) return value;
  return value.replace(
    /(\\frac\{[^{}]*\}\{[^{}]*\}|\\sqrt(?:\[[^\]]*\])?\{[^{}]*\}|\\[a-zA-Z]+(?:\{[^{}]*\})*)/g,
    '$$$1$'
  );
}

export function splitMarkdownAndMath(text) {
  const source = wrapBareLatex(String(text || ''));
  const tokens = [];
  const pattern = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$((?:\\.|[^$])+?)\$|\\\(([\s\S]+?)\\\)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: source.slice(lastIndex, match.index) });
    }
    if (match[1] != null) {
      tokens.push({ type: 'display-math', value: normalizeLatex(match[1]) });
    } else if (match[2] != null) {
      tokens.push({ type: 'display-math', value: normalizeLatex(match[2]) });
    } else if (match[3] != null) {
      if (looksLikeMath(match[3])) {
        tokens.push({ type: 'inline-math', value: normalizeLatex(match[3]) });
      } else {
        tokens.push({ type: 'text', value: match[0] });
      }
    } else if (match[4] != null) {
      tokens.push({ type: 'inline-math', value: normalizeLatex(match[4]) });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    tokens.push({ type: 'text', value: source.slice(lastIndex) });
  }
  return tokens.length ? tokens : [{ type: 'text', value: source }];
}
