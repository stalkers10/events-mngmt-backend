import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { getHtmlForDesign, getTemplateNaturalWidth, isCustomDesign } from './template-catalog';
import { buildContext, renderTemplateHtml } from './render-template';
import { isBoardingPassDesign } from './boarding-pass-render';
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
  /** When true (default), scale the fixed-width ticket down to fit the available width. */
  @Input() fitToWidth = true;

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
    if (data && typeof data.__tplWidth === 'number' && this.fitToWidth === false) {
      this.naturalWidth = data.__tplWidth;
      this.fit();
    }
  };

  ngOnChanges(): void {
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
    let resolved = renderTemplateHtml(this.resolveHtml(), ctx);
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

  /** Appends a script that reports the rendered size to the parent for proper scrolling/fit. */
  private injectMeasureScript(html: string): string {
    const isWide = isBoardingPassDesign(this.templateId);
    const canvasStyle = isWide
      ? '<style>html,body{margin:0;padding:0;width:960px;min-width:960px;overflow:hidden}</style>'
      : '<style>html,body{margin:0;padding:0}</style>';
    const script = canvasStyle +
      `<script>(function(){var w,h,wm=0;` +
      `function m(){try{w=document.documentElement.scrollWidth;h=document.documentElement.scrollHeight;` +
      `if(w!==wm){wm=w;parent.postMessage({__tplHeight:h,__tplWidth:w},'*');}else{parent.postMessage({__tplHeight:h},'*');}}catch(e){}}` +
      `window.addEventListener('load',m);if(window.ResizeObserver){new ResizeObserver(m).observe(document.documentElement);}` +
      `setTimeout(m,200);setTimeout(m,600);setTimeout(m,1200);})();<\/script>`;
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
    if (!this.fitToWidth) {
      if (this.useIframe() && this.frame) {
        const fr = this.frame.nativeElement;
        this.iframeHeight = this.iframeHeight || 520;
        // In live preview mode, render the pasted designer HTML in a wide
        // viewport so fixed-width (e.g. 360/960px) designs lay out at their
        // natural size and fluid designs don't collapse. The parent wrapper
        // scrolls horizontally/vertically instead of squeezing.
        fr.style.width = `1200px`;
        fr.style.height = `${this.iframeHeight}px`;
        fr.style.transform = 'none';
        fr.style.zoom = '1';
        fr.style.marginLeft = '0';
      } else if (this.inner) {
        const innerEl = this.inner.nativeElement;
        innerEl.style.transform = 'none';
        innerEl.style.marginLeft = '0';
      }
      return;
    }
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
