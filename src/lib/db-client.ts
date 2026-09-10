import { db, auth } from './firebase.ts';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { ReviewItem, ReviewStats } from '../types.ts';
import { handleFirestoreError, OperationType } from './firestore-utils.ts';

export async function checkIsAdmin(uid: string, email?: string | null): Promise<boolean> {
  if (email === 'vedantraut0505@gmail.com') return true;
  if (!uid) return false;
  try {
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    return adminDoc.exists();
  } catch (err) {
    // If permission denied, they are definitely not an admin
    return false;
  }
}

export async function fetchPublicReviews(sort: string) {
  try {
    let q = query(collection(db, 'reviews'), where('status', '==', 'approved'));
    
    // Sort logic requires composite indexes if sorting by something other than doc id
    // To keep it simple, we fetch all approved and sort client-side, since we are doing client-side search anyway.
    
    const snapshot = await getDocs(q);
    const reviews: ReviewItem[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      reviews.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as ReviewItem);
    });
    
    // Client-side sort
    reviews.sort((a, b) => {
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === 'highest') return b.rating - a.rating;
      if (sort === 'lowest') return a.rating - b.rating;
      // newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    // Calculate stats
    const stats: ReviewStats = {
      total: reviews.length,
      approved: reviews.length,
      pending: 0,
      rejected: 0,
      averageRating: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
    
    let sum = 0;
    reviews.forEach(r => {
      sum += r.rating;
      if (stats.distribution[r.rating as keyof typeof stats.distribution] !== undefined) {
        stats.distribution[r.rating as keyof typeof stats.distribution]++;
      }
    });
    stats.averageRating = reviews.length > 0 ? sum / reviews.length : 0;
    
    return { reviews, stats };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'reviews');
    throw err;
  }
}

export async function fetchAdminReviews(filters: { status?: string, rating?: number, search?: string, sort: string }) {
  try {
    const q = query(collection(db, 'reviews'));
    const snapshot = await getDocs(q);
    const reviews: ReviewItem[] = [];
    
    const stats: ReviewStats = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      averageRating: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
    
    let approvedSum = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const review = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as ReviewItem;
      reviews.push(review);
      
      stats.total++;
      if (review.status === 'approved') {
        stats.approved++;
        approvedSum += review.rating;
        if (stats.distribution[review.rating as keyof typeof stats.distribution] !== undefined) {
          stats.distribution[review.rating as keyof typeof stats.distribution]++;
        }
      } else if (review.status === 'pending') stats.pending++;
      else if (review.status === 'rejected') stats.rejected++;
    });
    
    stats.averageRating = stats.approved > 0 ? approvedSum / stats.approved : 0;
    
    // Filter
    const filtered = reviews.filter(r => {
      if (filters.status && r.status !== filters.status) return false;
      if (filters.rating && r.rating !== filters.rating) return false;
      if (filters.search) {
        const query = filters.search.toLowerCase();
        if (!r.customerName.toLowerCase().includes(query) && !r.reviewText.toLowerCase().includes(query)) return false;
      }
      return true;
    });
    
    // Sort
    filtered.sort((a, b) => {
      if (filters.sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (filters.sort === 'highest') return b.rating - a.rating;
      if (filters.sort === 'lowest') return a.rating - b.rating;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return { reviews: filtered, stats };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'reviews');
    throw err;
  }
}

export async function createReview(data: Partial<ReviewItem>) {
  try {
    const docRef = doc(collection(db, 'reviews'));
    const reviewData: any = {
      customerName: data.customerName,
      email: data.email,
      rating: data.rating,
      reviewText: data.reviewText,
      status: 'pending',
      createdAt: serverTimestamp(),
    };
    if (data.imageUrl) {
      reviewData.imageUrl = data.imageUrl;
    }
    await setDoc(docRef, reviewData);
    return { id: docRef.id, ...reviewData };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'reviews');
    throw err;
  }
}

export async function updateReviewStatus(id: string, status: string) {
  try {
    const docRef = doc(db, 'reviews', id);
    await updateDoc(docRef, { status, updatedAt: serverTimestamp() });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `reviews/${id}`);
    throw err;
  }
}

export async function editReview(id: string, data: Partial<ReviewItem>) {
  try {
    const docRef = doc(db, 'reviews', id);
    const updates = { ...data, updatedAt: serverTimestamp() };
    await updateDoc(docRef, updates);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `reviews/${id}`);
    throw err;
  }
}

export async function deleteReview(id: string) {
  try {
    const docRef = doc(db, 'reviews', id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `reviews/${id}`);
    throw err;
  }
}
