import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

import { uuid, Clipboard } from '@igo2/utils';
import { MessageService, LanguageService } from '@igo2/core';
import { AuthService } from '@igo2/auth';
import type { IgoMap } from '@igo2/geo';

import { ShareMapService } from '../shared/share-map.service';

@Component({
  selector: 'igo-share-map-api',
  templateUrl: './share-map-api.component.html',
  styleUrls: ['./share-map-api.component.scss']
})
export class ShareMapApiComponent implements OnInit {
  public form: FormGroup;

  @Input() map: IgoMap;

  public url: string;
  public userId: string;
  public idContextShared: string;

  constructor(
    private languageService: LanguageService,
    private messageService: MessageService,
    private auth: AuthService,
    private shareMapService: ShareMapService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    this.auth.authenticate$.subscribe(auth => {
      const decodeToken = this.auth.decodeToken();
      this.userId = decodeToken.user ? decodeToken.user.id : undefined;
      this.buildForm();
    });
  }

  createUrl(values: any = {}) {
    const inputs = Object.assign({}, values);
    inputs.uri = this.userId ? `${this.userId}-${values.uri}` : values.uri;
    this.url = this.shareMapService.getUrlWithApi(inputs);
    this.shareMapService.createContextShared(this.map, inputs).subscribe(
      rep => {
        this.idContextShared = rep.id;
        const title = this.languageService.translate.instant(
          'igo.context.contextManager.dialog.saveTitle'
        );
        const msg = this.languageService.translate.instant('igo.context.contextManager.dialog.saveMsg', {
          value: inputs.title
        });
        this.messageService.success(msg, title);
      },
      err => {
        err.error.title = this.languageService.translate.instant(
          'igo.context.shareMap.errorTitle'
        );
        this.messageService.showError(err);
      }
    );
  }

  updateContextShared(values: any = {}) {
    const inputs = Object.assign({}, values);
    inputs.uri = this.userId ? `${this.userId}-${values.uri}` : values.uri;
    this.shareMapService.updateContextShared(this.map, inputs, this.idContextShared).subscribe(
      rep => {
        const title = this.languageService.translate.instant(
          'igo.context.contextManager.dialog.saveTitle'
        );
        const msg = this.languageService.translate.instant('igo.context.contextManager.dialog.saveMsg', {
          value: inputs.title
        });
        this.messageService.success(msg, title);
      },
      err => {
        err.error.title = this.languageService.translate.instant(
          'igo.context.shareMap.errorTitle'
        );
        this.messageService.showError(err);
      }
    );
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

  buildForm(): void {
    this.url = undefined;
    const id = uuid();
    let title = 'Partage ';
    title += this.userId ? `(${this.userId}-${id})` : `(${id})`;
    this.form = this.formBuilder.group({
      title: [title],
      uri: [id]
    });
  }
}
