import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CrochetStitch } from '@/store/useYarnCluesStore';
import { CrochetStitchType, STITCH_DATABASE } from '@/lib/crochetStitchTypes';

interface ParsedRow {
  row: number;
  stitches: { type: string; count: number }[];
  repeat?: number;
}

interface AIParseResult {
  rows: ParsedRow[];
}

interface ParsedStitchOutput {
  row: number;
  stitch: number;
  type: CrochetStitch;
}

// Map AI output types to our stitch types (comprehensive mapping)
function mapToStitchType(type: string): CrochetStitch {
  const normalized = type.toLowerCase().trim();
  
  // Check if it's a valid stitch type in our database
  if (normalized in STITCH_DATABASE) {
    return normalized as CrochetStitchType;
  }
  
  // Fallback mapping for common variations
  const mapping: Record<string, CrochetStitchType> = {
    'sc': 'sc',
    'x': 'sc',
    'single': 'sc',
    'inc': 'inc',
    'v': 'inc',
    'increase': 'inc',
    'dec': 'dec',
    'a': 'dec',
    'decrease': 'dec',
    'hdc': 'hdc',
    't': 'hdc',
    'halfdouble': 'hdc',
    'dc': 'dc',
    'f': 'dc',
    'double': 'dc',
    'tr': 'tr',
    'treble': 'tr',
    'dtr': 'dtr',
    'trtr': 'trtr',
    'chain': 'chain',
    'ch': 'chain',
    'slip': 'slip',
    'sl': 'slip',
    'slst': 'slip',
    'blo': 'blo',
    'flo': 'flo',
    'popcorn': 'popcorn',
    'pop': 'popcorn',
    'pc': 'popcorn',
    'bobble': 'bobble',
    'bob': 'bobble',
    'puff': 'puff',
    'pf': 'puff',
    'cluster': 'cluster',
    'cl': 'cluster',
    'shell': 'shell',
    'sh': 'shell',
    'picot': 'picot',
    'pic': 'picot',
    'spike': 'spike',
    'sp': 'spike',
    'magic': 'magic',
    'mr': 'magic',
    'ring': 'magic',
    'fpdc': 'fpdc',
    'bpdc': 'bpdc',
    'fpsc': 'fpsc',
    'bpsc': 'bpsc',
    'fptr': 'fptr',
    'bptr': 'bptr',
    'inc3': 'inc3',
    'w': 'inc3',
    'dec3': 'dec3',
    'm': 'dec3',
    'sc2tog': 'sc2tog',
    'dc2tog': 'dc2tog',
    'dc3tog': 'dc3tog',
    'dc4tog': 'dc4tog',
    'dc5tog': 'dc5tog',
    'vst': 'vst',
    'vstitch': 'vst',
    'granny': 'granny',
    'gr': 'granny',
  };
  
  return mapping[normalized] || 'sc';
}

// Convert AI result to flat stitch array
function expandAIResult(result: AIParseResult): ParsedStitchOutput[] {
  const stitches: ParsedStitchOutput[] = [];
  
  for (const row of result.rows) {
    let stitchNum = 0;
    const repeatCount = row.repeat || 1;
    
    for (let r = 0; r < repeatCount; r++) {
      for (const stitchDef of row.stitches) {
        const type = mapToStitchType(stitchDef.type);
        for (let i = 0; i < stitchDef.count; i++) {
          stitchNum++;
          stitches.push({
            row: row.row,
            stitch: stitchNum,
            type,
          });
        }
      }
    }
  }
  
  return stitches;
}

export function useAIPatternParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastParsed, setLastParsed] = useState<string>('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const parsePattern = useCallback(async (pattern: string): Promise<ParsedStitchOutput[]> => {
    if (!pattern.trim()) {
      return [];
    }

    // Don't re-parse same pattern
    if (pattern === lastParsed) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('parse-pattern', {
        body: { pattern },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to parse pattern');
      }

      setLastParsed(pattern);
      return expandAIResult(data.data);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(message);
      console.error('AI Pattern Parse Error:', e);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [lastParsed]);

  // Debounced version for real-time updates
  const parsePatternDebounced = useCallback((pattern: string, onResult: (stitches: ParsedStitchOutput[]) => void) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const result = await parsePattern(pattern);
      onResult(result);
    }, 800); // 800ms debounce for typing
  }, [parsePattern]);

  return {
    parsePattern,
    parsePatternDebounced,
    isLoading,
    error,
  };
}
