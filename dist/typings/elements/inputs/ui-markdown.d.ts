import { UIBaseInput } from "./ui-input";
export declare class UIMarkdown extends UIBaseInput {
    element: Element;
    constructor(element: Element);
    bind(bindingContext: Object, overrideContext: Object): void;
    value: string;
    dir: string;
    rows: number;
    errors: any;
    maxlength: number;
    disabled: boolean;
    readonly: boolean;
    placeholder: string;
    autoComplete: string;
    helpText: string;
    private clear;
    private counter;
    private ignore;
    private help;
    private preview;
    private disableTools;
    toolClicked(evt: any): void;
}
export declare class UILanguage {
    element: Element;
    constructor(element: Element);
    bind(bindingContext: Object, overrideContext: Object): void;
    attached(): void;
    detached(): void;
    value: string;
    dir: string;
    errors: any;
    disabled: boolean;
    readonly: boolean;
    helpText: string;
    languages: any;
    placeholder: string;
    errored: any[];
    show: boolean;
    private inputEl;
    private elValue;
    private dropdown;
    private tether;
    private closing;
    private obMouseup;
    private selectedList;
    private availableList;
    valueChanged(newValue: any): void;
    languagesChanged(newValue: any): void;
    fireEvent(evt: any): void;
    hilightItem(evt: any): void;
    unhilightItem(evt: any): void;
    scrollIntoView(): void;
    openDropdown(): boolean;
    closeDropdown(): void;
    toggleDropdown(evt: any, forceClose?: boolean): void;
    addLanguage(model: any): void;
    removeLanguage(model: any): void;
    fireSelect(model: any): void;
}
