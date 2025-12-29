import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service | Ferunda Tattoo Art</title>
        <meta name="description" content="Terms of Service for Ferunda Tattoo Art - Read our terms and conditions for using our services." />
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
            <h1 className="text-4xl md:text-5xl font-display mb-8">Terms of Service</h1>
            <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            
            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-display mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing or using the Ferunda Tattoo Art website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">2. Services Description</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Ferunda Tattoo Art provides custom tattoo design and application services. Our website allows you to view our portfolio, learn about our services, and submit booking requests for tattoo appointments.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">3. Booking and Appointments</h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>All booking requests are subject to availability and artist approval.</li>
                  <li>A non-refundable deposit may be required to secure your appointment.</li>
                  <li>Cancellations must be made at least 48 hours in advance to avoid forfeiture of deposit.</li>
                  <li>We reserve the right to refuse service to anyone for any reason.</li>
                  <li>Rescheduling is subject to availability and may require a new deposit.</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">4. Age Requirements</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You must be at least 18 years of age to receive tattoo services. Valid government-issued photo identification is required at the time of your appointment.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">5. Health and Safety</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">By booking an appointment, you acknowledge that:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>You are in good health and not under the influence of drugs or alcohol.</li>
                  <li>You have disclosed any medical conditions, allergies, or medications that may affect the tattooing process.</li>
                  <li>You understand that tattooing involves inherent risks and agree to follow all aftercare instructions.</li>
                  <li>You are not pregnant or nursing.</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">6. Intellectual Property</h2>
                <p className="text-muted-foreground leading-relaxed">
                  All custom designs created by Ferunda Tattoo Art remain the intellectual property of the artist. Designs are created exclusively for the client who commissioned them and may not be reproduced or shared without permission. Portfolio images on our website are protected by copyright.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">7. Photography and Media</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may photograph completed tattoos for our portfolio and promotional purposes. If you do not wish to have your tattoo photographed or shared, please inform us before your appointment.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">8. Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Ferunda Tattoo Art is not liable for any indirect, incidental, special, or consequential damages arising from the use of our services. Our total liability shall not exceed the amount paid for the specific service in question.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">9. Refunds and Touch-ups</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Due to the permanent nature of tattoos, refunds are not offered for completed work. Touch-ups may be provided at the artist's discretion for healing-related issues, typically within 30 days of the original session.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">10. Website Use</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">When using our website, you agree not to:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Use the site for any unlawful purpose</li>
                  <li>Attempt to gain unauthorized access to any portion of the website</li>
                  <li>Interfere with the proper functioning of the website</li>
                  <li>Copy, reproduce, or distribute any content without permission</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">11. Changes to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to the website. Your continued use of our services constitutes acceptance of the modified terms.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">12. Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These terms shall be governed by and construed in accordance with the laws of the State of Texas, United States, without regard to its conflict of law provisions.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-display mb-4">13. Contact Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  For questions about these Terms of Service, please contact us at:
                </p>
                <div className="mt-4 p-4 bg-card rounded-lg border border-border">
                  <p className="text-foreground font-medium">Ferunda Tattoo Art</p>
                  <p className="text-muted-foreground">Email: contact@ferunda.art</p>
                  <p className="text-muted-foreground">Website: ferunda.art</p>
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default TermsOfService;
