import {r} from '../../dist/utils.js';
import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: extractSuffix2', () => {
  const thisOptimization = getNarrowOptimizer('extractSuffix2');

  it('should extract alternating suffixes if patterns are repeated for each suffix', () => {
    const cases = [
      ['a$|a!|b$|b!', '(?:a|b)(?:$|!)'],
      [r`a\d|a..|\d|..|cc\d|cc..`, r`(?:a||cc)(?:\d|..)`],
      ['a$|a!|a$|a!|b$|b!', '(?:a|a|b)(?:$|!)'],
      ['a$|a!|a$|a!', 'a$|a!'], // No prefix
      ['a|b|a|b', 'a|b'], // No prefix
      ['a$|a!', 'a$|a!'], // No prefix, but also the suffix set is not repeated
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
      expect(thisOptimization(`(${input})`)).toBe(`(${expected})`);
    }
  });

  it('should not apply when an alternating suffix is not found for all alternatives', () => {
    const cases = [
      'a',
      'a|b',
      'a$|a!|b$|b!|c$',
      'a$|a!|b$|b!|c',
      'a$|a!||b$|b!',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not apply when the alternating suffix has more than two items', () => {
    const cases = [
      'a$|a!|a#|b$|b!|b#',
      'a|b|c|a|b|c',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  // Just documenting current behavior
  it('should not consider non-simple nodes for the suffix', () => {
    const cases = [
      'a(^)|a(!)|b(^)|b(!)',
      'a[#]|a[!]|b[#]|b[!]',
      r`a\K|a!|b\K|b!`,
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  // Just documenting current behavior
  it('should not consider non-simple nodes for the prefix', () => {
    const cases = [
      '(a)$|(a)!|(b)$|(b)!',
      '[a]$|[a]!|[b]$|[b]!',
      r`\K$|\K!|b$|b!`,
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  // Example pattern from github.com/slevithan/oniguruma-parser/issues/27
  it('should extract alternating suffixes from a long list of alternatives', () => {
    const input = r`(?!nocorrect\W|nocorrect$|function\W|function$|foreach\W|foreach$|repeat\W|repeat$|logout\W|logout$|coproc\W|coproc$|select\W|select$|while\W|while$|pushd\W|pushd$|until\W|until$|case\W|case$|done\W|done$|elif\W|elif$|else\W|else$|esac\W|esac$|popd\W|popd$|then\W|then$|time\W|time$|for\W|for$|end\W|end$|fi\W|fi$|do\W|do$|in\W|in$|if\W|if$)`;
    const expected = r`(?!(?:nocorrect|function|foreach|repeat|logout|coproc|select|while|pushd|until|case|done|elif|else|esac|popd|then|time|for|end|fi|do|in|if)(?:\W|$))`;
    expect(thisOptimization(input)).toBe(expected);
  });
});
