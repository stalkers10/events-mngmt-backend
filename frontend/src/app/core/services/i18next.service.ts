import { Injectable, signal } from '@angular/core';
import i18next, { TOptions } from 'i18next';

export type Language = 'en' | 'fr';

@Injectable({ providedIn: 'root' })
export class I18nextService {
  readonly language = signal<Language>(this.toSupportedLanguage(i18next.language));

  constructor() {
    i18next.on('languageChanged', (language) => this.language.set(this.toSupportedLanguage(language)));
  }

  t(key: string, options?: TOptions): string {
    this.language();
    if (key === '__raw__') return String(options?.['raw'] ?? '');
    return i18next.t(key, options);
  }

  changeLanguage(language: Language): Promise<void> {
    return i18next.changeLanguage(language).then(() => undefined);
  }

  private toSupportedLanguage(language: string | undefined): Language {
    return language?.startsWith('fr') ? 'fr' : 'en';
  }
}
