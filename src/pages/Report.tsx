import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Camera, Type, MapPin, Send, CheckCircle2, Navigation,
  Sparkles, Printer, ArrowLeft, ShieldCheck, ShieldAlert, Video, Film, Trash2, Plus, Play,
  AlertTriangle, Eye, Check, X
} from 'lucide-react';
import {
  analyzeProblemDemo, analyzeImageDemo, analyzeCivicImageAsync, categoryRoutingDetails,
  type CivicVisionResult, moduleNames, severityColors, categoryIcons
} from '../services/ai';
import { createComplaint } from '../services/store';
import { uploadReportImage, getImageUrl } from '../services/supabaseStore';
import { getCivicEvidenceSvg, getCivicVideoPosterSvg, createSampleCivicVideoBlob } from '../services/evidenceSvg';
import type { AIAnalysis, CivicMedia, Category } from '../types';
import MapView from '../components/MapView';
import { CivicInsignia, CivicPrototypeBadge } from '../components/Emblem';
import { useGov } from '../context/GovContext';
import { reverseGeocode, forwardGeocode } from '../services/geocode';

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
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [address, setAddress] = useState<string>('');
  const [selectedQuickProblem, setSelectedQuickProblem] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [quickNotice, setQuickNotice] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [aiVisionResult, setAiVisionResult] = useState<CivicVisionResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [pendingCategoryOverride, setPendingCategoryOverride] = useState<{
    targetCategory: Category;
    targetProblem?: any;
  } | null>(null);
  const [showCategorySelectModal, setShowCategorySelectModal] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const evidenceSectionRef = useRef<HTMLDivElement>(null);
  const [showMap, setShowMap] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Derived media values & anti-fraud validation
  const photoCount = mediaList.filter((m) => m.type === 'image').length;
  const videoCount = mediaList.filter((m) => m.type === 'video').length;
  const hasPhoto = photoCount > 0 || !!imageFile;
  const hasLocation = !!(address.trim().length >= 4 && location);
  const hasMedia = mediaList.length > 0;
  const imagePreview = mediaList.find((m) => m.type === 'image')?.url || mediaList[0]?.url || null;
  const videoUrl = mediaList.find((m) => m.type === 'video')?.url || null;

  const rewaWards = [
    { name: 'वार्ड 12 - सिरमौर चौराहा', coords: [24.5373, 81.3005] as [number, number] },
    { name: 'वार्ड 15 - ढेकहा तिराहा', coords: [24.5420, 81.2950] as [number, number] },
    { name: 'वार्ड 18 - सिविल लाइन्स', coords: [24.5310, 81.3030] as [number, number] },
    { name: 'वार्ड 3 - उर्रहट बस स्टैंड', coords: [24.5340, 81.2915] as [number, number] },
    { name: 'वार्ड 7 - बोदाबाग रोड', coords: [24.5260, 81.2880] as [number, number] },
    { name: 'वार्ड 24 - किला चौराहा', coords: [24.5390, 81.3120] as [number, number] },
  ];

  const allCategories: Category[] = [
    'Waste Management',
    'Water & Leakage',
    'Waterlogging & Drainage',
    'Roads & Potholes',
    'Streetlights',
    'Public Cleanliness',
    'Sanitation',
    'Government Service Assistance',
    'Other Civic Issue',
  ];

  // Common pre-set issues with category mapping and bilingual support
  const quickProblems = [
    {
      hi: 'वार्ड में 4 दिन से कचरा नहीं उठाया गया है',
      en: 'Garbage has not been collected in our ward for 4 days',
      tagHi: 'कचरा नहीं उठा',
      tagEn: 'Garbage Not Picked',
      icon: '🗑️',
      type: 'garbage' as const,
      category: 'Waste Management' as Category,
    },
    {
      hi: 'मुख्य पाइपलाइन में लीकेज है, भारी मात्रा में पेयजल व्यर्थ बह रहा है',
      en: 'Main drinking water pipeline is leaking heavily on the street',
      tagHi: 'पानी पाइप लीकेज',
      tagEn: 'Water Pipe Leak',
      icon: '💧',
      type: 'leakage' as const,
      category: 'Water & Leakage' as Category,
    },
    {
      hi: 'सड़क की स्ट्रीट लाइट पिछले 1 सप्ताह से बंद पड़ी है, रात में अंधेरा रहता है',
      en: 'Streetlights have been non-functional for a week, causing darkness at night',
      tagHi: 'स्ट्रीट लाइट बंद',
      tagEn: 'Streetlight Off',
      icon: '💡',
      type: 'streetlight' as const,
      category: 'Streetlights' as Category,
    },
    {
      hi: 'सड़क पर बड़ा और खतरनाक गड्ढा है, दुर्घटना का खतरा बना हुआ है',
      en: 'Large dangerous pothole on the main road causing accident risk',
      tagHi: 'सड़क पर गड्ढा',
      tagEn: 'Road Pothole',
      icon: '🕳️',
      type: 'pothole' as const,
      category: 'Roads & Potholes' as Category,
    },
    {
      hi: 'नाली जाम हो गई है, गंदा बदबूदार पानी सड़क पर बह रहा है',
      en: 'Drainage is choked and dirty sewage water is overflowing onto the street',
      tagHi: 'नाली जाम/गंदा पानी',
      tagEn: 'Drainage Overflow',
      icon: '🌊',
      type: 'drainage' as const,
      category: 'Waterlogging & Drainage' as Category,
    },
    {
      hi: 'कचरा डिपो भर चुका है और चारों तरफ गंदगी फैली हुई है',
      en: 'Public waste bin is overflowing with garbage scattered everywhere',
      tagHi: 'डस्टबिन ओवरफ्लो',
      tagEn: 'Dustbin Overflow',
      icon: '📦',
      type: 'dustbin' as const,
      category: 'Waste Management' as Category,
    },
  ];

  // 1-Tap Quick Issue selection with professional AI override check
  const handleQuickSelect = (prob: (typeof quickProblems)[0]) => {
    // If AI Vision detected a category and user is picking a DIFFERENT category:
    if (aiVisionResult && selectedCategory && prob.category !== selectedCategory) {
      setPendingCategoryOverride({
        targetCategory: prob.category,
        targetProblem: prob,
      });
      return;
    }

    applyQuickSelect(prob);
  };

  const applyQuickSelect = (prob: (typeof quickProblems)[0]) => {
    const issueText = lang === 'hi' ? prob.hi : prob.en;
    setText(issueText);
    setSelectedQuickProblem(prob.tagEn);
    setSelectedCategory(prob.category);
    setFormError(null);
    setQuickNotice(
      bilingual(
        `✓ समस्या चुनी गई: "${prob.tagHi}"। रीवा नगर निगम एंटी-फ्रॉड नियम: अब कृपया नीचे (1) स्थल की अनिवार्य फोटो खींचें/अपलोड करें और (2) लोकेशन चुनें। (वीडियो वैकल्पिक है)`,
        `✓ Issue selected: "${prob.tagEn}". Rewa Municipal Rule: Now please (1) capture/upload compulsory spot photo and (2) select location below. (Video is optional)`
      )
    );
    setMode('photo');
    setTimeout(() => {
      evidenceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  const handleManualCategorySelect = (newCategory: Category) => {
    setShowCategorySelectModal(false);
    if (aiVisionResult && selectedCategory && newCategory !== selectedCategory) {
      setPendingCategoryOverride({
        targetCategory: newCategory,
      });
      return;
    }
    applyCategoryOverride(newCategory);
  };

  const applyCategoryOverride = (newCategory: Category) => {
    setSelectedCategory(newCategory);
    setIsManualOverride(true);
    const matchChip = quickProblems.find((p) => p.category === newCategory);
    if (matchChip) {
      setSelectedQuickProblem(matchChip.tagEn);
    }
    if (analysis) {
      const updated = analyzeProblemDemo(text, newCategory);
      setAnalysis(updated);
    }
  };

  const confirmCategoryOverride = () => {
    if (!pendingCategoryOverride) return;
    const targetCat = pendingCategoryOverride.targetCategory;
    const targetProb = pendingCategoryOverride.targetProblem;

    setIsManualOverride(true);
    setSelectedCategory(targetCat);

    if (targetProb) {
      applyQuickSelect(targetProb);
    } else {
      applyCategoryOverride(targetCat);
    }

    setPendingCategoryOverride(null);
  };

  const cancelCategoryOverride = () => {
    setPendingCategoryOverride(null);
  };

  // AI Vision Trigger: Analyzes image to auto-detect category, title, description, and severity
  const triggerImageVision = async (file: File | string) => {
    setIsAnalyzingImage(true);
    try {
      const vision = await analyzeCivicImageAsync(file, text);
      setAiVisionResult(vision);
      setImageAnalysis(vision);

      // Auto-select category if citizen hasn't manually overridden
      if (!isManualOverride) {
        setSelectedCategory(vision.detected_category);
        const matchChip = quickProblems.find((p) => p.category === vision.detected_category);
        if (matchChip) {
          setSelectedQuickProblem(matchChip.tagEn);
        }
        if (!text.trim() || text.trim().length < 15) {
          setText(lang === 'hi' ? vision.suggested_description_hi : vision.suggested_description_en);
        }
      }
    } catch (err) {
      console.warn('AI Vision error:', err);
    } finally {
      setIsAnalyzingImage(false);
    }
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
      if (!isVideo && !imageFile) {
        setImageFile(file);
        triggerImageVision(file);
      }
    });
    setMediaList((prev) => [...prev, ...newItems]);
    // reset input value so user can re-select same file if needed
    e.target.value = '';
  };

  const handleCameraPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    triggerImageVision(file);
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
    setMediaList((prev) => {
      const remaining = prev.filter((m) => m.id !== id);
      const remainingImages = remaining.filter((m) => m.type === 'image');
      if (remainingImages.length === 0) {
        setImageFile(null);
        setAiVisionResult(null);
        setIsManualOverride(false);
      } else {
        triggerImageVision(remainingImages[0].url);
      }
      return remaining;
    });
  };

  // Location Handlers
  // Location Handlers (Genuine Real-Time GPS & Reverse Geocoding)
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      const msg = bilingual(
        'आपके ब्राउज़र में जियोलोकेशन (GPS) सुविधा समर्थित नहीं है।',
        'Geolocation is not supported by your browser.'
      );
      setFormError(msg);
      alert(msg);
      return;
    }

    setIsLocating(true);
    setLocationStatus(
      bilingual('📍 वास्तविक लाइव GPS सिग्नल खोज रहे हैं...', '📍 Acquiring Live GPS Location...')
    );
    setFormError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 0);

        // Update exact real coordinates immediately
        setLocation([lat, lng]);
        const coordLabel = `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`;
        setAddress(`GPS: ${coordLabel}`);
        setLocationStatus(
          bilingual(
            `📍 GPS प्राप्त (${coordLabel}) • सटीकता ~${accuracy}m... वास्तविक पता खोज रहे हैं...`,
            `📍 GPS Locked (${coordLabel}) • Acc ~${accuracy}m... Resolving address...`
          )
        );

        // Fetch genuine address via reverse geocoding
        try {
          const resolvedAddress = await reverseGeocode(lat, lng);
          const fullAddress = `${resolvedAddress} (${coordLabel})`;
          setAddress(fullAddress);
          setLocationStatus(
            bilingual(
              `✓ लाइव GPS सत्यापित: ${resolvedAddress}`,
              `✓ Live GPS Verified: ${resolvedAddress}`
            )
          );
        } catch {
          setAddress(`GPS: ${coordLabel}`);
          setLocationStatus(
            bilingual(`✓ लाइव GPS निर्देशांक सुरक्षित (${coordLabel})`, `✓ Live GPS Coordinates Logged (${coordLabel})`)
          );
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        setLocationStatus(null);
        let errorMsg = bilingual(
          'GPS सिग्नल प्राप्त नहीं हो सका। कृपया अपना स्थान लिखें या नीचे मैप/वार्ड से चुनें।',
          'Could not get GPS signal. Please type your location or pick on map/ward below.'
        );
        if (err.code === 1) {
          errorMsg = bilingual(
            '⚠️ GPS लोकेशन अनुमति अस्वीकृत (Permission Denied)। आपके ब्राउज़र ने लोकेशन ब्लॉक की है। कृपया ब्राउज़र सेटिंग्स में लोकेशन अनुमति (Allow Location) चालू करें, या नीचे से वार्ड चुनें / अपना पता टाइप करें।',
            '⚠️ Location permission denied by your browser. Please allow location access in browser settings, or select your ward / type address below.'
          );
        } else if (err.code === 2) {
          errorMsg = bilingual(
            '⚠️ GPS सिग्नल अनुपलब्ध है। कृपया अपना पता टाइप करें या मैप पर बिंदु चुनें।',
            '⚠️ GPS signal unavailable. Please type your address or select on map.'
          );
        } else if (err.code === 3) {
          errorMsg = bilingual(
            '⚠️ GPS प्राप्त करने में समय समाप्त हो गया। कृपया पुनः प्रयास करें।',
            '⚠️ GPS request timed out. Please try again.'
          );
        }
        setFormError(errorMsg);
        alert(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleMapSelect = async (lat: number, lng: number) => {
    setLocation([lat, lng]);
    const coordLabel = `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`;
    setAddress(`मैप स्थान: ${coordLabel}`);
    setLocationStatus(bilingual(`मैप पिन: ${coordLabel}`, `Map Pin: ${coordLabel}`));
    setFormError(null);
    try {
      const resolved = await reverseGeocode(lat, lng);
      setAddress(`${resolved} (${coordLabel})`);
      setLocationStatus(bilingual(`✓ मैप स्थान: ${resolved}`, `✓ Map Location: ${resolved}`));
    } catch {
      setAddress(`मैप स्थान (${coordLabel})`);
    }
  };

  const handleWardSelect = (wardName: string, coords: [number, number]) => {
    setAddress(wardName + (wardName.includes('रीवा') ? '' : ', रीवा'));
    setLocation(coords);
    setLocationStatus(bilingual(`✓ वार्ड चयनित: ${wardName}`, `✓ Ward Selected: ${wardName}`));
    setFormError(null);
  };

  // Submit for AI analysis (STRICT ANTI-FRAUD: Photo & Location Mandatory, Video Optional)
  const handleAnalyze = async () => {
    setFormError(null);

    // 1. Text description check
    if (!text.trim()) {
      const msg = bilingual(
        'कृपया अपनी समस्या का विवरण लिखें, बोलें या ऊपर दिए गए 1-टैप विकल्पों में से चुनें।',
        'Please describe your problem by typing, speaking, or selecting a 1-tap issue above.'
      );
      setFormError(msg);
      alert(msg);
      return;
    }

    // 2. MANDATORY PHOTO PROOF (Strict Anti-Fraud)
    if (!hasPhoto) {
      const msg = bilingual(
        '🛑 फोटो साक्ष्य अनिवार्य है!\n\nरीवा नगर निगम के एंटी-फ्रॉड नियमों के तहत फर्जी व शरारती शिकायतों को रोकने के लिए घटनास्थल की वास्तविक फोटो संलग्न करना अनिवार्य है।\n\n(नोट: वीडियो साक्ष्य वैकल्पिक है, लेकिन फोटो अनिवार्य है)\n\nकृपया कैमरे से फोटो लें या गैलरी से फोटो अपलोड करें।',
        '🛑 Photo Evidence is Compulsory!\n\nAs per Rewa Municipal Corporation anti-fraud regulations, uploading genuine photographic proof of the incident spot is strictly compulsory to eliminate fake complaints.\n\n(Note: Video proof is optional, but photo is mandatory)\n\nPlease capture a photo with your camera or upload from gallery.'
      );
      setFormError(bilingual(
        '🛑 फोटो साक्ष्य अनिवार्य है! कृपया नीचे कैमरे से फोटो खींचें या गैलरी से फोटो अपलोड करें। (वीडियो वैकल्पिक है)',
        '🛑 Photo Evidence is Compulsory! Please snap a photo or upload from gallery below. (Video is optional)'
      ));
      setMode('photo');
      alert(msg);
      evidenceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 3. MANDATORY INCIDENT LOCATION (Strict Anti-Fraud)
    if (!address.trim() || address.trim().length < 4) {
      const msg = bilingual(
        '📍 घटना स्थल लोकेशन अनिवार्य है!\n\nरीवा नगर निगम के नियमों के अनुसार बिना सही स्थान व वार्ड के शिकायत दर्ज नहीं की जा सकती।\n\nकृपया नीचे दिए गए इनपुट में वार्ड/स्थान लिखें या "मेरी लाइव GPS लोकेशन लें" / "मैप पर चुनें" बटन दबाएं।',
        '📍 Incident Location is Compulsory!\n\nAs per Rewa Municipal regulations, a complaint cannot be registered without incident location and ward.\n\nPlease type your Ward/Address below or tap "Use My Live GPS" / "Select on Map".'
      );
      setFormError(bilingual(
        '📍 घटना स्थल लोकेशन अनिवार्य है! कृपया नीचे वार्ड/पता लिखें या GPS/मैप से चुनें।',
        '📍 Incident Location is Compulsory! Please enter address/ward or use GPS/Map below.'
      ));
      alert(msg);
      locationInputRef.current?.focus();
      return;
    }

    if (!location) {
      try {
        const geo = await forwardGeocode(address);
        if (geo) {
          setLocation(geo.coords);
        } else {
          setLocation([24.5373, 81.3005]);
        }
      } catch {
        setLocation([24.5373, 81.3005]);
      }
    }

    setStep('processing');
    await new Promise((r) => setTimeout(r, 1200));

    const chosenCat = selectedCategory || (aiVisionResult ? aiVisionResult.detected_category : undefined);
    const result = analyzeProblemDemo(text || 'Civic problem reported with verified evidence', chosenCat);
    setAnalysis(result);

    const imgResult = aiVisionResult || analyzeImageDemo(chosenCat);
    setImageAnalysis(imgResult);

    setStep('preview');
  };

  // Final submit with hard anti-fraud check and Supabase storage upload
  const handleSubmit = async () => {
    if (!analysis) return;

    if (!hasPhoto) {
      alert(
        bilingual(
          '🛑 रोक दिया गया: फर्जी शिकायत रोकथाम नियम के तहत वास्तविक फोटो साक्ष्य के बिना शिकायत दर्ज नहीं की जा सकती। (वीडियो वैकल्पिक है)',
          '🛑 Blocked: Complaint cannot be registered without genuine photo evidence under anti-fraud regulations. (Video is optional)'
        )
      );
      setStep('input');
      setMode('photo');
      return;
    }

    if (!hasLocation || !location) {
      alert(
        bilingual(
          '🛑 रोक दिया गया: घटना स्थल लोकेशन के बिना शिकायत दर्ज नहीं की जा सकती। कृपया लोकेशन दर्ज करें।',
          '🛑 Blocked: Complaint cannot be registered without incident location. Please provide location.'
        )
      );
      setStep('input');
      return;
    }

    let finalImageUrl = imagePreview;
    if (imageFile) {
      try {
        const { path, error } = await uploadReportImage(imageFile, 'report-images');
        if (!error && path) {
          finalImageUrl = getImageUrl(path, 'report-images');
        }
      } catch (err) {
        console.warn('Storage upload error, using preview data:', err);
      }
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
      latitude: location[0],
      longitude: location[1],
      address: address.trim(),
      image_url: finalImageUrl,
      video_url: videoUrl,
      media: mediaList,
      voice_transcript: mode === 'voice' ? text : null,
      ai_summary: analysis.description,
      ai_confidence: analysis.confidence,
      assigned_department:
        categoryRoutingDetails[analysis.category]
          ? bilingual(categoryRoutingDetails[analysis.category].departmentHi, categoryRoutingDetails[analysis.category].departmentEn)
          : analysis.module === 'smart_waste'
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
    setAiVisionResult(null);
    setSelectedCategory(null);
    setIsManualOverride(false);
    setPendingCategoryOverride(null);
    setSelectedQuickProblem(null);
    setFormError(null);
    setQuickNotice(null);
    setLocation(null);
    setAddress('');
    setStep('input');
    setMode('voice');
  };

  // Reusable Multi-Media Gallery Box (Used in Voice, Photo/Video, and Text modes)
  const renderMediaGallery = () => (
    <div
      ref={evidenceSectionRef}
      style={{
        marginTop: '1.25rem',
        padding: '1.15rem',
        borderRadius: '12px',
        border: hasPhoto ? '2px solid #15803d' : '2px dashed #f43f5e',
        background: hasPhoto ? '#f0fdf4' : '#fff5f5',
        textAlign: 'left',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Status Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {hasPhoto ? (
            <CheckCircle2 size={20} color="#15803d" />
          ) : (
            <ShieldAlert size={20} color="#e11d48" />
          )}
          <span style={{ fontWeight: 800, fontSize: '0.94rem', color: hasPhoto ? '#166534' : '#9f1239' }}>
            {hasPhoto
              ? bilingual(
                  `✓ फोटो साक्ष्य संलग्न: ${photoCount} फोटो ${videoCount > 0 ? `• ${videoCount} वीडियो` : ''} (सत्यापित)`,
                  `✓ Photo Verified: ${photoCount} Photo(s) Attached ${videoCount > 0 ? `• ${videoCount} Video(s)` : ''}`
                )
              : bilingual(
                  '📸 फोटो साक्ष्य अनिवार्य है (Photo Proof is Mandatory) *',
                  '📸 Photo Proof is Mandatory (Anti-Fraud Directive) *'
                )}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.74rem',
            background: hasPhoto ? '#dcfce7' : '#fee2e2',
            color: hasPhoto ? '#15803d' : '#991b1b',
            fontWeight: 800,
            padding: '0.2rem 0.65rem',
            borderRadius: '20px',
            border: hasPhoto ? '1px solid #86efac' : '1px solid #fca5a5'
          }}>
            {hasPhoto
              ? bilingual(`✓ ${photoCount} फोटो संलग्न (अनिवार्य पूर्ण)`, `✓ ${photoCount} Photo(s) Attached (Mandatory Met)`)
              : bilingual('⚠️ फोटो अनिवार्य है *', '⚠️ Photo is Mandatory *')}
          </span>
          <span style={{
            fontSize: '0.74rem',
            background: videoCount > 0 ? '#eff6ff' : '#f1f5f9',
            color: videoCount > 0 ? '#1d4ed8' : '#64748b',
            fontWeight: 700,
            padding: '0.2rem 0.65rem',
            borderRadius: '20px',
            border: videoCount > 0 ? '1px solid #bfdbfe' : '1px solid #cbd5e1'
          }}>
            {videoCount > 0
              ? bilingual(`🎥 ${videoCount} वीडियो संलग्न`, `🎥 ${videoCount} Video(s) Attached`)
              : bilingual('🎥 वीडियो वैकल्पिक (Optional)', '🎥 Video Optional')}
          </span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: mediaList.length > 0 ? '0.85rem' : '0' }}>
        {/* Photo Capture via Camera */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ background: '#0b3a6d', borderColor: '#0b3a6d', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800 }}
          onClick={() => cameraPhotoInputRef.current?.click()}
        >
          <Camera size={15} />
          <span>{bilingual('📸 कैमरे से फोटो खींचें (अनिवार्य *)', '📸 Snap Photo with Camera (Mandatory *)')}</span>
        </button>

        {/* Photo Pick from Gallery */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
          onClick={() => multiFileInputRef.current?.click()}
        >
          <Plus size={14} color="#0b3a6d" />
          <span>{bilingual('गैलरी से फोटो चुनें', 'Pick Photo from Gallery')}</span>
        </button>

        {/* Video Record / Upload (Explicitly marked OPTIONAL) */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ borderColor: '#f43f5e', color: '#be123c', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, background: '#fff' }}
          onClick={() => cameraVideoInputRef.current?.click()}
        >
          <Video size={14} color="#e11d48" />
          <span>{bilingual('🎥 वीडियो जोड़ें (वैकल्पिक)', '🎥 Add Video (Optional)')}</span>
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
        <div className="media-gallery-grid" style={{ marginTop: '0.85rem' }}>
          {mediaList.map((item) => (
            <div key={item.id} className="media-item-card">
              {/* Badge */}
              <span className={`media-badge-tag ${item.type === 'video' ? 'media-badge-video' : 'media-badge-photo'}`}>
                {item.type === 'video' ? '🎥 VIDEO (OPTIONAL)' : '📷 PHOTO (MANDATORY)'}
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
                <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Attached</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Vision Status & Auto-Identification Banner */}
      {isAnalyzingImage && (
        <div style={{
          background: '#eff6ff',
          border: '1.5px solid #60a5fa',
          borderRadius: '10px',
          padding: '0.85rem 1rem',
          marginTop: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#1e40af',
          fontSize: '0.88rem',
          fontWeight: 700
        }}>
          <div className="ai-spinner" style={{ width: '20px', height: '20px', borderWidth: '2.5px' }} />
          <span>{bilingual('🔍 AI Vision: फोटो का विश्लेषण कर रहे हैं व समस्या पहचान रहे हैं...', '🔍 AI Vision: Analyzing photo & auto-detecting civic issue...')}</span>
        </div>
      )}

      {aiVisionResult && !isAnalyzingImage && (
        <div style={{
          background: isManualOverride ? '#fffbeb' : '#f0fdf4',
          border: isManualOverride ? '1.5px solid #fcd34d' : '1.5px solid #86efac',
          borderRadius: '12px',
          padding: '1rem',
          marginTop: '0.85rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Sparkles size={18} color={isManualOverride ? '#d97706' : '#15803d'} />
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isManualOverride ? '#92400e' : '#166534' }}>
                {bilingual('🤖 Rewa Sahayak AI Vision पहचान:', '🤖 Rewa Sahayak AI Vision Detected:')}
              </span>
            </div>
            <span style={{
              background: isManualOverride ? '#fef3c7' : '#dcfce7',
              color: isManualOverride ? '#b45309' : '#15803d',
              fontWeight: 800,
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: 12,
              border: isManualOverride ? '1px solid #fde68a' : '1px solid #bbf7d0',
            }}>
              {isManualOverride
                ? bilingual('⚠️ नागरिक द्वारा संशोधित (Overridden)', '⚠️ Citizen Override')
                : bilingual(`✓ स्वतः चयनित (${Math.round(aiVisionResult.confidence * 100)}% विश्वास)`, `✓ Auto-Selected (${Math.round(aiVisionResult.confidence * 100)}% Confidence)`)}
            </span>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: '0.75rem 0.9rem',
            border: '1px solid #e2e8f0',
            marginBottom: '0.5rem'
          }}>
            <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0b3a6d', marginBottom: '0.2rem' }}>
              {categoryIcons[selectedCategory || aiVisionResult.detected_category]} {categoryLabel(selectedCategory || aiVisionResult.detected_category)}
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginLeft: '0.4rem' }}>
                ({selectedCategory && selectedCategory !== aiVisionResult.detected_category ? 'मैन्युअल श्रेणी' : aiVisionResult.detected_subcategory})
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.45 }}>
              👁️ {lang === 'hi' ? aiVisionResult.visual_summary_hi : aiVisionResult.visual_summary_en}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.76rem', color: '#64748b' }}>
            <span>
              🏛️ {bilingual('संबंधित विभाग:', 'Assigned Dept:')} <strong>{bilingual(categoryRoutingDetails[selectedCategory || aiVisionResult.detected_category]?.departmentHi || '', categoryRoutingDetails[selectedCategory || aiVisionResult.detected_category]?.departmentEn || '')}</strong>
            </span>
            {isManualOverride && (
              <button
                type="button"
                onClick={() => {
                  setIsManualOverride(false);
                  setSelectedCategory(aiVisionResult.detected_category);
                  const matchChip = quickProblems.find((p) => p.category === aiVisionResult.detected_category);
                  if (matchChip) setSelectedQuickProblem(matchChip.tagEn);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '0.76rem',
                  padding: 0
                }}
              >
                {bilingual('↩️ पुनः AI पहचान पर सेट करें', '↩️ Revert to AI Vision')}
              </button>
            )}
          </div>
        </div>
      )}

      {!hasPhoto && (
        <p style={{ fontSize: '0.82rem', color: '#9f1239', marginTop: '0.75rem', marginBottom: 0, fontWeight: 700 }}>
          {bilingual(
            '⚠️ रीवा नगर निगम एंटी-फ्रॉड नियम: घटनास्थल की वास्तविक फोटो अनिवार्य है। बिना फोटो के शिकायत सबमिट नहीं हो सकती। (वीडियो वैकल्पिक है)',
            '⚠️ Rewa Municipal Regulation: Genuine photo of the incident spot is compulsory. Complaint cannot be submitted without a photo. (Video is optional)'
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <CivicInsignia size={30} />
            <span className="gov-seal-badge">
              <ShieldCheck size={14} color="var(--gov-navy)" />
              {bilingual('रीवा सहायक AI — नागरिक शिकायत पंजीकरण', 'Rewa Sahayak AI — Civic Grievance Lodging')}
            </span>
            <CivicPrototypeBadge />
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', fontWeight: 900, color: 'var(--gov-navy)', marginBottom: '0.35rem' }}>
            {bilingual('नागरिक शिकायत दर्ज करें', 'Lodge a Civic Complaint')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: 640, margin: '0 auto' }}>
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
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              marginBottom: '1.25rem',
              boxShadow: '0 4px 14px rgba(244,63,94,0.1)'
            }}>
              <ShieldAlert size={36} color="#e11d48" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: 900, color: '#9f1239', fontSize: '0.94rem' }}>
                    {bilingual('🛡️ फर्जी शिकायत रोकथाम नियम (Anti-Fraud Grievance Directive)', '🛡️ Anti-Fraud Grievance Directive')}
                  </span>
                  <span style={{ background: '#e11d48', color: '#ffffff', fontSize: '0.7rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: '4px', letterSpacing: '0.04em' }}>
                    {bilingual('📸 फोटो एवं 📍 लोकेशन अनिवार्य *', 'PHOTO & LOCATION MANDATORY *')}
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem', color: '#881337', lineHeight: 1.55 }}>
                  {bilingual(
                    'रीवा नगर निगम के आदेशानुसार झूठी व फर्जी शिकायतों को रोकने हेतु घटनास्थल की वास्तविक फोटो तथा लोकेशन दर्ज करना अनिवार्य है। (नोट: वीडियो साक्ष्य वैकल्पिक है)।',
                    'As per Rewa Municipal Corporation regulations, genuine photo and location evidence of the incident spot is strictly compulsory to eliminate fake complaints. (Note: Video evidence is optional).'
                  )}
                </p>
              </div>
            </div>

            {/* Fast Quick-Select Chips (1-Tap Problem Selection) */}
            <div className="card" style={{ marginBottom: '1.25rem', background: '#f8fafc', border: '1.5px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0b3a6d' }}>
                  ⚡ {bilingual('अक्सर होने वाली समस्याएं (1-टैप में चुनें):', 'Frequently Reported Issues (1-Tap):')}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 800, background: '#fee2e2', padding: '2px 8px', borderRadius: 12 }}>
                  {bilingual('📷 फोटो अनिवार्य • 📍 लोकेशन अनिवार्य • 🎥 वीडियो वैकल्पिक', '📷 Photo Mandatory • 📍 Location Mandatory • 🎥 Video Optional')}
                </span>
              </div>
              <div className="mobile-quick-chips">
                {quickProblems.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="mobile-quick-chip"
                    onClick={() => handleQuickSelect(p)}
                    style={{
                      border: selectedQuickProblem === p.tagEn ? '2px solid #0b3a6d' : undefined,
                      background: selectedQuickProblem === p.tagEn ? '#eff6ff' : undefined,
                      fontWeight: selectedQuickProblem === p.tagEn ? 800 : undefined,
                    }}
                    title={lang === 'hi' ? p.hi : p.en}
                  >
                    <span>{p.icon}</span>
                    <span>{lang === 'hi' ? p.tagHi : p.tagEn}</span>
                    {selectedQuickProblem === p.tagEn && <span style={{ color: '#15803d', fontSize: '0.75rem' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Notice Guidance Banner */}
            {quickNotice && (
              <div style={{
                background: '#eff6ff',
                border: '1.5px solid #60a5fa',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                color: '#1e40af',
                fontSize: '0.86rem',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(37,99,235,0.08)'
              }}>
                <CheckCircle2 size={20} color="#2563eb" style={{ flexShrink: 0 }} />
                <span>{quickNotice}</span>
              </div>
            )}

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

            {/* Location Section (MANDATORY) */}
            <div style={{
              marginBottom: '1.5rem',
              background: '#fff',
              border: !hasLocation ? '2px solid #f43f5e' : '1.5px solid #22c55e',
              borderRadius: '12px',
              padding: '1.15rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 800, color: '#0b3a6d', fontSize: '0.94rem' }}>
                  📍 {bilingual('घटना स्थल / वार्ड लोकेशन (अनिवार्य *)', 'Incident Location / Ward (Mandatory *)')}
                </label>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '2px 9px',
                  borderRadius: 12,
                  background: hasLocation ? '#dcfce7' : '#fee2e2',
                  color: hasLocation ? '#166534' : '#991b1b',
                  border: hasLocation ? '1px solid #86efac' : '1px solid #fca5a5',
                }}>
                  {hasLocation
                    ? bilingual('✓ लोकेशन दर्ज है', '✓ Location Verified')
                    : bilingual('⚠️ लोकेशन अनिवार्य है *', '⚠️ Location is Mandatory *')}
                </span>
              </div>

              {/* Editable Address Textbox */}
              <div style={{ marginBottom: '0.65rem' }}>
                <input
                  ref={locationInputRef}
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setFormError(null);
                  }}
                  onBlur={async () => {
                    if (!location && address.trim().length >= 4) {
                      try {
                        const geo = await forwardGeocode(address);
                        if (geo) {
                          setLocation(geo.coords);
                          setLocationStatus(bilingual(`✓ पता सत्यापित: ${geo.address}`, `✓ Address Verified: ${geo.address}`));
                        }
                      } catch {
                        // ignore error on blur
                      }
                    }
                  }}
                  placeholder={bilingual(
                    'वार्ड नंबर, मोहल्ला व लैंडमार्क लिखें (उदा. सिविल लाइन्स, सिरमौर चौराहा, या अपना वर्तमान स्थान)...',
                    'Enter Ward, Street, Landmark or your current location (e.g. Civil Lines, Rewa)...'
                  )}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border: !hasLocation ? '1.5px solid #fca5a5' : '1.5px solid #86efac',
                    fontSize: '0.92rem',
                    background: !hasLocation ? '#fff5f5' : '#f0fdf4',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Location Action Buttons */}
              <div className="location-bar" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={getCurrentLocation}
                  disabled={isLocating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: isLocating ? '#dbeafe' : '#eff6ff',
                    borderColor: '#93c5fd',
                    color: '#1e40af',
                    fontWeight: 800,
                    cursor: isLocating ? 'wait' : 'pointer'
                  }}
                >
                  <Navigation size={14} color="#1d4ed8" style={{ animation: isLocating ? 'spin 1s linear infinite' : 'none' }} />
                  <span>
                    {isLocating
                      ? bilingual('GPS सिग्नल ले रहे हैं...', 'Acquiring GPS...')
                      : bilingual('मेरी लाइव GPS लोकेशन लें (Live GPS)', 'Use My Live GPS')}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowMap(!showMap)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
                >
                  <MapPin size={14} color="#ea580c" />
                  <span>{showMap ? bilingual('मैप छुपाएं', 'Hide Map') : bilingual('मैप पर चुनें', 'Select on Map')}</span>
                </button>
              </div>

              {/* Live Location / GPS Status Feedback */}
              {locationStatus && (
                <div style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: locationStatus.includes('⚠️') ? '#b91c1c' : '#15803d',
                  marginBottom: '0.5rem',
                  background: locationStatus.includes('⚠️') ? '#fef2f2' : '#f0fdf4',
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: locationStatus.includes('⚠️') ? '1px solid #fecaca' : '1px solid #bbf7d0',
                  display: 'inline-block'
                }}>
                  {locationStatus}
                </div>
              )}

              {/* Rewa Municipal Wards Quick Selector Chips */}
              <div style={{ marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                  {bilingual('या 1-टैप में रीवा वार्ड चुनें (Quick Ward Pick):', 'Or 1-Tap Pick Rewa Ward:')}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {rewaWards.map((w, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleWardSelect(w.name, w.coords)}
                      style={{
                        background: address.includes(w.name) ? '#eff6ff' : '#f1f5f9',
                        border: address.includes(w.name) ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        color: address.includes(w.name) ? '#1d4ed8' : '#334155',
                        fontWeight: address.includes(w.name) ? 800 : 600,
                        padding: '0.35rem 0.65rem',
                        borderRadius: 6,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                      }}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>

              {showMap && (
                <div style={{ marginTop: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '0.4rem 0.75rem', background: '#f1f5f9', fontSize: '0.75rem', color: '#475569', fontWeight: 600, borderBottom: '1px solid #cbd5e1' }}>
                    💡 {bilingual('मैप पर कहीं भी क्लिक करके या पिन ड्रैग करके सही लोकेशन चुनें', 'Click anywhere on map or drag pin to select accurate spot')}
                  </div>
                  <MapView
                    complaints={[]}
                    selectable
                    selectedPos={location}
                    onSelect={handleMapSelect}
                    height="240px"
                    center={location || [24.5373, 81.3005]}
                    zoom={location ? 16 : 13}
                  />
                </div>
              )}
            </div>

            {/* Anti-Fraud Validation Error Alert */}
            {formError && (
              <div style={{
                background: '#fff1f2',
                border: '1.5px solid #f43f5e',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                color: '#9f1239',
                fontSize: '0.88rem',
                fontWeight: 700,
                boxShadow: '0 2px 10px rgba(244,63,94,0.1)'
              }}>
                <ShieldAlert size={22} color="#e11d48" style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            {/* Anti-Fraud Requirements Checklist */}
            <div style={{
              background: '#f8fafc',
              border: (!hasPhoto || !hasLocation || !text.trim()) ? '1.5px solid #fca5a5' : '1.5px solid #86efac',
              borderRadius: '12px',
              padding: '0.9rem 1rem',
              marginBottom: '1.25rem',
              textAlign: 'left'
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0b3a6d', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheck size={16} color="#0b3a6d" />
                <span>{bilingual('रीवा नगर निगम — अनिवार्य आवश्यकता चेकलिस्ट (Checklist):', 'Rewa Nagar Nigam — Mandatory Checklist:')}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.4rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: text.trim() ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                  <span>{text.trim() ? '✓' : '✕'}</span>
                  <span>{bilingual('1. समस्या विवरण:', '1. Description:')} {text.trim() ? bilingual('दर्ज है', 'Provided') : bilingual('आवश्यक *', 'Required *')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hasPhoto ? '#15803d' : '#dc2626', fontWeight: 800 }}>
                  <span>{hasPhoto ? '✓' : '✕'}</span>
                  <span>{bilingual(`2. फोटो साक्ष्य (${photoCount} फोटो):`, `2. Photo Proof (${photoCount} attached):`)} {hasPhoto ? '✓' : bilingual('अनिवार्य *', 'Mandatory *')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hasLocation ? '#15803d' : '#dc2626', fontWeight: 800 }}>
                  <span>{hasLocation ? '✓' : '✕'}</span>
                  <span>{bilingual('3. स्थल लोकेशन:', '3. Location:')} {hasLocation ? '✓' : bilingual('अनिवार्य *', 'Mandatory *')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontWeight: 600 }}>
                  <span>ℹ️</span>
                  <span>{bilingual(`4. वीडियो साक्ष्य (${videoCount} वीडियो):`, `4. Video Proof (${videoCount}):`)} {bilingual('वैकल्पिक', 'Optional')}</span>
                </div>
              </div>
            </div>

            {/* Primary Submit Action */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  maxWidth: '480px',
                  padding: '1rem',
                  fontSize: '1.05rem',
                  background: (!text.trim() || !hasPhoto || !hasLocation) ? '#64748b' : '#0b3a6d',
                  cursor: (!text.trim() || !hasPhoto || !hasLocation) ? 'not-allowed' : 'pointer',
                  opacity: (!text.trim() || !hasPhoto || !hasLocation) ? 0.75 : 1,
                  boxShadow: (text.trim() && hasPhoto && hasLocation) ? '0 4px 14px rgba(11,58,109,0.3)' : 'none',
                }}
                onClick={handleAnalyze}
              >
                <Sparkles size={20} color="#fbbf24" />
                <span>
                  {!text.trim()
                    ? bilingual('📝 समस्या का विवरण लिखें या चुनें *', '📝 Enter Problem Details *')
                    : !hasPhoto
                    ? bilingual('📸 फोटो साक्ष्य जोड़ना अनिवार्य है *', '📸 Photo Proof is Mandatory *')
                    : !hasLocation
                    ? bilingual('📍 घटना स्थल लोकेशन दर्ज करें *', '📍 Incident Location is Mandatory *')
                    : bilingual('✨ AI से शिकायत तैयार करें (Generate Complaint via AI)', '✨ Generate Complaint via AI')}
                </span>
              </button>
              <p style={{ fontSize: '0.8rem', color: (!hasPhoto || !hasLocation) ? '#b91c1c' : '#64748b', marginTop: '0.5rem', fontWeight: (!hasPhoto || !hasLocation) ? 700 : 400 }}>
                {(!hasPhoto || !hasLocation)
                  ? bilingual(
                      '⚠️ रीवा नगर निगम एंटी-फ्रॉड नियम: फोटो एवं लोकेशन दोनों अनिवार्य हैं। (वीडियो वैकल्पिक है)',
                      '⚠️ Rewa Municipal Anti-Fraud Directive: Photo & Location are both strictly mandatory. (Video is optional)'
                    )
                  : bilingual(
                      '✓ सभी आवश्यकताएं पूर्ण हैं। AI अपने आप विभाग व प्राथमिकता तय करेगा।',
                      '✓ All requirements met. AI will automatically assign department & severity.'
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
              <div className="preview-row" style={{ alignItems: 'flex-start' }}>
                <span className="preview-label">{bilingual('विभाग / श्रेणी', 'Department / Category')}</span>
                <span className="preview-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{ fontWeight: 800 }}>
                      {categoryIcons[analysis.category]} {categoryLabel(analysis.category)} ({analysis.subcategory})
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 800, background: '#eff6ff', borderColor: '#93c5fd', color: '#1e40af' }}
                      onClick={() => setShowCategorySelectModal(true)}
                    >
                      ✏️ {bilingual('श्रेणी बदलें', 'Change Category')}
                    </button>
                  </div>
                  {isManualOverride && (
                    <span style={{ fontSize: '0.7rem', color: '#b45309', background: '#fef3c7', padding: '1px 7px', borderRadius: 4, border: '1px solid #fde68a', fontWeight: 700 }}>
                      ⚠️ {bilingual('नागरिक द्वारा मैन्युअल संशोधित (Manual Override)', 'Citizen Manual Override')}
                    </span>
                  )}
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
              <div className="preview-row" style={{ background: hasPhoto ? '#f0fdf4' : '#fff1f2', borderTop: '1px solid #cbd5e1' }}>
                <span className="preview-label" style={{ color: hasPhoto ? '#166534' : '#9f1239', fontWeight: 800 }}>
                  {bilingual('फोटो साक्ष्य (Photo Proof - अनिवार्य)', 'Photo Proof (Mandatory)')}
                </span>
                <span className="preview-value" style={{ color: hasPhoto ? '#15803d' : '#e11d48', fontWeight: 800 }}>
                  {hasPhoto
                    ? bilingual(`✓ ${photoCount} फोटो संलग्न (सत्यापित साक्ष्य)`, `✓ ${photoCount} Photo(s) Attached (Verified)`)
                    : bilingual('⚠️ अनिवार्य फोटो अनुपलब्ध *', '⚠️ Mandatory Photo Missing *')}
                </span>
              </div>
              <div className="preview-row" style={{ background: hasLocation ? '#f0fdf4' : '#fff1f2' }}>
                <span className="preview-label" style={{ color: hasLocation ? '#166534' : '#9f1239', fontWeight: 800 }}>
                  {bilingual('घटना स्थल लोकेशन (Location - अनिवार्य)', 'Incident Location (Mandatory)')}
                </span>
                <span className="preview-value" style={{ color: hasLocation ? '#15803d' : '#e11d48', fontWeight: 800 }}>
                  {hasLocation ? `${address} ✓` : bilingual('⚠️ लोकेशन दर्ज नहीं है *', '⚠️ Location Missing *')}
                </span>
              </div>
              <div className="preview-row" style={{ background: '#f8fafc' }}>
                <span className="preview-label" style={{ color: '#64748b' }}>
                  {bilingual('वीडियो साक्ष्य (Video Proof - वैकल्पिक)', 'Video Proof (Optional)')}
                </span>
                <span className="preview-value" style={{ color: videoCount > 0 ? '#15803d' : '#64748b', fontWeight: 600 }}>
                  {videoCount > 0
                    ? bilingual(`✓ ${videoCount} वीडियो संलग्न`, `✓ ${videoCount} Video(s) Attached`)
                    : bilingual('संलग्न नहीं (वैकल्पिक)', 'None (Optional)')}
                </span>
              </div>
            </div>

            {hasPhoto && hasLocation ? (
              <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', border: '2px solid #86efac', background: '#f8fafc' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#dcfce7', color: '#166534', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                  <ShieldCheck size={15} />
                  <span>{bilingual(`रीवा नगर निगम डिजिटल साक्ष्य प्रमाणित (${photoCount} फोटो ${videoCount > 0 ? `• ${videoCount} वीडियो` : ''} संलग्न)`, `Rewa Municipal Evidence Verified (${photoCount} Photo(s) Attached)`)}</span>
                </div>

                {/* Multi-Media Gallery Grid in Step 3 Preview */}
                <div className="media-gallery-grid" style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                  {mediaList.map((item) => (
                    <div key={item.id} className="media-item-card">
                      <span className={`media-badge-tag ${item.type === 'video' ? 'media-badge-video' : 'media-badge-photo'}`}>
                        {item.type === 'video' ? '🎥 VIDEO (OPTIONAL)' : '📷 PHOTO (MANDATORY)'}
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
                        <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Attached</span>
                      </div>
                    </div>
                  ))}
                </div>

                {imageAnalysis && (
                  <p style={{ marginTop: '0.65rem', fontSize: '0.85rem', color: '#334155' }}>
                    <strong>AI Vision:</strong> {imageAnalysis.visual_summary}
                  </p>
                )}
                <div style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700, marginTop: '0.35rem' }}>
                  ✓ {bilingual(`भू-निर्देशांक (${location ? `${location[0].toFixed(4)}° N, ${location[1].toFixed(4)}° E` : ''}) एवं टाइमस्टैम्प साक्ष्य सुरक्षित`, `Geo-Coordinates & Timestamp Logged`)}
                </div>
              </div>
            ) : (
              <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', border: '2px solid #f43f5e', background: '#fff1f2' }}>
                <ShieldAlert size={36} color="#e11d48" style={{ margin: '0 auto 0.5rem' }} />
                <h4 style={{ color: '#9f1239', fontWeight: 800, marginBottom: '0.35rem' }}>
                  {!hasPhoto ? bilingual('फोटो साक्ष्य संलग्न नहीं है!', 'Mandatory Photo Evidence Missing!') : bilingual('घटना स्थल लोकेशन दर्ज नहीं है!', 'Mandatory Location Missing!')}
                </h4>
                <p style={{ color: '#881337', fontSize: '0.85rem', marginBottom: '0.85rem' }}>
                  {bilingual(
                    'रीवा नगर निगम एंटी-फ्रॉड नियमों के तहत वास्तविक फोटो तथा लोकेशन दोनों अनिवार्य हैं। कृपया वापस जाकर विवरण पूर्ण करें।',
                    'As per Rewa Municipal anti-fraud rules, genuine spot photo and location are both mandatory.'
                  )}
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ background: '#e11d48', borderColor: '#be123c' }}
                  onClick={() => {
                    setStep('input');
                    if (!hasPhoto) setMode('photo');
                  }}
                >
                  <ArrowLeft size={15} />
                  <span>{bilingual('वापस जाकर साक्ष्य/लोकेशन पूर्ण करें', 'Go Back to Complete Requirements')}</span>
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{
                  background: (!hasPhoto || !hasLocation) ? '#64748b' : '#15803d',
                  borderColor: (!hasPhoto || !hasLocation) ? '#475569' : '#0d5f06',
                  minWidth: '240px',
                  cursor: (!hasPhoto || !hasLocation) ? 'not-allowed' : 'pointer',
                  opacity: (!hasPhoto || !hasLocation) ? 0.7 : 1,
                  boxShadow: (hasPhoto && hasLocation) ? '0 4px 14px rgba(21,128,61,0.3)' : 'none',
                }}
                disabled={!hasPhoto || !hasLocation}
                onClick={handleSubmit}
              >
                <Send size={18} />
                <span>
                  {!hasPhoto
                    ? bilingual('फोटो साक्ष्य अनिवार्य है *', 'Photo Evidence Mandatory *')
                    : !hasLocation
                    ? bilingual('लोकेशन दर्ज करना अनिवार्य है *', 'Location Mandatory *')
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0b3a6d', paddingBottom: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CivicInsignia size={44} />
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gov-navy)', margin: 0 }}>
                      {bilingual('रीवा सहायक AI — नागरिक सेवा', 'Rewa Sahayak AI — Civic Grievance')}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {bilingual(
                        'ई-शिकायत पावती / Civic Grievance E-Acknowledgment',
                        'Civic Grievance E-Acknowledgment Slip'
                      )}
                    </p>
                  </div>
                </div>
                <CivicPrototypeBadge />
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

        {/* ══════════════════════════════════════════════════════════════
            PROFESSIONAL CONFIRMATION MODAL: CATEGORY OVERRIDE ADVISORY
           ══════════════════════════════════════════════════════════════ */}
        {pendingCategoryOverride && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '2px solid #cbd5e1',
              overflow: 'hidden',
              animation: 'modalFadeIn 0.2s ease-out',
            }}>
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #0b3a6d 0%, #1e40af 100%)',
                color: '#ffffff',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ padding: '0.45rem', background: 'rgba(255,255,255,0.15)', borderRadius: '50%' }}>
                    <AlertTriangle size={24} color="#fbbf24" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#ffffff' }}>
                      {bilingual('⚠️ श्रेणी परिवर्तन की पुष्टि करें', '⚠️ Confirm Category Override')}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#bfdbfe' }}>
                      {bilingual('रीवा नगर निगम — AI विज़न बनाम नागरिक चयन', 'Rewa Nagar Nigam — AI Vision vs Manual Selection')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingCategoryOverride(null)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '1.4rem' }}>
                <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
                  {bilingual(
                    'रीवा नगर निगम AI विज़न सिस्टम ने आपके द्वारा संलग्न फोटो साक्ष्य का विश्लेषण करके इस समस्या की स्वतः पहचान की है। क्या आप इसे बदलना चाहते हैं?',
                    'Rewa Municipal AI Vision System analyzed your uploaded photo evidence and automatically categorized this civic issue. Are you sure you wish to override it?'
                  )}
                </p>

                {/* Comparison Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.15rem' }}>
                  {/* AI Vision Card */}
                  <div style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '10px',
                    padding: '0.9rem',
                    position: 'relative'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '12px',
                      background: '#15803d',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}>
                      ✓ {bilingual('AI विज़न पहचान (अनुशंसित)', 'AI Vision (Recommended)')}
                    </span>
                    <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 800, marginBottom: '0.35rem' }}>
                      🤖 {bilingual('AI द्वारा स्वतः चयनित:', 'AI Auto-Detected:')}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                      {categoryIcons[aiVisionResult?.detected_category || 'Waste Management']} {categoryLabel(aiVisionResult?.detected_category || 'Waste Management')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, marginBottom: '0.4rem' }}>
                      ● {bilingual(`विश्वास: ${Math.round((aiVisionResult?.confidence || 0.94) * 100)}%`, `Confidence: ${Math.round((aiVisionResult?.confidence || 0.94) * 100)}%`)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.4, background: '#ffffff', padding: '0.45rem', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                      👁️ {lang === 'hi' ? aiVisionResult?.visual_summary_hi : aiVisionResult?.visual_summary_en}
                    </div>
                  </div>

                  {/* Manual Selection Card */}
                  <div style={{
                    background: '#fef3c7',
                    border: '1.5px solid #fcd34d',
                    borderRadius: '10px',
                    padding: '0.9rem',
                    position: 'relative'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '12px',
                      background: '#b45309',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}>
                      ⚠️ {bilingual('आपका मैन्युअल चयन', 'Your Manual Choice')}
                    </span>
                    <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 800, marginBottom: '0.35rem' }}>
                      👤 {bilingual('नई चुनी गई श्रेणी:', 'New Category Requested:')}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                      {categoryIcons[pendingCategoryOverride.targetCategory]} {categoryLabel(pendingCategoryOverride.targetCategory)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 700, marginBottom: '0.4rem' }}>
                      🏛️ {bilingual('नया विभाग:', 'Target Department:')} {bilingual(categoryRoutingDetails[pendingCategoryOverride.targetCategory].departmentHi, categoryRoutingDetails[pendingCategoryOverride.targetCategory].departmentEn)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.4, background: '#ffffff', padding: '0.45rem', borderRadius: 6, border: '1px solid #fde68a' }}>
                      ⏱️ {bilingual(`अपेक्षित निवारण SLA: ${categoryRoutingDetails[pendingCategoryOverride.targetCategory].slaHours} घंटे`, `Resolution SLA: ${categoryRoutingDetails[pendingCategoryOverride.targetCategory].slaHours} Hours`)}
                    </div>
                  </div>
                </div>

                {/* Administrative Advisory */}
                <div style={{
                  background: '#f8fafc',
                  borderLeft: '4px solid #2563eb',
                  padding: '0.75rem 1rem',
                  borderRadius: '0 8px 8px 0',
                  marginBottom: '1.25rem',
                  fontSize: '0.8rem',
                  color: '#1e293b',
                  lineHeight: 1.5
                }}>
                  <strong>📋 {bilingual('प्रशासनिक प्रभाव (Administrative Advisory):', 'Administrative Routing Notice:')}</strong><br />
                  {bilingual(
                    `श्रेणी बदलने पर यह शिकायत ${categoryRoutingDetails[pendingCategoryOverride.targetCategory].departmentHi} को स्थानांतरित होगी, जिससे जोनल फील्ड टीम का आवंटन व कार्रवाई बदल जाएगी।`,
                    `Changing category will reroute this complaint to ${categoryRoutingDetails[pendingCategoryOverride.targetCategory].departmentEn}, altering field team dispatch.`
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      background: '#15803d',
                      borderColor: '#166534',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontWeight: 800
                    }}
                    onClick={cancelCategoryOverride}
                  >
                    <Sparkles size={16} color="#ffffff" />
                    <span>
                      {bilingual(
                        `🤖 AI पहचान रखें (${categoryLabel(aiVisionResult?.detected_category || 'Waste Management')})`,
                        `Keep AI Vision (${categoryLabel(aiVisionResult?.detected_category || 'Waste Management')})`
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      borderColor: '#cbd5e1',
                      color: '#0f172a',
                      fontWeight: 700
                    }}
                    onClick={confirmCategoryOverride}
                  >
                    <span>
                      {bilingual(
                        `✓ हाँ, मेरी श्रेणी लागू करें (${categoryLabel(pendingCategoryOverride.targetCategory)})`,
                        `Confirm & Change to ${categoryLabel(pendingCategoryOverride.targetCategory)}`
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            CATEGORY SELECTOR MODAL (FOR PREVIEW STEP)
           ══════════════════════════════════════════════════════════════ */}
        {showCategorySelectModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99998,
            padding: '1rem',
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              border: '1.5px solid #cbd5e1',
              overflow: 'hidden',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: '1.15rem 1.4rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0b3a6d' }}>
                  {bilingual('रीवा नगर निगम — श्रेणी चुनें', 'Select Municipal Grievance Category')}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCategorySelectModal(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {allCategories.map((cat) => {
                  const isCurrent = (analysis?.category === cat) || (selectedCategory === cat);
                  const isAiChoice = aiVisionResult?.detected_category === cat;
                  const routing = categoryRoutingDetails[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleManualCategorySelect(cat)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: isCurrent ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: isCurrent ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ fontSize: '1.35rem' }}>{categoryIcons[cat]}</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isCurrent ? '#1d4ed8' : '#0f172a' }}>
                            {categoryLabel(cat)}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {bilingual(routing.departmentHi, routing.departmentEn)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {isAiChoice && (
                          <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#166534', fontWeight: 800, padding: '2px 7px', borderRadius: 8, border: '1px solid #86efac' }}>
                            🤖 AI Choice
                          </span>
                        )}
                        {isCurrent && (
                          <span style={{ fontSize: '0.9rem', color: '#2563eb', fontWeight: 900 }}>
                            ✓
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
