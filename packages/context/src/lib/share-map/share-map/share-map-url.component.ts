import { AfterViewInit, Component, Input, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';

import { Clipboard } from '@igo2/utils';
import { MessageService, LanguageService } from '@igo2/core';
import type { IgoMap } from '@igo2/geo';

import { ShareMapService } from '../shared/share-map.service';
import { combineLatest, Subscription } from 'rxjs';

@Component({
  selector: 'igo-share-map-url',
  templateUrl: './share-map-url.component.html',
  styleUrls: ['./share-map-url.component.scss']
})
export class ShareMapUrlComponent implements AfterViewInit, OnInit, OnDestroy {
  private mapState$$: Subscription;

  @Input() map: IgoMap;

  public url: string;
  public publicShareOption = {
    layerlistControls: { querystring: '' }
  };

  constructor(
    private languageService: LanguageService,
    private messageService: MessageService,
    private shareMapService: ShareMapService,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.resetUrl();
    this.mapState$$ = combineLatest([
      this.map.viewController.state$,
      this.map.status$]).subscribe(c => {
        this.resetUrl();
        this.cdRef.detectChanges();
      });
  }

  ngAfterViewInit(): void {
    this.resetUrl();
  }

  ngOnDestroy(): void {
    this.mapState$$.unsubscribe();
  }

  resetUrl(values: any = {}) {
    this.url = this.shareMapService.getUrlWithoutApi(this.map, this.publicShareOption);
  }

  copyTextToClipboard(textArea) {
    const successful = Clipboard.copy(textArea);
    if (successful) {
      const translate = this.languageService.translate;
      const title = translate.instant(
        'igo.context.shareMap.dialog.copyTitle'
      );
      const msg = translate.instant('igo.context.shareMap.dialog.copyMsg');
      this.messageService.success(msg, title);
    }
  }
}
