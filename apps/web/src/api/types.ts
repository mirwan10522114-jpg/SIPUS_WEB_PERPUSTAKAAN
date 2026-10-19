export interface PublicUser {
  id: number;
  identifier: string;
  name: string;
  email: string | null;
  role: 'siswa' | 'guru' | 'admin' | 'super_admin';
  classOrPosition: string | null;
  isActive: boolean;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  bookCount?: number;
}

export interface BookCopy {
  id: number;
  bookId: number;
  inventoryCode: string;
  shelfLocation: string | null;
  status: 'available' | 'borrowed' | 'lost' | 'damaged' | 'maintenance';
  createdAt?: string;
}

export interface Book {
  id: number;
  isbn: string | null;
  title: string;
  author: string;
  publisher: string | null;
  publishYear: number | null;
  categoryId: number | null;
  description: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  category?: Category | null;
  availableCopies?: number;
  totalCopies?: number;
  copies?: BookCopy[];
  _count?: { copies: number };
}

export interface LoanUser {
  id: number;
  identifier: string;
  name: string;
  role: string;
  classOrPosition: string | null;
}

export interface Loan {
  id: number;
  userId: number;
  bookCopyId: number;
  loanDate: string;
  dueDate: string;
  returnDate: string | null;
  status: 'borrowed' | 'returned' | 'overdue' | 'lost';
  processedBy?: number | null;
  user?: LoanUser;
  bookCopy?: { id: number; inventoryCode: string; shelfLocation: string | null; book: Book };
  fines?: Fine[];
  lateDays?: number;
  estimatedFine?: number;
  processed?: { id: number; name: string } | null;
}

export interface Fine {
  id: number;
  loanId: number;
  amount: string;
  reason: string;
  status: 'unpaid' | 'paid';
  paidAt: string | null;
  createdAt: string;
  loan?: Loan;
}

export interface Reservation {
  id: number;
  userId: number;
  bookId: number;
  reservationDate: string;
  readyUntil: string | null;
  status: 'waiting' | 'ready' | 'fulfilled' | 'cancelled' | 'expired';
  user?: LoanUser;
  book?: Book;
  queuePosition?: number;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  publishedAt: string;
  isActive: boolean;
  publisher?: { id: number; name: string } | null;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  totalMembers: number;
  activeLoans: number;
  overdueLoans: number;
  unpaidFinesCount: number;
  unpaidFinesTotal: number;
  todayLoans: number;
  todayReturns: number;
  series: Array<{ date: string; count: number }>;
  recentLoans: Loan[];
  top5: Array<{ title: string; author: string; count: number }>;
}

export interface Member {
  id: number;
  identifier: string;
  name: string;
  email: string | null;
  role: 'siswa' | 'guru' | 'admin';
  classOrPosition: string | null;
  isActive: boolean;
  createdAt: string;
  activeLoans: number;
}
