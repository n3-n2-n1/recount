import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountsService } from '../../../services/accounts.service';
import { TransactionsService } from '../../../services/transactions.service';
import { ExchangeRateService } from '../../../services/exchange-rate.service';
import { SettingsService } from '../../../services/settings.service';
import { AuthService } from '../../../services/auth.service';
import { FeeService } from '../../../services/fee.service';
import { Account, Transaction, ExchangeRate, Balance, CreateTransactionRequest, Fee } from '../../../models';
import { CurrencyType } from '../../../models/transaction.model';
import { convertBalancesToTarget, calculateTotalBalance } from '../../../utils/currency-converter';
import { CurrencyLatinPipe } from '../../../utils/currency.pipe';

interface BalanceWithConversion extends Balance {
  convertedAmount?: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
  show: boolean;
}

@Component({
  selector: 'app-account-detail',
  standalone: false,
  templateUrl: './account-detail.html',
  styleUrl: './account-detail.css',
})
export class AccountDetail implements OnInit {
  accountId: string = '';
  account: Account | null = null;
  accounts: Account[] = [];
  transactions: Transaction[] = [];
  loading = false;
  error = '';

  // Exchange rates
  exchangeRates: ExchangeRate[] = [];
  loadingRates = false;
  preferredCurrency: CurrencyType = 'DÓLAR';
  currencies: CurrencyType[] = ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'DOLAR INTERNACIONAL'];

  // Modal states
  showTransactionModal = false;
  showSwapModal = false;
  showTransferModal = false;
  selectedCurrency: CurrencyType | null = null;
  transactionType: 'Entrada' | 'Salida' | null = null;

  // Transaction form
  transactionForm = {
    amount: null as number | null,
    description: '',
    applyFee: false,
    feeType: 'percentage' as 'percentage' | 'fixed',
    feeValue: null as number | null
  };

  // Swap form
  swapForm = {
    amount: null as number | null,
    description: '',
    targetCurrency: 'DÓLAR' as CurrencyType,
    exchangeRate: 1
  };

  // Transfer form
  transferForm = {
    amount: null as number | null,
    description: '',
    targetAccountId: '',
    targetAccount: null as Account | null
  };

  // Loading states
  creatingTransaction = false;

  // Toasts
  toasts: Toast[] = [];
  private toastIdCounter = 0;

  // Main currencies to display as cards
  mainCurrencies: CurrencyType[] = ['CHEQUE', 'PESOS', 'DÓLAR', 'CABLE', 'DOLAR INTERNACIONAL'];

  // Fees
  fees: Fee[] = [];
  loadingFees = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
    private exchangeRateService: ExchangeRateService,
    private settingsService: SettingsService,
    private authService: AuthService,
    private feeService: FeeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.preferredCurrency = this.settingsService.getPreferredCurrency();
    this.loadExchangeRates();
    this.loadFees();

    this.route.params.subscribe(params => {
      this.accountId = params['id'];
      this.loadAccountData();
    });

    // Fallback: asegurar que loading se ponga a false después de 10 segundos máximo
    setTimeout(() => {
      if (this.loading) {
        console.warn('Loading timeout reached, forcing loading to false');
        this.loading = false;
        this.cdr.detectChanges();
      }
    }, 10000);
  }

  loadExchangeRates(): void {
    this.loadingRates = true;
    this.exchangeRateService.getExchangeRates().subscribe({
      next: (response) => {
        console.log('Exchange rates loaded:', response);
        this.exchangeRates = response.rates || [];
        this.loadingRates = false;
      },
      error: (error) => {
        console.warn('Could not load exchange rates:', error.message || error);
        // Continue without rates - user can still view account
        this.exchangeRates = [];
        this.loadingRates = false;
      }
    });
  }

  loadFees(): void {
    this.loadingFees = true;
    this.feeService.getFees().subscribe({
      next: (response) => {
        this.fees = response.fees || [];
        this.loadingFees = false;
      },
      error: (error) => {
        console.warn('Could not load fees:', error.message || error);
        this.fees = [];
        this.loadingFees = false;
      }
    });
  }

  onPreferredCurrencyChange(): void {
    this.settingsService.setPreferredCurrency(this.preferredCurrency);
  }

  loadAccountData(): void {
    this.loading = true;
    this.error = '';
    console.log('Loading account data for ID:', this.accountId);

    // Load all accounts first for transfers
    this.accountsService.getAccounts().subscribe({
      next: (response: any) => {
        this.accounts = response.accounts || [];
        console.log('All accounts loaded:', this.accounts);

        // Then load specific account data
        this.accountsService.getAccountById(this.accountId).subscribe({
          next: (accountResponse: any) => {
            console.log('Account response:', accountResponse);
            const account = accountResponse.account || accountResponse;
            console.log('Account extracted:', account);
            console.log('Account balances:', account?.balances);
            this.account = account;
            this.cdr.detectChanges();
            this.loadTransactions();
          },
          error: (accountError: any) => {
            console.error('Error loading account:', accountError);
            this.error = 'Cuenta no encontrada';
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (accountsError: any) => {
        console.error('Error loading accounts:', accountsError);
        this.error = 'Error al cargar cuentas';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadTransactions(): void {
    console.log('Loading transactions for account:', this.accountId);
    // Cargar transacciones filtradas por esta cuenta incluyendo transferencias internas
    this.transactionsService.getAllTransactions({
      accountId: this.accountId,
      includeInternalTransfers: 'true'
    }).subscribe({
      next: (response: any) => {
        console.log('Transactions loaded successfully:', response);
        this.transactions = (response.transactions || [])
          .sort((a: Transaction, b: Transaction) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Solo cambiar loading a false si la cuenta ya está cargada
        if (this.account) {
          console.log('Setting loading to false');
          this.loading = false;
          this.cdr.detectChanges();
          // Force another change detection after a small delay
          setTimeout(() => {
            this.cdr.detectChanges();
            console.log('Forced change detection after loading');
          }, 100);
        } else {
          console.warn('Account not loaded yet, keeping loading true');
        }
      },
      error: (error: any) => {
        console.error('Error loading transactions:', error);
        this.error = 'Error al cargar las transacciones';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getTotalBalance(): number {
    const balances = this.getAccountBalances();
    if (!balances.length) return 0;
    const total = balances.reduce((sum, b) => sum + b.amount, 0);
    console.log('getTotalBalance calculated:', total, 'from balances:', balances);
    return total;
  }

  getAccountBalances() {
    const balances = this.account?.balances || [];
    return balances;
  }

  getTotalBalanceConverted(): number {
    if (!this.account || !this.exchangeRates.length) return 0;
    
    return calculateTotalBalance(
      this.account.balances,
      this.preferredCurrency,
      this.exchangeRates
    );
  }

  getBalancesWithConversion(): BalanceWithConversion[] {
    if (!this.account || !this.exchangeRates.length) {
      console.log('getBalancesWithConversion: no account or no exchange rates', {
        account: !!this.account,
        exchangeRates: this.exchangeRates.length
      });
      return [];
    }

    const result = convertBalancesToTarget(
      this.account.balances,
      this.preferredCurrency,
      this.exchangeRates
    );

    console.log('getBalancesWithConversion result:', result);
    return result;
  }

  getTransactionTypeClass(type: string): string {
    switch (type) {
      case 'Entrada': return 'text-success';
      case 'Salida': return 'text-error';
      case 'Swap': return 'text-warning';
      case 'Transferencia Interna': return 'text-info';
      default: return '';
    }
  }

  /**
   * Get the transaction sign and display type for this account
   * For internal transfers, show as positive if this account received the transfer
   */
  getTransactionSignAndType(transaction: any): { sign: string, type: string } {
    if (transaction.type === 'Transferencia Interna') {
      // Check if this account is the target (received the transfer)
      const targetAccountId = typeof transaction.targetAccountId === 'object'
        ? transaction.targetAccountId?._id
        : transaction.targetAccountId;

      const isTargetAccount = targetAccountId === this.accountId;

      if (isTargetAccount) {
        // This account received the transfer (Entrada)
        return { sign: '+', type: 'Transferencia Interna (Recibida)' };
      } else {
        // This account sent the transfer (Salida)
        return { sign: '-', type: 'Transferencia Interna (Enviada)' };
      }
    }

    // Regular transactions
    return {
      sign: transaction.type === 'Entrada' ? '+' : '-',
      type: transaction.type
    };
  }

  /**
   * Get the transaction description with account information for internal transfers
   */
  getTransactionDescription(transaction: any): string {
    if (transaction.type === 'Transferencia Interna') {
      // Check if this account is the target (received the transfer)
      const targetAccountId = typeof transaction.targetAccountId === 'object'
        ? transaction.targetAccountId?._id
        : transaction.targetAccountId;

      const isTargetAccount = targetAccountId === this.accountId;

      if (isTargetAccount) {
        // This account received the transfer - show source account
        const sourceAccountName = typeof transaction.accountId === 'object'
          ? transaction.accountId?.name
          : 'Cuenta origen';
        return `Recibido desde: ${sourceAccountName}`;
      } else {
        // This account sent the transfer - show target account
        const targetAccountName = typeof transaction.targetAccountId === 'object'
          ? transaction.targetAccountId?.name
          : 'Cuenta destino';
        return `Enviado a: ${targetAccountName}`;
      }
    }

    return transaction.description || '-';
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-ES');
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  getAvailableTargetAccounts(): Account[] {
    return this.accounts.filter((account: Account) => account._id !== this.accountId);
  }

  onTargetAccountChange(): void {
    const selectedAccount = this.accounts.find((acc: Account) => acc._id === this.transferForm.targetAccountId);
    this.transferForm.targetAccount = selectedAccount || null;
  }

  trackByBalance(index: number, balance: any): string {
    return balance._id || index.toString();
  }

  // Modal functions
  openTransactionModal(currency: CurrencyType, type: 'Entrada' | 'Salida'): void {
    this.selectedCurrency = currency;
    this.transactionType = type;

    // Check if there's a configured fee for this currency/transaction type
    const configuredFee = this.getFeeForTransaction(currency, type);

    this.transactionForm = {
      amount: null,
      description: '',
      applyFee: !!configuredFee,
      feeType: 'percentage' as 'percentage' | 'fixed',
      feeValue: configuredFee ? configuredFee.percentage : null
    };
    this.showTransactionModal = true;
    this.cdr.detectChanges();
  }

  openSwapModal(currency: CurrencyType): void {
    this.selectedCurrency = currency;
    this.swapForm = {
      amount: 0,
      description: '',
      targetCurrency: currency === 'DÓLAR' ? 'CABLE' : 'DÓLAR',
      exchangeRate: 1
    };
    this.showSwapModal = true;
    this.cdr.detectChanges();
  }

  openTransferModal(currency: CurrencyType): void {
    this.selectedCurrency = currency;
    this.transferForm = {
      amount: null,
      description: '',
      targetAccountId: '',
      targetAccount: null
    };
    this.showTransferModal = true;
    this.cdr.detectChanges();
  }

  closeTransactionModal(): void {
    this.showTransactionModal = false;
    this.selectedCurrency = null;
    this.transactionType = null;
    this.transactionForm = {
      amount: null,
      description: '',
      applyFee: false,
      feeType: 'percentage' as 'percentage' | 'fixed',
      feeValue: null
    };
    this.creatingTransaction = false;
  }

  closeSwapModal(): void {
    this.showSwapModal = false;
    this.selectedCurrency = null;
    this.swapForm = {
      amount: null,
      description: '',
      targetCurrency: 'DÓLAR',
      exchangeRate: 1
    };
    this.creatingTransaction = false;
  }

  closeTransferModal(): void {
    this.showTransferModal = false;
    this.selectedCurrency = null;
    this.transferForm = {
      amount: null,
      description: '',
      targetAccountId: '',
      targetAccount: null
    };
    this.creatingTransaction = false;
  }

  // Transaction creation
  createTransaction(): void {
    if (!this.selectedCurrency || !this.transactionType || !this.accountId) {
      this.showError('Datos de transacción inválidos');
      return;
    }

    if (!this.transactionForm.amount || this.transactionForm.amount <= 0) {
      this.showError('El monto debe ser mayor a cero');
      return;
    }

    if (!this.transactionForm.description.trim()) {
      this.showError('La descripción es requerida');
      return;
    }

    if (this.transactionForm.applyFee && (!this.transactionForm.feeValue || this.transactionForm.feeValue <= 0)) {
      this.showError('El valor del fee debe ser mayor a cero');
      return;
    }

    if (this.transactionForm.applyFee && this.transactionForm.feeType === 'percentage' && this.transactionForm.feeValue && this.transactionForm.feeValue > 100) {
      this.showError('El porcentaje del fee no puede ser mayor a 100%');
      return;
    }

    // Calculate final amount if fee is applied
    const originalAmount = this.transactionForm.amount;
    const finalAmount = this.transactionForm.applyFee && this.transactionForm.feeValue != null && this.transactionForm.feeValue > 0
      ? this.calculateFinalAmount(originalAmount!, this.selectedCurrency!, this.transactionType!)
      : originalAmount!;

    const transaction: CreateTransactionRequest = {
      accountId: this.accountId,
      type: this.transactionType,
      description: this.transactionForm.description.trim(),
      currency: this.selectedCurrency,
      amount: finalAmount, // This is the final amount after fee
      applyFee: this.transactionForm.applyFee,
      feeType: this.transactionForm.feeType as 'percentage' | 'fixed',
      feeValue: this.transactionForm.feeValue,
      originalAmount: this.transactionForm.applyFee && this.transactionForm.feeValue != null && this.transactionForm.feeValue > 0 ? originalAmount : undefined
    };

    this.creatingTransaction = true;
    this.clearMessages();

    // Safety timeout
    const timeout = setTimeout(() => {
      if (this.creatingTransaction) {
        this.creatingTransaction = false;
        this.showError('Request timeout - please try again');
      }
    }, 30000);

    this.transactionsService.createTransaction(transaction).subscribe({
      next: (result) => {
        clearTimeout(timeout);
        this.creatingTransaction = false;
        const action = this.transactionType === 'Entrada' ? 'Ingreso' : 'Egreso';
        this.showSuccess(`${action} creado exitosamente!`);
        this.closeTransactionModal();
        // Refresh account data and transactions
        this.loadAccountData();
        this.cdr.detectChanges();
      },
      error: (error) => {
        clearTimeout(timeout);
        this.creatingTransaction = false;
        const errorMessage = error?.message || 'Unknown error occurred';
        this.showError('Error creando transacción: ' + errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  // Swap creation
  createSwap(): void {
    if (!this.selectedCurrency || !this.swapForm.amount || this.swapForm.amount <= 0 || !this.swapForm.description) {
      this.showError('Por favor, complete todos los campos requeridos');
      return;
    }

    if (this.selectedCurrency === this.swapForm.targetCurrency) {
      this.showError('Las monedas de origen y destino deben ser diferentes');
      return;
    }

    if (!this.accountId) {
      this.showError('Cuenta no encontrada');
      return;
    }

    const transaction: CreateTransactionRequest = {
      accountId: this.accountId,
      type: 'Swap',
      description: this.swapForm.description.trim(),
      currency: this.selectedCurrency,
      amount: this.swapForm.amount,
      targetCurrency: this.swapForm.targetCurrency,
      exchangeRate: this.swapForm.exchangeRate
    };

    this.creatingTransaction = true;
    this.clearMessages();

    const timeout = setTimeout(() => {
      if (this.creatingTransaction) {
        this.creatingTransaction = false;
        this.showError('Request timeout - please try again');
      }
    }, 30000);

    this.transactionsService.createTransaction(transaction).subscribe({
      next: (result) => {
        clearTimeout(timeout);
        this.creatingTransaction = false;
        this.showSuccess('Intercambio ejecutado exitosamente!');
        this.closeSwapModal();
        this.loadAccountData();
        this.cdr.detectChanges();
      },
      error: (error) => {
        clearTimeout(timeout);
        this.creatingTransaction = false;
        const errorMessage = error?.message || 'Unknown error occurred';
        this.showError('Error executing swap: ' + errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  // Transfer creation
  createTransfer(): void {
    if (!this.selectedCurrency || !this.transferForm.amount || this.transferForm.amount <= 0 || !this.transferForm.description || !this.transferForm.targetAccountId) {
      this.showError('Por favor, complete todos los campos requeridos');
      return;
    }

    if (!this.accountId) {
      this.showError('Cuenta no encontrada');
      return;
    }

    if (this.accountId === this.transferForm.targetAccountId) {
      this.showError('La cuenta origen y destino deben ser diferentes');
      return;
    }

    const transaction: CreateTransactionRequest = {
      accountId: this.accountId,
      type: 'Transferencia Interna',
      description: this.transferForm.description.trim(),
      currency: this.selectedCurrency,
      amount: this.transferForm.amount,
      targetAccountId: this.transferForm.targetAccountId
    };

    this.creatingTransaction = true;
    this.clearMessages();

    const timeout = setTimeout(() => {
      if (this.creatingTransaction) {
        this.creatingTransaction = false;
        this.showError('Request timeout - please try again');
      }
    }, 30000);

    this.transactionsService.createTransaction(transaction).subscribe({
      next: (result) => {
        clearTimeout(timeout);
        this.creatingTransaction = false;
        this.showSuccess('Transferencia ejecutada exitosamente!');
        this.closeTransferModal();
        this.loadAccountData();
        this.cdr.detectChanges();
      },
      error: (error) => {
        clearTimeout(timeout);
        this.creatingTransaction = false;
        const errorMessage = error?.message || 'Unknown error occurred';
        this.showError('Error executing transfer: ' + errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  // Helper functions
  getBalanceForCurrency(currency: CurrencyType): number {
    if (!this.account?.balances) return 0;
    const balance = this.account.balances.find(b => b.currency === currency);
    return balance?.amount || 0;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatCurrencyLatin(amount: number): string {
    if (amount == null) return '';
    // Formato latinoamericano: puntos para miles, coma para decimales
    return amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  getCurrencyIcon(currency: CurrencyType): string {
    switch (currency) {
      case 'CHEQUE': return 'fas fa-money-check';
      case 'PESOS': return 'fas fa-coins';
      case 'DÓLAR': return 'fas fa-dollar-sign';
      case 'CABLE': return 'fas fa-exchange-alt';
      case 'DOLAR INTERNACIONAL': return 'fas fa-handshake';
      default: return 'fas fa-wallet';
    }
  }

  getCurrencyColor(currency: CurrencyType): string {
    switch (currency) {
      case 'CHEQUE': return 'text-blue-600';
      case 'PESOS': return 'text-green-600';
      case 'DÓLAR': return 'text-yellow-600';
      case 'CABLE': return 'text-purple-600';
      case 'DOLAR INTERNACIONAL': return 'text-indigo-600';
      default: return 'text-gray-600';
    }
  }

  // Fee functions
  getFeeForTransaction(currency: CurrencyType, transactionType: string): Fee | null {
    return this.fees.find(fee =>
      fee.currency === currency &&
      fee.transactionType === transactionType &&
      fee.isActive
    ) || null;
  }

  calculateFinalAmount(amount: number, currency: CurrencyType, transactionType: string): number {
    if (!this.transactionForm.applyFee || !this.transactionForm.feeValue || this.transactionForm.feeValue <= 0) {
      return amount;
    }

    let feeAmount = 0;
    if (this.transactionForm.feeType === 'percentage') {
      feeAmount = (amount * this.transactionForm.feeValue) / 100;
    } else {
      feeAmount = this.transactionForm.feeValue;
    }

    return transactionType === 'Entrada' ? amount - feeAmount : amount + feeAmount;
  }

  calculateFeeAmount(amount: number): number {
    if (!this.transactionForm.applyFee || !this.transactionForm.feeValue || this.transactionForm.feeValue <= 0) {
      return 0;
    }

    if (this.transactionForm.feeType === 'percentage') {
      return (amount * this.transactionForm.feeValue) / 100;
    } else {
      return this.transactionForm.feeValue;
    }
  }

  calculateOriginalAmount(transaction: any): number {
    const fee = this.getFeeForTransaction(transaction.currency, transaction.type);
    if (!fee || fee.percentage <= 0) {
      return transaction.amount;
    }

    // Para "deshacer" el fee aplicado:
    // Si fue entrada: final_amount = original - fee_amount => original = final_amount / (1 - fee_percentage/100)
    // Si fue salida: final_amount = original + fee_amount => original = final_amount / (1 + fee_percentage/100)

    if (transaction.type === 'Entrada') {
      return transaction.amount / (1 - fee.percentage / 100);
    } else {
      return transaction.amount / (1 + fee.percentage / 100);
    }
  }

  calculateFeeAmountFromTransaction(transaction: any): number {
    if (!transaction.feeApplied || !transaction.feeValue || !transaction.originalAmount) {
      return 0;
    }

    if (transaction.feeType === 'percentage') {
      return (transaction.originalAmount * transaction.feeValue) / 100;
    } else {
      return transaction.feeValue;
    }
  }

  getFeeDescription(currency: CurrencyType, transactionType: 'Entrada' | 'Salida'): string {
    const fee = this.getFeeForTransaction(currency, transactionType);
    if (!fee || fee.percentage <= 0) {
      return '';
    }

    return `${fee.percentage}% fee aplicado`;
  }

  // Toast functions
  private showSuccess(message: string): void {
    this.addToast(message, 'success');
  }

  private showError(message: string): void {
    this.addToast(message, 'error');
  }

  private clearMessages(): void {
    // Keep for compatibility
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
}
