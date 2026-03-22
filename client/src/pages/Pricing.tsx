import { motion } from "framer-motion";
import { Check, Star, Zap, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const tiers = [
    {
        name: "Hatchling",
        price: "Free",
        description: "Perfect for getting started with personal productivity.",
        icon: Star,
        features: [
            "Basic Kanban Board",
            "Standard Focus Timer",
            "Up to 5 Projects",
            "Community Support"
        ],
        cta: "Start for Free",
        popular: false,
        color: "from-blue-500/20 to-blue-600/5",
        buttonVariant: "outline"
    },
    {
        name: "Pro Nest",
        price: "$9.99",
        period: "/mo",
        description: "Advanced tools and AI assistant for profound focus and productivity.",
        icon: Zap,
        features: [
            "Everything in Hatchling",
            "Unlimited Projects",
            "AI Productivity Assistant",
            "Advanced Spotify Integration",
            "Custom Focus Templates",
            "Priority Support"
        ],
        cta: "Upgrade to Pro",
        popular: true,
        color: "from-ai-purple/20 to-primary/5",
        buttonVariant: "default"
    },
    {
        name: "Flock (Teams)",
        price: "$29.99",
        period: "/user/mo",
        description: "Built for teams aiming to achieve collective flow.",
        icon: Users,
        features: [
            "Everything in Pro Nest",
            "Team Collaboration Boards",
            "Manager Analytics",
            "SSO & Advanced Security",
            "Dedicated Account Manager",
            "Custom Onboarding"
        ],
        cta: "Contact Sales",
        popular: false,
        color: "from-emerald-500/20 to-emerald-600/5",
        buttonVariant: "outline"
    }
];

const Pricing = () => {
    return (
        <div className="min-h-[calc(100vh-8rem)] py-12 px-4 flex flex-col items-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-3xl mb-16"
            >
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                    Invest in Your <span className="text-gradient-primary">Focus</span>
                </h1>
                <p className="text-lg text-muted-foreground">
                    Choose a plan that fits your productivity style. Whether you're flying solo
                    or orchestrating a team, FocusNest helps you achieve your peak flow state.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
                {tiers.map((tier, index) => (
                    <motion.div
                        key={tier.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`relative rounded-3xl p-8 glass-card border flex flex-col ${tier.popular
                                ? 'border-primary/50 shadow-2xl shadow-primary/20 scale-100 md:scale-105 z-10'
                                : 'border-border/50 scale-100'
                            }`}
                    >
                        {tier.popular && (
                            <div className="absolute -top-4 inset-x-0 flex justify-center">
                                <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                                    <Star className="w-3 h-3 fill-current" /> Most Popular
                                </span>
                            </div>
                        )}

                        <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} rounded-3xl -z-10`} />

                        <div className="mb-8">
                            <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center mb-6 shadow-sm">
                                <tier.icon className="w-6 h-6 text-foreground" />
                            </div>
                            <h3 className="text-2xl font-bold text-foreground mb-2">{tier.name}</h3>
                            <p className="text-muted-foreground text-sm min-h-[40px]">{tier.description}</p>
                        </div>

                        <div className="mb-8 flex items-end gap-1">
                            <span className="text-5xl font-extrabold tracking-tight text-foreground">{tier.price}</span>
                            {tier.period && (
                                <span className="text-muted-foreground font-medium mb-1">{tier.period}</span>
                            )}
                        </div>

                        <div className="space-y-4 mb-8 flex-1">
                            {tier.features.map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <div className="p-1 rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <Button
                            className={`w-full rounded-xl py-6 font-semibold shadow-md transition-all border-0 ${tier.buttonVariant === 'default'
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25'
                                    : 'bg-muted text-foreground hover:bg-muted/80 border border-border/50'
                                }`}
                        >
                            {tier.cta}
                        </Button>
                    </motion.div>
                ))}
            </div>

            {/* Trust Badges */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-20 flex flex-col items-center justify-center space-y-4 text-center"
            >
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" /> Enterprise Grade Security
                </p>
                <div className="flex gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    <div className="font-bold text-lg text-foreground tracking-tight">SOC 2 Type II</div>
                    <div className="font-bold text-lg text-foreground tracking-tight">GDPR Ready</div>
                    <div className="font-bold text-lg text-foreground tracking-tight">End-to-End Encryption</div>
                </div>
            </motion.div>

        </div>
    );
};

export default Pricing;
