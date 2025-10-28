import React from 'react'

// Educational tips for distraction
const tips = [
    { threshold: 0, text: "Did you know: Coughs can travel at speeds up to 50 mph. Hold on tight!" },
    { threshold: 30, text: "A single sneeze can contain up to 40,000 droplets. Explore them soon!" },
    { threshold: 60, text: "Every sound here is a unique event from a diverse human population." },
    { threshold: 90, text: "The visualization uses t-SNE to map sounds based on their acoustic features." },
];

export default function ProgressBar({ progress }) {
  // Find the current tip based on progress
    const currentTip = tips
        .slice()
        .reverse()
        .find(tip => progress >= tip.threshold);

    // Apply the UX principles: Blue/Light, Determinate, Increasing Speed (CSS animation)
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#f4f3ef] text-gray-800 font-[Poppins,sans-serif] p-4 flex-col z-50">
            <h1 className="text-3xl font-light mb-6">Loading 20622 Human Health Sounds</h1>

            <div className="w-full max-w-sm">
                <div className="text-sm text-center mb-2 font-medium">
                    Loading Spectrograms...
                    <span className="ml-2 font-bold text-[#3498DB]">{progress}%</span>
                </div>

                <div className="w-full h-4 bg-gray-300 rounded-full overflow-hidden shadow-inner">
                    <div
                        className="h-full rounded-full transition-all duration-500 ease-out bg-[#5DADE2] relative"
                        style={{ width: `${progress}%` }}
                    >
                        {/* Removed the <style jsx> tag which caused the error.
                            The ribbing-effect class now relies on external CSS.
                        */}
                        <div
                           className="ribbing-effect"
                           style={{
                              // Added inline styles for ribbing pattern (The animation keyframes must be external)
                              background: `linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent)`,
                              backgroundSize: '20px 20px',
                              animation: 'move-ribbon 1s linear infinite', /* Requires external keyframes */
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                           }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Educational Tip for distraction */}
            <blockquote className="mt-8 max-w-md text-center text-sm italic text-gray-500 p-4 border-l-4 border-[#5DADE2] bg-white rounded-lg shadow-sm">
                "{currentTip.text}"
            </blockquote>
        </div>
    );
}