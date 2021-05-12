import { Injectable } from '@angular/core';

import { ConfigService } from '@igo2/core';

@Injectable({
    providedIn: 'root'
  })
export class DrawIconService {

    protected icons: Array<string>;

    constructor(
      protected config: ConfigService
    ) {
        this.getIconsList();
    }

    getIcons() {
        return this.icons;
    }

    getPath(): any {
      return this.config.getConfig('drawingTool.icons') || [];
    }

    getIconsList() {
      this.icons = this.getPath();
    }
}
