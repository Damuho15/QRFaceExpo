import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subIcon?: LucideIcon;
  onClick?: () => void;
}

export default function StatCard({ title, value, icon: Icon, subIcon: SubIcon, onClick }: StatCardProps) {
  return (
    <Card 
        className={cn(onClick && "cursor-pointer hover:bg-muted/50 transition-colors")}
        onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-1 text-muted-foreground">
            {SubIcon && <SubIcon className="h-4 w-4" />}
            <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
