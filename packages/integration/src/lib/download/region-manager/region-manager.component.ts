import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DBRegion, DownloadRegionService, Region, RegionDBService } from '@igo2/core';
import { Feature } from '@igo2/geo/public_api';
import { MatCarouselComponent } from '@ngbmodule/material-carousel';
import { BehaviorSubject, Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { MapState } from '../../map';
import { DownloadToolState } from '../download-tool/download-tool.state';
import { DownloadState } from '../download.state';

interface DisplayRegion extends Region {
  id: number;
  name: string;
  numberOfTiles: number;
  parentUrls: string[];
}

@Component({
  selector: 'igo-region-manager',
  templateUrl: './region-manager.component.html',
  styleUrls: ['./region-manager.component.scss']
})
export class RegionManagerComponent implements OnInit, OnDestroy {
  @ViewChild('regionCarousel') regionCarousel: MatCarouselComponent;

  regions: BehaviorSubject<Region[]> = new BehaviorSubject(undefined);
  displayedColumns = ['edit', 'delete', 'name', 'nTiles', 'space'];
  selectedRegionUrls: string[];
  selectedRegionFeatures: Feature[];
  selectedRowID: number = -1;

  constructor(
    private regionDB: RegionDBService,
    private downloadManager: DownloadRegionService,
    private downloadState: DownloadState,
    private mapState: MapState
  ) {
    this.updateRegions();

    this.regionDB.update$.subscribe(() => {
        this.updateRegions();
      }
    );
  }

  ngOnInit() {

  }

  ngOnDestroy() {
    this.clearFeature();
  }

  private get regionStore() {
    return this.downloadState.regionStore;
  }

  private get map() {
    return this.mapState.map;
  }

  updateRegions() {
    this.regionDB.getAll().pipe(first())
      .subscribe((dbRegions: DBRegion[]) => {
        this.selectedRegionUrls = undefined;
        const regions = this.createRegion(dbRegions);
        this.regions.next(regions);
      });
  }

  private createRegion(dBRegions: DBRegion[]) {
    const regions: DisplayRegion[] = [];
    const nameOccurences: Map<string, number> = new Map();
    for (const region of dBRegions) {
      const name = region.name;
      let occurence = nameOccurences.get(name);
      if (occurence === undefined) {
        regions.push({
          id: region.id,
          name,
          parentFeatureText: region.parentFeatureText,
          numberOfTiles: region.numberOfTiles,
          parentUrls: region.parentUrls
        });
        nameOccurences.set(name, 1);
      } else {
        const newName = name + ' (' + occurence + ')';
        regions.push({
          id: region.id,
          name: newName,
          parentFeatureText: region.parentFeatureText,
          numberOfTiles: region.numberOfTiles,
          parentUrls: region.parentUrls
        });
        nameOccurences.set(name, ++occurence);
      }
    }
    return regions;
  }

  public deleteRegion(region) {
    this.downloadManager.deleteRegionByID(region.id);
  }

  public editRegion(region) {
    console.log('Edit ', region);
  }

  public getRegion(row: DisplayRegion) {
    this.selectRegion(row);
    this.regionCarousel.slideTo(0);
    this.showSelectedRegionFeatures();
  }

  private selectRegion(region: DisplayRegion) {
    this.selectedRegionUrls = region.parentUrls;
    this.selectedRowID = region.id;
    this.selectedRegionFeatures = region.parentFeatureText.map(
      (featureText: string) => {
        return JSON.parse(featureText);
      });
  }

  public getRegionSpaceInMB(region: DisplayRegion) {
    const space: number = this.downloadManager
      .getDownloadSpaceEstimate(region.numberOfTiles);
    return (space * 1e-06).toFixed(4);
  }

  public showSelectedRegionFeatures() {
    this.regionStore.clear();
    if (!this.selectedRegionFeatures) {
      return;
    }

    this.regionStore.updateMany(this.selectedRegionFeatures);
  }

  private clearFeature() {
    this.regionStore.clear();
  }
}