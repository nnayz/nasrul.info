import { startVisitorInsights } from '@/lib/analytics';
import { useEffect } from 'react';

export default function AnalyticsTracker() {
  useEffect(() => startVisitorInsights(), []);
  return null;
}
