import { Component, Input } from '@angular/core';
import { OgcFilterableDataSource } from '../shared/ogc-filter.interface';
import { IgoMap } from '../../map';

@Component({
  selector: 'igo-ogc-filterable-form',
  templateUrl: './ogc-filterable-form.component.html'
})
export class OgcFilterableFormComponent {

  @Input() datasource: OgcFilterableDataSource;

  @Input() map: IgoMap;

  @Input() refreshFilters: () => void;

  get refreshFunc() {
    return this.refreshFilters;
  }

  get advancedOgcFilters(): boolean {
    if (this.datasource.options.ogcFilters) {
      return this.datasource.options.ogcFilters.advancedOgcFilters;
    }
    return;
  }

  get currentFilter(): any {
    return this.datasource.options.ogcFilters.interfaceOgcFilters ?
    this.datasource.options.ogcFilters.interfaceOgcFilters[0] : undefined;
  }

  public color = 'primary';

  constructor() {}
}
