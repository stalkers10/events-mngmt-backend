import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher.component';
import { describeHttpError } from '../../core/utils/http-error.util';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, I18nextPipe, LanguageSwitcherComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
})
export class SignupComponent {
  form;

  isSubmitting = signal(false);
  showPassword = signal(false);
  showConfirm = signal(false);
  submitted = signal(false);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
    private translation: I18nextService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      phone: ['']
    });

    if (this.auth.isAuthenticated()) {
      const user = this.auth.currentUser();
      this.router.navigate([user?.role === 'GATE_STAFF' ? '/scanner' : '/dashboard']);
    }
  }

  submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) return;

    const { name, email, username, password, confirmPassword, phone } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.toast.error(this.translation.t('auth.signup.passwordsMismatch'));
      return;
    }

    this.isSubmitting.set(true);
    this.auth
      .register({ name: name!, email: email!, username: username!, password: password!, phone: phone || undefined })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toast.success(this.translation.t('auth.signup.success'));
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const serverMsg = err?.error?.error;
          if (typeof serverMsg === 'string' && serverMsg) {
            this.toast.error(serverMsg);
            return;
          }
          const description = describeHttpError(err, 'generic');
          this.toast.error(this.translation.t(description.key, description.params));
        },
      });
  }
}
