import { Component, OnInit, OnChanges, ChangeDetectorRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AccountsService } from '../../../services/accounts.service';
import { AuthService } from '../../../services/auth.service';
import { Account, TableColumn, CreateAccountRequest, UpdateAccountRequest } from '../../../models';

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
  successMessage = '';
  errorMessage = '';
  columns: TableColumn<Account>[] = [];
  
  // Modal state
  showAddModal = false;
  creatingAccount = false;
  newAccountName = '';

  roleOptions = [
    { value: 'super-admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'reviewer', label: 'Reviewer' },
    { value: 'viewer', label: 'Viewer' }
  ];

  constructor(
    private accountsService: AccountsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.setupColumns();
    this.loadUsers();
  }

  ngOnChanges(): void {
    this.filterAccounts();
  }

  private setupColumns(): void {
    const canEdit = this.authService.canEdit();

    this.columns = [
      {
        key: 'name',
        label: 'Nombre',
        type: 'text',
        editable: canEdit,
        required: true
      },
      {
        key: 'balances',
        label: 'Balances',
        type: 'text',
        editable: false,
        required: false,
        formatter: (value: any[]) => this.formatBalances(value)
      },
      {
        key: 'createdAt',
        label: 'Creado',
        type: 'date',
        editable: false
      },
      {
        key: 'updatedAt',
        label: 'Actualizado',
        type: 'date',
        editable: false
      }
    ];
  }

  loadUsers(): void {
    this.loading = true;
    this.accountsService.getAccounts().subscribe({
      next: (response) => {
        this.accounts = response.accounts;
        this.filterAccounts();
        this.loading = false;
        this.cdr.detectChanges();
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
    this.clearMessages();
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.newAccountName = '';
    this.creatingAccount = false;
  }

  createAccount(): void {
    if (!this.newAccountName || !this.newAccountName.trim()) {
      this.showError('El nombre de la cuenta es requerido');
      return;
    }

    const trimmedName = this.newAccountName.trim();

    // Check if account name already exists
    if (this.accounts.some(account => account.name.toLowerCase() === trimmedName.toLowerCase())) {
      this.showError('Ya existe una cuenta con este nombre');
      return;
    }

    const newAccount: CreateAccountRequest = {
      name: trimmedName
    };

    this.creatingAccount = true;
    this.clearMessages();

    this.accountsService.createAccount(newAccount).subscribe({
      next: (response) => {
        console.log('Account created:', response);
        this.showSuccess('Cuenta creada exitosamente!');

        // Reload the complete accounts list to ensure all data is properly loaded
        this.loadUsers();

        this.creatingAccount = false;
        this.closeAddModal();
      },
      error: (error) => {
        console.error('Error creating account:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        this.showError('Error al crear la cuenta: ' + errorMessage);
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
  }

  onEditUser(event: { item: Account; index: number }): void {
    const { item: account, index } = event;
    const updateRequest: UpdateAccountRequest = {
      name: account.name
    };

    this.loading = true;
    this.accountsService.updateAccount(account._id, updateRequest).subscribe({
      next: (response) => {
        console.log('Account updated:', response);
        // Reload the complete accounts list to ensure all data is properly updated
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error updating account:', error);
        this.loading = false;
      }
    });
  }

  onDeleteUser(event: { item: Account; index: number }): void {
    const { item: account, index } = event;

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete the account "${account.name}"? This action cannot be undone.`)) {
      return;
    }

    this.loading = true;
    this.clearMessages();

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.showError('Request timeout - please try again');
        this.cdr.detectChanges();
      }
    }, 30000); // 30 seconds timeout

    this.accountsService.deleteAccount(account._id).subscribe({
      next: (result) => {
        clearTimeout(timeout);
        this.loading = false;

        const deletedCount = (result as any)?.deletedTransactions || 0;
        const message = deletedCount > 0
          ? `Cuenta eliminada exitosamente! (${deletedCount} transacciones eliminadas)`
          : 'Cuenta eliminada exitosamente!';

        this.showSuccess(message);

        // Reload the complete accounts list to ensure all data is properly updated
        this.loadUsers();
      },
      error: (error) => {
        clearTimeout(timeout);
        this.loading = false;
        console.error('Error deleting account:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        this.showError('Error al eliminar la cuenta: ' + errorMessage);
        this.cdr.detectChanges();
      }
    });
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total);
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

    // Ensure change detection picks up the new array
    this.cdr.detectChanges();
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => {
      this.successMessage = '';
    }, 5000);
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  formatBalances(balances: any[]): string {
    if (!balances || balances.length === 0) return 'No balances';
    return balances
      .filter(balance => balance.amount > 0)
      .map(balance => `${balance.currency}: ${balance.amount}`)
      .join(', ');
  }

  viewAccountDetail(accountId: string): void {
    this.router.navigate(['/account', accountId]);
  }
}
