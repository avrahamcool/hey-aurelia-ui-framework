"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
var aurelia_framework_1 = require("aurelia-framework");
var ui_button_1 = require("../elements/inputs/ui-button");
var UIColorBase = (function () {
    function UIColorBase(element) {
        this.element = element;
        this.prefix = '';
        this.value = 'default';
        if (element['au'] && element['au'].controller)
            this.vm = element['au'].controller.viewModel;
        if (element.nodeType == Node.ELEMENT_NODE) {
            this.parentEl = element;
        }
        if (element.nodeType == Node.COMMENT_NODE) {
            this.parentEl = element.previousSibling;
        }
    }
    UIColorBase.prototype.attached = function () {
        this.valueChanged(this.value);
    };
    UIColorBase.prototype.valueChanged = function (newTheme, oldTheme) {
        if (oldTheme === void 0) { oldTheme = ''; }
        var el;
        if (this.vm instanceof ui_button_1.UIButton) {
            if (!this.vm.buttonEl)
                return;
            el = this.vm.buttonEl;
            if (!this.vm.splitTheme || this.vm.splitTheme === oldTheme)
                this.vm.splitTheme = newTheme;
        }
        else if (this.vm instanceof ui_button_1.UIButtonGroup) {
            if (!this.vm.buttons)
                return;
            this.vm.buttons.forEach(function (b) {
                b.element.classList.remove("ui-" + oldTheme);
                b.element.classList.add("ui-" + newTheme);
            });
        }
        else {
            el = this.element;
        }
        if (el && el.classList) {
            el.classList.remove("ui-" + this.prefix + oldTheme);
            el.classList.add("ui-" + this.prefix + newTheme);
        }
    };
    UIColorBase = __decorate([
        aurelia_framework_1.noView(),
        __metadata("design:paramtypes", [Element])
    ], UIColorBase);
    return UIColorBase;
}());
exports.UIColorBase = UIColorBase;
var UIColorTheme = (function (_super) {
    __extends(UIColorTheme, _super);
    function UIColorTheme(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        return _this;
    }
    UIColorTheme = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('theme'),
        __metadata("design:paramtypes", [Element])
    ], UIColorTheme);
    return UIColorTheme;
}(UIColorBase));
exports.UIColorTheme = UIColorTheme;
var UIThemePrimary = (function (_super) {
    __extends(UIThemePrimary, _super);
    function UIThemePrimary(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        return _this;
    }
    UIThemePrimary.prototype.bind = function () {
        this.value = 'primary';
    };
    UIThemePrimary = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('primary'),
        __metadata("design:paramtypes", [Element])
    ], UIThemePrimary);
    return UIThemePrimary;
}(UIColorBase));
exports.UIThemePrimary = UIThemePrimary;
var UIThemeSecondary = (function (_super) {
    __extends(UIThemeSecondary, _super);
    function UIThemeSecondary(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        return _this;
    }
    UIThemeSecondary.prototype.bind = function () {
        this.value = 'secondary';
    };
    UIThemeSecondary = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('secondary'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeSecondary);
    return UIThemeSecondary;
}(UIColorBase));
exports.UIThemeSecondary = UIThemeSecondary;
var UIThemeMuted = (function (_super) {
    __extends(UIThemeMuted, _super);
    function UIThemeMuted(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        return _this;
    }
    UIThemeMuted.prototype.bind = function () {
        this.value = 'muted';
    };
    UIThemeMuted = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('muted'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeMuted);
    return UIThemeMuted;
}(UIColorBase));
exports.UIThemeMuted = UIThemeMuted;
var UIThemeDark = (function (_super) {
    __extends(UIThemeDark, _super);
    function UIThemeDark(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        return _this;
    }
    UIThemeDark.prototype.bind = function () {
        this.value = 'dark';
    };
    UIThemeDark = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('dark'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeDark);
    return UIThemeDark;
}(UIColorBase));
exports.UIThemeDark = UIThemeDark;
var UIThemeInfo = (function (_super) {
    __extends(UIThemeInfo, _super);
    function UIThemeInfo(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        return _this;
    }
    UIThemeInfo.prototype.bind = function () {
        this.value = 'info';
    };
    UIThemeInfo = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('info'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeInfo);
    return UIThemeInfo;
}(UIColorBase));
exports.UIThemeInfo = UIThemeInfo;
var UIThemeDanger = (function (_super) {
    __extends(UIThemeDanger, _super);
    function UIThemeDanger(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        return _this;
    }
    UIThemeDanger.prototype.bind = function () {
        this.value = 'danger';
    };
    UIThemeDanger = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('danger'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeDanger);
    return UIThemeDanger;
}(UIColorBase));
exports.UIThemeDanger = UIThemeDanger;
var UIThemeSuccess = (function (_super) {
    __extends(UIThemeSuccess, _super);
    function UIThemeSuccess(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        return _this;
    }
    UIThemeSuccess.prototype.bind = function () {
        this.value = 'success';
    };
    UIThemeSuccess = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('success'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeSuccess);
    return UIThemeSuccess;
}(UIColorBase));
exports.UIThemeSuccess = UIThemeSuccess;
var UIThemeWarning = (function (_super) {
    __extends(UIThemeWarning, _super);
    function UIThemeWarning(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        return _this;
    }
    UIThemeWarning.prototype.bind = function () {
        this.value = 'warning';
    };
    UIThemeWarning = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('warning'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeWarning);
    return UIThemeWarning;
}(UIColorBase));
exports.UIThemeWarning = UIThemeWarning;
var UIColorThemeBg = (function (_super) {
    __extends(UIColorThemeBg, _super);
    function UIColorThemeBg(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'bg-';
        return _this;
    }
    UIColorThemeBg = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('bg-theme'),
        __metadata("design:paramtypes", [Element])
    ], UIColorThemeBg);
    return UIColorThemeBg;
}(UIColorBase));
exports.UIColorThemeBg = UIColorThemeBg;
var UIThemePrimaryBg = (function (_super) {
    __extends(UIThemePrimaryBg, _super);
    function UIThemePrimaryBg(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'bg-';
        return _this;
    }
    UIThemePrimaryBg.prototype.bind = function () {
        this.value = 'primary';
    };
    UIThemePrimaryBg = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('bg-primary'),
        __metadata("design:paramtypes", [Element])
    ], UIThemePrimaryBg);
    return UIThemePrimaryBg;
}(UIColorBase));
exports.UIThemePrimaryBg = UIThemePrimaryBg;
var UIThemeSecondaryBg = (function (_super) {
    __extends(UIThemeSecondaryBg, _super);
    function UIThemeSecondaryBg(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'bg-';
        return _this;
    }
    UIThemeSecondaryBg.prototype.bind = function () {
        this.value = 'secondary';
    };
    UIThemeSecondaryBg = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('bg-secondary'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeSecondaryBg);
    return UIThemeSecondaryBg;
}(UIColorBase));
exports.UIThemeSecondaryBg = UIThemeSecondaryBg;
var UIThemeMutedBg = (function (_super) {
    __extends(UIThemeMutedBg, _super);
    function UIThemeMutedBg(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'bg-';
        return _this;
    }
    UIThemeMutedBg.prototype.bind = function () {
        this.value = 'muted';
    };
    UIThemeMutedBg = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('bg-muted'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeMutedBg);
    return UIThemeMutedBg;
}(UIColorBase));
exports.UIThemeMutedBg = UIThemeMutedBg;
var UIThemeDarkBg = (function (_super) {
    __extends(UIThemeDarkBg, _super);
    function UIThemeDarkBg(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'bg-';
        return _this;
    }
    UIThemeDarkBg.prototype.bind = function () {
        this.value = 'dark';
    };
    UIThemeDarkBg = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('bg-dark'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeDarkBg);
    return UIThemeDarkBg;
}(UIColorBase));
exports.UIThemeDarkBg = UIThemeDarkBg;
var UIThemeLightBg = (function (_super) {
    __extends(UIThemeLightBg, _super);
    function UIThemeLightBg(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'bg-';
        return _this;
    }
    UIThemeLightBg.prototype.bind = function () {
        this.value = 'light';
    };
    UIThemeLightBg = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('bg-light'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeLightBg);
    return UIThemeLightBg;
}(UIColorBase));
exports.UIThemeLightBg = UIThemeLightBg;
var UIThemeInfoBg = (function (_super) {
    __extends(UIThemeInfoBg, _super);
    function UIThemeInfoBg(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'bg-';
        return _this;
    }
    UIThemeInfoBg.prototype.bind = function () {
        this.value = 'info';
    };
    UIThemeInfoBg = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('bg-info'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeInfoBg);
    return UIThemeInfoBg;
}(UIColorBase));
exports.UIThemeInfoBg = UIThemeInfoBg;
var UIThemeDangerBg = (function (_super) {
    __extends(UIThemeDangerBg, _super);
    function UIThemeDangerBg(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'bg-';
        return _this;
    }
    UIThemeDangerBg.prototype.bind = function () {
        this.value = 'danger';
    };
    UIThemeDangerBg = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('bg-danger'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeDangerBg);
    return UIThemeDangerBg;
}(UIColorBase));
exports.UIThemeDangerBg = UIThemeDangerBg;
var UIThemeSuccessBg = (function (_super) {
    __extends(UIThemeSuccessBg, _super);
    function UIThemeSuccessBg(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'bg-';
        return _this;
    }
    UIThemeSuccessBg.prototype.bind = function () {
        this.value = 'success';
    };
    UIThemeSuccessBg = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('bg-success'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeSuccessBg);
    return UIThemeSuccessBg;
}(UIColorBase));
exports.UIThemeSuccessBg = UIThemeSuccessBg;
var UIThemeWarningBg = (function (_super) {
    __extends(UIThemeWarningBg, _super);
    function UIThemeWarningBg(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'bg-';
        return _this;
    }
    UIThemeWarningBg.prototype.bind = function () {
        this.value = 'warning';
    };
    UIThemeWarningBg = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('bg-warning'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeWarningBg);
    return UIThemeWarningBg;
}(UIColorBase));
exports.UIThemeWarningBg = UIThemeWarningBg;
var UIColorThemeText = (function (_super) {
    __extends(UIColorThemeText, _super);
    function UIColorThemeText(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'text-';
        return _this;
    }
    UIColorThemeText = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('text-theme'),
        __metadata("design:paramtypes", [Element])
    ], UIColorThemeText);
    return UIColorThemeText;
}(UIColorBase));
exports.UIColorThemeText = UIColorThemeText;
var UIThemePrimaryText = (function (_super) {
    __extends(UIThemePrimaryText, _super);
    function UIThemePrimaryText(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'text-';
        return _this;
    }
    UIThemePrimaryText.prototype.bind = function () {
        this.value = 'primary';
    };
    UIThemePrimaryText = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('text-primary'),
        __metadata("design:paramtypes", [Element])
    ], UIThemePrimaryText);
    return UIThemePrimaryText;
}(UIColorBase));
exports.UIThemePrimaryText = UIThemePrimaryText;
var UIThemeSecondaryText = (function (_super) {
    __extends(UIThemeSecondaryText, _super);
    function UIThemeSecondaryText(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'text-';
        return _this;
    }
    UIThemeSecondaryText.prototype.bind = function () {
        this.value = 'secondary';
    };
    UIThemeSecondaryText = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('text-secondary'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeSecondaryText);
    return UIThemeSecondaryText;
}(UIColorBase));
exports.UIThemeSecondaryText = UIThemeSecondaryText;
var UIThemeMutedText = (function (_super) {
    __extends(UIThemeMutedText, _super);
    function UIThemeMutedText(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'text-';
        return _this;
    }
    UIThemeMutedText.prototype.bind = function () {
        this.value = 'muted';
    };
    UIThemeMutedText = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('text-muted'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeMutedText);
    return UIThemeMutedText;
}(UIColorBase));
exports.UIThemeMutedText = UIThemeMutedText;
var UIThemeDarkText = (function (_super) {
    __extends(UIThemeDarkText, _super);
    function UIThemeDarkText(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'text-';
        return _this;
    }
    UIThemeDarkText.prototype.bind = function () {
        this.value = 'dark';
    };
    UIThemeDarkText = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('text-dark'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeDarkText);
    return UIThemeDarkText;
}(UIColorBase));
exports.UIThemeDarkText = UIThemeDarkText;
var UIThemeLightText = (function (_super) {
    __extends(UIThemeLightText, _super);
    function UIThemeLightText(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'text-';
        return _this;
    }
    UIThemeLightText.prototype.bind = function () {
        this.value = 'light';
    };
    UIThemeLightText = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('text-light'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeLightText);
    return UIThemeLightText;
}(UIColorBase));
exports.UIThemeLightText = UIThemeLightText;
var UIThemeInfoText = (function (_super) {
    __extends(UIThemeInfoText, _super);
    function UIThemeInfoText(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'text-';
        return _this;
    }
    UIThemeInfoText.prototype.bind = function () {
        this.value = 'info';
    };
    UIThemeInfoText = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('text-info'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeInfoText);
    return UIThemeInfoText;
}(UIColorBase));
exports.UIThemeInfoText = UIThemeInfoText;
var UIThemeDangerText = (function (_super) {
    __extends(UIThemeDangerText, _super);
    function UIThemeDangerText(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'text-';
        return _this;
    }
    UIThemeDangerText.prototype.bind = function () {
        this.value = 'danger';
    };
    UIThemeDangerText = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('text-danger'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeDangerText);
    return UIThemeDangerText;
}(UIColorBase));
exports.UIThemeDangerText = UIThemeDangerText;
var UIThemeSuccessText = (function (_super) {
    __extends(UIThemeSuccessText, _super);
    function UIThemeSuccessText(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'text-';
        return _this;
    }
    UIThemeSuccessText.prototype.bind = function () {
        this.value = 'success';
    };
    UIThemeSuccessText = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('text-success'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeSuccessText);
    return UIThemeSuccessText;
}(UIColorBase));
exports.UIThemeSuccessText = UIThemeSuccessText;
var UIThemeWarningText = (function (_super) {
    __extends(UIThemeWarningText, _super);
    function UIThemeWarningText(element) {
        var _this = _super.call(this, element) || this;
        _this.element = element;
        _this.prefix = 'text-';
        return _this;
    }
    UIThemeWarningText.prototype.bind = function () {
        this.value = 'warning';
    };
    UIThemeWarningText = __decorate([
        aurelia_framework_1.autoinject(),
        aurelia_framework_1.customAttribute('text-warning'),
        __metadata("design:paramtypes", [Element])
    ], UIThemeWarningText);
    return UIThemeWarningText;
}(UIColorBase));
exports.UIThemeWarningText = UIThemeWarningText;
