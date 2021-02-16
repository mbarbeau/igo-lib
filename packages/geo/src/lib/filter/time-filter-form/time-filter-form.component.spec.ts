// import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
// import { By } from '@angular/platform-browser';
// import { MatDatepickerModule, MatNativeDateModule } from '@angular/material';
//
// import {
//   MatDatetimepickerModule,
//   MatNativeDatetimeModule
// } from '@mat-datetimepicker/core';
//
// import { IgoLanguageModule } from '@igo2/core';
//
// import { TimeFilterFormComponent } from './time-filter-form.component';
//
// describe('TimeFilterFormComponent', () => {
//   let component: TimeFilterFormComponent;
//   let fixture: ComponentFixture<TimeFilterFormComponent>;
//
//   const min = '1980-01-01T05:00:00Z';
//   const max = '2020-03-29T05:00:00Z';
//   const dateX = '1999-02-02T15:00:00-0500';
//   const dateY = '1999-02-03T11:00:00-0500';
//   const dateZ = '1999-02-03T17:00:00-0500';
//
//   const dateXAfterHandle = new Date('1999-02-02T05:00:00Z');
//   const dateYAfterHandle = new Date('1999-02-04T04:59:59Z');
//   const dateZAfterHandle = new Date('1999-02-03T04:59:59Z');
//
//   const dateTimeXAfterHandle = new Date('1999-02-02T20:00:00Z');
//   const dateTimeYAfterHandle = new Date('1999-02-03T16:00:00Z');
//
//   // const dateXAfterHandleStep2Day = new Date('1999-02-04T05:00:00Z');
//   const dateYAfterHandleStep2Day = new Date('1999-02-05T04:59:59Z');
//
//   const dateXAfterHandleTime = new Date('1999-02-02T20:00:00Z');
//   const dateXAfterHandleTimeStep1hour = new Date('1999-02-02T20:59:59Z');
//   // const dateYAfterHandleTime = new Date('1999-02-02T11:00:00Z');
//   // const dateZAfterHandleTime = new Date('1999-02-02T17:00:00Z');
//
//   beforeEach(waitForAsync(() => {
//     TestBed.configureTestingModule({
//       imports: [
//         MatDatepickerModule,
//         MatNativeDateModule,
//         MatDatetimepickerModule,
//         MatNativeDatetimeModule,
//         IgoLanguageModule
//       ],
//       declarations: [TimeFilterFormComponent]
//     }).compileComponents();
//   }));
//
//   beforeEach(() => {
//     fixture = TestBed.createComponent(TimeFilterFormComponent);
//     component = fixture.componentInstance;
//   });
//
//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
//
//   it('HandleDateChange: calendar, "date", !isRange', () => {
//     component.options = {
//       type: 'date',
//       style: 'calendar',
//       timeInterval: 2000,
//       min: min,
//       max: max,
//       step: null
//     };
//     component.change.subscribe(value => {
//       expect(value[0].toISOString()).toBe(dateXAfterHandle.toISOString());
//       expect(value[1].toISOString()).toBe(dateZAfterHandle.toISOString());
//     });
//     fixture.detectChanges();
//     component.date = new Date(dateX);
//     component.handleDateChange({ source: { date: '', value: '' } });
//
//     expect(component.min.toISOString()).toBe(new Date(min).toISOString());
//     expect(component.max.toISOString()).toBe(new Date(max).toISOString());
//   });
//
//   it('HandleDateChange: calendar, "date", isRange', () => {
//     component.options = {
//       type: 'date',
//       style: 'calendar',
//       timeInterval: 2000,
//       min: '1980-01-01T05:00:00Z',
//       max: '2020-03-29T05:00:00Z',
//       step: null,
//       range: true
//     };
//     component.change.subscribe(value => {
//       expect(value[0].toISOString()).toBe(dateXAfterHandle.toISOString());
//       expect(value[1].toISOString()).toBe(dateYAfterHandle.toISOString());
//     });
//     fixture.detectChanges();
//     component.startDate = new Date(dateX);
//     component.endDate = new Date(dateY);
//     component.handleDateChange({ source: { date: '', value: '' } });
//
//     expect(component.min.toISOString()).toBe(new Date(min).toISOString());
//     expect(component.max.toISOString()).toBe(new Date(max).toISOString());
//   });
//
//   it('HandleDateChange: calendar, "datetime", isRange', () => {
//     component.options = {
//       type: 'datetime',
//       style: 'calendar',
//       timeInterval: 2000,
//       min: '1980-01-01T05:00:00Z',
//       max: '2020-03-29T05:00:00Z',
//       step: null,
//       range: true
//     };
//     component.change.subscribe(value => {
//       expect(value[0].toISOString()).toBe(dateTimeXAfterHandle.toISOString());
//       expect(value[1].toISOString()).toBe(dateTimeYAfterHandle.toISOString());
//     });
//     fixture.detectChanges();
//     component.startDate = new Date(dateX);
//     component.endDate = new Date(dateY);
//     component.handleDateChange({ source: { date: '', value: '' } });
//
//     expect(component.min.toISOString()).toBe(new Date(min).toISOString());
//     expect(component.max.toISOString()).toBe(new Date(max).toISOString());
//   });
//
//   it('HandleDateChange: calendar, "datetime", !isRange', () => {
//     component.options = {
//       type: 'datetime',
//       style: 'calendar',
//       timeInterval: 2000,
//       min: min,
//       max: max,
//       step: null
//     };
//     fixture.detectChanges();
//     component.change.subscribe(value => {
//       expect(value[0].toISOString()).toBe(dateTimeXAfterHandle.toISOString());
//       expect(value[1].toISOString()).toBe(dateTimeXAfterHandle.toISOString());
//     });
//
//     component.date = new Date(dateX);
//     component.handleDateChange({ source: { date: '', value: '' } });
//
//     expect(component.min.toISOString()).toBe(new Date(min).toISOString());
//     expect(component.max.toISOString()).toBe(new Date(max).toISOString());
//   });
//
//   it('HandleDateChange: calendar, "time", isRange', () => {
//     component.options = {
//       type: 'time',
//       style: 'calendar',
//       timeInterval: 2000,
//       min: min,
//       max: max,
//       range: true
//     };
//     component.change.subscribe(value => {
//       // TODO correct this option. UI return weird time.
//       // expect(value[0].toISOString()).toBe(dateXAfterHandleTime.toISOString());
//       // expect(value[1].toISOString()).toBe(dateZAfterHandleTime.toISOString());
//     });
//
//     component.startDate = new Date(dateX);
//     component.endDate = new Date(dateZ);
//     fixture.detectChanges();
//     component.handleDateChange({ source: { date: '', value: '' } });
//
//     expect(component.min.toISOString()).toBe(new Date(min).toISOString());
//     expect(component.max.toISOString()).toBe(new Date(max).toISOString());
//   });
//
//   it('HandleDateChange: calendar, "time", !isRange', () => {
//     component.options = {
//       type: 'time',
//       style: 'calendar',
//       timeInterval: 2000,
//       min: min,
//       max: max,
//       range: false
//     };
//     component.change.subscribe(value => {
//       expect(value[0].toISOString()).toBe(dateXAfterHandleTime.toISOString());
//       expect(value[1].toISOString()).toBe(
//         dateXAfterHandleTimeStep1hour.toISOString()
//       );
//     });
//     fixture.detectChanges();
//     component.date = new Date(dateX);
//     component.handleDateChange({ source: { date: '', value: '' } });
//
//     expect(component.min.toISOString()).toBe(new Date(min).toISOString());
//     expect(component.max.toISOString()).toBe(new Date(max).toISOString());
//   });
//
//   // it('Calendar with range. Must have 2 calendars', () => {
//   //
//   //   component.options = {
//   //       'type': 'date',
//   //       'style': 'calendar',
//   //       'timeInterval': 2000,
//   //       'min': min,
//   //       'max': max,
//   //       'range': true
//   //   };
//   //
//   //   component.startDate = new Date(dateX);
//   //   component.endDate = new Date(dateY);
//   //   component.handleDateChange({source: {date: '', value: ''}});
//   //
//   //   fixture.detectChanges();
//   //   // check there is 2 calendar
//   //   const regex = /<mat-datetimepicker-calendar/gi;
//   //   const numberOfCalendar = fixture.nativeElement.innerHTML.match(regex);
//   //   expect(numberOfCalendar.length).toBe(2);
//   //
//   // });
//   //
//   // it('Calendar with no range. Must have 1 calendar', () => {
//   //
//   //   component.options = {
//   //       'type': 'date',
//   //       'style': 'calendar',
//   //       'timeInterval': 2000,
//   //       'min': min,
//   //       'max': max,
//   //       'range': false
//   //   };
//   //
//   //   component.startDate = new Date(dateX);
//   //   component.endDate = new Date(dateY);
//   //   component.handleDateChange({source: {date: '', value: ''}});
//   //
//   //   fixture.detectChanges();
//   //   // check there is 2 calendar
//   //   const regex = /<mat-datetimepicker-calendar/gi;
//   //   const numberOfCalendar = fixture.nativeElement.innerHTML.match(regex);
//   //   expect(numberOfCalendar.length).toBe(1);
//   //
//   // });
//
//   it('HandleDateChange: slider, "date"', () => {
//     component.options = {
//       type: 'date',
//       style: 'slider',
//       timeInterval: 2000,
//       min: min,
//       max: max,
//       step: null
//     };
//     component.change.subscribe(value => {
//       // expect(value[0].toISOString()).toBe(dateXAfterHandle.toISOString());
//       expect(value[1].toISOString()).toBe(dateZAfterHandle.toISOString());
//     });
//     fixture.detectChanges();
//     component.date = new Date(dateX);
//     component.handleDateChange({ source: { date: '', value: '' } });
//
//     expect(component.min.toISOString()).toBe(new Date(min).toISOString());
//     expect(component.max.toISOString()).toBe(new Date(max).toISOString());
//   });
//
//   it('HandleDateChange: slider, "date", range=true', () => {
//     component.options = {
//       type: 'date',
//       style: 'slider',
//       timeInterval: 2000,
//       min: min,
//       max: max,
//       step: null,
//       range: true
//     };
//     component.change.subscribe(value => {
//       // expect(value[0].toISOString()).toBe(dateXAfterHandle.toISOString());
//       expect(value[1].toISOString()).toBe(dateZAfterHandle.toISOString());
//     });
//     fixture.detectChanges();
//     component.date = new Date(dateX);
//     component.handleDateChange({ source: { date: '', value: '' } });
//
//     expect(component.min.toISOString()).toBe(new Date(min).toISOString());
//     expect(component.max.toISOString()).toBe(new Date(max).toISOString());
//   });
//
//   it('HandleDateChange: slider, "datetime", !isRange, step=null', () => {
//     component.options = {
//       type: 'datetime',
//       style: 'slider',
//       timeInterval: 2000,
//       min: min,
//       max: max
//     };
//     component.change.subscribe(value => {
//       // expect(value[0].toISOString()).toBe(dateTimeXAfterHandle.toISOString());
//       expect(value[1].toISOString()).toBe(dateTimeXAfterHandle.toISOString());
//     });
//     fixture.detectChanges();
//     component.date = new Date(dateX);
//
//     component.handleDateChange({ source: { date: '', value: '' } });
//
//     expect(component.min.toISOString()).toBe(new Date(min).toISOString());
//     expect(component.max.toISOString()).toBe(new Date(max).toISOString());
//   });
//
//   it('HandleDateChange: slider, "date", step=172800000', () => {
//     component.options = {
//       type: 'date',
//       style: 'slider',
//       timeInterval: 2000,
//       min: min,
//       max: max,
//       step: 172800000
//     };
//     component.change.subscribe(value => {
//       // expect(value[0].toISOString()).toBe(dateXAfterHandleStep2Day.toISOString());
//       expect(value[1].toISOString()).toBe(
//         dateYAfterHandleStep2Day.toISOString()
//       );
//     });
//
//     fixture.detectChanges();
//     // check step
//     expect(component.mySlider.step).toBe(172800000);
//     component.date = new Date(dateX);
//
//     // add 1 step
//     component.date = new Date(
//       component.date.getTime() + component.mySlider.step
//     );
//
//     component.handleDateChange({ source: { date: '', value: '' } });
//
//     expect(component.min.toISOString()).toBe(new Date(min).toISOString());
//     expect(component.max.toISOString()).toBe(new Date(max).toISOString());
//   });
//
//   it('HandleDateChange: slider, "time"', () => {
//     component.options = {
//       type: 'time',
//       style: 'slider',
//       timeInterval: 2000,
//       min: min,
//       max: max
//     };
//     component.change.subscribe(value => {
//       //  expect(value[0].toISOString()).toBe(dateXAfterHandleTime.toISOString());
//       expect(value[1].toISOString()).toBe(
//         dateXAfterHandleTimeStep1hour.toISOString()
//       );
//     });
//
//     fixture.detectChanges();
//     // check step
//     expect(component.mySlider.step).toBe(3600000);
//     component.date = new Date(dateX);
//
//     // add 1 step
//     // component.date = new Date(component.date.getTime() + component.mySlider.step);
//
//     component.handleDateChange({ source: { date: '', value: '' } });
//
//     expect(component.min.toISOString()).toBe(new Date(min).toISOString());
//     expect(component.max.toISOString()).toBe(new Date(max).toISOString());
//   });
//
//   it('should have current value', () => {
//     expect(component).toBeTruthy();
//
//     component.options = {
//       type: 'datetime',
//       style: 'calendar',
//       timeInterval: 2000,
//       min: min,
//       max: max,
//       range: true
//     };
//
//     const expectedValue = '2017-09-02 00:00:00/2017-09-05 18:00:00';
//     const expectedDay1 = new Date('2017-09-02 00:00:00');
//     component.currentValue = expectedValue;
//
//     fixture.detectChanges();
//
//     fixture.whenStable().then(() => {
//       const dateLabel = fixture.debugElement.query(
//         By.css('.md2-datepicker-value')
//       );
//       expect(dateLabel.componentInstance.value.toString()).toBe(
//         expectedDay1.toString()
//       );
//     });
//   });
// });
