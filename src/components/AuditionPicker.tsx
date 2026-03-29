import { useState, useEffect, useCallback } from "react";
import { auditionService, AuditionSlot } from "@/services/auditionService";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Plus, Trash2, X, Check, Users, Video, Zap, FilePlus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AuditionPickerProps {
  projectId: string;
  talentId: string;
  onClose: () => void;
}

export default function AuditionPicker({ projectId, talentId, onClose }: AuditionPickerProps) {
  const [slots, setSlots] = useState<AuditionSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditionService.getProjectSlots(projectId);
      setSlots(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleBook = async (id: string) => {
    setIsBooking(id);
    try {
        await auditionService.bookSlot(id, talentId);
        toast.success("Audition booked! Information sent to the caster.", { icon: "🎥" });
        fetchSlots();
    } catch (err: any) {
        toast.error(err.message || "Failed to book slot");
    } finally {
        setIsBooking(null);
    }
  };

  const myBookedSlot = slots.find(s => s.talent_id === talentId);

  return (
    <div className="flex flex-col h-full bg-[#090909]">
      <div className="p-8 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-display text-primary uppercase tracking-[2px]">Book Your Audition</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[3px] mt-1 font-bold">Available Time Windows</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40"><X size={24} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
        {myBookedSlot && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-primary/10 border border-primary/40 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden shadow-2xl"
            >
                <div className="stitched-card-scanner" />
                <div className="text-center md:text-left flex-1">
                   <div className="text-primary text-[10px] font-bold uppercase tracking-[4px] mb-4">Confirmed Audition Slot</div>
                   <h4 className="text-3xl font-display text-white mb-2">{format(new Date(myBookedSlot.start_time), "EEEE, MMMM do")}</h4>
                   <h5 className="text-5xl font-display text-white mb-4">{format(new Date(myBookedSlot.start_time), "p")}</h5>
                   <p className="text-sm font-body text-white/60 leading-relaxed mb-6">Your audition link and further details will be provided by the casting director shortly before the session starts.</p>
                   
                   <div className="flex gap-4">
                     <button className="bg-primary text-primary-foreground px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-[2px] transition-all flex items-center gap-2 hover:scale-105 active:scale-95 shadow-xl shadow-primary/20">
                        <Video size={16} /> Add to Calendar
                     </button>
                     <button onClick={() => auditionService.cancelBooking(myBookedSlot.id).then(fetchSlots)} className="px-6 py-3 rounded-xl text-xs font-bold text-white/50 hover:text-red-500 transition-colors uppercase tracking-[2px]">Cancel Booking</button>
                   </div>
                </div>
                <div className="w-48 h-48 bg-white/5 rounded-[3rem] border border-white/10 flex items-center justify-center text-primary animate-pulse">
                   <Calendar size={64} />
                </div>
            </motion.div>
        )}

        {loading ? (
             <div className="flex items-center justify-center py-20 opacity-40"><Zap className="text-primary animate-pulse" /></div>
        ) : !myBookedSlot && slots.filter(s => !s.talent_id).length === 0 ? (
            <div className="py-20 text-center opacity-30 border-2 border-dashed border-white/10 rounded-[2.5rem]">
               <Calendar size={48} className="mx-auto mb-4" />
               <p className="font-body text-sm">No available slots at this time.</p>
               <p className="text-[10px] uppercase tracking-widest mt-2">Check back later or contact the caster</p>
            </div>
        ) : !myBookedSlot && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {slots.filter(s => !s.talent_id).map(slot => (
                    <motion.div 
                        key={slot.id} 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="group bg-card border border-white/5 hover:border-primary/50 rounded-[2.5rem] p-8 flex flex-col items-center text-center transition-all cursor-pointer relative overflow-hidden h-64"
                        onClick={() => handleBook(slot.id)}
                    >
                        <div className="stitched-card-scanner" />
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex flex-col items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all mb-6">
                            <span className="text-[9px] font-bold uppercase">{format(new Date(slot.start_time), "MMM")}</span>
                            <span className="text-lg font-display leading-none">{format(new Date(slot.start_time), "dd")}</span>
                        </div>
                        <h4 className="text-xl font-display text-white mb-2 leading-none uppercase tracking-[1px]">{format(new Date(slot.start_time), "p")}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[3px] font-bold mb-6">{format(new Date(slot.start_time), "EEEE")}</p>
                        <button 
                            disabled={isBooking === slot.id}
                            className="w-full py-3 bg-white/5 group-hover:bg-primary group-hover:text-primary-foreground border border-white/10 group-hover:border-transparent rounded-2xl text-[10px] font-bold uppercase tracking-[4px] transition-all flex items-center justify-center gap-2"
                        >
                            {isBooking === slot.id ? <Zap size={14} className="animate-spin" /> : "Pick Slot"} <ChevronRight size={14} />
                        </button>
                    </motion.div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
