import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import {
  SubscriptionPlan,
  SubscriptionSummary,
  SubscriptionUsage,
} from '../../core/models/subscription.model';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, I18nextPipe],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.scss',
})
export class BillingComponent implements OnInit, OnDestroy {
  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly subscription = signal<SubscriptionSummary | null>(null);
  readonly usage = signal<SubscriptionUsage | null>(null);
  readonly isLoading = signal(true);
  readonly selectedPlan = signal<SubscriptionPlan | null>(null);
  readonly checkoutLoading = signal(false);
  readonly paymentMessage = signal('');
  phone = '';
  private pollTimer?: ReturnType<typeof setInterval>;

  constructor(
    private billing: SubscriptionService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.billing.reconcilePendingPayments().subscribe({
      next: () => this.loadBilling(),
      error: () => this.loadBilling(),
    });
  }

  private loadBilling(): void {
    forkJoin({
      plans: this.billing.plans(),
      subscription: this.billing.subscription(),
      usage: this.billing.usage(),
    }).subscribe({
      next: ({ plans, subscription, usage }) => {
        this.plans.set(plans);
        this.subscription.set(subscription);
        this.usage.set(usage);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error(
          'Unable to load billing information. Please try again.',
        );
      },
    });
  }

  isCurrentPlan(plan: SubscriptionPlan): boolean {
    return this.subscription()?.plan.code === plan.code;
  }

  limit(value: number | null): string {
    return value === null ? 'Unlimited' : String(value);
  }

  price(plan: SubscriptionPlan): string {
    return plan.priceXaf === 0
      ? 'Free'
      : `${(plan.priceXaf ?? 0).toLocaleString()} XAF / month`;
  }

  percent(used: number, limit: number | null): number {
    return limit === null ? 0 : Math.min(100, (used / limit) * 100);
  }

  openCheckout(plan: SubscriptionPlan): void {
    this.selectedPlan.set(plan);
    this.phone = '';
    this.paymentMessage.set('');
  }

  closeCheckout(): void {
    this.selectedPlan.set(null);
    this.checkoutLoading.set(false);
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  submitCheckout(): void {
    const plan = this.selectedPlan();
    if (!plan || (plan.code !== 'GO' && plan.code !== 'PRO')) return;
    this.checkoutLoading.set(true);
    this.paymentMessage.set('Confirm the Mobile Money prompt on your phone.');
    this.billing.checkout(plan.code, this.phone).subscribe({
      next: (payment) => {
        this.pollTimer = setInterval(
          () =>
            this.billing.paymentStatus(payment.paymentId).subscribe({
              next: (status) => {
                if (status.status === 'SUCCESSFUL') {
                  this.paymentMessage.set(
                    'Payment confirmed. Your plan is active.',
                  );
                  this.checkoutLoading.set(false);
                  if (this.pollTimer) clearInterval(this.pollTimer);
                  this.loadBilling();
                }
                if (status.status === 'FAILED') {
                  this.paymentMessage.set('Payment failed. Please try again.');
                  this.checkoutLoading.set(false);
                  if (this.pollTimer) clearInterval(this.pollTimer);
                }
              },
            }),
          5000,
        );
      },
      error: (error) => {
        this.paymentMessage.set(
          error.error?.error || 'Unable to initiate payment.',
        );
        this.checkoutLoading.set(false);
      },
    });
  }

  manageCancellation(): void {
    const subscription = this.subscription();
    if (!subscription) return;
    const request = subscription.cancelAtPeriodEnd ? this.billing.resumeRenewal() : this.billing.cancelAtPeriodEnd();
    request.subscribe({
      next: () => this.loadBilling(),
      error: (error) => this.toast.error(error.error?.error || 'Unable to update subscription renewal.'),
    });
  }
  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }
}
