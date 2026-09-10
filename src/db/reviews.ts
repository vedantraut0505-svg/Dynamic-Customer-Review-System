import { desc, asc, eq, and, sql, ilike, or } from 'drizzle-orm';
import { db } from './index.ts';
import { reviews, Review, NewReview } from './schema.ts';

export interface ReviewFilters {
  status?: string;
  rating?: number;
  search?: string;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
}

export interface ReviewStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  averageRating: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// Get approved reviews for public view
export async function getPublicApprovedReviews(sort: string = 'newest'): Promise<Review[]> {
  try {
    let query = db.select().from(reviews).where(eq(reviews.status, 'approved'));
    
    if (sort === 'oldest') {
      return await query.orderBy(asc(reviews.createdAt));
    } else if (sort === 'highest') {
      return await query.orderBy(desc(reviews.rating), desc(reviews.createdAt));
    } else if (sort === 'lowest') {
      return await query.orderBy(asc(reviews.rating), desc(reviews.createdAt));
    } else {
      return await query.orderBy(desc(reviews.createdAt));
    }
  } catch (error) {
    console.error('Failed to get public reviews:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// Admin: Get all reviews with optional filters
export async function getFilteredReviews(filters: ReviewFilters = {}): Promise<Review[]> {
  try {
    const conditions = [];

    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(reviews.status, filters.status));
    }

    if (filters.rating && filters.rating > 0) {
      conditions.push(eq(reviews.rating, filters.rating));
    }

    if (filters.search && filters.search.trim() !== '') {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(reviews.customerName, term),
          ilike(reviews.email, term),
          ilike(reviews.reviewText, term)
        )
      );
    }

    let query = db.select().from(reviews);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    if (filters.sort === 'oldest') {
      return await query.orderBy(asc(reviews.createdAt));
    } else if (filters.sort === 'highest') {
      return await query.orderBy(desc(reviews.rating), desc(reviews.createdAt));
    } else if (filters.sort === 'lowest') {
      return await query.orderBy(asc(reviews.rating), desc(reviews.createdAt));
    } else {
      return await query.orderBy(desc(reviews.createdAt));
    }
  } catch (error) {
    console.error('Failed to get filtered reviews:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// Compute review statistics
export async function getReviewStats(): Promise<ReviewStats> {
  try {
    const all = await db.select().from(reviews);

    let approved = 0;
    let pending = 0;
    let rejected = 0;
    let totalScore = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const r of all) {
      if (r.status === 'approved') {
        approved++;
        totalScore += r.rating;
        if (r.rating >= 1 && r.rating <= 5) {
          distribution[r.rating] = (distribution[r.rating] || 0) + 1;
        }
      } else if (r.status === 'pending') {
        pending++;
      } else if (r.status === 'rejected') {
        rejected++;
      }
    }

    const averageRating = approved > 0 ? Number((totalScore / approved).toFixed(1)) : 0;

    return {
      total: all.length,
      approved,
      pending,
      rejected,
      averageRating,
      distribution: {
        1: distribution[1] || 0,
        2: distribution[2] || 0,
        3: distribution[3] || 0,
        4: distribution[4] || 0,
        5: distribution[5] || 0,
      },
    };
  } catch (error) {
    console.error('Failed to compute review stats:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// Create new customer review (always starts as pending)
export async function createReview(data: {
  customerName: string;
  email: string;
  rating: number;
  reviewText: string;
  imageUrl?: string | null;
}): Promise<Review> {
  try {
    const newRecord: NewReview = {
      customerName: data.customerName.trim(),
      email: data.email.trim().toLowerCase(),
      rating: Math.max(1, Math.min(5, Math.floor(data.rating))),
      reviewText: data.reviewText.trim(),
      imageUrl: data.imageUrl || null,
      status: 'pending',
    };

    const inserted = await db.insert(reviews).values(newRecord).returning();
    return inserted[0];
  } catch (error) {
    console.error('Failed to create review in database:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// Update review status (approve / reject / pending)
export async function updateReviewStatus(id: number, status: 'pending' | 'approved' | 'rejected'): Promise<Review | null> {
  try {
    const updated = await db
      .update(reviews)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, id))
      .returning();

    return updated[0] || null;
  } catch (error) {
    console.error(`Failed to update status for review ${id}:`, error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// Edit review content (Admin feature)
export async function editReview(
  id: number,
  data: {
    customerName?: string;
    email?: string;
    rating?: number;
    reviewText?: string;
    status?: 'pending' | 'approved' | 'rejected';
    imageUrl?: string | null;
  }
): Promise<Review | null> {
  try {
    const updateData: Partial<NewReview> = {
      updatedAt: new Date(),
    };

    if (data.customerName !== undefined) updateData.customerName = data.customerName.trim();
    if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();
    if (data.rating !== undefined) updateData.rating = Math.max(1, Math.min(5, Math.floor(data.rating)));
    if (data.reviewText !== undefined) updateData.reviewText = data.reviewText.trim();
    if (data.status !== undefined) updateData.status = data.status;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

    const updated = await db
      .update(reviews)
      .set(updateData)
      .where(eq(reviews.id, id))
      .returning();

    return updated[0] || null;
  } catch (error) {
    console.error(`Failed to edit review ${id}:`, error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// Delete review
export async function deleteReview(id: number): Promise<boolean> {
  try {
    const result = await db.delete(reviews).where(eq(reviews.id, id)).returning();
    return result.length > 0;
  } catch (error) {
    console.error(`Failed to delete review ${id}:`, error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// Seed initial realistic reviews if the database is currently empty
export async function seedInitialReviewsIfEmpty() {
  try {
    const existing = await db.select({ count: sql<number>`count(*)` }).from(reviews);
    const count = Number(existing[0]?.count || 0);

    if (count === 0) {
      console.log('Seeding initial sample reviews into Cloud SQL...');
      await db.insert(reviews).values([
        {
          customerName: 'Sarah Jenkins',
          email: 'sarah.j@example.com',
          rating: 5,
          reviewText: 'The quality and attention to detail exceeded all our expectations. Customer support answered all my questions within minutes, and onboarding was completely effortless!',
          imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          status: 'approved',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          customerName: 'Michael Chang',
          email: 'm.chang@enterprise.io',
          rating: 5,
          reviewText: 'Hands down the best solution we have deployed this year. The responsive performance and seamless integration cut our operational turnaround time by half.',
          imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          status: 'approved',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          customerName: 'Elena Rostova',
          email: 'elena.rostova@designworks.net',
          rating: 4,
          reviewText: 'Very intuitive workflow and polished modern aesthetic. A few minor configuration settings took a bit of exploration, but overall a top-tier product that delivers on its promises.',
          imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          status: 'approved',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          customerName: 'David K. Miller',
          email: 'david.miller@apexcloud.co',
          rating: 5,
          reviewText: 'Outstanding experience from start to finish! Our team was up and running on day one. Reliable, fast, and beautifully designed.',
          imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
          status: 'pending',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        }
      ]);
      console.log('Sample reviews successfully seeded.');
    }
  } catch (err) {
    console.warn('Initial reviews check or seed encountered:', err);
  }
}
