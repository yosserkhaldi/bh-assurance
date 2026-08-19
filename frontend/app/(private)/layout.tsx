import { AppShell } from '@/components/app-shell';
import { RealtimeProvider } from '@/components/realtime-provider';
export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <RealtimeProvider><AppShell>{children}</AppShell></RealtimeProvider>;
}
