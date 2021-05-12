import { Component, Input, ChangeDetectionStrategy, OnInit } from '@angular/core';

import { Layer } from '../../layer/shared/layers/layer';
import { IgoMap } from '../../map';
import { OgcFilterableDataSourceOptions, IgoOgcSelector, OgcFiltersOptions } from '../shared/ogc-filter.interface';

@Component({
  selector: 'igo-ogc-filter-button',
  templateUrl: './ogc-filter-button.component.html',
  styleUrls: ['./ogc-filter-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OgcFilterButtonComponent implements OnInit {

  public options: OgcFilterableDataSourceOptions;

  get badge() {
    const filter = this.options.ogcFilters as any;
    if (filter && !filter.advancedOgcFilters) {
      if (filter.pushButtons) {
        const pushButtons = filter.pushButtons as IgoOgcSelector;
        const currentPushButtonGroup = pushButtons.groups.find(gr => gr.enabled);
        let cntPushButtons = 0;
        if (currentPushButtonGroup) {
          currentPushButtonGroup.computedSelectors.map(cb => cntPushButtons += (cb.selectors as any).filter(
            button => button.enabled).length);
        }
        return cntPushButtons > 0 ? cntPushButtons : undefined;
      } else if (filter.checkboxes) {
        const checkboxes = filter.checkboxes as IgoOgcSelector;
        const currentCheckboxGroup = checkboxes.groups.find(gr => gr.enabled);
        let cntCheckboxes = 0;
        if (currentCheckboxGroup) {
          currentCheckboxGroup.computedSelectors.map(cb => cntCheckboxes += (cb.selectors as any).filter(
            checkbox => checkbox.enabled).length);
        }
        return cntCheckboxes > 0 ? cntCheckboxes : undefined;
      } else if (filter.radioButtons) {
        const radioButtons = filter.radioButtons as IgoOgcSelector;
        const currentRadioButtonsGroup = radioButtons.groups.find(gr => gr.enabled);
        let cntRadioButtons = 0;
        if (currentRadioButtonsGroup) {
          currentRadioButtonsGroup.computedSelectors.map(cb => cntRadioButtons += (cb.selectors as any).filter(
            checkbox => checkbox.enabled).length);
        }
        return cntRadioButtons > 0 ? cntRadioButtons : undefined;
      } else {
        return;
      }
    } else if (filter && filter.filters && !filter.filters.filters) {
      return 1;
    } else if (filter && filter.filters && filter.filters.filters) {
      return filter.filters.filters.length;
    }
  }

  @Input()
  get layer(): Layer {
    return this._layer;
  }
  set layer(value: Layer) {
    this._layer = value;
    if (value) {
      this.options = this.layer.dataSource.options as OgcFilterableDataSourceOptions;
    }
  }
  private _layer;

  @Input() map: IgoMap;

  @Input() color: string = 'primary';

  @Input() header: boolean;

  public ogcFilterCollapse = false;

  constructor() {}

  ngOnInit() {
    this.options = this.layer.dataSource.options as OgcFilterableDataSourceOptions;
  }
}
