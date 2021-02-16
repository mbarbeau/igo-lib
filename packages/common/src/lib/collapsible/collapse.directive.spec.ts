import { waitForAsync, inject, TestBed } from '@angular/core/testing';
import { ElementRef, Renderer2 } from '@angular/core';

import { CollapseDirective } from './collapse.directive';

export class MockElementRef extends ElementRef {}

describe('CollapseDirective', () => {
  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        providers: [Renderer2]
      }).compileComponents();
    })
  );

  it(
    'should create an instance',
    inject([Renderer2], (renderer: Renderer2) => {
      const directive = new CollapseDirective(renderer, new MockElementRef({}));
      expect(directive).toBeTruthy();
    })
  );
});
