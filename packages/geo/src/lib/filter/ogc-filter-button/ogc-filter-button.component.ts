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
    let cnt = 0;
    if (filter && !filter.advancedOgcFilters) {
      if (filter.pushButtons) {
        const pushButtons = filter.pushButtons as IgoOgcSelector;
        const currentPushButtonGroup = pushButtons.groups.find(gr => gr.enabled);
        let cntPushButtons = 0;
        if (currentPushButtonGroup) {
          currentPushButtonGroup.computedSelectors.map(cb => cntPushButtons += (cb.selectors as any).filter(
            button => button.enabled).length);
        }
        cnt += cntPushButtons;
      }
      if (filter.checkboxes) {
        const checkboxes = filter.checkboxes as IgoOgcSelector;
        const currentCheckboxGroup = checkboxes.groups.find(gr => gr.enabled);
        let cntCheckboxes = 0;
        if (currentCheckboxGroup) {
          currentCheckboxGroup.computedSelectors.map(cb => cntCheckboxes += (cb.selectors as any).filter(
            checkbox => checkbox.enabled).length);
        }
        cnt += cntCheckboxes;
      }
      if (filter.radioButtons) {
        const radioButtons = filter.radioButtons as IgoOgcSelector;
        const currentRadioButtonsGroup = radioButtons.groups.find(gr => gr.enabled);
        let cntRadioButtons = 0;
        if (currentRadioButtonsGroup) {
          currentRadioButtonsGroup.computedSelectors.map(cb => cntRadioButtons += (cb.selectors as any).filter(
            radio => radio.enabled).length);
        }
        cnt += cntRadioButtons;
      }
      if (filter.select) {
        const select = filter.select as IgoOgcSelector;
        const currentSelectGroup = select.groups.find(gr => gr.enabled);
        let cntSelect = 0;
        if (currentSelectGroup) {
          currentSelectGroup.computedSelectors.map(cb => cntSelect += (cb.selectors as any).filter(
            multi => multi.enabled).length);
        }
        cnt += cntSelect;
      }
    } else if (filter && filter.filters && !filter.filters.filters) {
      return 1;
    } else if (filter && filter.filters && filter.filters.filters) {
      return filter.filters.filters.length;
    }
    return cnt > 0 ? cnt : undefined;
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
