import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TransactionsService } from '../../../services/transactions.service';
import { AccountsService } from '../../../services/accounts.service';
import { AuthService } from '../../../services/auth.service';
import { Transaction, Account } from '../../../models';
import { Subscription } from 'rxjs';

interface FilterOptions {
  accountId: string;
  type: string;
  currency: string;
  dateFrom: string;
  dateTo: string;
  amountMin: number | null;
  amountMax: number | null;
}

@Component({
  selector: 'app-history-list',
  standalone: false,
  templateUrl: './history-list.html',
  styleUrl: './history-list.css',
})
export class HistoryList implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  accounts: Account[] = [];
  loading = true; // Start as true to show loading initially
  searchTerm = '';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 25;
  totalItems = 0;
  
  // Filters
  filters: FilterOptions = {
    accountId: '',
    type: '',
    currency: '',
    dateFrom: '',
    dateTo: '',
    amountMin: null,
    amountMax: null
  };
  
  // Available options
  transactionTypes = ['Entrada', 'Salida', 'Swap'];
  currencies = ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'CABLE BROKER'];
  
  // View options
  viewMode: 'table' | 'cards' = 'table';
  sortBy = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  private subscriptions = new Subscription();

  constructor(
    private transactionsService: TransactionsService,
    private accountsService: AccountsService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🎬 HistoryList ngOnInit - Component initialized');
    console.log('🎬 Current URL:', this.router.url);
    
    // Load data immediately
    this.loadAccounts();
    this.loadTransactions();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private setDefaultDateRange(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    this.filters.dateTo = today.toISOString().split('T')[0];
    this.filters.dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
  }

  loadAccounts(): void {
    this.subscriptions.add(
      this.accountsService.getAccounts().subscribe({
        next: (response) => {
          this.accounts = response.accounts;
        },
        error: (error) => {
          console.error('Error loading accounts:', error);
        }
      })
    );
  }

  loadTransactions(): void {
    this.loading = true;
    console.log('Starting transaction load...');
    
    // Build parameters for server-side filtering and pagination
    const params: any = {
      page: this.currentPage,
      limit: this.itemsPerPage
    };
    
    // Add server-side filters
    if (this.filters.accountId) params.accountId = this.filters.accountId;
    if (this.filters.type) params.type = this.filters.type;
    if (this.filters.currency) params.currency = this.filters.currency;
    
    console.log('Request params:', params);
    
    this.subscriptions.add(
      this.transactionsService.getAllTransactions(params).subscribe({
        next: (response) => {
          this.transactions = response.transactions || [];
          this.totalItems = response.pagination?.total || this.transactions.length;
          
          // Simple direct assignment
          this.filteredTransactions = [...this.transactions];
          
          this.loading = false;
          
          // Force change detection
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Error loading transactions:', error);
          this.transactions = [];
          this.filteredTransactions = [];
          this.totalItems = 0;
          this.loading = false;
          this.cdr.detectChanges();
        }
      })
    );
  }

  applyClientSideFilters(): void {
    let filtered = [...this.transactions];

    // Search
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        (t.description?.toLowerCase() || '').includes(searchLower) ||
        (t.currency?.toLowerCase() || '').includes(searchLower) ||
        (t.type?.toLowerCase() || '').includes(searchLower)
      );
    }

    this.filteredTransactions = filtered;
  }

  onSearchChange(): void {
    // Search is always local
    this.applyClientSideFilters();
  }

  onFilterChange(): void {
    // Server-side filters: reload data
    this.currentPage = 1; // Reset to first page
    this.loadTransactions();
  }

  onLocalFilterChange(): void {
    // Local filters: just refilter current data
    let filtered = [...this.transactions];

    // Date range
    if (this.filters.dateFrom) {
      const fromDate = new Date(this.filters.dateFrom);
      filtered = filtered.filter(t => new Date(t.createdAt) >= fromDate);
    }

    if (this.filters.dateTo) {
      const toDate = new Date(this.filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.createdAt) <= toDate);
    }

    // Amount range
    if (this.filters.amountMin !== null && this.filters.amountMin > 0) {
      filtered = filtered.filter(t => Math.abs(t.amount) >= this.filters.amountMin!);
    }

    if (this.filters.amountMax !== null && this.filters.amountMax > 0) {
      filtered = filtered.filter(t => Math.abs(t.amount) <= this.filters.amountMax!);
    }

    this.filteredTransactions = filtered;
    this.totalItems = filtered.length;
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filters.accountId ||
      this.filters.type ||
      this.filters.currency ||
      this.filters.dateFrom ||
      this.filters.dateTo ||
      (this.filters.amountMin !== null && this.filters.amountMin > 0) ||
      (this.filters.amountMax !== null && this.filters.amountMax > 0) ||
      this.searchTerm.trim()
    );
  }

  clearFilters(): void {
    this.filters = {
      accountId: '',
      type: '',
      currency: '',
      dateFrom: '',
      dateTo: '',
      amountMin: null,
      amountMax: null
    };
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadTransactions(); // Reload without filters
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.loadTransactions(); // Reload with new page
    }
  }

  changeItemsPerPage(items: number): void {
    this.itemsPerPage = items;
    this.currentPage = 1;
    this.loadTransactions(); // Reload with new page size
  }

  getTotalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  getPaginatedTransactions(): Transaction[] {
    // Since pagination is handled by the server, just return filtered transactions
    return this.filteredTransactions;
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    const maxVisible = 5;
    
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getEndItemNumber(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  setSortBy(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'desc';
    }
    this.sortTransactions();
  }

  private sortTransactions(): void {
    this.filteredTransactions.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'currency':
          aValue = a.currency;
          bValue = b.currency;
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }

      if (this.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  exportTransactions(): void {
    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private generateCSV(): string {
    const headers = ['Date', 'Account', 'Type', 'Amount', 'Currency', 'Description', 'Created By'];
    const rows = this.filteredTransactions.map(transaction => [
      this.formatDate(transaction.createdAt),
      this.getAccountName(transaction.accountId),
      transaction.type,
      transaction.amount.toString(),
      transaction.currency,
      this.getTransactionDescription(transaction),
      this.getUserName(transaction)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field?.toString().replace(/"/g, '""') || ''}"`).join(','))
      .join('\n');

    return csvContent;
  }

  getAccountName(accountId: string | any): string {
    // Handle both populated and non-populated accountId
    if (typeof accountId === 'object' && accountId?.name) {
      return accountId.name;
    }
    
    const account = this.accounts.find(a => a._id === accountId);
    return account?.name || 'Unknown Account';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  }

  getTransactionIcon(type: string): string {
    switch (type) {
      case 'Entrada':
        return 'fas fa-arrow-down';
      case 'Salida':
        return 'fas fa-arrow-up';
      case 'Swap':
        return 'fas fa-exchange-alt';
      default:
        return 'fas fa-circle';
    }
  }

  getTransactionBgColor(type: string): string {
    switch (type) {
      case 'Entrada':
        return 'bg-green-100';
      case 'Salida':
        return 'bg-red-100';
      case 'Swap':
        return 'bg-blue-100';
      default:
        return 'bg-gray-100';
    }
  }

  getTransactionAmountColor(transaction: Transaction): string {
    switch (transaction.type) {
      case 'Entrada':
        return 'balance-positive';
      case 'Salida':
        return 'balance-negative';
      case 'Swap':
        return 'balance-neutral';
      default:
        return 'balance-neutral';
    }
  }

  getTransactionAmountDisplay(transaction: Transaction): string {
    const prefix = transaction.type === 'Entrada' ? '+' : 
                  transaction.type === 'Salida' ? '-' : '';
    return `${prefix}${this.formatCurrency(transaction.amount)}`;
  }

  getTransactionDescription(transaction: Transaction): string {
    const type = transaction.type;
    switch (type) {
      case 'Entrada':
        return transaction.description || 'Funds added';
      case 'Salida':
        return transaction.description || 'Funds withdrawn';
      case 'Swap':
        return `${transaction.currency} → ${transaction.targetCurrency || 'Unknown'}`;
      default:
        return transaction.description || 'Transaction';
    }
  }

  getUserName(transaction: any): string {
    // Handle populated createdBy field
    if (typeof transaction.createdBy === 'object' && transaction.createdBy?.name) {
      return transaction.createdBy.name;
    }
    return 'System';
  }
}