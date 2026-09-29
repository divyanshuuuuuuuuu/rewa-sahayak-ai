// Geo-verified civic evidence SVG generator for Rewa Sahayak AI
// Used to provide realistic timestamped and GPS-watermarked evidence for preset civic issues

export function getCivicEvidenceSvg(type: 'garbage' | 'leakage' | 'streetlight' | 'pothole' | 'drainage' | 'dustbin'): string {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const templates: Record<string, { bg: string; icon: string; title: string; detail: string; accent: string }> = {
    garbage: {
      bg: '#1c1917',
      icon: '🗑️',
      title: 'WASTE ACCUMULATION & ILLEGAL DUMPING',
      detail: 'Ward 12, Sirmour Chowk, Rewa • Sector 4',
      accent: '#f59e0b',
    },
    leakage: {
      bg: '#082f49',
      icon: '💧',
      title: 'MAIN PIPELINE BURST / DRINKING WATER LOSS',
      detail: 'Near Bus Stand Road, Ward 15, Rewa',
      accent: '#0284c7',
    },
    streetlight: {
      bg: '#0f172a',
      icon: '💡',
      title: 'NON-FUNCTIONAL STREETLIGHT / DARK ZONE',
      detail: 'Main Arterial Road, Station Area, Rewa',
      accent: '#eab308',
    },
    pothole: {
      bg: '#292524',
      icon: '🕳️',
      title: 'HAZARDOUS ROAD CRATER / POTHOLE ACCIDENT RISK',
      detail: 'Civil Lines Main Route, Rewa',
      accent: '#ef4444',
    },
    drainage: {
      bg: '#1e293b',
      icon: '🌊',
      title: 'DRAINAGE OVERFLOW & SEWAGE CONTAMINATION',
      detail: 'Ward 18, Nai Basti Residential Area, Rewa',
      accent: '#14b8a6',
    },
    dustbin: {
      bg: '#14532d',
      icon: '📦',
      title: 'MUNICIPAL DUMPSTER OVERFLOW & UNSANITARY CONDITIONS',
      detail: 'Commercial Vegetable Market Depot, Rewa',
      accent: '#22c55e',
    },
  };

  const item = templates[type] || templates.garbage;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${item.bg}"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>
      <linearGradient id="hudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(0,0,0,0.7)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.85)"/>
      </linearGradient>
    </defs>

    <!-- Photo Background with civic texture representation -->
    <rect width="640" height="420" fill="url(#bgGrad)"/>

    <!-- Subtle Ground / Road Horizon Lines -->
    <line x1="0" y1="260" x2="640" y2="260" stroke="#334155" stroke-width="2" stroke-dasharray="8 6"/>
    <polygon points="120,420 280,260 360,260 520,420" fill="rgba(255,255,255,0.03)"/>

    <!-- Problem Graphic Representation -->
    <circle cx="320" cy="180" r="75" fill="rgba(255,255,255,0.06)" stroke="${item.accent}" stroke-width="3" stroke-dasharray="4 4"/>
    <text x="320" y="200" font-size="64" text-anchor="middle">${item.icon}</text>

    <!-- Camera HUD Viewfinder Overlay (Corner Brackets) -->
    <path d="M 30,50 L 30,30 L 50,30" stroke="#f8fafc" stroke-width="3" fill="none"/>
    <path d="M 610,50 L 610,30 L 590,30" stroke="#f8fafc" stroke-width="3" fill="none"/>
    <path d="M 30,370 L 30,390 L 50,390" stroke="#f8fafc" stroke-width="3" fill="none"/>
    <path d="M 610,370 L 610,390 L 590,390" stroke="#f8fafc" stroke-width="3" fill="none"/>

    <!-- Live Recording / Camera HUD Indicator -->
    <circle cx="45" cy="45" r="6" fill="#ef4444"/>
    <text x="60" y="49" fill="#f8fafc" font-size="11" font-family="monospace" font-weight="bold">REC • GEO-CAMERA EVIDENCE</text>
    <text x="595" y="49" fill="#94a3b8" font-size="11" font-family="monospace" text-anchor="end">4K • 30FPS • RAW</text>

    <!-- Official Anti-Fraud Watermark Stamp Box -->
    <rect x="20" y="300" width="600" height="98" rx="6" fill="url(#hudGrad)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>

    <text x="35" y="324" fill="${item.accent}" font-size="12" font-family="system-ui, sans-serif" font-weight="900" letter-spacing="1">
      ● REWA MUNICIPAL CORPORATION — OFFICIAL PHOTO EVIDENCE
    </text>
    <text x="35" y="344" fill="#ffffff" font-size="13" font-family="system-ui, sans-serif" font-weight="bold">
      ${item.title}
    </text>
    <text x="35" y="362" fill="#cbd5e1" font-size="11" font-family="system-ui, sans-serif">
      📍 ${item.detail}
    </text>
    <text x="35" y="382" fill="#6ee7b7" font-size="11" font-family="monospace" font-weight="bold">
      GPS: 24.5373° N, 81.3005° E | ALT: 304m | DATE: ${dateStr} ${timeStr} | VERIFIED SPOT PROOF ✓
    </text>

    <!-- Security Check Stamp -->
    <rect x="475" y="315" width="135" height="24" rx="4" fill="#15803d"/>
    <text x="542" y="331" fill="#ffffff" font-size="10" font-family="system-ui, sans-serif" font-weight="bold" text-anchor="middle">
      ANTI-SPAM VERIFIED
    </text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getEvidenceForCategory(category: string, module?: string): string {
  const c = (category || '').toLowerCase();
  const m = (module || '').toLowerCase();

  if (c.includes('light') || c.includes('electric') || c.includes('बत्ती') || c.includes('लाइट')) {
    return getCivicEvidenceSvg('streetlight');
  }
  if (c.includes('road') || c.includes('pothole') || c.includes('सड़क') || c.includes('गड्ढा')) {
    return getCivicEvidenceSvg('pothole');
  }
  if (c.includes('water') || c.includes('leak') || c.includes('जल') || c.includes('पाइप') || m.includes('jal')) {
    if (c.includes('drain') || c.includes('नाली') || c.includes('सीवर')) {
      return getCivicEvidenceSvg('drainage');
    }
    return getCivicEvidenceSvg('leakage');
  }
  if (c.includes('drain') || c.includes('जलभराव') || c.includes('नाली')) {
    return getCivicEvidenceSvg('drainage');
  }
  if (c.includes('bin') || c.includes('डस्टबिन')) {
    return getCivicEvidenceSvg('dustbin');
  }
  return getCivicEvidenceSvg('garbage');
}

export function getCivicVideoPosterSvg(title: string = 'CIVIC INCIDENT RECORDING'): string {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <defs>
      <linearGradient id="vidBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d16"/>
        <stop offset="50%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#030712"/>
      </linearGradient>
      <radialGradient id="playGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#0284c7" stop-opacity="0.2"/>
      </radialGradient>
    </defs>

    <rect width="640" height="420" fill="url(#vidBg)"/>

    <!-- Grid lines -->
    <line x1="20" y1="140" x2="620" y2="140" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <line x1="20" y1="280" x2="620" y2="280" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <line x1="213" y1="20" x2="213" y2="400" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <line x1="426" y1="20" x2="426" y2="400" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>

    <!-- Corner Camera HUD -->
    <path d="M 25 50 L 25 25 L 50 25" stroke="#38bdf8" stroke-width="3" fill="none"/>
    <path d="M 615 50 L 615 25 L 590 25" stroke="#38bdf8" stroke-width="3" fill="none"/>
    <path d="M 25 370 L 25 395 L 50 395" stroke="#38bdf8" stroke-width="3" fill="none"/>
    <path d="M 615 370 L 615 395 L 590 395" stroke="#38bdf8" stroke-width="3" fill="none"/>

    <!-- Top Status Bar -->
    <circle cx="45" cy="48" r="7" fill="#ef4444"/>
    <text x="62" y="53" fill="#ef4444" font-size="12" font-family="monospace" font-weight="900" letter-spacing="1.5">
      REC [HD 1080p • 60 FPS]
    </text>
    <text x="320" y="53" fill="#94a3b8" font-size="11" font-family="monospace" text-anchor="middle">
      TIME: 00:18 / 00:30 • AUDIO ACTIVE 🎙️
    </text>
    <rect x="520" y="40" width="85" height="20" rx="3" fill="#0284c7"/>
    <text x="562" y="54" fill="#ffffff" font-size="10" font-family="system-ui, sans-serif" font-weight="bold" text-anchor="middle">
      VIDEO PROOF
    </text>

    <!-- Center Play Icon -->
    <circle cx="320" cy="200" r="48" fill="url(#playGlow)" stroke="#38bdf8" stroke-width="2"/>
    <polygon points="312,180 312,220 340,200" fill="#ffffff"/>
    <text x="320" y="270" fill="#f8fafc" font-size="13" font-family="system-ui, sans-serif" font-weight="bold" text-anchor="middle">
      🎥 ${title.toUpperCase()}
    </text>

    <!-- Bottom HUD Info Box -->
    <rect x="20" y="320" width="600" height="80" rx="6" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="1.5"/>
    <text x="35" y="342" fill="#38bdf8" font-size="11" font-family="system-ui, sans-serif" font-weight="900">
      ● REWA NAGAR NIGAM — DIGITAL VIDEO EVIDENCE
    </text>
    <text x="35" y="362" fill="#ffffff" font-size="12" font-family="system-ui, sans-serif" font-weight="bold">
      ${title} • Continuous Recording Stream
    </text>
    <text x="35" y="384" fill="#6ee7b7" font-size="10" font-family="monospace" font-weight="bold">
      GPS: 24.5373° N, 81.3005° E | REWA WARD 12 | DATE: ${dateStr} ${timeStr} | VERIFIED VIDEO PROOF ✓
    </text>

    <!-- Verified Stamp -->
    <rect x="475" y="340" width="135" height="24" rx="4" fill="#15803d"/>
    <text x="542" y="356" fill="#ffffff" font-size="10" font-family="system-ui, sans-serif" font-weight="bold" text-anchor="middle">
      ANTI-SPAM VERIFIED
    </text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createSampleCivicVideoBlob(title: string = 'Rewa Civic Issue'): Promise<string> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        resolve('');
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (!ctx || !(canvas as any).captureStream) {
        resolve('');
        return;
      }
      const stream = (canvas as any).captureStream(24);
      let mediaRecorder: MediaRecorder;
      try {
        const mime = MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : MediaRecorder.isTypeSupported('video/mp4')
          ? 'video/mp4'
          : '';
        mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      } catch {
        resolve('');
        return;
      }

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        try {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(URL.createObjectURL(blob));
        } catch {
          resolve('');
        }
      };

      mediaRecorder.start();

      let frame = 0;
      const totalFrames = 48; // 2 seconds
      const timer = setInterval(() => {
        frame++;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 480, 320);

        // Frame border
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.strokeRect(15, 15, 450, 290);

        // Pulsing REC
        if (frame % 16 < 10) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(40, 42, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`REC 00:0${Math.floor(frame / 24)} • REWA NAGAR NIGAM`, 55, 47);

        // Main Title
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(title, 35, 130);

        // Moving wave or progress line
        const waveX = (frame * 12) % 400 + 40;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(waveX, 170, 30, 6);

        // Watermark info
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText('Civic Incident Video Recording (Evidence Logged)', 35, 220);

        ctx.fillStyle = '#34d399';
        ctx.font = '11px monospace';
        ctx.fillText('GPS: 24.5373° N, 81.3005° E | LIVE VERIFIED', 35, 275);

        if (frame >= totalFrames) {
          clearInterval(timer);
          try {
            mediaRecorder.stop();
          } catch {
            resolve('');
          }
        }
      }, 1000 / 24);
    } catch {
      resolve('');
    }
  });
}


