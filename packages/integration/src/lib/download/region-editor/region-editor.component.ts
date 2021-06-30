import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSlider } from '@angular/material/slider';
import { createFromTemplate } from 'ol/tileurlfunction.js';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { DownloadState } from '../download.state';
import { TransferedTile } from '../TransferedTile';
import { MessageService } from '@igo2/core';
import { first, map, skip, takeUntil, takeWhile } from 'rxjs/operators';
import { filter } from 'jszip';
import { DownloadToolState } from './../download-tool/download-tool.state';
import { MatInput } from '@angular/material/input';
import { TileDownloaderService, DownloadRegionService, TileToDownload } from '@igo2/core';
import { uuid } from '@igo2/utils';

import { fromExtent } from 'ol/geom/Polygon';
import OlFeature from 'ol/Feature';
import * as olformat from 'ol/format';
import { Feature, FEATURE } from '@igo2/geo';
import { RegionDBService, StorageQuotaService } from '@igo2/core';
import { RegionEditorState } from './region-editor.state';


@Component({
  selector: 'igo-region-editor',
  templateUrl: './region-editor.component.html',
  styleUrls: ['./region-editor.component.scss']
})
export class RegionEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('depthSlider') slider: MatSlider;
  @ViewChild('progressBar') progressBar: MatProgressBar;

  private _nTilesToDownload: number;
  private _notEnoughSpace$: Observable<boolean>;
  private _progression: number = 0;

  isDownloading$: Observable<boolean>; 
  isDownloading$$: Subscription;

  private addNewTile$$: Subscription;

  constructor(
    private tileDownloader: TileDownloaderService,
    private downloadService: DownloadRegionService,
    private downloadState: DownloadState,
    private state: RegionEditorState,
    private messageService: MessageService,
    private storageQuota: StorageQuotaService
  ) {
    const openedWithMouse = this.downloadState.openedWithMouse;
    const numberToSkip = openedWithMouse ? 0 : 1;
    this.addNewTile$$ = this.downloadState.addNewTile$
      .pipe(skip(numberToSkip))
      .subscribe((tile: TransferedTile) => {
        if (!tile) {
          return;
        }
        this.addTileToDownload(tile.coord, tile.templateUrl, tile.tileGrid);
      });

    this.isDownloading$ = this.tileDownloader.isDownloading$;

    if (!this.progression$) {
      this.progression$ = this.tileDownloader.progression$
        .pipe(map((value: number) => {
          return Math.round(value / this._nTilesToDownload * 100);
        }));
    }
  }

  ngOnInit() {
    if (!this.editedTilesFeature) {
      this.regionStore.updateMany(this.editedTilesFeature);
    }
  }

  ngAfterViewInit() {
    this.slider.value = this.depth;
  }

  ngOnDestroy() {
    this.addNewTile$$.unsubscribe();
    this.regionStore.clear();
  }

  private updateVariables() {
    this._notEnoughSpace$ = this.storageQuota.enoughSpace(this.sizeEstimationInBytes())
      .pipe(map((value) => { 
        return !value;
      }));
  }

  private getTileFeature(tileGrid, coord: [number, number, number]) {
    const id = uuid();
    const previousRegion = this.regionStore.get(id);
    const previousRegionRevision = previousRegion ? previousRegion.meta.revision : 0;

    const polygonGeometry = fromExtent(tileGrid.getTileCoordExtent(coord));
    
    const feature: OlFeature = new OlFeature(polygonGeometry);

    const projectionIn = 'EPSG:4326'
    const projectionOut = 'EPSG:4326'

    const featuresText: string = new olformat.GeoJSON().writeFeature(
      feature,
      {
        dataProjection: projectionOut,
        featureProjection: projectionIn,
        featureType: 'feature',
        featureNS: 'http://example.com/feature'
      }
    );

    const regionFeature: Feature = {
      type: FEATURE,
      geometry: JSON.parse(featuresText).geometry,
      projection: this.map.projection,
      properties: {
        id:id,
        stopOpacity: 1
      },
      meta: {
        id: id,
        revision: previousRegionRevision + 1
      },
      ol: feature
    };
    return regionFeature;
  }

  public clearFeatures() {
    this.editedTilesFeature = new Array();
    this.regionStore.clear();
  }

  public showEditedRegionFeatures() {
    this.regionStore.clear();
    if (!this.editedTilesFeature) {
      return;
    }
    
    this.regionStore.updateMany(this.editedTilesFeature);
  }

  addTileToDownload(coord: [number, number, number], templateUrl, tileGrid) {
    try {
      const urlGen = createFromTemplate(templateUrl, tileGrid);
      const url = urlGen(coord, 0, 0);

      const z = coord[0];
      const firstTile = this.tilesToDownload[0];
      if (!firstTile) {
        this.urlsToDownload.add(url);
        const feature = this.getTileFeature(tileGrid, coord);
        const featureText = JSON.stringify(feature);
        
        this.editedTilesFeature.push(feature);
        this.tilesToDownload.push({ url, coord, templateUrl, tileGrid, featureText});
        this.showEditedRegionFeatures();
        return;
      }

      const firstZ = firstTile.coord[0];
      if (z !== firstZ) {
        this.messageService.error('The tile you selected is not on the same level as the previous ones');
        return;
      }
      if (!this.urlsToDownload.has(url)) {
        this.urlsToDownload.add(url);
        const feature = this.getTileFeature(tileGrid, coord);
        const featureText = JSON.stringify(feature);
        
        this.editedTilesFeature.push(feature);
        this.tilesToDownload.push({ url, coord, templateUrl, tileGrid, featureText});
        this.showEditedRegionFeatures();
        this.updateVariables();
      } else {
        this.messageService.error('The tile is already selected');
      }
    } catch (e) {
      return;
    }
  }

  public onDownloadClick() {
    if (this.tilesToDownload.length === 0) {
      return;
    }

    this._nTilesToDownload = this.numberOfTilesToDownload();

    if (this.isDownloading$$) {
      this.isDownloading$$.unsubscribe();
    }

    this.isDownloading$$ = this.isDownloading$
      .pipe(skip(1))
      .subscribe((value) => {
        this.isDownloading = value;
        if (!value) {
          this.messageService.success('Your download is done');
        }
      });

    this.downloadService.downloadSelectedRegion(
      this.tilesToDownload,
      this.regionName,
      this.depth
      );
  }

  public onCancelClick() {
    this.tilesToDownload = new Array();
    this.urlsToDownload = new Set();
    this.regionName = undefined;
    this.depth = 0;
    this.clearFeatures();
    this.updateVariables();
  }

  public onDepthSliderChange() {
    this.depth = this.slider.value;
    this.updateVariables();
  }

  private sizeEstimationInBytes(): number {
    const space = this.tileDownloader.downloadEstimatePerDepth(this.depth);
    const nDownloads = this.tilesToDownload.length;
    return space * nDownloads;
  }

  public sizeEstimationInMB() {
    const size = this.sizeEstimationInBytes();
    return (size * 1e-6).toFixed(4);
  }

  public numberOfTilesToDownload() {
    const nTilesPerDownload = this.tileDownloader.numberOfTiles(this.depth);
    const nDownloads = this.tilesToDownload.length;
    return nTilesPerDownload * nDownloads;
  }

  private get regionStore() {
    return this.downloadState.regionStore;
  }

  private get map() {
    return this.downloadState.map;
  }

  set regionName(name: string) {
    this.state.regionName = name;
  }

  get regionName(): string {
    return this.state.regionName;
  }

  set urlsToDownload(urls: Set<string>) {
    this.state.urlsToDownload = urls;
  }

  get urlsToDownload(): Set<string> {
    return this.state.urlsToDownload;
  }

  set tilesToDownload(tiles: TileToDownload[]) {
    this.state.tilesToDownload = tiles;
  }

  get tilesToDownload(): TileToDownload[] {
      return this.state.tilesToDownload;
  }

  set depth(depth: number) {
      this.state.depth = depth;
  }

  get depth(): number {
      return this.state.depth;
  }

  set editedTilesFeature(features: Feature[]) {
      this.state.editedTilesFeatures = features;
  }

  get editedTilesFeature(): Feature[] {
      return this.state.editedTilesFeatures ;
  }

  set progression$(progression$: Observable<number>) {
    this.state.progression$ = progression$;
  }

  get progression$(): Observable<number> {
    return this.state.progression$;
  }

  set isDownloading(value: boolean) {
    this.state.isDownloading = value;
  }

  get isDownloading(): boolean {
    return this.state.isDownloading;
  }

  get invalidDownloadSize$(): Observable<boolean> {
    return this._notEnoughSpace$;
  }

  get progression(): number {
    return Math.round(this._progression * 100);
  }

  get disableSlider() {
    return this.isDownloading || this.tilesToDownload.length === 0;
  }

  get disableDownloadButton() {
    return !this.regionName || this.isDownloading || this.tilesToDownload.length === 0;
  }

  get disableCancelButton() {
    return this.isDownloading;
  }
}