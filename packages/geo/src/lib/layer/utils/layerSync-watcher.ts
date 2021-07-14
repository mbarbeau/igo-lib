import { Watcher } from '@igo2/utils';
import { Layer } from '../shared/layers/layer';
import olLayer from 'ol/layer/Layer';
import { DataSource } from '../../datasource/shared/datasources/datasource';
import { IgoMap } from '../../map/shared/map';
import { LayersLink, LinkedProperties } from '../shared/layers/layer.interface';
import { OgcFilterableDataSource, OgcFilterableDataSourceOptions } from '../../filter/shared/ogc-filter.interface';
import { WMSDataSource } from '../../datasource/shared/datasources/wms-datasource';
import { OgcFilterWriter } from '../../filter/shared/ogc-filter';
import { TimeFilterableDataSource } from '../../filter/shared/time-filter.interface';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';

export class LayerSyncWatcher extends Watcher {
    private ogcFilters$$: Subscription;
    private timeFilter$$: Subscription;

    private ol: olLayer;
    private layer: Layer;
    private dataSource: DataSource;
    private map: IgoMap;
    private ogcFilterWriter;

    constructor(layer: Layer, map: IgoMap) {
        super();
        this.ol = layer.ol;
        this.layer = layer;
        this.dataSource = layer.options.source;
        this.map = map;
        this.ogcFilterWriter = new OgcFilterWriter();
    }

    protected watch() {

        this.ol.on('propertychange', evt => this.transferCommonProperties(evt));
        if ((this.dataSource as OgcFilterableDataSource).ogcFilters$) {
            this.ogcFilters$$ = (this.dataSource as OgcFilterableDataSource).ogcFilters$
                .subscribe(ogcFilters => this.transferOgcFiltersProperties(ogcFilters));
        }
        if ((this.dataSource as TimeFilterableDataSource).timeFilter$) {
            this.timeFilter$$ = (this.dataSource as TimeFilterableDataSource).timeFilter$
                .subscribe(timeFilter => this.transferTimeFilterProperties(timeFilter));
        }
        this.syncChildLayers();
    }

    protected unwatch() {
        this.ol.un('propertychange', evt => this.transferCommonProperties(evt));
        if (this.ogcFilters$$) { this.ogcFilters$$.unsubscribe(); }
        if (this.timeFilter$$) { this.timeFilter$$.unsubscribe(); }
    }


    private syncChildLayers() {
        // Force the sync the child layers with parent on the first load.
        if (!this.map) {
            return;
        }
        this.map.status$
            .pipe(first())
            .subscribe(() => {
                this.map.layers
                    .filter(layer => layer.options.linkedLayers?.links)
                    .map(layer => {
                        layer.options.linkedLayers.links.map(link => {
                            if (link.properties?.indexOf(LinkedProperties.VISIBLE) !== -1) {
                                layer.ol.set('visible', !(layer.visible), false);
                                layer.ol.set('visible', !(layer.visible), false);
                                layer.visible = layer.visible;
                            }
                            if (link.properties?.indexOf(LinkedProperties.OPACITY) !== -1) {
                                const baseOpacity = layer.ol.get('opacity');
                                layer.ol.set('opacity', 0, false);
                                layer.ol.set('opacity', baseOpacity, false);
                                layer.opacity = layer.opacity;
                            }
                            if (link.properties?.indexOf(LinkedProperties.MINRESOLUTION) !== -1) {
                                const baseMinResolution = layer.ol.get('minResolution');
                                layer.ol.set('minResolution', 0, false);
                                layer.ol.set('minResolution', baseMinResolution, false);
                                layer.minResolution = layer.minResolution;
                            }
                            if (link.properties?.indexOf(LinkedProperties.MAXRESOLUTION) !== -1) {
                                const baseMaxResolution = layer.ol.get('maxResolution');
                                layer.ol.set('maxResolution', 0, false);
                                layer.ol.set('maxResolution', baseMaxResolution, false);
                                layer.minResolution = layer.minResolution;
                            }
                            if (link.properties?.indexOf(LinkedProperties.OGCFILTERS) !== -1) {
                                const ogcFilters$ = (layer.dataSource as OgcFilterableDataSource).ogcFilters$;
                                ogcFilters$.next(ogcFilters$.value);
                            }
                            if (link.properties?.indexOf(LinkedProperties.TIMEFILTER) !== -1) {
                                const timeFilter$ = (layer.dataSource as TimeFilterableDataSource).timeFilter$;
                                timeFilter$.next(timeFilter$.value);
                            }
                        });
                    });
            });
    }

    private transferCommonProperties(layerChange) {
        const key = layerChange.key;
        const layerChangeProperties = layerChange.target.getProperties();
        const newValue = layerChangeProperties[key];

        if (['visible', 'opacity', 'minResolution', 'maxResolution'].indexOf(key) === -1) {
            return;
        }
        const linkedLayers = layerChangeProperties.linkedLayers as LayersLink;
        if (!linkedLayers) {
            return;
        }
        const currentLinkedId = linkedLayers.linkId;
        const currentLinks = linkedLayers.links;
        const isParentLayer = currentLinks ? true : false;

        if (isParentLayer) {
            // search for child layers
            const silent = true;
            currentLinks.map(link => {
                if (!link.properties || link.properties.indexOf(key) === -1) {
                    return;
                }
                link.linkedIds.map(linkedId => {
                    const layerToApply = this.map.layers.find(layer => layer.options.linkedLayers?.linkId === linkedId);
                    if (layerToApply) {
                        layerToApply.ol.set(key, newValue, silent);
                        if (key === 'visible') {
                            layerToApply.visible$.next(newValue);
                        }
                    }
                });
            });
        } else {
            // search for parent layer
            const silent = false;
            this.map.layers.map(layer => {
                if (layer.options.linkedLayers?.links) {
                    layer.options.linkedLayers.links.map(l => {
                        if (l.properties && l.properties.indexOf(key) !== -1 &&
                            l.bidirectionnal !== false && l.linkedIds.indexOf(currentLinkedId) !== -1) {
                            layer.ol.set(key, newValue, silent);
                            if (key === 'visible') {
                                layer.visible$.next(newValue);
                            }
                        }
                    });
                }
            });
        }
    }

    private transferOgcFiltersProperties(ogcFilters) {
        const linkedLayers = this.ol.getProperties().linkedLayers as LayersLink;
        if (!linkedLayers) {
            return;
        }
        const currentLinkedId = linkedLayers.linkId;
        const currentLinks = linkedLayers.links;
        const isParentLayer = currentLinks ? true : false;
        if (isParentLayer) {
            // search for child layers
            currentLinks.map(link => {
                if (!link.properties || link.properties.indexOf(LinkedProperties.OGCFILTERS) === -1) {
                    return;
                }
                link.linkedIds.map(linkedId => {
                    const layerToApply = this.map.layers.find(layer => layer.options.linkedLayers?.linkId === linkedId);
                    if (layerToApply) {
                        const layerType = layerToApply.ol.getProperties().sourceOptions.type;
                        (layerToApply.dataSource as OgcFilterableDataSource).setOgcFilters(ogcFilters, false);
                        if (layerType === 'wfs') {
                            layerToApply.ol.getSource().clear();
                            layerToApply.ol.getSource().refresh();
                        }
                        if (layerType === 'wms') {
                            let appliedOgcFilter;
                            if (this.ol.getProperties().sourceOptions.type === 'wfs') {
                                appliedOgcFilter = this.ogcFilterWriter.handleOgcFiltersAppliedValue(
                                    this.layer.dataSource.options as OgcFilterableDataSourceOptions,
                                    (this.dataSource.options as any).fieldNameGeometry,
                                    undefined,
                                    this.map.viewController.getOlProjection()
                                );
                            } else if (this.ol.getProperties().sourceOptions.type === 'wms') {
                                appliedOgcFilter = (this.dataSource as WMSDataSource).ol.getParams().FILTER;
                            }
                            (layerToApply.dataSource as WMSDataSource).ol.updateParams({ FILTER: appliedOgcFilter });
                        }
                    }
                });
            });
        } else {
            // search for parent layer
            this.map.layers.map(layer => {
                if (layer.options.linkedLayers?.links) {
                    layer.options.linkedLayers.links.map(l => {
                        if (l.properties && l.properties.indexOf(LinkedProperties.OGCFILTERS) !== -1 &&
                            l.bidirectionnal !== false && l.linkedIds.indexOf(currentLinkedId) !== -1) {
                            const layerType = layer.ol.getProperties().sourceOptions.type;
                            if (layerType === 'wfs') {
                                (layer.dataSource as OgcFilterableDataSource).setOgcFilters(ogcFilters, true);
                                layer.ol.getSource().clear();
                                layer.ol.getSource().refresh();
                            }
                            if (layerType === 'wms') {
                                let appliedOgcFilter;
                                if (this.ol.getProperties().sourceOptions.type === 'wfs') {
                                    appliedOgcFilter = this.ogcFilterWriter.handleOgcFiltersAppliedValue(
                                        layer.dataSource.options as OgcFilterableDataSourceOptions,
                                        (this.dataSource.options as any).fieldNameGeometry,
                                        undefined,
                                        this.map.viewController.getOlProjection()
                                    );

                                } else if (this.ol.getProperties().sourceOptions.type === 'wms') {
                                    appliedOgcFilter = (this.dataSource as WMSDataSource).ol.getParams().FILTER;
                                }
                                (layer.dataSource as WMSDataSource).ol.updateParams({ FILTER: appliedOgcFilter });
                                (layer.dataSource as OgcFilterableDataSource).setOgcFilters(ogcFilters, true);
                            }
                        }
                    });
                }
            });
        }
    }

    private transferTimeFilterProperties(timeFilter) {
        const linkedLayers = this.ol.getProperties().linkedLayers as LayersLink;
        if (!linkedLayers) {
            return;
        }
        const currentLinkedId = linkedLayers.linkId;
        const currentLinks = linkedLayers.links;
        const isParentLayer = currentLinks ? true : false;
        if (isParentLayer) {
            // search for child layers
            currentLinks.map(link => {
                if (!link.properties || link.properties.indexOf(LinkedProperties.TIMEFILTER) === -1) {
                    return;
                }
                link.linkedIds.map(linkedId => {
                    const childLayer = this.map.layers.find(layer =>
                        layer.dataSource instanceof WMSDataSource &&
                        layer.options.linkedLayers?.linkId === linkedId);
                    if (childLayer) {
                        (childLayer.dataSource as TimeFilterableDataSource).setTimeFilter(timeFilter, false);
                        const appliedTimeFilter = this.ol.values_.source.getParams().TIME;
                        (childLayer.dataSource as WMSDataSource).ol.updateParams({ TIME: appliedTimeFilter });
                    }
                });
            });
        } else {
            // search for parent layer
            this.map.layers
                .filter(layer => layer.dataSource instanceof WMSDataSource)
                .map(parentLayer => {
                    if (parentLayer.options.linkedLayers?.links) {
                        parentLayer.options.linkedLayers.links.map(l => {
                            if (l.properties && l.properties.indexOf(LinkedProperties.TIMEFILTER) !== -1 &&
                                l.bidirectionnal !== false && l.linkedIds.indexOf(currentLinkedId) !== -1) {
                                const appliedTimeFilter = this.ol.values_.source.getParams().TIME;
                                (parentLayer.dataSource as WMSDataSource).ol.updateParams({ TIME: appliedTimeFilter });
                                (parentLayer.dataSource as TimeFilterableDataSource).setTimeFilter(timeFilter, true);
                            }
                        });
                    }
                });
        }
    }





}
