import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { AppView } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface LandingViewProps {
  onNavigate: (view: AppView) => void;
}

const SPORT_GALLERY = [
  {
    title: 'Grassroots Football',
    subtitle: 'AIFF-certified youth academies & floodlit turfs',
    img: '/src/assets/images/sport_football_turf_1795033963995.jpg',
    alt: 'Youth football players practicing drills on floodlit artificial turf',
  },
  {
    title: 'Cricket Coaching',
    subtitle: 'Turf net sessions & district selection trials',
    img: '/src/assets/images/sport_cricket_academy_1795033962056.jpg',
    alt: 'Young cricketer batting in turf net with coach observing',
  },
  {
    title: 'Badminton Courts',
    subtitle: 'BWF wooden courts & junior ranking events',
    img: '/src/assets/images/sport_badminton_court_1795033962501.jpg',
    alt: 'Indoor wooden-floor badminton academy court',
  },
  {
    title: 'Aquatics & Track',
    subtitle: '50m competition pools & synthetic tracks',
    img: '/src/assets/images/sport_swimming_pool_1795033963411.jpg',
    alt: '50-meter outdoor competition swimming pool facility',
  },
];

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  const { firebaseUser } = useAuth();

  return (
    <div className="bg-slate-50">
      {/* Hero Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-10 lg:pt-12 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-semibold tracking-wider text-blue-700 uppercase mb-3">
              Youth Athlete Opportunity Platform · Ages 10–25
            </p>
            <h1
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-4"
              style={{ textWrap: 'balance' }}
            >
              Find verified coaching, trials, and scholarships matched to your game.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-7">
              SportBridge AI pairs transparent, rule-based matching with natural-language search so young athletes and parents can discover affordable academies, nearby grounds, upcoming selection trials, and financial aid in seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => onNavigate('onboarding')}
                className="min-h-[48px] px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                Build Athlete Profile
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('feed')}
                className="min-h-[48px] px-6 py-3 bg-white border border-slate-300 text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors inline-flex items-center justify-center cursor-pointer"
              >
                Explore Matches
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                Mandatory U-18 guardian consent
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                Zero public minor location exposure
              </span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-64 sm:h-80 lg:h-full min-h-[320px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
              <img
                src="/src/assets/images/hero_athlete_training_1795033961276.jpg"
                alt="Young Indian athletes sprinting on an outdoor athletics track at golden hour"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 text-white">
                <p className="text-xs font-medium text-slate-200 mb-1">
                  Transparent 0–100 Scoring · No Pay-to-Rank Ads
                </p>
                <p className="text-sm sm:text-base font-medium leading-snug max-w-md">
                  Hard-filtered by your age, sport, budget ceiling, and commute radius before ranking fit.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Proof Strip */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { value: '38', label: 'Verified Seeded Opportunities' },
            { value: '5 Sports', label: 'Cricket, Football, Badminton, Track, Swim' },
            { value: '6 Cities', label: 'Bengaluru, Mumbai, Delhi NCR, Pune, Hyd, Chennai' },
            { value: '100%', label: 'Transparent Deterministic Scoring' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5"
            >
              <div className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-slate-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 01-04 Capabilities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 border-t border-slate-200">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
              How SportBridge AI Matches You
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl">
              Built for clarity and trust—every recommendation explains exactly why it fits your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(firebaseUser ? 'provider' : 'auth')}
            className="text-sm font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap self-start md:self-auto cursor-pointer"
          >
            Coach or academy owner? List an opportunity →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              num: '01.',
              title: 'Hard Eligibility & Budget Gates',
              desc: 'We eliminate mismatches upfront by filtering out opportunities outside your age bracket, sport, monthly fee ceiling, or commute distance.',
            },
            {
              num: '02.',
              title: 'Weighted 5-Factor Fit Score',
              desc: 'Every eligible match is scored 0–100 across skill fit (25%), goal alignment (25%), affordability (20%), distance (15%), and training days (15%).',
            },
            {
              num: '03.',
              title: 'Indicative Scholarship Checker',
              desc: 'Compare your age, sport, achievement tier, city, and income bracket against grant guidelines with clear Likely / Maybe / Not Eligible feedback.',
            },
            {
              num: '04.',
              title: 'Natural-Language AI Scout',
              desc: 'Ask questions like “Find affordable football coaching near me under ₹2,000/month” to search structured listings in plain language.',
            },
          ].map((item) => (
            <div
              key={item.num}
              className="bg-white border border-slate-200 rounded-2xl p-6"
            >
              <div className="font-mono text-sm font-semibold text-blue-600 mb-2">
                {item.num}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1.5">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sports Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 border-t border-slate-200">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="font-display text-3xl font-bold text-slate-900">
            Featured Sports Disciplines
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('search')}
            className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer"
          >
            Search all listings
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SPORT_GALLERY.map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={() => onNavigate('search')}
              className="group text-left bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-colors cursor-pointer"
            >
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                <img
                  src={card.img}
                  alt={card.alt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
                <p className="text-xs text-slate-600 mt-1">{card.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="font-semibold text-slate-700">SportBridge AI</span> · Youth sports discovery &amp; scholarship matching.
        </div>
        <div>
          Eligibility results are indicative only. Minor profiles require guardian consent and never expose exact location.
        </div>
      </footer>
    </div>
  );
};
