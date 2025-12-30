import { motion } from "framer-motion";
import { ReactNode } from "react";

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
}

const OnboardingLayout = ({
  children,
  currentStep,
  totalSteps,
  title,
  subtitle,
}: OnboardingLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6 pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-2xl"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground mb-2">
              Step {currentStep} of {totalSteps}
            </p>
            <h1 className="font-display text-3xl md:text-4xl text-foreground mb-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground text-lg">{subtitle}</p>
            )}
          </div>

          {/* Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingLayout;
