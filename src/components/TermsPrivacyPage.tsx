import { motion } from "framer-motion";

export default function TermsPrivacyPage() {
  return (
    <motion.div className="max-w-[700px] mx-auto px-4 py-12" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="font-display text-4xl text-primary mb-8">Terms & Privacy</h1>

      <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6 mb-6">
        <h2 className="font-display text-2xl text-foreground mb-4">Terms of Service</h2>
        <div className="text-sm text-muted-foreground space-y-3">
          <p>Welcome to CastingCall. By using our platform, you agree to these terms.</p>
          <p><strong className="text-foreground">1. Account Responsibility.</strong> You are responsible for maintaining the confidentiality of your account credentials. You must be at least 18 years old to use this service.</p>
          <p><strong className="text-foreground">2. Acceptable Use.</strong> You agree not to misuse the platform, harass other users, or post misleading content. All profiles must represent real individuals.</p>
          <p><strong className="text-foreground">3. Content Ownership.</strong> You retain ownership of content you upload. By posting, you grant CastingCall a non-exclusive license to display your content on the platform.</p>
          <p><strong className="text-foreground">4. Termination.</strong> We reserve the right to suspend or terminate accounts that violate these terms.</p>
          <p><strong className="text-foreground">5. Limitation of Liability.</strong> CastingCall is provided "as is." We are not liable for any damages arising from the use of the platform.</p>
        </div>
      </div>

      <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
        <h2 className="font-display text-2xl text-foreground mb-4">Privacy Policy</h2>
        <div className="text-sm text-muted-foreground space-y-3">
          <p>Your privacy is important to us. This policy explains how we collect and use your information.</p>
          <p><strong className="text-foreground">Information We Collect.</strong> We collect your name, email, role, location, bio, and profile photo when you create an account. We also collect usage data to improve our services.</p>
          <p><strong className="text-foreground">How We Use Your Data.</strong> Your profile information is displayed publicly to other users. We use your email for account-related communications only.</p>
          <p><strong className="text-foreground">Data Security.</strong> We use industry-standard security measures to protect your data including encryption and secure database access controls.</p>
          <p><strong className="text-foreground">Your Rights.</strong> You can update or delete your profile information at any time through the Settings page. Contact us if you wish to delete your account entirely.</p>
          <p><strong className="text-foreground">Contact.</strong> For privacy-related inquiries, reach out through our Help & Support page.</p>
        </div>
      </div>
    </motion.div>
  );
}
