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
