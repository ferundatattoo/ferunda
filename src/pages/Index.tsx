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

const Index = () => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background relative">
      <FloatingParticles />
      <Navigation onBookingClick={() => setIsBookingOpen(true)} />
      <Hero />
      <PressSection />
      <VideoInterlude 
        variant="smoke" 
        quote="Every tattoo tells a story. Mine is about transformation." 
        author="Ferunda"
      />
      <Gallery />
      <ArtistCinematic />
      <VideoInterlude 
        variant="rotating" 
        quote="I don't just create tattoos. I capture emotions in permanent form." 
        author="Ferunda"
      />
      <About />
      <StorySection />
      <InstagramFeed />
      <Footer />
      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
    </main>
  );
};

export default Index;
