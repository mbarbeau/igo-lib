import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { MediaService } from '@igo2/core';
import { FlexibleComponent } from './flexible.component';

describe('FlexibleComponent', () => {
  let component: FlexibleComponent;
  let fixture: ComponentFixture<FlexibleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [FlexibleComponent],
      providers: [MediaService]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FlexibleComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
