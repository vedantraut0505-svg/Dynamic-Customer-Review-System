import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Edit3,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Star,
  ExternalLink,
  ChevronDown,
  User,
  Calendar,
  X,
} from 'lucide-react';
import { RatingStars } from './RatingStars.tsx';
import { ReviewItem, ReviewStats } from '../types.ts';

interface AdminDashboardProps {
  onNotify: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
  authToken?: string | null;
  adminKey?: string | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNotify,
  authToken,
  adminKey,
}) => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    averageRating: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [ratingFilter, setRatingFilter] = useState<number | 0>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Edit Modal State
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [editForm, setEditForm] = useState({
    customerName: '',
    email: '',
    rating: 5,
    reviewText: '',
    status: 'pending' as 'pending' | 'approved' | 'rejected',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (adminKey) {
      headers['x-admin-key'] = adminKey;
    }
    // Set admin mode fallback
    headers['x-admin-mode'] = 'true';
    return headers;
  };

  const fetchAdminReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (ratingFilter > 0) params.set('rating', ratingFilter.toString());
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('sort', sortOption);

      const res = await fetch(`/api/reviews/admin?${params.toString()}`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Failed to load reviews (${res.status})`);
      }

      const data = await res.json();
      setReviews(data.reviews || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching admin reviews:', err);
      onNotify('Admin Data Load Error', err.message || 'Could not fetch reviews.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminReviews();
  }, [statusFilter, ratingFilter, sortOption]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminReviews();
  };

  // Quick Status Action (Approve / Reject)
  const handleUpdateStatus = async (id: number, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/reviews/admin/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update review status');
      }

      onNotify(
        'Review Updated',
        `Review #${id} status changed to "${newStatus}".`,
        newStatus === 'approved' ? 'success' : 'info'
      );

      // Update local state instantly
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      // Re-fetch stats in background
      fetchAdminReviews();
    } catch (err: any) {
      console.error('Update status error:', err);
      onNotify('Action Failed', err.message || 'Could not update review status.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Action
  const handleDelete = async (id: number) => {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/reviews/admin/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete review');
      }

      onNotify('Review Deleted', `Review #${id} has been permanently removed.`, 'info');
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setDeletingId(null);
      fetchAdminReviews();
    } catch (err: any) {
      console.error('Delete error:', err);
      onNotify('Delete Failed', err.message || 'Could not delete review.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Edit Action Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;

    try {
      setEditSubmitting(true);
      const res = await fetch(`/api/reviews/admin/${editingReview.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update review');
      }

      onNotify('Review Saved', `Review #${editingReview.id} updated successfully.`, 'success');
      setEditingReview(null);
      fetchAdminReviews();
    } catch (err: any) {
      console.error('Edit error:', err);
      onNotify('Edit Failed', err.message || 'Could not save review changes.', 'error');
    } finally {
      setEditSubmitting(false);
    }
  };

  const openEditModal = (review: ReviewItem) => {
    setEditingReview(review);
    setEditForm({
      customerName: review.customerName,
      email: review.email,
      rating: review.rating,
      reviewText: review.reviewText,
      status: review.status,
    });
  };

  const formatDate = (dateVal: string | Date) => {
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-8">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Reviews */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Reviews
            </span>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats.total}
            </span>
            <span className="text-xs text-slate-500">all time</span>
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/50 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Pending Approval
            </span>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {stats.pending}
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-300">requires action</span>
          </div>
          {stats.pending > 0 && (
            <div className="absolute top-0 right-0 w-2 h-full bg-amber-400" />
          )}
        </div>

        {/* Approved Reviews */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Approved (Public)
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.approved}
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-300">live on site</span>
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Average Rating
            </span>
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Star className="w-5 h-5 fill-purple-600 text-purple-600 dark:fill-purple-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'}
            </span>
            <span className="text-xs text-slate-500">out of 5.0</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Status Filter Pills, Rating Filter, Sorting */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
            {(
              [
                { key: 'all', label: 'All Reviews', count: stats.total },
                { key: 'pending', label: 'Pending', count: stats.pending },
                { key: 'approved', label: 'Approved', count: stats.approved },
                { key: 'rejected', label: 'Rejected', count: stats.rejected },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === tab.key
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    statusFilter === tab.key
                      ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, email, or review text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-20 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setTimeout(fetchAdminReviews, 0);
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Go
            </button>
          </form>
        </div>

        {/* Secondary filters: Star Rating & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Filter by Rating:</span>
            <div className="flex items-center gap-1">
              {[0, 5, 4, 3, 2, 1].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingFilter(star)}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    ratingFilter === star
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-semibold ring-1 ring-amber-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {star === 0 ? 'All' : `${star}★`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Sort:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>

            <button
              onClick={fetchAdminReviews}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Refresh reviews"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Moderation Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading && reviews.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Filter className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No reviews match the current criteria
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your status or rating filters, or clearing your search term.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reviews.map((review) => {
              const isActionLoading = actionLoadingId === review.id;

              return (
                <div
                  key={review.id}
                  className={`p-5 sm:p-6 transition-colors ${
                    review.status === 'pending'
                      ? 'bg-amber-50/30 dark:bg-amber-950/15'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Customer Info & Review Body */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {review.imageUrl ? (
                          <img
                            src={review.imageUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-300"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center">
                            {review.customerName[0] || 'U'}
                          </div>
                        )}

                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {review.customerName}
                        </span>

                        <span className="text-xs text-slate-400">({review.email})</span>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            review.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                              : review.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-800'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                          }`}
                        >
                          {review.status}
                        </span>

                        <span className="text-xs text-slate-400 ml-auto md:ml-0">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <RatingStars rating={review.rating} size="sm" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {review.rating}.0 / 5.0
                        </span>
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line pt-1">
                        {review.reviewText}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap md:flex-col items-center md:items-end gap-2 shrink-0 pt-2 md:pt-0">
                      <div className="flex items-center gap-1.5">
                        {review.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(review.id, 'approved')}
                            disabled={isActionLoading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                            title="Approve and make visible to public"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        )}

                        {review.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(review.id, 'rejected')}
                            disabled={isActionLoading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer disabled:opacity-50"
                            title="Reject review"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        )}

                        {review.status !== 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(review.id, 'pending')}
                            disabled={isActionLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer disabled:opacity-50"
                            title="Move back to pending moderation"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Pend
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(review)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit review details"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          Edit
                        </button>

                        <button
                          onClick={() => setDeletingId(review.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Review Modal */}
      <AnimatePresence>
        {editingReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Edit Review #{editingReview.id}
                </h3>
                <button
                  onClick={() => setEditingReview(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.customerName}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, customerName: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Rating (1 - 5)
                  </label>
                  <div className="flex items-center gap-3">
                    <RatingStars
                      rating={editForm.rating}
                      interactive={true}
                      onChange={(r) => setEditForm((prev) => ({ ...prev, rating: r }))}
                      size="lg"
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {editForm.rating} Stars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        status: e.target.value as any,
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm capitalize"
                  >
                    <option value="pending">Pending (Awaiting review)</option>
                    <option value="approved">Approved (Publicly visible)</option>
                    <option value="rejected">Rejected (Hidden from public)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Review Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={editForm.reviewText}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, reviewText: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingReview(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50"
                  >
                    {editSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Delete Review #{deletingId}?
              </h4>
              <p className="text-xs text-slate-500">
                This action cannot be undone. The review record will be permanently deleted from the database.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deletingId)}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
