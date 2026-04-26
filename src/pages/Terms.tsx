import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Terms = () => (
  <div className="min-h-screen flex flex-col page-bg">
    <Navbar variant="solid" />
    <main className="flex-1 max-w-3xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-extrabold font-heading text-foreground mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: April 26, 2026</p>

      <div className="space-y-6 text-muted-foreground">
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-bold font-heading text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using KisXCars, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the platform.</p>
        </section>
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-bold font-heading text-foreground mb-2">2. The Service</h2>
          <p>KisXCars is a marketplace that connects drivers with independent garages and mechanics. We do not perform repairs ourselves and are not party to any service agreement between drivers and garages.</p>
        </section>
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-bold font-heading text-foreground mb-2">3. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate and up-to-date information.</p>
        </section>
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-bold font-heading text-foreground mb-2">4. Acceptable Use</h2>
          <p>You agree not to misuse the platform, including by submitting false information, attempting to circumvent payment systems, harassing other users, or using the service for any unlawful purpose.</p>
        </section>
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-bold font-heading text-foreground mb-2">5. Payments and Escrow</h2>
          <p>Payments are processed by third-party providers and held in escrow until work is marked complete. Released funds, refunds, and disputes are governed by the escrow terms presented at the point of payment.</p>
        </section>
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-bold font-heading text-foreground mb-2">6. Disclaimers</h2>
          <p>The service is provided "as is" without warranties of any kind. KisXCars does not guarantee the quality, safety, or legality of any work performed by garages listed on the platform.</p>
        </section>
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-bold font-heading text-foreground mb-2">7. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, KisXCars shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the platform.</p>
        </section>
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-bold font-heading text-foreground mb-2">8. Termination</h2>
          <p>We may suspend or terminate your access to the platform at any time for violation of these terms or for any other reason at our sole discretion.</p>
        </section>
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-bold font-heading text-foreground mb-2">9. Changes to These Terms</h2>
          <p>We may update these terms from time to time. Continued use of the platform after changes are posted constitutes acceptance of the revised terms.</p>
        </section>
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-bold font-heading text-foreground mb-2">10. Contact</h2>
          <p>Questions about these terms? Reach us at support@kisx.com.</p>
        </section>
      </div>
    </main>
    <Footer />
  </div>
);

export default Terms;