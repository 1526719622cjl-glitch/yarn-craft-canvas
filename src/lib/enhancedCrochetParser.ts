/**
 * Enhanced Crochet Pattern Parser
 * Supports comprehensive JIS stitch notation with advanced pattern syntax
 */

import { CrochetStitchType, STITCH_DATABASE } from './crochetStitchTypes';

// Token types for lexer
type TokenType = 
  | 'STITCH' 
  | 'NUMBER' 
  | 'LPAREN' 
  | 'RPAREN' 
  | 'LBRACKET'
  | 'RBRACKET'
  | 'MULTIPLY' 
  | 'COMMA'
  | 'MODIFIER'
  | 'CONNECTOR'
  | 'NEWLINE';

interface Token {
  type: TokenType;
  value: string;
}

// Complete stitch mapping (based on JIS and common crochet abbreviations)
const STITCH_MAP: Record<string, CrochetStitchType> = {
  // Basic stitches
  'x': 'sc',
  'sc': 'sc',
  '+': 'sc',
  'v': 'inc',
  'inc': 'inc',
  'a': 'dec',
  'dec': 'dec',
  'inv': 'dec',
  't': 'hdc',
  'hdc': 'hdc',
  'f': 'dc',
  'dc': 'dc',
  'e': 'tr',
  'tr': 'tr',
  'dtr': 'dtr',
  'trtr': 'trtr',
  'qtr': 'qtr',
  'ch': 'chain',
  'c': 'chain',
  'chain': 'chain',
  'sl': 'slip',
  's': 'slip',
  'slst': 'slip',
  
  // Increase variations
  'w': 'inc3',      // W = 3-stitch increase
  'inc3': 'inc3',
  'inc4': 'inc4',
  'inc5': 'inc5',
  'fan': 'inc5',
  
  // Decrease variations
  'm': 'dec3',      // M = 3-stitch decrease
  'dec3': 'dec3',
  'sc2tog': 'sc2tog',
  'dc2tog': 'dc2tog',
  'dc3tog': 'dc3tog',
  'dc4tog': 'dc4tog',
  'dc5tog': 'dc5tog',
  
  // Loop variations
  'blo': 'blo',
  'flo': 'flo',
  'bpsc': 'bpsc',
  'fpsc': 'fpsc',
  'bpdc': 'bpdc',
  'fpdc': 'fpdc',
  'bptr': 'bptr',
  'fptr': 'fptr',
  
  // Texture stitches
  'pop': 'popcorn',
  'popcorn': 'popcorn',
  'pc': 'popcorn',
  'bob': 'bobble',
  'bobble': 'bobble',
  'puff': 'puff',
  'pf': 'puff',
  'bull': 'bullion',
  'bullion': 'bullion',
  'cl': 'cluster',
  'cluster': 'cluster',
  'sh': 'shell',
  'shell': 'shell',
  'pic': 'picot',
  'picot': 'picot',
  'sp': 'spike',
  'spike': 'spike',
  'lp': 'loop',
  'loop': 'loop',
  'croc': 'crocodile',
  
  // Special stitches
  'mr': 'magic',
  'magic': 'magic',
  'ring': 'magic',
  'stand': 'standing',
  'standing': 'standing',
  'join': 'join',
  'j': 'join',
  'sk': 'skip',
  'skip': 'skip',
  'space': 'space',
  'link': 'linked',
  'linked': 'linked',
  'ext': 'extended',
  'extended': 'extended',
  'cr': 'crossed',
  'crossed': 'crossed',
  
  // Decorative stitches
  'vst': 'vst',
  'vstitch': 'vst',
  'gr': 'granny',
  'granny': 'granny',
  'bead': 'bead',
  'sol': 'solomon',
  'solomon': 'solomon',
  'broom': 'broomstick',
  'broomstick': 'broomstick',
  'hp': 'hairpin',
  'hairpin': 'hairpin',
};

// Modifiers that affect the next stitch
const MODIFIERS = ['blo', 'flo'];

// Parsed stitch with metadata
export interface ParsedStitch {
  row: number;
  stitch: number;
  type: CrochetStitchType;
  modifier?: 'blo' | 'flo';
  intoChain?: number;
  color?: string;
}

// Row validation result
export interface RowValidation {
  row: number;
  stitchCount: number;
  expectedCount?: number;
  isValid: boolean;
  message?: string;
}

// Parser result
export interface ParseResult {
  stitches: ParsedStitch[];
  validations: RowValidation[];
  errors: string[];
  totalRows: number;
  totalStitches: number;
}

// Lexer: tokenize input
function tokenize(input: string): Token[][] {
  const lines = input.split('\n').filter(l => l.trim());
  return lines.map(line => {
    const tokens: Token[] = [];
    let i = 0;
    const str = line.toLowerCase().trim();
    
    while (i < str.length) {
      // Skip whitespace
      if (/\s/.test(str[i])) {
        i++;
        continue;
      }
      
      // Parentheses for grouping
      if (str[i] === '(') {
        tokens.push({ type: 'LPAREN', value: '(' });
        i++;
        continue;
      }
      if (str[i] === ')') {
        tokens.push({ type: 'RPAREN', value: ')' });
        i++;
        continue;
      }
      
      // Brackets for alternate repeat syntax [2x, v] x 6
      if (str[i] === '[') {
        tokens.push({ type: 'LBRACKET', value: '[' });
        i++;
        continue;
      }
      if (str[i] === ']') {
        tokens.push({ type: 'RBRACKET', value: ']' });
        i++;
        continue;
      }
      
      // Multiply
      if (str[i] === '*' || str[i] === '×') {
        tokens.push({ type: 'MULTIPLY', value: '*' });
        i++;
        continue;
      }
      
      // Comma or semicolon separator
      if (str[i] === ',' || str[i] === ';') {
        tokens.push({ type: 'COMMA', value: ',' });
        i++;
        continue;
      }
      
      // Plus sign (alias for SC)
      if (str[i] === '+') {
        tokens.push({ type: 'STITCH', value: '+' });
        i++;
        continue;
      }
      
      // Number
      if (/\d/.test(str[i])) {
        let num = '';
        while (i < str.length && /\d/.test(str[i])) {
          num += str[i++];
        }
        tokens.push({ type: 'NUMBER', value: num });
        continue;
      }
      
      // Word (stitch name or modifier)
      if (/[a-z]/.test(str[i])) {
        let word = '';
        while (i < str.length && /[a-z0-9]/.test(str[i])) {
          word += str[i++];
        }
        
        // Check for modifiers
        if (MODIFIERS.includes(word)) {
          tokens.push({ type: 'MODIFIER', value: word });
        } else if (['into', 'in', 'on', 'from', 'around', 'through'].includes(word)) {
          // Skip connector words
          tokens.push({ type: 'CONNECTOR', value: word });
        } else if (['nd', 'rd', 'th', 'st'].includes(word)) {
          // Ordinal suffixes - skip
          continue;
        } else if (word === 'row' || word === 'round' || word === 'rnd' || word === 'r') {
          // Row indicators - skip but could be used for row numbering
          continue;
        } else if (STITCH_MAP[word]) {
          tokens.push({ type: 'STITCH', value: word });
        } else {
          // Unknown word - try to find partial match
          for (const [key, _] of Object.entries(STITCH_MAP)) {
            if (word.startsWith(key) && key.length >= 2) {
              tokens.push({ type: 'STITCH', value: key });
              break;
            }
          }
        }
        continue;
      }
      
      i++;
    }
    
    return tokens;
  });
}

// Recursive descent parser
class CrochetPatternParser {
  private tokens: Token[] = [];
  private pos = 0;
  private currentRow = 0;
  private currentStitch = 0;
  private stitches: ParsedStitch[] = [];
  private currentModifier?: 'blo' | 'flo';
  private currentIntoChain?: number;
  
  parse(tokenLines: Token[][]): ParsedStitch[] {
    this.stitches = [];
    this.currentRow = 0;
    
    for (const tokens of tokenLines) {
      this.tokens = tokens;
      this.pos = 0;
      this.currentRow++;
      this.currentStitch = 0;
      this.currentModifier = undefined;
      this.currentIntoChain = undefined;
      
      this.parseRow();
    }
    
    return this.stitches;
  }
  
  private peek(offset = 0): Token | null {
    return this.tokens[this.pos + offset] ?? null;
  }
  
  private consume(): Token | null {
    return this.tokens[this.pos++] ?? null;
  }
  
  private parseRow(): void {
    while (this.peek()) {
      this.parseElement();
    }
  }
  
  private parseElement(): void {
    const token = this.peek();
    if (!token) return;
    
    // Check for modifier (BLO/FLO)
    if (token.type === 'MODIFIER') {
      this.currentModifier = token.value as 'blo' | 'flo';
      this.consume();
      return;
    }
    
    // Skip connectors
    if (token.type === 'CONNECTOR') {
      this.consume();
      return;
    }
    
    // Number followed by stitch: "6x" or "6 sc"
    if (token.type === 'NUMBER') {
      const count = parseInt(this.consume()!.value);
      const next = this.peek();
      
      // Check for "into Nth chain" syntax
      if (next?.type === 'CONNECTOR') {
        this.consume();
        const numToken = this.peek();
        if (numToken?.type === 'NUMBER') {
          this.currentIntoChain = parseInt(this.consume()!.value);
        }
        // Continue to get the stitch
        const stitchToken = this.peek();
        if (stitchToken?.type === 'STITCH') {
          const stitchType = STITCH_MAP[this.consume()!.value] || 'sc';
          this.addStitches(stitchType, count);
        }
        return;
      }
      
      if (next?.type === 'STITCH') {
        const stitchType = STITCH_MAP[this.consume()!.value] || 'sc';
        this.addStitches(stitchType, count);
      } else if (next?.type === 'LPAREN' || next?.type === 'LBRACKET') {
        // Number before group: "3(2x, v)" means repeat the group 3 times
        // Push number back and handle in group parsing
        return;
      }
      return;
    }
    
    // Single stitch: "x" or "v"
    if (token.type === 'STITCH') {
      const stitchType = STITCH_MAP[this.consume()!.value] || 'sc';
      this.addStitches(stitchType, 1);
      return;
    }
    
    // Grouped repeat: "(2x, v)*6" or "[2x, v] x 6"
    if (token.type === 'LPAREN' || token.type === 'LBRACKET') {
      const closeType = token.type === 'LPAREN' ? 'RPAREN' : 'RBRACKET';
      this.consume(); // consume opening bracket
      const groupStitches = this.parseGroup(closeType);
      
      // Expect closing bracket
      if (this.peek()?.type === closeType) {
        this.consume();
      }
      
      // Look for repeat count: "*6" or "x 6" or just "6"
      let repeatCount = 1;
      if (this.peek()?.type === 'MULTIPLY') {
        this.consume();
        if (this.peek()?.type === 'NUMBER') {
          repeatCount = parseInt(this.consume()!.value);
        }
      } else if (this.peek()?.type === 'NUMBER') {
        repeatCount = parseInt(this.consume()!.value);
      }
      
      // Repeat the group
      for (let r = 0; r < repeatCount; r++) {
        for (const { type, count, modifier } of groupStitches) {
          const savedModifier = this.currentModifier;
          if (modifier) {
            this.currentModifier = modifier;
          }
          this.addStitches(type, count);
          this.currentModifier = savedModifier;
        }
      }
      return;
    }
    
    // Skip unknown tokens
    this.consume();
  }
  
  private parseGroup(closeType: TokenType): { type: CrochetStitchType; count: number; modifier?: 'blo' | 'flo' }[] {
    const items: { type: CrochetStitchType; count: number; modifier?: 'blo' | 'flo' }[] = [];
    let currentGroupModifier: 'blo' | 'flo' | undefined;
    
    while (this.peek() && this.peek()?.type !== closeType) {
      const token = this.peek();
      
      if (token?.type === 'COMMA') {
        this.consume();
        continue;
      }
      
      if (token?.type === 'MODIFIER') {
        currentGroupModifier = this.consume()!.value as 'blo' | 'flo';
        continue;
      }
      
      if (token?.type === 'NUMBER') {
        const count = parseInt(this.consume()!.value);
        const next = this.peek();
        if (next?.type === 'STITCH') {
          const stitchType = STITCH_MAP[this.consume()!.value] || 'sc';
          items.push({ type: stitchType, count, modifier: currentGroupModifier });
          currentGroupModifier = undefined;
        }
        continue;
      }
      
      if (token?.type === 'STITCH') {
        const stitchType = STITCH_MAP[this.consume()!.value] || 'sc';
        items.push({ type: stitchType, count: 1, modifier: currentGroupModifier });
        currentGroupModifier = undefined;
        continue;
      }
      
      this.consume();
    }
    
    return items;
  }
  
  private addStitches(type: CrochetStitchType, count: number): void {
    for (let i = 0; i < count; i++) {
      this.currentStitch++;
      this.stitches.push({
        row: this.currentRow,
        stitch: this.currentStitch,
        type,
        modifier: this.currentModifier,
        intoChain: this.currentIntoChain,
      });
    }
    // Reset modifier after use (modifier applies to entire group)
    this.currentModifier = undefined;
    this.currentIntoChain = undefined;
  }
}

// Stitch count validation
function validateStitchCounts(stitches: ParsedStitch[]): RowValidation[] {
  const rowGroups: Record<number, ParsedStitch[]> = {};
  
  for (const stitch of stitches) {
    if (!rowGroups[stitch.row]) {
      rowGroups[stitch.row] = [];
    }
    rowGroups[stitch.row].push(stitch);
  }
  
  const validations: RowValidation[] = [];
  let prevCount = 0;
  
  for (const [rowNum, rowStitches] of Object.entries(rowGroups)) {
    const row = parseInt(rowNum);
    const count = rowStitches.length;
    
    // Count increases/decreases based on stitch types
    const increases = rowStitches.reduce((sum, s) => {
      const info = STITCH_DATABASE[s.type];
      if (!info) return sum;
      if (info.category === 'increase') {
        // inc = +1, inc3 = +2, inc4 = +3, inc5 = +4
        const addCount = s.type === 'inc' ? 1 : 
                         s.type === 'inc3' ? 2 : 
                         s.type === 'inc4' ? 3 : 
                         s.type === 'inc5' ? 4 : 1;
        return sum + addCount;
      }
      return sum;
    }, 0);
    
    const decreases = rowStitches.reduce((sum, s) => {
      const info = STITCH_DATABASE[s.type];
      if (!info) return sum;
      if (info.category === 'decrease') {
        // dec = -1, dec3 = -2, dc2tog = -1, dc3tog = -2, etc.
        const subCount = s.type === 'dec' ? 1 :
                         s.type === 'dec3' ? 2 :
                         s.type === 'sc2tog' || s.type === 'dc2tog' ? 1 :
                         s.type === 'dc3tog' ? 2 :
                         s.type === 'dc4tog' ? 3 :
                         s.type === 'dc5tog' ? 4 : 1;
        return sum + subCount;
      }
      return sum;
    }, 0);
    
    let isValid = true;
    let message: string | undefined;
    
    if (row === 1) {
      message = 'Starting row';
    } else if (prevCount > 0) {
      const diff = count - prevCount;
      const expectedDiff = increases - decreases;
      
      if (diff > 0) {
        message = `+${diff} (${increases} inc, ${decreases} dec)`;
      } else if (diff < 0) {
        message = `${diff} (${increases} inc, ${decreases} dec)`;
      } else {
        message = `= ${count} stitches`;
      }
      
      // Validate expected vs actual
      if (expectedDiff !== diff && (increases > 0 || decreases > 0)) {
        isValid = false;
        message = `Expected ${prevCount + expectedDiff}, got ${count}`;
      }
    }
    
    validations.push({
      row,
      stitchCount: count,
      expectedCount: row > 1 ? prevCount + increases - decreases : undefined,
      isValid,
      message,
    });
    
    prevCount = count;
  }
  
  return validations;
}

// Main parse function
export function parseCrochetPattern(input: string): ParseResult {
  const errors: string[] = [];
  
  try {
    const tokenLines = tokenize(input);
    const parser = new CrochetPatternParser();
    const stitches = parser.parse(tokenLines);
    const validations = validateStitchCounts(stitches);
    
    const totalRows = Math.max(0, ...stitches.map(s => s.row));
    
    return { 
      stitches, 
      validations, 
      errors,
      totalRows,
      totalStitches: stitches.length,
    };
  } catch (e) {
    errors.push(e instanceof Error ? e.message : 'Parse error');
    return { stitches: [], validations: [], errors, totalRows: 0, totalStitches: 0 };
  }
}

// Convert ParsedStitch to store format (backward compatible)
export function toStoreFormat(stitches: ParsedStitch[]): { row: number; stitch: number; type: CrochetStitchType }[] {
  return stitches.map(s => ({
    row: s.row,
    stitch: s.stitch,
    type: s.type,
  }));
}

// Get all unique stitch types used in a pattern
export function getUsedStitchTypes(stitches: ParsedStitch[]): CrochetStitchType[] {
  const types = new Set<CrochetStitchType>();
  stitches.forEach(s => types.add(s.type));
  return Array.from(types);
}
