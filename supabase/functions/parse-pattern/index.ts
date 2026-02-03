import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// System prompt for crochet pattern parsing
const SYSTEM_PROMPT = `You are a crochet pattern parser. Convert natural language crochet patterns into structured JSON.

Input examples:
- "6x" = 6 single crochet
- "(2x, v)*6" = repeat (2 SC, 1 increase) 6 times
- "BLO 5x" = 5 SC in back loop only
- "on 2nd chain, 6x" = 6 SC starting in 2nd chain
- "W" = 3-stitch increase (fan)
- "M" = 3-stitch decrease

Stitch codes:
- x/sc = single crochet
- v/inc = increase (2 stitches in 1)
- a/dec = decrease
- t/hdc = half double crochet
- f/dc = double crochet
- tr = treble crochet
- w = 3-stitch increase
- m = 3-stitch decrease
- ch = chain
- sl = slip stitch
- blo = back loop only modifier
- flo = front loop only modifier

Output format (JSON array per row):
{
  "rows": [
    {
      "row": 1,
      "stitches": [
        {"type": "sc", "count": 6}
      ]
    },
    {
      "row": 2,
      "stitches": [
        {"type": "sc", "count": 2},
        {"type": "inc", "count": 1}
      ],
      "repeat": 6
    }
  ]
}

Always return valid JSON. Handle bracket notation for repeats.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pattern } = await req.json();
    
    if (!pattern || typeof pattern !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Pattern text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Parsing pattern:', pattern);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Parse this crochet pattern into JSON:\n\n${pattern}` },
        ],
        temperature: 0.1, // Low temperature for consistent parsing
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```json?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Parse and validate
    const parsed = JSON.parse(jsonStr);
    
    console.log('Parsed result:', JSON.stringify(parsed));

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Parse pattern error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
