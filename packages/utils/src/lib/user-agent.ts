import * as Bowser from 'bowser';

export interface UserAgent extends Bowser.Parser.Parser {
  compareVersion: (version: string) => boolean;
}

export const userAgent = Bowser.getParser(
  window.navigator.userAgent
) as UserAgent;
