import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = category === 'crochet'
      ? `You are a crochet pattern chart analyzer. Analyze the image of a crochet chart/pattern diagram.
Extract each row/round as a structured step. For each step, identify:
- row: the row or round number
- instruction: the written instruction using standard abbreviations (ch, sc, dc, hdc, tr, inc, dec, sl st, etc.)
- anchorRegion: approximate percentage coordinates {x, y, width, height} of where this row appears in the image
- colors: if this is a colorwork/Fair Isle pattern, extract color information as an array of {color: string, count: number} for each color segment in the row. Use hex colors if visible, or descriptive names like "MC" (main color), "CC1", "CC2", etc.

Use standard crochet terminology. If you see JIS symbols, translate them to English abbreviations.
Return ONLY a JSON object with a "steps" array. No markdown, no explanation.`
      : `You are a knitting pattern chart analyzer. Analyze the image of a knitting chart/pattern diagram.
Extract each row as a structured step. For each step, identify:
- row: the row number
- instruction: the written instruction using standard abbreviations (K, P, YO, K2tog, SSK, C4F, C4B, etc.)
- anchorRegion: approximate percentage coordinates {x, y, width, height} of where this row appears in the image
- colors: if this is a colorwork/Fair Isle pattern, extract color information as an array of {color: string, count: number} for each color segment in the row. Use hex colors if visible, or descriptive names like "MC" (main color), "CC1", "CC2", etc.

Use standard knitting terminology.
Return ONLY a JSON object with a "steps" array. No markdown, no explanation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this pattern chart image and extract structured steps. If it's a colorwork pattern with multiple colors, also extract the color sequence for each row." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_pattern_steps",
              description: "Extract structured pattern steps from a chart image, including colorwork information if present",
              parameters: {
                type: "object",
                properties: {
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        row: { type: "number" },
                        instruction: { type: "string" },
                        anchorRegion: {
                          type: "object",
                          properties: {
                            x: { type: "number" },
                            y: { type: "number" },
                            width: { type: "number" },
                            height: { type: "number" },
                          },
                          required: ["x", "y", "width", "height"],
                        },
                        colors: {
                          type: "array",
                          description: "Color segments for colorwork patterns. Each segment has a color (hex or name) and count of stitches.",
                          items: {
                            type: "object",
                            properties: {
                              color: { type: "string", description: "Hex color code like #FF5733 or color name like MC, CC1" },
                              count: { type: "number", description: "Number of stitches in this color" },
                            },
                            required: ["color", "count"],
                          },
                        },
                      },
                      required: ["row", "instruction"],
                    },
                  },
                },
                required: ["steps"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_pattern_steps" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let steps = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      steps = parsed.steps || [];
    }

    return new Response(JSON.stringify({ steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-chart-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
