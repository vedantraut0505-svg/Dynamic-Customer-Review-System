import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  MessageSquarePlus,
  Shield,
  Filter,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { Header } from './components/Header.tsx';
import { RatingBreakdown } from './components/RatingBreakdown.tsx';
import { ReviewCard } from './components/ReviewCard.tsx';
import { ReviewFormModal } from './components/ReviewFormModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { ToastContainer } from './components/Toast.tsx';
import { ReviewItem, ReviewStats, ToastMessage } from './types.ts';
import { auth } from './lib/firebase.ts';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [currentView, setCurrentView] = useState<'customer' | 'admin'>('customer');
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
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null);
  const [customerSort, setCustomerSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [customerSearch, setCustomerSearch] = useState('');

  // Modals & UI States
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(true);

  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setAuthToken(token);
          // Sync user with Cloud SQL
          await fetch('/api/auth/sync-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (err) {
          console.error('Auth token fetch error:', err);
        }
      } else {
        setAuthToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch public approved reviews
  const fetchPublicReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reviews/public?sort=${customerSort}`);
      if (!res.ok) throw new Error('Failed to load reviews');
      const data = await res.json();
      setReviews(data.reviews || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching public reviews:', err);
      addToast('Data Fetch Error', err.message || 'Could not load customer reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicReviews();
  }, [customerSort]);

  // Dark mode class toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Filter public reviews by rating and search
  const filteredCustomerReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchRating = selectedRatingFilter === null || r.rating === selectedRatingFilter;
      const matchSearch =
        customerSearch.trim() === '' ||
        r.customerName.toLowerCase().includes(customerSearch.toLowerCase()) ||
        r.reviewText.toLowerCase().includes(customerSearch.toLowerCase());
      return matchRating && matchSearch;
    });
  }, [reviews, selectedRatingFilter, customerSearch]);

  const handleReviewSuccess = (msg: string) => {
    addToast('Review Submitted', msg, 'success');
    fetchPublicReviews();
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50/60 text-slate-900'} transition-colors duration-200 font-sans`}>
      {/* Header */}
      <Header
        currentView={currentView}
        onChangeView={setCurrentView}
        pendingCount={stats.pending}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        user={user}
        isAdminMode={isAdminMode}
        onToggleAdminMode={() => setIsAdminMode(!isAdminMode)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
        {currentView === 'customer' ? (
          <>
            {/* Customer Hero Section */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-8 sm:p-12 text-white shadow-xl shadow-indigo-500/15">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-white/95">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Verified Authentic Customer Reviews
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  Real Feedback from Real Customers.
                </h1>

                <p className="text-sm sm:text-base text-indigo-100 leading-relaxed max-w-2xl">
                  Transparency and trust are at our core. Every rating and review is submitted by genuine customers, stored in our database, and reviewed to ensure authentic community experiences.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => setIsWriteModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-white text-indigo-700 hover:bg-indigo-50 active:scale-[0.98] shadow-lg shadow-black/10 transition-all cursor-pointer"
                  >
                    <MessageSquarePlus className="w-4 h-4 text-indigo-600" />
                    Write a Review
                  </button>

                  <button
                    onClick={() => setCurrentView('admin')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-white/15 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                    Go to Moderation ({stats.pending} pending)
                  </button>
                </div>
              </div>
            </div>

            {/* Rating Breakdown & Analytics Card */}
            <RatingBreakdown
              stats={stats}
              selectedRatingFilter={selectedRatingFilter}
              onSelectRatingFilter={setSelectedRatingFilter}
              onOpenWriteModal={() => setIsWriteModalOpen(true)}
            />

            {/* Reviews Section: Header & Controls */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                    Customer Reviews
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      {filteredCustomerReviews.length} approved
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Only administrator-approved reviews appear publicly.
                  </p>
                </div>

                {/* Search & Sort Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search reviews..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  {/* Sort dropdown */}
                  <select
                    value={customerSort}
                    onChange={(e) => setCustomerSort(e.target.value as any)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest">Highest Rated</option>
                    <option value="lowest">Lowest Rated</option>
                  </select>

                  <button
                    onClick={fetchPublicReviews}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Refresh reviews"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Star rating quick filter chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 font-medium mr-1">Rating:</span>
                {[
                  { label: 'All Ratings', value: null },
                  { label: '5 Stars ★', value: 5 },
                  { label: '4 Stars ★', value: 4 },
                  { label: '3 Stars ★', value: 3 },
                  { label: '2 Stars ★', value: 2 },
                  { label: '1 Star ★', value: 1 },
                ].map((item) => {
                  const isActive = selectedRatingFilter === item.value;
                  return (
                    <button
                      key={String(item.value)}
                      onClick={() => setSelectedRatingFilter(item.value)}
                      className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Review Cards Grid */}
              {loading && reviews.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-pulse"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-24" />
                          <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-16" />
                        </div>
                      </div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
                    </div>
                  ))}
                </div>
              ) : filteredCustomerReviews.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-xs">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 rounded-full flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
                    <Filter className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      No reviews found matching your criteria
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                      {selectedRatingFilter !== null || customerSearch
                        ? 'Try clearing the search query or rating filter to view all customer reviews.'
                        : 'Be the first to submit a review for our business!'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    {(selectedRatingFilter !== null || customerSearch) && (
                      <button
                        onClick={() => {
                          setSelectedRatingFilter(null);
                          setCustomerSearch('');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    )}
                    <button
                      onClick={() => setIsWriteModalOpen(true)}
                      className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-md hover:from-blue-700 hover:to-purple-700 cursor-pointer"
                    >
                      Write First Review
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCustomerReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Admin Moderation View */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 mb-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Administrator Portal
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Review Moderation & Management
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Approve pending customer reviews, edit contents, reject spam, or manage review records.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('customer')}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  View Public Reviews
                </button>
              </div>
            </div>

            {/* Admin Dashboard Component */}
            <AdminDashboard
              onNotify={addToast}
              authToken={authToken}
              adminKey="admin-secret-preview"
            />
          </div>
        )}
      </main>

      {/* Customer Write Review Modal */}
      <ReviewFormModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onSuccess={handleReviewSuccess}
      />

      {/* Toast Feedback Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
