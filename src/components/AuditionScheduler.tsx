import { useState, useEffect, useCallback } from "react";
import { auditionService, AuditionSlot } from "@/services/auditionService";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Plus, Trash2, X, Check, Users, Video, Zap, FilePlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AuditionSchedulerProps {
  projectId: string;
  casterId: string;
  onClose: () => void;
}

export default function AuditionScheduler({ projectId, casterId, onClose }: AuditionSchedulerProps) {
  const [slots, setSlots] = useState<AuditionSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  
  // Generator form
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [slotDuration, setSlotDuration] = useState(15);
  const [numSlots, setNumSlots] = useState(5);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditionService.getProjectSlots(projectId);
      setSlots(data || []);
    } catch (err) {
      toast.error("Failed to load audition slots");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleGenerate = async () => {
    const newSlots = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < numSlots; i++) {
        const slotStart = new Date(start.getTime() + i * slotDuration * 60000);
        const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);
        newSlots.push({
            start_time: slotStart.toISOString(),
            end_time: slotEnd.toISOString()
        });
    }

    try {
        await auditionService.createSlots(projectId, casterId, newSlots);
        toast.success(`Generated ${numSlots} audition slots!`, { icon: "📅" });
        setShowGenerator(false);
        fetchSlots();
    } catch (err) {
        toast.error("Generation failed");
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
        await auditionService.deleteSlot(id);
        setSlots(prev => prev.filter(s => s.id !== id));
        toast.success("Slot deleted");
    } catch (err) {
        toast.error("Action failed");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#090909]">
      <div className="p-8 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-display text-primary uppercase tracking-[2px]">Audition Schedule</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[3px] mt-1 font-bold">Project Audition Pipeline</p>
        </div>
        <div className="flex gap-4">
           {!showGenerator && (
             <button 
                onClick={() => setShowGenerator(true)}
                className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <FilePlus size={14} /> Batch Create
            </button>
           )}
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40"><X size={24} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
        <AnimatePresence>
          {showGenerator && (
            <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className="bg-[#111111] border border-primary/20 rounded-[2rem] p-8 mb-8 relative overflow-hidden shadow-2xl"
            >
              <div className="stitched-card-scanner" />
              <h4 className="text-xs font-bold text-primary uppercase tracking-[4px] mb-6">Quick Slot Generator</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-[2px]">Starting From</label>
                  <input 
                    type="datetime-local" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-[2px]">Duration (Mins)</label>
                  <input 
                    type="number" 
                    value={slotDuration} 
                    onChange={e => setSlotDuration(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-[2px]">No. of Slots</label>
                  <input 
                    type="number" 
                    value={numSlots} 
                    onChange={e => setNumSlots(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setShowGenerator(false)} className="px-6 py-3 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-widest">Discard</button>
                <button onClick={handleGenerate} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[3px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20">Generate Agenda</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
             <div className="flex items-center justify-center py-20 opacity-40"><Zap className="text-primary animate-pulse" /></div>
        ) : slots.length === 0 ? (
            <div className="py-20 text-center opacity-30 border-2 border-dashed border-white/10 rounded-[2.5rem]">
               <Calendar size={48} className="mx-auto mb-4" />
               <p className="font-body text-sm">No audition slots scheduled.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {slots.map(slot => (
                    <motion.div 
                        key={slot.id} 
                        layout
                        className={`bg-card border rounded-3xl p-5 flex items-center justify-between group transition-all ${slot.talent_id ? 'border-primary/50 bg-primary/5' : 'border-white/5 hover:border-white/20'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center ${slot.talent_id ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground'}`}>
                                <span className="text-[10px] font-bold uppercase">{format(new Date(slot.start_time), "MMM")}</span>
                                <span className="text-lg font-display leading-none">{format(new Date(slot.start_time), "dd")}</span>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white mb-0.5">{format(new Date(slot.start_time), "p")} - {format(new Date(slot.end_time), "p")}</div>
                                <div className="flex items-center gap-2">
                                    {slot.talent_id ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full bg-secondary border border-primary/30 overflow-hidden">
                                                <img src={slot.profiles?.photo_url} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <span className="text-[9px] font-bold text-primary uppercase tracking-widest leading-none">Booked by {slot.profiles?.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Unassigned Slot</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                           {!slot.talent_id && (
                             <button 
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="p-3 bg-red-500/10 text-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                title="Delete Slot"
                            >
                                <Trash2 size={16} />
                            </button>
                           )}
                           {slot.talent_id && <Check size={18} className="text-primary mr-2" />}
                        </div>
                    </motion.div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
