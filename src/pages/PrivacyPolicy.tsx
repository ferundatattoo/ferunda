import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Ferunda Tattoo Art</title>
        <meta name="description" content="Privacy Policy for Ferunda Tattoo Art - Learn how we collect, use, and protect your personal information." />
      </Helmet>
      
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Link to="/">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-display mb-8">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            
            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-display mb-4">1. Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Welcome to Ferunda Tattoo Art ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">2. Information We Collect</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">We may collect information about you in various ways, including:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li><strong>Personal Data:</strong> Name, email address, phone number, and other contact information you provide when booking appointments or contacting us.</li>
                  <li><strong>Booking Information:</strong> Tattoo descriptions, placement preferences, reference images, and scheduling preferences.</li>
                  <li><strong>Usage Data:</strong> Information about how you interact with our website, including pages visited, time spent, and navigation patterns.</li>
                  <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers.</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">3. Google Calendar Integration</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Our application integrates with Google Calendar to manage appointment scheduling. When you authorize this integration, we access:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li><strong>Calendar Events:</strong> We read calendar events to check availability and sync appointments.</li>
                  <li><strong>Event Management:</strong> We may create, update, or delete calendar events related to your tattoo appointments.</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  We only access calendar data necessary for scheduling purposes and do not share this information with third parties. You can revoke this access at any time through your Google Account settings.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">4. How We Use Your Information</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">We use the information we collect to:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Process and manage your tattoo booking requests</li>
                  <li>Communicate with you about appointments, updates, and promotions</li>
                  <li>Improve our website and services</li>
                  <li>Respond to your inquiries and provide customer support</li>
                  <li>Send you newsletters and marketing communications (with your consent)</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">5. Data Sharing and Disclosure</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We do not sell your personal information. We may share your data with:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li><strong>Service Providers:</strong> Third-party vendors who help us operate our website and services (e.g., hosting, email services).</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety.</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">6. Data Security</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">7. Your Rights</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Depending on your location, you may have the right to:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Access the personal data we hold about you</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Object to or restrict processing of your data</li>
                  <li>Data portability</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">8. Cookies</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use cookies and similar tracking technologies to enhance your experience on our website. You can control cookie preferences through your browser settings.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">9. Third-Party Links</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">10. Children's Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from minors.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">11. Changes to This Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">12. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about this privacy policy or our data practices, please contact us at:
                </p>
                <div className="mt-4 p-4 bg-card rounded-lg border border-border">
                  <p className="text-foreground font-medium">Ferunda Tattoo Art</p>
                  <p className="text-muted-foreground">Email: contact@ferunda.com</p>
                  <p className="text-muted-foreground">Website: ferunda.com</p>
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
