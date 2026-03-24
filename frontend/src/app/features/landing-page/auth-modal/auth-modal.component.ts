import {
  AfterViewInit,
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

type AuthModalMode = 'login' | 'signup';

@Component({
  selector: 'app-auth-modal',
  imports: [DialogModule, ButtonModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss',
})
export class AuthModalComponent implements AfterViewInit {
  readonly mode = input.required<AuthModalMode>();
  readonly open = input(false);

  readonly close = output<void>();
  readonly switchMode = output<AuthModalMode>();

  private readonly firstInput = viewChild<ElementRef<HTMLInputElement>>('firstInput');
  private readonly lastTrigger = signal<HTMLElement | null>(null);

  readonly title = effect(() => {
    if (this.open()) {
      this.lastTrigger.set(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    }
  });

  ngAfterViewInit(): void {
    effect(() => {
      if (!this.open()) {
        return;
      }

      queueMicrotask(() => {
        this.firstInput()?.nativeElement.focus();
      });
    });
  }

  handleVisibleChange(visible: boolean): void {
    if (!visible) {
      this.handleClose();
    }
  }

  handleClose(): void {
    this.close.emit();

    const previousTrigger = this.lastTrigger();
    if (previousTrigger) {
      queueMicrotask(() => previousTrigger.focus());
    }
  }

  openLogin(): void {
    this.switchMode.emit('login');
  }

  openSignup(): void {
    this.switchMode.emit('signup');
  }
}
