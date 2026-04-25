import { Link } from "react-router-dom";
import {
  Bot,
  Gavel,
  ListChecks,
  TrendingUp,
  MessageSquare,
  FileText,
  Clock,
  Zap,
  CheckCircle2,
  ArrowRight,
  Camera,
  Flame,
  PoundSterling,
  Users,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ─── Data ─────────────────────────────────────────────────────────────────────

const coreFeatures = [
  {
    icon: Search,
    title: "AI-matched job feed",
    description:
      "Jobs are surfaced to you based on your declared expertise. Plumber? You see plumbing jobs first. The feed re-ranks automatically so the most relevant work is always at the top — no scrolling through irrelevant listings.",
    detail: "Matched using your expertise categories. Update them any time in Profile Settings.",
  },
  {
    icon: Bot,
    title: "AI job diagnosis in every listing",
    description:
      "Every job card shows you what the AI already knows: the likely issue, urgency level, materials probably involved, and the location in the home. You're briefed before you even open the job.",
    detail: "Pulled from the homeowner's video analysis — the same AI that classified the project.",
  },
  {
    icon: ListChecks,
    title: "Task breakdown generator",
    description:
      "Before you bid, generate a step-by-step task list for the job powered by Google Gemini. Each task comes with a difficulty rating (easy / medium / hard) and a time estimate in minutes. Total time calculated automatically.",
    detail: "Runs in seconds. Use it to sanity-check your quote or share it as part of your note to the homeowner.",
  },
  {
    icon: FileText,
    title: "Instant RFP documents",
    description:
      "Turn any accepted job into a formal Request for Proposal document — executive summary, scope of work, cost estimate range, and permit notes — all AI-generated from the job details.",
    detail: "Useful for larger jobs where a written scope helps manage expectations before work begins.",
  },
  {
    icon: MessageSquare,
    title: "Q&A before you commit",
    description:
      "Ask the homeowner clarifying questions directly from the job listing — before you put in a number. The AI suggests questions to ask based on what it flagged as ambiguous about the project.",
    detail: "Homeowners are notified immediately. Answered questions are visible to all bidding contractors.",
  },
  {
    icon: TrendingUp,
    title: "Bid pipeline dashboard",
    description:
      "Track every bid you've submitted: how many are open, your running win rate, and your total pipeline value in pounds. When a bid is accepted, milestones appear inline — no separate screen to find.",
    detail: "Pipeline includes pending + accepted bids. Rejected bids are excluded from the value figure.",
  },
];

const workflowSteps = [
  {
    icon: Flame,
    step: "1",
    title: "Browse matched jobs",
    description:
      "Open the job feed. Jobs matching your expertise are ranked first, flagged with a 'Matches your expertise' badge.",
  },
  {
    icon: Bot,
    step: "2",
    title: "Read the AI diagnosis",
    description:
      "Each job shows the AI's read of the issue: description, urgency, materials, and location in home. You know what you're walking into before you bid.",
  },
  {
    icon: ListChecks,
    step: "3",
    title: "Generate a task breakdown",
    description:
      "Hit 'Generate Task List' inside the job. Gemini returns an ordered list of tasks, each with difficulty and time. Use it to build an accurate quote.",
  },
  {
    icon: MessageSquare,
    step: "4",
    title: "Ask questions if needed",
    description:
      "Not sure about access, material spec, or scope? Ask directly in the listing. The AI flags common questions to help you spot what you might be missing.",
  },
  {
    icon: Gavel,
    step: "5",
    title: "Submit your bid",
    description:
      "Enter your quote in pounds and an optional note to the homeowner. Homeowners compare bids with your profile and review scores visible alongside.",
  },
  {
    icon: Camera,
    step: "6",
    title: "Track milestones on the job",
    description:
      "Once accepted, break the project into milestones, upload completion photos, and optionally run AI analysis on them. Homeowners approve each stage before the next begins.",
  },
];

const stats = [
  { value: "< 5s", label: "Task breakdown generation time" },
  { value: "6+", label: "AI-analysed data points per job" },
  { value: "3", label: "Live pipeline KPIs on your dashboard" },
  { value: "100%", label: "Jobs pre-diagnosed by AI before you see them" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const AIBiddingTools = () => (
  <div className="min-h-screen flex flex-col page-bg">
    <Navbar variant="solid" />

    {/* Hero */}
    <section className="bg-foreground text-primary-foreground py-20 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
          <Bot className="w-4 h-4" />
          Built for contractors, powered by AI
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold font-heading leading-tight mb-5">
          Stop guessing.<br />
          <span className="text-primary">Bid with confidence.</span>
        </h1>
        <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          Every job on KisXCars arrives pre-diagnosed by AI. Know the issue, the
          urgency, and the materials before you write a single number. Then use
          the built-in tools to build a quote that wins.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="h-12 px-8">
            <Link to="/contractor/signup">Start bidding free</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Link to="/contractor/profile">Go to job feed</Link>
          </Button>
        </div>
      </div>
    </section>

    {/* Stats bar */}
    <section className="bg-primary/5 border-y border-border py-8 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-3xl font-extrabold font-heading text-primary mb-1">{s.value}</div>
            <div className="text-xs text-muted-foreground leading-snug">{s.label}</div>
          </div>
        ))}
      </div>
    </section>

    {/* Core features */}
    <section className="py-20 px-4 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold font-heading text-foreground mb-3">
            Every tool you need to bid smarter
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            These aren't future features — they're live in the contractor dashboard today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {coreFeatures.map((f) => (
            <div
              key={f.title}
              className="bg-card rounded-xl p-7 border border-border shadow-sm flex flex-col gap-4"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-3">{f.description}</p>
                <p className="text-xs text-muted-foreground/70 border-l-2 border-primary/30 pl-3 italic">
                  {f.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Workflow timeline */}
    <section className="py-20 px-4 bg-secondary">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold font-heading text-foreground mb-3">
            From job posted to bid submitted
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            The full workflow, start to finish — AI at every step.
          </p>
        </div>

        <div className="flex flex-col gap-0">
          {workflowSteps.map((step, i) => (
            <div key={step.title} className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 z-10">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                {i < workflowSteps.length - 1 && (
                  <div className="w-px flex-1 bg-border my-1" />
                )}
              </div>
              <div className="pb-8">
                <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
                  Step {step.step}
                </div>
                <h3 className="font-heading font-bold text-foreground text-lg mb-1">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Task breakdown highlight */}
    <section className="py-16 px-4 bg-primary">
      <div className="max-w-3xl mx-auto text-center">
        <ListChecks className="w-10 h-10 text-primary-foreground/80 mx-auto mb-4" />
        <h2 className="text-3xl font-extrabold font-heading text-primary-foreground mb-4">
          The task breakdown changes how you quote
        </h2>
        <p className="text-primary-foreground/75 mb-8 max-w-xl mx-auto leading-relaxed">
          Most contractors quote from memory. With the AI task breakdown, you get
          a structured, ordered list — step 1 through to completion — with each
          task rated easy, medium, or hard, and a time estimate in minutes. Total
          hours calculated automatically. Use it to check your gut, justify your
          price, or walk the homeowner through exactly what's involved.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Clock, label: "Time estimate per task", note: "In minutes, summed to a total" },
            { icon: Zap, label: "Difficulty per step", note: "Easy · Medium · Hard" },
            { icon: CheckCircle2, label: "Ordered task list", note: "Logical sequence from the diagnosis" },
          ].map((item) => (
            <div key={item.label} className="bg-primary-foreground/10 rounded-xl p-5 text-center">
              <item.icon className="w-6 h-6 text-primary-foreground/70 mx-auto mb-2" />
              <div className="text-sm font-semibold text-primary-foreground mb-1">{item.label}</div>
              <div className="text-xs text-primary-foreground/50">{item.note}</div>
            </div>
          ))}
        </div>
        <Button
          asChild
          size="lg"
          className="h-12 px-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          <Link to="/contractor/profile">
            Try it on a live job <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
    </section>

    {/* Bid → get paid */}
    <section className="py-20 px-4 bg-background">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-extrabold font-heading text-foreground mb-4">
          Win the bid. Get paid the same day.
        </h2>
        <p className="text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
          AI bidding tools get you more accepted bids. Stripe Connect gets your
          money to your bank account the same day the homeowner approves the work.
          No invoices, no chasing — the whole job is managed end to end.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
          {[
            {
              icon: Gavel,
              title: "Smarter bids",
              body: "AI-briefed on the job, task breakdown in hand, questions answered — you bid with more information than your competition.",
            },
            {
              icon: PoundSterling,
              title: "Guaranteed payment",
              body: "Funds are held in escrow before you start. The money is already there when you finish — you just need the homeowner's approval.",
            },
            {
              icon: Users,
              title: "Build your reputation",
              body: "Completed jobs generate reviews on your profile. Quality, communication, and cleanliness — the scores that win you the next job.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading font-bold text-foreground mb-2 text-sm">{item.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="h-12 px-8">
            <Link to="/contractor/signup">
              Create your contractor account <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-8">
            <Link to="/same-day-payments">How payments work</Link>
          </Button>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default AIBiddingTools;
