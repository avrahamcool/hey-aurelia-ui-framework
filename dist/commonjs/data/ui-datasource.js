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
var aurelia_logging_1 = require("aurelia-logging");
var aurelia_metadata_1 = require("aurelia-metadata");
var ui_http_1 = require("../utils/ui-http");
var ui_event_1 = require("../utils/ui-event");
var ui_utils_1 = require("../utils/ui-utils");
var _ = require("lodash");
var ERROR_CODES = {
    NO_API: { errorCode: 'AUF-DS:000', message: "API route required" },
    REJECTED: { errorCode: 'AUF-DS:001', message: "REST call rejected" },
    UNKNOWNID: { errorCode: 'AUF-DS:002', message: "Data source error" }
};
var DEFAULT_OPTIONS = {
    apiSlug: '',
    paginate: false,
    recordsPerPage: 10,
    rootProperty: 'data',
    pageProperty: 'page',
    queryProperty: 'query',
    sortByProperty: 'sortBy',
    orderByProperty: 'orderBy',
    totalPagesProperty: 'totalPages',
    totalRecordsProperty: 'totalRecords',
    recordsPerPageProperty: 'recordsPerPage',
    remoteSorting: true,
    remoteFiltering: true
};
var UIDataSource = (function () {
    function UIDataSource(options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        this.data = [];
        this.busy = false;
        this.loaded = false;
        this.paginate = false;
        this.metadata = aurelia_metadata_1.metadata.getOrCreateOwn(aurelia_metadata_1.metadata.properties, DSMetadata, Object.getPrototypeOf(this));
        this.logger = aurelia_logging_1.getLogger(this.constructor.name);
        options = Object.assign({}, DEFAULT_OPTIONS, options);
        Object.keys(options).forEach(function (key) { return (_this.hasOwnProperty(key) && (_this[key] = options[key]))
            || (_this.metadata.hasOwnProperty(key) && (_this.metadata[key] = options[key])); });
    }
    UIDataSource.prototype.load = function (dataList) {
        if (dataList === void 0) { dataList = []; }
        this.metadata.original = dataList;
        this.buildDataList();
    };
    UIDataSource.prototype.loadPage = function (page) {
        this.metadata.page = page;
        this.buildDataList();
    };
    UIDataSource.prototype.filter = function (query) {
        this.metadata.query = query;
        this.buildDataList();
    };
    UIDataSource.prototype.sort = function (column, order) {
        this.metadata.sortBy = column;
        this.metadata.orderBy = order;
        this.buildDataList();
    };
    Object.defineProperty(UIDataSource.prototype, "totalPages", {
        get: function () {
            return this.metadata.totalPages;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(UIDataSource.prototype, "totalRecords", {
        get: function () {
            return this.metadata.totalRecords;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(UIDataSource.prototype, "recordsPerPage", {
        get: function () {
            return this.metadata.recordsPerPage;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(UIDataSource.prototype, "page", {
        get: function () {
            return this.metadata.page;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(UIDataSource.prototype, "sortBy", {
        get: function () {
            return this.metadata.sortBy;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(UIDataSource.prototype, "orderBy", {
        get: function () {
            return this.metadata.orderBy;
        },
        enumerable: true,
        configurable: true
    });
    UIDataSource.prototype.buildDataList = function () {
        var _this = this;
        this.busy = true;
        var filtered = _.cloneDeep(this.metadata.original);
        if (this.metadata.query) {
            var keys_1 = Object.keys(this.metadata.query);
            filtered = _.filter(filtered, function (record) {
                var ret = false;
                _.forEach(keys_1, function (key) {
                    return !(ret = isEmpty(_this.metadata.query[key]) ||
                        record[key].ascii().toLowerCase().indexOf(_this.metadata.query[key].ascii().toLowerCase()) >= 0);
                });
                return ret;
            });
        }
        filtered = _.orderBy(filtered, [this.metadata.sortBy || 'id'], [this.metadata.orderBy]);
        if (this.paginate) {
            this.metadata.totalRecords = filtered.length;
            this.metadata.totalPages = Math.ceil(filtered.length / this.metadata.recordsPerPage);
            filtered = filtered.splice((this.metadata.page * this.metadata.recordsPerPage), this.metadata.recordsPerPage);
        }
        this.data = filtered;
        ui_event_1.UIEvent.queueTask(function () { return [_this.busy = false, _this.loaded = true]; });
    };
    __decorate([
        aurelia_framework_1.computedFrom('metadata.totalPages'),
        __metadata("design:type", Object),
        __metadata("design:paramtypes", [])
    ], UIDataSource.prototype, "totalPages", null);
    __decorate([
        aurelia_framework_1.computedFrom('metadata.totalRecords'),
        __metadata("design:type", Object),
        __metadata("design:paramtypes", [])
    ], UIDataSource.prototype, "totalRecords", null);
    __decorate([
        aurelia_framework_1.computedFrom('metadata.recordsPerPage'),
        __metadata("design:type", Object),
        __metadata("design:paramtypes", [])
    ], UIDataSource.prototype, "recordsPerPage", null);
    __decorate([
        aurelia_framework_1.computedFrom('metadata.page'),
        __metadata("design:type", Object),
        __metadata("design:paramtypes", [])
    ], UIDataSource.prototype, "page", null);
    __decorate([
        aurelia_framework_1.computedFrom('metadata.sortBy'),
        __metadata("design:type", Object),
        __metadata("design:paramtypes", [])
    ], UIDataSource.prototype, "sortBy", null);
    __decorate([
        aurelia_framework_1.computedFrom('metadata.orderBy'),
        __metadata("design:type", Object),
        __metadata("design:paramtypes", [])
    ], UIDataSource.prototype, "orderBy", null);
    return UIDataSource;
}());
exports.UIDataSource = UIDataSource;
var UIRemoteDataSource = (function (_super) {
    __extends(UIRemoteDataSource, _super);
    function UIRemoteDataSource() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.rootProperty = 'data';
        _this.pageProperty = 'page';
        _this.queryProperty = 'query';
        _this.sortByProperty = 'sortBy';
        _this.orderByProperty = 'orderBy';
        _this.totalPagesProperty = 'totalPages';
        _this.totalRecordsProperty = 'totalRecords';
        _this.recordsPerPageProperty = 'recordsPerPage';
        _this.remoteSorting = true;
        _this.remoteFiltering = true;
        _this.httpClient = ui_utils_1.UIUtils.lazy(ui_http_1.UIHttpService);
        return _this;
    }
    UIRemoteDataSource.prototype.load = function () {
        var _this = this;
        this.doRequest().then(function (data) { return _this.metadata.original = _.cloneDeep(_this.data = data); });
    };
    UIRemoteDataSource.prototype.loadPage = function (page) {
        var _this = this;
        this.metadata.page = page;
        this.doRequest().then(function (data) { return _this.data = data; });
    };
    UIRemoteDataSource.prototype.filter = function (query) {
        var _this = this;
        this.metadata.query = query;
        this.remoteFiltering ? this.doRequest().then(function (data) { return _this.data = data; }) : this.buildDataList();
    };
    UIRemoteDataSource.prototype.sort = function (column, order) {
        var _this = this;
        this.metadata.sortBy = column;
        this.metadata.orderBy = order;
        this.remoteSorting ? this.doRequest().then(function (data) { return _this.data = data; }) : this.buildDataList();
    };
    UIRemoteDataSource.prototype.preRequest = function (req) { };
    UIRemoteDataSource.prototype.postRequest = function (req) { };
    UIRemoteDataSource.prototype.buildQueryObject = function () {
        var _a;
        return _a = {},
            _a[this.pageProperty] = this.metadata.page,
            _a[this.queryProperty] = this.metadata.query,
            _a[this.sortByProperty] = this.metadata.sortBy,
            _a[this.orderByProperty] = this.metadata.orderBy,
            _a[this.recordsPerPageProperty] = this.metadata.recordsPerPage,
            _a;
    };
    UIRemoteDataSource.prototype.doRequest = function () {
        var _this = this;
        if (!this.apiSlug)
            return Promise.reject(ERROR_CODES.NO_API);
        ;
        var queryObject = this.buildQueryObject();
        var url = "" + this.apiSlug + this.httpClient.buildQueryString(queryObject);
        this.callPreHook('preRequest', { url: url, queryObject: queryObject })
            .then(function (result) {
            if (result !== false) {
                return _this.httpClient.json(url);
            }
            Promise.reject(ERROR_CODES.REJECTED);
        }).then(function (response) {
            _this.metadata.totalPages = response[_this.totalPagesProperty];
            _this.metadata.totalRecords = response[_this.totalRecordsProperty];
            return response[_this.rootProperty];
        });
    };
    UIRemoteDataSource.prototype.callPreHook = function (hook, data) {
        var result = this[hook](data);
        if (result instanceof Promise) {
            return result;
        }
        if (result !== null && result !== undefined) {
            return Promise.resolve(result);
        }
        return Promise.resolve(true);
    };
    return UIRemoteDataSource;
}(UIDataSource));
exports.UIRemoteDataSource = UIRemoteDataSource;
var DSMetadata = (function () {
    function DSMetadata() {
        this.original = [];
        this.apiSlug = '';
        this.query = '';
        this.page = 0;
        this.sortBy = '';
        this.orderBy = 'asc';
        this.totalPages = 0;
        this.totalRecords = 0;
        this.recordsPerPage = 10;
    }
    return DSMetadata;
}());
exports.DSMetadata = DSMetadata;
