import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountsService } from '../../../services/accounts.service';
import { TransactionsService } from '../../../services/transactions.service';
import { ExchangeRateService } from '../../../services/exchange-rate.service';
import { SettingsService } from '../../../services/settings.service';
import { Account, Transaction, ExchangeRate, Balance } from '../../../models';
import { CurrencyType } from '../../../models/transaction.model';
import { convertBalancesToTarget, calculateTotalBalance } from '../../../utils/currency-converter';

interface BalanceWithConversion extends Balance {
  convertedAmount?: number;
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
  transactions: Transaction[] = [];
  loading = false;
  error = '';
  
  // Exchange rates
  exchangeRates: ExchangeRate[] = [];
  loadingRates = false;
  preferredCurrency: CurrencyType = 'DÓLAR';
  currencies: CurrencyType[] = ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'CABLE BROKER'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
    private exchangeRateService: ExchangeRateService,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.preferredCurrency = this.settingsService.getPreferredCurrency();
    this.loadExchangeRates();

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

  onPreferredCurrencyChange(): void {
    this.settingsService.setPreferredCurrency(this.preferredCurrency);
  }

  loadAccountData(): void {
    this.loading = true;
    this.error = '';
    console.log('Loading account data for ID:', this.accountId);

    // Cargar información de la cuenta directamente por ID
    this.accountsService.getAccountById(this.accountId).subscribe({
      next: (response: any) => {
        console.log('Account response:', response);
        // Handle both response formats: direct Account or {account: Account}
        const account = response.account || response;
        console.log('Account extracted:', account);
        console.log('Account balances:', account?.balances);
        this.account = account;
        this.cdr.detectChanges(); // Force change detection
        this.loadTransactions();
      },
      error: (error: any) => {
        console.error('Error loading account:', error);
        this.error = 'Cuenta no encontrada';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadTransactions(): void {
    console.log('Loading transactions for account:', this.accountId);
    // Cargar transacciones filtradas por esta cuenta usando el backend
    this.transactionsService.getAllTransactions({
      accountId: this.accountId
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

  formatDate(date: string | Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-ES');
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  trackByBalance(index: number, balance: any): string {
    return balance._id || index.toString();
  }
}
