import React, { useEffect } from "react";

export const ETFInfoModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-500/30 via-emerald-400/20 to-transparent px-6 py-4 border-b border-slate-800/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40">
                <svg
                  className="w-6 h-6 text-emerald-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-emerald-200">
                What is an ETF?
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 sm:py-8 space-y-6 text-slate-200">
          {/* Simple Explanation */}
          <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold text-emerald-300">
              In Simple Terms
            </h3>
            <p className="text-base sm:text-lg leading-relaxed">
              An <strong className="text-emerald-300">ETF (Exchange Traded Fund)</strong> is like buying a basket of many different investments all at once, instead of buying just one stock.
            </p>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <p className="text-sm sm:text-base leading-relaxed">
                <span className="text-emerald-300 font-semibold">Think of it this way:</span> If buying a stock is like buying one apple, buying an ETF is like buying a whole fruit basket with apples, oranges, bananas, and more—all in one purchase.
              </p>
            </div>
          </div>

          {/* ETF vs Stock Comparison */}
          <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold text-emerald-300">
              ETF vs. Buying a Stock
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Buying a Stock */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <h4 className="text-base font-semibold text-blue-300 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Buying a Stock
                </h4>
                <ul className="space-y-2 text-sm sm:text-base text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>You own <strong>one company</strong> (e.g., Apple)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>If that company does well, you profit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>If that company struggles, you lose</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span><strong>Higher risk</strong> — all your eggs in one basket</span>
                  </li>
                </ul>
              </div>

              {/* Buying an ETF */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-emerald-700/50">
                <h4 className="text-base font-semibold text-emerald-300 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Buying an ETF
                </h4>
                <ul className="space-y-2 text-sm sm:text-base text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    <span>You own <strong>many companies</strong> at once</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    <span>If some companies do well, you benefit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    <span>If some struggle, others may balance it out</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    <span><strong>Lower risk</strong> — your eggs are spread across many baskets</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Key Benefits */}
          <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold text-emerald-300">
              Why Choose an ETF?
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-slate-800/40 rounded-lg p-4 border border-slate-700/40">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-300 font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-200 mb-1">Diversification</h4>
                  <p className="text-sm sm:text-base text-slate-300">
                    Instead of betting on one company, you spread your investment across many. This reduces your risk if one company has problems.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/40 rounded-lg p-4 border border-slate-700/40">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-300 font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-200 mb-1">Easy & Affordable</h4>
                  <p className="text-sm sm:text-base text-slate-300">
                    You can buy an ETF with just one click, and it's often cheaper than buying many individual stocks separately.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/40 rounded-lg p-4 border border-slate-700/40">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-300 font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-200 mb-1">Professional Management</h4>
                  <p className="text-sm sm:text-base text-slate-300">
                    Experts choose which companies to include in the ETF, so you don't have to research hundreds of stocks yourself.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/40 rounded-lg p-4 border border-slate-700/40">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-300 font-bold">4</span>
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-200 mb-1">Flexibility</h4>
                  <p className="text-sm sm:text-base text-slate-300">
                    You can buy or sell ETF shares just like stocks, anytime during market hours. They're easy to trade.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Example */}
          <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold text-emerald-300">
              Real Example
            </h3>
            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-lg p-5 border border-emerald-500/30">
              <p className="text-sm sm:text-base leading-relaxed text-slate-200">
                If you buy the <strong className="text-emerald-300">IVV ETF</strong> (iShares S&P 500 ETF), you're actually buying a small piece of <strong className="text-emerald-300">500 of America's largest companies</strong>—like Apple, Microsoft, Amazon, and many others—all at once. Instead of buying each company separately (which would cost thousands), you get exposure to all of them with one purchase.
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="pt-4 border-t border-slate-800/60">
            <p className="text-xs sm:text-sm text-slate-400 italic">
              <strong className="text-slate-300">Remember:</strong> All investments carry risk. Past performance doesn't guarantee future results. This is educational information only, not financial advice.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900/95 px-6 py-4 border-t border-slate-800/60 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-medium hover:bg-emerald-500/30 hover:border-emerald-400/60 transition"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};

