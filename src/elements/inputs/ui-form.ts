//
// @description :
// @author      : Adarsh Pastakia
// @copyright   : 2017
// @license     : MIT

import { autoinject, customElement, bindable, bindingMode, children, inlineView, containerless } from 'aurelia-framework';
import { UIEvent } from "../../utils/ui-event";
import * as _ from "lodash";

@autoinject()
@containerless()
@customElement('ui-form')
@inlineView(`<template><form class="ui-form \${class}" ref="formEl" validation-renderer="ui-validator" enterpressed.trigger="fireSubmit()" submit.trigger="false"><slot></slot></form></template>`)
export class UIForm {
  constructor(public element: Element) { }

  attached() {
    UIEvent.queueTask(() => {
      let el: any = this.formEl.querySelector('input,textarea');
      if (el !== null) el.focus();
      if (this.busy) this.busyChanged(this.busy);
      if (this.disabled) this.disabledChanged(this.disabled);
    });
  }

  formEl;
  @bindable() class = '';
  @bindable() busy: boolean;
  @bindable() disabled: boolean;

  @children('ui-button,ui-combo,ui-date,ui-input,ui-textarea,ui-phone,ui-language,ui-markdown,ui-checkbox,ui-radio,ui-switch,ui-tag,ui-list,ui-dropdown') inputEls;

  busyChanged(newValue: any) {
    this.disableInputs(!!newValue || this.disabled);
  }

  disabledChanged(newValue: any) {
    this.disableInputs(!!newValue);
  }

  disableInputs(newValue: any) {
    _.forEach(this.inputEls, el => {
      try {
        el.au.controller.viewModel.disable(!!newValue);
      } catch (e) {
      }
    });
  }

  fireSubmit() {
    if (!this.busy) UIEvent.fireEvent('submit', this.element);
  }
}

@autoinject()
@containerless()
@inlineView('<template><fieldset class="ui-fieldset" ref="fieldsetEl"><legend if.bind="legend"><span if.bind="!collapsible">\${legend}</span><ui-checkbox if.bind="collapsible" checked.bind="checked">\${legend}</ui-checkbox></legend><div><slot></slot></div></fieldset></template>')
@customElement('ui-fieldset')
export class UIFieldset {
  constructor(public element: Element) {
    this.collapsible = element.hasAttribute('checked') || element.hasAttribute('checked.bind');
  }

  bind(bindingContext: Object, overrideContext: Object) {
    this.checked = this.checked || this.element.hasAttribute('checked');
  }
  attached() {
    this.checkedChanged(this.checked);
    if (this.disabled) this.disabledChanged(this.disabled);
  }

  @bindable() class = '';
  @bindable() legend = '';
  @bindable() disabled: boolean;
  @bindable({ defaultBindingMode: bindingMode.twoWay }) checked = true;

  @children('ui-button,ui-combo,ui-date,ui-input,ui-textarea,ui-phone,ui-language,ui-markdown,ui-checkbox,ui-radio,ui-switch,ui-tag,ui-list,ui-dropdown') inputEls;

  private fieldsetEl;
  private collapsible = false;

  checkedChanged(newValue: any) {
    this.fieldsetEl.classList[!!newValue ? 'remove' : 'add']('ui-collapse');
    this.disableInputs(!newValue);
  }

  disabledChanged(newValue: any) {
    this.disableInputs(!!newValue);
  }

  disableInputs(newValue: any) {
    _.forEach(this.inputEls, el => {
      try {
        el.au.controller.viewModel.disable(!!newValue);
      } catch (e) {
      }
    });
  }
}

@autoinject()
@inlineView(`<template class="ui-input-group" css.bind="{'width':width}"><slot name="inputLabel"></slot>
  <div css.bind="{'min-width':innerWidth}"><div class="ui-group-wrapper"><slot></slot></div><slot name="inputInfo"></slot></div></template>`)
@customElement('ui-input-group')
export class UIInputGroup {
  constructor(public element: Element) {
    if (element.hasAttribute('plain')) element.classList.add('ui-plain');
  }

  @bindable() width = 'auto';
  @bindable() innerWidth = '4em';
}

@autoinject()
@containerless()
@inlineView('<template><div slot="inputInfo" class="ui-input-info \${class}"><slot></slot></div></template>')
@customElement('ui-input-info')
export class UIInputInfo {
  constructor(public element: Element) { }
  @bindable() class = '';
}


@autoinject()
@customElement('ui-input-addon')
@inlineView(`<template class="ui-input-addon" click.trigger="focusEl()"><slot><ui-glyph class.bind="glyphClass" glyph.bind="glyph"></ui-glyph></slot></template>`)
export class UIInputAddon {
  constructor(public element: Element) {
    if (element.hasAttribute('end')) element.classList.add('ui-end');
    else element.classList.add('ui-start');
  }

  @bindable() glyph = '';
  @bindable() glyphClass = '';

  focusEl() {
    let el = this.element.nextElementSibling;
    if (el && el['focus']) UIEvent.queueTask(() => el['focus']());
    return true;
  }
}

@autoinject()
@containerless()
@inlineView(`<template><label ref="label" slot="inputLabel" class="ui-input-label \${class}" for.bind="for" css.bind="{'flex-basis':width}"><span><slot></slot></span></label></template>`)
@customElement('ui-input-label')
export class UIInputLabel {
  constructor(public element: Element) { }

  bind(bindingContext: Object, overrideContext: Object) {
    if (this.element.hasAttribute('align-top')) this.class += ' ui-align-top';
    if (this.element.hasAttribute('required')) this.class += ' ui-required';
    if (this.element.hasAttribute('align-top')) this.width = '100%';
  }
  attached() {
    if (isEmpty(this.for)) {
      let el = this.label.parentElement.querySelector('input:not([type="checkbox"]):not([type="radio"]),textarea');
      if (el) {
        if (!el.id) el.id = 'ui-input-' + (UIInputLabel.seed++);
        this.for = el.id;
      }
    }
  }

  static seed = 1;

  private label;

  @bindable() for = '';
  @bindable() class = '';
  @bindable() width = '8em';
}
