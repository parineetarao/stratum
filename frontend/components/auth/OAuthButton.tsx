import GoogleIcon from './GoogleIcon';

export default function OAuthButton() {
  return (
    <button
      type="button"
      disabled
      title="Google sign-in isn't connected yet"
      aria-disabled="true"
      className="auth-oauth-btn flex items-center justify-center"
      style={{
        width: '100%',
        height: 56,
        gap: 12,
        borderRadius: 9,
        border: '1px solid rgba(203, 213, 225, 0.32)',
        background: 'rgba(4, 6, 10, 0.55)',
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 500,
      }}
    >
      <GoogleIcon />
      Continue with Google
    </button>
  );
}
