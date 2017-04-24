import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '@angular/material';
import { TranslateModule } from '@ngx-translate/core';

import { ClickoutDirective } from './clickout';
import { CollapsibleComponent, CollapseDirective } from './collapsible';
import { KeyvaluePipe } from './keyvalue';
import { ListComponent, ListItemDirective } from './list';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpModule,
    MaterialModule,
    TranslateModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    HttpModule,
    BrowserAnimationsModule,
    MaterialModule,
    TranslateModule,
    ClickoutDirective,
    CollapsibleComponent,
    CollapseDirective,
    KeyvaluePipe,
    ListComponent,
    ListItemDirective
  ],
  declarations: [
    ClickoutDirective,
    CollapsibleComponent,
    CollapseDirective,
    KeyvaluePipe,
    ListComponent,
    ListItemDirective
  ]
})
export class IgoSharedModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: IgoSharedModule,
      providers: []
    };
  }
}

export * from './collapsible';
export * from './clickout';
export * from './keyvalue';
export * from './list';
