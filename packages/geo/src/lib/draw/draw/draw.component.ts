import {
    Component,
    Input,
    OnInit,
    OnDestroy,
    ChangeDetectionStrategy,
    Output
  } from '@angular/core';

import {
    FEATURE,
    FeatureStore,
    FeatureStoreSelectionStrategy,
    tryBindStoreLayer,
    tryAddLoadingStrategy,
    tryAddSelectionStrategy,
    FeatureMotion,
    FeatureStoreLoadingStrategy,
  } from '../../feature';

import { LanguageService } from '@igo2/core';
import { MatDialog } from '@angular/material/dialog';
import { DrawType } from '../shared/draw.enum';
import { IgoMap } from '../../map/shared/map';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Draw, FeatureWithDraw } from '../shared/draw.interface';
import { FormGroup, FormBuilder } from '@angular/forms';
import { VectorSourceEvent as OlVectorSourceEvent } from 'ol/source/Vector';
import { VectorLayer } from '../../layer/shared/layers/vector-layer';
import { FeatureDataSource } from '../../datasource/shared/datasources/feature-datasource';
import { DrawControl } from '../../geometry/shared/controls/draw';
import { EntityRecord, EntityTableTemplate } from '@igo2/common';

import OlStyle from 'ol/style/Style';
import OlVectorSource from 'ol/source/Vector';
import OlPoint from 'ol/geom/Point';
import OlLineString from 'ol/geom/LineString';
import OlPolygon from 'ol/geom/Polygon';
import OlCircle from 'ol/geom/Circle';
import OlGeoJSON from 'ol/format/GeoJSON';
import OlOverlay from 'ol/Overlay';
import { getDistance } from 'ol/sphere';
import { uuid } from '@igo2/utils';
import { DrawStyleService } from '../shared/draw-style.service';
import { skip } from 'rxjs/operators';
import { DrawPopupComponent } from './draw-popup.component';
import { getTooltipsOfOlGeometry } from '../../measure/shared/measure.utils';
import { createDrawingInteractionStyle } from '../shared/draw.utils';
import { transform } from 'ol/proj';
import { DrawIconService } from '../shared/draw-icon.service';

@Component ({
    selector: 'igo-draw',
    templateUrl: './draw.component.html',
    styleUrls: ['./draw.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class DrawComponent implements OnInit, OnDestroy {

    /**
     * Table template
     * @internal
     */
    public tableTemplate: EntityTableTemplate = {
        selection: true,
        selectMany: true,
        selectionCheckbox: true,
        sort: true,
        columns: [
            {
                name: 'Drawing',
                title: this.languageService.translate.instant('igo.geo.draw.labels'),
                valueAccessor: (feature: FeatureWithDraw) => {
                    return feature.properties.draw;
                }
            }
        ]
    };
    /**
     * Reference to the DrawType enum
     * @internal
     */
    public drawType = DrawType;

    @Output() fillColor: any;
    @Output() strokeColor: any;

    /**
     * The map to draw on
     */
    @Input() map: IgoMap;

    /**
     * The draws store
     */
    @Input() store: FeatureStore<FeatureWithDraw>;

    /**
     * Observable of draw
     * @internal
     */
    public draw$: BehaviorSubject<Draw> = new BehaviorSubject({});

    /**
     * Draw type
     * @internal
     */
    @Input()
    set activeDrawType(value: DrawType) { this.setActiveDrawType(value); }
    get activeDrawType(): DrawType { return this._activeDrawType; }

    /**
     * Wheter one of the draw control is active
     * @internal
     */
    get drawControlIsActive(): boolean {
        return this.activeDrawControl !== undefined;
    }

    private _activeDrawType: DrawType = DrawType.Point;
    private activeDrawControl: DrawControl;
    private olDrawSource = new OlVectorSource();
    private drawPointControl: DrawControl;
    private drawLineControl: DrawControl;
    private drawPolygonControl: DrawControl;
    private drawCircleControl: DrawControl;
    private drawEnd$$: Subscription;
    private layer: VectorLayer;
    public selectedFeatures$: BehaviorSubject<FeatureWithDraw[]> = new BehaviorSubject([]);
    public showTooltips: boolean;
    public fillForm: string;
    public strokeForm: string;
    public toggleLabel: boolean;
    public drawsPresence: boolean = false;

    public position: string = 'bottom';
    public form: FormGroup;
    public icons: Array<string>;
    public icon: string;

    constructor(
        private languageService: LanguageService,
        private formBuilder: FormBuilder,
        private drawStyleService: DrawStyleService,
        private dialog: MatDialog,
        private drawIconService: DrawIconService
    ) {
        this.buildForm();
        this.fillColor = this.drawStyleService.getFill();
        this.strokeColor = this.drawStyleService.getStroke();
        this.showTooltips = this.drawStyleService.getToggleLabel();
        this.toggleLabel = this.drawStyleService.getToggleLabel();
        this.icons = this.drawIconService.getIcons();
        this.icon = this.drawStyleService.getIcon();
    }

    ngOnInit() {
        this.initStore();
        this.createDrawPointControl();
        this.createDrawLineControl();
        this.createDrawPolygonControl();
        this.createDrawCircleControl();
        this.toggleDrawControl();
        this.checkStoreCount();
    }

    /**
     * Clear the overlay layer and any interaction added by this component.
     * @internal
     */
    ngOnDestroy() {
        this.setActiveDrawType(undefined);
    }

    createDrawPointControl(fill?: string, stroke?: string) {
        this.drawPointControl = new DrawControl({
            geometryType: DrawType.Point,
            source: this.olDrawSource,
            layerStyle: new OlStyle({}),
            drawStyle: createDrawingInteractionStyle(this.fillColor, this.strokeColor)
        });
    }

    createDrawLineControl(fill?: string, stroke?: string) {
        this.drawLineControl = new DrawControl({
            geometryType: DrawType.LineString,
            source: this.olDrawSource,
            layerStyle: new OlStyle({}),
            drawStyle: createDrawingInteractionStyle(this.fillColor, this.strokeColor)
        });
    }

    createDrawPolygonControl(fill?: string, stroke?: string) {
        this.drawPolygonControl = new DrawControl({
            geometryType: DrawType.Polygon,
            source: this.olDrawSource,
            layerStyle: new OlStyle({}),
            drawStyle: createDrawingInteractionStyle(this.fillColor, this.strokeColor)
        });
    }

    createDrawCircleControl(fill?: string, stroke?: string) {
        this.drawCircleControl = new DrawControl({
            geometryType: DrawType.Circle,
            source: this.olDrawSource,
            layerStyle: new OlStyle({}),
            drawStyle: createDrawingInteractionStyle(this.fillColor, this.strokeColor)
        });
    }

    onDrawTypeChange(drawType: DrawType) {
        this.activeDrawType = drawType;
    }

    private initStore() {
        const store = this.store;
        this.map.removeLayer(this.layer);

        this.layer = new VectorLayer({
          title: this.languageService.translate.instant('igo.geo.draw.drawing'),
          zIndex: 200,
          source: new FeatureDataSource(),
          style: (feature, resolution) => {
            return this.drawStyleService.createDrawLayerStyle(feature, resolution, true, this.icon);
          },
          showInLayerList: true,
          exportable: true,
          browsable: false,
          workspace: {
            enabled: false
          },
        });
        tryBindStoreLayer(store, this.layer);

        tryAddLoadingStrategy(store, new FeatureStoreLoadingStrategy({
            motion: FeatureMotion.None
          }));

        tryAddSelectionStrategy(store, new FeatureStoreSelectionStrategy({
          map: this.map,
          motion: FeatureMotion.None,
          many: true
        }));


        store.source.ol.on('removefeature', (event: OlVectorSourceEvent) => {
            const olGeometry = event.feature.getGeometry();
            this.clearTooltipsOfOlGeometry(olGeometry);
        });

        store.stateView.manyBy$((record: EntityRecord<FeatureWithDraw>) => {
            return record.state.selected === true;
        }).pipe(
            skip(1)  // Skip initial emission
        )
        .subscribe((records: EntityRecord<FeatureWithDraw>[]) => {
            this.selectedFeatures$.next(records.map(record => record.entity));
        });

    }

    changeStoreLayerStyle(enableLabel: boolean, icon: boolean) {
        this.fillForm = this.fillColor;
        this.strokeForm = this.strokeColor;
        this.drawStyleService.setFill(this.fillColor);
        this.drawStyleService.setStroke(this.strokeColor);
        if (enableLabel && !icon) {
            this.store.layer.ol.setStyle((feature, resolution) => {
                return this.drawStyleService.createDrawLayerStyle(feature, resolution, true);
            });
            this.icon = undefined;
        } else if (!enableLabel && !icon) {
            this.store.layer.ol.setStyle((feature, resolution) => {
                return this.drawStyleService.createDrawLayerStyle(feature, resolution, false);
            });
            this.icon = undefined;
        } else if (enableLabel && icon) {
            this.store.layer.ol.setStyle((feature, resolution) => {
                return this.drawStyleService.createDrawLayerStyle(feature, resolution, true, this.icon);
            });
        } else if (!enableLabel && icon) {
            this.store.layer.ol.setStyle((feature, resolution) => {
                return this.drawStyleService.createDrawLayerStyle(feature, resolution, false, this.icon);
            });
        }
        this.createDrawPointControl();
        this.createDrawLineControl();
        this.createDrawPolygonControl();
        this.createDrawCircleControl();
    }

    /**
     * Activate or deactivate the current draw control
     * @internal
     */
    onToggleDrawControl(toggle: boolean) {
        if (toggle === true) {
            this.toggleDrawControl();
        } else {
            this.deactivateDrawControl();
        }
    }

    /**
     * Activate the right control
     */
    private toggleDrawControl() {
        this.deactivateDrawControl();
        // this.deactivateModifyControl();
        if (this.activeDrawType === DrawType.Point) {
        this.activateDrawControl(this.drawPointControl);
        } else if (this.activeDrawType === DrawType.LineString) {
        this.activateDrawControl(this.drawLineControl);
        } else if (this.activeDrawType === DrawType.Polygon) {
            this.activateDrawControl(this.drawPolygonControl);
        } else if (this.activeDrawType === DrawType.Circle) {
            this.activateDrawControl(this.drawCircleControl);
        }
    }

    private openDialog(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle): void {
        const dialogRef = this.dialog.open(DrawPopupComponent, {
            disableClose: false
        });

        dialogRef.afterClosed().subscribe (() => {
            dialogRef.componentInstance.onOk$.subscribe(label => {
                this.updateLabelOfOlGeometry(olGeometry, label);
                this.onDrawEnd(olGeometry);
                this.checkStoreCount();
            });
        });
    }

    /**
     * Activate a given control
     * @param drawControl Draw control
     */
    private activateDrawControl(drawControl: DrawControl) {
        this.activeDrawControl = drawControl;
        this.drawEnd$$ = drawControl.end$
        .subscribe((olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle) => {
            this.openDialog(olGeometry);
        });

        drawControl.setOlMap(this.map.ol);
    }

    /**
     * Deactivate the active draw control
     */
    private deactivateDrawControl() {
        if (this.activeDrawControl === undefined) {
            return;
        }

        this.olDrawSource.clear();
        if (this.drawEnd$$ !== undefined ) { this.drawEnd$$.unsubscribe(); }

        this.activeDrawControl.setOlMap(undefined);
        this.activeDrawControl = undefined;
    }

    /**
     * Clear the draw source and track the geometry being draw
     * @param olGeometry Ol linestring or polygon
     */
    private onDrawEnd(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle) {
        this.addFeatureToStore(olGeometry);
        this.clearTooltipsOfOlGeometry(olGeometry);
        this.olDrawSource.clear(true);
    }

    private setActiveDrawType(drawType: DrawType) {
        this._activeDrawType = drawType;
        this.toggleDrawControl();
    }

    /**
     * Add a feature with draw label to the store. The loading stragegy of the store
     * will trigger and add the feature to the map.
     * @internal
     */
    private addFeatureToStore(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle, feature?: FeatureWithDraw) {
        let rad;
        const featureId = feature ? feature.properties.id : uuid();
        const projection = this.map.ol.getView().getProjection();

        const geometry = new OlGeoJSON().writeGeometryObject(olGeometry, {
            featureProjection: projection,
            dataProjection: projection
        });

        if (olGeometry instanceof OlCircle) {
            geometry.type = 'Point';
            geometry.coordinates = olGeometry.getCenter();
            const extend4326 = transform([olGeometry.flatCoordinates[2], olGeometry.flatCoordinates[3]], projection, 'EPSG:4326');
            const center4326 = transform([olGeometry.flatCoordinates[0], olGeometry.flatCoordinates[1]], projection, 'EPSG:4326');
            rad = getDistance(center4326, extend4326);
        }

        this.store.update({
            type: FEATURE,
            geometry,
            projection: projection.getCode(),
            properties: {
                id: featureId,
                draw: olGeometry.get('_label'),
                radius: rad ? rad : undefined
            },
            meta: {
                id: featureId
            }
        });
        this.drawStyleService.raiseDrawCounter();
    }

    private buildForm() {
        this.form = this.formBuilder.group({
            fill: [''],
            stroke: ['']
        });
    }

    deleteDrawings() {
        this.store.deleteMany(this.selectedFeatures$.value);
        this.checkStoreCount();
    }

    /**
     * Clear the tooltips of an OL geometrys
     * @param olGeometry OL geometry with tooltips
     */
    private clearTooltipsOfOlGeometry(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle) {
        getTooltipsOfOlGeometry(olGeometry).forEach((olTooltip: OlOverlay | undefined) => {
            if (olTooltip !== undefined && olTooltip.getMap() !== undefined) {
                this.map.ol.removeOverlay(olTooltip);
            }
        });
    }

    onToggleTooltips(toggle: boolean) {
        this.drawStyleService.switchLabel();
        this.toggleLabel = !this.toggleLabel;
        if (this.icon) {
            this.changeStoreLayerStyle(this.toggleLabel, true);
        } else {
            this.changeStoreLayerStyle(this.toggleLabel, false);
        }
    }

    private updateLabelOfOlGeometry(olGeometry: OlPoint | OlLineString | OlPolygon | OlCircle, label: string) {
        olGeometry.setProperties({_label: label}, true);
    }

    onIconChange(event?) {
        this.icon = event;
        this.drawStyleService.setIcon(this.icon);
        this.store.layer.ol.setStyle((feature, resolution) => {
            return this.drawStyleService.createDrawLayerStyle(feature, resolution, true, this.icon);
        });
    }

    private checkStoreCount() {
        if (this.store.count$.getValue() !== 0) {
            this.drawsPresence = true;
        } else {
            this.drawsPresence = false;
        }
    }
}
