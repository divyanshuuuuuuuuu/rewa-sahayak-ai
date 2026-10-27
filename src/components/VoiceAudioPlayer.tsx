import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, AlertCircle, Lock, ShieldCheck } from 'lucide-react';
import { useGov } from '../context/GovContext';

interface VoiceAudioPlayerProps {
  audioUrl: string;
  duration?: number | null;
  mimeType?: string | null;
  publicConsent?: boolean;
  canPlayAuthorized?: boolean; // true for Workers and Administrators
  title?: string;
  compact?: boolean;
}

export default function VoiceAudioPlayer({
  audioUrl,
  duration,
  mimeType,
  publicConsent = true,
  canPlayAuthorized = false,
  title,
  compact = false,
}: VoiceAudioPlayerProps) {
  const { bilingual } = useGov();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio playback is strictly restricted to authorized municipal workers and administrators
  const isPlayable = Boolean(canPlayAuthorized);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
      setIsLoading(false);
    };
    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setError(
        bilingual(
          'ऑडियो लोड करने में असमर्थ। कृपया पुनः प्रयास करें।',
          'Unable to play audio recording. Please try again.'
        )
      );
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
    };
  }, [bilingual]);

  const togglePlay = () => {
    if (!audioRef.current || !isPlayable) return;
    setError(null);

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      audioRef.current.play().catch((err) => {
        setIsLoading(false);
        setIsPlaying(false);
        setError(
          bilingual(
            'ऑडियो चलाने में त्रुटि: ' + (err.message || 'प्लेबैक विफल'),
            'Playback error: ' + (err.message || 'failed to play')
          )
        );
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = parseFloat(e.target.value);
    setCurrentTime(seekTo);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTo;
    }
  };

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // If citizen did NOT consent to public audio sharing and viewer is NOT authorized (public visitor):
  if (!isPlayable) {
    return (
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: compact ? '0.6rem 0.8rem' : '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        color: '#64748b',
        fontSize: '0.82rem',
      }}>
        <Lock size={18} color="#94a3b8" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#475569' }}>
            {bilingual('गोपनीय वॉइस साक्ष्य (Confidential Voice Complaint)', 'Confidential Voice Recording')}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
            {bilingual(
              'नागरिक द्वारा इस रिकॉर्डिंग को केवल नगर निगम फील्ड टीम व नियंत्रण कक्ष हेतु गोपनीय रखा गया है।',
              'Citizen opted for private municipal playback. Accessible to authorized municipal personnel only.'
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#f0fdf4',
        border: '1.5px solid #86efac',
        borderRadius: 12,
        padding: compact ? '0.7rem 0.85rem' : '1rem 1.15rem',
        boxShadow: '0 2px 8px rgba(22,101,52,0.06)',
      }}
    >
      {/* Hidden standard audio element with no autoplay */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Volume2 size={18} color="#15803d" />
          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#166534' }}>
            {title || bilingual('🎙️ नागरिक वॉइस शिकायत सुनें', '🎙️ Play Citizen Voice Complaint')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {canPlayAuthorized && !publicConsent && (
            <span style={{ fontSize: '0.68rem', background: '#fef3c7', color: '#92400e', fontWeight: 800, padding: '2px 7px', borderRadius: 4, border: '1px solid #fde68a' }}>
              🔒 {bilingual('विभागीय आंतरिक', 'Staff Only')}
            </span>
          )}
          {publicConsent && (
            <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '2px 7px', borderRadius: 4, border: '1px solid #86efac' }}>
              ✓ {bilingual('सार्वजनिक स्वीकृत', 'Public Voice')}
            </span>
          )}
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#15803d' }}>
            {formatSeconds(audioDuration)}
          </span>
        </div>
      </div>

      {/* Player Controller Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause voice recording' : 'Play voice recording'}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: '#15803d',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(21,128,61,0.3)',
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {isLoading ? (
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} />
          ) : isPlaying ? (
            <Pause size={18} fill="#ffffff" />
          ) : (
            <Play size={18} fill="#ffffff" style={{ marginLeft: 2 }} />
          )}
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <input
            type="range"
            min={0}
            max={audioDuration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            style={{
              width: '100%',
              accentColor: '#15803d',
              cursor: 'pointer',
              height: '6px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>
            <span>{formatSeconds(currentTime)}</span>
            <span>{formatSeconds(audioDuration)}</span>
          </div>
        </div>
      </div>

      {/* Playback Error Feedback */}
      {error && (
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Verified Notice Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.45rem', paddingTop: '0.45rem', borderTop: '1px solid #bbf7d0', fontSize: '0.7rem', color: '#166534' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <ShieldCheck size={12} color="#15803d" />
          {bilingual('मूल नागरिक ऑडियो साक्ष्य • वास्तविक रिकॉर्डिंग', 'Original Citizen Voice Evidence • Verified File')}
        </span>
        {mimeType && (
          <span style={{ color: '#64748b' }}>
            {mimeType.split(';')[0]}
          </span>
        )}
      </div>
    </div>
  );
}
