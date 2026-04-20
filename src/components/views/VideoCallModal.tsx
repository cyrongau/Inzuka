import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Video, VideoOff, PhoneOff, Maximize, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export default function VideoCallModal({ onClose, targetName, isGroup = false }: { onClose: () => void, targetName?: string, isGroup?: boolean }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Timer
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function setupCamera() {
      try {
        const str = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(str);
        if (videoRef.current) {
          videoRef.current.srcObject = str;
        }
      } catch (e) {
        console.error("Camera access denied or unavailable", e);
      }
    }
    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(t => t.enabled = isMuted);
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(t => t.enabled = isVideoOff);
    }
    setIsVideoOff(!isVideoOff);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-5xl h-[85vh] mx-4 rounded-[3rem] overflow-hidden relative flex flex-col shadow-2xl bg-gray-900 border border-white/10">
         
         <div className="absolute top-8 left-8 z-20 flex items-center gap-4 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white font-bold tracking-widest uppercase text-[10px]">
              {isGroup ? 'Family Group Call' : `Call with ${targetName || 'Family Member'}`}
            </span>
            <span className="text-white/60 font-mono text-[10px] ml-2">{formatTime(duration)}</span>
         </div>

         <div className="flex-1 relative bg-black flex items-center justify-center p-8">
            {/* Main Stage (Mock other person / group) */}
            <div className="w-full h-full relative border border-white/5 rounded-[2rem] overflow-hidden bg-gray-800 flex items-center justify-center">
               <div className="absolute inset-0 pattern-dots opacity-10 bg-[length:20px_20px]" />
               
               {isGroup ? (
                  <div className="grid grid-cols-2 gap-4 w-full h-full p-4">
                     {[1,2,3,4].map(i => (
                        <div key={i} className="bg-gray-700 rounded-3xl relative overflow-hidden flex items-center justify-center">
                           <UserIcon className="w-16 h-16 text-gray-600" />
                           <div className="absolute bottom-4 left-4 bg-black/40 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest shadow-sm backdrop-blur-sm">Member {i}</div>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="flex flex-col items-center gap-6 z-10">
                     <div className="w-40 h-40 bg-indigo-500/20 rounded-full flex items-center justify-center shadow-2xl relative">
                        <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20" />
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${targetName || 'user'}`} className="w-32 h-32 rounded-full" alt="Avatar" />
                     </div>
                     <h3 className="text-3xl font-black text-white italic serif">{targetName || 'Family Member'}</h3>
                     <p className="text-white/40 uppercase tracking-widest text-xs font-bold font-mono">Connected</p>
                  </div>
               )}
            </div>

            {/* Self Video PIP */}
            <motion.div 
               drag
               dragConstraints={{ left: -300, right: 300, top: -200, bottom: 200 }}
               className="absolute bottom-8 right-8 w-48 h-64 bg-black rounded-[2rem] border-2 border-white/20 shadow-2xl overflow-hidden cursor-move z-30 group"
            >
               {isVideoOff ? (
                 <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800">
                    <UserIcon className="w-12 h-12 text-gray-600 mb-2" />
                    <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Camera Off</span>
                 </div>
               ) : (
                 <video 
                   ref={videoRef} 
                   autoPlay 
                   playsInline 
                   muted 
                   className="w-full h-full object-cover -scale-x-100" 
                 />
               )}
               <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded-md text-[8px] font-bold text-white uppercase tracking-widest backdrop-blur-sm">You</div>
            </motion.div>
         </div>

         {/* Call Controls */}
         <div className="h-32 bg-gray-900 border-t border-white/10 flex items-center justify-center gap-6 px-8 z-20">
            <button 
              onClick={toggleMute}
              className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg", isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20")}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button 
              onClick={toggleVideo}
              className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg", isVideoOff ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20")}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
            
            <button 
              onClick={onClose}
              className="w-20 h-14 rounded-[1.5rem] bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-xl hover:scale-105 active:scale-95 mx-4"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            <button className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all shadow-lg">
              <Maximize className="w-5 h-5" />
            </button>
         </div>
      </div>
    </div>
  );
}
