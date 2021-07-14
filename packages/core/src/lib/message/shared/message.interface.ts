import { TemplateRef } from '@angular/core';
import { MessageType } from './message.enum';
import { Notification } from 'angular2-notifications';

export interface Message {
  title?: string;
  text?: string;
  html?: string | TemplateRef<any>;
  icon?: string;
  type?: MessageType;
  options?: MessageOptions;
  format?: 'text' | 'html';
}

export interface MessageOptions extends Notification {
  template?: string;
  from?: Date | string;
  to?: Date | string;
  id?: string;
}
