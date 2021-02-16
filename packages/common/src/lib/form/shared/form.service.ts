import { Injectable } from '@angular/core';
import { FormBuilder, Validators, ValidatorFn } from '@angular/forms';

import {
  Form,
  FormField,
  FormFieldConfig,
  FormFieldGroup,
  FormFieldGroupConfig
} from './form.interfaces';

@Injectable({
  providedIn: 'root'
})
export class FormService {

  constructor(private formBuilder: FormBuilder) {}

  form(fields: FormField[], groups: FormFieldGroup[]): Form {
    const control = this.formBuilder.group({});
    fields.forEach((field: FormField) => {
      control.addControl(field.name, field.control);
    });
    groups.forEach((group: FormFieldGroup) => {
      control.addControl(group.name, group.control);
    });

    return {fields, groups, control};
  }

  group(config: FormFieldGroupConfig, fields: FormField[]): FormFieldGroup {
    const options = config.options || {};
    const control = this.formBuilder.group({});
    fields.forEach((field: FormField) => {
      control.addControl(field.name, field.control);
    });

    const validators = this.getValidators(options.validator); // convert string to actual validator
    control.setValidators(validators);

    return Object.assign({}, config, {fields, control}) as FormFieldGroup;
  }

  field(config: FormFieldConfig): FormField {
    const options = config.options || {};
    const state = {
      value: '',
      disabled: options.disabled
    };
    const control = this.formBuilder.control(state);

    const validators = this.getValidators(options.validator); // convert string to actual validator
    control.setValidators(validators);

    return Object.assign({type: 'text'}, config, {control}) as FormField;
  }

  extendFieldConfig(config: FormFieldConfig, partial: Partial<FormFieldConfig>): FormFieldConfig {
    const options = Object.assign({}, config.options || {}, partial.options || {});
    const inputs = Object.assign({}, config.inputs || {}, partial.inputs || {});
    const subscribers = Object.assign({}, config.subscribers || {}, partial.subscribers || {});
    return Object.assign({}, config, {options, inputs, subscribers});
  }

  private getValidators(validatorOption: string | string[] | ValidatorFn): ValidatorFn | ValidatorFn[] {
    if (Array.isArray(validatorOption)) {
      return validatorOption.map((validatorStr) => {
        return this.getValidator(validatorStr);
      });
    }

    return this.getValidator(validatorOption);
  }

  private getValidator(validatorStr: string | ValidatorFn): ValidatorFn {
    if (typeof validatorStr !== 'string') {
      return validatorStr;
    }

    // regex pattern to extract arguments from string for e.g applying on "minLength(8)" would extract 8
    const re = /^([a-zA-Z]{3,15})\((.{0,20})\)$/;
    const match = validatorStr.match(re);

    if (!match) {
      return Validators[validatorStr];
    }

    const name = match[1];
    const args = match[2];
    return Validators[name](args);
  }

}
