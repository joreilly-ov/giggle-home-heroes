import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="KisXCars — AI Vehicle Repair Marketplace"
        description="Snap a photo of vehicle damage and get AI-matched quotes from trusted local garages and bodyshops. Pay safely with escrow-protected bookings."
        path="/"
      />
      <Navbar />
      <main>
        <Hero />
        <div id="how">
          <HowItWorks />
        </div>
        <div id="features">
          <Features />
        </div>
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
