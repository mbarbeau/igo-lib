import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TileToDownload } from '../region-editor/region-editor.component';

@Injectable({
   providedIn: 'root'
 })
export class DownloadToolState {
    public _regionsUpToDate: boolean;
    private readonly _regionsUpToDate$: BehaviorSubject<boolean> = new BehaviorSubject(undefined);
    private _depth: number = 0;
    private _tilesToDownload: TileToDownload[] = new Array();
    private _urlsToDownload: Set<string> = new Set();
    private _isDownloading: boolean = false;
    private _regionName: string;
    private _isDownloading$: Observable<boolean>;
    private _progression$: Observable<number>;
    
    constructor() {}

    updateRegion() {
        this._regionsUpToDate = false;
        this._regionsUpToDate$.next(false);
    }

    regionUpdated() {
        this._regionsUpToDate = true;
        this._regionsUpToDate$.next(true);
    }

    get regionsUpToDate$() {
        return this._regionsUpToDate$;
    }

    set regionsUpToDate(value: boolean) {
        this._regionsUpToDate = value;
    }

    get regionsUpToDate() {
        return this._regionsUpToDate
    }

    set depth(value: number) {
        this._depth = value;
    }

    get depth() {
        return this._depth;
    }

    set tilesToDownload(value: TileToDownload[]) {
        this._tilesToDownload = value;
    }

    get tilesToDownload() {
        return this._tilesToDownload;
    }

    set urlsToDownload(value: Set<string>) {
        this._urlsToDownload = value;
    }

    get urlsToDownload() {
        return this._urlsToDownload;
    }

    set isDownloading(value: boolean) {
        this._isDownloading = value;
    }

    get isDownloading() {
        return this._isDownloading;
    }
    
    
    set isDownloading$(value: Observable<boolean>) {
        this._isDownloading$ = value;
    }
    
    get regionName(): string {
        return this._regionName;
    }

    set regionName(value: string) {
        this._regionName = value;
    }

    get isDownloading$() {
        return this._isDownloading$;
    }

    set progression$(value: Observable<number>) {
        this._progression$ = value;
    }

    get progression$() {
        return this._progression$;
    }

}
