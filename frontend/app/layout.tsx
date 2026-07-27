import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'BH Assurance | Gestion de parc', description: 'Plateforme interne BH Assurance' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
