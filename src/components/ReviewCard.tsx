import React from 'react';
import { CheckCircle, Calendar, ShieldCheck, User } from 'lucide-react';
import { RatingStars } from './RatingStars.tsx';
import { ReviewItem } from '../types.ts';

interface ReviewCardProps {
  review: ReviewItem;
  isAdmin?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, isAdmin = false }) => {
  const formatDate = (dateVal: string | Date) => {
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  // Generate initials for avatar fallback
  const initials = review.customerName
    ? review.customerName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const statusColors = {
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 p-6 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Top bar: Customer info + Rating & Date */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {review.imageUrl ? (
              <img
                src={review.imageUrl}
                alt={review.customerName}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover ring-2 ring-indigo-500/20 shadow-xs"
                onError={(e) => {
                  // Fallback to initial avatar if image fails to load
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 text-white font-semibold text-sm flex items-center justify-center shadow-xs">
                {initials}
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-base leading-tight">
                  {review.customerName}
                </h4>
                <span title="Verified Customer">
                  <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-50 dark:fill-blue-950" />
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Verified Customer
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <RatingStars rating={review.rating} size="sm" />
            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(review.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Review text */}
        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line mb-4">
          {review.reviewText}
        </p>
      </div>

      {/* Footer metadata or admin status badge */}
      {isAdmin && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-slate-400 dark:text-slate-500">ID #{review.id}</span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-medium capitalize border ${
              statusColors[review.status]
            }`}
          >
            {review.status}
          </span>
        </div>
      )}
    </div>
  );
};
