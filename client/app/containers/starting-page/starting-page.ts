import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-starting-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './starting-page.html',
  styleUrls: ['./starting-page.css'], // note plural
})
export class StartingPage implements OnInit {
  public supportOptionsForm: FormGroup = {} as FormGroup;
  public hearingPanelRequired = false;
  public validationErrors: { id: string; message: string }[] = [];
  public navigator$: Observable<string>;

  constructor(
    private readonly formBuilder: FormBuilder,
    private store: Store<{ navigation: string }>,
    private router: Router,
    // protected readonly hearingStore: Store<fromHearingStore.State>,
    protected readonly route: ActivatedRoute
  ) {
    // this.navigator$ = this.store.select('navigation');
    this.navigator$ = this.store.pipe(select('navigation'));
    // super(hearingStore, route);
  }
  ngOnInit(): void {
    console.log('router ->', this.router);
    this.initForm();
  }

  public initForm(): void {
    this.supportOptionsForm = this.formBuilder.group({
      supportOptions: [this.navigator$, Validators.required],
    });
  }
}
