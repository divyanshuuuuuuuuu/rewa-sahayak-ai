import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Camera, MapPin, Send, CheckCircle2, Navigation,
  Sparkles, Printer, ArrowLeft, ShieldCheck, Video, Trash2,
  AlertTriangle, RefreshCw, X
} from 'lucide-react';
import {
  analyzeProblemDemo, analyzeImageDemo, analyzeCivicImageAsync, categoryRoutingDetails,
  type CivicVisionResult, severityColors, categoryIcons
} from '../services/ai';
import { createComplaint } from '../services/store';
import { uploadReportImage, getImageUrl } from '../services/supabaseStore';
import { getCivicVideoPosterSvg, createSampleCivicVideoBlob } from '../services/evidenceSvg';
import type { AIAnalysis, CivicMedia, Category } from '../types';
import MapView from '../components/MapView';
import { CivicInsignia, CivicPrototypeBadge } from '../components/Emblem';
import { useGov } from '../context/GovContext';
import { reverseGeocode, forwardGeocode } from '../services/geocode';

type ReportStep = 'input' | 'processing' | 'preview' | 'submitted';

export default function Report() {
  const navigate = useNavigate();
  const { lang, bilingual, moduleLabel, categoryLabel } = useGov();
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
  const [fieldErrors, setFieldErrors] = useState<{ text?: string; photo?: string; location?: string }>({});
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
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
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [showMap, setShowMap] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Derived media values
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

  const quickProblems = [
    {
      hi: 'वार्ड में 4 दिन से कचरा नहीं उठाया गया है',
      en: 'Garbage has not been collected in our ward for 4 days',
      tagHi: 'कचरा नहीं उठा',
      tagEn: 'Garbage Not Picked',
      icon: '🗑️',
      category: 'Waste Management' as Category,
    },
    {
      hi: 'मुख्य पाइपलाइन में लीकेज है, भारी मात्रा में पेयजल व्यर्थ बह रहा है',
      en: 'Main drinking water pipeline is leaking heavily on the street',
      tagHi: 'पानी पाइप लीकेज',
      tagEn: 'Water Pipe Leak',
      icon: '💧',
      category: 'Water & Leakage' as Category,
    },
    {
      hi: 'सड़क की स्ट्रीट लाइट पिछले 1 सप्ताह से बंद पड़ी है, रात में अंधेरा रहता है',
      en: 'Streetlights have been non-functional for a week, causing darkness at night',
      tagHi: 'स्ट्रीट लाइट बंद',
      tagEn: 'Streetlight Off',
      icon: '💡',
      category: 'Streetlights' as Category,
    },
    {
      hi: 'सड़क पर बड़ा और खतरनाक गड्ढा है, दुर्घटना का खतरा बना हुआ है',
      en: 'Large dangerous pothole on the main road causing accident risk',
      tagHi: 'सड़क पर गड्ढा',
      tagEn: 'Road Pothole',
      icon: '🕳️',
      category: 'Roads & Potholes' as Category,
    },
    {
      hi: 'नाली जाम हो गई है, गंदा बदबूदार पानी सड़क पर बह रहा है',
      en: 'Drainage is choked and dirty sewage water is overflowing onto the street',
      tagHi: 'नाली जाम/गंदा पानी',
      tagEn: 'Drainage Overflow',
      icon: '🌊',
      category: 'Waterlogging & Drainage' as Category,
    },
    {
      hi: 'कचरा डिपो भर चुका है और चारों तरफ गंदगी फैली हुई है',
      en: 'Public waste bin is overflowing with garbage scattered everywhere',
      tagHi: 'डस्टबिन ओवरफ्लो',
      tagEn: 'Dustbin Overflow',
      icon: '📦',
      category: 'Waste Management' as Category,
    },
  ];

  const handleQuickSelect = (prob: (typeof quickProblems)[0]) => {
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
    setFieldErrors((prev) => ({ ...prev, text: undefined }));
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

  const triggerImageVision = async (file: File | string) => {
    setIsAnalyzingImage(true);
    try {
      const vision = await analyzeCivicImageAsync(file, text);
      setAiVisionResult(vision);
      setImageAnalysis(vision);

      if (!isManualOverride) {
        setSelectedCategory(vision.detected_category);
        const matchChip = quickProblems.find((p) => p.category === vision.detected_category);
        if (matchChip) {
          setSelectedQuickProblem(matchChip.tagEn);
        }
        if (!text.trim() || text.trim().length < 15) {
          setText(lang === 'hi' ? vision.suggested_description_hi : vision.suggested_description_en);
          setFieldErrors((prev) => ({ ...prev, text: undefined }));
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
      setText((prev) => {
        const separator = prev.trim() ? ' ' : '';
        return prev + separator + transcript;
      });
      setFieldErrors((prevErrors) => ({ ...prevErrors, text: undefined }));
      setVoiceStatus(bilingual('📝 लिखा जा रहा है...', '📝 Transcribing audio...'));
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event.error === 'no-speech') {
        setVoiceStatus(
          bilingual(
            'आवाज़ नहीं सुनाई दी। पुनः प्रयास करें।',
            'No voice detected. Tap mic to try again.'
          )
        );
      } else {
        setVoiceStatus(
          bilingual(
            `माइक्रोफोन त्रुटि (${event.error})। आप समस्या टाइप भी कर सकते हैं।`,
            `Microphone error (${event.error}). You can type your problem above.`
          )
        );
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (text) {
        setVoiceStatus(
          bilingual('✅ आवाज़ विवरण में जुड़ गई!', '✅ Voice transcribed into description!')
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
          '✅ रिकॉर्डिंग पूर्ण हुई।',
          '✅ Recording completed.'
        )
      );
    }
  }, [bilingual]);

  // Photo & Video File Handlers
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
    setFieldErrors((prev) => ({ ...prev, photo: undefined }));
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

  // Mobile GPS Geolocation Fix with Progressive Fallback
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        bilingual(
          'आपके ब्राउज़र में जियोलोकेशन (GPS) सुविधा समर्थित नहीं है।',
          'Geolocation is not supported by your browser.'
        )
      );
      return;
    }

    // Check secure context for mobile devices
    if (
      typeof window !== 'undefined' &&
      window.isSecureContext === false &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setLocationError(
        bilingual(
          'मोबाइल में GPS के लिए सुरक्षित (HTTPS) कनेक्शन आवश्यक है। कृपया नीचे से वार्ड चुनें या पता टाइप करें।',
          'Mobile geolocation requires a secure (HTTPS) connection. Please select your ward or type address below.'
        )
      );
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setLocationStatus(
      bilingual('📍 वास्तविक लाइव GPS सिग्नल खोज रहे हैं...', '📍 Acquiring live GPS signal...')
    );

    const onPositionSuccess = async (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy || 0);

      setLocation([lat, lng]);
      const coordLabel = `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`;
      setAddress(`GPS: ${coordLabel}`);
      setFieldErrors((prev) => ({ ...prev, location: undefined }));
      setLocationError(null);

      setLocationStatus(
        bilingual(
          `📍 GPS प्राप्त (${coordLabel}) • सटीकता ~${accuracy}m... पता खोज रहे हैं...`,
          `📍 GPS Locked (${coordLabel}) • Acc ~${accuracy}m... Resolving address...`
        )
      );

      try {
        const resolvedAddress = await reverseGeocode(lat, lng);
        setAddress(`${resolvedAddress} (${coordLabel})`);
        setLocationStatus(
          bilingual(
            `✓ लाइव GPS सत्यापित: ${resolvedAddress}`,
            `✓ Live GPS Verified: ${resolvedAddress}`
          )
        );
      } catch {
        setAddress(`GPS: ${coordLabel}`);
        setLocationStatus(
          bilingual(
            `✓ लाइव GPS निर्देशांक दर्ज (${coordLabel})`,
            `✓ Live GPS Coordinates Logged (${coordLabel})`
          )
        );
      } finally {
        setIsLocating(false);
      }
    };

    // Attempt high accuracy first (10s timeout, 30s cache)
    navigator.geolocation.getCurrentPosition(
      onPositionSuccess,
      (err) => {
        // If timeout (code 3) or position unavailable (code 2), attempt standard accuracy fallback
        if (err.code === 3 || err.code === 2) {
          setLocationStatus(
            bilingual(
              '📡 उच्च-सटीक GPS में समय लगा, नेटवर्क लोकेशन से पुनः प्रयास कर रहे हैं...',
              '📡 High-accuracy GPS timed out, trying standard network location...'
            )
          );

          navigator.geolocation.getCurrentPosition(
            onPositionSuccess,
            (fallbackErr) => {
              setIsLocating(false);
              setLocationStatus(null);
              if (fallbackErr.code === 1) {
                setLocationError(
                  bilingual(
                    'लोकेशन अनुमति अस्वीकृत (Permission Denied)। कृपया ब्राउज़र सेटिंग्स में अनुमति दें, या नीचे से वार्ड चुनें।',
                    'Location permission denied. Please enable location permissions in browser settings, or select your ward below.'
                  )
                );
              } else if (fallbackErr.code === 3) {
                setLocationError(
                  bilingual(
                    'GPS सिग्नल प्राप्त करने में समय समाप्त हो गया। कृपया पुनः प्रयास करें या नीचे से वार्ड चुनें।',
                    'GPS request timed out. Please tap Retry GPS or choose your ward below.'
                  )
                );
              } else {
                setLocationError(
                  bilingual(
                    'GPS सिग्नल अनुपलब्ध है। कृपया अपना वार्ड चुनें या पता दर्ज करें।',
                    'GPS signal unavailable. Please select your ward or type address below.'
                  )
                );
              }
            },
            {
              enableHighAccuracy: false,
              timeout: 12000,
              maximumAge: 60000,
            }
          );
        } else if (err.code === 1) {
          setIsLocating(false);
          setLocationStatus(null);
          setLocationError(
            bilingual(
              'लोकेशन अनुमति अस्वीकृत (Permission Denied)। कृपया ब्राउज़र सेटिंग्स में अनुमति दें, या नीचे से वार्ड चुनें।',
              'Location permission denied. Please allow location access in your browser settings, or select your ward below.'
            )
          );
        } else {
          setIsLocating(false);
          setLocationStatus(null);
          setLocationError(
            bilingual(
              'GPS सिग्नल अनुपलब्ध है। कृपया अपना वार्ड चुनें या पता टाइप करें।',
              'GPS signal unavailable. Please select your ward or enter address below.'
            )
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const handleMapSelect = async (lat: number, lng: number) => {
    setLocation([lat, lng]);
    const coordLabel = `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`;
    setAddress(`मैप स्थान: ${coordLabel}`);
    setLocationStatus(bilingual(`मैप पिन: ${coordLabel}`, `Map Pin: ${coordLabel}`));
    setLocationError(null);
    setFieldErrors((prev) => ({ ...prev, location: undefined }));
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
    setLocationError(null);
    setFieldErrors((prev) => ({ ...prev, location: undefined }));
  };

  // Submit for AI analysis with contextual field-level validation
  const handleAnalyze = async () => {
    const errors: { text?: string; photo?: string; location?: string } = {};

    if (!text.trim()) {
      errors.text = bilingual(
        'कृपया अपनी समस्या का विवरण लिखें, बोलें या ऊपर दिए गए विकल्पों में से चुनें।',
        'Please describe your problem by typing, speaking, or picking a quick issue.'
      );
    }

    if (!hasPhoto) {
      errors.photo = bilingual(
        'शिकायत दर्ज करने के लिए फोटो साक्ष्य संलग्न करना अनिवार्य है।',
        'Photo evidence is required to register and verify your grievance.'
      );
    }

    if (!address.trim() || address.trim().length < 4 || !location) {
      errors.location = bilingual(
        'घटना स्थल या वार्ड दर्ज करना अनिवार्य है ताकि संबंधित विभाग को भेजा जा सके।',
        'Incident location and ward are required for department routing.'
      );
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.text) {
        textInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        textInputRef.current?.focus();
      } else if (errors.photo) {
        evidenceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errors.location) {
        locationInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        locationInputRef.current?.focus();
      }
      return;
    }

    setFieldErrors({});
    setStep('processing');
    await new Promise((r) => setTimeout(r, 1200));

    const chosenCat = selectedCategory || (aiVisionResult ? aiVisionResult.detected_category : undefined);
    const result = analyzeProblemDemo(text || 'Civic problem reported with verified evidence', chosenCat);
    setAnalysis(result);

    const imgResult = aiVisionResult || analyzeImageDemo(chosenCat);
    setImageAnalysis(imgResult);

    setStep('preview');
  };

  const handleSubmit = async () => {
    if (!analysis || !location) return;

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
      voice_transcript: text,
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
    setFieldErrors({});
    setLocation(null);
    setAddress('');
    setLocationStatus(null);
    setLocationError(null);
    setStep('input');
  };

  return (
    <div className="page fade-in">
      <div className="container report-container">

        {/* Official Civic Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
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
              'विवरण लिखें, फोटो जोड़ें, अपनी लोकेशन साझा करें और बोलकर जानकारी जोड़ें — AI सही विभाग तक पहुंचाएगा।',
              'Describe your issue, attach a photo, share your location, and add voice details — AI will route it.'
            )}
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            STEP 1: SEQUENTIAL REPORTING CONTROLS
            1. Text input / description at the top
            2. Photo-upload control in appropriate position
            3. Location selection and confirmation
            4. Voice / Speak control at the bottom
           ══════════════════════════════════════════════════════════════ */}
        {step === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* 1. TEXT INPUT & COMPLAINT DESCRIPTION AT TOP */}
            <div className="card" style={{ padding: '1.25rem', textAlign: 'left', border: fieldErrors.text ? '1.5px solid #dc2626' : '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 800, color: '#0b3a6d', fontSize: '0.95rem' }}>
                  1. {bilingual('समस्या का विवरण (Problem Description) *', 'Problem Description *')}
                </label>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {bilingual('अनिवार्य क्षेत्र', 'Mandatory Field')}
                </span>
              </div>

              {/* Quick Select Chips */}
              <div style={{ marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  ⚡ {bilingual('त्वरित विकल्प (1-टैप में चुनें):', 'Quick Options (1-Tap):')}
                </span>
                <div className="mobile-quick-chips">
                  {quickProblems.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="mobile-quick-chip"
                      onClick={() => handleQuickSelect(p)}
                      style={{
                        border: selectedQuickProblem === p.tagEn ? '2px solid #0b3a6d' : '1px solid #cbd5e1',
                        background: selectedQuickProblem === p.tagEn ? '#eff6ff' : '#f8fafc',
                        fontWeight: selectedQuickProblem === p.tagEn ? 800 : 500,
                        color: selectedQuickProblem === p.tagEn ? '#0b3a6d' : '#334155'
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

              <textarea
                ref={textInputRef}
                className="text-input-area"
                style={{
                  minHeight: '100px',
                  border: fieldErrors.text ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  background: fieldErrors.text ? '#fef2f2' : '#ffffff'
                }}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (fieldErrors.text) {
                    setFieldErrors((prev) => ({ ...prev, text: undefined }));
                  }
                }}
                placeholder={bilingual(
                  'अपनी समस्या विस्तार से लिखें (उदा. हमारे वार्ड 12 में मुख्य सड़क पर पेयजल पाइपलाइन फूट गई है और भारी मात्रा में पानी बह रहा है...)',
                  'Describe your civic problem (e.g. water pipeline leakage in Civil Lines, garbage accumulation near school...)'
                )}
                aria-label="Problem description"
              />

              {fieldErrors.text && (
                <p style={{ margin: '0.4rem 0 0', color: '#dc2626', fontSize: '0.82rem', fontWeight: 700 }}>
                  ⚠️ {fieldErrors.text}
                </p>
              )}
            </div>

            {/* 2. PHOTO UPLOAD CONTROL (SINGLE CLEAN INTERFACE, NO DUPLICATE CAMERA BUTTON) */}
            <div
              ref={evidenceSectionRef}
              className="card"
              style={{
                padding: '1.25rem',
                textAlign: 'left',
                border: fieldErrors.photo ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 800, color: '#0b3a6d', fontSize: '0.95rem' }}>
                  2. {bilingual('फोटो साक्ष्य (Photo Evidence) *', 'Photo Evidence *')}
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.74rem',
                    background: hasPhoto ? '#dcfce7' : '#f1f5f9',
                    color: hasPhoto ? '#15803d' : '#64748b',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    border: hasPhoto ? '1px solid #86efac' : '1px solid #cbd5e1'
                  }}>
                    {hasPhoto
                      ? bilingual(`✓ ${photoCount} फोटो संलग्न`, `✓ ${photoCount} Photo(s) Attached`)
                      : bilingual('फोटो आवश्यक *', 'Photo Required *')}
                  </span>
                  <span style={{
                    fontSize: '0.74rem',
                    background: '#f1f5f9',
                    color: '#64748b',
                    fontWeight: 600,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    border: '1px solid #cbd5e1'
                  }}>
                    {videoCount > 0
                      ? bilingual(`🎥 ${videoCount} वीडियो`, `🎥 ${videoCount} Video(s)`)
                      : bilingual('वीडियो वैकल्पिक', 'Video Optional')}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '0.85rem' }}>
                {bilingual(
                  'समस्या स्थल की स्पष्ट फोटो संलग्न करें। मोबाइल पर कैमरा व गैलरी दोनों का विकल्प उपलब्ध है।',
                  'Attach clear photo evidence of the issue. Supports both camera capture and photo upload.'
                )}
              </p>

              {/* Single Clear Photo Attachment Action Toolbar */}
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                  onClick={() => multiFileInputRef.current?.click()}
                >
                  <Camera size={16} />
                  <span>{bilingual('फोटो संलग्न करें (कैमरा / गैलरी)', 'Attach Photo (Camera / Gallery)')}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                  onClick={() => cameraVideoInputRef.current?.click()}
                >
                  <Video size={15} color="#475569" />
                  <span>{bilingual('वीडियो जोड़ें (वैकल्पिक)', 'Add Video (Optional)')}</span>
                </button>
              </div>

              {/* Hidden File Inputs */}
              <input
                ref={multiFileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFilesSelect}
              />
              <input
                ref={cameraVideoInputRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={handleCameraVideoSelect}
              />

              {fieldErrors.photo && (
                <p style={{ margin: '0.6rem 0 0', color: '#dc2626', fontSize: '0.82rem', fontWeight: 700 }}>
                  ⚠️ {fieldErrors.photo}
                </p>
              )}

              {/* Attached Media List */}
              {mediaList.length > 0 && (
                <div className="media-gallery-grid" style={{ marginTop: '0.9rem' }}>
                  {mediaList.map((item) => (
                    <div key={item.id} className="media-item-card">
                      <span className={`media-badge-tag ${item.type === 'video' ? 'media-badge-video' : 'media-badge-photo'}`}>
                        {item.type === 'video' ? '🎥 VIDEO' : '📷 PHOTO'}
                      </span>
                      <button
                        type="button"
                        className="media-remove-btn"
                        title={bilingual('हटाएं', 'Remove')}
                        onClick={() => removeMediaItem(item.id)}
                      >
                        ✕
                      </button>
                      <div className="media-thumb-container">
                        {item.type === 'video' ? (
                          <video src={item.url} controls playsInline className="media-video-player" />
                        ) : (
                          <img src={item.url} alt={item.name} className="media-thumb-img" />
                        )}
                      </div>
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

              {/* AI Vision Status */}
              {isAnalyzingImage && (
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginTop: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: '#1e40af',
                  fontSize: '0.86rem',
                  fontWeight: 600
                }}>
                  <div className="ai-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                  <span>{bilingual('AI Vision: फोटो का विश्लेषण कर समस्या पहचानी जा रही है...', 'AI Vision: Analyzing image to detect civic issue...')}</span>
                </div>
              )}

              {aiVisionResult && !isAnalyzingImage && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  marginTop: '0.85rem',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={16} color="#0b3a6d" />
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0b3a6d' }}>
                        {bilingual('AI विज़न पहचान:', 'AI Vision Detected:')}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700 }}>
                      ✓ {Math.round(aiVisionResult.confidence * 100)}% {bilingual('विश्वास', 'Confidence')}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                    {categoryIcons[selectedCategory || aiVisionResult.detected_category]} {categoryLabel(selectedCategory || aiVisionResult.detected_category)}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569' }}>
                    {lang === 'hi' ? aiVisionResult.visual_summary_hi : aiVisionResult.visual_summary_en}
                  </p>
                </div>
              )}
            </div>

            {/* 3. LOCATION SELECTION AND CONFIRMATION */}
            <div
              className="card"
              style={{
                padding: '1.25rem',
                textAlign: 'left',
                border: fieldErrors.location ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 800, color: '#0b3a6d', fontSize: '0.95rem' }}>
                  3. {bilingual('घटना स्थल व वार्ड (Incident Location & Ward) *', 'Incident Location & Ward *')}
                </label>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '2px 9px',
                  borderRadius: 12,
                  background: hasLocation ? '#dcfce7' : '#f1f5f9',
                  color: hasLocation ? '#166534' : '#64748b',
                  border: hasLocation ? '1px solid #86efac' : '1px solid #cbd5e1',
                }}>
                  {hasLocation
                    ? bilingual('✓ लोकेशन चयनित', '✓ Location Selected')
                    : bilingual('लोकेशन आवश्यक *', 'Location Required *')}
                </span>
              </div>

              {/* Address Input */}
              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  ref={locationInputRef}
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (fieldErrors.location) {
                      setFieldErrors((prev) => ({ ...prev, location: undefined }));
                    }
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
                        // ignore blur geocode error
                      }
                    }
                  }}
                  placeholder={bilingual(
                    'वार्ड नंबर, मोहल्ला, सड़क या लैंडमार्क दर्ज करें (उदा. सिविल लाइन्स, सिरमौर चौराहा, रीवा)...',
                    'Enter Ward, Street, Landmark or area in Rewa...'
                  )}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '8px',
                    border: fieldErrors.location ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    background: fieldErrors.location ? '#fef2f2' : '#ffffff',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Location Actions: GPS & Map */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={getCurrentLocation}
                  disabled={isLocating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 700,
                    background: isLocating ? '#f1f5f9' : '#ffffff',
                    color: '#0b3a6d',
                    cursor: isLocating ? 'wait' : 'pointer'
                  }}
                >
                  <Navigation size={14} color="#0b3a6d" style={{ animation: isLocating ? 'spin 1s linear infinite' : 'none' }} />
                  <span>
                    {isLocating
                      ? bilingual('GPS सिग्नल ले रहे हैं...', 'Acquiring GPS...')
                      : bilingual('मेरी लाइव GPS लोकेशन लें', 'Use My Live GPS')}
                  </span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowMap(!showMap)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                >
                  <MapPin size={14} color="#ea580c" />
                  <span>{showMap ? bilingual('मैप छुपाएं', 'Hide Map') : bilingual('मैप पर चुनें', 'Select on Map')}</span>
                </button>
              </div>

              {/* GPS Inline Status or Error with Clear Retry Action */}
              {locationStatus && (
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#15803d',
                  marginBottom: '0.5rem',
                  background: '#f0fdf4',
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #bbf7d0',
                  display: 'inline-block'
                }}>
                  {locationStatus}
                </div>
              )}

              {locationError && (
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#b91c1c',
                  marginBottom: '0.65rem',
                  background: '#fef2f2',
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <span>⚠️ {locationError}</span>
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #fca5a5',
                      color: '#b91c1c',
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <RefreshCw size={12} />
                    <span>{bilingual('पुनः प्रयास करें', 'Retry GPS')}</span>
                  </button>
                </div>
              )}

              {fieldErrors.location && (
                <p style={{ margin: '0 0 0.5rem', color: '#dc2626', fontSize: '0.82rem', fontWeight: 700 }}>
                  ⚠️ {fieldErrors.location}
                </p>
              )}

              {/* Rewa Ward Chips */}
              <div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  {bilingual('या 1-टैप में रीवा वार्ड चुनें:', 'Or 1-Tap Pick Rewa Ward:')}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {rewaWards.map((w, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleWardSelect(w.name, w.coords)}
                      style={{
                        background: address.includes(w.name) ? '#eff6ff' : '#f8fafc',
                        border: address.includes(w.name) ? '1.5px solid #0b3a6d' : '1px solid #cbd5e1',
                        color: address.includes(w.name) ? '#0b3a6d' : '#334155',
                        fontWeight: address.includes(w.name) ? 800 : 500,
                        padding: '0.3rem 0.65rem',
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

              {/* Map View */}
              {showMap && (
                <div style={{ marginTop: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '0.4rem 0.75rem', background: '#f1f5f9', fontSize: '0.75rem', color: '#475569', fontWeight: 600, borderBottom: '1px solid #cbd5e1' }}>
                    💡 {bilingual('मैप पर क्लिक करके सही स्थान चुनें', 'Click on map to select spot')}
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

            {/* 4. VOICE OR SPEAK CONTROL AT THE BOTTOM */}
            <div className="card" style={{ padding: '1.25rem', textAlign: 'center', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 800, color: '#0b3a6d', fontSize: '0.95rem' }}>
                  4. {bilingual('बोलकर बताएं (Voice Input - Optional)', 'Voice Input (Optional Helper)')}
                </label>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {bilingual('हिंदी / बघेली / English समर्थित', 'Hindi / Bagheli / English')}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.75rem 0' }}>
                <button
                  type="button"
                  className={`mic-btn ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
                  style={{ width: '64px', height: '64px', margin: '0 0 0.5rem' }}
                >
                  {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                </button>
                <p className="mic-status" style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>
                  {voiceStatus ||
                    bilingual(
                      'माइक दबाएं और बोलें — आवाज़ अपने आप ऊपर विवरण में जुड़ जाएगी',
                      'Tap mic and speak — your voice will be transcribed into the description above'
                    )}
                </p>
              </div>
            </div>

            {/* 5. PRIMARY SUBMIT ACTION */}
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  maxWidth: '440px',
                  padding: '0.95rem',
                  fontSize: '1.05rem',
                  background: '#0b3a6d',
                  boxShadow: '0 4px 14px rgba(11,58,109,0.25)'
                }}
                onClick={handleAnalyze}
              >
                <Sparkles size={18} color="#fbbf24" />
                <span>{bilingual('AI से शिकायत तैयार करें', 'Generate Complaint via AI')}</span>
              </button>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem' }}>
                {bilingual(
                  'विवरण, फोटो तथा लोकेशन के आधार पर AI स्वतः सही विभाग व प्राथमिकता तय करेगा।',
                  'AI will automatically categorize your complaint and assign the right civic department.'
                )}
              </p>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 2: AI PROCESSING
           ══════════════════════════════════════════════════════════════ */}
        {step === 'processing' && (
          <div className="ai-processing card" style={{ background: '#ffffff', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div className="ai-spinner" style={{ margin: '0 auto 1.25rem' }} />
            <h3 style={{ color: '#0b3a6d', fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              🤖 {bilingual('AI आपकी शिकायत तैयार कर रहा है...', 'AI is structuring your complaint...')}
            </h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', maxWidth: 520, margin: '0 auto' }}>
              {bilingual(
                'प्राकृतिक भाषा विश्लेषण • साक्ष्य सत्यापन • संबंधित विभाग चयन (कचरा/जल/सड़क/प्रकाश) • प्राथमिकता निर्धारण',
                'Language analysis • Evidence verification • Department routing • Priority scoring'
              )}
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 3: CITIZEN PREVIEW & CONFIRMATION
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
                  'Review details below and confirm submission to Rewa Municipal Corporation.'
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
                      style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 700 }}
                      onClick={() => setShowCategorySelectModal(true)}
                    >
                      ✏️ {bilingual('श्रेणी बदलें', 'Change Category')}
                    </button>
                  </div>
                  {isManualOverride && (
                    <span style={{ fontSize: '0.7rem', color: '#b45309', background: '#fef3c7', padding: '1px 7px', borderRadius: 4, fontWeight: 700 }}>
                      {bilingual('नागरिक द्वारा संशोधित', 'Citizen Override')}
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
                  {bilingual('अनुशंसित कार्रवाई', 'Recommended Action')}
                </span>
                <span className="preview-value" style={{ color: '#92400e', fontSize: '0.85rem' }}>
                  {analysis.recommended_action}
                </span>
              </div>
              <div className="preview-row" style={{ background: '#f8fafc' }}>
                <span className="preview-label">{bilingual('संलग्न साक्ष्य', 'Attached Evidence')}</span>
                <span className="preview-value" style={{ color: '#15803d', fontWeight: 700 }}>
                  ✓ {photoCount} {bilingual('फोटो', 'Photo(s)')} {videoCount > 0 ? `• ${videoCount} वीडियो` : ''}
                </span>
              </div>
            </div>

            {/* Media Gallery in Preview */}
            {hasMedia && (
              <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                  {bilingual('संलग्न फोटो/वीडियो साक्ष्य:', 'Attached Evidence Media:')}
                </span>
                <div className="media-gallery-grid" style={{ marginBottom: '0.5rem' }}>
                  {mediaList.map((item) => (
                    <div key={item.id} className="media-item-card">
                      <div className="media-thumb-container">
                        {item.type === 'video' ? (
                          <video src={item.url} controls playsInline className="media-video-player" />
                        ) : (
                          <img src={item.url} alt={item.name} className="media-thumb-img" />
                        )}
                      </div>
                      <div className="media-item-info">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', fontWeight: 600 }}>
                          {item.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{
                  background: '#15803d',
                  borderColor: '#166534',
                  minWidth: '240px',
                  boxShadow: '0 4px 14px rgba(21,128,61,0.25)',
                }}
                onClick={handleSubmit}
              >
                <Send size={18} />
                <span>{bilingual('पुष्टि करें एवं शिकायत दर्ज करें', 'Confirm & Submit Grievance')}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => setStep('input')}
              >
                <ArrowLeft size={16} />
                <span>{bilingual('संशोधन करें', 'Edit / Back')}</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 4: OFFICIAL E-ACKNOWLEDGMENT RECEIPT (पावती)
           ══════════════════════════════════════════════════════════════ */}
        {step === 'submitted' && (
          <div className="fade-in">
            <div className="gov-receipt-card">
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

              <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <CheckCircle2 size={24} color="#15803d" />
                <div>
                  <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.95rem' }}>
                    {bilingual('शिकायत सफलतापूर्वक दर्ज कर ली गई है', 'Complaint Successfully Registered')}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#14532d' }}>
                    {bilingual(
                      'संबंधित जोनल अधिकारी को प्रेषित की गई है।',
                      'Assigned to Rewa Municipal Corporation Zonal Officer.'
                    )}
                  </div>
                </div>
              </div>

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
                    {bilingual('नागरिक अधिकार पत्र SLA', 'Citizen Charter SLA')}
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#15803d' }}>
                    {bilingual('⏱️ 48 घंटे में समाधान सुनिश्चित', '⏱️ Resolution within 48 Hours')}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                    {bilingual('नागरिक हेल्पलाइन', 'Citizen Helpline')}
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0b3a6d' }}>
                    📞 181 / 07662-252525
                  </span>
                </div>
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
                  className="btn btn-secondary btn-sm"
                  onClick={handleReset}
                >
                  <span>{bilingual('+ दूसरी समस्या दर्ज करें', '+ Lodge Another Issue')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Override Advisory Modal */}
        {pendingCategoryOverride && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: '1rem',
          }}>
            <div style={{
              background: '#ffffff', borderRadius: '16px', maxWidth: '540px', width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', border: '1px solid #cbd5e1', overflow: 'hidden'
            }}>
              <div style={{
                background: '#0b3a6d', color: '#ffffff', padding: '1.15rem 1.4rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <AlertTriangle size={22} color="#fbbf24" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                    {bilingual('श्रेणी परिवर्तन की पुष्टि करें', 'Confirm Category Override')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingCategoryOverride(null)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '1.25rem' }}>
                <p style={{ margin: '0 0 1rem', fontSize: '0.86rem', color: '#334155', lineHeight: 1.5 }}>
                  {bilingual(
                    'AI विज़न ने आपकी फोटो के आधार पर श्रेणी पहचानी है। क्या आप इसे बदलकर नई श्रेणी चुनना चाहते हैं?',
                    'AI Vision detected a category from your photo. Are you sure you wish to change it?'
                  )}
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={cancelCategoryOverride}
                  >
                    <span>{bilingual('AI पहचान रखें', 'Keep AI Detected')}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={confirmCategoryOverride}
                  >
                    <span>{bilingual('हाँ, श्रेणी बदलें', 'Confirm Change')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Selector Modal */}
        {showCategorySelectModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99998, padding: '1rem',
          }}>
            <div style={{
              background: '#ffffff', borderRadius: '16px', maxWidth: '500px', width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid #cbd5e1', overflow: 'hidden',
              maxHeight: '85vh', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0b3a6d' }}>
                  {bilingual('शिकायत श्रेणी चुनें', 'Select Grievance Category')}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCategorySelectModal(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '0.85rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {allCategories.map((cat) => {
                  const isCurrent = (analysis?.category === cat) || (selectedCategory === cat);
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
                        padding: '0.7rem 0.9rem',
                        borderRadius: '8px',
                        border: isCurrent ? '2px solid #0b3a6d' : '1px solid #e2e8f0',
                        background: isCurrent ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>{categoryIcons[cat]}</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isCurrent ? '#0b3a6d' : '#0f172a' }}>
                            {categoryLabel(cat)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {bilingual(routing.departmentHi, routing.departmentEn)}
                          </div>
                        </div>
                      </div>
                      {isCurrent && (
                        <span style={{ fontSize: '0.85rem', color: '#0b3a6d', fontWeight: 900 }}>✓</span>
                      )}
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
