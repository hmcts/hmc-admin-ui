import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'page2',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './page2.html',
  styleUrls: ['./page2.css'], // note plural
})
export class Page2 implements OnInit, AfterViewInit {
  public hearingPanelRequiredForm: FormGroup = {} as FormGroup;
  public hearingPanelRequired = false;
  public validationErrors: { id: string; message: string }[] = [];

  constructor(
    private readonly formBuilder: FormBuilder,
    // protected readonly hearingStore: Store<fromHearingStore.State>,
    protected readonly route: ActivatedRoute
  ) {
    // super(hearingStore, route);
  }

  public ngOnInit(): void {
    this.hearingPanelRequired = false;
    this.initForm();
  }

  public ngAfterViewInit(): void {
    // this.fragmentFocus();
    console.log('fragmentFocus called');
  }

  public initForm(): void {
    this.hearingPanelRequiredForm = this.formBuilder.group({
      hearingPanelRequired: [this.hearingPanelRequired, Validators.required],
    });
  }
}
