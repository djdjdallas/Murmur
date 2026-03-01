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

        {/* Live API + Imagen features */}
        <div className="pt-2 space-y-3">
          <p className="text-xs text-stone-600 uppercase tracking-wider font-medium">
            Powered by
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-900/50 border border-stone-800/50 text-left">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-stone-300">Gemini Live API</div>
                <div className="text-xs text-stone-500">Real-time streaming audio narration</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-900/50 border border-stone-800/50 text-left">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-stone-300">Imagen 3</div>
                <div className="text-xs text-stone-500">Watercolor illustrated story panels</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-900/50 border border-stone-800/50 text-left">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-stone-300">Trail Mode</div>
                <div className="text-xs text-stone-500">Persistent live session as you walk</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-xs text-stone-700">
        Built with Gemini Live API + Imagen 3 for the Gemini Live Agent Challenge
      </footer>
    </main>
  );
}
