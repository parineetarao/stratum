'use client';

import { Suspense } from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AuthShell from '@/components/auth/AuthShell';
import ProductSummary from '@/components/auth/ProductSummary';
import LoginForm from '@/components/auth/LoginForm';

function LoginPageContent() {
  const redirectTo = useAuthRedirect();

  return (
    <AuthShell
      renderLeft={(viewport) => <ProductSummary variant="login" {...viewport} />}
      renderRight={() => <LoginForm redirectTo={redirectTo} />}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
