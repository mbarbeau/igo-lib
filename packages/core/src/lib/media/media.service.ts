import { Injectable } from '@angular/core';
import { Breakpoints, BreakpointObserver } from '@angular/cdk/layout';

import { BehaviorSubject } from 'rxjs';

import { Media, MediaOrientation } from './media.enum';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  public media$ = new BehaviorSubject<Media>(undefined);
  public orientation$ = new BehaviorSubject<MediaOrientation>(undefined);

  constructor(breakpointObserver: BreakpointObserver) {
    breakpointObserver
      .observe([Breakpoints.HandsetLandscape])
      .subscribe(res => {
        if (res.matches) {
          this.media$.next(Media.Mobile);
          this.orientation$.next(MediaOrientation.Landscape);
        }
      });

    breakpointObserver.observe([Breakpoints.HandsetPortrait]).subscribe(res => {
      if (res.matches) {
        this.media$.next(Media.Mobile);
        this.orientation$.next(MediaOrientation.Portrait);
      }
    });

    breakpointObserver.observe([Breakpoints.TabletLandscape]).subscribe(res => {
      if (res.matches) {
        this.media$.next(Media.Tablet);
        this.orientation$.next(MediaOrientation.Landscape);
      }
    });

    breakpointObserver.observe([Breakpoints.TabletPortrait]).subscribe(res => {
      if (res.matches) {
        this.media$.next(Media.Tablet);
        this.orientation$.next(MediaOrientation.Portrait);
      }
    });

    breakpointObserver.observe([Breakpoints.WebLandscape]).subscribe(res => {
      if (res.matches) {
        this.media$.next(Media.Desktop);
        this.orientation$.next(MediaOrientation.Landscape);
      }
    });

    breakpointObserver.observe([Breakpoints.WebPortrait]).subscribe(res => {
      if (res.matches) {
        this.media$.next(Media.Desktop);
        this.orientation$.next(MediaOrientation.Portrait);
      }
    });
  }

  getMedia(): Media {
    return this.media$.value;
  }

  getOrientation(): MediaOrientation {
    return this.orientation$.value;
  }

  isTouchScreen(): boolean {
    return 'ontouchstart' in document.documentElement ? true : false;
  }

  isMobile(): boolean {
    const media = this.getMedia();
    return media === 'mobile';
  }

  isDesktop(): boolean {
    const media = this.getMedia();
    return media === 'desktop';
  }
}
