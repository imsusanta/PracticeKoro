import React from 'react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { cn } from '@/lib/utils';

interface MathTextProps {
  text: string;
  className?: string;
  formatBullets?: boolean;
}

/**
 * A reusable component to render text that may contain LaTeX math expressions
 * and format bullet points / numbered lists nicely line-by-line ("ektar niche ekta").
 * Uses react-latex-next and katex under the hood.
 * Supports inline math with $...$ and block math with $$...$$
 */
export const MathText: React.FC<MathTextProps> = ({ 
  text, 
  className, 
  formatBullets = true 
}) => {
  if (!text) return null;

  // If line-clamp or formatting is explicitly disabled, render flat
  if (!formatBullets || className?.includes('line-clamp')) {
    return (
      <div className={cn("math-text-container", className)}>
        <Latex>{text}</Latex>
      </div>
    );
  }

  // 1. Check for bullet characters (•, \u2022, ●, ▪, ◆)
  // Handles both single-line separated bullets ("• P1 • P2") and multi-line ("• P1\n• P2")
  if (/[•\u2022●▪◆]/.test(text)) {
    const rawParts = text.split(/[•\u2022●▪◆]/);
    const intro = rawParts[0].trim();
    const bullets = rawParts
      .slice(1)
      .map(p => p.trim().replace(/^[•\u2022●▪◆\-\*]\s*/, ''))
      .filter(Boolean);

    if (bullets.length > 0) {
      return (
        <div className={cn("math-text-container space-y-2", className)}>
          {intro && (
            <p className="font-medium text-slate-800 leading-relaxed mb-1.5">
              <Latex>{intro}</Latex>
            </p>
          )}
          <ul className="space-y-2 my-1 text-slate-700">
            {bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2.5 leading-relaxed text-xs sm:text-sm">
                <span className="text-blue-600 font-bold text-base leading-none mt-0.5 select-none shrink-0">
                  •
                </span>
                <div className="flex-1 min-w-0">
                  <Latex>{bullet}</Latex>
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }
  }

  // 2. Check for multi-line text with markdown bullets or numbered items
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (lines.length > 1) {
    const hasBulletsOrNumbers = lines.some(l => /^[-*]\s+/.test(l) || /^(\d+|[০-৯]+)[\.\)]\s+/.test(l));

    if (hasBulletsOrNumbers) {
      return (
        <div className={cn("math-text-container space-y-2 text-slate-700", className)}>
          {lines.map((line, idx) => {
            // Markdown bullet
            if (/^[-*]\s+/.test(line)) {
              const content = line.replace(/^[-*]\s+/, '').trim();
              return (
                <div key={idx} className="flex items-start gap-2.5 leading-relaxed text-xs sm:text-sm">
                  <span className="text-blue-600 font-bold text-base leading-none mt-0.5 select-none shrink-0">
                    •
                  </span>
                  <div className="flex-1 min-w-0">
                    <Latex>{content}</Latex>
                  </div>
                </div>
              );
            }

            // Numbered list item
            const numMatch = line.match(/^((?:\d+|[০-৯]+)[\.\)])\s*(.*)$/);
            if (numMatch) {
              const num = numMatch[1];
              const content = numMatch[2];
              return (
                <div key={idx} className="flex items-start gap-2 leading-relaxed text-xs sm:text-sm">
                  <span className="text-blue-600 font-bold text-xs leading-none mt-1 select-none shrink-0 min-w-[18px]">
                    {num}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Latex>{content}</Latex>
                  </div>
                </div>
              );
            }

            // Regular paragraph line
            return (
              <p key={idx} className="leading-relaxed text-xs sm:text-sm">
                <Latex>{line}</Latex>
              </p>
            );
          })}
        </div>
      );
    }

    // Regular multi-line paragraphs
    return (
      <div className={cn("math-text-container space-y-2 text-slate-700", className)}>
        {lines.map((line, idx) => (
          <p key={idx} className="leading-relaxed text-xs sm:text-sm">
            <Latex>{line}</Latex>
          </p>
        ))}
      </div>
    );
  }

  // 3. Default single-line text / math
  return (
    <div className={cn("math-text-container", className)}>
      <Latex>{text}</Latex>
    </div>
  );
};

