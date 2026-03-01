import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-emerald-950/30 via-stone-950 to-stone-950 -z-10" />

      {/* Hero */}
      <div className="max-w-md mx-auto space-y-8">
        {/* Logo / Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <span className="text-4xl">🌿</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-stone-100">
            Murmur
          </h1>
          <p className="text-lg text-emerald-400 font-medium">
            Nature Speaks
          </p>
        </div>

        {/* Description */}
        <p className="text-stone-400 leading-relaxed max-w-sm mx-auto">
          Point your camera at any plant, tree, bird, or insect and hear it
          tell its own story — in first person, with character and soul.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { icon: "🌳", label: "Trees" },
            { icon: "🐦", label: "Birds" },
            { icon: "🌸", label: "Flowers" },
            { icon: "🐛", label: "Insects" },
            { icon: "🍄", label: "Mushrooms" },
          ].map(({ icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800/50 border border-stone-700/30 text-sm text-stone-300"
            >
              <span>{icon}</span>
              {label}
            </span>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/encounter"
          className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-900/30 transition-all hover:scale-105 active:scale-95"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          Start Exploring
        </Link>

        {/* Narrative modes preview */}
        <div className="pt-4 space-y-3">
          <p className="text-xs text-stone-600 uppercase tracking-wider font-medium">
            Four narrative modes
          </p>
          <div className="grid grid-cols-2 gap-2 text-left">
            {[
              {
                icon: "🥾",
                title: "Trail Guide",
                desc: "Friendly companion on the path",
              },
              {
                icon: "📜",
                title: "Folklore",
                desc: "Myths and ancient legends",
              },
              {
                icon: "🛡️",
                title: "Survival",
                desc: "Adaptation and resilience",
              },
              {
                icon: "🔬",
                title: "Ranger",
                desc: "Scientific field guide",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="p-3 rounded-xl bg-stone-900/50 border border-stone-800/50"
              >
                <div className="text-lg mb-1">{icon}</div>
                <div className="text-sm font-medium text-stone-300">
                  {title}
                </div>
                <div className="text-xs text-stone-500">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-xs text-stone-700">
        Built with Gemini 2.0 Flash for the Gemini Live Agent Challenge
      </footer>
    </main>
  );
}
