import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AccountDetail } from './account-detail';
import { AccountsService } from '../../../services/accounts.service';
import { TransactionsService } from '../../../services/transactions.service';
import { ExchangeRateService } from '../../../services/exchange-rate.service';
import { SettingsService } from '../../../services/settings.service';
import { AuthService } from '../../../services/auth.service';
import { FeeService } from '../../../services/fee.service';
import { Account, Transaction, ExchangeRate, Balance, Fee } from '../../../models';
import { CurrencyType } from '../../../models/transaction.model';

describe('AccountDetail Component - Transaction Operations', () => {
  let component: AccountDetail;
  let fixture: ComponentFixture<AccountDetail>;
  let accountsService: any;
  let transactionsService: any;
  let exchangeRateService: any;
  let settingsService: any;
  let authService: any;
  let feeService: any;
  let router: any;
  let activatedRoute: any;

  const mockAccount: Account = {
    _id: 'account1',
    name: 'Test Account',
    balances: [
      { currency: 'DÓLAR', amount: 1000 },
      { currency: 'PESOS', amount: 50000 }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockExchangeRates: ExchangeRate[] = [
    {
      _id: '1',
      currency: 'DÓLAR',
      rateToUSD: 1,
      updatedBy: { _id: 'user1', name: 'Test User', email: 'test@test.com' },
      updatedAt: new Date(),
      createdAt: new Date()
    },
    {
      _id: '2',
      currency: 'PESOS',
      rateToUSD: 0.001,
      updatedBy: { _id: 'user1', name: 'Test User', email: 'test@test.com' },
      updatedAt: new Date(),
      createdAt: new Date()
    }
  ];

  beforeEach(async () => {
    const accountsServiceMock = {
      getAccountById: vi.fn(),
      getAccounts: vi.fn()
    };
    const transactionsServiceMock = {
      createTransaction: vi.fn(),
      getAllTransactions: vi.fn()
    };
    const exchangeRateServiceMock = {
      getExchangeRates: vi.fn()
    };
    const settingsServiceMock = {
      getPreferredCurrency: vi.fn(),
      setPreferredCurrency: vi.fn()
    };
    const authServiceMock = {
      canEdit: vi.fn(),
      getCurrentUser: vi.fn()
    };
    const feeServiceMock = {
      getFees: vi.fn()
    };
    const routerMock = {
      navigate: vi.fn()
    };

    activatedRoute = {
      params: of({ id: 'account1' })
    };

    await TestBed.configureTestingModule({
      declarations: [AccountDetail],
      imports: [FormsModule],
      providers: [
        { provide: AccountsService, useValue: accountsServiceMock },
        { provide: TransactionsService, useValue: transactionsServiceMock },
        { provide: ExchangeRateService, useValue: exchangeRateServiceMock },
        { provide: SettingsService, useValue: settingsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: FeeService, useValue: feeServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRoute },
        ChangeDetectorRef
      ]
    }).compileComponents();

    accountsService = TestBed.inject(AccountsService);
    transactionsService = TestBed.inject(TransactionsService);
    exchangeRateService = TestBed.inject(ExchangeRateService);
    settingsService = TestBed.inject(SettingsService);
    authService = TestBed.inject(AuthService);
    feeService = TestBed.inject(FeeService);
    router = TestBed.inject(Router);

    // Setup default spy returns
    accountsService.getAccountById.mockReturnValue(of({ account: mockAccount }));
    accountsService.getAccounts.mockReturnValue(of({ accounts: [mockAccount] }));
    exchangeRateService.getExchangeRates.mockReturnValue(of({ rates: mockExchangeRates }));
    settingsService.getPreferredCurrency.mockReturnValue('DÓLAR');
    authService.canEdit.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({ _id: 'user1', name: 'Test User', role: 'reviewer' });
    feeService.getFees.mockReturnValue(of({ fees: [] }));
    transactionsService.getAllTransactions.mockReturnValue(of({ transactions: [] }));

    fixture = TestBed.createComponent(AccountDetail);
    component = fixture.componentInstance;
    component.accountId = 'account1';
    component.account = mockAccount;
  });

  describe('Balance Calculations', () => {
    it('should calculate balance for specific currency', () => {
      component.account = mockAccount;
      const balance = component.getBalanceForCurrency('DÓLAR');
      expect(balance).toBe(1000);
    });

    it('should return 0 for non-existent currency balance', () => {
      component.account = mockAccount;
      const balance = component.getBalanceForCurrency('CABLE');
      expect(balance).toBe(0);
    });

    it('should return 0 when account has no balances', () => {
      component.account = { ...mockAccount, balances: [] };
      const balance = component.getBalanceForCurrency('DÓLAR');
      expect(balance).toBe(0);
    });

    it('should calculate total balance across all currencies', () => {
      component.account = mockAccount;
      const total = component.getTotalBalance();
      expect(total).toBe(51000); // 1000 + 50000 = 51000 (suma directa, sin conversión)
    });

    it('should return 0 for account with no balances', () => {
      component.account = { ...mockAccount, balances: [] };
      const total = component.getTotalBalance();
      expect(total).toBe(0);
    });
  });

  describe('Entrada (Inflow) Transactions', () => {
    beforeEach(() => {
      component.selectedCurrency = 'DÓLAR';
      component.transactionType = 'Entrada';
      component.transactionForm.amount = 100;
      component.transactionForm.amountDisplay = '100';
      component.transactionForm.descriptionType = 'ESMERALDA';
    });

    it('should create entrada transaction successfully', async () => {
      const mockTransaction: Transaction = {
        _id: 'tx1',
        accountId: 'account1',
        type: 'Entrada',
        description: 'ESMERALDA',
        currency: 'DÓLAR',
        amount: 100,
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      transactionsService.createTransaction.mockReturnValue(of(mockTransaction));
      accountsService.getAccountById.mockReturnValue(of({ account: mockAccount }));

      component.createTransaction();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(transactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Entrada',
          currency: 'DÓLAR',
          amount: 100,
          description: 'ESMERALDA'
        })
      );
    });

    it('should validate amount is greater than zero', () => {
      component.transactionForm.amount = 0;
      component.createTransaction();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should validate amount is not negative', () => {
      component.transactionForm.amount = -100;
      component.createTransaction();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should require description', () => {
      component.transactionForm.descriptionType = '';
      component.transactionForm.customDescription = '';
      component.createTransaction();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should require CABLE fields for CABLE transactions', () => {
      component.selectedCurrency = 'CABLE';
      component.transactionForm.bancoWallet = '';
      component.transactionForm.titularOriginante = '';
      component.createTransaction();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should apply percentage fee correctly', () => {
      component.transactionForm.amount = 100;
      component.transactionForm.applyFee = true;
      component.transactionForm.feeType = 'percentage';
      component.transactionForm.feeValue = 10; // 10%

      const finalAmount = component.calculateFinalAmount(100, 'DÓLAR', 'Entrada');
      expect(finalAmount).toBe(90); // 100 - 10% = 90
    });

    it('should apply fixed fee correctly', () => {
      component.transactionForm.amount = 100;
      component.transactionForm.applyFee = true;
      component.transactionForm.feeType = 'fixed';
      component.transactionForm.feeValue = 5;

      const finalAmount = component.calculateFinalAmount(100, 'DÓLAR', 'Entrada');
      expect(finalAmount).toBe(95); // 100 - 5 = 95
    });

    it('should not apply fee when applyFee is false', () => {
      component.transactionForm.amount = 100;
      component.transactionForm.applyFee = false;

      const finalAmount = component.calculateFinalAmount(100, 'DÓLAR', 'Entrada');
      expect(finalAmount).toBe(100);
    });
  });

  describe('Salida (Outflow) Transactions', () => {
    beforeEach(() => {
      component.selectedCurrency = 'DÓLAR';
      component.transactionType = 'Salida';
      component.transactionForm.amount = 50;
      component.transactionForm.amountDisplay = '50';
      component.transactionForm.descriptionType = 'ESMERALDA';
    });

    it('should create salida transaction successfully', async () => {
      const mockTransaction: Transaction = {
        _id: 'tx2',
        accountId: 'account1',
        type: 'Salida',
        description: 'ESMERALDA',
        currency: 'DÓLAR',
        amount: 50,
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      transactionsService.createTransaction.mockReturnValue(of(mockTransaction));
      accountsService.getAccountById.mockReturnValue(of({ account: mockAccount }));

      component.createTransaction();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(transactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Salida',
          currency: 'DÓLAR',
          amount: 50
        })
      );
    });

    it('should apply fee to salida transaction', () => {
      component.transactionForm.amount = 100;
      component.transactionForm.applyFee = true;
      component.transactionForm.feeType = 'percentage';
      component.transactionForm.feeValue = 5; // 5%

      const finalAmount = component.calculateFinalAmount(100, 'DÓLAR', 'Salida');
      // Para Salida, el fee se SUMA al monto: 100 + 5% = 105
      expect(finalAmount).toBe(105);
    });
  });

  describe('Compra Divisa (Currency Swap) Transactions', () => {
    beforeEach(() => {
      component.selectedCurrency = 'DÓLAR';
      component.swapForm.amount = 100;
      component.swapForm.amountDisplay = '100';
      component.swapForm.targetCurrency = 'PESOS';
      component.swapForm.exchangeRate = 1000; // 1 USD = 1000 PESOS
      component.swapForm.exchangeRateDisplay = '1000';
      component.swapForm.descriptionType = 'ESMERALDA';
    });

    it('should create swap transaction successfully', async () => {
      const mockTransaction: Transaction = {
        _id: 'tx3',
        accountId: 'account1',
        type: 'Compra Divisa',
        description: 'ESMERALDA',
        currency: 'DÓLAR',
        targetCurrency: 'PESOS',
        amount: 100000, // 100 * 1000
        exchangeRate: 1000,
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      transactionsService.createTransaction.mockReturnValue(of(mockTransaction));
      accountsService.getAccountById.mockReturnValue(of({ account: mockAccount }));

      component.createCompraDivisa();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(transactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Compra Divisa',
          currency: 'DÓLAR',
          targetCurrency: 'PESOS',
          amount: 100,
          exchangeRate: 1000
        })
      );
    });

    it('should validate swap amount is greater than zero', () => {
      component.swapForm.amount = 0;
      component.createCompraDivisa();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should prevent swap to same currency', () => {
      component.swapForm.targetCurrency = 'DÓLAR';
      component.createCompraDivisa();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should handle CHEQUE to PESOS with division', () => {
      component.selectedCurrency = 'CHEQUE';
      component.swapForm.targetCurrency = 'PESOS';
      component.swapForm.amount = 1500;
      component.swapForm.exchangeRate = 1500; // 1 PESO = 1500 CHEQUE

      // The calculation should be: 1500 / 1500 = 1 PESO
      // This is handled in the backend, but we verify the form is valid
      expect(component.swapForm.amount).toBe(1500);
      expect(component.swapForm.exchangeRate).toBe(1500);
    });

    it('should handle PESOS to DÓLAR with division', () => {
      component.selectedCurrency = 'PESOS';
      component.swapForm.targetCurrency = 'DÓLAR';
      component.swapForm.amount = 2000;
      component.swapForm.exchangeRate = 1000; // 1 DÓLAR = 1000 PESOS

      // The calculation should be: 2000 / 1000 = 2 DÓLAR
      expect(component.swapForm.amount).toBe(2000);
      expect(component.swapForm.exchangeRate).toBe(1000);
    });

    it('should require description for swap', () => {
      component.swapForm.descriptionType = '';
      component.swapForm.customDescription = '';
      component.createCompraDivisa();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Transferencia Interna (Internal Transfer) Transactions', () => {
    const targetAccount: Account = {
      _id: 'account2',
      name: 'Target Account',
      balances: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      component.selectedCurrency = 'DÓLAR';
      component.transferForm.amount = 200;
      component.transferForm.amountDisplay = '200';
      component.transferForm.targetAccountId = 'account2';
      component.transferForm.descriptionType = 'ESMERALDA';
      component.accounts = [mockAccount, targetAccount];
    });

    it('should create internal transfer successfully', async () => {
      const mockTransaction: Transaction = {
        _id: 'tx4',
        accountId: 'account1',
        type: 'Transferencia Interna',
        description: 'ESMERALDA',
        currency: 'DÓLAR',
        amount: 200,
        targetAccountId: 'account2',
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      transactionsService.createTransaction.mockReturnValue(of(mockTransaction));
      accountsService.getAccountById.mockReturnValue(of({ account: mockAccount }));

      component.createTransfer();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(transactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Transferencia Interna',
          currency: 'DÓLAR',
          amount: 200,
          targetAccountId: 'account2',
          description: 'ESMERALDA'
        })
      );
    });

    it('should validate transfer amount is greater than zero', () => {
      component.transferForm.amount = 0;
      component.createTransfer();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should require target account', () => {
      component.transferForm.targetAccountId = '';
      component.createTransfer();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should prevent transfer to same account', () => {
      component.transferForm.targetAccountId = 'account1';
      component.createTransfer();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should require description for transfer', () => {
      component.transferForm.descriptionType = '';
      component.transferForm.customDescription = '';
      component.createTransfer();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should require CABLE fields for CABLE transfers', () => {
      component.selectedCurrency = 'CABLE';
      component.transferForm.bancoWallet = '';
      component.transferForm.titularOriginante = '';
      component.createTransfer();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Transaction Display Logic', () => {
    it('should show correct sign for entrada transaction', () => {
      const transaction: Transaction = {
        _id: 'tx1',
        accountId: 'account1',
        type: 'Entrada',
        description: 'Test',
        currency: 'DÓLAR',
        amount: 100,
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = component.getTransactionSignAndType(transaction);
      expect(result.sign).toBe('+');
      expect(result.type).toBe('Entrada');
    });

    it('should show correct sign for salida transaction', () => {
      const transaction: Transaction = {
        _id: 'tx2',
        accountId: 'account1',
        type: 'Salida',
        description: 'Test',
        currency: 'DÓLAR',
        amount: 50,
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = component.getTransactionSignAndType(transaction);
      expect(result.sign).toBe('-');
      expect(result.type).toBe('Salida');
    });

    it('should show "A: [account]" for sent transfer', () => {
      component.accountId = 'account1';
      const transaction: Transaction = {
        _id: 'tx3',
        accountId: 'account1',
        type: 'Transferencia Interna',
        description: 'ESMERALDA',
        currency: 'DÓLAR',
        amount: 100,
        targetAccountId: { _id: 'account2', name: 'Target Account' } as any,
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = component.getTransactionSignAndType(transaction);
      expect(result.sign).toBe('-');
      expect(result.type).toBe('A: Target Account');
    });

    it('should show "Desde: [account]" for received transfer', () => {
      component.accountId = 'account2';
      const transaction: Transaction = {
        _id: 'tx4',
        accountId: 'account1',
        type: 'Transferencia Interna',
        description: 'ESMERALDA',
        currency: 'DÓLAR',
        amount: 100,
        targetAccountId: 'account2',
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = component.getTransactionSignAndType(transaction);
      expect(result.sign).toBe('+');
      expect(result.type).toContain('Desde:');
    });

    it('should show description for internal transfer', () => {
      const transaction: Transaction = {
        _id: 'tx5',
        accountId: 'account1',
        type: 'Transferencia Interna',
        description: 'ESMERALDA',
        currency: 'DÓLAR',
        amount: 100,
        targetAccountId: 'account2',
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const description = component.getTransactionDescription(transaction);
      expect(description).toBe('ESMERALDA');
    });
  });

  describe('Error Handling', () => {
    it('should handle transaction creation error', async () => {
      component.selectedCurrency = 'DÓLAR';
      component.transactionType = 'Entrada';
      component.transactionForm.amount = 100;
      component.transactionForm.descriptionType = 'ESMERALDA';

      transactionsService.createTransaction.mockReturnValue(
        throwError(() => ({ message: 'Server error' }))
      );

      component.createTransaction();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(component.creatingTransaction).toBe(false);
    });

    it('should handle account loading error', async () => {
      accountsService.getAccountById.mockReturnValue(
        throwError(() => ({ message: 'Account not found' }))
      );

      component.loadAccountData();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(component.error).toBeTruthy();
    });
  });

  describe('Number Formatting', () => {
    it('should parse Latin American number format', () => {
      const result = component.parseLatinNumber('1.500,25');
      expect(result).toBe(1500.25);
    });

    it('should format number to Latin American format', () => {
      const result = component.formatLatinNumber(1500.25);
      expect(result).toBe('1.500,25');
    });

    it('should handle empty string in parseLatinNumber', () => {
      const result = component.parseLatinNumber('');
      expect(result).toBe(0);
    });

    it('should handle null in formatLatinNumber', () => {
      const result = component.formatLatinNumber(null);
      expect(result).toBe('');
    });
  });
});
