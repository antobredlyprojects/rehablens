"use client";

export default function HeroVisual() {
  return (
    <div className="relative">
      {/* Main card */}
      <div className="relative bg-card rounded-3xl border border-card-border shadow-2xl shadow-primary/10 overflow-hidden p-1">
        {/* Simulated camera view */}
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl aspect-[4/3] overflow-hidden">
          {/* Person silhouette (exercise pose) */}
          <svg
            viewBox="0 0 400 300"
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Body outline */}
            <g opacity="0.3" stroke="#94a3b8" strokeWidth="1" fill="none">
              {/* Head */}
              <circle cx="200" cy="60" r="18" />
              {/* Torso */}
              <line x1="200" y1="78" x2="200" y2="170" />
              {/* Left arm */}
              <line x1="200" y1="100" x2="160" y2="130" />
              <line x1="160" y1="130" x2="140" y2="110" />
              {/* Right arm */}
              <line x1="200" y1="100" x2="240" y2="130" />
              <line x1="240" y1="130" x2="260" y2="100" />
              {/* Left leg */}
              <line x1="200" y1="170" x2="175" y2="230" />
              <line x1="175" y1="230" x2="165" y2="280" />
              {/* Right leg */}
              <line x1="200" y1="170" x2="225" y2="230" />
              <line x1="225" y1="230" x2="235" y2="280" />
            </g>

            {/* AI skeleton overlay - animated */}
            <g className="animate-breathe" style={{ transformOrigin: "200px 170px" }}>
              {/* Skeleton joints */}
              <circle cx="200" cy="60" r="5" fill="#22d3ee" opacity="0.9" />
              <circle cx="200" cy="100" r="6" fill="#22d3ee" opacity="0.9" />
              <circle cx="160" cy="130" r="4" fill="#22d3ee" opacity="0.9" />
              <circle cx="140" cy="110" r="4" fill="#22d3ee" opacity="0.9" />
              <circle cx="240" cy="130" r="4" fill="#22d3ee" opacity="0.9" />
              <circle cx="260" cy="100" r="4" fill="#22d3ee" opacity="0.9" />
              <circle cx="200" cy="170" r="5" fill="#22d3ee" opacity="0.9" />
              <circle cx="175" cy="230" r="5" fill="#22d3ee" opacity="0.9" />
              <circle cx="225" cy="230" r="5" fill="#22d3ee" opacity="0.9" />
              <circle cx="165" cy="280" r="4" fill="#22d3ee" opacity="0.9" />
              <circle cx="235" cy="280" r="4" fill="#22d3ee" opacity="0.9" />

              {/* Skeleton connections */}
              <line x1="200" y1="60" x2="200" y2="100" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />
              <line x1="200" y1="100" x2="160" y2="130" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />
              <line x1="160" y1="130" x2="140" y2="110" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />
              <line x1="200" y1="100" x2="240" y2="130" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />
              <line x1="240" y1="130" x2="260" y2="100" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />
              <line x1="200" y1="100" x2="200" y2="170" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />
              <line x1="200" y1="170" x2="175" y2="230" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />
              <line x1="200" y1="170" x2="225" y2="230" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />
              <line x1="175" y1="230" x2="165" y2="280" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />
              <line x1="225" y1="230" x2="235" y2="280" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />

              {/* Knee angle arc */}
              <path
                d="M 185 225 A 12 12 0 0 1 165 235"
                stroke="#10b981"
                strokeWidth="2"
                fill="none"
              />
              <text x="155" y="220" fill="#10b981" fontSize="10" fontWeight="600">
                92°
              </text>
            </g>
          </svg>

          {/* Status indicators */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              AI Active
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div className="px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white text-xs font-medium">
              Knee Flexion · Rep 8 / 15
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-success/90 backdrop-blur-sm text-white text-xs font-bold">
              Good form ✓
            </div>
          </div>
        </div>
      </div>

      {/* Floating feedback card */}
      <div className="absolute -bottom-6 -left-6 bg-card rounded-xl border border-card-border shadow-lg p-3 animate-fade-in" style={{ animationDelay: "0.5s" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success text-lg">
            ✓
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Form Score: 92%
            </p>
            <p className="text-xs text-muted">Movement quality: Good</p>
          </div>
        </div>
      </div>

      {/* Floating angle card */}
      <div className="absolute -top-4 -right-4 bg-card rounded-xl border border-card-border shadow-lg p-3 animate-fade-in" style={{ animationDelay: "0.7s" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
            94°
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Knee Angle</p>
            <p className="text-xs text-success font-medium">Within range</p>
          </div>
        </div>
      </div>
    </div>
  );
}
