import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestFunctionComponent } from './request-function.component';

describe('StartingPage', () => {
  let component: RequestFunctionComponent;
  let fixture: ComponentFixture<RequestFunctionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestFunctionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RequestFunctionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
