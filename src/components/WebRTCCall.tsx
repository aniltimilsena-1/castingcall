import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, RefreshCw } from 'lucide-react';
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
  const channelRef = useRef<any>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [streamReady, setStreamReady] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [remoteVideoOff, setRemoteVideoOff] = useState(false);
  const [isMobile] = useState(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

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

    let timeoutId: any;
    const iceCandidateQueue: RTCIceCandidateInit[] = [];
    const channel = supabase.channel(`webrtc-${roomId}`);
    channelRef.current = channel;

    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ];

    const turnUrl = import.meta.env.VITE_TURN_URL;
    const turnUser = import.meta.env.VITE_TURN_USER;
    const turnPass = import.meta.env.VITE_TURN_PASS;

    if (turnUrl && turnUser && turnPass) {
      iceServers.push({ urls: turnUrl, username: turnUser, credential: turnPass });
    } else {
      // Use free public relay as a fallback if custom TURN isn't provided to ensure connectivity
      // across NAT/Firewalls which typically causes the 'Black Screen' or 'No Sound' issues.
      iceServers.push(
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
      );
    }

    const pc = new RTCPeerConnection({ 
      iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-compat'
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
      console.log("WebRTC: Remote track received via PC:", event.track.kind);
      setRemoteStream((prev) => {
        const stream = prev || new MediaStream();
        if (!stream.getTracks().find(t => t.id === event.track.id)) {
           stream.addTrack(event.track);
        }
        // Force state update by creating a new stream instance containing all current tracks
        const newStream = new MediaStream(stream.getTracks());
        return newStream;
      });
    };

    pc.oniceconnectionstatechange = () => {
      console.log("WebRTC: ICE connection state changed to:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        setMediaError("Connection failed (Network Issue). Please check your internet or retry call.");
      } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log("WebRTC: P2P Bridge Established!");
        // Re-trigger playback once connection is solid
        const mediaEl = remoteVideoRef.current;
        if (mediaEl && mediaEl.paused) {
           mediaEl.play().catch(() => {});
        }
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
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { }
          });
          iceCandidateQueue.length = 0; // Clear the queue after processing
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
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { }
          });
          iceCandidateQueue.length = 0; // Clear the queue after processing
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
      .on('broadcast', { event: 'rtc_camera_toggle' }, ({ payload }) => {
        if (payload.targetId !== currentUserId) return;
        setRemoteVideoOff(payload.isVideoOff);
      })
      .subscribe(async (status) => {
        // Only the caller throws the first pitch
        if (status === 'SUBSCRIBED' && isCaller) {
          // Add deterministic buffer to ensure the receiver's Supabase channel accurately finished hooking its backend socket.
          timeoutId = setTimeout(async () => {
            try {
              if (pc.signalingState === 'closed') return;
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
      if (timeoutId) clearTimeout(timeoutId);
      // PC should be closed properly
      pc.close();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [streamReady, isAccepted, roomId, targetId, currentUserId, isCaller]);

  // Synchronize remote stream with media element and force playback
  useEffect(() => {
    const mediaEl = remoteVideoRef.current;
    if (mediaEl && remoteStream && isAccepted) {
      console.log("WebRTC: Binding remote stream to media element. Tracks:", remoteStream.getTracks().length);
      
      if (mediaEl.srcObject !== remoteStream) {
        mediaEl.srcObject = remoteStream;
      }
      
      const playMedia = () => {
        // Mute incoming audio temporarily if we suspect a playback block
        mediaEl.play().catch(e => {
            console.warn("WebRTC: Playback deferred. Waiting for hardware context:", e.message);
            // On some mobile devices, we need to show a 'Tap to enable sound' button if play() fails
            setMediaError(`Interaction Required: Tap anywhere to enable ${callType} streaming.`);
        });
      };

      // Ensure tracks are actually enabled
      remoteStream.getTracks().forEach(t => {
        if (t.kind === 'video') console.log("WebRTC: Video track state:", t.readyState, t.enabled);
        if (t.kind === 'audio') console.log("WebRTC: Audio track state:", t.readyState, t.enabled);
      });

      playMedia();
      
      // Also try again after a brief delay to ensure hardware is warm
      const timeoutId = setTimeout(playMedia, 1000);
      return () => {
        clearTimeout(timeoutId);
        // Clean up event listener when stream becomes stale
        remoteStream.onaddtrack = null;
      };
    }
  }, [remoteStream, isAccepted]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = isMuted));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current && callType === 'video') {
      const newState = !isVideoOff;
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
      setIsVideoOff(newState);
      
      // Broadcast state to remote peer via the existing channelRef
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'rtc_camera_toggle',
          payload: { isVideoOff: newState, targetId },
        });
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current) return;
    
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Replace track in peer connection
        const senders = peerConnectionRef.current.getSenders();
        const sender = senders.find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }
        
        // Update local preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        // Handle when user stops sharing via browser UI
        screenTrack.onended = () => {
          stopScreenShare();
        };
        
        // Respect current mute state on the new stream if we were using audio from it
        // Note: Screen share usually doesn't include audio unless requested, 
        // but we want to ensure our mic track is still in the PC and respected.
        
        setIsScreenSharing(true);
      } else {
        await stopScreenShare();
      }
    } catch (err) {
      console.error("Screen share error:", err);
    }
  };

  const stopScreenShare = async () => {
    if (!peerConnectionRef.current) return;
    
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode }, 
        audio: true 
      });
      const cameraTrack = cameraStream.getVideoTracks()[0];
      
      const senders = peerConnectionRef.current.getSenders();
      const sender = senders.find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(cameraTrack);
      }
      
      // Ensure the new camera stream track respects the current UI mute/video toggle state
      cameraStream.getVideoTracks().forEach(t => t.enabled = !isVideoOff);
      cameraStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream;
      }
      
      // Stop the previous hardware tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      localStreamRef.current = cameraStream;
      
      setIsScreenSharing(false);
    } catch (err) {
      console.error("Stop screen share error:", err);
    }
  };

  const flipCamera = async () => {
    if (callType !== 'video' || isScreenSharing) return;
    
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newFacingMode }, 
        audio: true 
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const sender = senders.find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }
      
      // Respect current state
      newStream.getVideoTracks().forEach(t => t.enabled = !isVideoOff);
      newStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
      
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => t.stop());
      }
      
      // Keep existing audio tracks if they are fine, or replace entire stream
      localStreamRef.current = newStream;
    } catch (err) {
      console.error("Flip camera error:", err);
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
        <div className="relative w-full h-full">
          <video
            ref={remoteVideoRef as any}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-700 ${isAccepted && !remoteVideoOff ? 'opacity-100' : 'opacity-0'}`}
          />
          {(remoteVideoOff || !isAccepted) && isAccepted && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]">
               <div className="w-40 h-40 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20 animate-pulse">
                <div className="text-5xl text-primary font-bold uppercase">{(partnerName || '?')[0]}</div>
              </div>
              <p className="mt-6 text-muted-foreground text-sm tracking-widest uppercase">Camera Off</p>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1c1c1c] to-[#0a0a0a]">
          <div className="relative mb-8">
            <div className={`w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20 ${isAccepted ? 'animate-[pulse_3s_ease-in-out_infinite]' : 'animate-bounce'}`}>
              <div className="text-3xl text-primary font-bold uppercase">{(partnerName || '?')[0]}</div>
            </div>
          </div>
          <audio ref={remoteVideoRef as any} autoPlay playsInline />
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
      {callType === 'video' && (
        <div className="absolute top-6 right-6 w-28 h-40 md:w-36 md:h-56 bg-zinc-900 rounded-2xl shadow-2xl border border-white/10 z-30 overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-500 ${!isVideoOff ? 'opacity-100' : 'opacity-0'}`}
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#151515]">
               <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                <div className="text-white/50 font-bold uppercase text-xs">You</div>
              </div>
            </div>
          )}
        </div>
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
          <>
            <button
              onClick={toggleVideo}
              className={`p-3.5 rounded-full transition-all active:scale-95 ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
              title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
            >
              {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
            </button>

            {!isMobile && (
              <button
                onClick={toggleScreenShare}
                className={`p-3.5 rounded-full transition-all active:scale-95 ${isScreenSharing ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
              >
                {isScreenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
              </button>
            )}

            <button
              onClick={flipCamera}
              className="p-3.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all active:scale-95"
              title="Flip Camera"
            >
              <RefreshCw size={22} className={facingMode === 'environment' ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          </>
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
