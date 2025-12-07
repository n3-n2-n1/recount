import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountsService } from '../../../services/accounts.service';
import { TransactionsService } from '../../../services/transactions.service';
import { ExchangeRateService } from '../../../services/exchange-rate.service';
import { SettingsService } from '../../../services/settings.service';
import { Account, Transaction, ExchangeRate } from '../../../models';
import { CurrencyType } from '../../../models/transaction.model';
import { convertBalancesToTarget, calculateTotalBalance } from '../../../utils/currency-converter';

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
      next: (account: Account) => {
        console.log('Account loaded successfully:', account);
        this.account = account;
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
    if (!this.account?.balances) return 0;
    return this.account.balances.reduce((sum, b) => sum + b.amount, 0);
  }

  getTotalBalanceConverted(): number {
    if (!this.account || !this.exchangeRates.length) return 0;
    
    return calculateTotalBalance(
      this.account.balances,
      this.preferredCurrency,
      this.exchangeRates
    );
  }

  getBalancesWithConversion() {
    if (!this.account || !this.exchangeRates.length) return [];
    
    return convertBalancesToTarget(
      this.account.balances,
      this.preferredCurrency,
      this.exchangeRates
    );
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
}
