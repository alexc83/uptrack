import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { merge } from 'rxjs';

import { AuthStore } from '../../../core/auth/auth.store';

type AuthModalMode = 'login' | 'signup';

@Component({
  selector: 'app-auth-modal',
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
  ],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss',
})
export class AuthModalComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);

  readonly mode = input.required<AuthModalMode>();
  readonly open = input(false);

  readonly close = output<void>();
  readonly switchMode = output<AuthModalMode>();

  private readonly firstInput = viewChild<ElementRef<HTMLInputElement>>('firstInput');
  private readonly lastTrigger = signal<HTMLElement | null>(null);

  readonly isSubmitting = computed(() => this.authStore.isLoading());
  readonly authError = computed(() => this.authStore.authError());

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly signupForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly rememberTrigger = effect(() => {
    if (this.open()) {
      this.lastTrigger.set(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    }
  });

  readonly focusFirstInput = effect(() => {
    if (!this.open()) {
      return;
    }

    queueMicrotask(() => {
      this.firstInput()?.nativeElement.focus();
    });
  });

  constructor() {
    merge(this.loginForm.valueChanges, this.signupForm.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.authStore.clearAuthError());
  }

  handleVisibleChange(visible: boolean): void {
    if (!visible) {
      this.handleClose();
    }
  }

  handleClose(): void {
    this.authStore.clearAuthError();
    this.close.emit();

    const previousTrigger = this.lastTrigger();
    if (previousTrigger) {
      queueMicrotask(() => previousTrigger.focus());
    }
  }

  async submit(): Promise<void> {
    const form = this.mode() === 'login' ? this.loginForm : this.signupForm;
    if (form.invalid) {
      form.markAllAsTouched();
      this.authStore.clearAuthError();
      return;
    }

    const success =
      this.mode() === 'login'
        ? await this.authStore.login(this.loginForm.getRawValue())
        : await this.authStore.register(this.signupForm.getRawValue());

    if (!success) {
      return;
    }

    this.loginForm.reset({ email: '', password: '' });
    this.signupForm.reset({ name: '', email: '', password: '' });
    this.handleClose();
  }

  openLogin(): void {
    this.authStore.clearAuthError();
    this.switchMode.emit('login');
  }

  openSignup(): void {
    this.authStore.clearAuthError();
    this.switchMode.emit('signup');
  }

  isFieldInvalid(fieldName: 'name' | 'email' | 'password'): boolean {
    const control = this.getControl(fieldName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getFieldError(fieldName: 'name' | 'email' | 'password'): string | null {
    const control = this.getControl(fieldName);
    if (!control || !control.errors || (!control.dirty && !control.touched)) {
      return null;
    }

    if (control.errors['required']) {
      return 'This field is required.';
    }

    if (control.errors['email']) {
      return 'Enter a valid email address.';
    }

    if (control.errors['minlength']) {
      return 'Password must be at least 8 characters.';
    }

    return 'This field is invalid.';
  }

  private getControl(fieldName: 'name' | 'email' | 'password') {
    if (this.mode() === 'login') {
      return fieldName === 'name' ? null : this.loginForm.controls[fieldName];
    }

    return this.signupForm.controls[fieldName];
  }
}
