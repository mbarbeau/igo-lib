import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import {
  Notification,
  NotificationsService,
  NotificationType
} from 'angular2-notifications';

import { ConfigService } from '../../config/config.service';

import { Message, MessageOptions } from './message.interface';
import { MessageType } from './message.enum';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  public messages$ = new BehaviorSubject<Message[]>([]);
  private options: MessageOptions;

  constructor(
    private notificationService: NotificationsService,
    private configService: ConfigService
  ) {
    this.options = this.configService.getConfig('message') || {};
  }

  showError(httpError: HttpErrorResponse) {
    httpError.error.caught = true;
    return this.error(httpError.error.message, httpError.error.title);
  }

  message(message: Message) {
    this.messages$.next(this.messages$.value.concat([message]));

    message.options = message.options || {} as MessageOptions;
    const currentDate = new Date();

    message.options.from = message.options.from ? message.options.from : new Date('1 jan 1900');
    message.options.to = message.options.to ? message.options.to : new Date('1 jan 3000');
    if (typeof message.options.from === 'string') {
      message.options.from = new Date(Date.parse(message.options.from.replace(/-/g, ' ')));
    }
    if (typeof message.options.to === 'string') {
      message.options.to = new Date(Date.parse(message.options.to.replace(/-/g, ' ')));
    }
    if (
      currentDate > message.options.from && currentDate < message.options.to) {

      message = this.handleTemplate(message);

      let notification: Notification;
      if (message.text) {
        notification = this.notificationService.create(
          message.title,
          message.text,
          (message.type as any) as NotificationType,
          message.options
        );
      } else if (message.html) {
        if (!message.icon) {
          message.options.theClass = message.options.theClass
            ? message.options.theClass + ' noIcon'
            : 'noIcon';
        }

        notification = this.notificationService.html(
          message.html,
          (message.type as any) as NotificationType,
          message.options
        );
      } else {
        return;
      }

      if (message.icon !== undefined) {
        this.addIcon(notification, message.icon);
      }
      message.options.id = notification.id;
      return notification;
    }
    return;
  }

  success(text: string, title?: string, options: any = {}) {
    return this.message({
      text,
      title,
      icon: options.icon || 'check',
      options,
      type: MessageType.SUCCESS
    });
  }

  error(text: string, title?: string, options: any = {}) {
    return this.message({
      text,
      title,
      icon: options.icon || 'error_outline',
      options,
      type: MessageType.ERROR
    });
  }

  info(text: string, title?: string, options: any = {}) {
    return this.message({
      text,
      title,
      icon: options.icon || 'info_outline',
      options,
      type: MessageType.INFO
    });
  }

  alert(text: string, title?: string, options: any = {}) {
    return this.message({
      text,
      title,
      icon: options.icon || 'access_alarm',
      options,
      type: MessageType.ALERT
    });
  }

  remove(id?: string) {
    this.notificationService.remove(id);
  }

  removeAllAreNotError() {
    for (const mess of this.messages$.value) {
      if (mess.type !== 'error') {
        this.remove(mess.options.id);
      }
    }
  }

  private addIcon(notification: Notification, icon: string) {
    // There is no way to add an icon to a notification when reating
    // it so we simply set it on the notification directly.
    // See https://github.com/flauc/angular2-notifications/issues/165
    notification.icon = `
      <mat-icon class="material-icons mat-icon mat-list-avatar" svgIcon="${icon}">
      </mat-icon>`;
  }

  private handleTemplate(message: Message): Message {
    if (!this.options.template || message.html) {
      return message;
    }

    let html = this.options.template;
    html = html.replace('${text}', message.text);
    html = html.replace('${title}', message.title);
    html = html.replace('${icon}', message.icon);

    message.html = html;
    message.text = undefined;
    message.title = undefined;
    message.icon = undefined;
    return message;
  }
}
