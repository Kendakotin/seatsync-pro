import { MainLayout } from '@/components/layout/MainLayout';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="glass-card p-12 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Construction className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground">
            {description || 'This module is currently under development. Check back soon!'}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
