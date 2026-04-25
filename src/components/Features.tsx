import { Camera, Shield, Zap, Star } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Camera,
    title: "Photo & Video Diagnosis",
    description: "Show garages exactly what's wrong with a quick snap. No more guesswork or vague text descriptions.",
  },
  {
    icon: Zap,
    title: "AI-Powered Quotes",
    description: "Our AI analyses the damage and helps garages deliver precise repair estimates — faster than ever.",
    link: "/ai-bidding-tools",
  },
  {
    icon: Shield,
    title: "Escrow Protection",
    description: "Your money stays safe until you confirm the repair meets your standards. Full transparency, zero risk.",
    link: "/same-day-payments",
  },
  {
    icon: Star,
    title: "Vetted Garages",
    description: "Every garage is verified with credential checks, reviews, and repair history before joining.",
    link: "/cslb-check",
  },
];

const Features = () => {
  return (
    <section className="py-20 px-4 bg-secondary">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          Why drivers love KisXCars
        </h2>
        <p className="text-center text-muted-foreground mb-14 max-w-xl mx-auto">
          Built to make car repairs stress-free and transparent.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-card rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow border border-border"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-heading text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              {feature.link && (
                <Link to={feature.link} className="text-sm font-semibold text-primary hover:underline mt-3 inline-block">
                  Learn more →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
