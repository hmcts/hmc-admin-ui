import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestTypeComponent } from './request-type.component';

describe('StartingPage', () => {
  let component: RequestTypeComponent;
  let fixture: ComponentFixture<RequestTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestTypeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RequestTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
