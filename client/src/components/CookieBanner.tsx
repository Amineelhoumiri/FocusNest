import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const CookieBanner = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem("gdpr-consent");
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem("gdpr-consent", "accepted");
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem("gdpr-consent", "declined");
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-0 inset-x-0 z-50 p-4 pb-6 md:p-6 shadow-2xl bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none"
                >
                    <div className="max-w-4xl mx-auto pointer-events-auto">
                        <div className="glass-card border border-border/50 rounded-2xl p-6 shadow-xl relative overflow-hidden bg-card/80 backdrop-blur-xl">
                            <button
                                onClick={handleDecline}
                                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                <div className="hidden md:flex shrink-0 w-12 h-12 bg-primary/10 rounded-xl items-center justify-center">
                                    <Cookie className="w-6 h-6 text-primary" />
                                </div>

                                <div className="flex-1 pr-8">
                                    <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                                        <Cookie className="w-5 h-5 text-primary md:hidden" />
                                        We Value Your Privacy
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        FocusNest uses cookies to enhance your browsing experience, serve personalized features, and analyze our traffic in accordance with GDPR guidelines. By clicking "Accept All", you consent to our use of cookies.
                                    </p>
                                </div>

                                <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto shrink-0 mt-4 md:mt-0">
                                    <Button
                                        onClick={handleAccept}
                                        className="w-full md:w-32 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
                                    >
                                        Accept All
                                    </Button>
                                    <Button
                                        onClick={handleDecline}
                                        variant="outline"
                                        className="w-full md:w-32 rounded-xl"
                                    >
                                        Essential Only
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CookieBanner;
