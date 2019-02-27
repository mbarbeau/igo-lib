import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  MatButtonModule,
  MatIconModule,
  MatTooltipModule,
  MatListModule,
  MatMenuModule
} from '@angular/material';

import { IgoLanguageModule } from '@igo2/core';

import { ActionbarComponent } from './actionbar.component';
import { ActionbarItemComponent } from './actionbar-item.component';

/**
 * @ignore
 */
@NgModule({
  imports: [
    CommonModule,
    IgoLanguageModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatListModule
  ],
  exports: [ActionbarComponent],
  declarations: [ActionbarComponent, ActionbarItemComponent]
})
export class IgoActionbarModule {}
