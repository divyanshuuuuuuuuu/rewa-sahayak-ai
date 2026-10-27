// ============================================================================
// Rewa Sahayak AI — Audio Transcription Service
// Secure voice-to-text pipeline supporting Hindi, English, and Bagheli dialect terms
// Server-side Gemini via Supabase Edge Function with resilient browser fallback
// ============================================================================

import { supabase } from './supabase';

export interface TranscriptionResult {
  text: string;
  source: 'gemini-server' | 'web-speech' | 'dialect-assisted' | 'empty';
  language: 'hi' | 'en' | 'bagheli';
  warning?: string;
  error?: string;
}

// Common Bagheli (बघेली) dialect phrases spoken in Rewa district & their standard Hindi equivalents
// Note: Bagheli transcription requires citizen verification before submission.
export const BAGHELI_DIALECT_DICTIONARY: Record<string, string> = {
  'हमरे वार्ड मा': 'हमारे वार्ड में',
  'नाली जाम हव': 'नाली जाम है',
  'पानी बह रहा बा': 'सड़क पर गंदा पानी बह रहा है',
  'पानी बहत हव': 'सड़क पर पानी बह रहा है',
  'कचरा फिका हव': 'कचरा फैला हुआ है',
  'कचरा फेका हव': 'कचरा फेंका हुआ है',
  'पाइप फूटा हव': 'पानी का पाइप फूटा हुआ है',
  'पाइप टूट गवा': 'पानी की पाइपलाइन टूट गई है',
  'खम्भा मा बत्ती नाहि जलत': 'स्ट्रीट लाइट नहीं जल रही है',
  'खम्भे मा लाइट नाहि जल रही': 'बिजली के खंभे पर लाइट बंद है',
  'सड़क मा बहुत गड्ढा अहई': 'सड़क पर गहरे गड्ढे हैं',
  'सड़क मा गड्ढा बा': 'सड़क पर गड्ढा है',
  'हैण्डपम्प बिगड़ा बा': 'हैंडपंप खराब है',
  'हैण्डपम्प खराब हव': 'हैंडपंप से पानी नहीं आ रहा है',
  'सफाई नाहि होत': 'सफाई नहीं हो रही है',
  'दुर्गंध आवत हव': 'बहुत बदबू आ रही है',
  'बदबू आवत बा': 'तीव्र दुर्गंध आ रही है',
};

/**
 * Normalizes Bagheli colloquial phrases into clean civic grievance text
 */
export function normalizeBagheliText(input: string): string {
  let normalized = input.trim();
  for (const [colloquial, standard] of Object.entries(BAGHELI_DIALECT_DICTIONARY)) {
    if (normalized.includes(colloquial)) {
      normalized = normalized.replace(new RegExp(colloquial, 'g'), standard);
    }
  }
  return normalized;
}

/**
 * Transcribes audio blob using server-side Gemini Edge Function if available,
 * falling back gracefully to live speech buffer or dialect assistant.
 */
export async function transcribeAudioBlob(
  audioBlob: Blob,
  capturedSpeechText: string = '',
  preferredLang: 'hi' | 'en' = 'hi'
): Promise<TranscriptionResult> {
  // 1. Validate audio inputs
  if (!audioBlob || audioBlob.size === 0) {
    if (capturedSpeechText.trim()) {
      const normalized = normalizeBagheliText(capturedSpeechText);
      return {
        text: normalized,
        source: 'web-speech',
        language: preferredLang,
      };
    }
    return {
      text: '',
      source: 'empty',
      language: preferredLang,
      error: 'ऑडियो रिकॉर्डिंग खाली है (Audio recording is empty).',
    };
  }

  // 15MB maximum size validation
  if (audioBlob.size > 15 * 1024 * 1024) {
    return {
      text: capturedSpeechText.trim() || '',
      source: capturedSpeechText ? 'web-speech' : 'empty',
      language: preferredLang,
      error: 'ऑडियो फाइल 15MB से अधिक है (Audio file exceeds 15MB limit).',
    };
  }

  // 2. Try Server-Side Supabase Edge Function (Gemini Multimodal Transcription)
  try {
    const formData = new FormData();
    const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
    formData.append('file', audioBlob, `speech-${Date.now()}.${ext}`);
    formData.append('language', preferredLang);

    // Call Supabase Edge Function securely without exposing API keys to browser
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: formData,
    });

    if (!error && data && data.text && data.text.trim()) {
      const cleaned = normalizeBagheliText(data.text);
      return {
        text: cleaned,
        source: 'gemini-server',
        language: data.detected_language || preferredLang,
      };
    }
  } catch (err) {
    // Edge function not yet deployed or server secret not set — fallback gracefully
    console.info('Server transcription unavailable, using client speech buffer:', err);
  }

  // 3. Resilient Fallback: Use speech recognition buffer if captured during recording
  if (capturedSpeechText && capturedSpeechText.trim().length > 0) {
    const normalized = normalizeBagheliText(capturedSpeechText);
    return {
      text: normalized,
      source: 'web-speech',
      language: preferredLang,
      warning:
        preferredLang === 'hi'
          ? 'रीवा/बघेली स्थानीय शब्दों के लिए कृपया नीचे लिखित विवरण की समीक्षा कर लें।'
          : 'Please review and edit the transcribed grievance text below.',
    };
  }

  // 4. If neither server nor client speech API generated words, signal error so user can type or retry
  return {
    text: '',
    source: 'empty',
    language: preferredLang,
    error:
      preferredLang === 'hi'
        ? 'ध्वनि स्पष्ट रूप से पहचानी नहीं जा सकी। कृपया शांत स्थान पर पुनः बोलें अथवा नीचे विवरण टाइप करें।'
        : 'Could not clearly recognize voice audio. Please retry in a quiet place or type your grievance below.',
  };
}
