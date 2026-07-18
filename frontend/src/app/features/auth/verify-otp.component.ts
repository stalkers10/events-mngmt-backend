import { Component, signal, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';
import { describeHttpError } from '../../core/utils/http-error.util';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';

const OTP_LENGTH = 8;

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, I18nextPipe],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.scss',
})
export class VerifyOtpComponent implements AfterViewInit {
  readonly length = OTP_LENGTH;
  digits = signal<string[]>(Array(OTP_LENGTH).fill(''));
  isSubmitting = signal(false);

  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
    private translation: I18nextService
  ) {}

  ngAfterViewInit(): void {
    this.digitInputs.first?.nativeElement.focus();
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.toUpperCase().slice(-1);

    const next = [...this.digits()];
    next[index] = value;
    this.digits.set(next);

    if (value && index < this.length - 1) {
      this.digitInputs.get(index + 1)?.nativeElement.focus();
    }

    if (next.every((d) => d.length === 1)) {
      this.submit();
    }
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      this.digitInputs.get(index - 1)?.nativeElement.focus();
    }
  }

  submit(): void {
    const code = this.digits().join('');
    if (code.length !== this.length) return;

    this.isSubmitting.set(true);

    this.auth.verifyOtp(code).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const description = describeHttpError(err, 'otp');
        this.toast.error(this.translation.t(description.key, description.params));
        this.digits.set(Array(this.length).fill(''));
        this.digitInputs.first?.nativeElement.focus();
      },
    });
  }
}
