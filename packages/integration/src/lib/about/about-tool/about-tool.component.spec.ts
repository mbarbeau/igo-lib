import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { IgoCustomHtmlModule } from '@igo2/common';
import { IgoLanguageModule } from '@igo2/core';
import { AboutToolComponent } from './about-tool.component';

describe('AboutToolComponent', () => {
  let component: AboutToolComponent;
  let fixture: ComponentFixture<AboutToolComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        imports: [IgoLanguageModule, IgoCustomHtmlModule],
        declarations: [AboutToolComponent]
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(AboutToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
