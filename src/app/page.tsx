import Link from "next/link";
import FeatureCards from "@/components/FeatureCards";
import HeroVisual from "@/components/HeroVisual";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                AI-Powered Recovery
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
                <span className="text-foreground">Your Webcam.</span>
                <br />
                <span className="text-foreground">Your Movement.</span>
                <br />
                <span className="gradient-text">Smarter Recovery.</span>
              </h1>

              <p className="text-lg text-muted max-w-xl mb-8 leading-relaxed">
                AI-powered movement analysis that helps you perform
                physiotherapy exercises with real-time feedback and track your
                progress every day.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/session"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98] text-base"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white/80 animate-pulse-soft" />
                  Start AI Session
                </Link>
                <Link
                  href="/progress"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-card border border-card-border text-foreground font-semibold rounded-xl hover:bg-foreground/5 transition-all text-base"
                >
                  📊 View My Progress
                </Link>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="hidden lg:block animate-fade-in">
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <FeatureCards />

      {/* Privacy Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-success/10 text-success text-2xl mb-5">
            🔒
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Your movement stays yours.
          </h2>
          <p className="text-muted text-lg leading-relaxed max-w-2xl mx-auto">
            Designed with client-side processing in mind so camera analysis can
            happen directly in your browser. No video data is sent to external
            servers — your privacy matters.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-success/5 border border-success/20 text-success text-sm font-medium">
            <span className="text-lg">✓</span>
            Client-side processing · No server uploads · You control your data
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-card-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted">
          <p>
            RehabLens — AI-Powered Physiotherapy & Movement Recovery
          </p>
          <p className="mt-1">
            Built for rehabilitation. Not a substitute for professional medical
            advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
