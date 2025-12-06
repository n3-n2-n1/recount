import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AccountsService } from '../../../services/accounts.service';
import { TransactionsService } from '../../../services/transactions.service';
import { Account, CreateTransactionRequest, Transaction } from '../../../models';

@Component({
  selector: 'app-movements',
  standalone: false,
  templateUrl: './movements.html',
  styleUrl: './movements.css',
})
export class Movements implements OnInit {
  accounts: Account[] = [];
  loading = false;
  successMessage = '';
  errorMessage = '';
  recentTransactions: Transaction[] = [];

  // Movement form data
  selectedAccountId = '';

  // Separate form data for each movement type
  inflowForm = {
    amount: 0,
    description: '',
    currency: 'DÓLAR'
  };

  outflowForm = {
    amount: 0,
    description: '',
    currency: 'DÓLAR'
  };

  swapForm = {
    amount: 0,
    description: '',
    currency: 'DÓLAR',
    targetCurrency: 'CABLE',
    exchangeRate: 1
  };

  transferForm = {
    amount: 0,
    description: '',
    currency: 'DÓLAR',
    targetAccountId: ''
  };

  currencies = ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'CABLE BROKER'];

  constructor(
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.accountsService.getAccounts().subscribe({
      next: (response) => {
        this.accounts = response.accounts;
        // Auto-select first account if none is selected
        if (this.accounts.length > 0 && !this.selectedAccountId) {
          this.selectedAccountId = this.accounts[0]._id;
        } else if (this.accounts.length > 0) {
          // Verify selected account still exists
          const selectedExists = this.accounts.some(account => account._id === this.selectedAccountId);
          if (!selectedExists) {
            this.selectedAccountId = this.accounts[0]._id;
          }
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading accounts:', error);
        this.accounts = [];
        this.selectedAccountId = '';
        this.cdr.detectChanges();
      }
    });
  }

  onAccountChange(): void {
    // This method is called when account selection changes
    console.log('Account changed to:', this.selectedAccountId);
    const selectedAccount = this.getSelectedAccount();
    console.log('Selected account balances:', selectedAccount?.balances);

    // Load recent transactions for the selected account
    if (this.selectedAccountId) {
      this.loadRecentTransactions();
    } else {
      this.recentTransactions = [];
    }

    // Force UI update
    this.cdr.detectChanges();
  }

  loadRecentTransactions(): void {
    if (!this.selectedAccountId) return;

    this.transactionsService.getTransactionsByAccount(this.selectedAccountId, 5).subscribe({
      next: (response) => {
        this.recentTransactions = response.transactions || [];
        console.log('Recent transactions loaded:', this.recentTransactions);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading recent transactions:', error);
        this.recentTransactions = [];
        this.cdr.detectChanges();
      }
    });
  }

  getSelectedAccount() {
    return this.accounts.find(account => account._id === this.selectedAccountId);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  getTransactionIcon(type: string): string {
    switch (type) {
      case 'Entrada': return 'fa-arrow-down';
      case 'Salida': return 'fa-arrow-up';
      case 'Swap': return 'fa-exchange-alt';
      case 'Transferencia Interna': return 'fa-arrow-right';
      default: return 'fa-circle';
    }
  }

  getTransactionColor(type: string): string {
    switch (type) {
      case 'Entrada': return 'green';
      case 'Salida': return 'red';
      case 'Swap': return 'blue';
      case 'Transferencia Interna': return 'purple';
      default: return 'gray';
    }
  }

  getTransactionDescription(transaction: any): string {
    const type = transaction.type;
    switch (type) {
      case 'Entrada':
        return transaction.description || 'Funds added';
      case 'Salida':
        return transaction.description || 'Funds withdrawn';
      case 'Swap':
        return `${transaction.currency} → ${transaction.targetCurrency || 'Unknown'}`;
      case 'Transferencia Interna':
        return `Transfer to ${(transaction.targetAccountId as any)?.name || 'another account'}`;
      default:
        return transaction.description || 'Transaction';
    }
  }

  getTransactionBgColor(type: string): string {
    switch (type) {
      case 'Entrada': return 'bg-green-100';
      case 'Salida': return 'bg-red-100';
      case 'Swap': return 'bg-blue-100';
      case 'Transferencia Interna': return 'bg-purple-100';
      default: return 'bg-gray-100';
    }
  }

  getTransactionTextColor(type: string): string {
    switch (type) {
      case 'Entrada': return 'text-green-600';
      case 'Salida': return 'text-red-600';
      case 'Swap': return 'text-blue-600';
      case 'Transferencia Interna': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  }

  getTransactionAmountColor(transaction: any): string {
    const type = transaction.type;
    switch (type) {
      case 'Entrada': return 'text-green-600';
      case 'Salida': return 'text-red-600';
      case 'Swap': return 'text-blue-600';
      case 'Transferencia Interna': return 'text-purple-600';
      default: return 'text-gray-900';
    }
  }

  getTransactionAmountDisplay(transaction: any): string {
    const type = transaction.type;
    const amount = transaction.amount;
    const sign = type === 'Entrada' ? '+' : type === 'Salida' ? '-' : '';

    if (type === 'Swap') {
      return this.formatCurrency(amount);
    }

    return `${sign}${this.formatCurrency(Math.abs(amount))}`;
  }

  getUserName(transaction: any): string {
    const createdBy = transaction.createdBy;
    if (createdBy && typeof createdBy === 'object' && createdBy.name) {
      return createdBy.name;
    }
    return 'Unknown User';
  }

  getSortedBalances() {
    const selectedAccount = this.getSelectedAccount();
    if (!selectedAccount?.balances) return [];

    // Sort balances by currency name for consistent display
    return selectedAccount.balances.sort((a, b) => a.currency.localeCompare(b.currency));
  }

  getTotalBalance(): number {
    const selectedAccount = this.getSelectedAccount();
    if (!selectedAccount?.balances) return 0;

    return selectedAccount.balances.reduce((total, balance) => total + balance.amount, 0);
  }

  createInflow(): void {
    if (!this.selectedAccountId || !this.inflowForm.amount || !this.inflowForm.description) {
      this.showError('Please fill all required fields');
      return;
    }

    // Verify selected account still exists
    const selectedAccount = this.accounts.find(acc => acc._id === this.selectedAccountId);
    if (!selectedAccount) {
      this.showError('Selected account no longer exists. Please select a valid account.');
      return;
    }

    const transaction: CreateTransactionRequest = {
      accountId: this.selectedAccountId,
      type: 'Entrada',
      description: this.inflowForm.description,
      currency: this.inflowForm.currency as any,
      amount: this.inflowForm.amount
    };

    this.loading = true;
    this.clearMessages();
    this.ensureLoadingReset(); // Extra safety

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.showError('Request timeout - please try again');
      }
    }, 30000); // 30 seconds timeout

    this.transactionsService.createTransaction(transaction).subscribe({
      next: (result) => {
        clearTimeout(timeout);
        this.loading = false;
        this.showSuccess('Ingreso creado exitosamente!');
        this.resetInflowForm();
        // Refresh accounts to update balances
        this.loadAccounts();
        // Refresh recent transactions
        this.loadRecentTransactions();
        this.cdr.detectChanges();
      },
      error: (error) => {
        clearTimeout(timeout);
        this.loading = false;
        const errorMessage = error?.message || 'Unknown error occurred';
        this.showError('Error creating inflow: ' + errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  createOutflow(): void {
    if (!this.selectedAccountId || !this.outflowForm.amount || !this.outflowForm.description) {
      this.showError('Please fill all required fields');
      return;
    }

    // Verify selected account still exists
    const selectedAccount = this.accounts.find(acc => acc._id === this.selectedAccountId);
    if (!selectedAccount) {
      this.showError('Selected account no longer exists. Please select a valid account.');
      return;
    }

    const transaction: CreateTransactionRequest = {
      accountId: this.selectedAccountId,
      type: 'Salida',
      description: this.outflowForm.description,
      currency: this.outflowForm.currency as any,
      amount: this.outflowForm.amount
    };

    this.loading = true;
    this.clearMessages();
    this.ensureLoadingReset(); // Extra safety

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.showError('Request timeout - please try again');
      }
    }, 30000); // 30 seconds timeout

    this.transactionsService.createTransaction(transaction).subscribe({
      next: (result) => {
        clearTimeout(timeout);
        this.loading = false;
        this.showSuccess('Egreso creado exitosamente!');
        this.resetOutflowForm();
        // Refresh accounts to update balances
        this.loadAccounts();
        // Refresh recent transactions
        this.loadRecentTransactions();
        this.cdr.detectChanges();
      },
      error: (error) => {
        clearTimeout(timeout);
        this.loading = false;
        console.error('Error creating outflow:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        this.showError('Error creating outflow: ' + errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  createSwap(): void {
    if (!this.selectedAccountId || !this.swapForm.amount || !this.swapForm.description) {
      this.showError('Por favor, complete todos los campos requeridos');
      return;
    }

    // Verify selected account still exists
    const selectedAccount = this.accounts.find(acc => acc._id === this.selectedAccountId);
    if (!selectedAccount) {
      this.showError('La cuenta seleccionada ya no existe. Por favor, seleccione una cuenta válida.');
      return;
    }

    if (this.swapForm.currency === this.swapForm.targetCurrency) {
      this.showError('Las monedas de origen y destino deben ser diferentes');
      return;
    }

    const transaction: CreateTransactionRequest = {
      accountId: this.selectedAccountId,
      type: 'Swap',
      description: this.swapForm.description,
      currency: this.swapForm.currency as any,
      amount: this.swapForm.amount,
      targetCurrency: this.swapForm.targetCurrency as any,
      exchangeRate: this.swapForm.exchangeRate
    };

    this.loading = true;
    this.clearMessages();
    this.ensureLoadingReset(); // Extra safety

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.showError('Request timeout - please try again');
      }
    }, 30000); // 30 seconds timeout

    this.transactionsService.createTransaction(transaction).subscribe({
      next: (result) => {
        clearTimeout(timeout);
        this.loading = false;
        this.showSuccess('Intercambio ejecutado exitosamente!');
        this.resetSwapForm();
        // Refresh accounts to update balances
        this.loadAccounts();
        // Refresh recent transactions
        this.loadRecentTransactions();
        this.cdr.detectChanges();
      },
      error: (error) => {
        clearTimeout(timeout);
        this.loading = false;
        console.error('Error creating swap:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        this.showError('Error executing swap: ' + errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  createTransfer(): void {
    if (!this.selectedAccountId || !this.transferForm.amount || !this.transferForm.description || !this.transferForm.targetAccountId) {
      this.showError('Please fill all required fields');
      return;
    }

    // Verify selected account still exists
    const selectedAccount = this.accounts.find(acc => acc._id === this.selectedAccountId);
    if (!selectedAccount) {
      this.showError('Selected account no longer exists. Please select a valid account.');
      return;
    }

    // Verify target account exists
    const targetAccount = this.accounts.find(acc => acc._id === this.transferForm.targetAccountId);
    if (!targetAccount) {
      this.showError('Target account no longer exists. Please select a valid account.');
      return;
    }

    // Verify source and target accounts are different
    if (this.selectedAccountId === this.transferForm.targetAccountId) {
      this.showError('Source and target accounts must be different');
      return;
    }

    const transaction: CreateTransactionRequest = {
      accountId: this.selectedAccountId,
      type: 'Transferencia Interna',
      description: this.transferForm.description,
      currency: this.transferForm.currency as any,
      amount: this.transferForm.amount,
      targetAccountId: this.transferForm.targetAccountId
    };

    this.loading = true;
    this.clearMessages();
    this.ensureLoadingReset(); // Extra safety

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.showError('Request timeout - please try again');
      }
    }, 30000); // 30 seconds timeout

    this.transactionsService.createTransaction(transaction).subscribe({
      next: (result) => {
        clearTimeout(timeout);
        this.loading = false;
        this.showSuccess('Internal transfer executed successfully!');
        this.resetTransferForm();
        // Refresh accounts to update balances
        this.loadAccounts();
        // Refresh recent transactions
        this.loadRecentTransactions();
        this.cdr.detectChanges();
      },
      error: (error) => {
        clearTimeout(timeout);
        this.loading = false;
        console.error('Error creating transfer:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        this.showError('Error executing transfer: ' + errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  resetInflowForm(): void {
    this.inflowForm = {
      amount: 0,
      description: '',
      currency: 'DÓLAR'
    };
  }

  resetOutflowForm(): void {
    this.outflowForm = {
      amount: 0,
      description: '',
      currency: 'DÓLAR'
    };
  }

  resetSwapForm(): void {
    this.swapForm = {
      amount: 0,
      description: '',
      currency: 'DÓLAR',
      targetCurrency: 'CABLE',
      exchangeRate: 1
    };
  }

  resetTransferForm(): void {
    this.transferForm = {
      amount: 0,
      description: '',
      currency: 'DÓLAR',
      targetAccountId: ''
    };
  }

  getSelectedAccountName(): string {
    const account = this.accounts.find(acc => acc._id === this.selectedAccountId);
    return account ? account.name : 'None selected';
  }

  // Validation helpers
  isInflowFormValid(): boolean {
    return !!(this.inflowForm.amount > 0 && this.inflowForm.description.trim());
  }

  isOutflowFormValid(): boolean {
    return !!(this.outflowForm.amount > 0 && this.outflowForm.description.trim());
  }

  isSwapFormValid(): boolean {
    return !!(this.swapForm.amount > 0 &&
              this.swapForm.description.trim() &&
              this.swapForm.currency !== this.swapForm.targetCurrency);
  }

  isTransferFormValid(): boolean {
    return !!(this.transferForm.amount > 0 &&
              this.transferForm.description.trim() &&
              this.transferForm.targetAccountId &&
              this.selectedAccountId !== this.transferForm.targetAccountId);
  }

  getAvailableTargetAccounts(): Account[] {
    return this.accounts.filter(acc => acc._id !== this.selectedAccountId);
  }

  // Safety method to reset loading if something goes wrong
  private ensureLoadingReset(): void {
    setTimeout(() => {
      if (this.loading) {
        console.warn('Loading state was not reset properly, forcing reset');
        this.loading = false;
        this.showError('Operation timed out - please try again');
      }
    }, 35000); // Slightly longer than the timeout in individual methods
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

  goToFullHistory(): void {
    this.router.navigate(['/history']);
  }
}
