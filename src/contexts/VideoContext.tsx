import React, { createContext, useContext, useState, useRef } from 'react';

interface VideoContextType {
    pipVideo: { url: string; title?: string; owner?: string } | null;
    setPipVideo: (video: { url: string; title?: string; owner?: string } | null) => void;
    isPipOpen: boolean;
    setIsPipOpen: (open: boolean) => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export const VideoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [pipVideo, setPipVideo] = useState<{ url: string; title?: string; owner?: string } | null>(null);
    const [isPipOpen, setIsPipOpen] = useState(false);

    return (
        <VideoContext.Provider value={{ pipVideo, setPipVideo, isPipOpen, setIsPipOpen }}>
            {children}
        </VideoContext.Provider>
    );
};

export const useVideo = () => {
    const context = useContext(VideoContext);
    if (context === undefined) {
        throw new Error('useVideo must be used within a VideoProvider');
    }
    return context;
};
