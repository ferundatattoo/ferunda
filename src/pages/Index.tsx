import { useState } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Gallery from "@/components/Gallery";
import About from "@/components/About";
import ContactModal from "@/components/ContactModal";
import Footer from "@/components/Footer";

const Index = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background">
      <Navigation onContactClick={() => setIsContactOpen(true)} />
      <Hero />
      <Gallery />
      <About />
      <Footer />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </main>
  );
};

export default Index;
