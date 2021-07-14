import {
  Component,
  Input,
  OnInit,
  ViewChild
} from '@angular/core';

import {
  OgcFilterableDataSource,
  IgoOgcFilterObject,
  OgcPushButton,
  OgcSelectorBundle,
  SelectorGroup

} from '../../filter/shared/ogc-filter.interface';
import { OgcFilterWriter } from '../../filter/shared/ogc-filter';
import { IgoMap } from '../../map';
import { OGCFilterService } from '../shared/ogc-filter.service';
import { WMSDataSource } from '../../datasource/shared/datasources/wms-datasource';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { OgcFilterOperator } from '../shared/ogc-filter.enum';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'igo-ogc-filter-selection',
  templateUrl: './ogc-filter-selection.component.html',
  styleUrls: ['./ogc-filter-selection.component.scss']
})
export class OgcFilterSelectionComponent implements OnInit {

  @ViewChild('selection') sel: MatSelect;

  @Input() refreshFilters: () => void;

  @Input() datasource: OgcFilterableDataSource;

  @Input() map: IgoMap;

  @Input() checkboxesIndex = 5;
  @Input() radioButtonsIndex = 5;
  @Input() baseIndex = 5;

  @Input()
  get currentFilter(): any {
    return this._currentFilter;
  }
  set currentFilter(value) {
    this._currentFilter = value;
    if (this._currentFilter?.sliderOptions) {
      this._currentFilter.sliderOptions.enabled = false; // remove slider toggle (animation temporelle)
    }
  }
  private _currentFilter: any;

  public ogcFilterOperator = OgcFilterOperator;

  public form: FormGroup;
  private ogcFilterWriter: OgcFilterWriter;
  public color = 'primary';
  public allSelected = false;
  public select = new FormControl();
  public enabled$ = new BehaviorSubject(undefined);
  public enableds$ = new BehaviorSubject([]);

  public applyFiltersTimeout;

  get ogcFiltersSelectors() {
    const ogcSelector = [];
    if (this.datasource?.options?.ogcFilters?.pushButtons) {
      ogcSelector.push(this.datasource?.options?.ogcFilters?.pushButtons);
    }
    if (this.datasource?.options?.ogcFilters?.checkboxes) {
      ogcSelector.push(this.datasource?.options?.ogcFilters?.checkboxes);
    }
    if (this.datasource?.options?.ogcFilters?.radioButtons) {
      ogcSelector.push(this.datasource?.options?.ogcFilters?.radioButtons);
    }
    if (this.datasource?.options?.ogcFilters?.select) {
      ogcSelector.push(this.datasource?.options?.ogcFilters?.select);
    }
    ogcSelector.sort((a, b) => {
      if (a.order < b.order) {
        return -1;
      }
      if (a.order > b.order) {
        return 1;
      }
      return 0;
    });
    return ogcSelector;
  }

  get currentPushButtonsGroup() {
    return this.form.get('pushButtonsGroup').value;
  }
  set currentPushButtonsGroup(value) {
    this.form.patchValue({ pushButtonsGroup: value });
  }

  get currentCheckboxesGroup() {
    return this.form.get('checkboxesGroup').value;
  }
  set currentCheckboxesGroup(value) {
    this.form.patchValue({ checkboxesGroup: value });
  }

  get currentRadioButtonsGroup() {
    return this.form.get('radioButtonsGroup').value;
  }
  set currentRadioButtonsGroup(value) {
    this.form.patchValue({ radioButtonsGroup: value });
  }

  get currentSelectGroup() {
    return this.form.get('selectGroup').value;
  }
  set currentSelectGroup(value) {
    this.form.patchValue({ selectGroup: value });
  }

  get enabled() {
    return this.enabled$.value;
  }

  set enabled(value) {
    this.enabled$.next(value);
    clearTimeout(this.applyFiltersTimeout);
    this.currentSelectGroup.computedSelectors.forEach(compSelect => {
      compSelect.selectors.forEach(selector => {
        value === selector ? selector.enabled = true : selector.enabled = false;
      });
    });

    this.applyFiltersTimeout = setTimeout(() => {
      this.applyFilters();
    }, 750);
  }

  get enableds() {
    return this.enableds$.value;
  }

  set enableds(value) {
    this.enableds$.next(value);
    clearTimeout(this.applyFiltersTimeout);
    this.currentSelectGroup.computedSelectors.forEach(compSelect => {
      compSelect.selectors.forEach(selector => {
        value.includes(selector) ? selector.enabled = true : selector.enabled = false;
      });
    });

    this.applyFiltersTimeout = setTimeout(() => {
      this.applyFilters();
    }, 750);
  }

  constructor(
    private ogcFilterService: OGCFilterService,
    private formBuilder: FormBuilder,
  ) {
    this.ogcFilterWriter = new OgcFilterWriter();
    this.buildForm();
  }

  private buildForm() {
    this.form = this.formBuilder.group({
      pushButtons: ['', [Validators.required]],
      radioButtons: ['', [Validators.required]],
      pushButtonsGroup: ['', [Validators.required]],
      checkboxesGroup: ['', [Validators.required]],
      radioButtonsGroup: ['', [Validators.required]],
      selectGroup: ['', [Validators.required]],
    });
  }

  getPushButtonsGroups(): SelectorGroup[] {
    if (this.datasource?.options?.ogcFilters?.pushButtons) {
      return this.datasource.options.ogcFilters.pushButtons.groups;
    }
  }

  getCheckboxesGroups(): SelectorGroup[] {
    if (this.datasource?.options?.ogcFilters?.checkboxes) {
      return this.datasource.options.ogcFilters.checkboxes.groups;
    }
  }

  getRadioButtonsGroups(): SelectorGroup[] {
    if (this.datasource?.options?.ogcFilters?.radioButtons) {
      return this.datasource.options.ogcFilters.radioButtons.groups;
    }
  }

  getSelectGroups(): SelectorGroup[] {
    if (this.datasource?.options?.ogcFilters?.select) {
      return this.datasource.options.ogcFilters.select.groups;
    }
  }

  ngOnInit() {
    if (this.datasource.options.ogcFilters) {
      if (this.datasource.options.ogcFilters.pushButtons) {
        this.currentPushButtonsGroup =
          this.datasource.options.ogcFilters.pushButtons.groups.find(group => group.enabled) ||
          this.datasource.options.ogcFilters.pushButtons.groups[0];
      }
      if (this.datasource.options.ogcFilters.checkboxes) {
        this.currentCheckboxesGroup =
          this.datasource.options.ogcFilters.checkboxes.groups.find(group => group.enabled) ||
          this.datasource.options.ogcFilters.checkboxes.groups[0];
      }
      if (this.datasource.options.ogcFilters.radioButtons) {
        this.currentRadioButtonsGroup =
          this.datasource.options.ogcFilters.radioButtons.groups.find(group => group.enabled) ||
          this.datasource.options.ogcFilters.radioButtons.groups[0];
      }
      if (this.datasource.options.ogcFilters.select) {
        this.currentSelectGroup =
          this.datasource.options.ogcFilters.select.groups.find(group => group.enabled) ||
          this.datasource.options.ogcFilters.select.groups[0];
        this.getSelectEnabled();
      }
      this.applyFilters();
    }

    this.form
    .get('pushButtonsGroup')
    .valueChanges
    .pipe(debounceTime(750))
    .subscribe(() => {
      this.onPushButtonsChangeGroup();
      this.applyFilters();
      });
    this.form
    .get('checkboxesGroup')
    .valueChanges
    .pipe(debounceTime(750))
    .subscribe(() => {
      this.onCheckboxesChangeGroup();
      this.applyFilters();
      });
    this.form
      .get('radioButtonsGroup')
      .valueChanges
      .pipe(debounceTime(750))
      .subscribe(() => {
        this.onRadioButtonsChangeGroup();
        this.applyFilters();
      });
    this.form
      .get('selectGroup')
      .valueChanges
      .pipe(debounceTime(750))
      .subscribe(() => {
        this.onSelectChangeGroup();
        this.applyFilters();
      });
    this.form
      .get('pushButtons')
      .valueChanges
      .pipe(debounceTime(750))
      .subscribe(() => {
        this.applyFilters();
      });
    this.form
      .get('radioButtons')
      .valueChanges
      .pipe(debounceTime(750))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  private getSelectEnabled() {
    const enableds = [];
    let enabled;
    this.currentSelectGroup.computedSelectors.forEach(compSelect => {
      if (compSelect.multiple) {
        compSelect.selectors.forEach(selector => {
          if (selector.enabled) {
            enableds.push(selector);
          }
        });
        this.enableds = enableds;
      } else {
        compSelect.selectors.forEach(selector => {
          if (selector.enabled) {
            enabled = selector;
          }
        });
        this.enabled = enabled;
      }
    });
  }

  getToolTip(selector): string  {
    let toolTip;
    if (selector.tooltip) {
      if (Array.isArray(selector.tooltip)) {
        toolTip = selector.tooltip.join('\n');
      } else {
        toolTip = selector.tooltip;
      }
    }
    return toolTip || '';
  }

  // getButtonStyle(pb: OgcPushButton): {} {

  //   let styles;
  //   if (pb.color) {
  //     styles = {
  //       'background-color': pb.enabled ? `rgba(${pb.color})` : `rgba(255,255,255,0)`
  //     };
  //   } else {
  //     styles = {
  //       'background-color': pb.enabled ? 'accent': `rgba(255,255,255,0)`,
  //       'color': pb.enabled ? `rgba(0,0,0,0.9)` : `rgba(33,33,33,0.38)`
  //     }
  //   }
  //   return styles;
  // }

  getButtonColor(pushButton: OgcPushButton): {} {
    let styles;
    if (pushButton.color && pushButton.enabled) {
      styles = {
        'background-color': `rgba(${pushButton.color})`
      };
    }
    return styles;
  }

  bundleIsVertical(bundle: OgcSelectorBundle): boolean {
    return bundle.vertical ? bundle.vertical : false;
  }

  private onPushButtonsChangeGroup() {
    this.getPushButtonsGroups().map(group => group.enabled = false);
    this.getPushButtonsGroups().find(group => group === this.currentPushButtonsGroup).enabled = true;
  }

  private onCheckboxesChangeGroup() {
    this.getCheckboxesGroups().map(group => group.enabled = false);
    this.getCheckboxesGroups().find(group => group === this.currentCheckboxesGroup).enabled = true;
  }

  private onRadioButtonsChangeGroup() {
    this.getRadioButtonsGroups().map(group => group.enabled = false);
    this.getRadioButtonsGroups().find(group => group === this.currentRadioButtonsGroup).enabled = true;
  }

  private onSelectChangeGroup() {
    this.getSelectGroups().map(group => group.enabled = false);
    this.getSelectGroups().find(group => group === this.currentSelectGroup).enabled = true;
  }

  onSelectionChange(currentOgcSelection?, selectorType?) {
    clearTimeout(this.applyFiltersTimeout);
    if (selectorType === 'radioButton') {
      this.emptyRadioButtons();
    }

    if (currentOgcSelection) {
      currentOgcSelection.enabled = !currentOgcSelection.enabled;
    }
    this.applyFiltersTimeout = setTimeout(() => {
      this.applyFilters();
    }, 750);
  }

  emptyRadioButtons() {
    this.currentRadioButtonsGroup.computedSelectors.forEach(compSelect => {
      compSelect.selectors.map(selector => selector.enabled = false);

      this.applyFiltersTimeout = setTimeout(() => {
        this.applyFilters();
      }, 750);
   });
  }

  emptySelect() {
    this.enabled = [];
  }

  toggleAllSelection() {
    if (this.allSelected) {
      this.sel.options.forEach((item: MatOption) => item.select());
    } else {
      this.sel.options.forEach((item: MatOption) => item.deselect());
    }
  }

  optionClick() {
    let newStatus = true;
    this.sel.options.forEach((item: MatOption) => {
      if (!item.selected) {
        newStatus = false;
      }
    });
    this.allSelected = newStatus;
  }

  private applyFilters() {
    let filterQueryString = '';
    const conditions = [];
    const currentGroups = [this.currentPushButtonsGroup, this.currentCheckboxesGroup,
      this.currentRadioButtonsGroup, this.currentSelectGroup];
    for (const currentGroup of currentGroups) {
      if (currentGroup.computedSelectors) {
        currentGroup.computedSelectors.map(selectorBundle => {
          const bundleCondition = [];
          selectorBundle.selectors
          .filter(ogcSelector => ogcSelector.enabled === true)
          .forEach(enabledSelector => bundleCondition.push(enabledSelector.filters));
          if (bundleCondition.length >= 1 ) {
            if (bundleCondition.length === 1) {
              conditions.push(bundleCondition[0]);
            } else {
              conditions.push({logical: selectorBundle.logical, filters: bundleCondition});
            }
          }
        });
      }
    }
    if (this.isTemporalOperator()) {
      conditions.push(this.datasource.options.ogcFilters.interfaceOgcFilters[0]);
    }
    if (conditions.length >= 1) {
      filterQueryString = this.ogcFilterWriter
        .buildFilter(conditions.length === 1 ?
          conditions[0] : {logical: 'And', filters: conditions } as IgoOgcFilterObject);
    }
    if (this.datasource.options.type === 'wms') {
      this.ogcFilterService.filterByOgc(this.datasource as WMSDataSource, filterQueryString );
    }
    if (this.datasource.options.type === 'wfs') {
      // TODO: Check how to prevent wfs to refresh when filter icon is pushed...
      this.datasource.ol.refresh();
    }
    this.datasource.setOgcFilters(this.datasource.options.ogcFilters, true);
  }

  isMoreResults(bundle, type) {
    let selectorsLength = 0;
    for (const selectors of bundle.selectors) {
      selectorsLength++;
    }
    const index = type === 'radio' ? this.radioButtonsIndex : this.checkboxesIndex;
    return selectorsLength > index;
  }

  displayMoreResults(type) {
    type === 'radio' ? this.radioButtonsIndex += 5 : this.checkboxesIndex += 5;
    return;
  }

  isLessResults(bundle, type) {
    let selectorsLength = 0;
    for (const selectors of bundle.selectors) {
      selectorsLength++;
    }
    const index = type === 'radio' ? this.radioButtonsIndex : this.checkboxesIndex;
    return this.baseIndex !== index && selectorsLength > this.baseIndex;
  }

  displayLessResults(type) {
    type === 'radio' ? this.radioButtonsIndex = this.baseIndex : this.checkboxesIndex = this.baseIndex;
    return;
  }

  isTemporalOperator() {
    return (
      this.currentFilter?.operator?.toLowerCase() ===
      this.ogcFilterOperator.During.toLowerCase()
    );
  }

  changeProperty(value: any, pos?: number, refreshFilter = true) {
    const detectedProperty = this.detectProperty(pos);
    if (detectedProperty) {
      this.datasource.options.ogcFilters.interfaceOgcFilters.find(
        filter => filter.filterid === this.currentFilter.filterid
      )[detectedProperty] = value;

      if ( refreshFilter ) {
        this.applyFilters();
      }
    }
  }

  detectProperty(pos?: number): string {
    switch (this.currentFilter.operator) {
      case OgcFilterOperator.PropertyIsNotEqualTo:
      case OgcFilterOperator.PropertyIsEqualTo:
      case OgcFilterOperator.PropertyIsGreaterThan:
      case OgcFilterOperator.PropertyIsGreaterThanOrEqualTo:
      case OgcFilterOperator.PropertyIsLessThan:
      case OgcFilterOperator.PropertyIsLessThanOrEqualTo:
        return 'expression';
      case OgcFilterOperator.PropertyIsLike:
        return 'pattern';
      case OgcFilterOperator.PropertyIsBetween:
        return pos && pos === 1
          ? 'lowerBoundary'
          : pos && pos === 2
          ? 'upperBoundary'
          : undefined;
      case OgcFilterOperator.During:
        return pos && pos === 1
          ? 'begin'
          : pos && pos === 2
          ? 'end'
          : undefined;
      default:
        return;
    }
  }
}
