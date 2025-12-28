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

const Index = () => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background relative overflow-x-hidden">
      <CustomCursor />
      <FloatingParticles />
      <Navigation onBookingClick={() => setIsBookingOpen(true)} />
      
      <Hero />
      
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
      
      <SectionTransition>
        <InstagramFeed />
      </SectionTransition>
      
      <Footer />
      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
    </main>
  );
};

export default Index;
