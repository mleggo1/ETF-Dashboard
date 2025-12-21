import React from "react";
import { ETFCard } from "./ETFCard";

export const ETFSection = ({ title, etfs, onChartClick }) => {
  const isGrowth = title.toLowerCase() === "growth";
  
  // Growth: Emerald/teal gradient with upward trend
  // Defensive: Blue/indigo gradient with protective feel
  const sectionStyles = isGrowth
    ? {
        bgGradient: "from-emerald-500/20 via-teal-500/15 to-emerald-500/20",
        borderColor: "border-emerald-400/40",
        textColor: "text-emerald-200",
        glowColor: "shadow-[0_0_30px_rgba(16,185,129,0.4)]",
        accentBg: "bg-emerald-500/30",
        icon: "📈",
      }
    : {
        bgGradient: "from-blue-500/20 via-indigo-500/15 to-blue-500/20",
        borderColor: "border-blue-400/40",
        textColor: "text-blue-200",
        glowColor: "shadow-[0_0_30px_rgba(59,130,246,0.4)]",
        accentBg: "bg-blue-500/30",
        icon: "🛡️",
      };

  return (
    <section className="space-y-4 sm:space-y-5">
      <div className={`relative overflow-hidden rounded-2xl border-2 ${sectionStyles.borderColor} bg-gradient-to-r ${sectionStyles.bgGradient} ${sectionStyles.glowColor} backdrop-blur-sm`}>
        {/* Animated background glow */}
        <div className={`absolute inset-0 ${sectionStyles.accentBg} opacity-50 blur-3xl animate-pulse`} />
        
        {/* Content */}
        <div className="relative px-6 sm:px-8 py-5 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className={`text-4xl sm:text-5xl filter drop-shadow-lg ${isGrowth ? "animate-bounce" : ""}`} style={{ animationDuration: "3s" }}>
                {sectionStyles.icon}
              </div>
              
              {/* Title */}
              <div>
                <div className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-slate-400/80 mb-1">
                  {isGrowth ? "HIGH GROWTH POTENTIAL" : "STABLE & PROTECTIVE"}
                </div>
                <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-[0.15em] ${sectionStyles.textColor} drop-shadow-lg`}>
                  {title}
                </h2>
              </div>
            </div>
            
            {/* Badge */}
            <div className={`hidden sm:flex items-center justify-center w-16 h-16 rounded-full ${sectionStyles.accentBg} border-2 ${sectionStyles.borderColor} ${sectionStyles.glowColor}`}>
              <span className="text-2xl">{sectionStyles.icon}</span>
            </div>
          </div>
          
          {/* Decorative line */}
          <div className={`mt-4 h-1 rounded-full bg-gradient-to-r ${isGrowth ? "from-emerald-400 via-teal-400 to-emerald-400" : "from-blue-400 via-indigo-400 to-blue-400"} ${sectionStyles.glowColor}`} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch">
        {etfs.map((etf) => (
          <ETFCard key={etf.symbol} etf={etf} onChartClick={onChartClick} />
        ))}
      </div>
    </section>
  );
};