import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { jsPDF } from 'jspdf';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import {
  SubscriptionPlan,
  SubscriptionSummary,
  SubscriptionUsage,
  SubscriptionPlanFeature,
  Invoice,
} from '../../core/models/subscription.model';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';

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
  readonly invoices = signal<Invoice[]>([]);
  readonly isLoading = signal(true);
  readonly selectedPlan = signal<SubscriptionPlan | null>(null);
  readonly checkoutLoading = signal(false);
  readonly paymentMessage = signal('');
  phone = '';
  private pollTimer?: ReturnType<typeof setInterval>;

  constructor(
    private billing: SubscriptionService,
    private toast: ToastService,
    private i18n: I18nextService,
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
      invoices: this.billing.invoices(),
    }).subscribe({
      next: ({ plans, subscription, usage, invoices }) => {
        this.plans.set(plans);
        this.subscription.set(subscription);
        this.usage.set(usage);
        this.invoices.set(invoices);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error(
          this.i18n.t('billing.loadError'),
        );
      },
    });
  }

  isCurrentPlan(plan: SubscriptionPlan): boolean {
    return this.subscription()?.plan.code === plan.code;
  }

  planName(plan: SubscriptionPlan): string {
    return this.i18n.t(`billing.planNames.${plan.code.toLowerCase()}`);
  }

  limit(value: number | null): string {
    return value === null ? this.i18n.t('billing.unlimited') : String(value);
  }

  priceAmount(plan: SubscriptionPlan): string {
    return plan.priceXaf === 0
      ? this.i18n.t('billing.free')
      : `${(plan.priceXaf ?? 0).toLocaleString()} XAF`;
  }

  statusLabel(): string {
    const s = this.subscription()?.status;
    return s ? this.i18n.t(`billing.status.${s}`) : '';
  }

  tagline(plan: SubscriptionPlan): string {
    return this.i18n.t(`billing.tagline.${plan.code.toLowerCase()}`);
  }

  planSubtitle(plan: SubscriptionPlan): string {
    return this.i18n.t(`billing.${plan.code.toLowerCase()}Sub`);
  }

  featureText(plan: SubscriptionPlan, feature: SubscriptionPlanFeature): string {
    const opts: { count?: number } = {};
    if (feature.key === 'buildings') opts.count = plan.limits.buildings ?? undefined;
    if (feature.key === 'eventsPerMonth') opts.count = plan.limits.eventCreationsPerPeriod ?? undefined;
    return this.i18n.t(`billing.planFeatures.${feature.key}`, opts);
  }

  invoiceAmount(invoice: Invoice): string {
    return `${invoice.amountXaf.toLocaleString()} ${invoice.currency}`;
  }

  invoiceStatusLabel(status: string): string {
    return this.i18n.t(`billing.invoiceStatus.${status}`);
  }

  downloadInvoice(invoice: Invoice): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const m = 22;
    const right = w - m;

    // ---- Top accent bar (brand wine) ----
    doc.setFillColor(128, 0, 32);
    doc.rect(0, 0, w, 4, 'F');

    // ---- Header row: brand left, "INVOICE" label right ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(28, 25, 23);
    doc.text('Elite Events', m, 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.text('eliteevents.com', m, 29);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(128, 0, 32);
    doc.text(this.i18n.t('billing.docInvoice').toUpperCase(), right, 24, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.text(invoice.number, right, 30, { align: 'right' });

    // ---- Thin divider ----
    doc.setDrawColor(228);
    doc.setLineWidth(0.4);
    doc.line(m, 38, right, 38);

    // ---- Billed-to (left) vs. invoice details (right) ----
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(this.i18n.t('billing.docBilledTo').toUpperCase(), m, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(28, 25, 23);
    doc.text(invoice.clientName || '—', m, 57);

    const meta: [string, string][] = [
      [this.i18n.t('billing.invoiceColNumber'), invoice.number],
      [this.i18n.t('billing.invoiceColDate'), new DatePipe('en-US').transform(invoice.date, 'MMMM d, yyyy') ?? invoice.date],
      [this.i18n.t('billing.invoiceColStatus'), this.invoiceStatusLabel(invoice.status)],
    ];
    doc.setFontSize(9);
    doc.setTextColor(150);
    let my = 46;
    meta.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal');
      doc.text(label, right - 60, my, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(28, 25, 23);
      doc.text(value, right, my, { align: 'right' });
      my += 7;
    });

    // ---- Total box: label left, amount right, vertically centred on one line ----
    const boxY = 96;
    const boxH = 26;
    doc.setFillColor(252, 248, 247);
    doc.setDrawColor(232);
    doc.setLineWidth(0.4);
    doc.roundedRect(m, boxY, w - m * 2, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(110);
    doc.text(this.i18n.t('billing.docTotal').toUpperCase(), m + 8, boxY + boxH / 2 + 1);

    doc.setFontSize(18);
    doc.setTextColor(92, 14, 30);
    doc.text(`${invoice.amountXaf.toLocaleString()} ${invoice.currency}`, right - 8, boxY + boxH / 2 + 1, { align: 'right' });

    // ---- Payment note ----
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(140);
    doc.text(this.i18n.t('billing.docNote'), m, boxY + boxH + 12, { maxWidth: w - m * 2 });

    // ---- Footer ----
    doc.setDrawColor(228);
    doc.setLineWidth(0.4);
    doc.line(m, h - 24, right, h - 24);
    doc.setFontSize(8.5);
    doc.setTextColor(160);
    doc.text('Elite Events', m, h - 18);
    doc.text(this.i18n.t('billing.invoiceFooter'), right, h - 18, { align: 'right' });

    doc.save(`${invoice.number}.pdf`);
  }

  exportAllInvoices(): void {
    const list = this.invoices();
    if (!list.length) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth() ;
    const m = 22;
    const right = w - m;

    // Title
    doc.setFillColor(128, 0, 32);
    doc.rect(0, 0, w, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(28, 25, 23);
    doc.text(this.i18n.t('billing.invoiceTitle'), m, 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.text(`${list.length} ${this.i18n.t('billing.invoiceCount')}`, m, 28);

    // Column headers
    const columns = [
      this.i18n.t('billing.invoiceColNumber'),
      this.i18n.t('billing.invoiceColDate'),
      this.i18n.t('billing.invoiceColAmount'),
      this.i18n.t('billing.invoiceColStatus'),
    ];
    const colX = [m, m + 62, m + 108, right];
    const align: ('left' | 'right')[] = ['left', 'left', 'right', 'right'];

    let y = 40;
    doc.setFillColor(250, 245, 245);
    doc.rect(m, y - 5, w - m * 2, 9, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(150);
    columns.forEach((c, i) => {
      doc.text(c.toUpperCase(), colX[i], y, { align: align[i] });
    });
    y += 12;

    // Rows
    doc.setFont('helvetica', 'normal');
    list.forEach((inv, idx) => {
      if (idx > 0) {
        doc.setDrawColor(240);
        doc.setLineWidth(0.2);
        doc.line(m, y - 5, right, y - 5);
      }
      doc.setFontSize(10);
      doc.text(inv.number, colX[0], y, { align: align[0] });
      doc.setFont('helvetica', 'normal');
      doc.text(new DatePipe('en-US').transform(inv.date, 'MMMM d, yyyy') ?? inv.date, colX[1], y, { align: align[1] });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(92, 14, 30);
      doc.text(`${inv.amountXaf.toLocaleString()} ${inv.currency}`, colX[2], y, { align: align[2] });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      doc.text(this.invoiceStatusLabel(inv.status), colX[3], y, { align: align[3] });
      y += 11;

      if (y > 280) {
        doc.addPage();
        y = 25;
      }
    });

    doc.save('elite-events-invoices.pdf');
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
    this.paymentMessage.set(this.i18n.t('billing.msgConfirmPrompt'));
    this.billing.checkout(plan.code, this.phone).subscribe({
      next: (payment) => {
        this.pollTimer = setInterval(
          () =>
            this.billing.paymentStatus(payment.paymentId).subscribe({
              next: (status) => {
                if (status.status === 'SUCCESSFUL') {
                  this.paymentMessage.set(
                    this.i18n.t('billing.msgPaymentConfirmed'),
                  );
                  this.checkoutLoading.set(false);
                  if (this.pollTimer) clearInterval(this.pollTimer);
                  this.loadBilling();
                }
                if (status.status === 'FAILED') {
                  this.paymentMessage.set(this.i18n.t('billing.msgPaymentFailed'));
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
          error.error?.error || this.i18n.t('billing.msgInitiateFailed'),
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
      error: (error) => this.toast.error(error.error?.error || this.i18n.t('billing.msgRenewalFailed')),
    });
  }
  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }
}
