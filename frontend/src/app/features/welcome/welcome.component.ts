import { Component, signal, computed, AfterViewInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher.component';
import { I18nextService } from '../../core/services/i18next.service';
import i18next from 'i18next';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, RouterLink, I18nextPipe, LanguageSwitcherComponent],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
})
export class WelcomeComponent implements AfterViewInit, OnDestroy {
  private translation = inject(I18nextService);
  private cdr = inject(ChangeDetectorRef);

  /** The currently displayed (partially typed) headline. */
  readonly typedText = signal('');
  /** Full headline for screen readers (independent of the animation). */
  readonly fullHeadline = computed(() => this.translation.t('welcome.headline'));

  private timer: ReturnType<typeof setInterval | typeof setTimeout> | null = null;
  private full = '';
  private pos = 0;
  private typing = true;
  private readonly reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly langHandler = () => this.restart();

  ngAfterViewInit(): void {
    this.start();
    i18next.on('languageChanged', this.langHandler);
  }

  private start(): void {
    this.clearTimer();
    this.full = this.translation.t('welcome.headline') ?? '';
    this.pos = 0;
    this.typing = true;

    if (this.reducedMotion || this.full.length === 0) {
      this.typedText.set(this.full);
      this.cdr.detectChanges();
      return;
    }

    this.typedText.set('');
    this.cdr.detectChanges();
    this.timer = setInterval(this.tick, 100);
  }

  private restart(): void {
    this.start();
  }

  // Arrow fn keeps `this`; runs on every step and forces a CD so the
  // partially-typed text always repaints.
  private tick = (): void => {
    if (this.typing) {
      this.pos++;
      this.typedText.set(this.full.slice(0, this.pos));
      if (this.pos >= this.full.length) {
        this.typing = false;
        this.clearTimer();
        this.timer = setTimeout(() => {
          this.typing = true;
          this.pos = 0;
          this.timer = setInterval(this.tick, 100);
        }, 5000);
      }
    } else {
      this.pos--;
      this.typedText.set(this.full.slice(0, this.pos));
      if (this.pos <= 0) {
        this.clearTimer();
        this.timer = setTimeout(() => {
          this.typing = true;
          this.pos = 0;
          this.timer = setInterval(this.tick, 100);
        }, 5000);
      }
    }
    this.cdr.detectChanges();
  };

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer as any);
      clearTimeout(this.timer as any);
      this.timer = null;
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
    i18next.off('languageChanged', this.langHandler);
  }
}
