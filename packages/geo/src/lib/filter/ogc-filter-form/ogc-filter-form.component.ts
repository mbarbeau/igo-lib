import { Component, Input, OnInit } from '@angular/core';
import { FloatLabelType } from '@angular/material/form-field';
import { BehaviorSubject, Observable, of } from 'rxjs';

import {
  OgcFilterableDataSource,
  OgcFiltersOptions
} from '../../filter/shared/ogc-filter.interface';
import { OgcFilterWriter } from '../../filter/shared/ogc-filter';
import { WktService } from '../../wkt/shared/wkt.service';
import { IgoMap } from '../../map';
import { SourceFieldsOptionsParams } from '../../datasource/shared/datasources/datasource.interface';
import { OgcFilterOperator } from '../../filter/shared/ogc-filter.enum';

@Component({
  selector: 'igo-ogc-filter-form',
  templateUrl: './ogc-filter-form.component.html',
  styleUrls: ['./ogc-filter-form.component.scss']
})
export class OgcFilterFormComponent implements OnInit {
  ogcFilterOperator = OgcFilterOperator;
  filteredValues$: Observable<string[]>;
  filteredFields$: Observable<SourceFieldsOptionsParams[]>;
  public allOgcFilterOperators;
  public ogcFilterOperators$ = new BehaviorSubject<{ [key: string]: any }>(
    undefined
  );
  public igoSpatialSelectors;
  public value = '';
  public inputOperator;
  public selectedField$ = new BehaviorSubject<SourceFieldsOptionsParams>(
    undefined
  );
  public fields$ = new BehaviorSubject<SourceFieldsOptionsParams[]>([]);
  public color = 'primary';
  public disabled;
  public currentFilterIsSpatial$ = new BehaviorSubject<boolean>(false);
  public defaultStepMillisecond = 6000;
  public inputClearable: string;

  @Input() refreshFilters: () => void;

  @Input() datasource: OgcFilterableDataSource;

  @Input() map: IgoMap;

  @Input() currentFilter: any;

  set snrc(value: any) {
    const checkSNRC50k = /^\d{2}[a-l][0,1][0-9]$/gi;
    const checkSNRC250k = /^\d{2}[a-p]$/gi;
    const checkSNRC1m = /^\d{2}$/gi;
    if (
      checkSNRC1m.test(value) ||
      checkSNRC250k.test(value) ||
      checkSNRC50k.test(value)
    ) {
      this._snrc = value;
      this.currentFilter.igoSNRC = value;
    }
  }

  get snrc(): any {
    return this._snrc;
  }

  private _snrc = '';

  @Input() floatLabel: FloatLabelType = 'never';

  get activeFilters() {
    return this.datasource.options.ogcFilters.interfaceOgcFilters.filter(
      (f) => f.active === true
    );
  }

  get allowedOperators() {
    return new OgcFilterWriter().computeAllowedOperators(
      this.fields$.value,
      this.currentFilter.propertyName,
      this.datasource.options.ogcFilters.allowedOperatorsType
    );
  }

  constructor(private wktService: WktService) {
    // TODO: Filter permitted operator based on wfscapabilities
    // Need to work on regex on XML capabilities because
    // comaparison operator's name varies between WFS servers...
    // Ex: IsNull vs PropertyIsNull vs IsNil ...
    this.allOgcFilterOperators = new OgcFilterWriter().operators;
    this.ogcFilterOperators$.next(this.allOgcFilterOperators);
    this.igoSpatialSelectors = [
      {
        type: 'fixedExtent'
      },
      {
        type: 'snrc'
      }
    ];
    // TODO: selectFeature & drawFeature
  }

  ngOnInit() {

    if ( this.datasource.options.sourceFields) {
      const sFields = this.datasource.options.sourceFields.filter(
        (sf) =>
          sf.excludeFromOgcFilters === undefined || !sf.excludeFromOgcFilters
      );
      sFields.map((sfs) => {
        if (sfs.values) {
          sfs.values.sort();
        }
      });
      this.fields$.next(sFields);
    }

    this.updateFieldsList();
    this.selectedField$.next(
      this.fields$.value.find((f) => f.name === this.currentFilter.propertyName)
    );
    this.updateValuesList();
    this.selectedField$.subscribe((f) => {
      this.ogcFilterOperators$.next(this.allowedOperators);
      if (
        Object.keys(this.allowedOperators).indexOf(
          this.currentFilter.operator
        ) === -1
      ) {
        this.currentFilter.operator = Object.keys(this.allowedOperators)[0];
        this.currentFilter.operator = Object.keys(this.allowedOperators)[0];
      }
      this.updateValuesList();
    });
    this.currentFilterIsSpatial();
  }

  updateFieldsList(value?: string) {
    this.filteredFields$ =
      value && value.length > 0 ? of(this._filterFields(value)) : this.fields$;
    if (this.fields$.value.find((f) => f.name === value)) {
      this.changeField(value);
    }
  }

  updateValuesList(value?: string, pos?: number) {
    this.filteredValues$ =
      value && value.length > 0
        ? of(this._filterValues(value))
        : this.selectedField$.value
        ? of(this.selectedField$.value.values)
        : of([]);
    if (value && value.length >= 1) {
      this.changeProperty(value, pos);
    }
  }

  private _filterFields(value: string): SourceFieldsOptionsParams[] {
    const keywordRegex = new RegExp(
      value.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      'gi'
    );
    return this.fields$.value.filter((val) =>
      keywordRegex.test(
        val.alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      )
    );
  }

  private _filterValues(value: string): string[] {
    const keywordRegex = new RegExp(
      value
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''),
      'gi'
    );
    return this.selectedField$.value.values.filter((val) =>
      val && keywordRegex.test(
        val
          .toString()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
      )
    );
  }

  clearSelectedField() {
    this.currentFilter.propertyName = '';
    this.selectedField$.next(undefined);
    this.clearProperty();
  }

  isClearable(pos?: number) {
    const detectedProperty = this.detectProperty(pos);
    if (detectedProperty) {
      return this.currentFilter[detectedProperty];
    }
  }
  clearProperty(pos?: number) {
    // this.autoCompleteInputValues.closePanel();
    const detectedProperty = this.detectProperty(pos);
    if (detectedProperty) {
      return (this.currentFilter[detectedProperty] = '');
    }
  }

  toggleFilterState(event) {
    this.datasource.options.ogcFilters.interfaceOgcFilters.find(
      (f) => f.filterid === this.currentFilter.filterid
    ).active = event.checked;
    this.refreshFilters();
  }

  deleteFilter() {
    const ogcFilters: OgcFiltersOptions = this.datasource.options.ogcFilters;
    ogcFilters.interfaceOgcFilters = ogcFilters.interfaceOgcFilters.filter(
      (f) => f.filterid !== this.currentFilter.filterid
    );
    this.refreshFilters();
  }

  changeLogical(logical: string) {
    this.currentFilter.parentLogical = logical;
    this.refreshFilters();
  }

  changeOperator(operator: string) {
    this.currentFilter.operator = operator;
    this.currentFilterIsSpatial();

    if (
      this.currentFilterIsSpatial$.value &&
      this.currentFilter.wkt_geometry.length === 0
    ) {
      this.changeSpatialSelector(this.currentFilter.igoSpatialSelector);
    } else {
      this.refreshFilters();
    }
  }

  changeField(field: string) {
    this.currentFilter.propertyName = field;
    this.selectedField$.next(
      this.fields$.value.find((f) => f.name === this.currentFilter.propertyName)
    );
    this.refreshFilters();
  }

  // Issue with mapserver 7.2 and Postgis layers. Fixed in 7.4
  // Due to this issue, the checkbox is hide.
  changeCaseSensitive(matchCase) {
    this.currentFilter.matchCase = matchCase.checked;
    this.refreshFilters();
  }

  changeProperty(value: any, pos?: number, refreshFilter = true) {
    const detectedProperty = this.detectProperty(pos);
    if (detectedProperty) {
      this.datasource.options.ogcFilters.interfaceOgcFilters.find(
        (f) => f.filterid === this.currentFilter.filterid
      )[detectedProperty] = value;

      if ( refreshFilter ) {
        this.refreshFilters();
      }
    }
  }

  changeNumericProperty(value, pos: number) {
    this.changeProperty(parseFloat(value), pos);
  }

  changeSpatialSelector(value: any) {
    this.currentFilter.igoSpatialSelector = value;

    if (value === 'fixedExtent') {
      this.changeMapExtentGeometry(false);
    }
    this.currentFilterIsSpatial();
    this.refreshFilters();
  }

  changeSNRC(value: any) {
    this.snrc = value;
    this.changeSNRCGeometry();
  }

  changeSNRCGeometry() {
    const interfaceOgcFilter = this.datasource.options.ogcFilters.interfaceOgcFilters.find(
      (f) => f.filterid === this.currentFilter.filterid
    );
    if (!interfaceOgcFilter) {
      return;
    }

    if (this.snrc && this.currentFilter.igoSpatialSelector === 'snrc') {
      this.currentFilter.wkt_geometry = this.wktService.snrcToWkt(
        this.snrc,
        this.map.projection
      ).wktPoly;
    }
    this.refreshFilters();
  }

  changeMapExtentGeometry(refresh: boolean = true) {
    const interfaceOgcFilter = this.datasource.options.ogcFilters.interfaceOgcFilters.find(
      (f) => f.filterid === this.currentFilter.filterid
    );
    if (!interfaceOgcFilter) {
      return;
    }

    if (this.currentFilter.igoSpatialSelector === 'fixedExtent') {
      this.currentFilter.wkt_geometry = this.wktService.extentToWkt(
        this.map.projection,
        this.map.viewController.getExtent(),
        this.map.projection
      ).wktPoly;
    }
    if (refresh) {
      this.refreshFilters();
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

  private currentFilterIsSpatial() {
    let isSpatial = false;
    if (this.currentFilter) {
      isSpatial =
        [
          OgcFilterOperator.Contains,
          OgcFilterOperator.Intersects,
          OgcFilterOperator.Within
        ].indexOf(this.currentFilter.operator) !== -1;
    }
    this.currentFilterIsSpatial$.next(isSpatial);
  }

  isTemporalOperator() {
    return (
      this.currentFilter.operator.toLowerCase() ===
      this.ogcFilterOperator.During.toLowerCase()
    );
  }
}
