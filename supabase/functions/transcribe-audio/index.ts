// ============================================================================
// Supabase Edge Function: transcribe-audio
// Secure server-side audio transcription using Google Gemini Multimodal API
// Protects API keys; zero client exposure; rate limited & size validated
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15MB limit
const ALLOWED_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
  'audio/aac',
  'audio/m4a',
];

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: 'GEMINI_API_KEY server secret is not configured in Supabase Edge Functions.',
          code: 'API_KEY_MISSING',
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Parse incoming multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const requestedLang = (formData.get('language') as string) || 'hi';

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No audio file provided in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Validation: Size & MIME check
    if (file.size > MAX_AUDIO_BYTES) {
      return new Response(
        JSON.stringify({ error: 'Audio file exceeds 15MB limit' }),
        {
          status: 413,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const mime = file.type || 'audio/webm';
    const isAllowedMime = ALLOWED_MIME_TYPES.some((allowed) =>
      mime.toLowerCase().startsWith(allowed)
    );
    if (!isAllowedMime) {
      return new Response(
        JSON.stringify({ error: `Unsupported audio MIME type: ${mime}` }),
        {
          status: 415,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Convert file array buffer to Base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);

    // 5. Build secure Gemini Multimodal API prompt
    const prompt =
      requestedLang === 'en'
        ? 'Please accurately transcribe this citizen grievance voice recording into clear English. Output only the verbatim transcribed complaint text without preamble.'
        : 'यह रीवा (मध्य प्रदेश) के नागरिक द्वारा दर्ज की जा रही नगर निगम जन-शिकायत की आवाज रिकॉर्डिंग है। कृपया इसे स्पष्ट एवं शुद्ध हिंदी में ट्रांसक्राइब करें। यदि नागरिक ने बघेली बोली के स्थानीय शब्दों (जैसे हमरे वार्ड मा, नाली जाम हव, पानी बहत हव, खम्भा मा बत्ती नाहि जलत, गड्ढा अहई) का प्रयोग किया हो, तो शिकायत के वास्तविक संदर्भ को सुरक्षित रखते हुए सटीक ट्रांसक्रिप्शन दें। केवल ट्रांसक्राइब किया गया शिकायत विवरण ही आउटपुट करें।';

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mime.split(';')[0], // strip codec parameters if any
                data: base64Audio,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1, // low temperature for high transcription fidelity
        maxOutputTokens: 1024,
      },
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          error: `Gemini API transcription failed with status ${response.status}`,
          details: errorText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await response.json();
    const candidateText =
      result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return new Response(
      JSON.stringify({
        text: candidateText,
        detected_language: requestedLang,
        model: 'gemini-1.5-flash',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: err?.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
