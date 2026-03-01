"use client";

const categoryIcons = {
  tree: "🌳",
  bird: "🐦",
  flower: "🌸",
  insect: "🐛",
  mushroom: "🍄",
};

const categoryColors = {
  tree: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  bird: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  flower: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  insect: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  mushroom: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

export default function OrganismCard({ organism, compact = false }) {
  if (!organism) return null;

  const icon = categoryIcons[organism.category] || "🌿";
  const colorClass =
    categoryColors[organism.category] || categoryColors.tree;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${colorClass}`}>
        <span>{icon}</span>
        <span className="text-sm font-medium">{organism.commonName}</span>
      </div>
    );
  }

  return (
    <div className="bg-stone-900/90 backdrop-blur-md border border-stone-700/50 rounded-2xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${colorClass}`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-stone-100 truncate">
            {organism.commonName}
          </h3>
          <p className="text-sm text-stone-400 italic truncate">
            {organism.scientificName}
          </p>
        </div>
        <div
          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}
        >
          {organism.category}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex gap-2">
          <span className="text-stone-500 shrink-0">Habitat:</span>
          <span className="text-stone-300">{organism.habitat}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-stone-500 shrink-0">Age:</span>
          <span className="text-stone-300">{organism.estimatedAge}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-stone-500 shrink-0">Status:</span>
          <span className="text-stone-300">
            {organism.conservationStatus}
          </span>
        </div>
      </div>

      {/* Interesting fact */}
      <div className="mt-4 p-3 bg-stone-800/50 rounded-xl border border-stone-700/30">
        <p className="text-sm text-stone-300 leading-relaxed">
          <span className="text-stone-500 font-medium">Fun fact: </span>
          {organism.interestingFact}
        </p>
      </div>

      {/* Confidence indicator */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${(organism.confidence * 100).toFixed(0)}%` }}
          />
        </div>
        <span className="text-xs text-stone-500">
          {(organism.confidence * 100).toFixed(0)}% confident
        </span>
      </div>
    </div>
  );
}
