//
// @description :
// @author      : Adarsh Pastakia
// @copyright   : 2017
// @license     : MIT

import { autoinject, customAttribute, bindable, noView } from 'aurelia-framework';
import { UIEvent } from "../utils/ui-event";
import { UIUtils } from "../utils/ui-utils";

@noView()
export class UITooltipBase {
  static tooltipEl;

  static POSITIONS = {
    top: 'tc',
    bottom: 'bc',
    start: 'cl',
    end: 'cr'
  }

  constructor(element: Element) {
    if (element.nodeType == Node.ELEMENT_NODE) {
      this.parentEl = element;
    }
    if (element.nodeType == Node.COMMENT_NODE) {
      this.parentEl = element.previousSibling;
    }
  }
  attached() {
    if (!UITooltipBase.tooltipEl) {
      let el = UITooltipBase.tooltipEl = document.createElement('div');
      el.classList.add('ui-tooltip');
      UIUtils.overlayContainer.appendChild(el);
    }

    this.parentEl.addEventListener('mouseenter', () => this.show());
    this.parentEl.addEventListener('mouseleave', () => this.hide());
  }
  detached() { this.hide(); }
  unbind() { this.hide(); }

  position = '';
  theme = '';
  value: any = '';

  private parentEl;
  private tether;
  private timer;

  show() {
    let position = this.position;
    let theme = this.theme;
    let value = this.value;

    if (typeof this.value === 'object') {
      position = this.value.position || 'top';
      theme = this.value.theme || 'light';
      value = this.value.value || '';
    }

    if (isEmpty(this.value)) return;
    let el = UITooltipBase.tooltipEl;
    el.className = 'ui-tooltip ui-' + theme;
    el.innerHTML = value;
    this.tether = UIUtils.tether(this.parentEl, el, { resize: false, oppEdge: true, position: UITooltip.POSITIONS[position] || 'tc' });
    this.timer = setTimeout(() => el.classList.add('ui-show'), 700);
  }
  hide() {
    clearTimeout(this.timer);
    if (this.tether) this.tether.dispose();
    UITooltipBase.tooltipEl.className = 'ui-tooltip';
    this.tether = null;
  }
}

@autoinject()
@customAttribute('tooltip')
export class UITooltip extends UITooltipBase {
  constructor(public element: Element) { super(element); }

  @bindable() position = 'top';
  @bindable() theme = 'light';
  @bindable({ primaryProperty: true }) value = '';
}

@autoinject()
@customAttribute('tooltip-dark')
export class UITooltipDark extends UITooltipBase {
  constructor(public element: Element) {
    super(element);
    this.theme = 'dark';
  }
}

@autoinject()
@customAttribute('tooltip-primary')
export class UITooltipPrimary extends UITooltipBase {
  constructor(public element: Element) {
    super(element);
    this.theme = 'primary';
  }
}

@autoinject()
@customAttribute('tooltip-secondary')
export class UITooltipSecondary extends UITooltipBase {
  constructor(public element: Element) {
    super(element);
    this.theme = 'secondary';
  }
}
