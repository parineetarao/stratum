import { Boxes, Link2, BarChart3 } from 'lucide-react';
import ProductFeature from './ProductFeature';

const FEATURES = [
  {
    icon: Boxes,
    iconColor: '#3dc9e8',
    title: 'End-to-end data modeling',
    description: 'From raw data to production-ready warehouse.',
  },
  {
    icon: Link2,
    iconColor: '#e4e4e7',
    title: 'Human in the loop',
    description: 'Engineer review at every critical step.',
  },
  {
    icon: BarChart3,
    iconColor: '#64748b',
    title: 'Built for scale',
    description: 'Designed for clarity, control, and confidence.',
  },
];

const COPY = {
  login: {
    heading: (
      <>
        Welcome back
        <br />
        to{' '}
      </>
    ),
    description: 'The platform for analytics engineers to build reliable data systems.',
  },
  signup: {
    heading: (
      <>
        Start building
        <br />
        with{' '}
      </>
    ),
    description: 'Create your account and start building reliable data systems.',
  },
};

interface ProductSummaryProps {
  isMobile: boolean;
  isTablet: boolean;
  hideFeatureDescriptions?: boolean;
  variant?: 'login' | 'signup';
}

export default function ProductSummary({
  isMobile,
  isTablet,
  hideFeatureDescriptions = false,
  variant = 'login',
}: ProductSummaryProps) {
  const padding = isMobile ? '38px 24px 34px' : isTablet ? '52px 44px' : '78px 70px 68px';
  const copy = COPY[variant];

  return (
    <div
      className="flex flex-col justify-start"
      style={{
        padding,
        height: '100%',
        background:
          'radial-gradient(circle at 5% 100%, rgba(111, 53, 244, 0.16), transparent 42%), ' +
          'radial-gradient(circle at 70% 100%, rgba(46, 167, 255, 0.08), transparent 40%), ' +
          'rgba(5, 8, 14, 0.72)',
      }}
    >
      <h1
        style={{
          fontSize: isMobile ? 38 : 'clamp(42px, 4vw, 56px)',
          lineHeight: 1.08,
          fontWeight: 650,
          letterSpacing: '-0.04em',
          color: '#f5f5f7',
          marginBottom: 24,
        }}
      >
        {copy.heading}
        <span
          style={{
            backgroundImage: 'linear-gradient(90deg, #9254ff 0%, #737dff 52%, #3dc9e8 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Stratum
        </span>
      </h1>

      <p
        style={{
          fontSize: 17,
          lineHeight: 1.55,
          color: 'rgba(226, 232, 240, 0.7)',
          maxWidth: 360,
          marginBottom: 34,
        }}
      >
        {copy.description}
      </p>

      <div>
        {FEATURES.map((feature, index) => (
          <ProductFeature
            key={feature.title}
            icon={feature.icon}
            iconColor={feature.iconColor}
            title={feature.title}
            description={feature.description}
            hideDescription={hideFeatureDescriptions}
            isLast={index === FEATURES.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
