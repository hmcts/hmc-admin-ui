import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

interface WizardStepComponent {
  form?: FormGroup;
  requestTypeForm?: FormGroup;
  requestFunctionForm?: FormGroup;
  submit?: () => void;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  // Wizard step order (used to compute Back/Continue targets)
  readonly steps = ['request-type', 'request-function'] as const;

  currentIndex = 0;
  isFirstStep = true;
  isLastStep = false;

  continueDisabled = false;

  private activeForm?: FormGroup | null;
  private activeChild?: { submit?: () => void } | null;
  activeFormId: string | null = null;

  constructor(private router: Router) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const url = (this.router.url || '').replace(/^\//, '') || 'request-type';
      const idx = this.steps.indexOf(url as never);
      this.currentIndex = Math.max(0, idx);
      this.isFirstStep = this.currentIndex === 0;
      this.isLastStep = this.currentIndex === this.steps.length - 1;
    });
  }

  // Called whenever a new child component is activated in the outlet
  onChildActivate(instance: WizardStepComponent): void {
    // detect the child's FormGroup as before
    const form: FormGroup | null = instance?.form ?? instance?.requestTypeForm ?? instance?.requestFunctionForm ?? null;

    this.activeForm = form;
    this.activeFormId = form ? 'wizard-step-form' : null; // 👈 the id we’ll use in children

    if (this.activeForm) {
      this.continueDisabled = this.activeForm.invalid;
      this.activeForm.statusChanges?.subscribe(() => {
        this.continueDisabled = this.activeForm!.invalid;
      });
    } else {
      this.continueDisabled = false;
    }

    this.activeChild = instance ?? null; // keep if you use submit hooks
  }

  onBack(): void {
    if (this.isFirstStep) {
      return;
    }
    const prev = this.steps[this.currentIndex - 1];
    this.router.navigate([`/${prev}`]);
  }

  onContinue(): void {
    console.log('in onContinue!!!!!!!!!!!!!');
    if (this.isLastStep) {
      return;
    }

    // If there's a form, prevent navigating on invalid
    if (this.activeForm) {
      this.activeForm.markAllAsTouched();
      if (this.activeForm.invalid) {
        return;
      }
    }

    // If the child exposes a submit(), let it run (optional)
    this.activeChild?.submit?.();

    const next = this.steps[this.currentIndex + 1];
    this.router.navigate([`/${next}`]);
  }
}
