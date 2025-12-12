import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TransactionsService } from '../../../services/transactions.service';
import { AccountsService } from '../../../services/accounts.service';
import { ExchangeRateService } from '../../../services/exchange-rate.service';
import { AuthService } from '../../../services/auth.service';
import { Transaction, Account, ExchangeRateHistory } from '../../../models';
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
  exchangeRateChanges: ExchangeRateHistory[] = [];
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
  transactionTypes = ['Entrada', 'Salida', 'Compra Divisa', 'Transferencia Interna'];
  currencies = ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'DOLAR B'];
  
  // View options
  viewMode: 'table' | 'cards' = 'table';
  sortBy = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  private subscriptions = new Subscription();

  constructor(
    private transactionsService: TransactionsService,
    private accountsService: AccountsService,
    private exchangeRateService: ExchangeRateService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('🎬 HistoryList ngOnInit - Component initialized');
    console.log('🎬 Current URL:', this.router.url);

    // Load accounts first, then other data
    await this.loadAccountsAsync();
    this.loadTransactions();
    this.loadExchangeRateHistory();
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
          console.log('📋 Accounts loaded:', this.accounts.length, 'accounts');
        },
        error: (error) => {
          console.error('Error loading accounts:', error);
        }
      })
    );
  }

  private async loadAccountsAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.subscriptions.add(
        this.accountsService.getAccounts().subscribe({
          next: (response) => {
            this.accounts = response.accounts;
            console.log('📋 Accounts loaded (async):', this.accounts.length, 'accounts');
            resolve();
          },
          error: (error) => {
            console.error('Error loading accounts:', error);
            resolve(); // Don't reject, just continue without accounts
          }
        })
      );
    });
  }

  loadExchangeRateHistory(): void {
    this.subscriptions.add(
      this.exchangeRateService.getHistory(undefined, 100).subscribe({
        next: (response) => {
          this.exchangeRateChanges = response.history || [];
        },
        error: (error) => {
          console.warn('Could not load exchange rate history:', error.message || error);
          this.exchangeRateChanges = [];
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

  getCombinedHistory(): any[] {
    // Combine transactions and exchange rate changes
    const combined = [
      ...this.filteredTransactions.map(t => ({ type: 'transaction', data: t, date: new Date(t.createdAt) })),
      ...this.exchangeRateChanges.map(c => ({ type: 'exchange-rate-change', data: c, date: new Date(c.timestamp) }))
    ];

    // Sort by date based on sortOrder
    combined.sort((a, b) => {
      const aTime = a.date.getTime();
      const bTime = b.date.getTime();
      if (this.sortOrder === 'asc') {
        return aTime - bTime;
      } else {
        return bTime - aTime;
      }
    });

    return combined;
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
    // Get all unique currencies from transactions
    const currencies = this.getAllUniqueCurrencies();
    
    // Build headers: fixed columns + dynamic currency balance columns
    const headers = [
      'Fecha',
      'ID Trans.',
      'Descripción',
      'Estado',
      'Cuenta origen',
      'Cuenta Destino',
      'Moneda Origen',
      'Monto Origen',
      'Moneda Destino',
      'Monto Destino',
      'Observaciones',
      ...currencies.map(c => `Saldo ${c}`) // Dynamic currency balance columns
    ];

    // Calculate balances for each transaction
    const rows = this.filteredTransactions.map(transaction => {
      const baseRow = [
        this.formatDate(transaction.createdAt), // Fecha
        transaction._id, // ID Trans.
        this.getTransactionDescription(transaction), // Descripción
        'procesado', // Estado
        this.getAccountName(transaction.accountId), // Cuenta origen
        this.getTargetAccountName(transaction), // Cuenta Destino
        transaction.currency, // Moneda Origen
        this.getOriginalAmount(transaction).toString(), // Monto Origen
        this.getTargetCurrency(transaction), // Moneda Destino
        this.getTargetAmount(transaction).toString(), // Monto Destino
        transaction.notes || '' // Observaciones
      ];
      
      // Add balance for each currency after this transaction
      const balances = this.calculateBalancesByCurrencyAfterTransaction(transaction);
      const currencyBalances = currencies.map(currency => {
        const balance = balances[currency];
        return balance !== undefined ? this.formatCurrency(balance) : '—';
      });
      
      return [...baseRow, ...currencyBalances];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field?.toString().replace(/"/g, '""') || ''}"`).join(','))
      .join('\n');

    return csvContent;
  }

  private getAllUniqueCurrencies(): string[] {
    const currenciesSet = new Set<string>();
    
    this.filteredTransactions.forEach(transaction => {
      if (transaction.currency) {
        currenciesSet.add(transaction.currency);
      }
      if (transaction.targetCurrency) {
        currenciesSet.add(transaction.targetCurrency);
      }
    });
    
    return Array.from(currenciesSet).sort();
  }

  private calculateBalancesByCurrencyAfterTransaction(transaction: Transaction): { [currency: string]: number } {
    const accountId = typeof transaction.accountId === 'object' && transaction.accountId
      ? (transaction.accountId as any)._id || transaction.accountId
      : transaction.accountId;

    // Get all transactions for this account up to and including this transaction, sorted chronologically
    const accountTransactions = this.filteredTransactions
      .filter(t => {
        const tAccountId = typeof t.accountId === 'object' && t.accountId
          ? (t.accountId as any)._id || t.accountId
          : t.accountId;
        return tAccountId === accountId;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        if (dateA !== dateB) return dateA - dateB;
        // If same date, use _id for consistent ordering
        return (a._id || '').localeCompare(b._id || '');
      });

    // Initialize balances for all currencies
    const balances: { [currency: string]: number } = {};
    
    // Process transactions up to and including the current one
    for (const t of accountTransactions) {
      switch (t.type) {
        case 'Entrada':
          balances[t.currency] = (balances[t.currency] || 0) + t.amount;
          break;
          
        case 'Salida':
          balances[t.currency] = (balances[t.currency] || 0) - t.amount;
          break;
          
        case 'Compra Divisa':
          // Subtract from origin currency
          balances[t.currency] = (balances[t.currency] || 0) - (t.originalAmount || t.amount);
          
          // Add to target currency
          if (t.targetCurrency) {
            let convertedAmount: number;
            if (t.currency === 'CHEQUE' && t.targetCurrency === 'PESOS') {
              convertedAmount = (t.originalAmount || t.amount) / (t.exchangeRate || 1);
            } else {
              convertedAmount = (t.originalAmount || t.amount) * (t.exchangeRate || 1);
            }
            balances[t.targetCurrency] = (balances[t.targetCurrency] || 0) + convertedAmount;
          }
          break;
          
        case 'Transferencia Interna':
          const targetAccountId = typeof t.targetAccountId === 'object' && t.targetAccountId
            ? (t.targetAccountId as any)._id || t.targetAccountId
            : t.targetAccountId;
          const sourceAccountId = typeof t.accountId === 'object' && t.accountId
            ? (t.accountId as any)._id || t.accountId
            : t.accountId;

          if (targetAccountId === accountId) {
            // This account received the transfer
            balances[t.currency] = (balances[t.currency] || 0) + t.amount;
          } else if (sourceAccountId === accountId) {
            // This account sent the transfer
            balances[t.currency] = (balances[t.currency] || 0) - t.amount;
          }
          break;
      }

      // Stop when we reach the current transaction
      if (t._id === transaction._id) {
        break;
      }
    }

    return balances;
  }

  getAccountName(accountId: string | any): string {
    // Handle both populated and non-populated accountId
    if (typeof accountId === 'object' && accountId?.name) {
      return accountId.name;
    }
    
    const account = this.accounts.find(a => a._id === accountId);
    return account?.name || 'Unknown Account';
  }

  viewAccountDetail(accountId: string | any): void {
    const id = typeof accountId === 'object' && accountId?._id 
      ? accountId._id 
      : accountId;
    if (id) {
      this.router.navigate(['/account', id]);
    }
  }

  getTargetAccountName(transaction: Transaction): string {
    if (transaction.type === 'Transferencia Interna' && transaction.targetAccountId) {
      return this.getAccountName(transaction.targetAccountId);
    }
    return ''; // No aplica para otros tipos de transacción
  }

  getTargetCurrency(transaction: Transaction): string {
    if (transaction.type === 'Compra Divisa' && transaction.targetCurrency) {
      return transaction.targetCurrency;
    }
    return ''; // No aplica para otros tipos de transacción
  }

  getTargetAmount(transaction: Transaction): number {
    if (transaction.type === 'Compra Divisa' && transaction.exchangeRate) {
      // Para swaps, el monto destino es el original amount convertido
      const originalAmount = transaction.originalAmount || transaction.amount;
      return originalAmount * transaction.exchangeRate;
    }
    return 0; // No aplica para otros tipos de transacción
  }

  getOriginalAmount(transaction: Transaction): number {
    // Si hay fee aplicado, devolver el original amount, sino el amount normal
    return transaction.originalAmount || transaction.amount;
  }

  calculateBalanceAfterTransaction(transaction: Transaction): string {
    // Calcular el balance histórico acumulado para esta cuenta
    // Necesitamos procesar todas las transacciones en orden cronológico

    const accountId = typeof transaction.accountId === 'object' && transaction.accountId
      ? (transaction.accountId as any)._id || transaction.accountId
      : transaction.accountId;

    // Filtrar transacciones de esta cuenta y ordenar por fecha
    const accountTransactions = this.filteredTransactions
      .filter(t => {
        const tAccountId = typeof t.accountId === 'object' && t.accountId
          ? (t.accountId as any)._id || t.accountId
          : t.accountId;
        return tAccountId === accountId;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Calcular balance running hasta esta transacción
    let runningBalance = 0;

    for (const t of accountTransactions) {
      switch (t.type) {
        case 'Entrada':
          runningBalance += t.amount;
          break;
        case 'Salida':
          runningBalance -= t.amount;
          break;
        case 'Compra Divisa':
          // Para swaps, el balance final es el amount (que ya incluye la conversión)
          runningBalance = t.amount;
          break;
        case 'Transferencia Interna':
          // Las transferencias pueden afectar el balance dependiendo de si es origen o destino
          const targetAccountId = typeof t.targetAccountId === 'object' && t.targetAccountId
            ? (t.targetAccountId as any)._id || t.targetAccountId
            : t.targetAccountId;
          const sourceAccountId = typeof t.accountId === 'object' && t.accountId
            ? (t.accountId as any)._id || t.accountId
            : t.accountId;

          if (targetAccountId === accountId) {
            // Esta cuenta recibió la transferencia
            runningBalance += t.amount;
          } else if (sourceAccountId === accountId) {
            // Esta cuenta envió la transferencia
            runningBalance -= t.amount;
          }
          break;
      }

      // Si encontramos la transacción actual, devolver el balance hasta este punto
      if (t._id === transaction._id) {
        return runningBalance.toFixed(2);
      }
    }

    return '0.00';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    const displayHours = date.getHours() % 12 || 12;
    return `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`;
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
      case 'Compra Divisa':
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
      case 'Compra Divisa':
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
      case 'Compra Divisa':
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
      case 'Compra Divisa':
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

  getTransactionTypeClass(type: string): string {
    switch (type) {
      case 'Entrada': return 'text-success';
      case 'Salida': return 'text-error';
      case 'Compra Divisa': return 'text-warning';
      case 'Transferencia Interna': return 'text-info';
      default: return '';
    }
  }


  getChangedByName(change: ExchangeRateHistory): string {
    return change.changedBy?.name || 'Sistema';
  }
}