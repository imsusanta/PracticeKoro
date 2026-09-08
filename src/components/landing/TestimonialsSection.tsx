import React from 'react';
import { motion } from 'framer-motion';
import { Star, CheckCircle, Quote } from 'lucide-react';

interface Testimonial {
  name: string;
  location: string;
  exam: string;
  result: string;
  comment: string;
  avatarText: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: "সৌরভ দাস",
    location: "উত্তর ২৪ পরগনা",
    exam: "WBP Constable 2024",
    result: "Selected (Score: 78.5/100)",
    comment: "PracticeKoro-র নেগেটিভ মার্কিং ইন্টারফেস আর টাইমার দিয়ে প্র্যাকটিস করার ফলে আসল পরীক্ষায় কোনো নার্ভাসনেস লাগেনি। এক্সপ্ল্যানেশনগুলো খুব সাহায্য করেছে।",
    avatarText: "SD",
    rating: 5
  },
  {
    name: "প্রিয়াঙ্কা মণ্ডল",
    location: "পূর্ব বর্ধমান",
    exam: "WB Panchayat Karmi 2026",
    result: "Top 5% in Mock Leaderboard",
    comment: "Mistakes Notebook ফিচারটা অসাধারণ! যেসব প্রশ্ন টেস্টে ভুল হয়েছিল, পরীক্ষার আগে শুধু সেগুলোই আলাদা করে রিভিশন দিয়ে অ্যাক্যুরেসি ৬০% থেকে ৮৮% হয়েছে।",
    avatarText: "PM",
    rating: 5
  },
  {
    name: "শুভজিৎ রায়",
    location: "মেদিনীপুর",
    exam: "WBPSC Food SI",
    result: "Score: 84/100",
    comment: "বাংলায় এত ভালো মানের প্রশ্ন আর ব্যাখ্যা আগে কোথাও পাইনি। বিশেষ করে চ্যাপ্টার অনুযায়ী ম্যাথ আর জিকের ড্রিল প্রশ্নগুলো দারুণ।",
    avatarText: "SR",
    rating: 5
  }
];

export const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-16 sm:py-24 bg-white relative overflow-hidden">
      <div className="container mx-auto px-5 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block mb-3 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
              Student Stories
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              সফল শিক্ষার্থীদের <span className="text-emerald-600">অভিজ্ঞতা</span>
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              হাজারো শিক্ষার্থী PracticeKoro-র সাহায্যে তাদের সরকারি চাকরির প্রস্তুতিকে দৃঢ় করেছেন।
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((item, idx) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="bg-slate-50 rounded-3xl p-6 sm:p-7 border border-slate-100 flex flex-col justify-between hover:shadow-lg transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <Quote className="w-6 h-6 text-slate-300" />
                </div>

                <p className="text-slate-700 text-sm leading-relaxed mb-6 italic">
                  "{item.comment}"
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200/60 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-emerald-500/20">
                  {item.avatarText}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-xs text-slate-500">{item.location} • <span className="text-emerald-700 font-semibold">{item.result}</span></p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
