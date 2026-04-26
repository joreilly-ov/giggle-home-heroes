import { version } from "../../package.json";

const Footer = () => {
  return (
    <footer className="py-12 px-4 bg-foreground text-primary-foreground/70">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-extrabold font-heading text-primary-foreground mb-3">
              Kis<span className="text-accent">X</span>Cars
            </h3>
            <p className="text-sm leading-relaxed">
              Connecting drivers with trusted garages through AI-powered diagnosis and secure payments.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-primary-foreground mb-3 font-heading">For Drivers</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/post-project" className="hover:text-primary transition-colors">Get a Quote</a></li>
              <li><a href="/browse-contractors" className="hover:text-primary transition-colors">Browse Garages</a></li>
              <li><a href="/how-escrow-works" className="hover:text-primary transition-colors">How Escrow Works</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-primary-foreground mb-3 font-heading">For Garages</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/contractor-signup" className="hover:text-primary transition-colors">Sign Up</a></li>
              <li><a href="/ai-bidding-tools" className="hover:text-primary transition-colors">AI Quoting Tools</a></li>
              <li><a href="/same-day-payments" className="hover:text-primary transition-colors">Same-Day Payments</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-primary-foreground mb-3 font-heading">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/about" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="/contact" className="hover:text-primary transition-colors">Contact</a></li>
              <li><a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 pt-6 text-center text-xs flex flex-col gap-1">
          <span>© {new Date().getFullYear()} KisXCars. All rights reserved.</span>
          <span className="text-primary-foreground/30">v{version}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
