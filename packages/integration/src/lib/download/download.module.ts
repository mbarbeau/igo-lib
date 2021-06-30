import { CUSTOM_ELEMENTS_SCHEMA, ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DownloadToolComponent } from './download-tool';
import { MatCarouselModule } from '@ngbmodule/material-carousel';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleRequiredValidator } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RegionEditorComponent } from './region-editor/region-editor.component';
import { RegionManagerComponent } from './region-manager/region-manager.component';
import { MatTableModule } from '@angular/material/table';
import { MatRippleModule } from '@angular/material/core';

@NgModule({
  imports: [
    BrowserAnimationsModule,
    CommonModule,
    MatCarouselModule,
    MatCardModule,
    MatSliderModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTabsModule,
    FormsModule,
    MatTableModule,
    MatRippleModule
  ],
  declarations: [
    DownloadToolComponent,
    RegionEditorComponent,
    RegionManagerComponent
  ],
  exports: [DownloadToolComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class IgoAppDownloadModule {
  static forRoot(): ModuleWithProviders<IgoAppDownloadModule> {
    return {
      ngModule: IgoAppDownloadModule,
      providers: []
    };
  }
 }