import {
  NgModule,
  ModuleWithProviders,
  CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { IgoLanguageModule } from '@igo2/core';
import { IgoCustomHtmlModule, IgoInteractiveTourModule } from '@igo2/common';

import { AboutToolComponent } from './about-tool/about-tool.component';

@NgModule({
  imports: [
    IgoLanguageModule,
    IgoCustomHtmlModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatMenuModule,
    IgoInteractiveTourModule,
    CommonModule
  ],
  declarations: [AboutToolComponent],
  exports: [AboutToolComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class IgoAppAboutModule {
  static forRoot(): ModuleWithProviders<IgoAppAboutModule> {
    return {
      ngModule: IgoAppAboutModule,
      providers: []
    };
  }
}
