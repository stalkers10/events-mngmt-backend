import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nextService } from '../../core/services/i18next.service';
import { describeHttpError } from '../../core/utils/http-error.util';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, I18nextPipe, LanguageSwitcherComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  form;

  isSubmitting = signal(false);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
    private translation: I18nextService
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);

    const { username, password } = this.form.getRawValue();

    this.auth.login(username!, password!).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.otpRequired) {
          this.router.navigate(['/verify-otp']);
        } else {
          this.router.navigate(['/scanner']);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const description = describeHttpError(err, 'login');
        this.toast.error(this.translation.t(description.key, description.params));
      },
    });
  }
}
