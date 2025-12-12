import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Movements } from './movements';
import { AccountsService } from '../../../services/accounts.service';
import { TransactionsService } from '../../../services/transactions.service';
import { ExchangeRateService } from '../../../services/exchange-rate.service';
import { SettingsService } from '../../../services/settings.service';
import { AuthService } from '../../../services/auth.service';
import { Account, Transaction } from '../../../models';
import { CurrencyType } from '../../../models/transaction.model';

describe('Movements Component - Transaction Creation', () => {
  let component: Movements;
  let fixture: ComponentFixture<Movements>;
  let accountsService: any;
  let transactionsService: any;
  let exchangeRateService: any;
  let settingsService: any;
  let authService: any;
  let router: any;

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

  beforeEach(async () => {
    const accountsServiceMock = {
      getAccounts: vi.fn()
    };
    const transactionsServiceMock = {
      createTransaction: vi.fn(),
      getTransactionsByAccount: vi.fn()
    };
    const exchangeRateServiceMock = {
      getExchangeRates: vi.fn()
    };
    const settingsServiceMock = {
      getPreferredCurrency: vi.fn()
    };
    const authServiceMock = {
      canEdit: vi.fn()
    };
    const routerMock = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [Movements],
      imports: [FormsModule],
      providers: [
        { provide: AccountsService, useValue: accountsServiceMock },
        { provide: TransactionsService, useValue: transactionsServiceMock },
        { provide: ExchangeRateService, useValue: exchangeRateServiceMock },
        { provide: SettingsService, useValue: settingsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        ChangeDetectorRef
      ]
    }).compileComponents();

    accountsService = TestBed.inject(AccountsService);
    transactionsService = TestBed.inject(TransactionsService);
    exchangeRateService = TestBed.inject(ExchangeRateService);
    settingsService = TestBed.inject(SettingsService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    // Setup default spy returns
    accountsService.getAccounts.mockReturnValue(of({ accounts: [mockAccount] }));
    exchangeRateService.getExchangeRates.mockReturnValue(of({ rates: [] }));
    settingsService.getPreferredCurrency.mockReturnValue('DÓLAR');
    authService.canEdit.mockReturnValue(true);
    transactionsService.getTransactionsByAccount.mockReturnValue(of({ transactions: [] }));

    fixture = TestBed.createComponent(Movements);
    component = fixture.componentInstance;
    component.accounts = [mockAccount]; // Initialize accounts array
  });

  describe('Inflow (Entrada) Transactions', () => {
    beforeEach(() => {
      component.selectedAccountId = 'account1';
      component.accounts = [mockAccount]; // Ensure accounts array is initialized
      component.inflowForm.amount = 100;
      component.inflowForm.amountDisplay = '100';
      component.inflowForm.currency = 'DÓLAR';
      component.inflowForm.descriptionType = 'ESMERALDA';
    });

    it('should create inflow transaction successfully', async () => {
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

      // Ensure all required fields are set
      component.selectedAccountId = 'account1';
      component.accounts = [mockAccount];
      component.inflowForm.amount = 100;
      component.inflowForm.amountDisplay = '100';
      component.inflowForm.currency = 'DÓLAR';
      component.inflowForm.descriptionType = 'ESMERALDA';

      transactionsService.createTransaction.mockReturnValue(of(mockTransaction));
      accountsService.getAccounts.mockReturnValue(of({ accounts: [mockAccount] }));
      transactionsService.getTransactionsByAccount.mockReturnValue(of({ transactions: [] }));

      fixture.detectChanges();
      component.createInflow();

      // Wait for async operations
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(transactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Entrada',
          currency: 'DÓLAR',
          amount: 100,
          description: 'ESMERALDA'
        })
      );
      expect(component.loadingInflow).toBe(false);
    });

    it('should validate account is selected', () => {
      component.selectedAccountId = '';
      component.createInflow();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should validate amount is greater than zero', () => {
      component.inflowForm.amount = 0;
      component.createInflow();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should validate description is provided', () => {
      component.inflowForm.descriptionType = '';
      component.inflowForm.customDescription = '';
      component.createInflow();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should require CABLE fields for CABLE inflow', () => {
      component.selectedAccountId = 'account1';
      component.accounts = [mockAccount];
      component.inflowForm.amount = 100;
      component.inflowForm.amountDisplay = '100';
      component.inflowForm.currency = 'CABLE';
      component.inflowForm.descriptionType = 'ESMERALDA';
      component.inflowForm.bancoWallet = '';
      component.inflowForm.titularOriginante = '';
      // Mock the service to avoid undefined.subscribe error
      transactionsService.createTransaction.mockReturnValue(of({}));
      component.createInflow();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should reset form after successful creation', async () => {
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
      accountsService.getAccounts.mockReturnValue(of({ accounts: [mockAccount] }));
      transactionsService.getTransactionsByAccount.mockReturnValue(of({ transactions: [] }));

      fixture.detectChanges();
      component.createInflow();

      // Wait for async operations
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(component.inflowForm.amount).toBe(0);
      expect(component.inflowForm.amountDisplay).toBe('');
    });
  });

  describe('Outflow (Salida) Transactions', () => {
    beforeEach(() => {
      component.selectedAccountId = 'account1';
      component.accounts = [mockAccount]; // Ensure accounts array is initialized
      component.outflowForm.amount = 50;
      component.outflowForm.amountDisplay = '50';
      component.outflowForm.currency = 'DÓLAR';
      component.outflowForm.descriptionType = 'ESMERALDA';
    });

    it('should create outflow transaction successfully', async () => {
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
      accountsService.getAccounts.mockReturnValue(of({ accounts: [mockAccount] }));
      transactionsService.getTransactionsByAccount.mockReturnValue(of({ transactions: [] }));

      fixture.detectChanges();
      component.createOutflow();

      // Wait for async operations
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(transactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Salida',
          currency: 'DÓLAR',
          amount: 50
        })
      );
    });

    it('should validate all required fields for outflow', () => {
      component.outflowForm.amount = 0;
      component.createOutflow();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should require CABLE fields for CABLE outflow', () => {
      component.selectedAccountId = 'account1';
      component.accounts = [mockAccount];
      component.outflowForm.amount = 50;
      component.outflowForm.amountDisplay = '50';
      component.outflowForm.currency = 'CABLE';
      component.outflowForm.descriptionType = 'ESMERALDA';
      component.outflowForm.bancoWallet = '';
      component.outflowForm.titularOriginante = '';
      // Mock the service to avoid undefined.subscribe error
      transactionsService.createTransaction.mockReturnValue(of({}));
      component.createOutflow();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Compra Divisa (Currency Swap) Transactions', () => {
    beforeEach(() => {
      component.selectedAccountId = 'account1';
      component.accounts = [mockAccount]; // Ensure accounts array is initialized
      component.swapForm.amount = 100;
      component.swapForm.amountDisplay = '100';
      component.swapForm.currency = 'DÓLAR';
      component.swapForm.targetCurrency = 'PESOS';
      component.swapForm.exchangeRate = 1000;
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
        amount: 100,
        exchangeRate: 1000,
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      transactionsService.createTransaction.mockReturnValue(of(mockTransaction));
      accountsService.getAccounts.mockReturnValue(of({ accounts: [mockAccount] }));
      transactionsService.getTransactionsByAccount.mockReturnValue(of({ transactions: [] }));

      fixture.detectChanges();
      component.createCompraDivisa();

      // Wait for async operations
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 200));

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

    it('should require description for swap', () => {
      component.swapForm.descriptionType = '';
      component.swapForm.customDescription = '';
      component.createCompraDivisa();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });

    it('should reset swap form after successful creation', async () => {
      const mockTransaction: Transaction = {
        _id: 'tx3',
        accountId: 'account1',
        type: 'Compra Divisa',
        description: 'ESMERALDA',
        currency: 'DÓLAR',
        targetCurrency: 'PESOS',
        amount: 100,
        exchangeRate: 1000,
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      transactionsService.createTransaction.mockReturnValue(of(mockTransaction));
      accountsService.getAccounts.mockReturnValue(of({ accounts: [mockAccount] }));
      transactionsService.getTransactionsByAccount.mockReturnValue(of({ transactions: [] }));

      fixture.detectChanges();
      component.createCompraDivisa();

      // Wait for async operations
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(component.swapForm.amount).toBe(0);
      expect(component.swapForm.exchangeRate).toBe(1);
    });
  });

  describe('Internal Transfer Transactions', () => {
    const targetAccount: Account = {
      _id: 'account2',
      name: 'Target Account',
      balances: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      component.selectedAccountId = 'account1';
      component.accounts = [mockAccount, targetAccount]; // Ensure accounts array is initialized
      component.transferForm.amount = 200;
      component.transferForm.amountDisplay = '200';
      component.transferForm.currency = 'DÓLAR';
      component.transferForm.targetAccountId = 'account2';
      component.transferForm.descriptionType = 'ESMERALDA';
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
      accountsService.getAccounts.mockReturnValue(of({ accounts: [mockAccount, targetAccount] }));

      component.createTransfer();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(transactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Transferencia Interna',
          currency: 'DÓLAR',
          amount: 200,
          targetAccountId: 'account2'
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

    it('should require CABLE fields for CABLE transfer', () => {
      component.selectedAccountId = 'account1';
      component.accounts = [mockAccount, targetAccount];
      component.transferForm.amount = 200;
      component.transferForm.amountDisplay = '200';
      component.transferForm.currency = 'CABLE';
      component.transferForm.targetAccountId = 'account2';
      component.transferForm.descriptionType = 'ESMERALDA';
      component.transferForm.bancoWallet = '';
      component.transferForm.titularOriginante = '';
      // Mock the service to avoid undefined.subscribe error
      transactionsService.createTransaction.mockReturnValue(of({}));
      component.createTransfer();
      expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should validate inflow form correctly', () => {
      component.selectedAccountId = 'account1';
      component.inflowForm.amount = 100;
      component.inflowForm.descriptionType = 'ESMERALDA';
      component.inflowForm.currency = 'DÓLAR';

      expect(component.isInflowFormValid()).toBe(true);
    });

    it('should invalidate inflow form with zero amount', () => {
      component.selectedAccountId = 'account1';
      component.inflowForm.amount = 0;
      component.inflowForm.descriptionType = 'ESMERALDA';

      expect(component.isInflowFormValid()).toBe(false);
    });

    it('should invalidate inflow form without description', () => {
      component.selectedAccountId = 'account1';
      component.inflowForm.amount = 100;
      component.inflowForm.descriptionType = '';

      expect(component.isInflowFormValid()).toBe(false);
    });

    it('should validate swap form correctly', () => {
      component.selectedAccountId = 'account1';
      component.swapForm.amount = 100;
      component.swapForm.descriptionType = 'ESMERALDA';
      component.swapForm.currency = 'DÓLAR';
      component.swapForm.targetCurrency = 'PESOS';

      expect(component.isSwapFormValid()).toBe(true);
    });

    it('should invalidate swap form with same currencies', () => {
      component.selectedAccountId = 'account1';
      component.swapForm.amount = 100;
      component.swapForm.currency = 'DÓLAR';
      component.swapForm.targetCurrency = 'DÓLAR';

      expect(component.isSwapFormValid()).toBe(false);
    });

    it('should validate transfer form correctly', () => {
      component.selectedAccountId = 'account1';
      component.transferForm.amount = 100;
      component.transferForm.descriptionType = 'ESMERALDA';
      component.transferForm.targetAccountId = 'account2';

      expect(component.isTransferFormValid()).toBe(true);
    });

    it('should invalidate transfer form to same account', () => {
      component.selectedAccountId = 'account1';
      component.transferForm.amount = 100;
      component.transferForm.targetAccountId = 'account1';

      expect(component.isTransferFormValid()).toBe(false);
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

    it('should handle amount input and update numeric value', () => {
      component.inflowForm.amountDisplay = '1.500,25';
      component.onAmountInput(component.inflowForm, 'amount');
      expect(component.inflowForm.amount).toBe(1500.25);
    });

    it('should format amount on blur', () => {
      component.inflowForm.amount = 1500.25;
      component.onAmountBlur(component.inflowForm, 'amount');
      expect(component.inflowForm.amountDisplay).toBe('1.500,25');
    });
  });

  describe('Error Handling', () => {
    it('should handle transaction creation error', async () => {
      component.selectedAccountId = 'account1';
      component.inflowForm.amount = 100;
      component.inflowForm.descriptionType = 'ESMERALDA';

      transactionsService.createTransaction.mockReturnValue(
        throwError(() => ({ message: 'Server error' }))
      );

      component.createInflow();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(component.loadingInflow).toBe(false);
    });
  });

  describe('Form Reset', () => {
    it('should reset inflow form', () => {
      component.inflowForm.amount = 100;
      component.inflowForm.descriptionType = 'ESMERALDA';
      component.resetInflowForm();

      expect(component.inflowForm.amount).toBe(0);
      expect(component.inflowForm.amountDisplay).toBe('');
      expect(component.inflowForm.descriptionType).toBe('ESMERALDA'); // Default value
    });

    it('should reset swap form', () => {
      component.swapForm.amount = 100;
      component.swapForm.exchangeRate = 1000;
      component.resetSwapForm();

      expect(component.swapForm.amount).toBe(0);
      expect(component.swapForm.exchangeRate).toBe(1);
      expect(component.swapForm.exchangeRateDisplay).toBe('1');
    });

    it('should reset transfer form', () => {
      component.transferForm.amount = 200;
      component.transferForm.targetAccountId = 'account2';
      component.resetTransferForm();

      expect(component.transferForm.amount).toBe(0);
      expect(component.transferForm.targetAccountId).toBe('');
    });
  });
});
