/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { MSAL_INSTANCE } from '@azure/msal-angular';
import { EventMessage, EventMessageUtils, IPublicClientApplication, InteractionStatus } from '@azure/msal-browser';
import { MsalServiceb2c } from './auth-msalServiceb2c.service.';

@Injectable()
export class MsalBroadcastServiceb2c {
    private _msalSubject: Subject<EventMessage>;
    public msalSubject$: Observable<EventMessage>;
    private _inProgress: BehaviorSubject<InteractionStatus>;
    public inProgress$: Observable<InteractionStatus>;

    constructor(
        @Inject(MSAL_INSTANCE) private msalInstance: IPublicClientApplication,
        private authService: MsalServiceb2c
    ) {
        this._msalSubject = new Subject<EventMessage>();
        this.msalSubject$  = this._msalSubject.asObservable();

        // InProgress as BehaviorSubject so most recent inProgress state will be available upon subscription
        this._inProgress = new BehaviorSubject<InteractionStatus>(InteractionStatus.Startup);
        this.inProgress$ = this._inProgress.asObservable();

        this.msalInstance.addEventCallback((message: EventMessage) => {
            this._msalSubject.next(message);
            const status = EventMessageUtils.getInteractionStatusFromEvent(message);
            if (status !== null) {
                this.authService.getLogger().verbose(`BroadcastService - ${message.eventType} results in setting inProgress to ${status}`);
                this._inProgress.next(status);
            }
        });
    }
}
