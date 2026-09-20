export type HighlightKind =
  'employment' | 'freelance' | 'personal' | 'research';

export type Highlight = {
  company?: string;
  end?: string;
  kind: HighlightKind;
  role?: string;
  slug: string;
  start?: string;
  summary: string;
  title: string;
};

export const kindLabels: Record<HighlightKind, string> = {
  employment: 'Employment',
  freelance: 'Freelance',
  personal: 'Personal',
  research: 'Research',
};

export const highlightPeriod = (highlight: Highlight): string => {
  if (!highlight.start) return '';
  const year = (date: string) => date.slice(0, 4);
  const end = highlight.end ? year(highlight.end) : 'Present';
  return year(highlight.start) === end
    ? end
    : `${year(highlight.start)} — ${end}`;
};

export const highlightMeta = (highlight: Highlight): string =>
  [highlight.company, highlight.role, highlightPeriod(highlight)]
    .filter(Boolean)
    .join(' · ');

type FeaturedWorkItem = {
  alt?: string;
  image?: string;
  result: string;
  role: string;
  slug: string;
};

export const featuredWork: FeaturedWorkItem[] = [
  {
    result: 'open-source macOS workbench',
    role: 'product + engineering',
    slug: 'zeus',
  },
  {
    alt: 'MLdrills editor showing a solved Softmax Function problem',
    image: '/static/images/work/mldrills.webp',
    result: 'live practice product',
    role: 'product + engineering',
    slug: 'mldrills',
  },
  {
    alt: 'SynTwin voice agent listening during a call',
    image: '/static/images/work/syntwin.webp',
    result: 'shipped agent workflows',
    role: 'AI engineer',
    slug: 'syntwin',
  },
];

const workDescriptions: Record<string, string> = {
  'acl-anthology-search': 'semantic paper search',
  'bioacoustic-sound-classification': 'few-shot animal calls',
  'discourse-analysis-tool-suite': 'research text tools',
  'federated-nicheformer': 'federated genomics',
  mldrills: 'ml practice platform',
  mytorch: 'numpy autograd',
  pettoo: 'pet care platform',
  syntwin: 'digital twin agents',
  zeus: 'parallel coding agents',
};

export const highlightYear = (highlight: Highlight): number =>
  highlight.start ? Number(highlight.start.slice(0, 4)) : 0;

export const workDescription = (highlight: Highlight): string =>
  workDescriptions[highlight.slug] ?? '';

const workLinks: Record<string, string> = {
  mldrills: 'https://mldrills.com',
  syntwin: 'https://syntwin.ai',
  zeus: 'https://nnayz.github.io/zeus',
};

export const workHref = (slug: string): string | undefined => workLinks[slug];
