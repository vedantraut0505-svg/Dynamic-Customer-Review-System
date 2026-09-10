import React from 'react';
import { Star, MessageSquarePlus, CheckCircle2 } from 'lucide-react';
import { RatingStars } from './RatingStars.tsx';
import { ReviewStats } from '../types.ts';

interface RatingBreakdownProps {
  stats: ReviewStats;
  selectedRatingFilter: number | null;
  onSelectRatingFilter: (rating: number | null) => void;
  onOpenWriteModal: () => void;
}

export const RatingBreakdown: React.FC<RatingBreakdownProps> = ({
  stats,
  selectedRatingFilter,
  onSelectRatingFilter,
  onOpenWriteModal,
}) => {
  const totalApproved = stats.approved;
  const ratingDistribution = [5, 4, 3, 2, 1] as const;

  // Calculate recommendation rate (4 & 5 stars)
  const positiveCount = (stats.distribution[5] || 0) + (stats.distribution[4] || 0);
  const recommendPercent = totalApproved > 0 ? Math.round((positiveCount / totalApproved) * 100) : 100;

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Overall Score Summary */}
        <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 pb-6 lg:pb-0 lg:pr-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            Verified Customer Feedback
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'}
            </span>
            <span className="text-xl font-medium text-slate-400 dark:text-slate-500">/ 5.0</span>
          </div>

          <div className="mb-3">
            <RatingStars rating={stats.averageRating} size="lg" />
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            Based on <span className="font-semibold text-slate-900 dark:text-slate-100">{totalApproved}</span> approved {totalApproved === 1 ? 'review' : 'reviews'}
          </p>

          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            {recommendPercent}% of customers recommend this business
          </p>

          <button
            onClick={onOpenWriteModal}
            className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Write a Review
          </button>
        </div>

        {/* Center: Rating Distribution Breakdown */}
        <div className="lg:col-span-8 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Rating Distribution
            </h4>
            {selectedRatingFilter !== null && (
              <button
                onClick={() => onSelectRatingFilter(null)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Clear filter ({selectedRatingFilter}★)
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {ratingDistribution.map((star) => {
              const count = stats.distribution[star] || 0;
              const percent = totalApproved > 0 ? (count / totalApproved) * 100 : 0;
              const isSelected = selectedRatingFilter === star;

              return (
                <button
                  key={star}
                  onClick={() => onSelectRatingFilter(isSelected ? null : star)}
                  className={`w-full group flex items-center gap-3 p-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-indigo-500/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-1 w-12 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span>{star}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </div>

                  <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 to-purple-600"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="w-16 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>{count}</span>
                    <span className="text-slate-400 dark:text-slate-500 ml-1">
                      ({percent.toFixed(0)}%)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
