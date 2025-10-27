import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';

@Component({
  selector: 'request-type',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './request-type.component.html',
  styleUrls: ['./request-type.component.css'],
})
export class RequestTypeComponent implements OnInit {
  public requestTypeForm!: FormGroup;
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
    this.requestTypeForm = this.formBuilder.group({
      supportOption: [null, Validators.required] as const,
    });
  }
}
