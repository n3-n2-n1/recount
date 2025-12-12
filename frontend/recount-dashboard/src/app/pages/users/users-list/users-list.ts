import { Component, OnInit, OnChanges, ChangeDetectorRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AccountsService } from '../../../services/accounts.service';
import { AuthService } from '../../../services/auth.service';
import { Account, TableColumn, CreateAccountRequest, UpdateAccountRequest } from '../../../models';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
  show: boolean;
}

@Component({
  selector: 'app-users-list',
  standalone: false,
  templateUrl: './users-list.html',
  styleUrl: './users-list.css',
})
export class UsersList implements OnInit, OnChanges {
  accounts: Account[] = [];
  filteredAccounts: Account[] = [];
  loading = false;
  searchTerm = '';
  columns: TableColumn<Account>[] = [];
  
  // Toast notifications
  toasts: Toast[] = [];
  private toastIdCounter = 0;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 25;
  
  // Sorting
  sortBy: 'name' | 'createdAt' = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  
  // Modal state
  showAddModal = false;
  creatingAccount = false;
  newAccountName = '';
  
  // Delete confirmation modal
  showDeleteModal = false;
  accountToDelete: Account | null = null;
  deletingAccount = false;

  roleOptions = [
    { value: 'super-admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'reviewer', label: 'Reviewer' },
    { value: 'viewer', label: 'Viewer' }
  ];

  constructor(
    private accountsService: AccountsService,
    public authService: AuthService, // Make public for template access
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnChanges(): void {
    this.filterAccounts();
  }

  private setupColumns(): void {
    const canEdit = this.authService.canEdit();
    const currencies = this.getAllUniqueCurrencies();

    // Start with fixed columns
    this.columns = [
      {
        key: 'name',
        label: 'Cuenta',
        type: 'text',
        editable: canEdit,
        required: true,
      }
    ];

    // Add dynamic currency columns
    currencies.forEach(currency => {
      this.columns.push({
        key: 'balances' as any, // Using balances as key but we'll use custom formatter
        label: currency,
        type: 'currency',
        editable: false,
        required: false,
        formatter: (value: any[], item: Account) => {
          return this.formatBalanceForCurrency(item, currency);
        }
      } as TableColumn<Account>);
    });

    // Add date column at the end
    this.columns.push({
      key: 'createdAt',
      label: 'Creado',
      type: 'date',
      editable: false,
    });
  }

  private getAllUniqueCurrencies(): string[] {
    const currenciesSet = new Set<string>();
    
    this.accounts.forEach(account => {
      if (account.balances) {
        account.balances.forEach(balance => {
          if (balance.amount !== 0) {
            currenciesSet.add(balance.currency);
          }
        });
      }
    });
    
    return Array.from(currenciesSet).sort();
  }

  private formatBalanceForCurrency(account: Account, currency: string): string {
    if (!account || !account.balances) {
      return '—';
    }
    
    const balance = account.balances.find(b => b.currency === currency);
    
    if (!balance) {
      return '—';
    }
    
    if (balance.amount === 0) {
      return '—';
    }
    
    return this.formatCurrency(balance.amount);
  }

  loadUsers(): void {
    this.loading = true;
    this.accountsService.getAccounts().subscribe({
      next: (response) => {
        this.accounts = response.accounts;
        this.setupColumns(); // Setup columns after loading accounts to get all currencies
        this.filterAccounts();
        this.loading = false;
        this.cdr.detectChanges(); // Ensure stats are updated
      },
      error: (error) => {
        console.error('Error loading accounts:', error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onAddUser(): void {
    this.openAddModal();
  }

  openAddModal(): void {
    this.newAccountName = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.newAccountName = '';
    this.creatingAccount = false;
  }

  createAccount(): void {
    if (!this.newAccountName || !this.newAccountName.trim()) {
      this.addToast('El nombre de la cuenta es requerido', 'error');
      return;
    }

    const trimmedName = this.newAccountName.trim();

    // Check if account name already exists
    if (this.accounts.some(account => account.name.toLowerCase() === trimmedName.toLowerCase())) {
      this.addToast('Ya existe una cuenta con este nombre', 'error');
      return;
    }

    const newAccount: CreateAccountRequest = {
      name: trimmedName
    };

    this.creatingAccount = true;

    this.accountsService.createAccount(newAccount).subscribe({
      next: (response) => {
        console.log('Account created:', response);
        this.addToast('Cuenta creada exitosamente!', 'success');

        // Add the new account to the list without full reload
        this.accounts.push(response);
        this.setupColumns();
        this.filterAccounts();

        this.creatingAccount = false;
        this.closeAddModal();
      },
      error: (error) => {
        console.error('Error creating account:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        this.addToast('Error al crear la cuenta: ' + errorMessage, 'error');
        this.creatingAccount = false;
        this.cdr.detectChanges();
      }
    });
  }

  isAddFormValid(): boolean {
    return this.newAccountName.trim().length > 0;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showAddModal) {
      this.closeAddModal();
    }
    if (this.showDeleteModal) {
      this.closeDeleteModal();
    }
  }

  onEditUser(event: { item: Account; index: number }): void {
    const { item: account } = event;
    
    // Validate name
    if (!account.name || !account.name.trim()) {
      this.addToast('El nombre de la cuenta es requerido', 'error');
      return;
    }

    const trimmedName = account.name.trim();

    // Check if account name already exists (excluding current account)
    const nameExists = this.accounts.some(acc => 
      acc._id !== account._id && acc.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (nameExists) {
      this.addToast('Ya existe una cuenta con este nombre', 'error');
      return;
    }

    const updateRequest: UpdateAccountRequest = {
      name: trimmedName
    };

    this.accountsService.updateAccount(account._id, updateRequest).subscribe({
      next: (response) => {
        console.log('Account updated:', response);
        this.addToast('Cuenta actualizada exitosamente!', 'success');
        
        // Update account in both accounts and filteredAccounts arrays
        // Create new array references to trigger change detection
        const accountIndex = this.accounts.findIndex(acc => acc._id === account._id);
        if (accountIndex !== -1) {
          this.accounts = [
            ...this.accounts.slice(0, accountIndex),
            { ...response },
            ...this.accounts.slice(accountIndex + 1)
          ];
        }
        
        // Also update in filteredAccounts
        const filteredIndex = this.filteredAccounts.findIndex(acc => acc._id === account._id);
        if (filteredIndex !== -1) {
          this.filteredAccounts = [
            ...this.filteredAccounts.slice(0, filteredIndex),
            { ...response },
            ...this.filteredAccounts.slice(filteredIndex + 1)
          ];
        }
        
        // Re-sort after update
        this.sortAccounts();
        
        // Force change detection after a small delay to ensure editable-table has finished processing
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 0);
      },
      error: (error) => {
        console.error('Error updating account:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        this.addToast('Error al actualizar la cuenta: ' + errorMessage, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  onDeleteUser(event: { item: Account; index: number }): void {
    const { item: account } = event;
    this.accountToDelete = account;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.accountToDelete) return;

    this.deletingAccount = true;
    const accountId = this.accountToDelete._id;
    const accountName = this.accountToDelete.name;

    this.accountsService.deleteAccount(accountId).subscribe({
      next: (result) => {
        this.deletingAccount = false;
        this.closeDeleteModal();

        const deletedCount = (result as any)?.deletedTransactions || 0;
        const message = deletedCount > 0
          ? `Cuenta "${accountName}" eliminada exitosamente! (${deletedCount} transacciones eliminadas)`
          : `Cuenta "${accountName}" eliminada exitosamente!`;

        this.addToast(message, 'success');

        // Remove account from list directly without full reload
        this.accounts = this.accounts.filter(acc => acc._id !== accountId);
        this.setupColumns();
        this.filterAccounts();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.deletingAccount = false;
        console.error('Error deleting account:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        this.addToast('Error al eliminar la cuenta: ' + errorMessage, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.accountToDelete = null;
    this.deletingAccount = false;
  }

  getActiveBalancesCount(): number {
    return this.accounts.reduce((total, account) => {
      return total + (account.balances?.filter(balance => balance.amount > 0).length || 0);
    }, 0);
  }

  getTotalBalance(): number {
    return this.accounts.reduce((sum, account) => {
      return sum + (account.balances?.reduce((accSum, balance) => accSum + (balance.amount > 0 ? balance.amount : 0), 0) || 0);
    }, 0);
  }

  getTotalBalanceFormatted(): string {
    const total = this.getTotalBalance();
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD' }).format(total);
  }

  getTotalBalancesByCurrency(): { [key: string]: number } {
    const totals: { [key: string]: number } = {};
    
    this.accounts.forEach(account => {
      if (account.balances) {
        account.balances.forEach(balance => {
          if (balance.amount !== 0) { // Include negative balances too
            if (!totals[balance.currency]) {
              totals[balance.currency] = 0;
            }
            totals[balance.currency] += balance.amount;
          }
        });
      }
    });
    
    return totals;
  }

  getTotalBalancesFormatted(): string {
    const totals = this.getTotalBalancesByCurrency();
    const currencies = Object.keys(totals).sort();
    
    if (currencies.length === 0) {
      return 'Sin saldos';
    }
    
    return currencies
      .map(currency => `${currency}: ${this.formatCurrency(totals[currency])}`)
      .join(' | ');
  }

  getTotalBalancesCount(): number {
    return Object.keys(this.getTotalBalancesByCurrency()).length;
  }

  getTotalBalancesCurrencies(): string[] {
    return Object.keys(this.getTotalBalancesByCurrency()).sort();
  }

  // Calculate total balance for an account
  getAccountTotalBalance(balances: any[]): number {
    if (!balances || balances.length === 0) return 0;
    return balances.reduce((total, balance) => total + (balance.amount || 0), 0);
  }

  // Format total balance for table
  formatTotalBalance(balances: any[]): string {
    const total = this.getAccountTotalBalance(balances);
    return total === 0 ? '—' : this.formatCurrency(total);
  }

  // Visual renderer for balances
  renderBalancesVisual(balances: any[]): any {
    if (!balances || balances.length === 0) {
      return { display: 'Sin saldos', items: [] };
    }
    
    const activeBalances = balances.filter(balance => balance.amount !== 0);
    
    if (activeBalances.length === 0) {
      return { display: 'Sin saldos', items: [] };
    }
    
    const sortedBalances = activeBalances.sort((a, b) => a.currency.localeCompare(b.currency));
    
    return {
      display: sortedBalances.map(balance => 
        `${balance.currency}: ${this.formatCurrency(balance.amount)}`
      ).join(' | '),
      items: sortedBalances,
      compact: true,
      visualBreakdown: sortedBalances.map(balance => ({
        currency: balance.currency,
        amount: balance.amount,
        formatted: this.formatCurrency(balance.amount),
        isPositive: balance.amount >= 0,
        isZero: balance.amount === 0
      }))
    };
  }

  // Visual renderer for total balance
  renderTotalBalance(balances: any[]): any {
    const total = this.getAccountTotalBalance(balances);
    return {
      display: total === 0 ? '—' : this.formatCurrency(total),
      value: total,
      isPositive: total >= 0,
      isZero: total === 0
    };
  }

  getRecentActivityCount(): number {
    // Placeholder - in a real app, this would come from a service
    // For now, return a calculated value based on accounts
    return this.accounts.length * 3; // Simulated activity count
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterAccounts();
  }

  onSearchChange(): void {
    this.filterAccounts();
    // Additional force update for search
    setTimeout(() => this.cdr.detectChanges(), 10);
  }

  private filterAccounts(): void {
    // Force a new array reference to ensure change detection
    const currentAccounts = [...this.accounts];

    if (!this.searchTerm.trim()) {
      this.filteredAccounts = currentAccounts;
    } else {
      const searchTerm = this.searchTerm.toLowerCase();
      this.filteredAccounts = currentAccounts.filter(account =>
        account.name?.toLowerCase().includes(searchTerm) ||
        account.balances?.some(balance =>
          balance.currency?.toLowerCase().includes(searchTerm) ||
          balance.amount?.toString().includes(searchTerm)
        )
      );
    }

    // Apply sorting
    this.sortAccounts();
    
    // Reset to first page when filtering
    this.currentPage = 1;

    // Ensure change detection picks up the new array
    this.cdr.detectChanges();
  }

  setSortBy(field: 'name' | 'createdAt'): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.sortAccounts();
    this.currentPage = 1; // Reset to first page when sorting
  }

  private sortAccounts(): void {
    this.filteredAccounts.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        default:
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
      }

      if (this.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  // Pagination methods
  getTotalPages(): number {
    return Math.ceil(this.getPaginatedAccounts().length / this.itemsPerPage);
  }

  getPaginatedAccounts(): Account[] {
    return this.filteredAccounts;
  }

  changePage(page: number): void {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
    }
  }

  changeItemsPerPage(items: number): void {
    this.itemsPerPage = items;
    this.currentPage = 1;
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

  getDisplayedAccounts(): Account[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.getPaginatedAccounts().slice(start, end);
  }

  get totalItems(): number {
    return this.filteredAccounts.length;
  }

  private addToast(message: string, type: 'success' | 'error'): void {
    const id = this.toastIdCounter++;
    const toast: Toast = {
      id,
      message,
      type,
      show: false
    };

    this.toasts.push(toast);

    // Trigger animation
    setTimeout(() => {
      const toastIndex = this.toasts.findIndex(t => t.id === id);
      if (toastIndex !== -1) {
        this.toasts[toastIndex].show = true;
        this.cdr.detectChanges();
      }
    }, 10);

    // Auto remove after 4 seconds
    setTimeout(() => {
      this.removeToast(id);
    }, 4000);
  }

  removeToast(id: number): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index !== -1) {
      this.toasts[index].show = false;
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
        this.cdr.detectChanges();
      }, 300);
    }
  }

  formatBalances(balances: any[]): string {
    if (!balances || balances.length === 0) return 'Sin saldos';
    
    // Filter balances with amounts (including negative)
    const activeBalances = balances.filter(balance => balance.amount !== 0);
    
    if (activeBalances.length === 0) return 'Sin saldos';
    
    // Sort by currency name for consistent display
    const sortedBalances = activeBalances.sort((a, b) => a.currency.localeCompare(b.currency));
    
    // Return formatted balances
    return sortedBalances
      .map(balance => `${balance.currency}: ${this.formatCurrency(balance.amount)}`)
      .join(' | ');
  }

  // Enhanced visual formatter for balances in table
  formatBalancesVisual(balances: any[]): any {
    if (!balances || balances.length === 0) {
      return { display: 'Sin saldos', items: [] };
    }
    
    // Filter balances with amounts (including negative)
    const activeBalances = balances.filter(balance => balance.amount !== 0);
    
    if (activeBalances.length === 0) {
      return { display: 'Sin saldos', items: [] };
    }
    
    // Sort by currency name for consistent display
    const sortedBalances = activeBalances.sort((a, b) => a.currency.localeCompare(b.currency));
    
    return {
      display: sortedBalances.map(balance => 
        `${balance.currency}: ${this.formatCurrency(balance.amount)}`
      ).join(' | '),
      items: sortedBalances.map(balance => ({
        currency: balance.currency,
        amount: balance.amount,
        formatted: this.formatCurrency(balance.amount),
        isPositive: balance.amount >= 0
      }))
    };
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Public method for template access
  public formatCurrencyAmount(amount: number): string {
    return this.formatCurrency(amount);
  }

  getSortableCallbacks(): { [key: string]: (field: string) => void } {
    return {
      'name': (field: string) => this.setSortBy('name'),
      'createdAt': (field: string) => this.setSortBy('createdAt')
    };
  }

  viewAccountDetail(accountId: string): void {
    this.router.navigate(['/account', accountId]);
  }
}