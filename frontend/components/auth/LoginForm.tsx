'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { login, fetchCurrentUser, extractErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { crossAuthLink } from '@/hooks/useAuthRedirect';
import FormField from './FormField';
import OAuthButton from './OAuthButton';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginFormProps {
  redirectTo: string;
}

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const tokens = await login({ email: email.trim(), password });
      setTokens(tokens);

      try {
        const user = await fetchCurrentUser();
        setUser(user);
      } catch {
        // Non-fatal: session is still valid even if the profile fetch fails.
      }

      router.push(redirectTo);
    } catch (error) {
      setSubmitError(extractErrorMessage(error, 'Something went wrong. Please try again.'));
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h2
        style={{
          fontSize: 24,
          fontWeight: 620,
          letterSpacing: '-0.02em',
          color: '#f5f5f7',
          marginBottom: 8,
        }}
      >
        Sign in to your account
      </h2>
      <p style={{ fontSize: 16, color: 'rgba(226, 232, 240, 0.66)', marginBottom: 42 }}>
        Enter your details below to continue.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 26 }}>
          <FormField
            label="Email"
            icon={<Mail size={18} strokeWidth={1.5} />}
            type="email"
            name="email"
            placeholder="you@company.com"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
            required
          />
        </div>

        <div style={{ marginBottom: 0 }}>
          <FormField
            label="Password"
            icon={<Lock size={18} strokeWidth={1.5} />}
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            required
            labelRight={
              <Link href="#" className="auth-forgot-link" style={{ fontSize: 14, color: '#a878ff', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            }
          />
        </div>

        {submitError && (
          <div
            role="alert"
            style={{
              marginTop: 26,
              padding: '11px 14px',
              borderRadius: 8,
              border: '1px solid rgba(248, 113, 113, 0.28)',
              background: 'rgba(127, 29, 29, 0.12)',
              color: '#fca5a5',
              fontSize: 14,
            }}
          >
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="auth-signin-btn flex items-center justify-center"
          style={{
            width: '100%',
            height: 56,
            marginTop: 28,
            gap: 18,
            border: 'none',
            borderRadius: 9,
            background: 'linear-gradient(100deg, #6f1df2 0%, #5b3eff 48%, #2e9fff 100%)',
            color: '#ffffff',
            fontSize: 17,
            fontWeight: 600,
          }}
        >
          {isSubmitting ? (
            <>
              Signing in...
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            </>
          ) : (
            <>
              Sign in
              <ArrowRight size={18} className="auth-signin-arrow" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <div className="flex items-center" style={{ gap: 18, margin: '30px 0' }}>
        <span style={{ height: 1, flex: 1, background: 'rgba(148, 163, 184, 0.2)' }} />
        <span style={{ fontSize: 14, color: 'rgba(226, 232, 240, 0.65)' }}>OR</span>
        <span style={{ height: 1, flex: 1, background: 'rgba(148, 163, 184, 0.2)' }} />
      </div>

      <OAuthButton />

      <p style={{ textAlign: 'center', fontSize: 15, color: 'rgba(226, 232, 240, 0.68)', marginTop: 46 }}>
        Don&rsquo;t have an account?{' '}
        <Link href={crossAuthLink('/register', redirectTo)} className="auth-signup-link" style={{ color: '#a878ff', textDecoration: 'none' }}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
