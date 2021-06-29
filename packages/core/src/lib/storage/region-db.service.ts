import { Injectable } from '@angular/core';
import { DBMode, NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable, Subject } from 'rxjs';

export interface Region {
  name: string;
  parentUrls: string[];
  parentFeatureText: string[];
  numberOfTiles: number;
}
export interface RegionDate extends Region {
  timestamp: Date;
}

export interface DBRegion extends RegionDate {
  id: number;
}

function createRegionDateFromRegion(region: Region): RegionDate {
  const regionDate: RegionDate = <RegionDate>{};
  regionDate.name = region.name;
  regionDate.numberOfTiles = region.numberOfTiles;
  regionDate.parentUrls = region.parentUrls;
  regionDate.timestamp = new Date();
  return regionDate;
}

@Injectable({
  providedIn: 'root'
})
export class RegionDBService {
  readonly dbName: string = 'regionData';
  readonly update$: Subject<boolean> = new Subject();
  constructor(private dbService: NgxIndexedDBService) { }

  update(region: DBRegion): Observable<DBRegion[]> {
    if (!region) {
      return;
    }
    region.timestamp = new Date();
    const dbRequest = this.dbService.update(this.dbName, region);
    dbRequest.subscribe(() => {
      this.update$.next(true);
    });
  }

  add(region: Region): Observable<number> {
    if (!region) {
      return;
    }
    const regionDate: RegionDate = createRegionDateFromRegion(region);
    const dbRequest = this.dbService.add(this.dbName, regionDate);
    dbRequest.subscribe((key) => {
      this.update$.next(true);
    });
    return dbRequest;
  }

  getAll(): Observable<DBRegion[]> {
    return this.dbService.getAll(this.dbName);
  }

  deleteByRegionID(regionID: number): Observable<boolean> {
    if (!regionID) {
      return;
    }

    const dbRequest = this.dbService.deleteByKey(this.dbName, regionID);
    dbRequest.subscribe(() => {
      this.update$.next(true);
    });
    return dbRequest;
  }

  openCursor(
    keyRange: IDBKeyRange = IDBKeyRange.lowerBound(0), 
    mode: DBMode = DBMode.readonly
  ) {
    // need to update when openCursor is fixed in ngx-indexed-db
    const request = this.dbService.openCursorByIndex(this.dbName, 'name', keyRange, mode);
    return request;
  }

  updateWithCollisions(collisionsMap: Map<number, number>) {
    const it = collisionsMap.keys();
    let regionID = it.next().value;
    while (regionID !== undefined) {
      const collisions = collisionsMap.get(regionID);
      this.dbService.getByID(this.dbName, regionID).subscribe(
        (region: DBRegion) => {
          region.numberOfTiles -= collisions;
          this.updateWithNoTimestamp(region);
        }
      );
      regionID = it.next().value;
    }
  }

  needUpdate() {
    this.update$.next(true);
  }

  private updateWithNoTimestamp(region: DBRegion): Observable<DBRegion[]> {
    if (!region) {
      return;
    }
    const dbRequest = this.dbService.update(this.dbName, region);
    dbRequest.subscribe(() => {
      this.update$.next(true);
    });
  }
}
