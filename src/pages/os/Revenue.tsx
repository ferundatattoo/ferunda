import { motion } from 'framer-motion';
import { RevenueOptimizerDashboard } from '@/components/admin/revenue-optimizer';

export default function Revenue() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Revenue Optimizer</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered revenue optimization and demand forecasting
          </p>
        </div>
      </div>

      <RevenueOptimizerDashboard />
    </motion.div>
  );
}
