import { Injectable } from '@angular/core';
import * as moment_ from 'moment';
const moment = moment_;

import {
    OgcFilterableDataSource
  } from './ogc-filter.interface';

@Injectable()
export class OGCFilterTimeService {

    readonly defaultStepMillisecond = 60000;

    constructor() {}

    step(datasource: OgcFilterableDataSource, currentFilter): string {
    return datasource.options.stepDate
      ? datasource.options.stepDate
      : currentFilter.step;
    }

    stepMillisecond(dataSource: OgcFilterableDataSource, currentFilter): number {
        const step = moment.duration(this.step(dataSource, currentFilter)).asMilliseconds();
        return step === 0 ? this.defaultStepMillisecond : step;
    }

    stepIsYearDuration(step: string) {
        const year = moment.duration(step);
        return (
            year.years() !== 0 &&
            year.months() === 0 &&
            year.weeks() === 0 &&
            year.days() === 0 &&
            year.hours() === 0 &&
            year.minutes() === 0
        );
    }

    stepIsMonthDuration(step: string) {
        const month = moment.duration(step);
        return (
            month.months() !== 0 &&
            month.weeks() === 0 &&
            month.days() === 0 &&
            month.hours() === 0 &&
            month.minutes() === 0
        );
    }

    stepIsWeekDuration(step: string) {
        const week = moment.duration(step);
        return (
            week.weeks() !== 0 &&
            week.days() === 7 &&
            week.hours() === 0 &&
            week.minutes() === 0
        );
    }

    stepIsDayDuration(step: string) {
        const day = moment.duration(step);
        return day.days() !== 0 && day.hours() === 0 && day.minutes() === 0;
    }

    stepIsHourDuration(step: string) {
        const hour = moment.duration(step);
        return hour.hours() !== 0 && hour.minutes() === 0;
    }

    stepIsMinuteDuration(step: string) {
        const minute = moment.duration(step);
        return minute.minutes() !== 0;
    }

    dateToNumber(date: Date): number {
        let newDate = new Date();
        if (date) {
          newDate = new Date(date);
        }
        return newDate.getTime();
    }

    public addStep(value, stepMillisecond) {
        return moment(value).add(stepMillisecond, 'milliseconds').toDate();
    }

    public subtractStep(value, stepMillisecond) {
        return moment(value).subtract(stepMillisecond, 'milliseconds').toDate();
    }
}
