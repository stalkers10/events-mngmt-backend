import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { getHtmlForDesign, getTemplateNaturalWidth, isCustomDesign } from './template-catalog';
import { buildContext, renderTemplateHtml } from './render-template';
import { isBoardingPassDesign, resolveBoardingPassHtml } from './boarding-pass-render';
import { renderMappedTemplate } from './template-mapping';
import { TicketFieldMapping } from './template-mapping';
import QRCode from 'qrcode';

@Component({
  selector: 'app-ticket-template-host',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ticket-template-render" #wrap>
      @if (useIframe()) {
        <iframe #frame class="ticket-frame" sandbox="allow-scripts" (load)="onFrameLoad()"></iframe>
      } @else {
        <div class="ticket-inner" #inner [innerHTML]="rendered()"></div>
      }
    </div>
  `,
  styleUrl: './ticket-template-host.component.scss',
})
export class TicketTemplateHostComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() templateId = 'classic';
  @Input() details: any = null;
  @Input() sample = false;
  /** Raw HTML to render (used for custom designer templates). Takes precedence over templateId. */
  @Input() htmlOverride: string | null = null;
  /** Custom template rows, used to resolve a custom design id. */
  @Input() customTemplates: any[] = [];
  /** Mapping used while onboarding a raw designer HTML file. */
  @Input() fieldMapping: TicketFieldMapping | null = null;

  @ViewChild('wrap') wrap?: ElementRef<HTMLElement>;
  @ViewChild('inner') inner?: ElementRef<HTMLElement>;
  
  private frame?: ElementRef<HTMLIFrameElement>;
  @ViewChild('frame') set frameRef(el: ElementRef<HTMLIFrameElement> | undefined) {
    this.frame = el;
    this.applyIframe();
  }

  private sanitizer = inject(DomSanitizer);
  readonly rendered = signal<SafeHtml>('');
  readonly srcdoc = signal<string>('');

  private ro?: ResizeObserver;
  private naturalWidth = 360;
  private iframeHeight = 0;
  private pendingSrcdoc: string | null = null;

  private onMessage = (e: MessageEvent) => {
    const data = e.data as any;
    if (data && data.__tplHeight) {
      this.iframeHeight = data.__tplHeight;
      this.fit();
    }
  };

  ngOnChanges(): void {
    // The supplied boarding-pass artwork has a fixed 960px canvas. Set this
    // before the iframe is created so its document viewport is never the
    // legacy 360px template width (which crops its right-hand stub).
    this.naturalWidth = isBoardingPassDesign(this.templateId)
      ? 960
      : (this.htmlOverride || isCustomDesign(this.templateId) ? 360 : getTemplateNaturalWidth(this.templateId));
    void this.render();
  }

  ngAfterViewInit(): void {
    if (this.wrap) {
      this.ro = new ResizeObserver(() => this.fit());
      this.ro.observe(this.wrap.nativeElement);
    }
    window.addEventListener('message', this.onMessage);
    this.applyIframe();
    this.fit();
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    window.removeEventListener('message', this.onMessage);
  }

  useIframe(): boolean {
    return !!this.htmlOverride || isCustomDesign(this.templateId) || isBoardingPassDesign(this.templateId);
  }

  private resolveHtml(): string {
    if (this.htmlOverride) return this.htmlOverride;
    return getHtmlForDesign(this.templateId, this.customTemplates);
  }

  private async render(): Promise<void> {
    let qrDataUrl = '';
    const token = this.details?.qr_token;
    if (token) {
      try {
        qrDataUrl = await QRCode.toDataURL(token, { errorCorrectionLevel: 'H', width: 240, margin: 1 });
      } catch {
        qrDataUrl = '';
      }
    }
    const ctx = buildContext(this.details, qrDataUrl);
    let resolved = isBoardingPassDesign(this.templateId)
      ? await resolveBoardingPassHtml(this.templateId, ctx)
      : renderTemplateHtml(this.resolveHtml(), ctx);
    if (this.fieldMapping) {
      resolved = renderMappedTemplate(resolved, ctx, this.fieldMapping);
    } else if (isCustomDesign(this.templateId)) {
      const match = this.templateId.match(/^(.+?)__(single|couple)$/);
      const row = match ? this.customTemplates.find((t) => t.id === match[1]) : null;
      const mapping = match?.[2] === 'couple' ? row?.couple_mapping : row?.single_mapping;
      resolved = renderMappedTemplate(resolved, ctx, mapping);
    }
    if (this.useIframe()) {
      this.pendingSrcdoc = this.injectMeasureScript(resolved);
      this.applyIframe();
    } else {
      this.pendingSrcdoc = null;
      this.rendered.set(this.sanitizer.bypassSecurityTrustHtml(resolved));
    }
    requestAnimationFrame(() => {
      this.fit();
      setTimeout(() => this.fit(), 80);
    });
  }

  /** Sets the iframe srcdoc directly via the DOM to avoid Angular's srcdoc sanitization stripping <script> tags. */
  private applyIframe(): void {
    if (this.useIframe() && this.frame && this.pendingSrcdoc !== null) {
      this.frame.nativeElement.srcdoc = this.pendingSrcdoc;
      this.pendingSrcdoc = null;
    }
  }

  /** Appends a script that reports the rendered height to the parent for fit-to-width scaling. */
  private injectMeasureScript(html: string): string {
    const canvasStyle = isBoardingPassDesign(this.templateId)
      ? '<style>html,body{margin:0;padding:0;width:960px;min-width:960px;overflow:hidden}</style>'
      : '';
    const script = canvasStyle +
      `<script>(function(){function p(){try{parent.postMessage({__tplHeight:document.documentElement.scrollHeight},'*');}catch(e){}}` +
      `window.addEventListener('load',p);if(window.ResizeObserver){new ResizeObserver(p).observe(document.documentElement);}` +
      `setTimeout(p,200);setTimeout(p,600);setTimeout(p,1200);})();<\/script>`;
    if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, script + '</body>');
    return html + script;
  }

  onFrameLoad(): void {
    setTimeout(() => this.fit(), 120);
  }

  /** Scale the fixed-size ticket down so it fits the available width, reserving the scaled height. */
  private fit(): void {
    if (!this.wrap) return;
    const wrapEl = this.wrap.nativeElement;
    const avail = wrapEl.clientWidth;
    if (!avail) return;
    const scale = Math.min(1, avail / this.naturalWidth);
    if (this.useIframe() && this.frame) {
      const fr = this.frame.nativeElement;
      const h = this.iframeHeight || 520;
      fr.style.width = `${this.naturalWidth}px`;
      fr.style.height = `${h}px`;
      // `transform: scale()` preserves the iframe's old layout viewport in
      // some Chromium builds, leaving a 360px clipping window around the
      // 960px designer document. `zoom` scales its layout viewport as well.
      fr.style.transform = 'none';
      fr.style.zoom = String(scale);
      fr.style.marginLeft = `${Math.max(0, (avail - this.naturalWidth * scale) / 2)}px`;
      wrapEl.style.height = `${h * scale}px`;
    } else if (this.inner) {
      const innerEl = this.inner.nativeElement;
      innerEl.style.transform = `scale(${scale})`;
      innerEl.style.transformOrigin = 'top left';
      innerEl.style.marginLeft = `${Math.max(0, (avail - this.naturalWidth * scale) / 2)}px`;
      wrapEl.style.height = `${innerEl.offsetHeight * scale}px`;
    }
  }
}
