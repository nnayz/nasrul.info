import { getVisitorGeo, type VisitorGeo } from '@/lib/geo';
import { track } from '@vercel/analytics';

const SESSION_KEY = 'nasrul.analytics.session';
const VISITOR_KEY = 'nasrul.analytics.visitor';

type VisitorKind = 'new' | 'returning';

type VisitorRecord = {
  firstSeen: number;
  visits: number;
};

const emptyGeo: VisitorGeo = {
  city: null,
  country: null,
  region: null,
  timezone: null,
};

export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
) {
  track(name, properties);
}

function readVisitor(): { visitor: VisitorKind; visits: number } {
  try {
    const raw = localStorage.getItem(VISITOR_KEY);
    if (!raw) {
      const record: VisitorRecord = { firstSeen: Date.now(), visits: 1 };
      localStorage.setItem(VISITOR_KEY, JSON.stringify(record));
      return { visitor: 'new', visits: 1 };
    }

    const parsed = JSON.parse(raw) as VisitorRecord;
    const visits = (parsed.visits ?? 1) + 1;
    localStorage.setItem(
      VISITOR_KEY,
      JSON.stringify({
        firstSeen: parsed.firstSeen ?? Date.now(),
        visits,
      } satisfies VisitorRecord),
    );
    return { visitor: 'returning', visits };
  } catch {
    return { visitor: 'new', visits: 1 };
  }
}

function hostFromHref(href: string) {
  try {
    return new URL(href).hostname;
  } catch {
    return null;
  }
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const anchor = target.closest('a');
  if (!(anchor instanceof HTMLAnchorElement)) return;

  const href = anchor.href;
  if (!href) return;

  if (href.startsWith('mailto:')) {
    trackEvent('Email Click');
    return;
  }

  const host = hostFromHref(href);
  if (!host || host === window.location.hostname) return;

  trackEvent('Outbound Click', { host });
}

async function reportSession() {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    return;
  }

  const { visitor, visits } = readVisitor();
  let geo = emptyGeo;
  try {
    geo = await getVisitorGeo();
  } catch {
    geo = emptyGeo;
  }

  trackEvent('Session', {
    city: geo.city ?? 'unknown',
    country: geo.country ?? 'unknown',
    region: geo.region ?? 'unknown',
    timezone: geo.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    visitor,
    visits,
  });
}

export function startVisitorInsights() {
  void reportSession();
  document.addEventListener('click', onDocumentClick);
  return () => document.removeEventListener('click', onDocumentClick);
}
