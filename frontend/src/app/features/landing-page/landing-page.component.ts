import { Component, OnInit, Renderer2, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AuthModalComponent } from './auth-modal/auth-modal.component';

type AuthModalMode = 'login' | 'signup' | null;

type LandingFeatureCard = {
  icon: string;
  title: string;
  description: string;
};

type LandingBenefit = {
  title: string;
  description: string;
};

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, ButtonModule, AuthModalComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit {
  private readonly renderer = inject(Renderer2);

  readonly authModal = signal<AuthModalMode>(null);

  readonly featureCards: LandingFeatureCard[] = [
    {
      icon: 'pi pi-shield',
      title: 'Credential Tracking',
      description:
        'Track all your licenses and certifications in one place. Monitor expiration dates and renewal cycles for RN, NP, MD, DO, RT, and PA credentials.',
    },
    {
      icon: 'pi pi-book',
      title: 'CE Progress Monitoring',
      description:
        "Automatically calculate CE hours earned toward each credential's renewal requirements. See your progress at a glance with visual progress bars.",
    },
    {
      icon: 'pi pi-file',
      title: 'Certificate Storage',
      description:
        'Upload and store CE certificates, course documentation, and completion records. Keep everything organized and accessible for audits or credentialing.',
    },
    {
      icon: 'pi pi-bell',
      title: 'Expiration Alerts',
      description:
        'Get clear visibility into upcoming expirations. Credentials expiring within 90 days are automatically flagged so you can renew before deadlines.',
    },
  ];

  readonly complianceBenefits: LandingBenefit[] = [
    {
      title: 'Smart status tracking',
      description:
        'Credentials are automatically categorized as Active, Expiring Soon, or Expired based on expiration dates.',
    },
    {
      title: 'CE progress visualization',
      description:
        "See exactly how many hours you've earned toward each credential's CE requirements.",
    },
    {
      title: 'Upcoming expirations',
      description: 'View all credentials expiring in the next 90 days with days-remaining indicators.',
    },
    {
      title: 'Audit-ready records',
      description:
        'All your credentials and CE documentation in one organized, exportable location.',
    },
  ];

  ngOnInit(): void {
    this.renderer.removeClass(document.documentElement, 'dark');
  }

  openLogin(): void {
    this.authModal.set('login');
  }

  openSignup(): void {
    this.authModal.set('signup');
  }

  closeModal(): void {
    this.authModal.set(null);
  }

  handleModalSwitch(mode: Exclude<AuthModalMode, null>): void {
    this.authModal.set(mode);
  }
}
