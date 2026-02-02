import { CrochetStitch } from '@/store/useYarnCluesStore';

// Token types for lexer
type TokenType = 
  | 'STITCH' 
  | 'NUMBER' 
  | 'LPAREN' 
  | 'RPAREN' 
  | 'MULTIPLY' 
  | 'COMMA'
  | 'MODIFIER'
  | 'NEWLINE';

interface Token {
  type: TokenType;
  value: string;
}

// Stitch mapping
const STITCH_MAP: Record<string, CrochetStitch> = {
  'x': 'sc',
  'sc': 'sc',
  'v': 'inc',
  'inc': 'inc',
  'a': 'dec',
  'dec': 'dec',
  't': 'hdc',
  'hdc': 'hdc',
  'f': 'dc',
  'dc': 'dc',
  'e': 'tr',
  'tr': 'tr',
  'w': 'dtr',
  'dtr': 'dtr',
  'ch': 'chain',
  'c': 'chain',
  'sl': 'slip',
  's': 'slip',
  'm': 'magic',
  'mr': 'magic',
  'blo': 'blo',
  'flo': 'flo',
  'sp': 'spike',
  'spike': 'spike',
  'pop': 'popcorn',
  'popcorn': 'popcorn',
  'bob': 'bobble',
  'bobble': 'bobble',
  'puff': 'puff',
  'pf': 'puff',
};

// Parsed stitch with metadata
export interface ParsedStitch {
  row: number;
  stitch: number;
  type: CrochetStitch;
  modifier?: 'blo' | 'flo';
  intoChain?: number;
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
      
      // Parentheses
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
      
      // Multiply
      if (str[i] === '*') {
        tokens.push({ type: 'MULTIPLY', value: '*' });
        i++;
        continue;
      }
      
      // Comma
      if (str[i] === ',') {
        tokens.push({ type: 'COMMA', value: ',' });
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
      
      // Stitch or modifier (multi-character)
      if (/[a-z]/.test(str[i])) {
        let word = '';
        while (i < str.length && /[a-z]/.test(str[i])) {
          word += str[i++];
        }
        
        // Check for modifiers
        if (word === 'blo' || word === 'flo') {
          tokens.push({ type: 'MODIFIER', value: word });
        } else if (word === 'into' || word === 'in' || word === 'on') {
          // Skip connector words, the number follows
          continue;
        } else if (word === 'nd' || word === 'rd' || word === 'th' || word === 'st') {
          // Ordinal suffixes (2nd, 3rd, etc.) - skip
          continue;
        } else if (word === 'chain') {
          // "chain" as target reference - skip
          continue;
        } else if (STITCH_MAP[word]) {
          tokens.push({ type: 'STITCH', value: word });
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
  
  parse(tokenLines: Token[][]): ParsedStitch[] {
    this.stitches = [];
    this.currentRow = 0;
    
    for (const tokens of tokenLines) {
      this.tokens = tokens;
      this.pos = 0;
      this.currentRow++;
      this.currentStitch = 0;
      this.currentModifier = undefined;
      
      this.parseRow();
    }
    
    return this.stitches;
  }
  
  private peek(): Token | null {
    return this.tokens[this.pos] ?? null;
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
    
    // Check for modifier
    if (token.type === 'MODIFIER') {
      this.currentModifier = token.value as 'blo' | 'flo';
      this.consume();
      return;
    }
    
    // Number followed by stitch: "6x"
    if (token.type === 'NUMBER') {
      const count = parseInt(this.consume()!.value);
      const next = this.peek();
      
      if (next?.type === 'STITCH') {
        const stitchType = STITCH_MAP[this.consume()!.value] || 'sc';
        this.addStitches(stitchType, count);
      }
      return;
    }
    
    // Single stitch: "x" or "v"
    if (token.type === 'STITCH') {
      const stitchType = STITCH_MAP[this.consume()!.value] || 'sc';
      this.addStitches(stitchType, 1);
      return;
    }
    
    // Grouped repeat: "(2x, v)*6"
    if (token.type === 'LPAREN') {
      this.consume(); // consume '('
      const groupStitches = this.parseGroup();
      
      // Expect ')' and '*' and number
      if (this.peek()?.type === 'RPAREN') {
        this.consume();
      }
      
      let repeatCount = 1;
      if (this.peek()?.type === 'MULTIPLY') {
        this.consume();
        if (this.peek()?.type === 'NUMBER') {
          repeatCount = parseInt(this.consume()!.value);
        }
      }
      
      // Repeat the group
      for (let r = 0; r < repeatCount; r++) {
        for (const { type, count } of groupStitches) {
          this.addStitches(type, count);
        }
      }
      return;
    }
    
    // Skip unknown
    this.consume();
  }
  
  private parseGroup(): { type: CrochetStitch; count: number }[] {
    const items: { type: CrochetStitch; count: number }[] = [];
    
    while (this.peek() && this.peek()?.type !== 'RPAREN') {
      const token = this.peek();
      
      if (token?.type === 'COMMA') {
        this.consume();
        continue;
      }
      
      if (token?.type === 'NUMBER') {
        const count = parseInt(this.consume()!.value);
        const next = this.peek();
        if (next?.type === 'STITCH') {
          const stitchType = STITCH_MAP[this.consume()!.value] || 'sc';
          items.push({ type: stitchType, count });
        }
        continue;
      }
      
      if (token?.type === 'STITCH') {
        const stitchType = STITCH_MAP[this.consume()!.value] || 'sc';
        items.push({ type: stitchType, count: 1 });
        continue;
      }
      
      this.consume();
    }
    
    return items;
  }
  
  private addStitches(type: CrochetStitch, count: number): void {
    for (let i = 0; i < count; i++) {
      this.currentStitch++;
      this.stitches.push({
        row: this.currentRow,
        stitch: this.currentStitch,
        type,
        modifier: this.currentModifier,
      });
    }
    // Reset modifier after use
    this.currentModifier = undefined;
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
    
    // Count increases/decreases
    const incCount = rowStitches.filter(s => s.type === 'inc').length;
    const decCount = rowStitches.filter(s => s.type === 'dec').length;
    
    // For row 1, no expected count
    // For subsequent rows, expected = prev + inc - dec (simplified)
    let expectedCount: number | undefined;
    let isValid = true;
    let message: string | undefined;
    
    if (row > 1 && prevCount > 0) {
      // Simple validation: each inc adds 1, each dec removes 1
      expectedCount = prevCount + incCount - decCount;
      
      // Count non-inc/dec stitches
      const regularStitches = count - incCount - decCount;
      const effectiveCount = regularStitches + (incCount * 2) - decCount;
      
      // Very simple check - just show count
      if (row === 1) {
        message = 'Starting row';
      } else {
        const diff = count - prevCount;
        if (diff > 0) {
          message = `+${diff} stitches`;
        } else if (diff < 0) {
          message = `${diff} stitches`;
        } else {
          message = 'Same count';
        }
      }
    }
    
    validations.push({
      row,
      stitchCount: count,
      expectedCount,
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
    
    return { stitches, validations, errors };
  } catch (e) {
    errors.push(e instanceof Error ? e.message : 'Parse error');
    return { stitches: [], validations: [], errors };
  }
}

// Convert ParsedStitch to store format
export function toStoreFormat(stitches: ParsedStitch[]): { row: number; stitch: number; type: CrochetStitch }[] {
  return stitches.map(s => ({
    row: s.row,
    stitch: s.stitch,
    type: s.type,
  }));
}
