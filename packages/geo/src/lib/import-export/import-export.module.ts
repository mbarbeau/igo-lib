import { NgModule, ModuleWithProviders } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  MatButtonModule,
  MatTabsModule,
  MatSelectModule,
  MatOptionModule,
  MatFormFieldModule,
  MatInputModule
} from '@angular/material';

import { IgoLanguageModule } from '@igo2/core';
import { IgoKeyValueModule, IgoDrapDropModule, IgoSpinnerModule } from '@igo2/common';

import { ImportExportComponent } from './import-export/import-export.component';
import { DropGeoFileDirective } from './shared/drop-geo-file.directive';
import { DropGeoFileLayerDirective } from './shared/drop-geo-file-layer.directive';

@NgModule({
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatButtonModule,
    MatTabsModule,
    MatSelectModule,
    MatOptionModule,
    MatFormFieldModule,
    MatInputModule,
    IgoLanguageModule,
    IgoSpinnerModule,
    IgoKeyValueModule,
    IgoDrapDropModule
  ],
  exports: [ImportExportComponent, DropGeoFileDirective, DropGeoFileLayerDirective],
  declarations: [ImportExportComponent, DropGeoFileDirective, DropGeoFileLayerDirective]
})
export class IgoImportExportModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: IgoImportExportModule
    };
  }
}
