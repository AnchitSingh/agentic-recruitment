import { FloatingCard } from './FloatingCard';
import { SocialProof } from '../SocialProof/SocialProof';
import { TrustIndicators } from '../SocialProof/TrustIndicators';
import { AuthButtons } from '../Action/ActionButtons';

/**
 * DesktopHero - Desktop-specific hero section component.
 * Displays the main landing page content with a two-column layout:
 * - Left column: Headline, description, social proof, and action buttons
 * - Right column: Hero image with floating informational cards
 *
 * @param {Object} props - Component props
 * @param {Function} props.onOpenJDModal - Callback function to open the JD parsing modal
 * @returns {JSX.Element} Rendered desktop hero section
 */
export const DesktopHero = ({ onOpenJDModal }) => {
    return (
        <section className="hidden lg:block">
            <div className="grid grid-cols-2 gap-16 xl:gap-20 items-center min-h-[calc(100vh-100px)]">
                <div className="py-16">
                    <div>
                        <h1 className="text-5xl xl:text-6xl font-display font-bold tracking-tight leading-[1.08] mb-6">
                            The most
                            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
                                {' '}
                                intelligent{' '}
                            </span>
                            AI talent scout
                        </h1>
                    </div>
                    <div>
                        <p className="text-xl leading-relaxed mb-8 text-slate-500 max-w-lg">
                            AI-powered candidate discovery and engagement across all industries
                            with{' '}
                            <span className="font-medium text-slate-700">
                                intelligent matching that understands your needs
                            </span>{' '}
                            and finds the perfect talent, faster.
                        </p>
                    </div>
                    <div className="mb-8">
                        <SocialProof />
                    </div>
                    <div className="mb-10">
                        <AuthButtons onOpenJDModal={onOpenJDModal} />
                    </div>
                                        <div>
                        <TrustIndicators />
                    </div>
                </div>
                <div className="relative flex justify-center items-center py-16">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[420px] h-[420px] rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/30 blur-3xl" />
                    </div>
                    <div
                        className="relative z-10 animate-float"
                    >
                        <img
                            src="/assets/i3.avif"
                            alt="AI Talent Scout Agent"
                            className="w-80 xl:w-96 drop-shadow-2xl"
                            loading="eager"
                            decoding="async"
                        />
                    </div>
                    <FloatingCard className="top-12 right-4 xl:right-8 animate-float-reverse">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <span className="text-sm leading-none">🎯</span>
                            </div>
                            <div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                    Match Score
                                </div>
                                <div className="text-sm font-semibold text-slate-800">
                                    94%
                                </div>
                            </div>
                        </div>
                    </FloatingCard>
                    <FloatingCard className="top-32 -left-4 xl:left-0 animate-float-slow">
                        <div className="text-xs mb-2.5 font-medium text-slate-600">
                            Top Industries
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {[
                                {
                                    label: 'Tech',
                                    cls: 'bg-blue-50 text-blue-700',
                                },
                                {
                                    label: 'Health',
                                    cls: 'bg-green-50 text-green-700',
                                },
                                {
                                    label: 'Finance',
                                    cls: 'bg-purple-50 text-purple-700',
                                },
                                {
                                    label: 'Sales',
                                    cls: 'bg-amber-50 text-amber-700',
                                },
                            ].map(({ label, cls }) => (
                                <span
                                    key={label}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-lg text-center ${cls}`}
                                >
                                    {label}
                                </span>
                            ))}
                        </div>
                    </FloatingCard>
                    <FloatingCard className="bottom-24 -left-6 xl:left-2 animate-float-medium">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                <svg
                                    className="w-4 h-4 text-amber-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-slate-700">
                                    Perfect Match Found
                                </div>
                                <div className="text-xs text-amber-600 font-medium">
                                    Senior Developer → 98% match
                                </div>
                            </div>
                        </div>
                    </FloatingCard>
                    <FloatingCard className="bottom-8 right-6 xl:right-12 animate-float-reverse-slow">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <span className="text-sm leading-none">🧣</span>
                            </div>
                            <div>
                                <div className="font-semibold text-slate-800">
                                    50,000+
                                </div>
                                <div className="text-xs text-slate-500">
                                    Candidates &amp; Growing
                                </div>
                            </div>
                        </div>
                    </FloatingCard>
                </div>
            </div>
        </section>
    );
};
