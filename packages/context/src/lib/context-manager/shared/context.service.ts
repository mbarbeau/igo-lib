import { Injectable, Optional } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import {
  map,
  tap,
  catchError,
  debounceTime,
  mergeMap,
  first,
  skip
} from 'rxjs/operators';

import olPoint from 'ol/geom/Point';
import GeoJSON from 'ol/format/GeoJSON';
import Cluster from 'ol/source/Cluster';

import { Tool } from '@igo2/common';
import { uuid, ObjectUtils } from '@igo2/utils';
import {
  ConfigService,
  RouteService,
  Message,
  MessageService,
  Notification,
  LanguageService
} from '@igo2/core';

import { AuthService } from '@igo2/auth';
import type { IgoMap, Layer } from '@igo2/geo';

import { TypePermission } from './context.enum';
import {
  ContextsList,
  ContextServiceOptions,
  Context,
  DetailedContext,
  ContextMapView,
  ContextPermission,
  ContextProfils
} from './context.interface';

@Injectable({
  providedIn: 'root'
})
export class ContextService {
  public context$ = new BehaviorSubject<DetailedContext>(undefined);
  public contexts$ = new BehaviorSubject<ContextsList>({ ours: [] });
  public defaultContextId$ = new BehaviorSubject<string>(undefined);
  public editedContext$ = new BehaviorSubject<DetailedContext>(undefined);
  public importedContext: Array<DetailedContext> = [];
  public toolsChanged$ = new Subject<DetailedContext>();
  private mapViewFromRoute: ContextMapView = {};
  private options: ContextServiceOptions;
  private baseUrl: string;
  private contextMessage: Notification;

  // Until the ContextService is completely refactored, this is needed
  // to track the current tools
  private tools: Tool[];
  private toolbar: string[];

  get defaultContextUri(): string {
    return this._defaultContextUri || this.options.defaultContextUri;
  }
  set defaultContextUri(uri: string) {
    this._defaultContextUri = uri;
  }
  private _defaultContextUri: string;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private languageService: LanguageService,
    private config: ConfigService,
    private messageService: MessageService,
    @Optional() private route: RouteService
  ) {
    this.options = Object.assign(
      {
        basePath: 'contexts',
        contextListFile: '_contexts.json',
        defaultContextUri: '_default'
      },
      this.config.getConfig('context')
    );

    this.baseUrl = this.options.url;

    this.readParamsFromRoute();

    if (this.authService.hasAuthService) {
      this.authService.logged$.subscribe((logged) => {
        if (logged) {
          this.contexts$.pipe(skip(1), first()).subscribe((c) => {
            this.handleContextsChange();
          });
          this.loadContexts();
        }
      });
    } else {
      this.loadContexts();
      this.handleContextsChange(false);
    }
  }

  get(permissions?: string[], hidden?: boolean): Observable<ContextsList> {
    let url = this.baseUrl + '/contexts';
    if (permissions && this.authService.authenticated) {
      url += '?permission=' + permissions.join();
      if (hidden) {
        url += '&hidden=true';
      }
    }
    return this.http.get<ContextsList>(url);
  }

  getById(id: string): Observable<Context> {
    const url = this.baseUrl + '/contexts/' + id;
    return this.http.get<Context>(url);
  }

  getDetails(id: string): Observable<DetailedContext> {
    const url = `${this.baseUrl}/contexts/${id}/details`;
    return this.http.get<DetailedContext>(url).pipe(
      catchError((res) => {
        return this.handleError(res, id);
      })
    );
  }

  getDefault(): Observable<DetailedContext> {
    const url = this.baseUrl + '/contexts/default';
    return this.http.get<DetailedContext>(url).pipe(
      tap((context) => {
        this.defaultContextId$.next(context.id);
      })
    );
  }

  getProfilByUser(): Observable<ContextProfils[]> {
    if (this.baseUrl) {
      const url = this.baseUrl + '/profils?';
      return this.http.get<ContextProfils[]>(url);
    }
    return of([]);
  }

  setDefault(id: string): Observable<any> {
    const url = this.baseUrl + '/contexts/default';
    return this.http.post(url, { defaultContextId: id });
  }

  hideContext(id: string) {
    const url = this.baseUrl + '/contexts/' + id + '/hide';
    return this.http.post(url, {});
  }

  showContext(id: string) {
    const url = this.baseUrl + '/contexts/' + id + '/show';
    return this.http.post(url, {});
  }

  delete(id: string, imported = false): Observable<void> {
    const contexts: ContextsList = { ours: [] };
    Object.keys(this.contexts$.value).forEach(
      (key) =>
        (contexts[key] = this.contexts$.value[key].filter((c) => c.id !== id))
    );

    if (imported) {
      this.importedContext = this.importedContext.filter((c) => c.id !== id);
      return of(this.contexts$.next(contexts));
    }

    const url = this.baseUrl + '/contexts/' + id;
    return this.http.delete<void>(url).pipe(
      tap((res) => {
        this.contexts$.next(contexts);
      })
    );
  }

  create(context: DetailedContext): Observable<Context> {
    const url = this.baseUrl + '/contexts';
    return this.http.post<Context>(url, context).pipe(
      map((contextCreated) => {
        if (this.authService.authenticated) {
          contextCreated.permission = TypePermission[TypePermission.write];
        } else {
          contextCreated.permission = TypePermission[TypePermission.read];
        }
        this.contexts$.value.ours.unshift(contextCreated);
        this.contexts$.next(this.contexts$.value);
        return contextCreated;
      })
    );
  }

  clone(id: string, properties = {}): Observable<Context> {
    const url = this.baseUrl + '/contexts/' + id + '/clone';
    return this.http.post<Context>(url, properties).pipe(
      map((contextCloned) => {
        contextCloned.permission = TypePermission[TypePermission.write];
        this.contexts$.value.ours.unshift(contextCloned);
        this.contexts$.next(this.contexts$.value);
        return contextCloned;
      })
    );
  }

  update(id: string, context: Context): Observable<Context> {
    const url = this.baseUrl + '/contexts/' + id;
    return this.http.patch<Context>(url, context);
  }

  // =================================================================

  addToolAssociation(contextId: string, toolId: string): Observable<void> {
    const url = `${this.baseUrl}/contexts/${contextId}/tools`;
    const association = {
      toolId
    };
    return this.http.post<void>(url, association);
  }

  deleteToolAssociation(contextId: string, toolId: string): Observable<any> {
    const url = `${this.baseUrl}/contexts/${contextId}/tools/${toolId}`;
    return this.http.delete(url);
  }

  getPermissions(id: string): Observable<ContextPermission[]> {
    const url = this.baseUrl + '/contexts/' + id + '/permissions';
    return this.http.get<ContextPermission[]>(url);
  }

  addPermissionAssociation(
    contextId: string,
    profil: string,
    type: TypePermission
  ): Observable<ContextPermission[] | Message[]> {
    const url = `${this.baseUrl}/contexts/${contextId}/permissions`;
    const association = {
      profil,
      typePermission: type
    };

    return this.http.post<ContextPermission[]>(url, association).pipe(
      catchError((res) => {
        return [this.handleError(res, undefined, true)];
      })
    );
  }

  deletePermissionAssociation(
    contextId: string,
    permissionId: string
  ): Observable<void> {
    const url = `${this.baseUrl}/contexts/${contextId}/permissions/${permissionId}`;
    return this.http.delete<void>(url);
  }

  // ======================================================================

  getLocalContexts(): Observable<ContextsList> {
    const url = this.getPath(this.options.contextListFile);
    return this.http.get<ContextsList>(url).pipe(
      map((res: any) => {
        return { ours: res };
      })
    );
  }

  getLocalContext(uri: string): Observable<DetailedContext> {
    const url = this.getPath(`${uri}.json`);
    return this.http.get<DetailedContext>(url).pipe(
      mergeMap((res) => {
        if (!res.base) {
          return of(res);
        }
        const urlBase = this.getPath(`${res.base}.json`);
        return this.http.get<DetailedContext>(urlBase).pipe(
          map((resBase: DetailedContext) => {
            const resMerge = res;
            resMerge.map = ObjectUtils.mergeDeep(resBase.map, res.map);
            resMerge.layers = (resBase.layers || [])
              .concat(res.layers || [])
              .reverse()
              .filter(
                (l, index, self) =>
                  !l.id || self.findIndex((l2) => l2.id === l.id) === index
              )
              .reverse();
            resMerge.toolbar = res.toolbar || resBase.toolbar;
            resMerge.message = res.message || resBase.message;
            resMerge.messages = res.messages || resBase.messages;
            resMerge.tools = (res.tools || [])
              .concat(resBase.tools || [])
              .filter(
                (t, index, self) =>
                  self.findIndex((t2) => t2.name === t.name) === index
              );
            return resMerge;
          }),
          catchError((err) => {
            return this.handleError(err, uri);
          })
        );
      }),
      catchError((err2) => {
        return this.handleError(err2, uri);
      })
    );
  }

  loadContexts(permissions?: string[], hidden?: boolean) {
    let request;
    if (this.baseUrl) {
      request = this.get(permissions, hidden);
    } else {
      request = this.getLocalContexts();
    }
    request.subscribe((contexts) => {
      contexts.ours = this.importedContext.concat(contexts.ours);
      this.contexts$.next(contexts);
    });
  }

  loadDefaultContext() {
    const loadFct = (direct = false) => {
      if (!direct && this.baseUrl && this.authService.authenticated) {
        this.getDefault().subscribe(
          (_context: DetailedContext) => {
            this.defaultContextUri = _context.uri;
            this.addContextToList(_context);
            this.setContext(_context);
          },
          () => {
            this.defaultContextId$.next(undefined);
            this.loadContext(this.defaultContextUri);
          }
        );
      } else {
        this.loadContext(this.defaultContextUri);
      }
    };

    if (this.route && this.route.options.contextKey) {
      this.route.queryParams.pipe(debounceTime(100)).subscribe((params) => {
        const contextParam = params[this.route.options.contextKey as string];
        let direct = false;
        if (contextParam) {
          this.defaultContextUri = contextParam;
          direct = true;
        }
        loadFct(direct);
      });
    } else {
      loadFct();
    }
  }

  loadContext(uri: string) {
    const context = this.context$.value;

    if (context && context.uri === uri) {
      return;
    }

    this.getContextByUri(uri)
      .pipe(first())
      .subscribe(
        (_context: DetailedContext) => {
          this.addContextToList(_context);
          this.setContext(_context);
        },
        (err) => {
          if (uri !== this.options.defaultContextUri) {
            this.loadContext(this.options.defaultContextUri);
          }
        }
      );
  }

  setContext(context: DetailedContext) {
    this.handleContextMessage(context);
    const currentContext = this.context$.value;
    if (currentContext && context && context.id === currentContext.id) {
      if (context.map.view.keepCurrentView === undefined) {
        context.map.view.keepCurrentView = true;
      }
      this.context$.next(context);
      return;
    }

    if (!context.map) {
      context.map = { view: {} };
    }

    Object.assign(context.map.view, this.mapViewFromRoute);

    this.context$.next(context);
  }

  loadEditedContext(uri: string) {
    this.getContextByUri(uri).subscribe((_context: DetailedContext) => {
      this.setEditedContext(_context);
    });
  }

  setEditedContext(context: DetailedContext) {
    this.editedContext$.next(context);
  }

  getContextFromMap(igoMap: IgoMap, empty?: boolean): DetailedContext {
    const view = igoMap.ol.getView();
    const proj = view.getProjection().getCode();
    const center: any = new olPoint(view.getCenter()).transform(
      proj,
      'EPSG:4326'
    );

    const context = {
      uri: uuid(),
      title: '',
      scope: 'private',
      map: {
        view: {
          center: center.getCoordinates(),
          zoom: view.getZoom(),
          projection: proj,
          maxZoomOnExtent: igoMap.viewController.maxZoomOnExtent
        }
      },
      layers: [],
      tools: []
    };

    let layers = [];
    if (empty === true) {
      layers = igoMap.layers$
        .getValue()
        .filter(
          (lay) =>
            lay.baseLayer === true ||
            lay.options.id === 'searchPointerSummaryId'
        )
        .sort((a, b) => a.zIndex - b.zIndex);
    } else {
      layers = igoMap.layers$.getValue().sort((a, b) => a.zIndex - b.zIndex);
    }

    let i = 0;
    for (const l of layers) {
      const layer: any = l;
      const opts = {
        id: layer.options.id ? String(layer.options.id) : undefined,
        layerOptions: {
          title: layer.options.title,
          zIndex: ++i,
          visible: layer.visible
        },
        sourceOptions: {
          type: layer.dataSource.options.type,
          params: layer.dataSource.options.params,
          url: layer.dataSource.options.url,
          queryable: layer.queryable
        }
      };
      if (opts.sourceOptions.type) {
        context.layers.push(opts);
      }
    }

    context.tools = this.tools.map((tool) => {
      return { id: String(tool.id), global: tool.global };
    });

    return context;
  }

  getContextFromLayers(
    igoMap: IgoMap,
    layers: Layer[],
    name: string
  ): DetailedContext {
    const currentContext = this.context$.getValue();
    const view = igoMap.ol.getView();
    const proj = view.getProjection().getCode();
    const center: any = new olPoint(view.getCenter()).transform(
      proj,
      'EPSG:4326'
    );

    const context = {
      uri: name,
      title: name,
      map: {
        view: {
          center: center.getCoordinates(),
          zoom: view.getZoom(),
          projection: proj
        }
      },
      layers: [],
      toolbar: [],
      tools: [],
      extraFeatures: []
    };

    const currentLayers = igoMap.layers$.getValue();
    context.layers = currentLayers
      .filter((l) => l.baseLayer)
      .map((l) => {
        return {
          baseLayer: true,
          sourceOptions: l.options.sourceOptions,
          title: l.options.title,
          visible: l.visible
        };
      });

    layers.forEach((layer) => {
      const layerFound = currentContext.layers.find(
        (contextLayer) =>
          layer.id === contextLayer.source.id && !contextLayer.baseLayer
      );

      if (layerFound) {
        let layerStyle = layerFound[`style`];
        if (layerFound[`styleByAttribute`]) {
          layerStyle = undefined;
        } else if (layerFound[`clusterBaseStyle`]) {
          layerStyle = undefined;
          delete layerFound.sourceOptions[`source`];
          delete layerFound.sourceOptions[`format`];
        }
        const opts = {
          baseLayer: layerFound.baseLayer,
          title: layer.options.title,
          zIndex: layer.zIndex,
          styleByAttribute: layerFound[`styleByAttribute`],
          clusterBaseStyle: layerFound[`clusterBaseStyle`],
          style: layerStyle,
          clusterParam: layerFound[`clusterParam`],
          visible: layer.visible,
          opacity: layer.opacity,
          sourceOptions: layerFound.sourceOptions
        };
        context.layers.push(opts);
      } else {
        if (layer.ol.type !== 'VECTOR') {
          const catalogLayer = layer.options;
          catalogLayer.zIndex = layer.zIndex;
          delete catalogLayer.source;
          context.layers.push(catalogLayer);
        } else {
          let features;
          const writer = new GeoJSON();
          if (layer.ol.getSource() instanceof Cluster) {
            features = writer.writeFeatures(
              layer.ol.getSource().getSource().getFeatures(),
              {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
              }
            );
          } else {
            features = writer.writeFeatures(
              layer.ol.getSource().getFeatures(),
              {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
              }
            );
          }
          features = JSON.parse(features);
          features.name = layer.options.title;
          context.extraFeatures.push(features);
        }
      }
    });

    context.toolbar = this.toolbar;
    context.tools = this.tools;

    return context;
  }

  setTools(tools: Tool[]) {
    this.tools = tools;
  }

  setToolbar(toolbar: string[]) {
    this.toolbar = toolbar;
  }

  private handleContextMessage(context: DetailedContext) {
    if (this.contextMessage) {
      this.messageService.remove(this.contextMessage.id);
    }
    if (this.context$.value && context.uri && this.context$.value.uri !== context.uri) {
      this.messageService.removeAllAreNotError();
    }

    context.messages = context.messages ? context.messages : [];
    context.messages.push(context.message);
    context.messages.map(message => {
      if (message) {
        message.title = message.title
          ? this.languageService.translate.instant(message.title)
          : undefined;
        message.text = message.text
          ? this.languageService.translate.instant(message.text)
          : undefined;
        this.messageService.message(message as Message);
      }
    });
  }

  private getContextByUri(uri: string): Observable<DetailedContext> {
    if (this.baseUrl) {
      let contextToLoad;
      for (const key of Object.keys(this.contexts$.value)) {
        contextToLoad = this.contexts$.value[key].find((c) => {
          return c.uri === uri;
        });
        if (contextToLoad) {
          break;
        }
      }

      if (contextToLoad && contextToLoad.imported) {
        return of(contextToLoad);
      }

      // TODO : use always id or uri
      const id = contextToLoad ? contextToLoad.id : uri;
      return this.getDetails(id);
    }

    const importedContext = this.contexts$.value.ours.find((currentContext) => {
      return currentContext.uri === uri && currentContext.imported === true;
    });

    if (importedContext) {
      return of(importedContext);
    } else {
      return this.getLocalContext(uri);
    }
  }

  getContextLayers(igoMap: IgoMap) {
    const layers: Layer[] = [];
    const mapLayers = igoMap.layers$.getValue();
    mapLayers.forEach((layer) => {
      if (!layer.baseLayer && layer.options.id !== 'searchPointerSummaryId') {
        layers.push(layer);
      }
    });
    return layers;
  }

  private readParamsFromRoute() {
    if (!this.route) {
      return;
    }

    this.route.queryParams.subscribe((params) => {
      const centerKey = this.route.options.centerKey;
      if (centerKey && params[centerKey as string]) {
        const centerParams = params[centerKey as string];
        this.mapViewFromRoute.center = centerParams.split(',').map(Number);
        this.mapViewFromRoute.geolocate = false;
      }

      const projectionKey = this.route.options.projectionKey;
      if (projectionKey && params[projectionKey as string]) {
        const projectionParam = params[projectionKey as string];
        this.mapViewFromRoute.projection = projectionParam;
      }

      const zoomKey = this.route.options.zoomKey;
      if (zoomKey && params[zoomKey as string]) {
        const zoomParam = params[zoomKey as string];
        this.mapViewFromRoute.zoom = Number(zoomParam);
      }
    });
  }

  private getPath(file: string) {
    const basePath = this.options.basePath.replace(/\/$/, '');

    return `${basePath}/${file}`;
  }

  private handleError(
    error: HttpErrorResponse,
    uri: string,
    permissionError?: boolean
  ): Message[] {
    const context = this.contexts$.value.ours.find((obj) => obj.uri === uri);
    const titleContext = context ? context.title : uri;
    error.error.title = this.languageService.translate.instant(
      'igo.context.contextManager.invalid.title'
    );

    error.error.message = this.languageService.translate.instant(
      'igo.context.contextManager.invalid.text',
      { value: titleContext }
    );

    error.error.toDisplay = true;

    if (permissionError) {
      error.error.title = this.languageService.translate.instant(
        'igo.context.contextManager.errors.addPermissionTitle'
      );
      error.error.message = this.languageService.translate.instant(
        'igo.context.contextManager.errors.addPermission'
      );
    }

    throw error;
  }

  private handleContextsChange(
    keepCurrentContext = true
  ) {
    const context = this.context$.value;
    const editedContext = this.editedContext$.value;
    if (!context || context.uri === this.options.defaultContextUri) {
      keepCurrentContext = false;
    }
    if (!keepCurrentContext || !this.findContext(context)) {
      this.defaultContextUri = undefined;
      this.loadDefaultContext();
    } else {
      this.getContextByUri(context.uri)
        .pipe(first())
        .subscribe(
          (newContext: DetailedContext) => {
            this.toolsChanged$.next(newContext);
          }
        );

      if (this.baseUrl && this.authService.authenticated) {
        this.getDefault().subscribe();
      }
    }
    const editedFound = this.findContext(editedContext);
    if (!editedFound || editedFound.permission !== 'write') {
      this.setEditedContext(undefined);
    }
  }

  private addContextToList(context: Context) {
    const contextFound = this.findContext(context);
    if (!contextFound) {
      const contextSimplifie = {
        id: context.id,
        uri: context.uri,
        title: context.title,
        scope: context.scope,
        permission: TypePermission[TypePermission.read]
      };

      if (this.contexts$.value && this.contexts$.value.public) {
        this.contexts$.value.public.push(contextSimplifie);
        this.contexts$.next(this.contexts$.value);
      }
    }
  }

  private findContext(context: Context) {
    if (!context) {
      return false;
    }

    const contexts = this.contexts$.value;
    let found;
    for (const key of Object.keys(contexts)) {
      const value = contexts[key];
      found = value.find(
        (c) =>
          (context.id && c.id === context.id) ||
          (context.uri && c.uri === context.uri)
      );
      if (found) {
        break;
      }
    }

    return found;
  }
}
