import { Component, Input, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';

import { getEntityTitle } from '@igo2/common';
import { IgoMap } from '../../map';
import { Catalog } from '../shared/catalog.abstract';

/**
 * Catalog library item
 */
@Component({
  selector: 'igo-catalog-library-item',
  templateUrl: './catalog-library-item.component.html',
  styleUrls: ['./catalog-library-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogLibaryItemComponent {

  /**
   * Catalog
   */
  @Input() catalog: Catalog;

  /**
   * Map to add the catalog items to
   */
  @Input() map: IgoMap;

  @Output() catalogRemove = new EventEmitter();

  /**
   * @internal
   */
  get title(): string { return getEntityTitle(this.catalog); }

  removeCatalogFromLibrary(event) {
    event.stopPropagation();
    this.catalogRemove.emit();
  }
}
