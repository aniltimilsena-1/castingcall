import { motion } from "framer-motion";

export default function TermsPrivacyPage() {
  return (
    <motion.div className="max-w-[700px] mx-auto px-4 py-12" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="font-display text-4xl text-foreground mb-8">Terms & Privacy</h1>

      <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6 mb-6">
        <h2 className="font-display text-2xl text-foreground mb-4">Terms of Service</h2>
        <div className="text-sm text-muted-foreground space-y-3">
          <p>Welcome to CaastingCall. By using our platform, you agree to these terms.</p>
          <p><span className="text-foreground font-normal">1. Account Responsibility.</span> You are responsible for maintaining the confidentiality of your account credentials. You must be at least 18 years old to use this service.</p>
          <p><span className="text-foreground font-normal">2. Acceptable Use.</span> You agree not to misuse the platform, harass other users, or post misleading content. All profiles must represent real individuals.</p>
          <p><span className="text-foreground font-normal">3. Content Ownership.</span> You retain ownership of content you upload. By posting, you grant CaastingCall a non-exclusive license to display your content on the platform.</p>
          <p><span className="text-foreground font-normal">4. Termination.</span> We reserve the right to suspend or terminate accounts that violate these terms.</p>
          <p><span className="text-foreground font-normal">5. Limitation of Liability.</span> CaastingCall is provided "as is." We are not liable for any damages arising from the use of the platform.</p>
        </div>
      </div>

      <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
        <h2 className="font-display text-2xl text-foreground mb-4">Privacy Policy</h2>
        <div className="text-sm text-muted-foreground space-y-3">
          <p>Your privacy is important to us. This policy explains how we collect and use your information.</p>
          <p><span className="text-foreground font-normal">Information We Collect.</span> We collect your name, email, role, location, bio, and profile photo when you create an account. We also collect usage data to improve our services.</p>
          <p><span className="text-foreground font-normal">How We Use Your Data.</span> Your profile information is displayed publicly to other users. We use your email for account-related communications only.</p>
          <p><span className="text-foreground font-normal">Data Security.</span> We use industry-standard security measures to protect your data including encryption and secure database access controls.</p>
          <p><span className="text-foreground font-normal">Your Rights.</span> You can update or delete your profile information at any time through the Settings page. Contact us if you wish to delete your account entirely.</p>
          <p><span className="text-foreground font-normal">Contact.</span> For privacy-related inquiries, reach out through our Help & Support page.</p>
        </div>
      </div>
    </motion.div>
  );
}
