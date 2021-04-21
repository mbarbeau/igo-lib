import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';

import { IgoLanguageModule } from '@igo2/core';

import { ShareMapComponent } from './share-map/share-map.component';
import { ShareMapUrlComponent } from './share-map/share-map-url.component';
import { ShareMapApiComponent } from './share-map/share-map-api.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatTooltipModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    IgoLanguageModule
  ],
  exports: [ShareMapComponent, ShareMapUrlComponent, ShareMapApiComponent],
  declarations: [ShareMapComponent, ShareMapUrlComponent, ShareMapApiComponent]
})
export class IgoShareMapModule {
  static forRoot(): ModuleWithProviders<IgoShareMapModule> {
    return {
      ngModule: IgoShareMapModule
    };
  }
}
