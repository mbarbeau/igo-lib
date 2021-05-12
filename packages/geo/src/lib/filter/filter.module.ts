import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule, MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';

import {
  MatDatetimepickerModule,
  MatNativeDatetimeModule
} from '@mat-datetimepicker/core';

import { IgoLanguageModule } from '@igo2/core';
import {
  IgoCollapsibleModule,
  IgoListModule,
  IgoKeyValueModule
} from '@igo2/common';
import { IgoGeometryModule } from './../geometry/geometry.module';

import { FilterableDataSourcePipe } from './shared/filterable-datasource.pipe';
import { IgoLayerModule } from '../layer/layer.module';
import { TimeFilterButtonComponent } from './time-filter-button/time-filter-button.component';
import { TimeFilterFormComponent } from './time-filter-form/time-filter-form.component';
import { TimeFilterItemComponent } from './time-filter-item/time-filter-item.component';
import { TimeFilterListBindingDirective } from './time-filter-list/time-filter-list-binding.directive';
import { TimeFilterListComponent } from './time-filter-list/time-filter-list.component';
import { TimeFilterService } from './shared/time-filter.service';

import { OgcFilterFormComponent } from './ogc-filter-form/ogc-filter-form.component';
import { OgcFilterableFormComponent } from './ogc-filterable-form/ogc-filterable-form.component';
import { OgcFilterableItemComponent } from './ogc-filterable-item/ogc-filterable-item.component';
import { OgcFilterableListBindingDirective } from './ogc-filterable-list/ogc-filterable-list-binding.directive';
import { OgcFilterableListComponent } from './ogc-filterable-list/ogc-filterable-list.component';
import { OgcFilterButtonComponent } from './ogc-filter-button/ogc-filter-button.component';
import { OGCFilterService } from './shared/ogc-filter.service';
import { OGCFilterTimeService } from './shared/ogc-filter-time.service';
import { OgcFilterSelectionComponent } from './ogc-filter-selection/ogc-filter-selection.component';

import { SpatialFilterTypeComponent } from './spatial-filter/spatial-filter-type/spatial-filter-type.component';
import { SpatialFilterListComponent } from './spatial-filter/spatial-filter-list/spatial-filter-list.component';
import { SpatialFilterItemComponent } from './spatial-filter/spatial-filter-item/spatial-filter-item.component';
import { SpatialFilterService } from './shared/spatial-filter.service';
import { OgcFilterTimeComponent } from './ogc-filter-time/ogc-filter-time.component';
import { OgcFilterTimeSliderComponent } from './ogc-filter-time/ogc-filter-time-slider.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatRadioModule,
    MatMenuModule,
    MatTableModule,
    MatTreeModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    MatListModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDatetimepickerModule,
    MatNativeDatetimeModule,
    IgoLanguageModule,
    IgoLayerModule,
    IgoCollapsibleModule,
    IgoListModule,
    IgoKeyValueModule,
    IgoGeometryModule,
    MatBadgeModule
  ],
  exports: [
    FilterableDataSourcePipe,
    TimeFilterButtonComponent,
    TimeFilterFormComponent,
    TimeFilterItemComponent,
    TimeFilterListComponent,
    TimeFilterListBindingDirective,
    OgcFilterFormComponent,
    OgcFilterButtonComponent,
    OgcFilterSelectionComponent,
    OgcFilterableFormComponent,
    OgcFilterableItemComponent,
    OgcFilterableListComponent,
    OgcFilterableListBindingDirective,
    SpatialFilterTypeComponent,
    SpatialFilterListComponent,
    SpatialFilterItemComponent,
    OgcFilterTimeComponent,
    OgcFilterTimeSliderComponent
  ],
  declarations: [
    FilterableDataSourcePipe,
    TimeFilterButtonComponent,
    TimeFilterFormComponent,
    TimeFilterItemComponent,
    TimeFilterListComponent,
    TimeFilterListBindingDirective,
    OgcFilterFormComponent,
    OgcFilterButtonComponent,
    OgcFilterSelectionComponent,
    OgcFilterableFormComponent,
    OgcFilterableItemComponent,
    OgcFilterableListComponent,
    OgcFilterableListBindingDirective,
    SpatialFilterTypeComponent,
    SpatialFilterListComponent,
    SpatialFilterItemComponent,
    OgcFilterTimeComponent,
    OgcFilterTimeSliderComponent
  ],
  providers: [TimeFilterService, OGCFilterService, OGCFilterTimeService, SpatialFilterService]
})
export class IgoFilterModule {
  static forRoot(): ModuleWithProviders<IgoFilterModule> {
    return {
      ngModule: IgoFilterModule,
      providers: [
        {
          provide: MAT_DATE_LOCALE,
          useValue: 'fr-FR'
        }
      ]
    };
  }
}
