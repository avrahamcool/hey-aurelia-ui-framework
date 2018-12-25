import { UITreeModel } from "../../data/ui-treemodel";
export declare class UITree {
    element: Element;
    constructor(element: Element);
    value: string;
    dataSource: UITreeModel;
    labelSearch: string;
    labelNoitems: string;
    labelMore: string;
    labelLess: string;
    maxLevels: string;
    checkLevel: string;
    selectLevel: string;
    maxNodes: string;
    private root;
    private searchText;
    private selectedNode;
    private searchable;
    private checkable;
    private ignoreChange;
    valueChanged(newValue: any): void;
    expandAll(): void;
    collapseAll(): void;
    getChecked(nodes?: any, retVal?: {
        checked: any[];
        partial: any[];
        unchecked: any[];
    }): {
        checked: any[];
        partial: any[];
        unchecked: any[];
    };
    getCheckedTree(nodes?: any): any[];
    private itemClicked;
    private itemSelect;
    private itemChecked;
    private findNode;
    private scrollIntoView;
    private searchTextChanged;
    private filter;
}
export declare class TreeNode {
    element: Element;
    constructor(element: Element);
    tree: UITree;
    node: UITreeModel;
    private fireClicked;
    private doMouseOver;
    private doMouseOut;
}
