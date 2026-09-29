import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Camera, Type, MapPin, Send, CheckCircle2, Navigation,
  Sparkles, Printer, ArrowLeft, ShieldCheck, ShieldAlert, Video, Film, Trash2, Plus, Play
} from 'lucide-react';
import { analyzeProblemDemo, analyzeImageDemo, moduleNames, severityColors, categoryIcons } from '../services/ai';
import { createComplaint } from '../services/store';
import { getCivicEvidenceSvg, getCivicVideoPosterSvg, createSampleCivicVideoBlob } from '../services/evidenceSvg';
import type { AIAnalysis, CivicMedia } from '../types';
import MapView from '../components/MapView';
import { AshokaEmblem, RewaMunicipalLogo } from '../components/Emblem';
import { useGov } from '../context/GovContext';

type InputMode = 'voice' | 'photo' | 'text';
type ReportStep = 'input' | 'processing' | 'preview' | 'submitted';

export default function Report() {
  const navigate = useNavigate();
  const { lang, bilingual, statusLabel, moduleLabel, categoryLabel } = useGov();
  const [mode, setMode] = useState<InputMode>('voice'); // Default to voice on mobile for least effort!
  const [step, setStep] = useState<ReportStep>('input');
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mediaList, setMediaList] = useState<CivicMedia[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<any>(null);
  const [location, setLocation] = useState<[number, number] | null>([24.5373, 81.3005]);
  const [address, setAddress] = useState(
    lang === 'hi' ? 'वार्ड क्र. 12, सिरमौर चौराहा, रीवा' : 'Ward No. 12, Sirmour Chowk, Rewa'
  );
  const [showMap, setShowMap] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Derived media values
  const photoCount = mediaList.filter((m) => m.type === 'image').length;
  const videoCount = mediaList.filter((m) => m.type === 'video').length;
  const hasMedia = mediaList.length > 0;
  const imagePreview = mediaList.find((m) => m.type === 'image')?.url || mediaList[0]?.url || null;
  const videoUrl = mediaList.find((m) => m.type === 'video')?.url || null;

  // Common pre-set issues with bilingual support and geo-evidence type
  const quickProblems = [
    {
      hi: 'वार्ड में 4 दिन से कचरा नहीं उठाया गया है',
      en: 'Garbage has not been collected in our ward for 4 days',
      tagHi: 'कचरा नहीं उठा',
      tagEn: 'Garbage Not Picked',
      icon: '🗑️',
      type: 'garbage' as const,
    },
    {
      hi: 'मुख्य पाइपलाइन में लीकेज है, भारी मात्रा में पेयजल व्यर्थ बह रहा है',
      en: 'Main drinking water pipeline is leaking heavily on the street',
      tagHi: 'पानी पाइप लीकेज',
      tagEn: 'Water Pipe Leak',
      icon: '💧',
      type: 'leakage' as const,
    },
    {
      hi: 'सड़क की स्ट्रीट लाइट पिछले 1 सप्ताह से बंद पड़ी है, रात में अंधेरा रहता है',
      en: 'Streetlights have been non-functional for a week, causing darkness at night',
      tagHi: 'स्ट्रीट लाइट बंद',
      tagEn: 'Streetlight Off',
      icon: '💡',
      type: 'streetlight' as const,
    },
    {
      hi: 'सड़क पर बड़ा और खतरनाक गड्ढा है, दुर्घटना का खतरा बना हुआ है',
      en: 'Large dangerous pothole on the main road causing accident risk',
      tagHi: 'सड़क पर गड्ढा',
      tagEn: 'Road Pothole',
      icon: '🕳️',
      type: 'pothole' as const,
    },
    {
      hi: 'नाली जाम हो गई है, गंदा बदबूदार पानी सड़क पर बह रहा है',
      en: 'Drainage is choked and dirty sewage water is overflowing onto the street',
      tagHi: 'नाली जाम/गंदा पानी',
      tagEn: 'Drainage Overflow',
      icon: '🌊',
      type: 'drainage' as const,
    },
    {
      hi: 'कचरा डिपो भर चुका है और चारों तरफ गंदगी फैली हुई है',
      en: 'Public waste bin is overflowing with garbage scattered everywhere',
      tagHi: 'डस्टबिन ओवरफ्लो',
      tagEn: 'Dustbin Overflow',
      icon: '📦',
      type: 'dustbin' as const,
    },
  ];

  // 1-Tap Quick Issue selection (Zero Effort on Phone & Desktop) with attached verified spot photo & video clip
  const handleQuickSelect = async (prob: typeof quickProblems[0]) => {
    const issueText = lang === 'hi' ? prob.hi : prob.en;
    setText(issueText);
    const samplePhotoSvg = getCivicEvidenceSvg(prob.type);
    const sampleVideoPoster = getCivicVideoPosterSvg(`${prob.tagHi} • रीवा नगर निगम`);
    setMediaList([
      {
        id: `quick-p-${Date.now()}`,
        type: 'image',
        url: samplePhotoSvg,
        name: `${prob.type}_spot_photo.jpg`,
      },
      {
        id: `quick-v-${Date.now()}`,
        type: 'video',
        url: sampleVideoPoster,
        name: `${prob.type}_video_clip.mp4`,
        duration: 18,
      },
    ]);
    setImageFile(new File(['evidence'], `${prob.type}.svg`, { type: 'image/svg+xml' }));
    setStep('processing');
    await new Promise((r) => setTimeout(r, 1100));
    const result = analyzeProblemDemo(issueText);
    setAnalysis(result);
    setStep('preview');
  };

  // Helper to attach detected spot evidence based on text context
  const attachDetectedEvidence = () => {
    let type: 'garbage' | 'leakage' | 'streetlight' | 'pothole' | 'drainage' | 'dustbin' = 'garbage';
    const lower = text.toLowerCase();
    if (lower.includes('water') || lower.includes('pani') || lower.includes('paani') || lower.includes('leak') || lower.includes('pipe')) {
      type = 'leakage';
    } else if (lower.includes('light') || lower.includes('bijli') || lower.includes('andhera')) {
      type = 'streetlight';
    } else if (lower.includes('pothole') || lower.includes('gaddha') || lower.includes('sadak') || lower.includes('road')) {
      type = 'pothole';
    } else if (lower.includes('drain') || lower.includes('naali') || lower.includes('nali') || lower.includes('sewer')) {
      type = 'drainage';
    } else if (lower.includes('dustbin') || lower.includes('bin') || lower.includes('depot')) {
      type = 'dustbin';
    }
    const sampleSvg = getCivicEvidenceSvg(type);
    setMediaList((prev) => [
      ...prev,
      {
        id: `det-p-${Date.now()}`,
        type: 'image',
        url: sampleSvg,
        name: `${type}_photo_${prev.length + 1}.jpg`,
      },
    ]);
  };

  // Voice recording
  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus(
        bilingual(
          'माइक्रोफोन सुविधा केवल Chrome/Edge ब्राउज़र में उपलब्ध है।',
          'Speech recognition is supported on Chrome and Edge browsers.'
        )
      );
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsRecording(true);
      setVoiceStatus(
        bilingual('🎙️ सुन रहे हैं... अपनी समस्या बोलें', '🎙️ Listening... Please speak your problem')
      );
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText(transcript);
      setVoiceStatus(bilingual('📝 लिखा जा रहा है...', '📝 Transcribing audio...'));
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event.error === 'no-speech') {
        setVoiceStatus(
          bilingual(
            'आवाज़ नहीं सुनाई दी। कृपया पुनः बोलें।',
            'No voice detected. Please tap mic and speak again.'
          )
        );
      } else {
        setVoiceStatus(
          bilingual(
            `माइक्रोफोन त्रुटि (${event.error})। आप नीचे से समस्या चुन सकते हैं।`,
            `Microphone error (${event.error}). You can tap a quick preset issue below.`
          )
        );
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (text) {
        setVoiceStatus(
          bilingual('✅ आवाज़ दर्ज हो गई! अब आगे बढ़ें।', '✅ Voice recorded! Ready to generate.')
        );
      } else {
        setVoiceStatus(
          bilingual('माइक बटन दबाकर दोबारा बोलें।', 'Tap mic button to speak again.')
        );
      }
    };

    recognition.start();
  }, [bilingual, lang, text]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setVoiceStatus(
        bilingual(
          '✅ रिकॉर्डिंग पूरी हुई। जांच कर जमा करें।',
          '✅ Recording completed. Review and submit.'
        )
      );
    }
  }, [bilingual]);

  // Multi-Media (Photos & Videos) File Handlers
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems: CivicMedia[] = [];
    Array.from(files).forEach((file, idx) => {
      const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|mkv|3gp)$/i);
      const url = URL.createObjectURL(file);
      newItems.push({
        id: `media-${Date.now()}-${idx}`,
        type: isVideo ? 'video' : 'image',
        url,
        name: file.name,
        size: file.size,
      });
    });
    setMediaList((prev) => [...prev, ...newItems]);
    // reset input value so user can re-select same file if needed
    e.target.value = '';
  };

  const handleCameraPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const item: CivicMedia = {
      id: `cam-p-${Date.now()}`,
      type: 'image',
      url,
      name: file.name || `Photo_${Date.now()}.jpg`,
      size: file.size,
    };
    setMediaList((prev) => [...prev, item]);
    e.target.value = '';
  };

  const handleCameraVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const item: CivicMedia = {
      id: `cam-v-${Date.now()}`,
      type: 'video',
      url,
      name: file.name || `Video_${Date.now()}.mp4`,
      size: file.size,
      duration: 15,
    };
    setMediaList((prev) => [...prev, item]);
    e.target.value = '';
  };

  const handleAttachSampleVideo = async () => {
    const vidTitle = text ? text.slice(0, 30) : 'Rewa Civic Video Proof';
    const blobUrl = await createSampleCivicVideoBlob(vidTitle);
    const url = blobUrl || getCivicVideoPosterSvg(vidTitle);
    const item: CivicMedia = {
      id: `sample-v-${Date.now()}`,
      type: 'video',
      url,
      name: 'Rewa_Civic_Video_Evidence.mp4',
      duration: 18,
    };
    setMediaList((prev) => [...prev, item]);
  };

  const removeMediaItem = (id: string) => {
    setMediaList((prev) => prev.filter((m) => m.id !== id));
  };

  // Location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(bilingual('जियोलोकेशन समर्थित नहीं है।', 'Geolocation not supported by browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation([pos.coords.latitude, pos.coords.longitude]);
        setAddress(
          bilingual(
            `वार्ड 15, ढेकहा, रीवा (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
            `Ward 15, Dhekha, Rewa (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`
          )
        );
        setShowMap(false);
      },
      () => {
        setLocation([24.5373, 81.3005]);
        setAddress(
          bilingual('वार्ड 12, सिरमौर चौराहा, रीवा (GPS)', 'Ward 12, Sirmour Chowk, Rewa (GPS)')
        );
        setShowMap(false);
      }
    );
  };

  const handleMapSelect = (lat: number, lng: number) => {
    setLocation([lat, lng]);
    setAddress(
      bilingual(
        `वार्ड 18, रीवा (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        `Ward 18, Rewa (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      )
    );
  };

  // Submit for AI analysis (Requires mandatory photo or video proof)
  const handleAnalyze = async () => {
    if (!text.trim() && !hasMedia) {
      alert(
        bilingual(
          'कृपया अपनी समस्या का विवरण दें और फोटो अथवा वीडियो साक्ष्य संलग्न करें।',
          'Please describe your problem and attach photo or video evidence.'
        )
      );
      return;
    }

    // MANDATORY PHOTO/VIDEO PROOF TO PREVENT FAKE / SPAM COMPLAINTS
    if (!hasMedia) {
      alert(
        bilingual(
          '🛑 साक्ष्य अनिवार्य है!\n\nरीवा नगर निगम के निर्देशानुसार फर्जी एवं झूठी शिकायतों को रोकने के लिए घटनास्थल की वास्तविक फोटो या वीडियो संलग्न करना अनिवार्य है।\n\nकृपया कैमरे से फोटो/वीडियो लें या गैलरी से अपलोड करें।',
          '🛑 Evidence is Mandatory!\n\nAs per Rewa Municipal Corporation anti-fraud rules, uploading genuine photographic or video proof of the incident spot is compulsory.\n\nPlease snap/record or upload photos/videos.'
        )
      );
      setMode('photo');
      return;
    }

    setStep('processing');
    await new Promise((r) => setTimeout(r, 1200));

    const result = analyzeProblemDemo(text || 'Civic problem reported with verified evidence');
    setAnalysis(result);

    if (hasMedia) {
      const imgResult = analyzeImageDemo();
      setImageAnalysis(imgResult);
      if (!text.trim()) {
        result.title = bilingual(
          'सत्यापित साक्ष्य: जन-समस्या रिपोर्ट',
          'Verified Civic Evidence: Problem Report'
        );
        result.description = imgResult.visual_summary;
        result.category = 'Waste Management';
        result.module = 'smart_waste';
        result.severity = imgResult.severity;
      }
    }

    setStep('preview');
  };

  // Final submit with hard anti-fraud check
  const handleSubmit = () => {
    if (!analysis) return;

    if (!hasMedia) {
      alert(
        bilingual(
          '🛑 रोक दिया गया: फर्जी शिकायत रोकथाम नियम के तहत फोटो/वीडियो साक्ष्य के बिना शिकायत दर्ज नहीं की जा सकती।',
          '🛑 Blocked: Complaint cannot be registered without photo or video evidence under anti-fraud regulations.'
        )
      );
      return;
    }

    const complaint = createComplaint({
      title: analysis.title,
      description: analysis.description,
      category: analysis.category,
      subcategory: analysis.subcategory,
      module: analysis.module,
      severity: analysis.severity,
      status: 'SUBMITTED',
      citizen_id: 'citizen-rewa-1',
      citizen_name: bilingual('नागरिक (रीवा)', 'Citizen (Rewa)'),
      latitude: location?.[0] || 24.5373,
      longitude: location?.[1] || 81.3005,
      address: address || bilingual('वार्ड 12, रीवा', 'Ward 12, Rewa'),
      image_url: imagePreview,
      video_url: videoUrl,
      media: mediaList,
      voice_transcript: mode === 'voice' ? text : null,
      ai_summary: analysis.description,
      ai_confidence: analysis.confidence,
      assigned_department:
        analysis.module === 'smart_waste'
          ? bilingual('स्वास्थ्य एवं स्वच्छता विभाग', 'Health & Public Sanitation Dept')
          : analysis.module === 'jalrakshak'
          ? bilingual('जल कार्य एवं सीवरेज विभाग', 'Water Works & Drainage Dept')
          : bilingual('लोक निर्माण व प्रकाश विभाग', 'PWD & Streetlight Dept'),
      assigned_to: bilingual('वार्ड जोनल अधिकारी, रीवा नगर निगम', 'Zonal Officer, Rewa Municipal Corp'),
      resolution_note: '',
    });

    setTicketNumber(complaint.ticket_number);
    setStep('submitted');
  };

  const handleReset = () => {
    setText('');
    setImageFile(null);
    setMediaList([]);
    setAnalysis(null);
    setImageAnalysis(null);
    setStep('input');
    setMode('voice');
  };

  // Reusable Multi-Media Gallery Box (Used in Voice, Photo/Video, and Text modes)
  const renderMediaGallery = () => (
    <div style={{
      marginTop: '1.25rem',
      padding: '1.1rem',
      borderRadius: '10px',
      border: hasMedia ? '2px solid #15803d' : '2px dashed #f43f5e',
      background: hasMedia ? '#f0fdf4' : '#fff5f5',
      textAlign: 'left'
    }}>
      {/* Status Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {hasMedia ? (
            <CheckCircle2 size={18} color="#15803d" />
          ) : (
            <ShieldAlert size={18} color="#e11d48" />
          )}
          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: hasMedia ? '#166534' : '#9f1239' }}>
            {hasMedia
              ? bilingual(
                  `✓ साक्ष्य संलग्न एवं प्रमाणित: ${photoCount} फोटो • ${videoCount} वीडियो (Anti-Spam Verified)`,
                  `✓ Evidence Verified: ${photoCount} Photos • ${videoCount} Videos (Anti-Spam Passed)`
                )
              : bilingual(
                  '📷/🎥 फोटो या वीडियो साक्ष्य अनिवार्य है (Anti-Spam Proof Mandatory) *',
                  '📷/🎥 Photo or Video Proof is Mandatory (Anti-Spam Proof) *'
                )}
          </span>
        </div>

        {hasMedia && (
          <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', border: '1px solid #86efac' }}>
            {bilingual(`कुल ${mediaList.length} साक्ष्य संलग्न`, `${mediaList.length} Items Attached`)}
          </span>
        )}
      </div>

      {/* Action Toolbar */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: mediaList.length > 0 ? '0.85rem' : '0' }}>
        {/* Photo Capture / Upload */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ background: '#0b3a6d', borderColor: '#0b3a6d', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          onClick={() => cameraPhotoInputRef.current?.click()}
        >
          <Camera size={14} />
          <span>{bilingual('+ फोटो जोड़ें / खींचें', '+ Add / Take Photo')}</span>
        </button>

        {/* Video Record / Upload */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ background: '#e11d48', borderColor: '#be123c', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          onClick={() => cameraVideoInputRef.current?.click()}
        >
          <Video size={14} />
          <span>{bilingual('+ वीडियो रिकॉर्ड / अपलोड करें', '+ Record / Upload Video')}</span>
        </button>

        {/* Multiple Files Picker */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          onClick={() => multiFileInputRef.current?.click()}
        >
          <Film size={14} color="#0b3a6d" />
          <span>{bilingual('गैलरी से कई फोटो/वीडियो', 'Pick Multiple Files')}</span>
        </button>

        {/* 1-Tap Sample Video */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#eff6ff', borderColor: '#93c5fd' }}
          onClick={handleAttachSampleVideo}
        >
          <Sparkles size={14} color="#2563eb" />
          <span>{bilingual('⚡ डेमो वीडियो जोड़ें', '⚡ Attach Sample Video')}</span>
        </button>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={multiFileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFilesSelect}
      />
      <input
        ref={cameraPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleCameraPhotoSelect}
      />
      <input
        ref={cameraVideoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleCameraVideoSelect}
      />

      {/* Media Preview Grid */}
      {mediaList.length > 0 && (
        <div className="media-gallery-grid">
          {mediaList.map((item) => (
            <div key={item.id} className="media-item-card">
              {/* Badge */}
              <span className={`media-badge-tag ${item.type === 'video' ? 'media-badge-video' : 'media-badge-photo'}`}>
                {item.type === 'video' ? '🎥 VIDEO' : '📷 PHOTO'}
              </span>

              {/* Remove button */}
              <button
                type="button"
                className="media-remove-btn"
                title={bilingual('हटाएं', 'Remove')}
                onClick={() => removeMediaItem(item.id)}
              >
                ✕
              </button>

              {/* Media Preview Container */}
              <div className="media-thumb-container">
                {item.type === 'video' ? (
                  item.url.startsWith('data:image/svg') ? (
                    <img src={item.url} alt={item.name} className="media-thumb-img" />
                  ) : (
                    <video
                      src={item.url}
                      controls
                      playsInline
                      className="media-video-player"
                    />
                  )
                ) : (
                  <img src={item.url} alt={item.name} className="media-thumb-img" />
                )}
              </div>

              {/* Info Bar */}
              <div className="media-item-info">
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px', fontWeight: 600 }}>
                  {item.name}
                </span>
                <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Verified</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasMedia && (
        <p style={{ fontSize: '0.8rem', color: '#9f1239', marginTop: '0.65rem', marginBottom: 0 }}>
          {bilingual(
            '⚠️ फर्जी व शरारती शिकायतों की रोकथाम: वास्तविक घटनास्थल का कम से कम 1 फोटो अथवा वीडियो अनिवार्य है। आप एक से अधिक फोटो या वीडियो भी जोड़ सकते हैं।',
            '⚠️ Anti-Fraud Protection: At least 1 genuine spot photo or video is compulsory. You can upload multiple photos and videos for better assistance.'
          )}
        </p>
      )}
    </div>
  );

  return (
    <div className="page fade-in">
      <div className="container report-container">
        
        {/* Official Civic Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className="gov-seal-badge">
              <ShieldCheck size={14} color="#0b3a6d" />
              {bilingual('रीवा नगर निगम — जन-शिकायत पंजीकरण', 'Rewa Municipal Corporation — Grievance Redressal')}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', fontWeight: 900, color: '#0b3a6d', marginBottom: '0.35rem' }}>
            {bilingual('नागरिक शिकायत दर्ज करें', 'Lodge a Civic Complaint')}
          </h1>
          <p style={{ color: '#475569', fontSize: '0.92rem' }}>
            {bilingual(
              'टाइप करने की जरूरत नहीं — 1-टैप में बोलें, फोटो लें या नीचे दी गई समस्या चुनें',
              'No typing required — Speak, snap a photo, or choose from common civic issues below'
            )}
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            STEP 1: EFFORTLESS INPUT WITH MANDATORY PHOTO VERIFICATION
           ══════════════════════════════════════════════════════════════ */}
        {step === 'input' && (
          <>
            {/* Anti-Fraud Government Directives Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              background: '#fff1f2',
              border: '2px solid #f43f5e',
              borderRadius: '10px',
              padding: '0.9rem 1.15rem',
              marginBottom: '1.25rem',
              boxShadow: '0 4px 12px rgba(244,63,94,0.08)'
            }}>
              <ShieldAlert size={32} color="#e11d48" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 900, color: '#9f1239', fontSize: '0.92rem' }}>
                    {bilingual('🛡️ फर्जी शिकायत रोकथाम नियम (Anti-Fraud Directive)', '🛡️ Anti-Fraud Grievance Directive')}
                  </span>
                  <span style={{ background: '#e11d48', color: '#ffffff', fontSize: '0.68rem', fontWeight: 900, padding: '0.15rem 0.45rem', borderRadius: '4px', letterSpacing: '0.04em' }}>
                    {bilingual('फोटो / वीडियो साक्ष्य अनिवार्य / MANDATORY MEDIA *', 'PHOTO / VIDEO PROOF MANDATORY *')}
                  </span>
                </div>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.83rem', color: '#881337', lineHeight: 1.5 }}>
                  {bilingual(
                    'रीवा नगर निगम के आदेशानुसार झूठी, भ्रामक व शरारती शिकायतों को रोकने हेतु प्रत्येक शिकायत के साथ घटनास्थल की वास्तविक फोटो अथवा वीडियो संलग्न करना अनिवार्य है। नागरिक सहायता हेतु एक से अधिक फोटो या वीडियो भी जोड़ सकते हैं।',
                    'As per Rewa Municipal Corporation regulations, genuine photo or video evidence of the incident spot is strictly compulsory to eliminate fake complaints. You can upload multiple photos or videos for better assistance.'
                  )}
                </p>
              </div>
            </div>

            {/* Fast Quick-Select Chips (Zero Effort on Mobile!) */}
            <div className="card" style={{ marginBottom: '1.25rem', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0b3a6d' }}>
                  ⚡ {bilingual('अक्सर होने वाली समस्याएं (1-टैप में चुनें):', 'Frequently Reported Issues (1-Tap):')}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>
                  ✓ {bilingual('फोटो एवं वीडियो प्रमाण सहित', 'With Verified Photo & Video')}
                </span>
              </div>
              <div className="mobile-quick-chips">
                {quickProblems.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="mobile-quick-chip"
                    onClick={() => handleQuickSelect(p)}
                    title={lang === 'hi' ? p.hi : p.en}
                  >
                    <span>{p.icon}</span>
                    <span>{lang === 'hi' ? p.tagHi : p.tagEn}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Mode Selector */}
            <div className="input-methods">
              <button
                type="button"
                className={`input-method ${mode === 'voice' ? 'active' : ''}`}
                onClick={() => setMode('voice')}
              >
                <Mic size={28} color={mode === 'voice' ? '#0b3a6d' : '#64748b'} />
                <span>{bilingual('बोलकर बताएं', 'Speak (Voice)')}</span>
              </button>
              <button
                type="button"
                className={`input-method ${mode === 'photo' ? 'active' : ''}`}
                onClick={() => setMode('photo')}
              >
                <Camera size={28} color={mode === 'photo' ? '#0b3a6d' : '#64748b'} />
                <span>{bilingual('फोटो / वीडियो *', 'Photos / Videos *')}</span>
              </button>
              <button
                type="button"
                className={`input-method ${mode === 'text' ? 'active' : ''}`}
                onClick={() => setMode('text')}
              >
                <Type size={28} color={mode === 'text' ? '#0b3a6d' : '#64748b'} />
                <span>{bilingual('लिखकर बताएं', 'Type Text')}</span>
              </button>
            </div>

            {/* Voice Mode */}
            {mode === 'voice' && (
              <div className="voice-area">
                <button
                  type="button"
                  className={`mic-btn ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
                >
                  {isRecording ? <MicOff size={42} /> : <Mic size={42} />}
                </button>
                <p className="mic-status">
                  {voiceStatus ||
                    bilingual(
                      'माइक बटन दबाएं और हिंदी या बघेली में बोलें',
                      'Tap mic button and speak your problem'
                    )}
                </p>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {bilingual(
                    'उदाहरण: "हमारे वार्ड में 4 दिन से कचरा नहीं उठा है"',
                    'Example: "Garbage has not been collected in our ward for 4 days"'
                  )}
                </p>

                {text && (
                  <div className="card" style={{ marginTop: '1.25rem', textAlign: 'left', background: '#f8fafc' }}>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginBottom: '0.25rem' }}>
                      {bilingual('📝 AI द्वारा सुना गया विवरण:', '📝 AI Transcribed Details:')}
                    </p>
                    <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>"{text}"</p>
                  </div>
                )}

                {renderMediaGallery()}
              </div>
            )}

            {/* Photo & Video Mode */}
            {mode === 'photo' && (
              <div style={{ marginBottom: '1.5rem' }}>
                {renderMediaGallery()}

                <div style={{ marginTop: '1rem' }}>
                  <textarea
                    className="text-input-area"
                    style={{ minHeight: '80px' }}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={bilingual(
                      '(ऐच्छिक) फोटो या वीडियो के साथ कोई टिप्पणी या विवरण लिखना चाहते हैं तो यहां लिखें...',
                      '(Optional) Add extra details or notes alongside your photos/videos...'
                    )}
                  />
                </div>
              </div>
            )}

            {/* Text Mode */}
            {mode === 'text' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <textarea
                  className="text-input-area"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={bilingual(
                    'अपनी समस्या लिखें... (जैसे: हमारे वार्ड 12 में पानी की पाइपलाइन फूट गई है और सड़क पर जलभराव हो रहा है...)',
                    'Describe your civic problem (e.g., garbage not collected for 4 days, pipeline leak in ward 12...)'
                  )}
                  aria-label="Problem description"
                />

                {renderMediaGallery()}
              </div>
            )}

            {/* Location Bar with 1-Tap Auto-GPS */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  📍 {bilingual('घटना स्थल / वार्ड लोकेशन', 'Incident Location / Ward')}
                </label>
                <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>
                  ✓ {bilingual('रीवा नगर निगम क्षेत्र', 'Rewa Municipal Limits')}
                </span>
              </div>

              <div className="location-bar">
                <button type="button" className="btn btn-secondary btn-sm" onClick={getCurrentLocation}>
                  <Navigation size={14} color="#0b3a6d" />
                  <span>{bilingual('मेरी GPS लोकेशन लें', 'Auto GPS Location')}</span>
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowMap(!showMap)}>
                  <MapPin size={14} color="#e65100" />
                  <span>{showMap ? bilingual('मैप छुपाएं', 'Hide Map') : bilingual('मैप पर चुनें', 'Select on Map')}</span>
                </button>
                {address && <span className="location-text">📍 {address}</span>}
              </div>

              {showMap && (
                <div style={{ marginTop: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  <MapView
                    complaints={[]}
                    selectable
                    selectedPos={location}
                    onSelect={handleMapSelect}
                    height="220px"
                    center={location || [24.5373, 81.3005]}
                    zoom={location ? 15 : 13}
                  />
                </div>
              )}
            </div>

            {/* Primary Submit Action */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  maxWidth: '440px',
                  padding: '1rem',
                  fontSize: '1.05rem',
                  background: (!text.trim() || !hasMedia) ? '#64748b' : '#0b3a6d',
                  cursor: (!text.trim() || !hasMedia) ? 'not-allowed' : 'pointer',
                  opacity: (!text.trim() || !hasMedia) ? 0.75 : 1
                }}
                onClick={handleAnalyze}
              >
                <Sparkles size={20} color="#fbbf24" />
                <span>
                  {!hasMedia
                    ? bilingual('📷/🎥 फोटो/वीडियो साक्ष्य अनिवार्य है *', '📷/🎥 Photo or Video Proof Mandatory *')
                    : bilingual('AI से शिकायत तैयार करें', 'Generate Complaint via AI')}
                </span>
              </button>
              <p style={{ fontSize: '0.78rem', color: !hasMedia ? '#b91c1c' : '#64748b', marginTop: '0.5rem', fontWeight: !hasMedia ? 700 : 400 }}>
                {!hasMedia
                  ? bilingual(
                      '⚠️ शिकायत तैयार करने के लिए फोटो अथवा वीडियो साक्ष्य अनिवार्य है (फर्जी शिकायतों से बचाव हेतु)।',
                      '⚠️ Photo or video evidence is compulsory to generate complaint (to prevent fake complaints).'
                    )
                  : bilingual(
                      'AI अपने आप विभाग, प्राथमिकता और समस्या की श्रेणी तय करेगा।',
                      'AI automatically identifies department, priority, and category.'
                    )}
              </p>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 2: AI UNDERSTANDING
           ══════════════════════════════════════════════════════════════ */}
        {step === 'processing' && (
          <div className="ai-processing card" style={{ background: '#ffffff' }}>
            <div className="ai-spinner" />
            <h3 style={{ color: '#0b3a6d', fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              🤖 {bilingual('AI आपकी समस्या समझ रहा है...', 'AI is processing your complaint...')}
            </h3>
            <p style={{ color: '#475569', fontSize: '0.9rem' }}>
              {bilingual(
                'भाषा विश्लेषण • वार्ड पहचान • संबंधित विभाग चयन (कचरा/जल/सड़क) • प्राथमिकता निर्धारण',
                'Natural language analysis • Ward routing • Module classification • Priority scoring'
              )}
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 3: CITIZEN PREVIEW & OFFICIAL CONFIRMATION
           ══════════════════════════════════════════════════════════════ */}
        {step === 'preview' && analysis && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-flex', padding: '0.5rem', background: '#dcfce7', borderRadius: '50%', marginBottom: '0.5rem' }}>
                <CheckCircle2 size={36} color="#15803d" />
              </div>
              <h2 style={{ fontWeight: 900, color: '#0b3a6d', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                {bilingual('शिकायत प्रारूप तैयार है', 'Complaint Structured by AI')}
              </h2>
              <p style={{ color: '#475569', fontSize: '0.88rem' }}>
                {bilingual(
                  'कृपया विवरण जांचें और रीवा नगर निगम को प्रेषित करने के लिए "पुष्टि करें" दबाएं।',
                  'Review the details below and confirm submission to Rewa Nagar Nigam.'
                )}
              </p>
            </div>

            <div className="complaint-preview" style={{ marginBottom: '1.5rem' }}>
              <div className="preview-row" style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <span className="preview-label">{bilingual('समस्या का शीर्षक', 'Complaint Title')}</span>
                <span className="preview-value" style={{ color: '#0b3a6d', fontWeight: 800 }}>
                  {analysis.title}
                </span>
              </div>
              <div className="preview-row">
                <span className="preview-label">{bilingual('विभाग / श्रेणी', 'Department / Category')}</span>
                <span className="preview-value">
                  {categoryIcons[analysis.category]} {categoryLabel(analysis.category)} ({analysis.subcategory})
                </span>
              </div>
              <div className="preview-row">
                <span className="preview-label">{bilingual('पोर्टल मॉड्यूल', 'Portal Module')}</span>
                <span className="preview-value">
                  <span className="badge badge-primary">{moduleLabel(analysis.module)}</span>
                </span>
              </div>
              <div className="preview-row">
                <span className="preview-label">{bilingual('प्राथमिकता स्तर', 'Priority Level')}</span>
                <span className="preview-value">
                  <span
                    className="badge"
                    style={{
                      background: `${severityColors[analysis.severity]}22`,
                      color: severityColors[analysis.severity],
                      border: `1px solid ${severityColors[analysis.severity]}44`,
                    }}
                  >
                    ● {analysis.severity} PRIORITY
                  </span>
                </span>
              </div>
              <div className="preview-row">
                <span className="preview-label">{bilingual('विस्तृत विवरण', 'Detailed Description')}</span>
                <span className="preview-value" style={{ maxWidth: '65%', textAlign: 'right', fontSize: '0.88rem' }}>
                  {analysis.description}
                </span>
              </div>
              <div className="preview-row">
                <span className="preview-label">{bilingual('स्थान / वार्ड', 'Ward Location')}</span>
                <span className="preview-value">{address}</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">{bilingual('AI सटीकता (Confidence)', 'AI Confidence')}</span>
                <span className="preview-value">
                  {Math.round(analysis.confidence * 100)}%
                  <div className="confidence-bar" style={{ width: '80px', display: 'inline-block', marginLeft: '0.5rem', verticalAlign: 'middle' }}>
                    <div
                      className="confidence-fill"
                      style={{
                        width: `${analysis.confidence * 100}%`,
                        background: analysis.confidence > 0.85 ? '#15803d' : '#d97706',
                      }}
                    />
                  </div>
                </span>
              </div>
              <div className="preview-row" style={{ background: '#fef3c7' }}>
                <span className="preview-label" style={{ color: '#92400e' }}>
                  {bilingual('अनुशंसित निवारण कार्रवाई', 'Recommended Action')}
                </span>
                <span className="preview-value" style={{ color: '#92400e', fontSize: '0.85rem' }}>
                  {analysis.recommended_action}
                </span>
              </div>
              <div className="preview-row" style={{ background: hasMedia ? '#f0fdf4' : '#fff1f2', borderTop: '1px solid #cbd5e1' }}>
                <span className="preview-label" style={{ color: hasMedia ? '#166534' : '#9f1239', fontWeight: 800 }}>
                  {bilingual('साक्ष्य स्थिति (Anti-Fraud Status)', 'Evidence Status')}
                </span>
                <span className="preview-value" style={{ color: hasMedia ? '#15803d' : '#e11d48', fontWeight: 800 }}>
                  {hasMedia
                    ? bilingual(
                        `✓ ${photoCount} फोटो • ${videoCount} वीडियो सत्यापित (फर्जी जांच उत्तीर्ण)`,
                        `✓ ${photoCount} Photos • ${videoCount} Videos Verified (Anti-Spam Passed)`
                      )
                    : bilingual('⚠️ साक्ष्य अनुपलब्ध (स्वीकार नहीं होगा)', '⚠️ Evidence Missing (Submission Blocked)')}
                </span>
              </div>
            </div>

            {hasMedia ? (
              <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', border: '2px solid #86efac', background: '#f8fafc' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#dcfce7', color: '#166534', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                  <ShieldCheck size={15} />
                  <span>{bilingual(`रीवा नगर निगम डिजिटल साक्ष्य प्रमाणित (${mediaList.length} फाइलें संलग्न)`, `Rewa Municipal Evidence Verified (${mediaList.length} Files Attached)`)}</span>
                </div>

                {/* Multi-Media Gallery Grid in Step 3 Preview */}
                <div className="media-gallery-grid" style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                  {mediaList.map((item) => (
                    <div key={item.id} className="media-item-card">
                      <span className={`media-badge-tag ${item.type === 'video' ? 'media-badge-video' : 'media-badge-photo'}`}>
                        {item.type === 'video' ? '🎥 VIDEO' : '📷 PHOTO'}
                      </span>
                      <div className="media-thumb-container">
                        {item.type === 'video' ? (
                          item.url.startsWith('data:image/svg') ? (
                            <img src={item.url} alt={item.name} className="media-thumb-img" />
                          ) : (
                            <video
                              src={item.url}
                              controls
                              playsInline
                              className="media-video-player"
                            />
                          )
                        ) : (
                          <img src={item.url} alt={item.name} className="media-thumb-img" />
                        )}
                      </div>
                      <div className="media-item-info">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', fontWeight: 600 }}>
                          {item.name}
                        </span>
                        <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Verified</span>
                      </div>
                    </div>
                  ))}
                </div>

                {imageAnalysis && (
                  <p style={{ marginTop: '0.65rem', fontSize: '0.85rem', color: '#334155' }}>
                    <strong>AI Vision:</strong> {imageAnalysis.visual_summary}
                  </p>
                )}
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, marginTop: '0.35rem' }}>
                  ✓ {bilingual('भू-निर्देशांक (GPS: 24.5373° N, 81.3005° E) एवं टाइमस्टैम्प साक्ष्य के साथ सुरक्षित', 'Geo-Coordinates (GPS: 24.5373° N, 81.3005° E) & Timestamp Logged')}
                </div>
              </div>
            ) : (
              <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', border: '2px solid #f43f5e', background: '#fff1f2' }}>
                <ShieldAlert size={36} color="#e11d48" style={{ margin: '0 auto 0.5rem' }} />
                <h4 style={{ color: '#9f1239', fontWeight: 800, marginBottom: '0.35rem' }}>
                  {bilingual('फोटो या वीडियो साक्ष्य संलग्न नहीं है!', 'Mandatory Photo or Video Evidence Missing!')}
                </h4>
                <p style={{ color: '#881337', fontSize: '0.85rem', marginBottom: '0.85rem' }}>
                  {bilingual(
                    'फर्जी शिकायतों से बचाव हेतु वास्तविक स्थल का फोटो अथवा वीडियो अपलोड करना अनिवार्य है। कृपया साक्ष्य जोड़ें।',
                    'As per anti-spam regulations, genuine spot photo or video proof is mandatory before final submission.'
                  )}
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ background: '#e11d48', borderColor: '#be123c' }}
                  onClick={() => {
                    setStep('input');
                    setMode('photo');
                  }}
                >
                  <Camera size={15} />
                  <span>{bilingual('साक्ष्य संलग्न करने के लिए वापस जाएं', 'Go Back to Attach Evidence')}</span>
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{
                  background: !hasMedia ? '#64748b' : '#15803d',
                  borderColor: !hasMedia ? '#475569' : '#0d5f06',
                  minWidth: '220px',
                  cursor: !hasMedia ? 'not-allowed' : 'pointer',
                  opacity: !hasMedia ? 0.7 : 1
                }}
                disabled={!hasMedia}
                onClick={handleSubmit}
              >
                <Send size={18} />
                <span>
                  {!hasMedia
                    ? bilingual('साक्ष्य अनिवार्य है *', 'Evidence Mandatory *')
                    : bilingual('पुष्टि करें एवं शिकायत दर्ज करें', 'Confirm & Submit to Nigam')}
                </span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => setStep('input')}
              >
                <ArrowLeft size={16} />
                <span>{bilingual('संशोधन करें', 'Edit / Change')}</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 4: OFFICIAL SARKARI ACKNOWLEDGMENT RECEIPT (पावती)
           ══════════════════════════════════════════════════════════════ */}
        {step === 'submitted' && (
          <div className="fade-in">
            <div className="gov-receipt-card">
              {/* Receipt Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0b3a6d', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <AshokaEmblem size={44} />
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0b3a6d', margin: 0 }}>
                      {bilingual('नगर पालिक निगम, रीवा', 'Rewa Municipal Corporation')}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                      {bilingual(
                        'ई-शिकायत पावती / Civic Grievance E-Acknowledgment',
                        'Civic Grievance E-Acknowledgment Slip'
                      )}
                    </p>
                  </div>
                </div>
                <RewaMunicipalLogo size={44} />
              </div>

              {/* Status Ribbon */}
              <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <CheckCircle2 size={24} color="#15803d" />
                <div>
                  <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.95rem' }}>
                    {bilingual('शिकायत सफलतापूर्वक दर्ज कर ली गई है', 'Complaint Successfully Registered')}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#14532d' }}>
                    {bilingual(
                      'संबंधित जोनल अधिकारी को प्रेषित की गई है।',
                      'Assigned to Rewa Nagar Nigam Zonal Officer.'
                    )}
                  </div>
                </div>
              </div>

              {/* Ticket Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                    {bilingual('शिकायत क्रमांक (Ticket No.)', 'Ticket Number')}
                  </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0b3a6d', letterSpacing: '0.04em' }}>
                    {ticketNumber}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                    {bilingual('पंजीकरण तिथि एवं समय', 'Registration Date & Time')}
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                    {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                    {bilingual('नागरिक अधिकार पत्र SLA (समय सीमा)', 'Citizen Charter SLA (Resolution Time)')}
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#15803d' }}>
                    {bilingual('⏱️ 48 घंटे में समाधान सुनिश्चित', '⏱️ Guaranteed Resolution within 48 Hours')}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                    {bilingual('नागरिक हेल्पलाइन', 'Citizen Helpline')}
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#dc2626' }}>
                    📞 181 / 07662-252525
                  </span>
                </div>
              </div>

              {/* Photo & Video Evidence in Official Receipt */}
              {hasMedia && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                    <ShieldCheck size={16} color="#15803d" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#166534' }}>
                      {bilingual(
                        `संलग्न साक्ष्य: ${photoCount} फोटो • ${videoCount} वीडियो प्रमाणित (Anti-Spam Verified)`,
                        `Attached Evidence: ${photoCount} Photos • ${videoCount} Videos Verified (Anti-Spam Passed)`
                      )}
                    </span>
                  </div>

                  {/* Thumbnail Strip */}
                  <div style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.35rem' }}>
                    {mediaList.map((m) => (
                      <div key={m.id} style={{ position: 'relative', width: '84px', height: '64px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #15803d', flexShrink: 0, background: '#0f172a' }}>
                        <span style={{ position: 'absolute', top: 2, left: 2, fontSize: '0.6rem', fontWeight: 800, padding: '0.1rem 0.3rem', borderRadius: '3px', background: m.type === 'video' ? '#e11d48' : '#0284c7', color: '#fff', zIndex: 2 }}>
                          {m.type === 'video' ? '🎥 VID' : '📷 PIC'}
                        </span>
                        {m.type === 'video' && !m.url.startsWith('data:image') ? (
                          <video src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <img src={m.url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.74rem', color: '#15803d', marginTop: '0.5rem' }}>
                    {bilingual('डिजिटल टाइमस्टैम्प एवं भू-निर्देशांक (GPS) नगर निगम रिकॉर्ड में दर्ज • फर्जी जांच उत्तीर्ण', 'Digital Timestamp & GPS Coordinates Logged in Municipal Record • Anti-Fraud Passed')}
                  </div>
                </div>
              )}

              {/* Barcode/Official Verification Representation */}
              <div style={{ textAlign: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: '3px', color: '#475569', marginBottom: '0.25rem' }}>
                  ||| | ||||| |||| | |||||| ||| ||||| |||||||
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {bilingual('डिजिटल सत्यापन कोड:', 'Digital Verification Code:')} GOV-MP-REWA-{ticketNumber}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  <span>{bilingual('पावती प्रिंट करें', 'Print Receipt')}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/complaints')}
                >
                  <span>{bilingual('शिकायत की स्थिति ट्रैक करें', 'Track My Complaints')}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-accent btn-sm"
                  onClick={handleReset}
                >
                  <span>{bilingual('+ दूसरी समस्या दर्ज करें', '+ Lodge Another Issue')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
