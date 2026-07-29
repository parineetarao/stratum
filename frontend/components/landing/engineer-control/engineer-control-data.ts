export interface CardMeta {
  figureLabel: string;
  figureColor: string;
  title: string;
  description: string;
  bottomSentence: string;
  dotColor: string;
}

export const CARDS: CardMeta[] = [
  {
    figureLabel: 'FIG 01',
    figureColor: '#8b5cf6',
    title: 'AI makes a recommendation',
    description: 'Stratum analyzes your data and proposes what’s best.',
    bottomSentence: 'AI scans billions of data points to surface high-confidence recommendations.',
    dotColor: '#7c4dff',
  },
  {
    figureLabel: 'FIG 02',
    figureColor: '#6f97ff',
    title: 'You review and refine',
    description: 'You bring context, expertise, and judgment to make it right.',
    bottomSentence: 'Engineers validate, adjust, and add context before moving forward.',
    dotColor: '#6f97ff',
  },
  {
    figureLabel: 'FIG 03',
    figureColor: '#5bd4d4',
    title: 'You approve and it’s applied',
    description: 'Only your approved decisions are applied to production.',
    bottomSentence: 'Approved changes are versioned, audited, and safely applied.',
    dotColor: '#5bd4d4',
  },
];

export interface IllustrationProps {
  emphasize: boolean;
  playToken: number;
  reducedMotion: boolean;
}
