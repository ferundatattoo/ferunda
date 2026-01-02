import { useEffect, useState, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import TrustBadges from "@/components/TrustBadges";
import Footer from "@/components/Footer";
import SectionSkeleton from "@/components/SectionSkeleton";

// Lazy load below-the-fold components
const Gallery = lazy(() => import("@/components/Gallery"));
const About = lazy(() => import("@/components/About"));
const StorySection = lazy(() => import("@/components/StorySection"));
const PressSection = lazy(() => import("@/components/PressSection"));
const ArtistCinematic = lazy(() => import("@/components/ArtistCinematic"));
const VideoInterlude = lazy(() => import("@/components/VideoInterlude"));
const InstagramFeed = lazy(() => import("@/components/InstagramFeed"));
const BookingWizard = lazy(() => import("@/components/BookingWizard"));
const FloatingParticles = lazy(() => import("@/components/FloatingParticles"));
const SectionTransition = lazy(() => import("@/components/SectionTransition"));
const AvailabilityCalendar = lazy(() => import("@/components/AvailabilityCalendar"));
const ExitIntentPopup = lazy(() => import("@/components/ExitIntentPopup"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const FAQ = lazy(() => import("@/components/FAQ"));
const StickyCTABar = lazy(() => import("@/components/StickyCTABar"));
const NewsletterPopup = lazy(() => import("@/components/NewsletterPopup"));
const BookingCTASection = lazy(() => import("@/components/BookingCTASection"));

const Index = () => {
  const location = useLocation();
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const handleBookingClick = () => setIsBookingOpen(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("book") === "1") {
      setIsBookingOpen(true);
    }
  }, [location.search]);

  return (
    <div className="landing-dark">
      <main className="min-h-screen bg-background relative overflow-x-hidden">
        
        {/* Lazy load particles - not critical */}
        <Suspense fallback={null}>
          <FloatingParticles />
        </Suspense>
        
        {/* Lazy load floating elements */}
        <Suspense fallback={null}>
          <StickyCTABar onBookingClick={handleBookingClick} />
          <NewsletterPopup />
          <ExitIntentPopup onBookingClick={handleBookingClick} />
        </Suspense>
        
        <Navigation onBookingClick={handleBookingClick} />
        
        {/* Critical above-the-fold content - loads immediately */}
        <Hero />
        
        {/* Trust Badges - Early social proof */}
        <TrustBadges />
        
        {/* Below-the-fold content - lazy loaded */}
        <Suspense fallback={<SectionSkeleton />}>
          <SectionTransition>
            <PressSection />
          </SectionTransition>
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <VideoInterlude 
            variant="smoke" 
            quote="Every tattoo tells a story. Mine is about transformation." 
            author="Ferunda"
          />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <SectionTransition>
            <Gallery />
          </SectionTransition>
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <SectionTransition>
            <Testimonials />
          </SectionTransition>
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <SectionTransition>
            <ArtistCinematic />
          </SectionTransition>
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <VideoInterlude 
            variant="rotating" 
            quote="I don't just create tattoos. I capture emotions in permanent form." 
            author="Ferunda"
          />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <SectionTransition>
            <About />
          </SectionTransition>
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <SectionTransition>
            <StorySection />
          </SectionTransition>
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <SectionTransition>
            <AvailabilityCalendar />
          </SectionTransition>
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <SectionTransition>
            <FAQ />
          </SectionTransition>
        </Suspense>
        
        <Suspense fallback={null}>
          <BookingCTASection onBookingClick={handleBookingClick} />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <SectionTransition>
            <InstagramFeed />
          </SectionTransition>
        </Suspense>
        
        <Footer />
      </main>
      
      {/* Modals - lazy loaded */}
      <Suspense fallback={null}>
        {isBookingOpen && (
          <BookingWizard isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
        )}
      </Suspense>
    </div>
  );
};

export default Index;
