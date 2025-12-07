import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountsService } from '../../../services/accounts.service';
import { TransactionsService } from '../../../services/transactions.service';
import { Account, Transaction } from '../../../models';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountsService: AccountsService,
    private transactionsService: TransactionsService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accountId = params['id'];
      this.loadAccountData();
    });
  }

  loadAccountData(): void {
    this.loading = true;
    this.error = '';

    // Cargar información de la cuenta directamente por ID
    this.accountsService.getAccountById(this.accountId).subscribe({
      next: (account: Account) => {
        this.account = account;
        this.loadTransactions();
      },
      error: (error: any) => {
        console.error('Error loading account:', error);
        this.error = 'Cuenta no encontrada';
        this.loading = false;
      }
    });
  }

  loadTransactions(): void {
    // Cargar transacciones filtradas por esta cuenta usando el backend
    this.transactionsService.getAllTransactions({
      accountId: this.accountId
    }).subscribe({
      next: (response: any) => {
        this.transactions = (response.transactions || [])
          .sort((a: Transaction, b: Transaction) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading transactions:', error);
        this.error = 'Error al cargar las transacciones';
        this.loading = false;
      }
    });
  }

  getTotalBalance(): number {
    if (!this.account?.balances) return 0;
    return this.account.balances.reduce((sum, b) => sum + b.amount, 0);
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
    this.router.navigate(['/accounts']);
  }
}
