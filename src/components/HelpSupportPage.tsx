import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Crown, MessageCircle, Mail } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  { q: "How do I create a casting call?", a: "Go to My Projects and click 'New Project'. Fill in the details about your casting requirements and set the status to 'Active' when ready." },
  { q: "How do I find talent?", a: "Use the search bar or browse by category on the home page. You can save profiles and posts to your Saved Items list available in the side menu." },
  { q: "Is CaastingCall free to use?", a: "Yes! Basic features are free. We may offer premium features in the future for professional users." },
  { q: "How do I message someone?", a: "Go to Messages from the drawer menu. You can start a conversation with any registered user on the platform." },
  { q: "How do I update my profile?", a: "Navigate to My Profile or Settings from the drawer menu to update your name, role, bio, location, and other details." },
];

export default function HelpSupportPage() {
  const { profile, isPremium } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!name || !email || !message) { toast.error("Please fill all fields"); return; }
    toast.success("Message sent! We'll get back to you soon.");
    setName(""); setEmail(""); setMessage("");
  };

  return (
    <motion.div className="max-w-[700px] mx-auto px-4 py-12" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="font-display text-4xl text-primary mb-8">Help & Support</h1>

      <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6 mb-6">
        <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-muted-foreground/40 mb-4">
          Frequently Asked Questions
        </h3>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-border">
              <AccordionTrigger className="text-sm font-normal text-foreground hover:text-primary py-3">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-3">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {isPremium ? (
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 rounded-2xl p-6 mb-6 relative overflow-hidden group">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Crown className="text-black w-7 h-7" />
            </div>
            <div>
              <h3 className="font-display text-xl text-amber-500">Priority VIP Support</h3>
              <p className="text-xs text-amber-200/60 font-normal">As a {profile?.role === 'Admin' ? 'Super Admin' : 'PRO member'}, you have direct access to our support team.</p>
            </div>
            <a
              href="https://wa.me/9779840726604"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto bg-[#25D366] text-white px-5 py-2.5 rounded-xl text-xs font-normal flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-green-500/20"
            >
              <MessageCircle size={16} fill="white" />
              WhatsApp
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-secondary/30 border border-border/50 rounded-2xl p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown size={18} className="text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground font-normal">Want priority support? <button onClick={() => window.location.href = '/premium'} className="text-primary hover:underline italic">Upgrade to PRO</button></p>
          </div>
        </div>
      )}

      <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6 space-y-4">
        <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-muted-foreground/40 mb-2">
          Contact Us
        </h3>
        <div className="flex items-center gap-2 mb-6">
          <Mail size={16} className="text-primary" />
          <p className="text-sm text-muted-foreground">Email us: <a href="mailto:aniltimilsena53@gmail.com" className="hover:text-primary transition-colors">aniltimilsena53@gmail.com</a></p>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full bg-background border-[1.5px] border-border rounded-lg px-4 py-2.5 text-foreground font-body text-sm outline-none focus:border-primary transition-colors" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" type="email" className="w-full bg-background border-[1.5px] border-border rounded-lg px-4 py-2.5 text-foreground font-body text-sm outline-none focus:border-primary transition-colors" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" rows={4} className="w-full bg-background border-[1.5px] border-border rounded-lg px-4 py-2.5 text-foreground font-body text-sm outline-none focus:border-primary transition-colors resize-y" />
        <button onClick={handleSubmit} className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-body font-normal text-sm hover:opacity-85 transition-opacity">
          Send Message
        </button>
      </div>
    </motion.div>
  );
}
