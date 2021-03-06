var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define(["require", "exports", "aurelia-framework", "../../utils/ui-event", "lodash"], function (require, exports, aurelia_framework_1, ui_event_1, _) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var UIForm = (function () {
        function UIForm(element) {
            this.element = element;
            this.class = '';
        }
        UIForm.prototype.attached = function () {
            var _this = this;
            ui_event_1.UIEvent.queueTask(function () {
                var el = _this.formEl.querySelector('input,textarea');
                if (el !== null)
                    el.focus();
                if (_this.busy)
                    _this.busyChanged(_this.busy);
                if (_this.disabled)
                    _this.disabledChanged(_this.disabled);
            });
        };
        UIForm.prototype.busyChanged = function (newValue) {
            this.disableInputs(!!newValue || this.disabled);
        };
        UIForm.prototype.disabledChanged = function (newValue) {
            this.disableInputs(!!newValue);
        };
        UIForm.prototype.disableInputs = function (newValue) {
            _.forEach(this.inputEls, function (el) {
                try {
                    el.au.controller.viewModel.disable(!!newValue);
                }
                catch (e) {
                }
            });
        };
        UIForm.prototype.fireSubmit = function () {
            if (!this.busy)
                ui_event_1.UIEvent.fireEvent('submit', this.element);
        };
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Object)
        ], UIForm.prototype, "class", void 0);
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Boolean)
        ], UIForm.prototype, "busy", void 0);
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Boolean)
        ], UIForm.prototype, "disabled", void 0);
        __decorate([
            aurelia_framework_1.children('ui-button,ui-combo,ui-date,ui-input,ui-textarea,ui-phone,ui-language,ui-markdown,ui-checkbox,ui-radio,ui-switch,ui-tag,ui-list,ui-dropdown'),
            __metadata("design:type", Object)
        ], UIForm.prototype, "inputEls", void 0);
        UIForm = __decorate([
            aurelia_framework_1.autoinject(),
            aurelia_framework_1.containerless(),
            aurelia_framework_1.customElement('ui-form'),
            aurelia_framework_1.inlineView("<template><form class=\"ui-form ${class}\" ref=\"formEl\" validation-renderer=\"ui-validator\" enterpressed.trigger=\"fireSubmit()\" submit.trigger=\"false\"><slot></slot></form></template>"),
            __metadata("design:paramtypes", [Element])
        ], UIForm);
        return UIForm;
    }());
    exports.UIForm = UIForm;
    var UIFieldset = (function () {
        function UIFieldset(element) {
            this.element = element;
            this.class = '';
            this.legend = '';
            this.checked = true;
            this.collapsible = false;
            this.collapsible = element.hasAttribute('checked') || element.hasAttribute('checked.bind');
        }
        UIFieldset.prototype.bind = function (bindingContext, overrideContext) {
            this.checked = this.checked || this.element.hasAttribute('checked');
        };
        UIFieldset.prototype.attached = function () {
            this.checkedChanged(this.checked);
            if (this.disabled)
                this.disabledChanged(this.disabled);
        };
        UIFieldset.prototype.checkedChanged = function (newValue) {
            this.fieldsetEl.classList[!!newValue ? 'remove' : 'add']('ui-collapse');
            this.disableInputs(!newValue);
        };
        UIFieldset.prototype.disabledChanged = function (newValue) {
            this.disableInputs(!!newValue);
        };
        UIFieldset.prototype.disableInputs = function (newValue) {
            _.forEach(this.inputEls, function (el) {
                try {
                    el.au.controller.viewModel.disable(!!newValue);
                }
                catch (e) {
                }
            });
        };
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Object)
        ], UIFieldset.prototype, "class", void 0);
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Object)
        ], UIFieldset.prototype, "legend", void 0);
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Boolean)
        ], UIFieldset.prototype, "disabled", void 0);
        __decorate([
            aurelia_framework_1.bindable({ defaultBindingMode: aurelia_framework_1.bindingMode.twoWay }),
            __metadata("design:type", Object)
        ], UIFieldset.prototype, "checked", void 0);
        __decorate([
            aurelia_framework_1.children('ui-button,ui-combo,ui-date,ui-input,ui-textarea,ui-phone,ui-language,ui-markdown,ui-checkbox,ui-radio,ui-switch,ui-tag,ui-list,ui-dropdown'),
            __metadata("design:type", Object)
        ], UIFieldset.prototype, "inputEls", void 0);
        UIFieldset = __decorate([
            aurelia_framework_1.autoinject(),
            aurelia_framework_1.containerless(),
            aurelia_framework_1.inlineView('<template><fieldset class="ui-fieldset" ref="fieldsetEl"><legend if.bind="legend"><span if.bind="!collapsible">\${legend}</span><ui-checkbox if.bind="collapsible" checked.bind="checked">\${legend}</ui-checkbox></legend><div><slot></slot></div></fieldset></template>'),
            aurelia_framework_1.customElement('ui-fieldset'),
            __metadata("design:paramtypes", [Element])
        ], UIFieldset);
        return UIFieldset;
    }());
    exports.UIFieldset = UIFieldset;
    var UIInputGroup = (function () {
        function UIInputGroup(element) {
            this.element = element;
            this.width = 'auto';
            this.innerWidth = '4em';
            if (element.hasAttribute('plain'))
                element.classList.add('ui-plain');
        }
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Object)
        ], UIInputGroup.prototype, "width", void 0);
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Object)
        ], UIInputGroup.prototype, "innerWidth", void 0);
        UIInputGroup = __decorate([
            aurelia_framework_1.autoinject(),
            aurelia_framework_1.inlineView("<template class=\"ui-input-group\" css.bind=\"{'width':width}\"><slot name=\"inputLabel\"></slot>\n  <div css.bind=\"{'min-width':innerWidth}\"><div class=\"ui-group-wrapper\"><slot></slot></div><slot name=\"inputInfo\"></slot></div></template>"),
            aurelia_framework_1.customElement('ui-input-group'),
            __metadata("design:paramtypes", [Element])
        ], UIInputGroup);
        return UIInputGroup;
    }());
    exports.UIInputGroup = UIInputGroup;
    var UIInputInfo = (function () {
        function UIInputInfo(element) {
            this.element = element;
            this.class = '';
        }
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Object)
        ], UIInputInfo.prototype, "class", void 0);
        UIInputInfo = __decorate([
            aurelia_framework_1.autoinject(),
            aurelia_framework_1.containerless(),
            aurelia_framework_1.inlineView('<template><div slot="inputInfo" class="ui-input-info \${class}"><slot></slot></div></template>'),
            aurelia_framework_1.customElement('ui-input-info'),
            __metadata("design:paramtypes", [Element])
        ], UIInputInfo);
        return UIInputInfo;
    }());
    exports.UIInputInfo = UIInputInfo;
    var UIInputAddon = (function () {
        function UIInputAddon(element) {
            this.element = element;
            this.glyph = '';
            this.glyphClass = '';
            if (element.hasAttribute('end'))
                element.classList.add('ui-end');
            else
                element.classList.add('ui-start');
        }
        UIInputAddon.prototype.focusEl = function () {
            var el = this.element.nextElementSibling;
            if (el && el['focus'])
                ui_event_1.UIEvent.queueTask(function () { return el['focus'](); });
            return true;
        };
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Object)
        ], UIInputAddon.prototype, "glyph", void 0);
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Object)
        ], UIInputAddon.prototype, "glyphClass", void 0);
        UIInputAddon = __decorate([
            aurelia_framework_1.autoinject(),
            aurelia_framework_1.customElement('ui-input-addon'),
            aurelia_framework_1.inlineView("<template class=\"ui-input-addon\" click.trigger=\"focusEl()\"><slot><ui-glyph class.bind=\"glyphClass\" glyph.bind=\"glyph\"></ui-glyph></slot></template>"),
            __metadata("design:paramtypes", [Element])
        ], UIInputAddon);
        return UIInputAddon;
    }());
    exports.UIInputAddon = UIInputAddon;
    var UIInputLabel = (function () {
        function UIInputLabel(element) {
            this.element = element;
            this.for = '';
            this.class = '';
            this.width = '8em';
        }
        UIInputLabel_1 = UIInputLabel;
        UIInputLabel.prototype.bind = function (bindingContext, overrideContext) {
            if (this.element.hasAttribute('align-top'))
                this.class += ' ui-align-top';
            if (this.element.hasAttribute('required'))
                this.class += ' ui-required';
            if (this.element.hasAttribute('align-top'))
                this.width = '100%';
        };
        UIInputLabel.prototype.attached = function () {
            if (isEmpty(this.for)) {
                var el = this.label.parentElement.querySelector('input:not([type="checkbox"]):not([type="radio"]),textarea');
                if (el) {
                    if (!el.id)
                        el.id = 'ui-input-' + (UIInputLabel_1.seed++);
                    this.for = el.id;
                }
            }
        };
        var UIInputLabel_1;
        UIInputLabel.seed = 1;
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Object)
        ], UIInputLabel.prototype, "for", void 0);
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Object)
        ], UIInputLabel.prototype, "class", void 0);
        __decorate([
            aurelia_framework_1.bindable(),
            __metadata("design:type", Object)
        ], UIInputLabel.prototype, "width", void 0);
        UIInputLabel = UIInputLabel_1 = __decorate([
            aurelia_framework_1.autoinject(),
            aurelia_framework_1.containerless(),
            aurelia_framework_1.inlineView("<template><label ref=\"label\" slot=\"inputLabel\" class=\"ui-input-label ${class}\" for.bind=\"for\" css.bind=\"{'flex-basis':width}\"><span><slot></slot></span></label></template>"),
            aurelia_framework_1.customElement('ui-input-label'),
            __metadata("design:paramtypes", [Element])
        ], UIInputLabel);
        return UIInputLabel;
    }());
    exports.UIInputLabel = UIInputLabel;
});
