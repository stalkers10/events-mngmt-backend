import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nextService, Language } from '../../core/services/i18next.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
})
export class LanguageSwitcherComponent {
  constructor(public translation: I18nextService) {}

  select(lang: Language): void {
    void this.translation.changeLanguage(lang);
  }
}
