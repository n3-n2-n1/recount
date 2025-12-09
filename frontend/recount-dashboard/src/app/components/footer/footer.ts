import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ExchangeRateService } from '../../services/exchange-rate.service';
import { BridgeRatesData } from '../../models';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-footer',
  standalone: false,
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer implements OnInit, OnDestroy {
  bridgeRates: BridgeRatesData | null = null;
  isCached = false;
  private subscription: Subscription = new Subscription();
  private updateInterval: Subscription = new Subscription();

  constructor(
    private exchangeRateService: ExchangeRateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Load initial rates
    this.loadBridgeRates();

    // Set up auto-refresh every 30 seconds (as suggested by Bridge)
    this.updateInterval = interval(30000).subscribe(() => {
      this.loadBridgeRates();
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.updateInterval.unsubscribe();
  }

  private loadBridgeRates(): void {
    this.subscription.add(
      this.exchangeRateService.getBridgeRates().subscribe({
        next: (response) => {
          if (response.success && response.rates) {
            this.bridgeRates = response.rates;
            this.isCached = response.cached || false;
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.warn('Could not load Bridge rates:', error);
          // Keep existing rates if available
        }
      })
    );
  }

  formatRate(rate: string): string {
    if (!rate) return '';
    const numRate = parseFloat(rate);
    return numRate.toFixed(4);
  }

  formatLastUpdate(date: Date | string): string {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}