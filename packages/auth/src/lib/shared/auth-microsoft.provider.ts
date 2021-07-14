import {
  MSAL_GUARD_CONFIG,
  MSAL_INSTANCE,
  MsalService,
} from '@azure/msal-angular';

import {
  PublicClientApplication,
  InteractionType
} from '@azure/msal-browser';

import { ConfigService } from '@igo2/core';

import { BrowserAuthOptions } from '@azure/msal-browser';

import { AuthMicrosoftOptions, MSPMsalGuardConfiguration } from './auth.interface';

import { MsalServiceb2c } from './auth-msalServiceb2c.service.';

export function MSALConfigFactory(config: ConfigService): PublicClientApplication {

  const msConf: BrowserAuthOptions = config.getConfig('auth.microsoft') || {};

  msConf.redirectUri = msConf.redirectUri || window.location.href;
  msConf.authority = msConf.authority || 'https://login.microsoftonline.com/organizations';

  const myMsalObj = new PublicClientApplication({
    auth: msConf,
    cache: {
      cacheLocation: 'sessionStorage'
    }
  });

  return myMsalObj;
}

export function MSALConfigFactoryb2c(config: ConfigService): PublicClientApplication {

  const msConf: BrowserAuthOptions = config.getConfig('auth.microsoftb2c.browserAuthOptions') || {};
  msConf.redirectUri = msConf.redirectUri || window.location.href;
  msConf.authority = msConf.authority || 'https://login.microsoftonline.com/organizations';

  const myMsalObj = new PublicClientApplication({
    auth: msConf,
    cache: {
      cacheLocation: 'sessionStorage'
    }
  });

  return myMsalObj;
}

export function MSALAngularConfigFactory(config: ConfigService): MSPMsalGuardConfiguration {

  const msConf: AuthMicrosoftOptions = config.getConfig('auth.microsoft') || {};

  return {
    interactionType: InteractionType.Popup,
    authRequest: {
      scopes: ['user.read'],
      loginHint: 'todo',
    },
    type: 'add'
  };
}

export function MSALAngularConfigFactoryb2c(config: ConfigService): MSPMsalGuardConfiguration {

  const msConf: BrowserAuthOptions = config.getConfig('auth.microsoftb2c.browserAuthOptions') || {};

  return {
    interactionType: InteractionType.Popup,
    authRequest: {
      scopes: [msConf.clientId]
    },
    type: 'b2c'
  };
}

export function provideAuthMicrosoft(type?: string) {
  if (type === 'b2c') {
    return [
      {
        provide: MSAL_INSTANCE,
        useFactory: MSALConfigFactoryb2c,
        deps: [ConfigService]
      },
      {
        provide: MSAL_GUARD_CONFIG,
        useFactory: MSALAngularConfigFactoryb2c,
        deps: [ConfigService],
        multi: true
      },
      MsalServiceb2c
    ];
  } else {
    return [
      {
        provide: MSAL_INSTANCE,
        useFactory: MSALConfigFactory,
        deps: [ConfigService]
      },
      {
        provide: MSAL_GUARD_CONFIG,
        useFactory: MSALAngularConfigFactory,
        deps: [ConfigService],
        multi: true
      },
      MsalService
    ];
  }
}
