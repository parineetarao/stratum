import Logo from '@/components/landing/Logo';

export default function AuthBrand() {
  return (
    <div style={{ marginBottom: 30, textAlign: 'center' }}>
      <div className="flex items-center justify-center">
        <Logo iconSize={34} fontSize={25} gap={15} letterSpacing="0.28em" fontWeight={500} />
      </div>
      <p
        style={{
          marginTop: 12,
          fontSize: 17,
          fontWeight: 400,
          color: 'rgba(226, 232, 240, 0.68)',
        }}
      >
        Engineering analytical systems.
      </p>
    </div>
  );
}
