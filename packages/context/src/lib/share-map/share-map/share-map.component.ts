import { Component, Input } from '@angular/core';

import { ConfigService } from '@igo2/core';
import type { IgoMap } from '@igo2/geo';

@Component({
  selector: 'igo-share-map',
  templateUrl: './share-map.component.html',
  styleUrls: ['./share-map.component.scss']
})
export class ShareMapComponent {

  @Input() map: IgoMap;

  public hasApi = false;

  constructor(
    private config: ConfigService
  ) {
    this.hasApi = this.config.getConfig('context.url') ? true : false;
  }
}
