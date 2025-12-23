import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechBox } from './tech-box';

describe('TechBox', () => {
  let component: TechBox;
  let fixture: ComponentFixture<TechBox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechBox]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TechBox);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
