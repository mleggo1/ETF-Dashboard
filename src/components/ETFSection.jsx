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
    <section className="space-y-2 sm:space-y-3 lg:space-y-4">
      <div className={`relative overflow-hidden rounded-lg sm:rounded-xl border-2 ${sectionStyles.borderColor} bg-gradient-to-r ${sectionStyles.bgGradient} ${sectionStyles.glowColor} backdrop-blur-sm`}>
        {/* Animated background glow */}
        <div className={`absolute inset-0 ${sectionStyles.accentBg} opacity-50 blur-3xl animate-pulse`} />
        
        {/* Content */}
        <div className="relative px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              {/* Icon */}
              <div className={`text-lg sm:text-xl lg:text-2xl filter drop-shadow-lg flex-shrink-0 ${isGrowth ? "animate-bounce" : ""}`} style={{ animationDuration: "3s" }}>
                {sectionStyles.icon}
              </div>
              
              {/* Title */}
              <div className="min-w-0 flex-1">
                <div className="text-[7px] sm:text-[8px] lg:text-[9px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-slate-400/70 mb-0.5 truncate">
                  {isGrowth ? "HIGH GROWTH POTENTIAL" : "STABLE & PROTECTIVE"}
                </div>
                <h2 className={`text-base sm:text-lg lg:text-xl xl:text-2xl font-black uppercase tracking-[0.08em] sm:tracking-[0.1em] ${sectionStyles.textColor} drop-shadow-lg leading-tight truncate`}>
                  {title}
                </h2>
              </div>
            </div>
            
            {/* Badge */}
            <div className={`hidden sm:flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 rounded-full ${sectionStyles.accentBg} border-2 ${sectionStyles.borderColor} ${sectionStyles.glowColor} flex-shrink-0`}>
              <span className="text-base lg:text-lg">{sectionStyles.icon}</span>
            </div>
          </div>
          
          {/* Decorative line */}
          <div className={`mt-1.5 sm:mt-2 h-0.5 rounded-full bg-gradient-to-r ${isGrowth ? "from-emerald-400 via-teal-400 to-emerald-400" : "from-blue-400 via-indigo-400 to-blue-400"} ${sectionStyles.glowColor}`} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4">
        {etfs.map((etf) => (
          <div key={etf.symbol} className="h-[30rem] sm:h-[32rem] lg:h-[34rem]">
            <ETFCard etf={etf} onChartClick={onChartClick} group={etf.group} />
          </div>
        ))}
      </div>
    </section>
  );
};