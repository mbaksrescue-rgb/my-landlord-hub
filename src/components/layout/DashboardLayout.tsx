import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64">
        <ScrollArea className="h-screen">
          <div className="p-8">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
