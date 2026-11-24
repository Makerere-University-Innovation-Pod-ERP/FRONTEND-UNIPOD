import { cn } from '@/lib/utils';

type LoadingSkeletonVariant = 'section' | 'compact' | 'table' | 'cards' | 'form';

interface LoadingSkeletonProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  label?: string;
  variant?: LoadingSkeletonVariant;
}

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('ui-skeleton rounded-md', className)}
      className={cn('ui-skeleton rounded-md bg-primary/10', className)}
      {...props}
    />
  );
}

function LoadingSkeleton({
  label = 'Loading…',
  variant = 'section',
  className,
  ...props
}: LoadingSkeletonProps) {
  const rows = variant === 'compact' ? 3 : variant === 'cards' ? 4 : 6;

  return (
    <div
      className={cn('skeleton-loader', `skeleton-loader--${variant}`, className)}
      role="status"
      aria-label={label}
      aria-busy="true"
      {...props}
    >
      <p className="skeleton-loader__label">{label}</p>
      <div className="skeleton-loader__header" aria-hidden="true">
        <Skeleton className="skeleton-loader__kicker" />
        <Skeleton className="skeleton-loader__heading" />
      </div>
      <div className="skeleton-loader__rows" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div className="skeleton-loader__row" key={index}>
            <Skeleton className="skeleton-loader__avatar" />
            <div className="skeleton-loader__lines">
              <Skeleton className="skeleton-loader__line" />
              <Skeleton className="skeleton-loader__line skeleton-loader__line--short" />
            </div>
            <Skeleton className="skeleton-loader__pill" />
          </div>
        ))}
      </div>
    </div>
  );
}

export { Skeleton, LoadingSkeleton };
