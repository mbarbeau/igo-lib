import { Observable } from 'rxjs';

import { TooltipType } from '../../layer';
import { TimeFilterOptions } from '../../filter';
import { QueryFormat, QueryHtmlTarget  } from '../../query';

import { ICatalog, ICompositeCatalog , CatalogItem, CatalogItemGroup } from './catalog.interface';
import { CatalogService } from './catalog.service';
import { TypeCatalog, TypeCatalogStrings } from './catalog.enum';

export abstract class Catalog implements ICatalog {

    // ICatalog -----------------------------
    id: string;
    title: string;
    url: string;
    removable?: boolean;
    externalProvider?: boolean;
    abstract?: string;
    forcedProperties?: any[];
    items?: CatalogItem[];
    type?: TypeCatalogStrings;
    version?: string;
    matrixSet?: string;
    requestEncoding?: string;
    regFilters?: string[];
    groupImpose?: CatalogItemGroup;
    groupSeparator?: string;
    timeFilter?: TimeFilterOptions;
    queryFormat?: QueryFormat;
    queryHtmlTarget?: QueryHtmlTarget;
    queryParams?: { [key: string]: string; };
    sourceOptions?: { [key: string]: any; };
    count?: number;
    tooltipType?: TooltipType.ABSTRACT | TooltipType.TITLE;
    sortDirection?: 'asc' | 'desc';
    setCrossOriginAnonymous?: boolean;
    showLegend?: boolean;
    // ICatalog -----------------------------

    protected catalogService: CatalogService;

    constructor(options: Catalog, service: CatalogService) {
        Object.assign(this, options);
        this.catalogService = service;
    }

    public abstract collectCatalogItems(): Observable<CatalogItem[]>;
}

class WMSCatalog extends Catalog {
    constructor(options: Catalog, service: CatalogService) {
        super(options, service);
        const sType: string = TypeCatalog[TypeCatalog.wms];
        this.type =  TypeCatalog[sType];
    }

    public collectCatalogItems(): Observable<CatalogItem[]> {
        return this.catalogService.loadCatalogWMSLayerItems(this);
    }
}

class WMTSCatalog extends Catalog {
    constructor(options: Catalog, service: CatalogService) {
        super(options, service);
        const sType: string = TypeCatalog[TypeCatalog.wmts];
        this.type =  TypeCatalog[sType];
    }

    public collectCatalogItems(): Observable<CatalogItem[]> {
        return this.catalogService.loadCatalogWMTSLayerItems(this);
    }
}

class BaselayersCatalog extends Catalog {
    constructor(options: Catalog, service: CatalogService) {
        super(options, service);
        const sType: string = TypeCatalog[TypeCatalog.baselayers];
        this.type =  TypeCatalog[sType];
    }

    public collectCatalogItems(): Observable<CatalogItemGroup[]> {
        return this.catalogService.loadCatalogBaseLayerItems(this);
    }
}

class ArcGISRestCatalog extends Catalog {
    constructor(options: Catalog, service: CatalogService) {
        super(options, service);
        const sType: string = TypeCatalog[TypeCatalog.arcgisrest];
        this.type =  TypeCatalog[sType];
    }

    public collectCatalogItems() {
        return this.catalogService.loadCatalogArcGISRestItems(this);
    }
}

class TileOrImageArcGISRestCatalog extends Catalog {
    constructor(options: Catalog, service: CatalogService, typeCatalog: TypeCatalog) {
        super(options, service);
        this.type =  TypeCatalog[TypeCatalog[typeCatalog]];
    }

    public collectCatalogItems() {
        return this.catalogService.loadCatalogArcGISRestItems(this);
    }
}

export class CompositeCatalog extends Catalog implements ICompositeCatalog {
    composite: ICatalog[];

    constructor(options: Catalog, service: CatalogService) {
        super(options, service);
        const sType: string = TypeCatalog[TypeCatalog.composite];
        this.type =  TypeCatalog[sType];
        this.url = null;
    }

    public collectCatalogItems(): Observable<CatalogItem[]> {
        return this.catalogService.loadCatalogCompositeLayerItems(this);
    }
}

export class CatalogFactory {

    public static createInstanceCatalog(options: Catalog, service: CatalogService): Catalog {

        let catalog: Catalog;
        if (options.hasOwnProperty('composite')) {
            catalog = new CompositeCatalog(options, service);
        } else if (options.type === TypeCatalog[TypeCatalog.baselayers]) {
            catalog = new BaselayersCatalog(options, service);
        } else if (options.type === TypeCatalog[TypeCatalog.arcgisrest]) {
            catalog = new ArcGISRestCatalog(options, service);
        } else if (options.type === TypeCatalog[TypeCatalog.tilearcgisrest]) {
            catalog = new TileOrImageArcGISRestCatalog(options, service, TypeCatalog.tilearcgisrest);
        } else if (options.type === TypeCatalog[TypeCatalog.imagearcgisrest]) {
            catalog = new TileOrImageArcGISRestCatalog(options, service, TypeCatalog.imagearcgisrest);
        } else if (options.type === TypeCatalog[TypeCatalog.wmts]) {
            catalog = new WMTSCatalog(options, service);
        } else {
            catalog = new WMSCatalog(options, service);
        }

        return catalog;
    }
}
