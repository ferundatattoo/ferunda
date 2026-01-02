import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
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
import BookingWizard from "@/components/BookingWizard";
import FloatingParticles from "@/components/FloatingParticles";

import SectionTransition from "@/components/SectionTransition";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import LoadingScreen from "@/components/LoadingScreen";

// Conversion-focused components
import ExitIntentPopup from "@/components/ExitIntentPopup";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import StickyCTABar from "@/components/StickyCTABar";
import TrustBadges from "@/components/TrustBadges";
import NewsletterPopup from "@/components/NewsletterPopup";
import BookingCTASection from "@/components/BookingCTASection";

const Index = () => {
  const location = useLocation();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleBookingClick = () => setIsBookingOpen(true);
  const handleLoadingComplete = () => setIsLoading(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("book") === "1") {
      setIsBookingOpen(true);
    }
  }, [location.search]);

  return (
    <div className="landing-dark">
      {isLoading && <LoadingScreen onLoadingComplete={handleLoadingComplete} />}
      <main className="min-h-screen bg-background relative overflow-x-hidden">
        
        <FloatingParticles />
        
        {/* Floating Elements - FerundaAgent is global in App.tsx */}
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
      </main>
      
      {/* Modals */}
      <BookingWizard isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
    </div>
  );
};

export default Index;
