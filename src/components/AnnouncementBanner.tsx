import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchAnnouncement } from '../lib/api';

/** The admin's note to all users; re-read whenever the app comes back to the front */
export function useAnnouncement() {
  const [text, setText] = useState('');
  useEffect(() => {
    const load = () => { fetchAnnouncement().then(setText).catch(() => {}); };
    load();
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  return text;
}

/** Shows the admin's announcement ("VIP üyelik şimdilik herkese bedava"); renders nothing when there is none */
export default function AnnouncementBanner({ className }: { className?: string }) {
  const text = useAnnouncement();
  if (!text) return null;
  return (
    <div role="status" className={cn('flex items-start gap-3 rounded-3xl bg-(--theme-accent-light) px-4 py-3', className)}>
      <Megaphone className="w-5 h-5 shrink-0 mt-0.5 text-(--theme-accent)" aria-hidden />
      <p className="text-[14px] font-bold leading-snug text-(--theme-ink) whitespace-pre-line">{text}</p>
    </div>
  );
}
