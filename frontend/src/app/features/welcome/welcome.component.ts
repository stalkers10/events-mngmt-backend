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

  /** Current year for the footer copyright. */
  readonly year = new Date().getFullYear();

  /** Event showcase images (Unsplash) used in the infinite scrolling gallery. */
  readonly gallery = [
    { img: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80', label: 'Galas & Parties' },
    { img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80', label: 'Conferences' },
    { img: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=600&q=80', label: 'Concerts' },
    { img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80', label: 'Weddings' },
    { img: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=600&q=80', label: 'Venues & Decor' },
    { img: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=600&q=80', label: 'Live Shows' },
    { img: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80', label: 'Engagements' },
    { img: 'https://images.unsplash.com/photo-1464347744102-11db6282f854?auto=format&fit=crop&w=600&q=80', label: 'Festivals' },
  ];

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
