/**
 * Mock wallet data for the Professional Earnings page
 * This file provides sample data for development and testing
 */

export interface Transaction {
  id: string;
  date: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  amount: number;
  type: 'earning' | 'withdrawal';
  invoiceUrl?: string;
}

export interface MonthlyEarnings {
  month: string;
  year: number;
  earnings: number;
}

export interface WalletData {
  currentBalance: number;
  pending: number;
  totalEarnings: number;
  bankAccountConnected: boolean;
  bankAccountLast4?: string;
  transactions: Transaction[];
  monthlyEarnings: MonthlyEarnings[];
}

// Generate mock transactions
const generateMockTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const descriptions = [
    'Shift at Cutting Edge Salon',
    'Shift at Modern Hair Studio',
    'Shift at Elite Beauty Bar',
    'Withdrawal to Bank',
    'Shift at Downtown Salon',
    'Shift at Luxury Spa & Salon',
    'Shift at Trendy Hair Lounge',
    'Withdrawal to Bank',
    'Shift at Classic Cuts',
    'Shift at Premium Styling',
  ];

  const baseDate = new Date();
  
  for (let i = 0; i < 20; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i * 2);
    
    const isWithdrawal = Math.random() > 0.7;
    const amount = isWithdrawal 
      ? Math.floor(Math.random() * 500) + 100
      : Math.floor(Math.random() * 300) + 50;
    
    const statuses: ('completed' | 'pending' | 'failed')[] = ['completed', 'pending', 'failed'];
    const status = i < 2 ? 'pending' : i === 5 ? 'failed' : 'completed';
    
    transactions.push({
      id: `txn_${i + 1}`,
      date: date.toISOString(),
      description: isWithdrawal ? 'Withdrawal to Bank' : descriptions[i % descriptions.length],
      status,
      amount: isWithdrawal ? -amount : amount,
      type: isWithdrawal ? 'withdrawal' : 'earning',
      invoiceUrl: !isWithdrawal ? `/invoices/txn_${i + 1}.pdf` : undefined,
    });
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Generate mock monthly earnings for the last 6 months
const generateMonthlyEarnings = (): MonthlyEarnings[] => {
  const earnings: MonthlyEarnings[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    
    earnings.push({
      month: months[date.getMonth()],
      year: date.getFullYear(),
      earnings: Math.floor(Math.random() * 2000) + 500,
    });
  }
  
  return earnings;
};

// Calculate totals from transactions
const transactions = generateMockTransactions();
const completedEarnings = transactions
  .filter(t => t.type === 'earning' && t.status === 'completed')
  .reduce((sum, t) => sum + t.amount, 0);
  
const pendingEarnings = transactions
  .filter(t => t.type === 'earning' && t.status === 'pending')
  .reduce((sum, t) => sum + t.amount, 0);
  
const totalWithdrawals = transactions
  .filter(t => t.type === 'withdrawal' && t.status === 'completed')
  .reduce((sum, t) => sum + Math.abs(t.amount), 0);

export const mockWalletData: WalletData = {
  currentBalance: completedEarnings - totalWithdrawals,
  pending: pendingEarnings,
  totalEarnings: completedEarnings + pendingEarnings,
  bankAccountConnected: true,
  bankAccountLast4: '1234',
  transactions,
  monthlyEarnings: generateMonthlyEarnings(),
};

// Export function to get wallet data (for future API integration)
export const getWalletData = async (): Promise<WalletData> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockWalletData;
};

