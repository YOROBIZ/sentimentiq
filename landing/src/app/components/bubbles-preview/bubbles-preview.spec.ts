import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BubblesPreview } from './bubbles-preview';

describe('BubblesPreview', () => {
  let component: BubblesPreview;
  let fixture: ComponentFixture<BubblesPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BubblesPreview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BubblesPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
