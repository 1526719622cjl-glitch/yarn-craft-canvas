import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?.*)?$/i.test(url);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, category } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No file URL provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = category === 'crochet'
      ? `You are a crochet chart analyzer.
Extract rows/rounds from top-to-bottom in the chart into structured steps.
For each step, return:
- row: visible row/round number (number only)
- instruction: normalized crochet abbreviations (ch, sl st, sc, hdc, dc, tr, inc, dec, BLO, FLO, rep markers)
- anchorRegion: {x,y,width,height} percentages for the exact local region on source image
- colors: optional color segments [{color,count}] for colorwork rows

Rules:
- If chart is rounds, keep increasing sequence by round.
- If symbols are shown (JIS or chart symbols), translate to standard written abbreviations.
- Do not invent rows. Return only visible or inferable rows.
Return ONLY tool output JSON.`
      : `You are a knitting chart analyzer.
Extract Rows/Rounds from top-to-bottom in the chart into structured steps.
For each step, return:
- row: visible row/round number (number only)
- instruction: normalized knitting terms (K, P, YO, K2tog, SSK, C4F, C4B, etc.)
- anchorRegion: {x,y,width,height} percentages for the exact local region on source image
- colors: optional color segments [{color,count}] for colorwork rows

Rules:
- Preserve row order exactly as chart flow.
- Convert symbols into concise written terms.
- Do not invent rows. Return only visible or inferable rows.
Return ONLY tool output JSON.`;

    // Build user content based on file type
    const isPdf = isPdfUrl(imageUrl);
    let userContent: any[];

    if (isPdf) {
      // Download PDF and convert to base64 for Gemini inline_data
      console.log("Downloading PDF for inline processing...");
      const pdfResp = await fetch(imageUrl);
      if (!pdfResp.ok) throw new Error(`Failed to download PDF: ${pdfResp.status}`);
      const pdfBuffer = await pdfResp.arrayBuffer();
      const pdfBytes = new Uint8Array(pdfBuffer);

      // Convert to base64
      let binary = '';
      for (let i = 0; i < pdfBytes.length; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      const base64 = btoa(binary);

      userContent = [
        { type: "text", text: "Extract rows/rounds and stitch terms with accurate anchor regions from this pattern document." },
        {
          type: "image_url",
          image_url: {
            url: `data:application/pdf;base64,${base64}`,
          },
        },
      ];
    } else {
      userContent = [
        { type: "text", text: "Extract rows/rounds and stitch terms with accurate anchor regions." },
        { type: "image_url", image_url: { url: imageUrl } },
      ];
    }

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
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_pattern_steps",
              description: "Extract structured rows/rounds and local anchor areas from pattern chart image",
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
                          items: {
                            type: "object",
                            properties: {
                              color: { type: "string" },
                              count: { type: "number" },
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
      const body = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status, body);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    const content = result.choices?.[0]?.message?.content;

    let steps: any[] = [];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      steps = parsed.steps || [];
    } else if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        steps = parsed.steps || [];
      } catch {
        steps = [];
      }
    }

    const normalizedSteps = steps.map((step: any) => ({
      row: Number(step.row),
      instruction: String(step.instruction || '').trim(),
      anchorRegion: step.anchorRegion
        ? {
            x: Math.max(0, Math.min(100, Number(step.anchorRegion.x) || 0)),
            y: Math.max(0, Math.min(100, Number(step.anchorRegion.y) || 0)),
            width: Math.max(0, Math.min(100, Number(step.anchorRegion.width) || 0)),
            height: Math.max(0, Math.min(100, Number(step.anchorRegion.height) || 0)),
          }
        : undefined,
      colors: Array.isArray(step.colors)
        ? step.colors
            .map((c: any) => ({ color: String(c.color || ''), count: Number(c.count || 0) }))
            .filter((c: any) => c.color && c.count > 0)
        : undefined,
    })).filter((step: any) => step.row > 0 && step.instruction);

    return new Response(JSON.stringify({ steps: normalizedSteps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-chart-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
