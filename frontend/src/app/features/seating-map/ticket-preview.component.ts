import { Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VenueService } from '../../core/services/venue.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { TicketTemplateHostComponent } from '../ticket-templates/ticket-template-host.component';
import { TicketTemplateService } from '../ticket-templates/ticket-template.service';
import { CustomTemplateStore } from '../ticket-templates/custom-template.store';
import { buildContext, renderTemplateHtml } from '../ticket-templates/render-template';
import { getHtmlForDesign, getTemplateNaturalWidth, isCustomDesign } from '../ticket-templates/template-catalog';
import { isBoardingPassDesign } from '../ticket-templates/boarding-pass-render';
import { renderMappedTemplate } from '../ticket-templates/template-mapping';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

@Component({
  selector: 'app-ticket-preview',
  standalone: true,
  imports: [CommonModule, ConfirmationDialogComponent, I18nextPipe, TicketTemplateHostComponent],
  templateUrl: './ticket-preview.component.html',
  styleUrl: './ticket-preview.component.scss'
})
export class TicketPreviewComponent implements OnInit {
  ticketId!: string;
  readonly ticket = signal<any | null>(null);
  readonly isLoading = signal(true);
  readonly isDownloading = signal(false);
  readonly showCancelConfirmation = signal(false);

  @ViewChild('ticketEl') ticketEl!: ElementRef<HTMLElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private venues: VenueService,
    private toast: ToastService,
    public i18n: I18nextService,
    private templateSvc: TicketTemplateService,
    private customStore: CustomTemplateStore
  ) {}

  ngOnInit(): void {
    this.customStore.load();
    const id = this.route.snapshot.paramMap.get('ticketId');
    if (!id) {
      this.toast.error('No Ticket ID provided.');
      this.router.navigate(['/events']);
      return;
    }
    this.ticketId = id;
    this.loadTicketDetails();
  }

  designId(): string {
    const t = this.ticket();
    if (!t) return 'classic';
    const isCouple = t.reservation_type === 'COUPLE';
    return (isCouple ? t.ticket_template_couple : t.ticket_template_single) || 'classic';
  }

  get customTemplates() {
    return this.customStore.templates;
  }

  loadTicketDetails(): void {
    this.isLoading.set(true);
    this.venues.getTicketDetails(this.ticketId).subscribe({
      next: (data) => {
        this.ticket.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toast.error('Failed to load ticket details.');
        this.isLoading.set(false);
      }
    });
  }

  downloadPdf(): void {
    const el = this.ticketEl?.nativeElement;
    if (!el || this.isDownloading()) return;
    const t = this.ticket();
    if (!t) return;
    this.isDownloading.set(true);

    const designId = this.designId();
    const finish = () => this.isDownloading.set(false);

    if (isCustomDesign(designId)) {
      this.buildCustomPdf(designId, t).then(finish).catch((err) => {
        console.error('Custom PDF failed:', err);
        this.toast.error('Failed to generate PDF ticket.');
        finish();
      });
      return;
    }

    this.buildStaticPdf(designId, t).then(finish).catch((err) => {
      console.error('Static PDF failed:', err);
      this.toast.error('Failed to generate PDF ticket.');
      finish();
    });
  }

  /** All static templates — rendered in an off-screen element at their exact
   *  natural size so the PDF is exactly the ticket dimensions. Templates are
   *  self-contained (inline styles + system fonts) so html2canvas needs no
   *  network requests or cross-origin access. */
  private async buildStaticPdf(designId: string, t: any): Promise<void> {
    const qr = t.qr_token ? await QRCode.toDataURL(t.qr_token, { errorCorrectionLevel: 'H', width: 240, margin: 1 }) : '';
    const ctx = buildContext(t, qr);
    const html = renderTemplateHtml(getHtmlForDesign(designId), ctx);
    const W = getTemplateNaturalWidth(designId);
    const H = isBoardingPassDesign(designId) ? 400 : undefined;

    const host = document.createElement('div');
    host.style.cssText =
      `position:absolute;left:-99999px;top:0;width:${W}px;${H ? `height:${H}px;` : ''}overflow:hidden;`;
    host.innerHTML = html;
    // html2canvas's flexbox engine collapses `inline-flex` root containers to a
    // fraction of their width (all content squashed left, stub/QR pushed out of
    // the capture). Rendered identically in the browser for the preview, so
    // normalize only the captured root to `flex` for a faithful PDF. Column
    // roots (designer boarding-pass) are left untouched.
    const rootEl = host.firstElementChild as HTMLElement | null;
    if (rootEl && rootEl.style.display === 'inline-flex' && rootEl.style.flexDirection !== 'column') {
      rootEl.style.display = 'flex';
    }
    document.body.appendChild(host);

    // Wait for any <link> stylesheets (e.g. Google Fonts) injected by the
    // template to load, then for the webfont faces themselves to be ready,
    // so the PDF captures the correct custom font instead of a generic fallback.
    const links = Array.from(host.querySelectorAll('link[rel="stylesheet"]'));
    await Promise.all([
      new Promise<void>((resolve) => {
        if (!links.length) return resolve();
        let remaining = links.length;
        const settle = () => { if (--remaining <= 0) resolve(); };
        links.forEach((l) => {
          l.addEventListener('load', settle);
          l.addEventListener('error', settle);
        });
      }),
      document.fonts?.ready?.catch?.(() => undefined) ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, 400)),
    ]);

    const captureH = H ?? host.scrollHeight;

    try {
      const canvas = await html2canvas(host, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: W,
        height: captureH,
        windowWidth: W,
        windowHeight: captureH,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
      });

      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`ticket-${this.ticketId}.pdf`);
    } finally {
      host.remove();
    }
  }

  /** Custom designer templates: resolve HTML, measure its natural size, and print on a page sized to the ticket. */
  private async buildCustomPdf(designId: string, t: any): Promise<void> {
    const match = designId.match(/^(.+?)__(single|couple)$/);
    const id = match ? match[1] : designId;
    const row = await this.templateSvc.getTemplate(id).toPromise();
    if (!row) throw new Error('template not found');
    const html = match && match[2] === 'couple' ? row.couple_html : row.single_html;
    const qr = t.qr_token ? await QRCode.toDataURL(t.qr_token, { errorCorrectionLevel: 'H', width: 240, margin: 1 }) : '';
    const ctx = buildContext(t, qr);
    const resolved = renderMappedTemplate(
      renderTemplateHtml(html, ctx),
      ctx,
      match && match[2] === 'couple' ? row.couple_mapping : row.single_mapping
    );

    const naturalWidth = getTemplateNaturalWidth(designId);
    const measure = document.createElement('iframe');
    measure.style.cssText = `position:absolute;left:-99999px;top:0;width:${naturalWidth}px;height:10px;border:0;`;
    document.body.appendChild(measure);
    const doc = measure.contentDocument!;
    doc.open();
    doc.write(resolved);
    doc.close();
    await new Promise((r) => setTimeout(r, 1200));
    const h = doc.documentElement.scrollHeight || 600;
    measure.remove();

    const wmm = (naturalWidth * 25.4) / 96;
    const hmm = (h * 25.4) / 96;
    const isLandscape = naturalWidth > h;
    const sizeDirective = isLandscape
      ? `@page{size:${hmm}mm ${wmm}mm landscape;margin:0}`
      : `@page{size:${wmm}mm ${hmm}mm;margin:0}`;
    const styleTag = `<style>${sizeDirective}html,body{margin:0;padding:0}</style>`;
    const styled = /<\/head>/i.test(resolved)
      ? resolved.replace(/<\/head>/i, styleTag + '</head>')
      : styleTag + resolved;

    const win = window.open('', '_blank');
    if (!win) {
      this.toast.error('Pop-up blocked. Allow pop-ups to download the ticket.');
      throw new Error('popup blocked');
    }
    win.document.open();
    win.document.write(styled);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  cancelTicket(): void {
    const t = this.ticket();
    if (!t) return;

    this.showCancelConfirmation.set(true);
  }

  confirmCancelTicket(): void {
    const t = this.ticket();
    if (!t) return;

    this.showCancelConfirmation.set(false);
    this.venues.cancelReservation(t.reservation_id).subscribe({
      next: () => {
        this.toast.success('Reservation cancelled successfully.');
        this.router.navigate(['/events', t.event_id, 'seating-map']);
      },
      error: () => {
        this.toast.error('Failed to cancel reservation.');
      }
    });
  }

  closeCancelTicketConfirmation(): void {
    this.showCancelConfirmation.set(false);
  }

  goBack(): void {
    const t = this.ticket();
    if (t) {
      this.router.navigate(['/events', t.event_id, 'seating-map']);
    } else {
      this.router.navigate(['/events']);
    }
  }
}
