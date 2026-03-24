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
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [streamReady, setStreamReady] = useState(false);

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

    const channel = supabase.channel(`webrtc-${roomId}`);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    });
    peerConnectionRef.current = pc;

    // Pipe in our local hardware stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Capture remote stream output
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

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
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({
          type: 'broadcast',
          event: 'rtc_answer',
          payload: { answer, targetId: payload.callerId },
        });
      })
      .on('broadcast', { event: 'rtc_answer' }, async ({ payload }) => {
        if (payload.targetId !== currentUserId) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
      })
      .on('broadcast', { event: 'rtc_ice' }, async ({ payload }) => {
        if (payload.targetId !== currentUserId) return;
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      })
      .subscribe(async (status) => {
        // Only the caller throws the first pitch
        if (status === 'SUBSCRIBED' && isCaller) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({
            type: 'broadcast',
            event: 'rtc_offer',
            payload: { offer, targetId, callerId: currentUserId },
          });
        }
      });

    return () => {
      pc.close();
      supabase.removeChannel(channel);
    };
  }, [streamReady, isAccepted, roomId, targetId, currentUserId, isCaller]);

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

  return (
    <div className="fixed inset-0 z-[400] bg-[#111] flex flex-col items-center justify-center animate-in fade-in duration-300">
      
      {/* Remote UI Rendering */}
      {callType === 'video' ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-700 ${isAccepted ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1c1c1c] to-[#0a0a0a]">
          <div className="relative mb-8">
            <div className={`w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20 ${isAccepted ? 'animate-[pulse_3s_ease-in-out_infinite]' : 'animate-bounce'}`}>
              <div className="text-3xl text-primary font-bold uppercase">{partnerName[0]}</div>
            </div>
          </div>
          <audio ref={remoteVideoRef} autoPlay />
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
