import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-starting-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './starting-page.html',
  styleUrls: ['./starting-page.css'],
})
export class StartingPage implements OnInit {
  public supportOptionsForm!: FormGroup;
  public hearingPanelRequired = false;
  public validationErrors: { id: string; message: string }[] = [];
  public navigator$: Observable<string>;

  constructor(
    private readonly formBuilder: FormBuilder,
    private store: Store<{ navigation: string }>,
    protected readonly route: ActivatedRoute
  ) {
    this.navigator$ = this.store.pipe(select('navigation')); // keep if you need it later
  }

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.supportOptionsForm = this.formBuilder.group({
      supportOption: [null, Validators.required] as const,
    });
  }

  onSubmit(): void {
    const value = this.supportOptionsForm.value.supportOption as boolean | null;
    if (value === null) {
      this.validationErrors = [{ id: 'supportOption', message: 'Select an option' }];
      return;
    }
  }
}
