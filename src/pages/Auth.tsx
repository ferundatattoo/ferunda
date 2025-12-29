import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, ArrowLeft, Sparkles } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PasswordStrengthValidator } from "@/components/PasswordStrengthValidator";
import { logSecurityEvent, calculatePasswordStrength, checkPasswordBreached } from "@/utils/passwordSecurity";
import { supabase } from "@/integrations/supabase/client";

// Enhanced schema with stronger password validation for signup
const loginSchema = z.object({
  email: z.string().email("Por favor ingresa un email válido").max(255),
  password: z.string().min(1, "La contraseña es requerida").max(100),
});

const signupSchema = z.object({
  email: z.string().email("Por favor ingresa un email válido").max(255),
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100)
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/\d/, "Debe contener al menos un número")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Debe contener al menos un carácter especial"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMagicLinkSending, setIsMagicLinkSending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [passwordValid, setPasswordValid] = useState(false);
  const [breachCount, setBreachCount] = useState(0);
  const [showMagicLinkOption, setShowMagicLinkOption] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate("/admin");
    }
  }, [user, loading, navigate]);

  const handlePasswordValidChange = useCallback((isValid: boolean, breach: number) => {
    setPasswordValid(isValid);
    setBreachCount(breach);
  }, []);

  const validateForm = () => {
    const schema = isLogin ? loginSchema : signupSchema;
    try {
      schema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === "email") fieldErrors.email = err.message;
          if (err.path[0] === "password") fieldErrors.password = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // For signup, check password strength and breach status
    if (!isLogin) {
      const strength = calculatePasswordStrength(formData.password);
      
      if (!strength.isValid) {
        await logSecurityEvent('weak_password_rejected', {
          email: formData.email,
          success: false,
          details: { reason: 'weak_password' },
        });
        toast({
          title: "Contraseña débil",
          description: "Por favor, elige una contraseña que cumpla todos los requisitos.",
          variant: "destructive",
        });
        return;
      }

      // Final breach check before signup
      const finalBreachCheck = await checkPasswordBreached(formData.password);
      if (finalBreachCheck > 0) {
        await logSecurityEvent('password_breach_detected', {
          email: formData.email,
          success: false,
          details: { breach_count: finalBreachCheck },
        });
        toast({
          title: "Contraseña comprometida",
          description: "Esta contraseña ha sido expuesta en filtraciones de datos. Por favor, elige otra.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await logSecurityEvent('login_attempt', { email: formData.email });
        
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          await logSecurityEvent('login_failed', {
            email: formData.email,
            success: false,
            details: { error_message: error.message },
          });
          
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Error de inicio de sesión",
              description: "Email o contraseña incorrectos. Por favor, intenta de nuevo.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error de inicio de sesión",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }
        
        await logSecurityEvent('login_success', { email: formData.email, success: true });
        
        toast({
          title: "¡Bienvenido!",
          description: "Has iniciado sesión correctamente.",
        });
        navigate("/admin");
      } else {
        await logSecurityEvent('signup_attempt', { email: formData.email });
        
        const { error } = await signUp(formData.email, formData.password);
        if (error) {
          await logSecurityEvent('signup_failed', {
            email: formData.email,
            success: false,
            details: { error_message: error.message },
          });
          
          if (error.message.includes("User already registered")) {
            toast({
              title: "Cuenta existente",
              description: "Este email ya está registrado. Por favor, inicia sesión.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error de registro",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }
        
        await logSecurityEvent('signup_success', { email: formData.email, success: true });
        
        toast({
          title: "Cuenta creada",
          description: "Tu cuenta ha sido creada exitosamente. Por favor, inicia sesión.",
        });
        setIsLogin(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if signup button should be disabled
  const isSignupDisabled = !isLogin && (!passwordValid || breachCount > 0);

  // Magic Link handler
  const handleMagicLink = async () => {
    if (!formData.email) {
      toast({
        title: "Email requerido",
        description: "Por favor ingresa tu email para recibir el magic link.",
        variant: "destructive",
      });
      return;
    }

    setIsMagicLinkSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });

      if (error) throw error;

      toast({
        title: "Magic Link enviado",
        description: "Revisa tu email para iniciar sesión sin contraseña.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el magic link.",
        variant: "destructive",
      });
    } finally {
      setIsMagicLinkSending(false);
    }
  };

  // Google OAuth handler
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/admin`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo iniciar sesión con Google.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Back to Home */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-body text-sm">Volver al sitio</span>
        </button>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              Admin
            </span>
            <div className="h-px w-12 bg-border" />
          </div>
          <h1 className="font-display text-4xl font-light text-foreground">
            {isLogin ? "Bienvenido" : "Crear Cuenta"}
          </h1>
          <p className="font-body text-muted-foreground mt-4">
            {isLogin 
              ? "Inicia sesión para gestionar tus solicitudes de reserva."
              : "Crea una cuenta para comenzar."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
              <Mail className="w-3 h-3 inline mr-2" />
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-transparent border-b border-border py-3 font-body text-foreground focus:outline-none focus:border-foreground transition-colors"
              placeholder="tu@email.com"
            />
            {errors.email && (
              <p className="text-destructive text-xs mt-1 font-body">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
              <Lock className="w-3 h-3 inline mr-2" />
              Contraseña
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-transparent border-b border-border py-3 font-body text-foreground focus:outline-none focus:border-foreground transition-colors"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-destructive text-xs mt-1 font-body">{errors.password}</p>
            )}
            
            {/* Password strength validator - only show for signup */}
            <AnimatePresence>
              {!isLogin && formData.password && (
                <PasswordStrengthValidator
                  password={formData.password}
                  onValidChange={handlePasswordValidChange}
                  showRequirements={true}
                  checkBreaches={true}
                />
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isSignupDisabled}
            className="w-full px-12 py-4 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isLogin ? "Iniciando sesión..." : "Creando cuenta..."}
              </>
            ) : (
              isLogin ? "Iniciar Sesión" : "Crear Cuenta"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">
            o continúa con
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Alternative Auth Methods */}
        <div className="space-y-3">
          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full px-6 py-3 border border-border bg-card text-foreground font-body text-sm tracking-[0.1em] uppercase hover:bg-accent transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Google
          </button>

          {/* Magic Link */}
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={isMagicLinkSending || !formData.email}
            className="w-full px-6 py-3 border border-border bg-card text-foreground font-body text-sm tracking-[0.1em] uppercase hover:bg-accent transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isMagicLinkSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Magic Link
          </button>
        </div>

        {/* Toggle */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors({});
              setPasswordValid(false);
              setBreachCount(0);
            }}
            className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin 
              ? "¿No tienes cuenta? Regístrate"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
