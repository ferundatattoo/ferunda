import { useState } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Gallery from "@/components/Gallery";
import About from "@/components/About";
import StorySection from "@/components/StorySection";
import PressSection from "@/components/PressSection";
import ArtistCinematic from "@/components/ArtistCinematic";
import VideoInterlude from "@/components/VideoInterlude";
import InstagramFeed from "@/components/InstagramFeed";
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";
import FloatingParticles from "@/components/FloatingParticles";
import CustomCursor from "@/components/CustomCursor";
import SectionTransition from "@/components/SectionTransition";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import ChatAssistant from "@/components/ChatAssistant";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";

// Conversion-focused components
import ExitIntentPopup from "@/components/ExitIntentPopup";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import StickyCTABar from "@/components/StickyCTABar";
import TrustBadges from "@/components/TrustBadges";
import NewsletterPopup from "@/components/NewsletterPopup";
import BookingCTASection from "@/components/BookingCTASection";

const Index = () => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const handleBookingClick = () => setIsBookingOpen(true);

  return (
    <main className="min-h-screen bg-background relative overflow-x-hidden">
      <CustomCursor />
      <FloatingParticles />
      
      {/* Floating Elements */}
      <FloatingWhatsApp />
      <ChatAssistant />
      <StickyCTABar onBookingClick={handleBookingClick} />
      <NewsletterPopup />
      <ExitIntentPopup onBookingClick={handleBookingClick} />
      
      <Navigation onBookingClick={handleBookingClick} />
      
      <Hero />
      
      {/* Trust Badges - Early social proof */}
      <TrustBadges />
      
      <SectionTransition>
        <PressSection />
      </SectionTransition>
      
      <VideoInterlude 
        variant="smoke" 
        quote="Every tattoo tells a story. Mine is about transformation." 
        author="Ferunda"
      />
      
      <SectionTransition>
        <Gallery />
      </SectionTransition>
      
      {/* Testimonials - Social proof after seeing work */}
      <SectionTransition>
        <Testimonials />
      </SectionTransition>
      
      <SectionTransition>
        <ArtistCinematic />
      </SectionTransition>
      
      <VideoInterlude 
        variant="rotating" 
        quote="I don't just create tattoos. I capture emotions in permanent form." 
        author="Ferunda"
      />
      
      <SectionTransition>
        <About />
      </SectionTransition>
      
      <SectionTransition>
        <StorySection />
      </SectionTransition>
      
      {/* Availability Calendar */}
      <SectionTransition>
        <AvailabilityCalendar />
      </SectionTransition>
      
      {/* FAQ Section - Address objections */}
      <SectionTransition>
        <FAQ />
      </SectionTransition>
      
      {/* Strong CTA before final sections */}
      <BookingCTASection onBookingClick={handleBookingClick} />
      
      <SectionTransition>
        <InstagramFeed />
      </SectionTransition>
      
      <Footer />
      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
    </main>
  );
};

export default Index;
