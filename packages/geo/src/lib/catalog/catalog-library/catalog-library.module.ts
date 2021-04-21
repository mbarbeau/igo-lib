import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';

import { IgoListModule } from '@igo2/common';

import { CatalogLibaryComponent, } from './catalog-library.component';
import { CatalogLibaryItemComponent } from './catalog-library-item.component';
import { MatBadgeModule } from '@angular/material/badge';
import { IgoLanguageModule } from '@igo2/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

/**
 * @ignore
 */
@NgModule({
  imports: [
    CommonModule,
    MatIconModule,
    MatBadgeModule,
    MatListModule,
    MatTooltipModule,
    IgoListModule,
    IgoLanguageModule,
    MatButtonModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule
  ],
  exports: [
    CatalogLibaryComponent
  ],
  declarations: [
    CatalogLibaryComponent,
    CatalogLibaryItemComponent
  ]
})
export class IgoCatalogLibraryModule {}
