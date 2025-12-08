import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ExchangeRateService } from '../../services/exchange-rate.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { ExchangeRate, ExchangeRateHistory } from '../../models';
import { CurrencyType } from '../../models/transaction.model';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
  show: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  // User preferences
  preferredCurrency: CurrencyType = 'DÓLAR';
  availableCurrencies: CurrencyType[] = [];

  // Exchange rates
  allCurrencies: CurrencyType[] = ['DÓLAR', 'CABLE', 'PESOS', 'CHEQUE', 'DOLAR INTERNACIONAL'];
  exchangeRates: ExchangeRate[] = [];
  rateHistory: ExchangeRateHistory[] = [];
  editingRates: { [key: string]: number } = {};
  
  // Loading states
  loadingRates = false;
  loadingHistory = false;
  savingRates = false;

  // UI state
  showHistory = false;
  toasts: Toast[] = [];
  private toastIdCounter = 0;

  // User role
  canEditRates = false;

  // Computed properties for better state management
  get hasExchangeRates(): boolean {
    return this.exchangeRates.length > 0;
  }

  get hasEditingRates(): boolean {
    return Object.keys(this.editingRates).length > 0;
  }

  constructor(
    private exchangeRateService: ExchangeRateService,
    private settingsService: SettingsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Load user preferences first (synchronous)
    this.loadUserPreferences();

    // Check permissions
    this.checkPermissions();

    // Load exchange rates immediately
    this.loadExchangeRates();
  }

  private checkPermissions(): void {
    const user = this.authService.currentUser;
    this.canEditRates = user?.role === 'super_admin' || user?.role === 'reviewer';
  }

  private loadUserPreferences(): void {
    this.preferredCurrency = this.settingsService.getPreferredCurrency();
    this.availableCurrencies = this.settingsService.getAvailableCurrencies();
  }

  loadExchangeRates(): void {
    this.loadingRates = true;

    this.exchangeRateService.getExchangeRates().subscribe({
      next: (response) => {
        const existingRates = response?.rates || [];

        // Create complete list with all currencies, marking which ones exist
        this.exchangeRates = this.allCurrencies.map(currency => {
          const existingRate = existingRates.find(r => r.currency === currency);
          return existingRate ? existingRate : {
            _id: '',
            currency,
            rateToUSD: 1.0, // Default value for new currencies
            updatedBy: '',
            updatedAt: new Date(),
            createdAt: new Date()
          } as ExchangeRate;
        });

        // Initialize editing rates with current values or defaults
        this.editingRates = {};
        this.allCurrencies.forEach(currency => {
          const existingRate = existingRates.find(r => r.currency === currency);
          this.editingRates[currency] = existingRate ? existingRate.rateToUSD : 1.0;
        });

        this.loadingRates = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading exchange rates:', error);
        this.showError('Error al cargar las tasas de cambio. Usando valores por defecto.');

        // Create fallback with default values
        this.exchangeRates = this.allCurrencies.map(currency => ({
          _id: '',
          currency,
          rateToUSD: 1.0,
          updatedBy: '',
          updatedAt: new Date(),
          createdAt: new Date()
        } as ExchangeRate));

        // Initialize editing rates with defaults
        this.editingRates = {};
        this.allCurrencies.forEach(currency => {
          this.editingRates[currency] = 1.0;
        });

        this.loadingRates = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadHistory(): void {
    if (this.rateHistory.length > 0) {
      this.showHistory = !this.showHistory;
      return;
    }

    this.loadingHistory = true;
    this.showHistory = true;
    this.exchangeRateService.getHistory().subscribe({
      next: (response) => {
        this.rateHistory = response.history;
        this.loadingHistory = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading rate history:', error);
        this.showError('Error al cargar el historial de tasas');
        this.loadingHistory = false;
        this.cdr.detectChanges();
      }
    });
  }

  onPreferredCurrencyChange(): void {
    this.settingsService.setPreferredCurrency(this.preferredCurrency);
    this.showSuccess('Moneda de visualización actualizada');
  }

  updateRate(currency: CurrencyType): void {
    const newRate = this.editingRates[currency];

    // Validate input
    if (!newRate || newRate <= 0) {
      this.showError('La tasa debe ser mayor a 0');
      return;
    }

    if (newRate > 1000000) {
      this.showError('La tasa parece demasiado alta. Verifique el valor.');
      return;
    }

    if (newRate < 0.000001) {
      this.showError('La tasa parece demasiado baja. Verifique el valor.');
      return;
    }

    console.log(`Updating rate for ${currency}: ${newRate}`);

    this.savingRates = true;
    this.exchangeRateService.updateExchangeRate(currency, newRate).subscribe({
      next: (response) => {
        console.log('Rate updated successfully:', response);
        this.showSuccess(response.message || 'Tasa actualizada correctamente');

        // Reload rates to get updated data
        this.loadExchangeRates();

        // Reload history if it's visible
        if (this.showHistory) {
          this.rateHistory = []; // Clear to force reload
          this.loadHistory();
        }

        this.savingRates = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error updating rate:', error);
        const errorMessage = error?.error?.message || 'Error al actualizar la tasa';
        this.showError(errorMessage);
        this.savingRates = false;
        this.cdr.detectChanges();
      }
    });
  }

  hasRateChanged(currency: CurrencyType): boolean {
    const currentRate = this.exchangeRates.find(r => r.currency === currency);
    const editingValue = this.editingRates[currency];

    // If no current rate exists, always allow saving (creating new rate)
    if (!currentRate || !currentRate._id) {
      return editingValue !== undefined && editingValue > 0;
    }

    // If current rate exists, check if editing value is different
    return editingValue !== currentRate.rateToUSD;
  }

  resetRate(currency: CurrencyType): void {
    const currentRate = this.exchangeRates.find(r => r.currency === currency);

    if (currentRate && currentRate._id) {
      // Reset to current saved value
      this.editingRates[currency] = currentRate.rateToUSD;
    } else {
      // Reset to default for currencies without saved rates
      this.editingRates[currency] = 1.0;
    }

    console.log(`Reset rate for ${currency}:`, this.editingRates[currency]);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getUpdatedByName(rate: ExchangeRate): string {
    if (rate.updatedBy && typeof rate.updatedBy === 'object' && rate.updatedBy.name) {
      return rate.updatedBy.name;
    }
    if (typeof rate.updatedBy === 'string' && rate.updatedBy) {
      return 'Usuario del sistema';
    }
    return 'No configurado';
  }

  getChangedByName(historyItem: ExchangeRateHistory): string {
    return historyItem.changedBy?.name || 'Sistema';
  }

  private showSuccess(message: string): void {
    this.addToast(message, 'success');
  }

  private showError(message: string): void {
    this.addToast(message, 'error');
  }

  private addToast(message: string, type: 'success' | 'error'): void {
    const id = this.toastIdCounter++;
    const toast: Toast = { id, message, type, show: false };
    
    this.toasts.push(toast);
    
    setTimeout(() => {
      const toastIndex = this.toasts.findIndex(t => t.id === id);
      if (toastIndex !== -1) {
        this.toasts[toastIndex].show = true;
        this.cdr.detectChanges();
      }
    }, 10);
    
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

  /**
   * Debug method to reinitialize exchange rates data
   * Useful for troubleshooting loading issues
   */
  reinitializeRates(): void {
    console.log('Reinitializing exchange rates...');
    this.exchangeRates = [];
    this.editingRates = {};
    this.loadExchangeRates();
  }
}
