import type { LucideIcon } from 'lucide-react';

interface ProductFeatureProps {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  description: string;
  hideDescription?: boolean;
  isLast?: boolean;
}

export default function ProductFeature({
  icon: Icon,
  iconColor,
  title,
  description,
  hideDescription = false,
  isLast = false,
}: ProductFeatureProps) {
  return (
    <div
      className="flex items-start"
      style={{ gap: 18, marginBottom: isLast ? 0 : 26 }}
    >
      <div
        className="flex-shrink-0 grid place-items-center"
        style={{
          width: 50,
          height: 50,
          borderRadius: 10,
          border: '1px solid rgba(148, 163, 184, 0.26)',
          background: 'rgba(8, 11, 16, 0.72)',
        }}
      >
        <Icon size={20} color={iconColor} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#f4f4f5', marginBottom: 5 }}>
          {title}
        </div>
        {!hideDescription && (
          <div style={{ fontSize: 13, lineHeight: 1.45, color: 'rgba(226, 232, 240, 0.58)' }}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
