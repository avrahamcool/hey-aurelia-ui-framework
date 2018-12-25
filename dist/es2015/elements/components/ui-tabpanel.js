var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UITab_1;
import { autoinject, customElement, bindable, bindingMode, inlineView, containerless, DOM } from 'aurelia-framework';
import { UIUtils } from "../../utils/ui-utils";
import { UIEvent } from "../../utils/ui-event";
import * as _ from "lodash";
let UITabbarStart = class UITabbarStart {
};
UITabbarStart = __decorate([
    containerless(),
    customElement('ui-tabbar-start'),
    inlineView(`<template><div slot="ui-tabbar-start" class="ui-tabbar-links"><slot></slot></div></template>`)
], UITabbarStart);
export { UITabbarStart };
let UITabbarEnd = class UITabbarEnd {
};
UITabbarEnd = __decorate([
    containerless(),
    customElement('ui-tabbar-end'),
    inlineView(`<template><div slot="ui-tabbar-end" class="ui-tabbar-links"><slot></slot></div></template>`)
], UITabbarEnd);
export { UITabbarEnd };
let UITabbarToggle = class UITabbarToggle {
    constructor(element) {
        this.element = element;
        this.class = '';
        this.disabled = false;
        this.isDisabled = false;
    }
    attached() {
        if (this.dropdown) {
            this.obMouseup = UIEvent.subscribe('mouseclick', (evt) => {
                if (getParentByClass(evt.target, 'ui-tab-button') == this.buttonEl)
                    return;
                this.buttonEl.classList.remove('ui-open');
                this.dropdown.classList.remove('ui-open');
            });
            this.buttonEl.classList.add('ui-btn-dropdown');
            this.dropdown.classList.add('ui-floating');
            this.tether = UIUtils.tether(this.buttonEl, this.dropdown);
        }
    }
    detached() {
        if (this.tether)
            this.tether.dispose();
        if (this.obMouseup)
            this.obMouseup.dispose();
        if (this.dropdown)
            DOM.removeNode(this.dropdown);
    }
    toggleDropdown(evt) {
        if (evt.button != 0)
            return true;
        if (this.dropdown) {
            evt.preventDefault();
            evt.stopPropagation();
            evt.cancelBubble = true;
            if (this.buttonEl.classList.contains('ui-open')) {
                UIEvent.fireEvent('menuhide', this.element);
                this.buttonEl.classList.remove('ui-open');
                this.dropdown.classList.remove('ui-open');
            }
            else {
                if (UIEvent.fireEvent('menuopen', this.buttonEl) !== false) {
                    this.buttonEl.classList.add('ui-open');
                    this.dropdown.classList.add('ui-open');
                    this.tether.position();
                }
            }
            return false;
        }
        return true;
    }
};
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITabbarToggle.prototype, "class", void 0);
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITabbarToggle.prototype, "dropdown", void 0);
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITabbarToggle.prototype, "disabled", void 0);
UITabbarToggle = __decorate([
    containerless(),
    customElement('ui-tabbar-toggle'),
    inlineView(`<template><div ref="buttonEl" slot="tab-button" class="ui-tabbar-toggle ui-tab-button \${disabled?'ui-disabled':''} \${class}" click.trigger="toggleDropdown($event)"><slot><ui-glyph glyph="glyph-icon-plus"></ui-glyph></slot></div></template>`),
    __metadata("design:paramtypes", [Element])
], UITabbarToggle);
export { UITabbarToggle };
let UITabPanel = class UITabPanel {
    constructor(element) {
        this.element = element;
        this.isOverflow = false;
        this.height = "auto";
        this.active = 0;
        this.noTabs = false;
        this.useRouter = false;
        if (element.hasAttribute('bottom'))
            element.classList.add('ui-bottom');
        if (element.hasAttribute('noborder'))
            element.classList.add('ui-noborder');
        this.noTabs = element.hasAttribute('notabs');
        this.useRouter = element.hasAttribute('use-router');
    }
    attached() {
        if (!this.noTabs) {
            this.obResize = UIEvent.subscribe('windowresize', () => this.arrange());
            this.obClick = UIEvent.subscribe('mouseclick', () => this.overflow.classList.remove('ui-open'));
            this.tether = UIUtils.tether(this.overflowToggle, this.overflow, { resize: false, position: 'br' });
            window.setTimeout(() => this.arrange(), 500);
        }
        UIEvent.queueTask(this.tabsChanged.bind(this));
    }
    detached() {
        if (!this.noTabs) {
            this.tether.dispose();
            this.obClick.dispose();
            this.obResize.dispose();
        }
    }
    tabsChanged() {
        let tabs = this.element.querySelectorAll('a.ui-tab-button');
        if (!this.activeTab && tabs.length > 0 && _.find(tabs, ['viewModel.active', true]) == null)
            this.activateTab(_.find(tabs, ['viewModel.disabled', false]));
    }
    activeChanged(newValue) {
        let tabs = this.element.querySelectorAll('a.ui-tab-button');
        if (tabs.length == 0)
            return;
        let tab = (_.find(tabs, ['viewModel.id', newValue]) || tabs[newValue] || this.activeTab.buttonEl);
        if (this.activeTab)
            this.activeTab.active = false;
        (this.activeTab = tab.viewModel).active = true;
    }
    activateTab(newTab) {
        if (!newTab)
            return;
        this.active = newTab.viewModel.id;
        UIEvent.fireEvent('change', this.element, newTab.viewModel);
    }
    canActivate(id) {
        let tabs = this.element.querySelectorAll('a.ui-tab-button');
        let tab = _.find(tabs, ['viewModel.id', id]);
        if (tab && tab.viewModel) {
            if (this.activeTab)
                this.activeTab.active = false;
            (this.activeTab = tab.viewModel).active = true;
            return true;
        }
        return false;
    }
    arrange() {
        if (!this.wrapper)
            return;
        this.overflow.classList.remove('ui-open');
        let tabs = this.element.querySelectorAll('a.ui-tab-button');
        for (let i = 0, c = this.overflow['children']; i < c.length; i++) {
            this.wrapper.insertBefore(c[i], this.overflowToggle);
        }
        if (tabs.length > 0 && (this.isOverflow = (this.wrapper.lastElementChild.previousElementSibling.offsetLeft + this.wrapper.lastElementChild.previousElementSibling.offsetWidth > this.wrapper.offsetWidth))) {
            for (let c = this.wrapper['children'], i = c.length - 2; i >= 0; i--) {
                if (c[i].offsetLeft + c[i].offsetWidth > this.wrapper.offsetWidth) {
                    if (this.overflow.hasChildNodes)
                        this.overflow.insertBefore(c[i], this.overflow.childNodes[0]);
                    else
                        this.overflow.appendChild(c[i]);
                }
            }
        }
    }
    showOverflow(evt) {
        if (evt.button != 0)
            return true;
        if (!this.overflow.classList.contains('ui-open')) {
            this.overflow.classList.add('ui-open');
            this.tether.position();
        }
        else
            this.overflow.classList.remove('ui-open');
    }
    tabClose(tab) {
        this.canClose()
            .then(() => {
            tab.close();
            if (!this.activeTab || this.activeTab.id === tab.id)
                UIEvent.queueTask(() => [this.activeTab = null, this.tabsChanged(), this.arrange()]);
        });
    }
    canClose() {
        let instance = null;
        if (instance && typeof instance.canClose === 'function') {
            let result = instance.canClose();
            if (result instanceof Promise) {
                return result;
            }
            if (result !== null && result !== undefined) {
                return Promise.resolve(result);
            }
            return Promise.resolve(true);
        }
        return Promise.resolve(true);
    }
};
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITabPanel.prototype, "height", void 0);
__decorate([
    bindable({ defaultBindingMode: bindingMode.twoWay }),
    __metadata("design:type", Object)
], UITabPanel.prototype, "active", void 0);
__decorate([
    bindable({ defaultBindingMode: bindingMode.fromView }),
    __metadata("design:type", Object)
], UITabPanel.prototype, "activeTab", void 0);
UITabPanel = __decorate([
    autoinject(),
    inlineView(`<template class="ui-tab-panel" css.bind="{'min-height': height}"><div class="ui-tabbar" tabclosing.trigger="tabClose($event.detail)" tabactivated.trigger="activateTab($event.target)">
  <slot name="ui-tabbar-start"></slot>
  <div class="ui-tabbar-buttons" ref="wrapper" show.bind="!noTabs">
    <slot name="tab-button"></slot>
    <div class="ui-tabbar-toggle ui-tab-button" ref="overflowToggle" show.bind="isOverflow" click.trigger="showOverflow($event)"><ui-glyph glyph="glyph-handle-overflow"></ui-glyph></div>
  </div>
  <slot name="ui-tabbar-end"></slot>
  <div class="ui-menu ui-tabbar-overflow ui-floating" ref="overflow"></div>
  </div><div class="ui-tab-panel-body"><slot></slot></div></template>`),
    customElement('ui-tab-panel'),
    __metadata("design:paramtypes", [Element])
], UITabPanel);
export { UITabPanel };
let UITab = UITab_1 = class UITab {
    constructor(element) {
        this.element = element;
        this.id = '';
        this.class = '';
        this.glyph = '';
        this.glyphClass = '';
        this.disabled = false;
        this.closeable = false;
        this.active = false;
        this.href = 'javascript:;';
        this.view = '';
        this.model = null;
        this.viewModel = '';
        this.id = 'tab-' + (UITab_1.seed++);
    }
    bind(bindingContext, overrideContext) {
        this.closeable = this.closeable || this.element.hasAttribute('closeable');
        this.disabled = this.disabled || this.element.hasAttribute('disabled');
    }
    attached() {
        this.buttonEl.viewModel = this;
    }
    close() {
        UIEvent.fireEvent('close', this.element, this);
        UIEvent.queueTask(() => DOM.removeNode(this.buttonEl));
    }
    activeChanged(newValue) {
        if (!!newValue && this.href !== 'javascript:;')
            this.buttonEl.click();
    }
    fireTabClose(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        UIEvent.fireEvent('tabclosing', this.buttonEl, this);
        return false;
    }
    fireTabChange() {
        if (this.href === 'javascript:;')
            UIEvent.fireEvent('tabactivated', this.buttonEl);
        return true;
    }
};
UITab.seed = 0;
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITab.prototype, "id", void 0);
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITab.prototype, "class", void 0);
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITab.prototype, "glyph", void 0);
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITab.prototype, "glyphClass", void 0);
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITab.prototype, "disabled", void 0);
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITab.prototype, "closeable", void 0);
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITab.prototype, "active", void 0);
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITab.prototype, "href", void 0);
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITab.prototype, "view", void 0);
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITab.prototype, "model", void 0);
__decorate([
    bindable(),
    __metadata("design:type", Object)
], UITab.prototype, "viewModel", void 0);
UITab = UITab_1 = __decorate([
    autoinject(),
    containerless(),
    inlineView(`<template><a ref="buttonEl" slot="tab-button" click.trigger="fireTabChange()" href.bind="href" class="ui-tab-button \${active?'ui-active':''} \${disabled?'ui-disabled':''} \${class}">
  <div><ui-glyph if.bind="glyph" class="ui-tab-icon \${glyphClass}" glyph.bind="glyph"></ui-glyph>
  <span class="ui-label"><slot></slot></span></div>
  <span if.bind="closeable" class="ui-close" click.trigger="fireTabClose($event)">&nbsp;&times;</span>
</a></template>`),
    customElement('ui-tab'),
    __metadata("design:paramtypes", [Element])
], UITab);
export { UITab };
