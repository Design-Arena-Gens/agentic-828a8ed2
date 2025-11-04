"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type NewsItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  image?: string | null;
  snippet?: string | null;
};

type ShortOutput = {
  selected: NewsItem[];
  title: string;
  hashtags: string[];
  thumbnailText: string;
  script: string;
  visuals: string[];
  citations: { title: string; url: string }[];
};

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ShortOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/news');
      if (!res.ok) throw new Error('Failed to fetch news');
      const json = (await res.json()) as ShortOutput;
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLatest();
  }, [fetchLatest]);

  const copy = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  }, []);

  // Voiceover via Web Speech API
  const synthRef = useRef<SpeechSynthesis | null>(null);
  useEffect(() => { synthRef.current = typeof window !== 'undefined' ? window.speechSynthesis : null; }, []);
  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05; // brisk
    utter.pitch = 1.0;
    utter.volume = 1.0;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => /en-US/i.test(v.lang) && /female|neural|standard/i.test(v.name)) || voices[0];
    if (preferred) utter.voice = preferred;
    synthRef.current.speak(utter);
  }, []);

  const stopVoice = useCallback(() => { synthRef.current?.cancel(); }, []);

  // Visual renderer (beta) ? canvas slideshow download (no audio)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  const renderVisualShort = useCallback(async () => {
    if (!data) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080, height = 1920;
    canvas.width = width; canvas.height = height;

    const stream = canvas.captureStream(30);
    const chunks: BlobPart[] = [];
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
      setRecording(false);
    };

    setRecording(true);
    mr.start();

    const framesPerScene = 30 * 6; // 6s per item

    const items = data.selected;

    const drawBg = (t: number) => {
      const g = ctx.createLinearGradient(0, 0, width, height);
      const a = 0.5 + 0.5 * Math.sin(t * 0.002);
      g.addColorStop(0, `hsl(${(220 + t/40)%360} 70% 12%)`);
      g.addColorStop(1, `hsl(${(260 + t/60)%360} 70% ${20 + a*10}%)`);
      ctx.fillStyle = g; ctx.fillRect(0,0,width,height);
    };

    const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = url;
    });

    const safeText = (text: string, max = 80) => text.length > max ? text.slice(0, max-1) + '?' : text;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let img: HTMLImageElement | null = null;
      if (item.image) {
        try { img = await loadImage(item.image); } catch { img = null; }
      }

      for (let f = 0; f < framesPerScene; f++) {
        const t = i * framesPerScene + f;
        drawBg(t);
        if (img) {
          // cover fit with gentle zoom
          const scale = Math.max(width / img.width, height / img.height) * (1 + f/framesPerScene*0.05);
          const w = img.width * scale, h = img.height * scale;
          const x = (width - w)/2, y = (height - h)/2;
          ctx.globalAlpha = 0.45;
          ctx.drawImage(img, x, y, w, h);
          ctx.globalAlpha = 1;
        }
        // overlay panel
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(40, 1400, width-80, 420);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 58px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
        ctx.fillText(safeText(item.title, 36), 64, 1480);
        ctx.font = '500 36px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(safeText(item.source, 42), 64, 1530);
        ctx.font = '400 32px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(safeText(item.snippet || '', 60), 64, 1590);

        // watermark
        ctx.font = '600 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
        ctx.fillStyle = '#a5b4fc';
        ctx.fillText('TechSpace AI', width - 300, height - 40);

        await new Promise(r => requestAnimationFrame(() => r(null)));
      }
    }

    mr.stop();
  }, [data]);

  return (
    <div className="grid two">
      <section className="card">
        <div className="controls">
          <button onClick={fetchLatest} disabled={loading}>{loading ? 'Fetching?' : 'Generate latest Short'}</button>
          {data && (
            <>
              <button className="secondary" onClick={() => speak(data.script)}>Play voiceover</button>
              <button className="secondary" onClick={stopVoice}>Stop voice</button>
              <button onClick={renderVisualShort} disabled={recording}>Render video (beta)</button>
            </>
          )}
        </div>

        {error && <p style={{ color: '#b91c1c', marginTop: 12 }}>{error}</p>}

        {!data ? (
          <p className="small" style={{ marginTop: 12 }}>Fetching fresh stories from Google News (past 24h)?</p>
        ) : (
          <div style={{ marginTop: 16 }} className="grid two">
            <div>
              <div className="kv">
                <span className="label">YouTube Title</span>
                <span className="value">{data.title} <span className="copy" onClick={() => copy(data.title)}>Copy</span></span>
              </div>
              <div className="kv" style={{ marginTop: 12 }}>
                <span className="label">Hashtags</span>
                <span className="value">{data.hashtags.join(' ')} <span className="copy" onClick={() => copy(data.hashtags.join(' '))}>Copy</span></span>
              </div>
              <div className="kv" style={{ marginTop: 12 }}>
                <span className="label">Thumbnail Text</span>
                <span className="value">{data.thumbnailText} <span className="copy" onClick={() => copy(data.thumbnailText)}>Copy</span></span>
              </div>
              <div style={{ marginTop: 12 }}>
                <span className="label">Script (?60s)</span>
                <pre className="pre" style={{ marginTop: 6 }}>{data.script}</pre>
                <button className="secondary" onClick={() => copy(data.script)}>Copy Script</button>
              </div>
            </div>
            <div>
              <div className="kv">
                <span className="label">Picked Stories</span>
                <div className="grid">
                  {data.selected.map((s, idx) => (
                    <div key={idx} className="card" style={{ padding: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
                      <div className="small">{s.source}</div>
                      <div className="cite" style={{ marginTop: 6 }}>
                        <a href={s.link} target="_blank" rel="noreferrer">{s.link}</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="kv" style={{ marginTop: 12 }}>
                <span className="label">Visual Prompts</span>
                <ul>
                  {data.visuals.map((v, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>{v}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="kv">
          <span className="label">Citations (sources)</span>
          <ul>
            {data?.citations.map((c, i) => (
              <li key={i} className="cite"><a href={c.url} target="_blank" rel="noreferrer">{c.title} ? {c.url}</a></li>
            ))}
          </ul>
        </div>
        <div style={{ marginTop: 16 }}>
          <span className="label">Video Stage (9:16, visuals only)</span>
          <div className="video-stage">
            <canvas ref={canvasRef} style={{ width: '270px', height: '480px' }} />
          </div>
          {recordedUrl && (
            <div style={{ marginTop: 12 }}>
              <a href={recordedUrl} download={`techspace-short-${Date.now()}.webm`}>
                <button>Download .webm</button>
              </a>
            </div>
          )}
          <p className="small" style={{ marginTop: 8 }}>Voiceover playback uses your browser's voice. Recording currently exports visuals only.</p>
        </div>
      </section>
    </div>
  );
}
