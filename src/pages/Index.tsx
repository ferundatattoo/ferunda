import { useState } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Gallery from "@/components/Gallery";
import About from "@/components/About";
import StorySection from "@/components/StorySection";
import PressSection from "@/components/PressSection";
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
      <Gallery />
      <About />
      <StorySection />
      <InstagramFeed />
      <Footer />
      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
    </main>
  );
};

export default Index;
