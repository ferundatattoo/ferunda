import { useMemo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertTriangle, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { 
  checkPasswordRequirements, 
  calculatePasswordStrength, 
  checkPasswordBreached,
  formatBreachCount,
  type PasswordStrength,
  type PasswordRequirement 
} from "@/utils/passwordSecurity";

interface PasswordStrengthValidatorProps {
  password: string;
  onValidChange?: (isValid: boolean, breachCount: number) => void;
  showRequirements?: boolean;
  checkBreaches?: boolean;
}

const strengthColors: Record<PasswordStrength['level'], string> = {
  'very-weak': 'bg-destructive',
  'weak': 'bg-orange-500',
  'fair': 'bg-yellow-500',
  'strong': 'bg-emerald-500',
  'very-strong': 'bg-emerald-600',
};

const strengthLabels: Record<PasswordStrength['level'], string> = {
  'very-weak': 'Muy débil',
  'weak': 'Débil',
  'fair': 'Regular',
  'strong': 'Fuerte',
  'very-strong': 'Muy fuerte',
};

export function PasswordStrengthValidator({
  password,
  onValidChange,
  showRequirements = true,
  checkBreaches = true,
}: PasswordStrengthValidatorProps) {
  const [breachCount, setBreachCount] = useState<number>(0);
  const [isCheckingBreach, setIsCheckingBreach] = useState(false);
  const [hasCheckedBreach, setHasCheckedBreach] = useState(false);

  const requirements = useMemo(() => checkPasswordRequirements(password), [password]);
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  // Debounced breach check
  useEffect(() => {
    if (!checkBreaches || password.length < 8) {
      setBreachCount(0);
      setHasCheckedBreach(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingBreach(true);
      const count = await checkPasswordBreached(password);
      setBreachCount(count === -1 ? 0 : count); // Treat errors as 0 (don't block user)
      setHasCheckedBreach(true);
      setIsCheckingBreach(false);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [password, checkBreaches]);

  // Notify parent of validity changes
  useEffect(() => {
    const isValid = strength.isValid && breachCount === 0;
    onValidChange?.(isValid, breachCount);
  }, [strength.isValid, breachCount, onValidChange]);

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 space-y-3"
    >
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-body text-xs text-muted-foreground">
            Fortaleza de contraseña
          </span>
          <span className="font-body text-xs font-medium text-foreground">
            {strengthLabels[strength.level]}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
          {[1, 2, 3, 4, 5].map((segment) => (
            <motion.div
              key={segment}
              className={`h-full flex-1 rounded-full ${
                segment <= Math.ceil(strength.score) 
                  ? strengthColors[strength.level] 
                  : 'bg-muted-foreground/20'
              }`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: segment * 0.05 }}
            />
          ))}
        </div>
      </div>

      {/* Requirements list */}
      {showRequirements && (
        <div className="space-y-1.5">
          <span className="font-body text-xs text-muted-foreground">Requisitos:</span>
          <ul className="space-y-1">
            <AnimatePresence mode="popLayout">
              {requirements.map((req) => (
                <RequirementItem key={req.id} requirement={req} />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {/* Breach warning */}
      {checkBreaches && (
        <AnimatePresence>
          {isCheckingBreach && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex items-center gap-2 p-2 rounded bg-muted/50"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              <span className="font-body text-xs text-muted-foreground">
                Verificando en bases de datos filtradas...
              </span>
            </motion.div>
          )}
          
          {!isCheckingBreach && hasCheckedBreach && breachCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex items-start gap-2 p-3 rounded bg-destructive/10 border border-destructive/20"
            >
              <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-body text-xs font-medium text-destructive">
                  ¡Contraseña comprometida!
                </p>
                <p className="font-body text-xs text-destructive/80 mt-0.5">
                  Esta contraseña ha aparecido {formatBreachCount(breachCount)} veces en filtraciones de datos. 
                  Por favor, elige una contraseña diferente.
                </p>
              </div>
            </motion.div>
          )}
          
          {!isCheckingBreach && hasCheckedBreach && breachCount === 0 && strength.isValid && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex items-center gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-body text-xs text-emerald-600">
                Contraseña segura - no encontrada en filtraciones conocidas
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

function RequirementItem({ requirement }: { requirement: PasswordRequirement }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-2 text-xs font-body transition-colors ${
        requirement.met ? 'text-emerald-600' : 'text-muted-foreground'
      }`}
    >
      {requirement.met ? (
        <Check className="w-3 h-3" />
      ) : (
        <X className="w-3 h-3 text-muted-foreground/50" />
      )}
      <span>{requirement.label}</span>
    </motion.li>
  );
}

export default PasswordStrengthValidator;
