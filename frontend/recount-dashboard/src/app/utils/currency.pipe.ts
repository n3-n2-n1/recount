import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyLatin',
  standalone: true
})
export class CurrencyLatinPipe implements PipeTransform {

  transform(value: number | null | undefined, currencyCode: string = 'USD', display: 'code' | 'symbol' | 'symbol-narrow' | string | boolean = 'symbol', digitsInfo?: string, locale?: string): string | null {
    if (value == null) return null;

    // Use Spanish locale for Latin American formatting
    const localeToUse = 'es-AR'; // Argentina locale for proper comma/dot formatting

    try {
      return new Intl.NumberFormat(localeToUse, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    } catch (error) {
      // Fallback formatting
      return this.formatLatinNumber(value, currencyCode);
    }
  }

  private formatLatinNumber(value: number, currencyCode: string): string {
    // Manual formatting for Latin American style
    const formatted = value.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const symbol = currencyCode === 'USD' ? '$' : currencyCode;
    return `${symbol} ${formatted}`;
  }
}