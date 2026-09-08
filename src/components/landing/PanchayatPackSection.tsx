import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Sparkles,
  Award,
  Zap,
  Clock,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Flame,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PanchayatPackSectionProps {
  isLoggedIn: boolean;
}

export const PanchayatPackSection: React.FC<PanchayatPackSectionProps> = ({ isLoggedIn }) => {
  const navigate = useNavigate();

  const handleCTA = () => {
    if (isLoggedIn) {
      navigate('/student/exam?exam=panchayat');
    } else {
      navigate('/register');
    }
  };

  const packFeatures = [
    { text: "২৫+ ফুল লেংথ ও চ্যাপ্টার-ভিত্তিক মক টেস্ট (Full & Sectional Mocks)" },
    { text: "পরীক্ষার হুবহু ইন্টারফেস ও -০.২৫ নেগেটিভ মার্কিং ক্যালকুলেশন" },
    { text: "প্রতিটি প্রশ্নের বিস্তারিত বাংলা ও ইংরেজি সমাধান (Detailed Explanations)" },
    { text: "General Knowledge, গণিত, ইংরেজি ও বাংলা ব্যাকরণ সম্পূর্ণ কভার" },
    { text: "Mistakes Notebook — ভুল হওয়া প্রশ্ন রিভিশন করার বিশেষ সুবিধা" },
    { text: "অল-ওয়েস্ট বেঙ্গল র‍্যাংক ও সাবজেক্ট-ওয়াইজ পারফর্মেন্স অ্যানালিসিস" },
  ];

  return (
    <section id="panchayat-pack" className="py-16 sm:py-24 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-5 relative z-10">
        {/* Header Badge */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 rounded-full px-4 py-1.5 mb-4 shadow-inner">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-xs font-black tracking-wider uppercase text-emerald-300">
                West Bengal Panchayat Recruitment 2026
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4">
              Panchayat Exam Complete{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">
                Mock Test Pack
              </span>
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              গ্রাম পঞ্চায়েত কর্মী, সচিব, সহায়ক ও নির্মাণ সহায়ক পরীক্ষার জন্য সম্পূর্ণ সিলেবাস অনুযায়ী প্রস্তুত সেরা মক টেস্ট সিরিজ।
            </p>
          </motion.div>
        </div>

        {/* Value Box Grid */}
        <div className="max-w-5xl mx-auto grid lg:grid-cols-[1.3fr_0.7fr] gap-8 items-center">
          {/* Left: Features & Benefits */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-5 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                এই প্যাকে আপনি কী কী পাবেন:
              </h3>

              <div className="grid gap-3.5">
                {packFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm sm:text-base text-slate-200 leading-snug">{feat.text}</span>
                  </div>
                ))}
              </div>

              {/* Target Posts Badge List */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-slate-400 mr-2">টার্গেট পোস্ট:</span>
                {["গ্রাম পঞ্চায়েত কর্মী", "পঞ্চায়েত সচিব", "সহায়ক", "নির্মাণ সহায়ক"].map((post) => (
                  <span key={post} className="text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-xl">
                    {post}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Pricing Box Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            {/* Animated Gradient Border */}
            <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 opacity-70 blur-sm animate-pulse" />

            <div className="relative rounded-[30px] bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 p-6 sm:p-8 text-center">
              <div className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4">
                ★ 80% Limited Offer
              </div>

              <h4 className="text-xl font-bold text-white mb-2">Complete Access Pass</h4>
              <p className="text-xs text-slate-400 mb-6">সম্পূর্ণ টেস্ট সিরিজ ও সল্যুশন আনলক করুন</p>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm line-through text-slate-500 font-semibold">₹499</span>
                  <span className="text-5xl font-black text-amber-400">₹99</span>
                  <span className="text-xs text-slate-400 font-medium self-end mb-2">/ one-time</span>
                </div>
                <p className="text-[11px] text-emerald-400 font-semibold mt-1">No monthly charges • Full year validity</p>
              </div>

              {/* Call to Action Button */}
              <Button
                size="lg"
                onClick={handleCTA}
                className="w-full h-14 rounded-2xl text-base font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-yellow-300 shadow-xl shadow-amber-500/25 active:scale-95 transition-all mb-4"
              >
                <span>{isLoggedIn ? "Access Mock Pack" : "Get Pack For ₹99"}</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Secure UPI / Card</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Instant Activation</span>
                </div>
              </div>

              {/* Social Proof */}
              <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-slate-300">
                <Users className="w-4 h-4 text-emerald-400" />
                <span><strong className="text-white">৪,৮০০+ ছাত্রছাত্রী</strong> ইতিমধ্যে যুক্ত হয়েছেন</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PanchayatPackSection;
