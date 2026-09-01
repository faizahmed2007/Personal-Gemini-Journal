import React, { useState, useEffect, useRef } from 'react';
import { useToast } from './Toast';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  X, 
  Radio, 
  Sparkles, 
  FileText, 
  Check, 
  RefreshCw,
  AlertCircle,
  Headphones,
  Zap,
  Activity
} from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  journalTitle: string;
  onSaveVoiceTurnToJournal?: (transcriptTurns: Array<{ role: 'user' | 'assistant'; text: string }>) => void;
}

interface TranscriptTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

// Convert Float32 buffer to 16-bit Linear PCM Little-Endian Buffer
function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 to Float32Array (24kHz playback)
function base64ToFloat32Array(base64: string): Float32Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  journalTitle,
  onSaveVoiceTurnToJournal
}) => {
  const { showToast } = useToast();

  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'closed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isGeminiSpeaking, setIsGeminiSpeaking] = useState(false);
  const [inputVolume, setInputVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptTurn[]>([]);
  const [currentModelTurnText, setCurrentModelTurnText] = useState('');
  const [isSavedToJournal, setIsSavedToJournal] = useState(false);

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const isMutedRef = useRef<boolean>(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (isOpen) {
      startLiveSession();
    } else {
      stopLiveSession();
    }

    return () => {
      stopLiveSession();
    };
  }, [isOpen]);

  const startLiveSession = async () => {
    setStatus('connecting');
    setErrorMessage(null);
    setIsSavedToJournal(false);

    try {
      // 1. Check microphone permission and capture audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;

      // 2. Setup Input AudioContext (16kHz for Gemini Live API)
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtxClass({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      const source = inputCtx.createMediaStreamSource(stream);
      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;
      source.connect(processor);
      processor.connect(inputCtx.destination);

      // 3. Setup Output AudioContext (24kHz for Gemini Live API audio output)
      const outputCtx = new AudioCtxClass({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // 4. Setup WebSocket connection to server /live endpoint
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Live Voice] WebSocket opened');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected') {
            setStatus('connected');
            showToast('Connected to Gemini 3.1 Live Voice', 'success');
          } else if (msg.type === 'audio' && msg.audio) {
            handleIncomingAudio(msg.audio);
          } else if (msg.type === 'model_transcript' && msg.text) {
            setCurrentModelTurnText((prev) => {
              const updated = prev + msg.text;
              return updated;
            });
          } else if (msg.type === 'turn_complete') {
            setCurrentModelTurnText((finalText) => {
              if (finalText.trim()) {
                setTranscripts((prev) => [
                  ...prev,
                  {
                    id: `turn-${Date.now()}`,
                    role: 'assistant',
                    text: finalText.trim(),
                    timestamp: Date.now()
                  }
                ]);
              }
              return '';
            });
            setIsGeminiSpeaking(false);
          } else if (msg.type === 'interrupted') {
            handleInterruption();
          } else if (msg.type === 'error') {
            setStatus('error');
            setErrorMessage(msg.message || 'Live session error');
          } else if (msg.type === 'session_closed') {
            setStatus('closed');
          }
        } catch (err) {
          console.error('[Live Voice] Message parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[Live Voice] WS error:', err);
        setStatus('error');
        setErrorMessage('Connection failed. Ensure your Gemini API Key is configured.');
      };

      ws.onclose = () => {
        if (status !== 'error') {
          setStatus('closed');
        }
      };

      // 5. Send mic PCM audio in processor callback
      processor.onaudioprocess = (e) => {
        if (isMutedRef.current || ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = floatTo16BitPCM(inputData);
        const base64Audio = arrayBufferToBase64(pcm16);

        ws.send(
          JSON.stringify({
            type: 'audio',
            audio: base64Audio
          })
        );
      };

      // 6. Start volume visualizer loop
      startVolumeMonitor();

    } catch (err: any) {
      console.error('[Live Voice] Startup error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Microphone access denied or unavailable.');
    }
  };

  const handleIncomingAudio = (base64Audio: string) => {
    if (!outputAudioCtxRef.current) return;
    const ctx = outputAudioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    setIsGeminiSpeaking(true);

    try {
      const float32 = base64ToFloat32Array(base64Audio);
      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (activeSourcesRef.current.length === 0 && ctx.currentTime >= nextStartTimeRef.current) {
          setIsGeminiSpeaking(false);
        }
      };
    } catch (err) {
      console.error('[Live Voice] Audio playback error:', err);
    }
  };

  const handleInterruption = () => {
    // Interruption detected: immediately halt active output sources
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
    setIsGeminiSpeaking(false);
  };

  const startVolumeMonitor = () => {
    const dataArray = new Uint8Array(64);
    const checkVolume = () => {
      if (analyserRef.current && !isMutedRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setInputVolume(Math.min(100, Math.round((avg / 128) * 100)));
      } else {
        setInputVolume(0);
      }
      animFrameRef.current = requestAnimationFrame(checkVolume);
    };
    checkVolume();
  };

  const stopLiveSession = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {}
      scriptProcessorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch {}
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      activeSourcesRef.current.forEach((s) => {
        try {
          s.stop();
        } catch {}
      });
      activeSourcesRef.current = [];
      try {
        outputAudioCtxRef.current.close();
      } catch {}
      outputAudioCtxRef.current = null;
    }

    setIsGeminiSpeaking(false);
    setInputVolume(0);
  };

  const handleSaveToJournal = () => {
    if (transcripts.length === 0) {
      showToast('No spoken transcript turns to save yet', 'info');
      return;
    }

    if (onSaveVoiceTurnToJournal) {
      const turns = transcripts.map((t) => ({ role: t.role, text: t.text }));
      onSaveVoiceTurnToJournal(turns);
      setIsSavedToJournal(true);
      showToast('Spoken conversation turns saved to journal!', 'success');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-['Playfair_Display',serif]">
                  Live Voice Companion
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                  gemini-3.1-flash-live-preview
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-sm">
                Session: {journalTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Close voice conversation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Live Waveform & Visual Presence */}
        <div className="p-8 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950">
          {/* Animated Glowing Orb / Presence Ring */}
          <div className="relative flex items-center justify-center my-4">
            {/* Ambient Pulse Ring */}
            <div
              className={`absolute w-36 h-36 rounded-full transition-all duration-300 ${
                isGeminiSpeaking
                  ? 'bg-blue-500/20 scale-125 animate-ping'
                  : inputVolume > 15
                  ? 'bg-emerald-500/20 scale-115 animate-pulse'
                  : 'bg-slate-800/40 scale-100'
              }`}
            />

            {/* Middle Glow Ring */}
            <div
              className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl ${
                isGeminiSpeaking
                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 ring-8 ring-blue-500/30'
                  : inputVolume > 15
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 ring-8 ring-emerald-500/30'
                  : 'bg-slate-800 ring-4 ring-slate-700'
              }`}
            >
              {isGeminiSpeaking ? (
                <Volume2 className="w-10 h-10 text-white animate-pulse" />
              ) : isMuted ? (
                <MicOff className="w-10 h-10 text-rose-400" />
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </div>
          </div>

          {/* Dynamic Status Text */}
          <div className="text-center mt-2">
            {status === 'connecting' && (
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Establishing real-time bidirectional audio stream...</span>
              </div>
            )}

            {status === 'connected' && (
              <div>
                <p className="text-sm font-semibold text-white">
                  {isGeminiSpeaking
                    ? 'Gemini is speaking...'
                    : inputVolume > 15
                    ? 'Listening to you...'
                    : 'Speak naturally anytime'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Natural interruptions supported • Ultra-low latency voice loop
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2 max-w-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage || 'Voice connection failed.'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Transcript Stream */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-950/60 border-t border-slate-800 space-y-3 min-h-[160px] max-h-[220px]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              Live Spoken Dialogue
            </span>
            <span>{transcripts.length} turns recorded</span>
          </div>

          {transcripts.length === 0 && !currentModelTurnText ? (
            <p className="text-xs text-slate-500 italic text-center py-6">
              Spoken conversation will appear here in real-time...
            </p>
          ) : (
            <>
              {transcripts.map((turn) => (
                <div
                  key={turn.id}
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    turn.role === 'user'
                      ? 'bg-blue-950/60 border border-blue-900/50 text-blue-200 ml-8'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 mr-8'
                  }`}
                >
                  <span className="font-bold text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">
                    {turn.role === 'user' ? 'You' : 'Gemini'}
                  </span>
                  <p>{turn.text}</p>
                </div>
              ))}

              {currentModelTurnText && (
                <div className="p-3 rounded-2xl text-xs leading-relaxed bg-slate-900 border border-blue-800/60 text-slate-200 mr-8 animate-pulse">
                  <span className="font-bold text-[10px] text-blue-400 block mb-1 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Gemini Speaking
                  </span>
                  <p>{currentModelTurnText}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4">
          {/* Mute Mic Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isMuted
                ? 'bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
          </button>

          {/* Save to Journal & End */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToJournal}
              disabled={transcripts.length === 0 || isSavedToJournal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md disabled:opacity-40 transition-all"
            >
              {isSavedToJournal ? <Check className="w-4 h-4 text-emerald-300" /> : <FileText className="w-4 h-4" />}
              <span>{isSavedToJournal ? 'Saved to Journal' : 'Save Turns to Journal'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              End Voice Session
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
