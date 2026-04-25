import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-20 px-4 bg-primary">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          Ready to fix your car?
        </h2>
        <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
          Join thousands of drivers getting transparent quotes from trusted garages on KisXCars.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8">
            Get a Repair Quote
          </Button>
          <Button variant="hero-outline" size="lg" className="h-12 px-8">
            I'm a Garage
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
