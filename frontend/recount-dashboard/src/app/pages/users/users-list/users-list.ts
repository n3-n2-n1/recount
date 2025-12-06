import { Component, OnInit, OnChanges, ChangeDetectorRef } from '@angular/core';
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

  roleOptions = [
    { value: 'super-admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'reviewer', label: 'Reviewer' },
    { value: 'viewer', label: 'Viewer' }
  ];

  constructor(
    private accountsService: AccountsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
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
        label: 'Account Name',
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
        label: 'Created',
        type: 'date',
        editable: false
      },
      {
        key: 'updatedAt',
        label: 'Updated',
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
    const accountName = prompt('Ingrese el nombre de la cuenta:', '');

    if (!accountName || !accountName.trim()) {
      this.showError('El nombre de la cuenta es requerido');
      return;
    }

    const trimmedName = accountName.trim();

    // Check if account name already exists
    if (this.accounts.some(account => account.name.toLowerCase() === trimmedName.toLowerCase())) {
      this.showError('Ya existe una cuenta con este nombre');
      return;
    }

    const newAccount: CreateAccountRequest = {
      name: trimmedName
    };

    this.loading = true;
    this.clearMessages();

    this.accountsService.createAccount(newAccount).subscribe({
      next: (response) => {
        console.log('Account created:', response);
        // Create new array to force change detection
        this.accounts = [response, ...this.accounts];
        this.filterAccounts(); // Update filtered list
        this.showSuccess('Cuenta creada exitosamente!');
        this.loading = false;
        this.cdr.detectChanges();

        // Additional force update for the table
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 50);
      },
      error: (error) => {
        console.error('Error creating account:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        this.showError('Error al crear la cuenta: ' + errorMessage);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onEditUser(event: { item: Account; index: number }): void {
    const { item: account, index } = event;
    const updateRequest: UpdateAccountRequest = {
      name: account.name
    };

    this.loading = true;
    this.accountsService.updateAccount(account._id, updateRequest).subscribe({
      next: (response) => {
        this.accounts[index] = response;
        this.loading = false;
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
        this.accounts.splice(index, 1);
        this.filterAccounts(); // Update filtered list

        const deletedCount = (result as any)?.deletedTransactions || 0;
        const message = deletedCount > 0
          ? `Account deleted successfully! (${deletedCount} transactions removed)`
          : 'Account deleted successfully!';

        this.showSuccess(message);
        this.cdr.detectChanges();

        // Trigger change detection for stats update
        setTimeout(() => this.cdr.detectChanges(), 100);
      },
      error: (error) => {
        clearTimeout(timeout);
        this.loading = false;
        console.error('Error deleting account:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        this.showError('Error deleting account: ' + errorMessage);
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
}
