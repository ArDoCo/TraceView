export interface Buttoned {
    getButtons() : UIButton[];
}

export class UIButton {

    public static readonly SYMBOL_REFRESH = "⟲";
    public static readonly SYMBOL_ERASE = "⌫";
    public static readonly SYMBOL_CLOSE = "✖";

    public readonly label : string;
    public readonly onClick : () => boolean;
    public readonly isToggle : boolean;
    public readonly startsToggled : boolean;

    constructor(label : string, tooltip : string, onClick : () => boolean, isToggle : boolean = false, startsToggled : boolean = false) {
        this.label = label;
        this.onClick = onClick;
        this.isToggle = isToggle;
        this.startsToggled = startsToggled;
    }
}