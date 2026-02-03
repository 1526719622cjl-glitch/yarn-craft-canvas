import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CrochetStitch } from '@/store/useYarnCluesStore';

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

// Map AI output types to our stitch types
function mapToStitchType(type: string): CrochetStitch {
  const mapping: Record<string, CrochetStitch> = {
    'sc': 'sc',
    'x': 'sc',
    'inc': 'inc',
    'v': 'inc',
    'dec': 'dec',
    'a': 'dec',
    'hdc': 'hdc',
    't': 'hdc',
    'dc': 'dc',
    'f': 'dc',
    'tr': 'tr',
    'dtr': 'dtr',
    'chain': 'chain',
    'ch': 'chain',
    'slip': 'slip',
    'sl': 'slip',
    'blo': 'blo',
    'flo': 'flo',
    'popcorn': 'popcorn',
    'bobble': 'bobble',
    'puff': 'puff',
  };
  return mapping[type.toLowerCase()] || 'sc';
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
