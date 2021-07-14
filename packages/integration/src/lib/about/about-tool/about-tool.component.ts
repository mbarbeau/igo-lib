import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';

import { ToolComponent } from '@igo2/common';
import { ConfigService, Version } from '@igo2/core';
import { of } from 'rxjs';
import type { Observable } from 'rxjs';
import { AuthService } from '@igo2/auth';
import { HttpClient } from '@angular/common/http';

@ToolComponent({
  name: 'about',
  title: 'igo.integration.tools.about',
  icon: 'help-circle'
})
@Component({
  selector: 'igo-about-tool',
  templateUrl: './about-tool.component.html',
  styleUrls: ['./about-tool.component.scss']
})
export class AboutToolComponent implements OnInit {
  @Input()
  get html() {
    return this._html;
  }
  set html(value: string) {
    this._html = Array.isArray(value) ? value.join('\n') : value;
  }
  private _discoverTitleInLocale: string = 'IGO';
  public discoverTitleInLocale$: Observable<string> = of(this._discoverTitleInLocale);

  @Input()
  get discoverTitleInLocale() {
    return this._discoverTitleInLocale;
  }
  set discoverTitleInLocale(value: string) {
    this._discoverTitleInLocale = value;
    this.discoverTitleInLocale$ = of(value);
  }

  @Input() trainingGuideURLs;

  public version: Version;
  private _html: string = 'igo.integration.aboutTool.html';

  private baseUrlProfil;
  private baseUrlGuide;

  public loading = false;

  constructor(
    public configService: ConfigService,
    public auth: AuthService,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef) {
    this.version = configService.getConfig('version');
    this.baseUrlProfil = configService.getConfig('context.url') + '/user/igo?';
    this.baseUrlGuide = configService.getConfig('depot.url') + '/projects/Documentation/files/';
  }

  ngOnInit() {
    if (this.auth.authenticated && this.configService.getConfig('context.url')) {
      this.http.get(this.baseUrlProfil).subscribe((profil) => {
        const recast = profil as any;
        this.trainingGuideURLs = recast.guides;
        this.cdRef.detectChanges();
      });
    } else if (
        this.auth.authenticated &&
        !this.configService.getConfig('context.url') &&
        this.configService.getConfig('depot.trainingGuides')) {
          this.trainingGuideURLs = this.configService.getConfig('depot.trainingGuides');
    }
  }

  openGuide(guide?) {
    this.loading = true;
    const url = guide ?
      this.baseUrlGuide + guide + '?' :
      this.baseUrlGuide + this.trainingGuideURLs[0] + '?';
    this.http
    .get(url, {
      responseType: 'blob'
    })
    .subscribe(() => {
      this.loading = false;
      window.open(url, '_blank');
      this.cdRef.detectChanges();
    });
  }

  formatFileName(name: string) {
    name = name.split('_').join(' ');
    const index = name.indexOf('.');
    name = name.slice(0, index);
    return name;
  }
}
