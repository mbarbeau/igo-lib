import { BrowserAuthOptions } from '@azure/msal-browser';
import { MsalGuardConfiguration } from '@azure/msal-angular';

export interface AuthInternOptions {
  enabled?: boolean;
}

export interface AuthFacebookOptions {
  enabled?: boolean;
  appId: string;
}

export interface AuthGoogleOptions {
  enabled?: boolean;
  apiKey: string;
  clientId: string;
}

export interface AuthMicrosoftOptions {
  enabled?: boolean;
  clientId: string;
  redirectUri?: string;
  authority?: string;
}

export interface AuthMicrosoftb2cOptions {
  enabled?: boolean;
  browserAuthOptions?: BrowserAuthOptions;
  options?: AuthMicrosoftb2cOptionsOptions;
  scopes?: string[];
}

export interface AuthMicrosoftb2cOptionsOptions {
  names: AuthMicrosoftb2cOptionsNames;
  authorities: AuthMicrosoftb2cOptionsAuthorities;
  authorityDomain: string[];
}

export interface AuthMicrosoftb2cOptionsNames {
  signUpSignIn: string;
  forgotPassword: string;
  editProfile: string;
}

export interface AuthMicrosoftb2cOptionsAuthorities {
  signUpSignIn: AuthMicrosoftb2cOptionsAuthority;
  forgotPassword: AuthMicrosoftb2cOptionsAuthority;
  editProfile: AuthMicrosoftb2cOptionsAuthority;
}

export interface AuthMicrosoftb2cOptionsAuthority {
  authority: string;
}

export interface AuthOptions {
  url?: string;
  tokenKey: string;
  allowAnonymous?: boolean;
  loginRoute?: string;
  logoutRoute?: string;
  homeRoute?: string;
  intern?: AuthInternOptions;
  facebook?: AuthFacebookOptions;
  google?: AuthGoogleOptions;
  microsoft?: AuthMicrosoftOptions;
  microsoftb2c?: AuthMicrosoftb2cOptions;
  trustHosts?: string[];
  profilsGuard?: string[];
  hostsWithCredentials?: WithCredentialsOptions[];
}
export interface WithCredentialsOptions {
  withCredentials?: boolean;
  domainRegFilters?: string;
 }

export interface MSPMsalGuardConfiguration extends MsalGuardConfiguration {
  type: string;
}

export interface MSPMsalGuardConfiguration extends MsalGuardConfiguration {
  type: string;
}

export interface MSPMsalGuardConfiguration extends MsalGuardConfiguration {
  type: string;
}

export interface MSPMsalGuardConfiguration extends MsalGuardConfiguration {
  type: string;
}

export interface MSPMsalGuardConfiguration extends MsalGuardConfiguration {
  type: string;
}

export interface User {
  source?: string;
  sourceId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  locale?: string;
  isExpired?: boolean;
  admin?: boolean;
  defaultContextId?: string;
}

export interface IInfosUser {
  tokenId: string;
}
