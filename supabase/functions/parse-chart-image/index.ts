import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const stitchTerms = category === 'crochet'
      ? 'ch, sl st, sc, hdc, dc, tr, inc, dec, BLO, FLO, rep markers'
      : 'K, P, YO, K2tog, SSK, C4F, C4B, etc.';

    const systemPrompt = `You are a ${category} pattern/chart analyzer.
Scan the entire document thoroughly. Identify ALL text and chart symbols.
Extract rows/rounds from top-to-bottom into structured steps.

For each step, return:
- row: visible row/round number (number only)
- originalInstruction: the EXACT original text/abbreviation as it appears in the document (preserve original language)
- translatedInstruction: Chinese translation of the instruction (标准中文编织术语)
- anchorRegion: {x,y,width,height} percentages for the region on source image
- colors: optional [{color,count}] for colorwork rows

Rules:
- Keep the original language exactly as shown in the document for originalInstruction
- Translate ALL instructions to Chinese for translatedInstruction using standard ${category === 'crochet' ? '钩针' : '棒针'} terminology
- Use standard abbreviations: ${stitchTerms}
- Do not invent rows. Return only visible or inferable rows.
Return ONLY tool output JSON.`;

    // Gemini only accepts image URLs (PNG/JPEG/WebP/GIF). PDFs must be base64 data URLs.
    let filePayload: { type: string; image_url: { url: string } };
    const isPdf = imageUrl.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const pdfResp = await fetch(imageUrl);
      if (!pdfResp.ok) throw new Error(`Failed to fetch PDF: ${pdfResp.status}`);
      const pdfBuffer = await pdfResp.arrayBuffer();
      // Edge functions have ~150MB limit; reject very large files early
      if (pdfBuffer.byteLength > 20 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "PDF too large (max 20MB)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
      filePayload = { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } };
    } else {
      filePayload = { type: "image_url", image_url: { url: imageUrl } };
    }

    const userContent = [
      { type: "text", text: "Scan the entire document. Extract all rows/rounds with original text and Chinese translation. Include anchor regions." },
      filePayload,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_pattern_steps",
              description: "Extract structured rows/rounds from pattern chart",
              parameters: {
                type: "object",
                properties: {
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        row: { type: "number" },
                        originalInstruction: { type: "string", description: "Original text exactly as shown in the document" },
                        translatedInstruction: { type: "string", description: "Chinese translation of the instruction" },
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
                      required: ["row", "originalInstruction", "translatedInstruction"],
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    const clamp = (v: number) => Math.max(0, Math.min(100, Number(v) || 0));

    const normalizedSteps = steps.map((step: any) => ({
      row: Number(step.row),
      instruction: String(step.originalInstruction || step.instruction || '').trim(),
      translatedInstruction: String(step.translatedInstruction || '').trim(),
      anchorRegion: step.anchorRegion
        ? { x: clamp(step.anchorRegion.x), y: clamp(step.anchorRegion.y), width: clamp(step.anchorRegion.width), height: clamp(step.anchorRegion.height) }
        : undefined,
      colors: Array.isArray(step.colors)
        ? step.colors.map((c: any) => ({ color: String(c.color || ''), count: Number(c.count || 0) })).filter((c: any) => c.color && c.count > 0)
        : undefined,
    })).filter((step: any) => step.row > 0 && step.instruction);

    return new Response(JSON.stringify({ steps: normalizedSteps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-chart-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
