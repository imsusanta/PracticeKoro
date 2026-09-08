import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "কীভাবে PracticeKoro-তে মক টেস্ট দেওয়া শুরু করব?",
    answer: "খুব সহজ! আপনার মোবাইল নম্বর বা ইমেইল দিয়ে বিনামূল্যে একটি অ্যাকাউন্ট তৈরি করুন। এরপর যেকোনো ফ্রি টেস্ট বা স্পেশাল মক টেস্ট সিলেক্ট করে 'Start Test' এ ক্লিক করলেই টাইমার সহ টেস্ট শুরু হবে।"
  },
  {
    question: "নেগেটিভ মার্কিং কি আসল সরকারি পরীক্ষার মতো নিখুঁতভাবে কাটা হয়?",
    answer: "হ্যাঁ! প্রতিটি পরীক্ষার নির্দিষ্ট নিয়ম অনুযায়ী (যেমন পঞ্চায়েত ও WBP পরীক্ষায় প্রতি ভুল উত্তরের জন্য ০.২৫ নম্বর কাটা হয়) আমাদের সার্ভার নির্ভুলভাবে স্বয়ংক্রিয়ভাবে নেগেটিভ মার্কিং হিসাব করে স্কোরকার্ড প্রদান করে।"
  },
  {
    question: "প্রশ্নগুলো কি বাংলা ও ইংরেজি উভয় ভাষায় রয়েছে?",
    answer: "হ্যাঁ, পশ্চিমবঙ্গের রাজ্য পর্যায়ের অধিকাংশ পরীক্ষার প্রশ্ন বাংলা ও ইংরেজি দ্বিভাষিক (Bilingual) রাখা হয়েছে, সাথে প্রতিটির বিস্তারিত ব্যাখ্যা সংযুক্ত রয়েছে।"
  },
  {
    question: "₹৯৯ পঞ্চায়েত মক টেস্ট প্যাকটির ভ্যালিডিটি কতদিন?",
    answer: "এই প্যাকটির ভ্যালিডিটি সম্পূর্ণ ১ বছর। একবার এক্টিভেট করলে আপনি যেকোনো সময় ২৫+ ফুল মক ও সেকশনাল টেস্ট আনলিমিটেড বার দেওয়ার সুযোগ পাবেন।"
  },
  {
    question: "ভুল হওয়া প্রশ্নগুলো পুনরায় প্র্যাকটিস করার নিয়ম কী?",
    answer: "টেস্ট জমা দেওয়ার সাথে সাথেই ভুল হওয়া প্রশ্নগুলো স্বয়ংক্রিয়ভাবে আপনার পার্সোনাল 'My Mistakes' নোটবুকে সেভ হয়ে যায়। সেখান থেকে আপনি যখন খুশি 'Retry Wrong Questions' মোডে প্র্যাকটিস করে দুর্বলতা দূর করতে পারবেন।"
  },
  {
    question: "মোবাইল ফোনে কি কোনো অ্যাপ ডাউনলোড না করেই সহজে টেস্ট দেওয়া যায়?",
    answer: "অবশ্যই! আমাদের ওয়েবসাইটটি সম্পূর্ণ মোবাইল-ফার্স্ট ও PWA বান্ধব। আপনি সরাসরি ক্রোম বা যেকোনো ব্রাউজারে অ্যাপের মতোই স্মুথ অভিজ্ঞতায় টেস্ট দিতে পারবেন।"
  }
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (idx: number) => {
    setOpenIndex(prev => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="py-16 sm:py-24 bg-slate-50 relative overflow-hidden">
      <div className="container mx-auto px-5 relative z-10 max-w-4xl">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
              <HelpCircle className="w-4 h-4" /> সাধারণ প্রশ্নোত্তর
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
              সচরাচর জিজ্ঞাসিত <span className="text-emerald-600">প্রশ্নসমূহ (FAQ)</span>
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              আপনার যা কিছু জানার রয়েছে, উত্তর জেনে নিন সহজে
            </p>
          </motion.div>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-base sm:text-lg hover:text-emerald-600 transition-colors"
                >
                  <span className="leading-snug">{faq.question}</span>
                  <div className={`w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 bg-emerald-50 text-emerald-600' : 'text-slate-500'}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-5 pb-5 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
