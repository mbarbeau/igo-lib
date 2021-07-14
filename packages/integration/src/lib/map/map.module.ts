import {
  NgModule,
  ModuleWithProviders,
  CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { IgoLanguageModule } from '@igo2/core';
import {
  IgoLayerModule,
  IgoMetadataModule,
  IgoDownloadModule,
  IgoFilterModule,
  IgoImportExportModule
} from '@igo2/geo';

import { IgoContextModule } from '@igo2/context';

import { MapDetailsToolComponent } from './map-details-tool/map-details-tool.component';
import { MapToolComponent } from './map-tool/map-tool.component';
import { MapToolsComponent } from './map-tools/map-tools.component';
import { MapLegendToolComponent } from './map-legend/map-legend-tool.component';
import { IgoAppWorkspaceModule } from '../workspace/workspace.module';

@NgModule({
  imports: [
    CommonModule,
    MatTabsModule,
    MatListModule,
    MatIconModule,
    IgoLanguageModule,
    IgoLayerModule,
    IgoMetadataModule,
    IgoDownloadModule,
    IgoImportExportModule,
    IgoFilterModule,
    IgoContextModule,
    IgoAppWorkspaceModule,
    MatMenuModule,
    MatButtonModule,
    MatTooltipModule
  ],
  declarations: [MapToolComponent, MapToolsComponent, MapDetailsToolComponent, MapLegendToolComponent],
  exports: [MapToolComponent, MapToolsComponent, MapDetailsToolComponent, MapLegendToolComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class IgoAppMapModule {
  static forRoot(): ModuleWithProviders<IgoAppMapModule> {
    return {
      ngModule: IgoAppMapModule,
      providers: []
    };
  }
}
