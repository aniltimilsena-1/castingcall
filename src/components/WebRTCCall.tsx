import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function WebRTCCall({
  isCaller,
  isAccepted,
  roomId,
  targetId,
  currentUserId,
  partnerName,
  onEndCall,
  callType,
}: {
  isCaller: boolean;
  isAccepted: boolean;
  roomId: string;
  targetId: string;
  currentUserId: string;
  partnerName: string;
  onEndCall: () => void;
  callType: 'video' | 'audio';
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [streamReady, setStreamReady] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // 1. Boot up Camera/Audio immediately so user sees themselves ringing
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: callType === 'video', audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setStreamReady(true);
      })
      .catch((err) => {
        console.error('Failed to get media devices', err);
        setMediaError(err?.message || 'Failed to access camera/microphone. Please ensure browser permissions are granted.');
      });

    return () => {
      // Force shutdown hardware when component unmounts
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [callType]);

  // 2. Establish Native WebRTC P2P Data Bridge once accepted!
  useEffect(() => {
    if (!streamReady || !isAccepted) return;

    const iceCandidateQueue: RTCIceCandidateInit[] = [];
    const channel = supabase.channel(`webrtc-${roomId}`);

    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ];

    const turnUrl = import.meta.env.VITE_TURN_URL;
    const turnUser = import.meta.env.VITE_TURN_USER;
    const turnPass = import.meta.env.VITE_TURN_PASS;

    if (turnUrl && turnUser && turnPass) {
      iceServers.push({ urls: turnUrl, username: turnUser, credential: turnPass });
    } else if (import.meta.env.DEV) {
      // Insecure generic relay strictly gated for local development testing only
      iceServers.push(
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
      );
    }

    const pc = new RTCPeerConnection({ iceServers });
    peerConnectionRef.current = pc;

    // Pipe in our local hardware stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Capture remote stream output
    pc.ontrack = (event) => {
      console.log("WebRTC: Remote track received:", event.track.kind);
      // Ensure we have a stream object
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      setRemoteStream(stream);
    };

    // Effect to keep ref.srcObject in sync with remoteStream state
    const syncRemoteStream = () => {
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };
    
    // We call this every time the stream or ref might have changed
    syncRemoteStream();

    // Broadcast our network routes (ICE)
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: 'broadcast',
          event: 'rtc_ice',
          payload: { candidate: event.candidate, targetId },
        });
      }
    };

    channel
      .on('broadcast', { event: 'rtc_offer' }, async ({ payload }) => {
        if (payload.targetId !== currentUserId) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({
            type: 'broadcast',
            event: 'rtc_answer',
            payload: { answer, targetId: payload.callerId },
          });
          // Process any ICE candidates that arrived before description was set
          iceCandidateQueue.forEach(async (c) => {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
          });
        } catch (e) {
          console.error("Error handling WebRTC Offer:", e);
        }
      })
      .on('broadcast', { event: 'rtc_answer' }, async ({ payload }) => {
        if (payload.targetId !== currentUserId) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
          // Process any ICE candidates that arrived before description was set
          iceCandidateQueue.forEach(async (c) => {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
          });
        } catch (e) {
          console.error("Error handling WebRTC Answer:", e);
        }
      })
      .on('broadcast', { event: 'rtc_ice' }, async ({ payload }) => {
        if (payload.targetId !== currentUserId) return;
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            iceCandidateQueue.push(payload.candidate);
          }
        } catch (e) {
          console.error("Error adding remote ICE Candidate:", e);
        }
      })
      .subscribe(async (status) => {
        // Only the caller throws the first pitch
        if (status === 'SUBSCRIBED' && isCaller) {
          // Add deterministic buffer to ensure the receiver's Supabase channel accurately finished hooking its backend socket.
          setTimeout(async () => {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: 'broadcast',
                event: 'rtc_offer',
                payload: { offer, targetId, callerId: currentUserId },
              });
            } catch (e) {
              console.error("Error dispatching original WebRTC Offer:", e);
            }
          }, 1500);
        }
      });

    return () => {
      pc.close();
      supabase.removeChannel(channel);
    };
  }, [streamReady, isAccepted, roomId, targetId, currentUserId, isCaller, remoteStream]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = isMuted));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current && callType === 'video') {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
      setIsVideoOff(!isVideoOff);
    }
  };

  if (mediaError) {
    return (
      <div className="fixed inset-0 z-[500] bg-black flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="bg-red-500/10 text-red-500 p-8 rounded-3xl border border-red-500/20 max-w-sm shadow-2xl">
          <PhoneOff size={48} className="mx-auto mb-4 opacity-80" />
          <h2 className="text-xl font-bold mb-3">Hardware Access Denied</h2>
          <p className="text-sm opacity-80 mb-6 leading-relaxed">{mediaError}</p>
          <button onClick={onEndCall} className="bg-red-500 text-white px-8 py-3 rounded-full font-bold w-full hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 active:scale-95">
            Close Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[400] bg-[#111] flex flex-col items-center justify-center animate-in fade-in duration-300">
      
      {/* Remote UI Rendering */}
      {callType === 'video' ? (
        <video
          ref={remoteVideoRef as any}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-700 ${isAccepted ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1c1c1c] to-[#0a0a0a]">
          <div className="relative mb-8">
            <div className={`w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20 ${isAccepted ? 'animate-[pulse_3s_ease-in-out_infinite]' : 'animate-bounce'}`}>
              <div className="text-3xl text-primary font-bold uppercase">{(partnerName || '?')[0]}</div>
            </div>
          </div>
          <audio ref={remoteVideoRef as any} autoPlay />
        </div>
      )}

      {/* Ringing overlay screen */}
      {!isAccepted && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-20 pointer-events-none">
          <h2 className="text-3xl text-white font-bold mb-2">{partnerName}</h2>
          <p className="text-primary tracking-[0.3em] uppercase text-xs font-bold animate-[pulse_1s_ease-in-out_infinite]">Ringing...</p>
        </div>
      )}

      {/* Local Floating Picture-in-Picture */}
      {callType === 'video' && !isVideoOff && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`absolute top-6 right-6 w-28 h-40 md:w-36 md:h-56 bg-zinc-900 object-cover rounded-2xl shadow-2xl border border-white/10 z-30 transition-all duration-500`}
        />
      )}

      {/* Call Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/90 backdrop-blur-2xl px-6 py-4 rounded-[2rem] border border-white/10 shadow-2xl z-40">
        <button
          onClick={toggleMute}
          className={`p-3.5 rounded-full transition-all active:scale-95 ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {callType === 'video' && (
          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-full transition-all active:scale-95 ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>
        )}

        <button
          onClick={onEndCall}
          className="p-3.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-90 transition-all ml-2"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}
