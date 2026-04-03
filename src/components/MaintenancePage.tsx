import { motion } from "framer-motion";
import { Hammer, HardHat, Clock, Sparkles } from "lucide-react";

const MaintenancePage = () => {
    return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-primary/30">
            {/* Cinematic Background Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary rounded-full blur-[160px] animate-pulse" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500 rounded-full blur-[140px] opacity-10" />
            </div>

            {/* Noise Grid Overlay */}
            <div className="absolute inset-0 z-[1] opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <div className="relative z-10 w-full max-w-2xl text-center space-y-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="space-y-4"
                >
                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            >
                                <HardHat size={80} className="text-primary drop-shadow-[0_0_25px_rgba(212,175,55,0.4)]" />
                            </motion.div>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute -top-2 -right-2 text-primary/60"
                            >
                                <Sparkles size={24} />
                            </motion.div>
                        </div>
                    </div>

                    <h1 className="font-display text-5xl md:text-7xl text-white tracking-tight leading-tight">
                        Under <span className="text-primary italic">Maintenance</span>
                    </h1>
                    
                    <p className="text-muted-foreground/80 md:text-xl font-body max-w-lg mx-auto leading-relaxed">
                        We're currently fine-tuning the stage to bring you an even better casting experience. 
                        We'll be back online in the spotlight shortly.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-white/5"
                >
                    <div className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                            <Clock size={24} />
                        </div>
                        <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Estimated Time</span>
                        <span className="text-sm font-bold text-white tracking-widest uppercase">Coming Soon</span>
                    </div>

                    <div className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2">
                            <Hammer size={24} />
                        </div>
                        <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Improvements</span>
                        <span className="text-sm font-bold text-white tracking-widest uppercase">Ongoing Stage Setup</span>
                    </div>

                    <div className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                            <Sparkles size={24} />
                        </div>
                        <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Stage Status</span>
                        <span className="text-sm font-bold text-white tracking-widest uppercase">Polishing Assets</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="pt-12 text-[0.6rem] font-black uppercase tracking-[4px] text-muted-foreground/40 animate-pulse"
                >
                    Thank you for your patience
                </motion.div>
            </div>
        </div>
    );
};

export default MaintenancePage;
