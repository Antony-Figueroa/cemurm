'use client'
import { CardContent } from '@/components/ui/card';
import { DashboardCard } from "../../shared/dashboard-card";
import { buttonVariants } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AdminEvent } from '@/hooks/shared/useAdminOverview';

interface UpdateBannerProps {
  upcomingCount: number;
  nextEvent: AdminEvent | null;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function UpdateBanner({
  upcomingCount,
  nextEvent,
}: UpdateBannerProps) {
  return (
    <DashboardCard className="py-3">
      <CardContent className="flex items-center flex-wrap justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-chart-1 animate-ping absolute inline-flex" />
            <span className="h-2 w-2 rounded-full bg-chart-1 absolute inline-flex" />
            <p className="text-sm font-medium  ps-4">
              {upcomingCount > 0 ? 'Upcoming' : 'Agenda'}
            </p>
            <span className="w-1 h-1 rounded-full bg-cem-hover" />
            <p className="text-sm font-normal text-cem-secondary-elevated">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <p className="text-sm font-normal">
            {nextEvent ? (
              <>
                Next: <span className="text-success">{nextEvent.name}</span>
                {nextEvent.venue ? ` · ${nextEvent.venue}` : ''}
                {nextEvent.scheduledAt ? ` · ${formatDate(nextEvent.scheduledAt)}` : ''}
              </>
            ) : (
              'No upcoming events yet — add a gig to see it here.'
            )}
          </p>
        </div>
        <Link
          to="/gigs"
          className={buttonVariants({
            variant: 'outline',
            className: 'gap-1.5 px-4 py-2 h-auto rounded-md',
          })}
        >
          See events
          <span>
            <ArrowRight width={18} height={18} />
          </span>
        </Link>
      </CardContent>
    </DashboardCard>
  );
}
