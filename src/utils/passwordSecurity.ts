/**
 * Password Security Utilities
 * - Password strength validation
 * - HaveIBeenPwned API integration using k-anonymity model
 * - Security logging
 */

import { supabase } from "@/integrations/supabase/client";

export interface PasswordStrength {
  score: number; // 0-5
  level: 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';
  feedback: string[];
  isValid: boolean;
}

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

/**
 * Check password requirements
 */
export function checkPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: 'Al menos 8 caracteres',
      met: password.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'Al menos 1 letra mayúscula',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'Al menos 1 letra minúscula',
      met: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'Al menos 1 número',
      met: /\d/.test(password),
    },
    {
      id: 'special',
      label: 'Al menos 1 carácter especial (!@#$%^&*)',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ];
}

/**
 * Calculate password strength
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  const requirements = checkPasswordRequirements(password);
  const metCount = requirements.filter(r => r.met).length;
  const feedback: string[] = requirements.filter(r => !r.met).map(r => r.label);
  
  // Calculate score based on met requirements and additional factors
  let score = metCount;
  
  // Bonus for length > 12
  if (password.length >= 12) score += 0.5;
  if (password.length >= 16) score += 0.5;
  
  // Cap at 5
  score = Math.min(5, score);
  
  let level: PasswordStrength['level'];
  if (score <= 1) level = 'very-weak';
  else if (score <= 2) level = 'weak';
  else if (score <= 3) level = 'fair';
  else if (score <= 4) level = 'strong';
  else level = 'very-strong';
  
  // Password is valid if all 5 base requirements are met
  const isValid = metCount === 5;
  
  return { score, level, feedback, isValid };
}

/**
 * Generate SHA-1 hash of a string (for HaveIBeenPwned API)
 */
async function sha1Hash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Check if password has been exposed in data breaches using HaveIBeenPwned API
 * Uses k-anonymity model - only sends first 5 chars of SHA-1 hash
 * @returns Number of times the password was found in breaches, or -1 on error
 */
export async function checkPasswordBreached(password: string): Promise<number> {
  try {
    const hash = await sha1Hash(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);
    
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'Ferunda-Tattoo-Security-Check',
      },
    });
    
    if (!response.ok) {
      console.error('HaveIBeenPwned API error:', response.status);
      return -1; // Return -1 to indicate error (don't block user)
    }
    
    const text = await response.text();
    const lines = text.split('\n');
    
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return parseInt(count.trim(), 10);
      }
    }
    
    return 0; // Password not found in breaches
  } catch (error) {
    console.error('Error checking password breach:', error);
    return -1; // Return -1 to indicate error
  }
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  eventType: 'login_attempt' | 'login_success' | 'login_failed' | 'signup_attempt' | 'signup_success' | 'signup_failed' | 'password_breach_detected' | 'weak_password_rejected',
  options: {
    email?: string;
    userId?: string;
    success?: boolean;
    details?: Record<string, string | number | boolean | null>;
  } = {}
): Promise<void> {
  try {
    // Get user agent
    const userAgent = navigator.userAgent;
    
    await supabase.from('security_logs').insert([{
      event_type: eventType,
      user_id: options.userId || null,
      email: options.email || null,
      user_agent: userAgent,
      success: options.success ?? true,
      details: options.details || {},
    }]);
  } catch (error) {
    // Don't throw - logging should not break the flow
    console.error('Failed to log security event:', error);
  }
}

/**
 * Format breach count for display
 */
export function formatBreachCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
