export interface ReviewItem {
  id: number;
  customerName: string;
  email: string;
  rating: number;
  reviewText: string;
  imageUrl?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string | Date;
  updatedAt: string | Date;
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

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
