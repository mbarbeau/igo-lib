import * as olfilter from 'ol/format/filter';
import olFormatWKT from 'ol/format/WKT';
import olFormatWFS from 'ol/format/WFS';
import olGeometry from 'ol/geom/Geometry';

import { uuid } from '@igo2/utils';

import {
  OgcFilter,
  IgoOgcFilterObject,
  WFSWriteGetFeatureOptions,
  AnyBaseOgcFilterOptions,
  OgcInterfaceFilterOptions
} from './ogc-filter.interface';

export class OgcFilterWriter {
  private filterSequence: OgcInterfaceFilterOptions[] = [];
  public operators = {
    PropertyIsEqualTo: { spatial: false, fieldRestrict: [] },
    PropertyIsNotEqualTo: { spatial: false, fieldRestrict: [] },
    PropertyIsLike: { spatial: false, fieldRestrict: ['string'] },
    PropertyIsGreaterThan: { spatial: false, fieldRestrict: ['number'] },
    PropertyIsGreaterThanOrEqualTo: { spatial: false, fieldRestrict: ['number'] },
    PropertyIsLessThan: { spatial: false, fieldRestrict: ['number'] },
    PropertyIsLessThanOrEqualTo: { spatial: false, fieldRestrict: ['number'] },
    PropertyIsBetween: { spatial: false, fieldRestrict: ['number'] },
    During: { spatial: false, fieldRestrict: [] },
    PropertyIsNull: { spatial: false, fieldRestrict: [] },
    Intersects: { spatial: true, fieldRestrict: [] },
    Within: { spatial: true, fieldRestrict: [] },
    Contains: { spatial: true, fieldRestrict: [] }
  };

  public buildFilter(
    filters: IgoOgcFilterObject,
    extent?: [number, number, number, number],
    proj?,
    fieldNameGeometry?: string
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
      filters = this.checkIgoFiltersProperties(filters, fieldNameGeometry);
      if (extent && enableBbox) {
        filterAssembly = olfilter.and(
          ourBboxFilter,
          this.bundleFilter(filters)
        );
      } else {
        filterAssembly = this.bundleFilter(filters);
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

  private bundleFilter(filterObject: any) {
    if (filterObject instanceof Array) {
      const logicalArray = [];
      filterObject.forEach(element => {
        logicalArray.push(this.bundleFilter(element));
      });
      return logicalArray;
    } else {
      if (filterObject.hasOwnProperty('logical')) {
        return this.createFilter({
          operator: filterObject.logical,
          logicalArray: this.bundleFilter(filterObject.filters)
        });
      } else if (filterObject.hasOwnProperty('operator')) {
        return this.createFilter(filterObject as AnyBaseOgcFilterOptions);
      }
    }
  }

  private createFilter(filterOptions): OgcFilter {
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

    const wfsBegin = filterOptions.begin;
    const wfsEnd = filterOptions.end;

    const wfsExpression = filterOptions.expression;

    let geometry: olGeometry;
    if (wfsWktGeometry) {
      const wkt = new olFormatWKT();
      geometry = wkt.readGeometry(wfsWktGeometry, {
        dataProjection: wfsSrsName,
        featureProjection: 'EPSG:3857'
      });
    }

    switch (operator) {
      case 'BBOX':
        return olfilter.bbox(wfsGeometryName, wfsExtent, wfsSrsName);
      case 'PropertyIsBetween':
        return olfilter.between(
          wfsPropertyName,
          wfsLowerBoundary,
          wfsUpperBoundary
        );
      case 'Contains':
        return olfilter.contains(wfsGeometryName, geometry, wfsSrsName);
      case 'During':
        return olfilter.during(wfsPropertyName, wfsBegin, wfsEnd);
      case 'PropertyIsEqualTo':
        return olfilter.equalTo(
          wfsPropertyName,
          wfsExpression,
          wfsMatchCase
        );
      case 'PropertyIsGreaterThan':
        return olfilter.greaterThan(wfsPropertyName, wfsExpression);
      case 'PropertyIsGreaterThanOrEqualTo':
        return olfilter.greaterThanOrEqualTo(wfsPropertyName, wfsExpression);
      case 'Intersects':
        return olfilter.intersects(wfsGeometryName, geometry, wfsSrsName);
      case 'PropertyIsNull':
        return olfilter.isNull(wfsPropertyName);
      case 'PropertyIsLessThan':
        return olfilter.lessThan(wfsPropertyName, wfsExpression);
      case 'PropertyIsLessThanOrEqualTo':
        return olfilter.lessThanOrEqualTo(wfsPropertyName, wfsExpression);
      case 'PropertyIsLike':
        return olfilter.like(
          wfsPropertyName,
          wfsPattern.replace(/[()_]/gi, wfsSingleChar),
          wfsWildCard,
          wfsSingleChar,
          wfsEscapeChar,
          wfsMatchCase
        );
      case 'PropertyIsNotEqualTo':
        return olfilter.notEqualTo(
          wfsPropertyName,
          wfsExpression,
          wfsMatchCase
        );
      case 'Within':
        return olfilter.within(wfsGeometryName, geometry, wfsSrsName);
      // LOGICAL
      case 'And':
        return olfilter.and.apply(null, logicalArray);
      case 'Or':
        return olfilter.or.apply(null, logicalArray);
      case 'Not':
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
      filterObject.forEach(element => {
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
      begin: '',
      end: '',
      lowerBoundary: '',
      upperBoundary: '',
      expression: '',
      pattern: '',
      wildCard: '*',
      singleChar: '.',
      escapeChar: '!',
      matchCase: true,
      igoSpatialSelector: '',
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
    active = false
  ) {
    const filterArray = [];
    if (filterObject instanceof Array) {
      filterObject.forEach(element => {
        filterArray.push(
          this.checkIgoFiltersProperties(element, fieldNameGeometry, active)
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
              active
            )
          }
        );
      } else if (filterObject.hasOwnProperty('operator')) {
        return this.addFilterProperties(
          filterObject as OgcInterfaceFilterOptions,
          fieldNameGeometry,
          active
        );
      }
    }
  }

  private addFilterProperties(
    igoOgcFilterObject: OgcInterfaceFilterOptions,
    fieldNameGeometry,
    active = false
  ) {
    const filterid = igoOgcFilterObject.hasOwnProperty('filterid')
      ? igoOgcFilterObject.filterid
      : uuid();
    const status = igoOgcFilterObject.hasOwnProperty('active')
      ? igoOgcFilterObject.active
      : active;

    return Object.assign(
      {},
      {
        filterid,
        active: status,
        igoSpatialSelector: 'fixedExtent'
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
        sequence.forEach(uiFilter => {
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
}