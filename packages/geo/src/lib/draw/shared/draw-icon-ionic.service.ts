import { Injectable } from '@angular/core';

import { ConfigService } from '@igo2/core';
import { Platform } from '@ionic/angular';
import { File } from '@ionic-native/file/ngx';
import { DrawIconService } from './draw-icon.service';


@Injectable({
    providedIn: 'root'
  })
export class DrawIconIonicService extends DrawIconService{
    private iconStorage;
    private iconFolder;
    private win: any = window;

    constructor(
      config: ConfigService,
      private platform: Platform,
      private file: File
    ) {
        super(config);
        this.iconStorage = this.getIconStorage();
        this.iconFolder = this.getIconFolder();
        this.getDirElement();
    }

    getIconStorage() {
      return this.config.getConfig('iconStorage') || {};
    }

    getIconFolder() {
      return this.config.getConfig('iconFolder') || {};
    }

    getIcons() {
        return this.icons;
    }

    getDirElement() {
      let iconPath;
      let elementExtension;
      this.icons = [];
      if (this.platform.is('cordova')) {
        this.file.listDir(this.iconStorage, this.iconFolder)
        .then((entries) => {
          entries.forEach(element => {
            elementExtension = this.getFileExtension(element.name);
            if (elementExtension === '.png') {
              iconPath = this.iconStorage + '/' + this.iconFolder + '/' + element.name;
              this.icons.push(this.win.Ionic.WebView.convertFileSrc(iconPath));
            }
          });
        });
      } else {
        super.getIconsList();
      }
    }

    getFileExtension(fileName: string): string {
      const fileNameSize = fileName.length;
      const fileExtension = fileName.substring(fileNameSize - 4, fileNameSize);
      return fileExtension;
    }
}
