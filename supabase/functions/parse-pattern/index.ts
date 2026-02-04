import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// System prompt for crochet pattern parsing - Enhanced with comprehensive JIS stitch library
const SYSTEM_PROMPT = `You are a crochet pattern parser. Convert natural language crochet patterns into structured JSON.

## Input Examples:
- "6x" = 6 single crochet
- "(2x, v)*6" = repeat (2 SC, 1 increase) 6 times
- "BLO 5x" = 5 SC in back loop only
- "on 2nd chain, 6x" = 6 SC starting in 2nd chain
- "W" = 3-stitch increase (fan)
- "M" = 3-stitch decrease
- "5dc in same st" = 5 DC increase (shell)
- "dc2tog" = double crochet 2 together

## Comprehensive JIS Stitch Codes:

### Basic Stitches:
- x/sc = single crochet (細編み)
- t/hdc = half double crochet (中長編み)
- f/dc = double crochet (長編み)
- e/tr = treble crochet (長々編み)
- dtr = double treble (三つ巻き長編み)
- trtr = triple treble
- ch = chain (鎖編み)
- sl/slst = slip stitch (引き抜き編み)

### Increase Stitches:
- v/inc = increase, 2 stitches in 1 (増し目)
- w/inc3 = 3-stitch increase (3目増し目)
- inc4 = 4-stitch increase
- inc5 = 5-stitch increase (fan)

### Decrease Stitches:
- a/dec = decrease, 2 together (減らし目)
- m/dec3 = 3-stitch decrease (3目減らし目)
- sc2tog = SC 2 together
- dc2tog = DC 2 together
- dc3tog = DC 3 together
- dc4tog = DC 4 together
- dc5tog = DC 5 together

### Loop Variations:
- blo = back loop only (後ろ半目)
- flo = front loop only (前半目)
- fpdc = front post DC (前側長編み)
- bpdc = back post DC (後ろ側長編み)
- fpsc = front post SC
- bpsc = back post SC
- fptr = front post TR
- bptr = back post TR

### Texture Stitches:
- pop/popcorn/pc = popcorn stitch
- bob/bobble = bobble stitch
- puff/pf = puff stitch
- cl/cluster = cluster stitch
- sh/shell = shell stitch
- pic/picot = picot
- spike/sp = spike stitch
- bullion = bullion stitch

### Special Stitches:
- mr/magic = magic ring (輪の作り目)
- sk/skip = skip stitch
- join = join
- vst = v-stitch (DC, ch, DC)
- gr/granny = granny cluster

## Output Format (JSON):
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

Always return valid JSON. Handle bracket notation for repeats. Use the exact stitch type codes listed above.`;

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
