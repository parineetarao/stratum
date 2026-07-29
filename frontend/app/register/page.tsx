'use client';

import { Suspense } from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AuthShell from '@/components/auth/AuthShell';
import ProductSummary from '@/components/auth/ProductSummary';
import SignupForm from '@/components/auth/SignupForm';

function RegisterPageContent() {
  const redirectTo = useAuthRedirect();

  return (
    <AuthShell
      renderLeft={(viewport) => <ProductSummary variant="signup" {...viewport} />}
      renderRight={() => <SignupForm redirectTo={redirectTo} />}
    />
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
