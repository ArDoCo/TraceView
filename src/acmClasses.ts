export class CodeModel {
    protected rootPackages : ACMPackage[];
    constructor(rootPackages : ACMPackage[]) {
        this.rootPackages = rootPackages.map((rootPackage) => rootPackage);
    }

    public getRootPackages() : ACMPackage[] {
        return this.rootPackages;
    }   

    public getElement(id : string) : AbstractACMUnit | null {
        for (let rootPackage of this.rootPackages) {
            const element = rootPackage.getElement(id);
            if (element) {
                return element;
            }
        }
        return null;
    }
}

export abstract class AbstractACMUnit {

    id : string;
    readonly name : string;

    constructor(id : string, name : string) {
        this.id = id;
        this.name = name;
    }

    public setIdToPath(pathPrefix : string) : void {
        this.id = pathPrefix + this.name;
    }
}

export class ACMPackage extends AbstractACMUnit {
    protected childPackages : ACMPackage[];
    protected compilationUnits : ACMCodeCompilationUnit[];

    constructor(id : string, name : string, childPackages : ACMPackage[], compilationUnits : ACMCodeCompilationUnit[]) {
        super(id, name);
        this.childPackages = childPackages.map((childPackage) => childPackage);
        this.compilationUnits = compilationUnits.map((compilationUnit) => compilationUnit);
    }

    public getSubPackages() : ACMPackage[] {
        return this.childPackages;
    }

    public getCompilationUnits() : ACMCodeCompilationUnit[] {
        return this.compilationUnits;
    }

    public setIdToPath(pathPrefix : string) {
        this.id = pathPrefix + this.name + "/";
        for (let childPackage of this.childPackages) {
            childPackage.setIdToPath(this.id);
        }
        for (let compilationUnit of this.compilationUnits) {
            compilationUnit.setIdToPath(this.id);
        }
    }

    public getElement(id : string) : AbstractACMUnit | null {
        if (this.id === id) {
            return this;
        }
        for (let childPackage of this.childPackages) {
            const element = childPackage.getElement(id);
            if (element) {
                return element;
            }
        }
        for (let compilationUnit of this.compilationUnits) {
            const element = compilationUnit.getElement(id);
            if (element) {
                return element;
            }
        }
        return null;
    }
}

abstract class AbstractACMUnitWithContent<T extends AbstractACMUnit> extends AbstractACMUnit {
    
    protected content : T[];

    constructor(id : string, name : string, content : T[]) {
        super(id, name);
        this.content = [];
        for (let element of content) {
            this.content.push(element);
        }
    }

    public setIdToPath(pathPrefix : string) {
        this.id = pathPrefix  + this.name + "/";
        for (let element of this.content) {
            element.setIdToPath(this.id);
        }
    }

    public getElement(id : string) : AbstractACMUnit | null {
        console.log("checking " + this.id + " for " + id)
        if (this.id === id) {
            return this;
        }
        for (let element of this.content) {
            if (element.id === id) {
                return element;
            }
        }
        return null;
    }
}

export class ACMClassUnit extends AbstractACMUnitWithContent<ACMControlElement>{
    constructor(id : string, name : string, content : ACMControlElement[]) {
        super(id, name,content);
    }
}
export class ACMInterfaceUnit extends AbstractACMUnitWithContent<ACMControlElement>{
    constructor(id : string, name : string, content : ACMControlElement[]) {
        super(id, name,content);
    }
}

export class ACMCodeCompilationUnit extends AbstractACMUnitWithContent<AbstractACMUnit> {
    constructor(id : string, name : string, content : AbstractACMUnit[]) {
        super(id, name, content);
    }

    public setIdToPath(pathPrefix: string): void {
        this.id = pathPrefix + this.name;
        for (let element of this.content) {
            element.setIdToPath(this.id);
        }
    
    }
}

export class ACMControlElement extends AbstractACMUnit {
    constructor(id : string, name : string) {
        super(id, name);
    }
}