import React, { useRef, useState, useEffect } from 'react';
import { useVideo } from '@/contexts/VideoContext';
import { X, Maximize2, Minimize2, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PiPPlayer() {
    const { pipVideo, setPipVideo, isPipOpen, setIsPipOpen } = useVideo();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (pipVideo) {
            setIsPipOpen(true);
            setIsPlaying(true);
        }
    }, [pipVideo]);

    if (!pipVideo || !isPipOpen) return null;

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const closePip = () => {
        setIsPipOpen(false);
        setPipVideo(null);
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragConstraints={{ left: -300, right: 300, top: -300, bottom: 300 }}
            initial={{ x: 20, y: 20, opacity: 0, scale: 0.8, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed bottom-24 right-4 md:bottom-10 md:right-10 z-[1000] w-64 md:w-80 aspect-video bg-black rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden group border-primary/20"
        >
            <video
                ref={videoRef}
                src={pipVideo.url}
                className="w-full h-full object-cover"
                autoPlay
                loop
                playsInline
            />

            {/* Premium Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="absolute top-3 left-4 right-4 flex justify-between items-center pointer-events-none">
                    <div className="flex flex-col">
                        <span className="text-[0.55rem] text-primary font-bold uppercase tracking-[2px] drop-shadow-lg">Now Playing</span>
                        <span className="text-[0.65rem] text-white/90 font-medium truncate max-w-[140px] drop-shadow-md">
                            {pipVideo.title || "Talent Reel"}
                        </span>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); closePip(); }}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all pointer-events-auto backdrop-blur-md border border-red-500/30"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <button
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="p-4 bg-primary text-black rounded-full hover:scale-110 transition-transform pointer-events-auto shadow-xl shadow-primary/20 flex items-center justify-center"
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                    </button>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-baseline">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[0.5rem] text-white/60 font-medium uppercase tracking-widest">Live Mini-Player</span>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                        className="p-2 text-white/50 hover:text-primary transition-colors pointer-events-auto"
                    >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                </div>
            </div>

            {/* Drag handle hint */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/10 rounded-full opacity-50 pointer-events-none" />
        </motion.div>
    );
}
