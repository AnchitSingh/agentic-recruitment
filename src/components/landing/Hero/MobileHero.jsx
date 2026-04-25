import React from 'react';
import { cn } from '../../../utils/designTokens';
import { FloatingCard } from './FloatingCard';
import { SocialProof } from '../SocialProof/SocialProof';
import { TrustIndicators } from '../SocialProof/TrustIndicators';
import { AuthButtons } from '../Action/ActionButtons';
export const MobileHero = ({ entrance, onOpenJDModal }) => {
    return (
        <section className="lg:hidden pt-8 sm:pt-12">
            <div className="text-center">
                <div style={entrance(1)}>
                    <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight leading-[1.1] mb-5">
                        The most
                        <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
                            {' '}
                            intelligent{' '}
                        </span>
                        AI talent scout
                    </h1>
                </div>
                <div style={entrance(2)}>
                    <p className="text-lg leading-relaxed mb-8 text-slate-500 max-w-xl mx-auto">
                        AI-powered candidate discovery and engagement with{' '}
                        <span className="font-medium text-slate-700">
                            intelligent matching that understands your needs
                        </span>{' '}
                        and finds the perfect talent, faster.
                    </p>
                </div>
                <div
                    style={entrance(3)}
                    className="flex justify-center relative mb-10"
                >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-gradient-to-br from-amber-200/50 to-orange-200/30 blur-2xl" />
                    </div>
                    <div className="relative z-10 animate-float">
                        <img
                            src="/assets/i3.avif"
                            alt="AI Talent Scout Agent"
                            className="w-56 sm:w-64 drop-shadow-2xl"
                            loading="eager"
                            decoding="async"
                        />
                    </div>
                    <FloatingCard className="top-2 -right-2 sm:right-4 animate-float-reverse">
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="font-medium text-slate-700">
                                Match Score: 94% 🎯
                            </span>
                        </div>
                    </FloatingCard>
                    <FloatingCard className="bottom-12 -left-2 sm:left-4 animate-float-slow">
                        <div className="text-xs mb-1 font-medium text-slate-600">
                            Top Skills
                        </div>
                        <div className="flex gap-1">
                            {[
                                'bg-blue-500',
                                'bg-blue-500',
                                'bg-blue-500',
                                'bg-green-500',
                                'bg-green-500',
                                'bg-amber-500',
                            ].map((c, i) => (
                                <div
                                    key={i}
                                    className={`w-2.5 h-2.5 rounded-full ${c}`}
                                />
                            ))}
                        </div>
                    </FloatingCard>
                </div>
                <div style={entrance(4)} className="flex justify-center mb-8">
                    <SocialProof />
                </div>
                <div style={entrance(5)} className="mb-8 max-w-sm mx-auto">
                    <AuthButtons isMobile onOpenJDModal={onOpenJDModal} />
                </div>
                                <div style={entrance(6)}>
                    <TrustIndicators className="justify-center" />
                </div>
            </div>
        </section>
    );
};
