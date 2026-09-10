import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import {
  getPublicApprovedReviews,
  getFilteredReviews,
  getReviewStats,
  createReview,
  updateReviewStatus,
  editReview,
  deleteReview,
  seedInitialReviewsIfEmpty,
} from './src/db/reviews.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';

dotenv.config();

const PORT = 3000;

// Rate limiting in-memory store for spam prevention
const submissionTimestamps = new Map<string, number>();

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Seed initial sample reviews if database is empty on start
  seedInitialReviewsIfEmpty().catch((err) => {
    console.warn('Initial seeding non-fatal error:', err);
  });

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Public: Get approved reviews and overall review statistics
  app.get('/api/reviews/public', async (req: Request, res: Response) => {
    try {
      const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';
      const [approvedReviews, stats] = await Promise.all([
        getPublicApprovedReviews(sort),
        getReviewStats(),
      ]);

      res.json({
        reviews: approvedReviews,
        stats,
      });
    } catch (error: any) {
      console.error('Error fetching public reviews:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch reviews' });
    }
  });

  // Public: Submit a customer review (starts with status = 'pending')
  app.post('/api/reviews', async (req: Request, res: Response) => {
    try {
      const { customerName, email, rating, reviewText, imageUrl } = req.body;

      // Input Validation
      if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
        return res.status(400).json({ error: 'Please enter a valid customer name (at least 2 characters).' });
      }

      if (!email || typeof email !== 'string' || !validateEmail(email.trim())) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      const numRating = Number(rating);
      if (!numRating || isNaN(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5 stars.' });
      }

      if (!reviewText || typeof reviewText !== 'string' || reviewText.trim().length < 5) {
        return res.status(400).json({ error: 'Review message must be at least 5 characters long.' });
      }

      // Spam Protection: 1 submission per 20 seconds per IP or email
      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
      const spamKey = `${clientIp}_${email.trim().toLowerCase()}`;
      const now = Date.now();
      const lastSubmit = submissionTimestamps.get(spamKey);

      if (lastSubmit && now - lastSubmit < 20000) {
        const waitSec = Math.ceil((20000 - (now - lastSubmit)) / 1000);
        return res.status(429).json({
          error: `Please wait ${waitSec}s before submitting another review to prevent spam.`,
        });
      }
      submissionTimestamps.set(spamKey, now);

      const newReview = await createReview({
        customerName,
        email,
        rating: Math.round(numRating),
        reviewText,
        imageUrl: imageUrl || null,
      });

      res.status(201).json({
        success: true,
        message: 'Your review has been submitted for moderation! It will appear publicly once approved by an administrator.',
        review: newReview,
      });
    } catch (error: any) {
      console.error('Error submitting review:', error);
      res.status(500).json({ error: error.message || 'Failed to submit review' });
    }
  });

  // Admin: Get all reviews (pending, approved, rejected) with search, filter, sort
  app.get('/api/reviews/admin', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const rating = req.query.rating ? parseInt(req.query.rating as string, 10) : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const sort = (req.query.sort as any) || 'newest';

      const [filteredList, stats] = await Promise.all([
        getFilteredReviews({ status, rating, search, sort }),
        getReviewStats(),
      ]);

      res.json({
        reviews: filteredList,
        stats,
      });
    } catch (error: any) {
      console.error('Error fetching admin reviews:', error);
      res.status(500).json({ error: error.message || 'Failed to retrieve admin reviews' });
    }
  });

  // Admin: Update status (approve / reject / pending)
  app.patch('/api/reviews/admin/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { status } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid review ID' });
      }

      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Status must be approved, rejected, or pending' });
      }

      const updated = await updateReviewStatus(id, status);
      if (!updated) {
        return res.status(404).json({ error: 'Review not found' });
      }

      res.json({
        success: true,
        message: `Review #${id} status updated to ${status}`,
        review: updated,
      });
    } catch (error: any) {
      console.error('Error updating review status:', error);
      res.status(500).json({ error: error.message || 'Failed to update review status' });
    }
  });

  // Admin: Edit review content
  app.put('/api/reviews/admin/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { customerName, email, rating, reviewText, status, imageUrl } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid review ID' });
      }

      if (email && !validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      if (rating !== undefined && (rating < 1 || rating > 5)) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      const updated = await editReview(id, {
        customerName,
        email,
        rating: rating !== undefined ? Number(rating) : undefined,
        reviewText,
        status,
        imageUrl,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Review not found' });
      }

      res.json({
        success: true,
        message: `Review #${id} updated successfully`,
        review: updated,
      });
    } catch (error: any) {
      console.error('Error editing review:', error);
      res.status(500).json({ error: error.message || 'Failed to edit review' });
    }
  });

  // Admin: Delete review
  app.delete('/api/reviews/admin/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid review ID' });
      }

      const deleted = await deleteReview(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Review not found' });
      }

      res.json({
        success: true,
        message: `Review #${id} has been permanently deleted`,
      });
    } catch (error: any) {
      console.error('Error deleting review:', error);
      res.status(500).json({ error: error.message || 'Failed to delete review' });
    }
  });

  // Sync user with PostgreSQL users table
  app.post('/api/auth/sync-user', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user || !req.user.uid || !req.user.email) {
        return res.status(400).json({ error: 'Missing user payload' });
      }

      const dbUser = await getOrCreateUser(req.user.uid, req.user.email);
      res.json({ success: true, user: dbUser });
    } catch (error: any) {
      console.error('Error syncing user:', error);
      res.status(500).json({ error: 'Failed to sync user' });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
