const features = [
  {
    icon: "🎥",
    title: "Real-Time AI Monitoring",
    description:
      "Your camera analyzes movement while you exercise. No wearables needed — just your device camera.",
    color: "primary",
  },
  {
    icon: "💡",
    title: "Instant Form Feedback",
    description:
      "Get immediate visual guidance when your movement needs adjustment. Green for good, alerts for correction.",
    color: "accent",
  },
  {
    icon: "📈",
    title: "Track Your Recovery",
    description:
      "Monitor consistency, movement quality and progress over time with clear visual dashboards.",
    color: "success",
  },
];

export default function FeatureCards() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background via-primary/[0.02] to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Everything you need for{" "}
            <span className="gradient-text">smarter recovery</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Three core capabilities that make physiotherapy more effective and
            accessible from home.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group relative bg-card rounded-2xl border border-card-border p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 transition-transform group-hover:scale-110 ${
                  feature.color === "primary"
                    ? "bg-primary/10"
                    : feature.color === "accent"
                      ? "bg-accent/10"
                      : "bg-success/10"
                }`}
              >
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
