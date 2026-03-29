import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Send, Play, Pause, Trash2 } from "lucide-react";

interface VoiceNoteRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
}

export default function VoiceNoteRecorder({ onSend, disabled }: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Analyser for waveform visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const drawWaveform = () => {
        analyser.getByteFrequencyData(dataArray);
        const normalized = Array.from(dataArray.slice(0, 24)).map(v => v / 255);
        setWaveformData(normalized);
        animFrameRef.current = requestAnimationFrame(drawWaveform);
      };
      drawWaveform();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        stream.getTracks().forEach(t => t.stop());
        audioContext.close();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleSend = useCallback(() => {
    if (recordedBlob) {
      onSend(recordedBlob, duration);
      setRecordedBlob(null);
      setDuration(0);
      setWaveformData([]);
    }
  }, [recordedBlob, duration, onSend]);

  const handleDiscard = useCallback(() => {
    setRecordedBlob(null);
    setDuration(0);
    setWaveformData([]);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlayback = useCallback(() => {
    if (!recordedBlob) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(URL.createObjectURL(recordedBlob));
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [recordedBlob, isPlaying]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence mode="wait">
        {!isRecording && !recordedBlob && (
          <motion.button
            key="mic"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={startRecording}
            disabled={disabled}
            className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all disabled:opacity-30"
            title="Record voice note"
          >
            <Mic size={18} />
          </motion.button>
        )}

        {isRecording && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-2"
          >
            {/* Live waveform */}
            <div className="flex items-end gap-[2px] h-6">
              {waveformData.map((v, i) => (
                <motion.div
                  key={i}
                  className="w-[2px] bg-red-400 rounded-full"
                  animate={{ height: Math.max(3, v * 24) }}
                  transition={{ duration: 0.05 }}
                />
              ))}
            </div>
            
            {/* Timer */}
            <span className="font-mono-tech text-red-400 min-w-[3rem]">{formatTime(duration)}</span>
            
            {/* Recording pulse indicator */}
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            
            {/* Stop button */}
            <button
              onClick={stopRecording}
              className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <Square size={14} />
            </button>
          </motion.div>
        )}

        {recordedBlob && !isRecording && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-full px-4 py-2"
          >
            {/* Playback button */}
            <button onClick={togglePlayback} className="p-1.5 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>

            {/* Static waveform */}
            <div className="flex items-end gap-[2px] h-5 opacity-60">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[2px] bg-primary rounded-full"
                  style={{ height: Math.max(3, Math.sin(i * 0.5) * 12 + Math.random() * 8) }}
                />
              ))}
            </div>

            <span className="font-mono-tech text-primary text-xs">{formatTime(duration)}</span>

            {/* Discard */}
            <button onClick={handleDiscard} className="p-1.5 rounded-full hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors">
              <Trash2 size={12} />
            </button>

            {/* Send */}
            <button onClick={handleSend} className="p-1.5 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
              <Send size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Waveform display for received voice messages */
export function VoiceMessagePlayer({ src, duration }: { src: string; duration?: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => { setIsPlaying(false); setProgress(0); };
    }
    if (isPlaying) {
      audioRef.current.pause();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    } else {
      audioRef.current.play();
      const update = () => {
        if (audioRef.current) {
          setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
        }
        animRef.current = requestAnimationFrame(update);
      };
      update();
    }
    setIsPlaying(!isPlaying);
  };

  // Generate deterministic waveform bars from URL hash
  const bars = Array.from({ length: 40 }).map((_, i) => {
    const seed = src.charCodeAt(i % src.length) || 50;
    return Math.max(4, ((seed * (i + 1)) % 20) + 3);
  });

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <button onClick={togglePlay} className="flex-shrink-0 p-1.5 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      
      {/* SVG Waveform */}
      <div className="flex-1 flex items-end gap-[1px] h-6 overflow-hidden">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-[2px] rounded-full transition-colors duration-100"
            style={{
              height: h,
              backgroundColor: i / bars.length <= progress
                ? "hsl(47 92% 52%)"
                : "hsl(0 0% 40%)",
            }}
          />
        ))}
      </div>

      {duration != null && (
        <span className="font-mono-tech text-[9px] text-muted-foreground min-w-[2rem]">
          {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
        </span>
      )}
    </div>
  );
}
