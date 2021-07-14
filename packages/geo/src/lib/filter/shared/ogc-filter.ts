import * as olfilter from 'ol/format/filter';
import olFormatWKT from 'ol/format/WKT';
import olFormatWFS from 'ol/format/WFS';
import olGeometry from 'ol/geom/Geometry';

import olProjection from 'ol/proj/Projection';

import { uuid, ObjectUtils } from '@igo2/utils';

import {
  OgcFilter,
  IgoOgcFilterObject,
  WFSWriteGetFeatureOptions,
  AnyBaseOgcFilterOptions,
  OgcInterfaceFilterOptions,
  OgcFilterableDataSourceOptions,
  OgcFiltersOptions,
  IgoOgcSelector,
  SelectorGroup,
  OgcSelectorBundle
} from './ogc-filter.interface';
import { OgcFilterOperatorType, OgcFilterOperator } from './ogc-filter.enum';
import { SourceFieldsOptionsParams } from '../../datasource/shared/datasources/datasource.interface';
import * as moment_ from 'moment';
const moment = moment_;

export class OgcFilterWriter {
  private filterSequence: OgcInterfaceFilterOptions[] = [];
  public operators = {
    [OgcFilterOperator.PropertyIsEqualTo as string]: {
      spatial: false,
      fieldRestrict: []
    },
    [OgcFilterOperator.PropertyIsNotEqualTo as string]: {
      spatial: false,
      fieldRestrict: []
    },
    [OgcFilterOperator.PropertyIsLike as string]: {
      spatial: false,
      fieldRestrict: ['string']
    },
    [OgcFilterOperator.PropertyIsGreaterThan as string]: {
      spatial: false,
      fieldRestrict: ['number']
    },
    [OgcFilterOperator.PropertyIsGreaterThanOrEqualTo as string]: {
      spatial: false,
      fieldRestrict: ['number']
    },
    [OgcFilterOperator.PropertyIsLessThan as string]: {
      spatial: false,
      fieldRestrict: ['number']
    },
    [OgcFilterOperator.PropertyIsLessThanOrEqualTo as string]: {
      spatial: false,
      fieldRestrict: ['number']
    },
    [OgcFilterOperator.PropertyIsBetween as string]: {
      spatial: false,
      fieldRestrict: ['number']
    },
    [OgcFilterOperator.During as string]: { spatial: false, fieldRestrict: [] },
    [OgcFilterOperator.PropertyIsNull as string]: {
      spatial: false,
      fieldRestrict: []
    },
    [OgcFilterOperator.Intersects as string]: {
      spatial: true,
      fieldRestrict: []
    },
    [OgcFilterOperator.Within as string]: { spatial: true, fieldRestrict: [] },
    [OgcFilterOperator.Contains as string]: { spatial: true, fieldRestrict: [] }
  };

  defineOgcFiltersDefaultOptions(
    ogcFiltersOptions: OgcFiltersOptions,
    fieldNameGeometry: string,
    srcType?: string
  ): OgcFiltersOptions {
    let ogcFiltersDefaultValue = true; // default values for wfs.
    if (srcType && srcType === 'wms') {
      ogcFiltersDefaultValue = false;
    }

    ogcFiltersOptions = ogcFiltersOptions || {};
    ogcFiltersOptions.enabled =
      ogcFiltersOptions.enabled === undefined
        ? ogcFiltersDefaultValue
        : ogcFiltersOptions.enabled;
    ogcFiltersOptions.editable =
      ogcFiltersOptions.editable === undefined
        ? ogcFiltersDefaultValue
        : ogcFiltersOptions.editable;
    ogcFiltersOptions.geometryName = fieldNameGeometry;

    ogcFiltersOptions.advancedOgcFilters = true;
    if (ogcFiltersOptions.enabled && (ogcFiltersOptions.pushButtons || ogcFiltersOptions.checkboxes
      || ogcFiltersOptions.radioButtons || ogcFiltersOptions.select)) {
      ogcFiltersOptions.advancedOgcFilters = false;
    }
    return ogcFiltersOptions;
  }

  public buildFilter(
    filters?: IgoOgcFilterObject,
    extent?: [number, number, number, number],
    proj?: olProjection,
    fieldNameGeometry?: string,
    options?: OgcFilterableDataSourceOptions
  ): string {
    let ourBboxFilter;
    let enableBbox: boolean;
    if (/intersects|contains|within/gi.test(JSON.stringify(filters))) {
      enableBbox = false;
    } else {
      enableBbox = true;
    }
    if (filters) {
      fieldNameGeometry =
        (filters as any).geometryName !== undefined
          ? (filters as any).geometryName
          : fieldNameGeometry;
    }
    if (extent && filters) {
      ourBboxFilter = olfilter.bbox(fieldNameGeometry, extent, proj.getCode());
    }
    let filterAssembly: OgcFilter;
    if (filters) {
      filters = this.checkIgoFiltersProperties(
        filters,
        fieldNameGeometry,
        proj
      );
      if (extent && enableBbox) {
        filterAssembly = olfilter.and(
          ourBboxFilter,
          this.bundleFilter(filters, options)
        );
      } else {
        filterAssembly = this.bundleFilter(filters, options);
      }
    } else {
      return 'bbox=' + extent.join(',') + ',' + proj.getCode();
    }

    const wfsOptions: WFSWriteGetFeatureOptions = {
      srsName: '',
      featureNS: '',
      featurePrefix: '',
      featureTypes: ['featureTypes'],
      filter: filterAssembly,
      outputFormat: '',
      geometryName: fieldNameGeometry
    };

    const query = new olFormatWFS().writeGetFeature(wfsOptions);
    const str = new XMLSerializer().serializeToString(query);
    const regexp1 = /typenames *=|typename *=\"featureTypes\" *>/gi;
    const regexp2 = /<\/Query><\/GetFeature>/gi;

    return 'filter=' + str.split(regexp1)[1].split(regexp2)[0];
  }

  private bundleFilter(
    filterObject: any,
    options?: OgcFilterableDataSourceOptions
  ) {
    if (filterObject instanceof Array) {
      const logicalArray = [];
      filterObject.forEach((element) => {
        logicalArray.push(this.bundleFilter(element, options));
      });
      return logicalArray;
    } else {
      if (filterObject.hasOwnProperty('logical')) {
        return this.createFilter(
          {
            operator: filterObject.logical,
            logicalArray: this.bundleFilter(filterObject.filters, options)
          },
          options
        );
      } else if (filterObject.hasOwnProperty('operator')) {
        return this.createFilter(
          filterObject as AnyBaseOgcFilterOptions,
          options
        );
      }
    }
  }

  private createFilter(
    filterOptions,
    options?: OgcFilterableDataSourceOptions
  ): OgcFilter {
    const operator = filterOptions.operator;
    const logicalArray = filterOptions.logicalArray;

    const wfsPropertyName = filterOptions.propertyName;
    const wfsPattern = filterOptions.pattern;
    const wfsMatchCase = filterOptions.matchCase
      ? filterOptions.matchCase
      : true;
    const wfsWildCard = filterOptions.wildCard ? filterOptions.wildCard : '*';
    const wfsSingleChar = filterOptions.singleChar
      ? filterOptions.singleChar
      : '.';
    const wfsEscapeChar = filterOptions.escapeChar
      ? filterOptions.escapeChar
      : '!';

    const wfsLowerBoundary = filterOptions.lowerBoundary;
    const wfsUpperBoundary = filterOptions.upperBoundary;

    const wfsGeometryName = filterOptions.geometryName;
    const wfsExtent = filterOptions.extent;
    const wfsWktGeometry = filterOptions.wkt_geometry;
    const wfsSrsName = filterOptions.srsName
      ? filterOptions.srsName
      : 'EPSG:3857';

    const wfsBegin = this.parseFilterOptionDate(
      filterOptions.begin,
      options ? options.minDate : undefined
    );
    const wfsEnd = this.parseFilterOptionDate(
      filterOptions.end,
      options ? options.maxDate : undefined
    );

    const wfsExpression = filterOptions.expression;

    let geometry: olGeometry;
    if (wfsWktGeometry) {
      const wkt = new olFormatWKT();
      geometry = wkt.readGeometry(wfsWktGeometry, {
        dataProjection: wfsSrsName,
        featureProjection: wfsSrsName || 'EPSG:3857'
      });
    }

    switch (operator.toLowerCase()) {
      case OgcFilterOperator.BBOX.toLowerCase():
        return olfilter.bbox(wfsGeometryName, wfsExtent, wfsSrsName);
      case OgcFilterOperator.PropertyIsBetween.toLowerCase():
        return olfilter.between(
          wfsPropertyName,
          wfsLowerBoundary,
          wfsUpperBoundary
        );
      case OgcFilterOperator.Contains.toLowerCase():
        return olfilter.contains(wfsGeometryName, geometry, wfsSrsName);
      case OgcFilterOperator.During.toLowerCase():
        return olfilter.during(wfsPropertyName, wfsBegin, wfsEnd);
      case OgcFilterOperator.PropertyIsEqualTo.toLowerCase():
        return olfilter.equalTo(wfsPropertyName, wfsExpression, wfsMatchCase);
      case OgcFilterOperator.PropertyIsGreaterThan.toLowerCase():
        return olfilter.greaterThan(wfsPropertyName, wfsExpression);
      case OgcFilterOperator.PropertyIsGreaterThanOrEqualTo.toLowerCase():
        return olfilter.greaterThanOrEqualTo(wfsPropertyName, wfsExpression);
      case OgcFilterOperator.Intersects.toLowerCase():
        return olfilter.intersects(wfsGeometryName, geometry, wfsSrsName);
      case OgcFilterOperator.PropertyIsNull.toLowerCase():
        return olfilter.isNull(wfsPropertyName);
      case OgcFilterOperator.PropertyIsLessThan.toLowerCase():
        return olfilter.lessThan(wfsPropertyName, wfsExpression);
      case OgcFilterOperator.PropertyIsLessThanOrEqualTo.toLowerCase():
        return olfilter.lessThanOrEqualTo(wfsPropertyName, wfsExpression);
      case OgcFilterOperator.PropertyIsLike.toLowerCase():
        return olfilter.like(
          wfsPropertyName,
          wfsPattern.replace(/[()_]/gi, wfsSingleChar),
          wfsWildCard,
          wfsSingleChar,
          wfsEscapeChar,
          wfsMatchCase
        );
      case OgcFilterOperator.PropertyIsNotEqualTo.toLowerCase():
        return olfilter.notEqualTo(
          wfsPropertyName,
          wfsExpression,
          wfsMatchCase
        );
      case OgcFilterOperator.Within.toLowerCase():
        return olfilter.within(wfsGeometryName, geometry, wfsSrsName);
      // LOGICAL
      case OgcFilterOperator.And.toLowerCase():
        return olfilter.and.apply(null, logicalArray);
      case OgcFilterOperator.Or.toLowerCase():
        return olfilter.or.apply(null, logicalArray);
      case OgcFilterOperator.Not.toLowerCase():
        return olfilter.not.apply(null, logicalArray);

      default:
        return undefined;
    }
  }

  public defineInterfaceFilterSequence(
    filterObject: any,
    geometryName,
    logical = '',
    level = -1
  ): OgcInterfaceFilterOptions[] {
    if (filterObject instanceof Array) {
      filterObject.forEach((element) => {
        this.filterSequence.concat(
          this.defineInterfaceFilterSequence(
            element,
            geometryName,
            logical,
            level
          )
        );
      });
    } else {
      if (filterObject.hasOwnProperty('logical')) {
        level = level + 1;
        this.filterSequence.concat(
          this.defineInterfaceFilterSequence(
            filterObject.filters,
            geometryName,
            filterObject.logical,
            level
          )
        );
      } else if (filterObject.hasOwnProperty('operator')) {
        this.filterSequence.push(
          this.addInterfaceFilter(filterObject, geometryName, level, logical)
        );
      }
    }
    return this.filterSequence;
  }

  public computeAllowedOperators(
    fields?: SourceFieldsOptionsParams[],
    propertyName?: string,
    defaultOperatorsType?: OgcFilterOperatorType
  ) {
    let effectiveOperators: {} = {};
    let allowedOperators;
    let fieldsHasSpatialOperator: boolean;
    let includeContains: boolean;

    if (fields && propertyName) {
      const srcField = fields.find((field) => field.name === propertyName);
      allowedOperators =
        srcField && srcField.allowedOperatorsType
          ? srcField.allowedOperatorsType
          : defaultOperatorsType;
    }

    if (fields) {
      fields.map((field) => {
        if (!field.allowedOperatorsType) {
          return;
        }
        const allowedOperatorsType = field.allowedOperatorsType.toLowerCase();
        if (
          allowedOperatorsType === OgcFilterOperatorType.All.toLowerCase() ||
          allowedOperatorsType ===
            OgcFilterOperatorType.Spatial.toLowerCase() ||
          allowedOperatorsType ===
            OgcFilterOperatorType.BasicAndSpatial.toLowerCase()
        ) {
          fieldsHasSpatialOperator = true;
          if (
            allowedOperatorsType === OgcFilterOperatorType.All.toLowerCase()
          ) {
            includeContains = true;
          }
        }
      });
    }

    allowedOperators = allowedOperators
      ? allowedOperators
      : OgcFilterOperatorType.BasicAndSpatial;

    switch (allowedOperators.toLowerCase()) {
      case OgcFilterOperatorType.All:
        effectiveOperators = this.operators;
        break;
      case OgcFilterOperatorType.Spatial:
        effectiveOperators = {
          [OgcFilterOperator.Intersects]: { spatial: true, fieldRestrict: [] },
          [OgcFilterOperator.Within]: { spatial: true, fieldRestrict: [] }
        };
        break;
      case OgcFilterOperatorType.BasicAndSpatial:
        effectiveOperators = {
          [OgcFilterOperator.PropertyIsEqualTo]: {
            spatial: false,
            fieldRestrict: []
          },
          [OgcFilterOperator.PropertyIsNotEqualTo]: {
            spatial: false,
            fieldRestrict: []
          },
          [OgcFilterOperator.Intersects]: { spatial: true, fieldRestrict: [] },
          [OgcFilterOperator.Within]: { spatial: true, fieldRestrict: [] }
        };
        break;
      case OgcFilterOperatorType.Basic:
        effectiveOperators = {
          [OgcFilterOperator.PropertyIsEqualTo]: {
            spatial: false,
            fieldRestrict: []
          },
          [OgcFilterOperator.PropertyIsNotEqualTo]: {
            spatial: false,
            fieldRestrict: []
          }
        };
        break;
      case OgcFilterOperatorType.Time:
        effectiveOperators = {
          [OgcFilterOperator.During]: { spatial: false, fieldRestrict: [] }
        };
        break;
      case OgcFilterOperatorType.BasicNumericOperator:
        effectiveOperators = {
          [OgcFilterOperator.PropertyIsEqualTo]: {
            spatial: false,
            fieldRestrict: []
          },
          [OgcFilterOperator.PropertyIsNotEqualTo]: {
            spatial: false,
            fieldRestrict: []
          },
          [OgcFilterOperator.PropertyIsGreaterThan]: {
            spatial: false,
            fieldRestrict: ['number']
          },
          [OgcFilterOperator.PropertyIsGreaterThanOrEqualTo]: {
            spatial: false,
            fieldRestrict: ['number']
          },
          [OgcFilterOperator.PropertyIsLessThan]: {
            spatial: false,
            fieldRestrict: ['number']
          },
          [OgcFilterOperator.PropertyIsLessThanOrEqualTo]: {
            spatial: false,
            fieldRestrict: ['number']
          }
        };
        break;
      default:
        effectiveOperators = {
          [OgcFilterOperator.PropertyIsEqualTo]: {
            spatial: false,
            fieldRestrict: []
          },
          [OgcFilterOperator.PropertyIsNotEqualTo]: {
            spatial: false,
            fieldRestrict: []
          },
          [OgcFilterOperator.Intersects]: { spatial: true, fieldRestrict: [] },
          [OgcFilterOperator.Within]: { spatial: true, fieldRestrict: [] }
        };
    }

    if (fieldsHasSpatialOperator) {
      (effectiveOperators as any).Intersects = {
        spatial: true,
        fieldRestrict: []
      };
      (effectiveOperators as any).Within = { spatial: true, fieldRestrict: [] };
      if (includeContains) {
        (effectiveOperators as any).Contains = {
          spatial: true,
          fieldRestrict: []
        };
      }
    }

    return effectiveOperators;
  }

  public addInterfaceFilter(
    igoOgcFilterObject?,
    geometryName?,
    level = 0,
    parentLogical = 'Or'
  ): OgcInterfaceFilterOptions {
    if (!igoOgcFilterObject) {
      igoOgcFilterObject = { operator: 'PropertyIsEqualTo' };
    }
    const f = {
      propertyName: '',
      operator: '',
      active: '',
      filterid: uuid(),
      step: '',
      begin: '',
      end: '',
      sliderOptions: {},
      lowerBoundary: '',
      upperBoundary: '',
      expression: '',
      pattern: '',
      wildCard: '*',
      singleChar: '.',
      escapeChar: '!',
      matchCase: true,
      igoSpatialSelector: '',
      igoSNRC: '',
      geometryName: '',
      geometry: '',
      wkt_geometry: '',
      extent: '',
      srsName: '',
      parentLogical: '',
      level: 0
    };

    return Object.assign(
      f,
      {
        parentLogical,
        level,
        geometryName
      },
      igoOgcFilterObject
    );
  }

  public checkIgoFiltersProperties(
    filterObject: any,
    fieldNameGeometry,
    proj: olProjection,
    active = false
  ) {
    const filterArray = [];
    if (filterObject instanceof Array) {
      filterObject.forEach((element) => {
        filterArray.push(
          this.checkIgoFiltersProperties(
            element,
            fieldNameGeometry,
            proj,
            active
          )
        );
      });
      return filterArray;
    } else {
      if (filterObject.hasOwnProperty('logical')) {
        return Object.assign(
          {},
          {
            logical: filterObject.logical,
            filters: this.checkIgoFiltersProperties(
              filterObject.filters,
              fieldNameGeometry,
              proj,
              active
            )
          }
        );
      } else if (filterObject.hasOwnProperty('operator')) {
        return this.addFilterProperties(
          filterObject as OgcInterfaceFilterOptions,
          fieldNameGeometry,
          proj,
          active
        );
      }
    }
  }

  private addFilterProperties(
    igoOgcFilterObject: OgcInterfaceFilterOptions,
    fieldNameGeometry,
    proj: olProjection,
    active = false
  ) {
    const filterid = igoOgcFilterObject.hasOwnProperty('filterid')
      ? igoOgcFilterObject.filterid
      : uuid();
    const status = igoOgcFilterObject.hasOwnProperty('active')
      ? igoOgcFilterObject.active
      : active;

    const srsName = igoOgcFilterObject.hasOwnProperty('srsName')
      ? igoOgcFilterObject.srsName
      : proj
      ? proj.getCode()
      : 'EPSG:3857';

    return Object.assign(
      {},
      {
        filterid,
        active: status,
        igoSpatialSelector: 'fixedExtent',
        srsName
      },
      igoOgcFilterObject,
      { geometryName: fieldNameGeometry }
    );
  }

  public rebuiltIgoOgcFilterObjectFromSequence(
    sequence: OgcInterfaceFilterOptions[]
  ): IgoOgcFilterObject {
    if (sequence instanceof Array) {
      if (sequence.length >= 1) {
        let lastParentLogical = sequence[0].parentLogical;
        let nextElement: any;
        let logicalArray = [];
        let lastProcessedFilter;
        sequence.forEach((uiFilter) => {
          const element = Object.assign({}, uiFilter);
          const index = sequence.indexOf(uiFilter);
          if (index >= 0 && index < sequence.length - 1) {
            nextElement = sequence[index + 1];
          } else {
            nextElement = element;
          }
          delete element.active;
          delete element.filterid;
          delete element.parentLogical;
          logicalArray.push(element);

          if (sequence.length === 1) {
            lastProcessedFilter = element;
          } else if (lastParentLogical !== nextElement.parentLogical) {
            if (logicalArray.length === 1) {
              console.log(
                'You must set at ' +
                  'least two operator in a logical (' +
                  lastParentLogical +
                  ')'
              );
            } else {
              lastProcessedFilter = Object.assign(
                {},
                { logical: lastParentLogical, filters: logicalArray }
              );
              logicalArray = [lastProcessedFilter];
              lastParentLogical = nextElement.parentLogical;
            }
          }
        });
        return lastProcessedFilter;
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  private computeIgoSelector(selectors: IgoOgcSelector): IgoOgcSelector {
    if (
      selectors.groups.every((group) => group.computedSelectors !== undefined)
    ) {
      return selectors;
    }
    let selector: IgoOgcSelector;
    if (selectors.groups && selectors.bundles) {
      if (!selectors.bundles.every((bundle) => bundle.id !== undefined)) {
        throw new Error(
          'You must set an id for each of your bundles'
        );
      }
      selector = ObjectUtils.copyDeep(selectors);
      selector.groups.forEach((group) => {
        group.title = group.title ? group.title : group.name;
        group.enabled = group.enabled ? group.enabled : false;
        group.computedSelectors = ObjectUtils.copyDeep(
          selector.bundles.filter((b) => group.ids.includes(b.id))
        );
      });
    } else if (!selectors.groups && selectors.bundles) {
      selector = ObjectUtils.copyDeep(selectors);
      selector.groups = [
        {
          title: 'group1',
          name: 'group1',
          computedSelectors: ObjectUtils.copyDeep(selector.bundles)
        } as SelectorGroup
      ];
    } else {
      selector = {
        bundles: selectors as any,
        groups: [
          {
            title: 'group1',
            name: 'group1',
            computedSelectors: ObjectUtils.copyDeep(
              selectors
            ) as OgcSelectorBundle[]
          } as SelectorGroup
        ],
        selectorType: selector.selectorType
      };
    }
    if (!selector.groups.find((selectorGroup) => selectorGroup.enabled)) {
      selector.groups[0].enabled = true;
    }
    return selector;
  }

  public handleOgcFiltersAppliedValue(
    options: OgcFilterableDataSourceOptions,
    fieldNameGeometry: string,
    extent?: [number, number, number, number],
    proj?: olProjection
  ): string {
    const ogcFilters = options.ogcFilters;
    if (!ogcFilters) {
      return;
    }
    const conditions = [];
    let filterQueryStringSelector = '';
    let filterQueryStringAdvancedFilters = '';
    if (ogcFilters.enabled && (ogcFilters.pushButtons || ogcFilters.checkboxes || ogcFilters.radioButtons || ogcFilters.select)) {
      let selectors;
      if (ogcFilters.pushButtons) {
        selectors = ogcFilters.pushButtons;
        const pushConditions = this.formatGroupAndFilter(ogcFilters, selectors);
        for (const condition of pushConditions) {
          conditions.push(condition);
        }
      }
      if (ogcFilters.checkboxes) {
        selectors = ogcFilters.checkboxes;
        const checkboxConditions = this.formatGroupAndFilter(ogcFilters, selectors);
        for (const condition of checkboxConditions) {
          conditions.push(condition);
        }
      }
      if (ogcFilters.radioButtons) {
        selectors = ogcFilters.radioButtons;
        const selectorsCorr = this.verifyMultipleEnableds(selectors);
        const radioConditions = this.formatGroupAndFilter(ogcFilters, selectorsCorr);
        for (const condition of radioConditions) {
          conditions.push(condition);
        }
      }
      if (ogcFilters.select) {
        selectors = ogcFilters.select;
        const selectorsCorr = this.verifyMultipleEnableds(selectors);
        const selectConditions = this.formatGroupAndFilter(ogcFilters, selectorsCorr);
        for (const condition of selectConditions) {
          conditions.push(condition);
        }
      }

      if (conditions.length >= 1) {
        filterQueryStringSelector = this.buildFilter(
          conditions.length === 1
            ? conditions[0]
            : { logical: 'And', filters: conditions },
          extent,
          proj,
          ogcFilters.geometryName
        );
      }
    }
    if (ogcFilters.enabled && ogcFilters.filters) {
      ogcFilters.geometryName = ogcFilters.geometryName || fieldNameGeometry;
      const igoFilters = ogcFilters.filters;
      filterQueryStringAdvancedFilters = this.buildFilter(
        igoFilters,
        extent,
        proj,
        ogcFilters.geometryName,
        options
      );
    }

    let filterQueryString = ogcFilters.advancedOgcFilters
      ? filterQueryStringAdvancedFilters
      : filterQueryStringSelector;
    if (options.type === 'wms') {
      filterQueryString = this.formatProcessedOgcFilter(
        filterQueryString,
        (options as any).params.LAYERS
      );
    }
    if (options.type === 'wfs') {
      filterQueryString = this.formatProcessedOgcFilter(
        filterQueryString,
        (options as any).params.featureTypes
      );
    }

    return filterQueryString;
  }

  public verifyMultipleEnableds(selectors) {
    selectors.bundles.forEach(bundle => {
      if (!bundle.multiple) {
        const enableds = bundle.selectors.reduce((list, filter, index) => (filter.enabled) === true ? list.concat(index) : list, []);
        if (enableds.length > 1) {
          enableds.splice(0, 1);
          enableds.forEach(index => {
            bundle.selectors[index].enabled = false;
          });
        }
      }
    });
    return selectors;
  }

  public formatGroupAndFilter(ogcFilters: OgcFiltersOptions, selectors) {
    selectors = this.computeIgoSelector(
      selectors
    );
    const selectorBundle = selectors.groups.find(
      (g) => g.enabled
    ).computedSelectors;
    const conditions = [];
    selectorBundle.map((bundle) => {
      const bundleCondition = [];
      const selectorsType = bundle.selectors as any;
      if (!selectorsType) {
        return;
      }
      selectorsType
        .filter((ogcselector) => ogcselector.enabled === true)
        .forEach((enabledSelector) => bundleCondition.push(enabledSelector.filters));
      if (bundleCondition.length === 1) {
        conditions.push(bundleCondition[0]);
      } else if (bundleCondition.length > 1) {
        conditions.push({
          logical: bundle.logical,
          filters: bundleCondition
        });
      }
    });

    if (selectors.selectorType === 'pushButton') {
      ogcFilters.pushButtons = selectors;
    } else if (selectors.selectorType === 'checkbox') {
      ogcFilters.checkboxes = selectors;
    } else if (selectors.selectorType === 'radioButton') {
      ogcFilters.radioButtons = selectors;
    } else if (selectors.selectorType === 'select') {
      ogcFilters.select = selectors;
    }
    return conditions;
  }

  public formatProcessedOgcFilter(
    processedFilter: string,
    layersOrTypenames: string
  ): string {
    let appliedFilter = '';
    if (processedFilter.length === 0 && layersOrTypenames.indexOf(',') === -1) {
      appliedFilter = processedFilter;
    } else {
      layersOrTypenames.split(',').forEach((layerOrTypenames) => {
        appliedFilter = `${appliedFilter}(${processedFilter.replace(
          'filter=',
          ''
        )})`;
      });
    }
    appliedFilter = appliedFilter.replace(/\(\)/g, '');
    const filterValue =
      appliedFilter.length > 0
        ? appliedFilter.replace('filter=', '')
        : undefined;
    return filterValue;
  }

  public parseFilterOptionDate(value: string, defaultValue?: string): string {
    if (!value) {
      return defaultValue;
    } else if (moment(value).isValid()) {
      return value;
    } else {
      return undefined;
    }
  }
}
