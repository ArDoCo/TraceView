import { UMLInterface, UMLComponent, UMLModel } from "../artifacts/uml";

enum TokenType {
    OPEN,
    CLOSE,
    ATTRIBUTE
}

class Token {
    type : TokenType;
    value : string;
    constructor(type : TokenType, value : string) {
        this.type = type;
        this.value = value;
    }
}

function lex(content : string) : Token[] {
    let tokens : Token[] = [];
    let elements : string[] = content.split(" ").filter((s) => s.length > 0)
    for (let element of elements) {
        if (element.startsWith('<')) {
            if (element.startsWith('</')) {
                tokens.push(new Token(TokenType.CLOSE, element));
            } else {
                tokens.push(new Token(TokenType.OPEN, element));
            }
        } else { 
            if (element.indexOf('=') > 0) {
                tokens.push(new Token(TokenType.ATTRIBUTE, element.replace("/>", "").replace(">", "")));
            }
        }
    }
    return tokens;
}

function parseLeaf(tokens : Token[], index : number) : [number, Map<string,string>] {
    let attributes : Map<string,string> = new Map<string,string>();
    while(tokens[index].type != TokenType.OPEN && tokens[index].type != TokenType.CLOSE) {
        if (tokens[index].value.indexOf("=") > 0) {
            let key = tokens[index].value.split("=")[0];
            let value = tokens[index].value.split("=")[1].replace(">", "");
            attributes.set(key, value[0] == '"' && value[value.length-1] == '"' ? value.substring(1,value.length-1) : value);
        }
        index++;
    }
    return [index,attributes];
}

function parseOwnedOperation(tokens : Token[], index : number) : [number,{identifier : string, name : string}] {
    let content = parseLeaf(tokens, index);
    index = content[0];
    let attributes = content[1];
    if (attributes.size > 2) {
        throw new Error("Unexpected number of attributes for operation: " + attributes.size);
    }
    let identifier = attributes.get('xmi:id')!;
    let name = attributes.get('name')!;
    return [index,{identifier : identifier, name : name}];
}

function parseInterfaceRealization(tokens : Token[], index : number) : [number,{identifier : string, child : string, parent : string}] {
    let content = parseLeaf(tokens, index);
    let attributes = content[1];
    index = content[0];
    if (attributes.size > 4) {
        throw new Error("Unexpected number of attributes for interface realization: " + attributes.size);
    }
    let identifier = attributes.get('xmi:id');
    let sourceId = attributes.get('client');
    let targetId = attributes.get('supplier');
    let name = attributes.get('contract');
    if (identifier && sourceId && targetId && name) {
        return [index,{identifier : identifier, child : sourceId, parent : targetId}];
    }
    throw new Error("Missing at least one of xmi:id, client, supplier or contract attribute for interface realization");
}

function parseUsage(tokens : Token[], index : number) : [number,{identifier : string, sourceId : string, targetId : string}] {
    let content = parseLeaf(tokens, index);
    let attributes = content[1];
    index = content[0];
    if (attributes.size > 4) {
        throw new Error("Unexpected number of attributes for usage: " + attributes.size);
    }
    let identifier = attributes.get('xmi:id');
    let sourceId = attributes.get('client');
    let targetId = attributes.get('supplier');
    if (identifier && sourceId && targetId) {
        return [index, {identifier : identifier, sourceId : sourceId, targetId : targetId}];
    }
    throw new Error("Missing at least one of xmi:id, client or supplier attribute for usage");
}

export function parseUML(content : string) : UMLModel {
    let contentWithoutFirstAndlastLine = content.substring(content.indexOf("<p"), content.lastIndexOf("</"));
    let cleanContent = contentWithoutFirstAndlastLine.replace(/\n/g, ' ');
    let tokens : Token[] = lex(cleanContent);
    const interfaces : Map<string,UMLInterface> = new Map<string,UMLInterface>();
    const components : Map<string,UMLComponent> = new Map<string,UMLComponent>();
    const interfaceRealizations : {identifier : string, child : string, parent : string}[] = [];
    const usages : {identifier : string, sourceId : string, targetId : string}[] = [];
    let i = 0;
    while(i  < tokens.length) {
        if (tokens[i].type == TokenType.OPEN && tokens[i].value.startsWith("<packagedElement")) {
            const operations : {identifier : string, name : string}[] = [];
            let attributes : Map<string,string> = new Map<string,string>();
            i++;
            while(tokens[i].type != TokenType.OPEN) {
                let key = tokens[i].value.split("=")[0];
                let value = tokens[i].value.split("=")[1];
                attributes.set(key,value.substring(1,value.length-1));
                i++;
            } 
            while(tokens[i].type != TokenType.CLOSE) {
                if (tokens[i].type == TokenType.OPEN && tokens[i].value.startsWith("<ownedOperation")) {
                    i++;
                    let newIndexAndResult = parseOwnedOperation(tokens, i);
                    i = newIndexAndResult[0];
                    operations.push(newIndexAndResult[1]);
                } else if (tokens[i].type == TokenType.OPEN && tokens[i].value.startsWith("<interfaceRealization")) {
                    i++;
                    let newIndexAndResult = parseInterfaceRealization(tokens, i);
                    i = newIndexAndResult[0];
                    interfaceRealizations.push(newIndexAndResult[1]);
                } else if (tokens[i].type == TokenType.OPEN && tokens[i].value.startsWith("<packagedElement")) {
                    i++;
                    let newIndexAndResult = parseUsage(tokens, i);
                    i = newIndexAndResult[0];
                    usages.push(newIndexAndResult[1]);
                }
                else {
                    throw new Error("Unexpected token: " + tokens[i].type + " (" + tokens[i].value + ") at index " + i);
                }
            }
            const type = attributes.get('xmi:type');
            const identifier = attributes.get('xmi:id');
            const name = attributes.get('name');
            if (identifier && name) {
                if (type == "uml:Interface") {
                    interfaces.set(identifier, new UMLInterface(identifier, name, operations));
                } else if (type == "uml:Component") {
                    components.set(identifier, new UMLComponent(identifier, name));
                } else {
                    throw new Error("Unexpected type: " + type);
                }
            }
            i++;
        } else {
            throw new Error("Unexpected tl token: " + tokens[i].type + " (" + tokens[i].value + ") at index " + i);
        }
    }
    for (let interfaceRealization of interfaceRealizations) {
        const child = components.get(interfaceRealization.child);
        const parent = interfaces.get(interfaceRealization.parent);
        if (child && parent) {
            child.addExtends(parent);
            parent.addChild(child);
        } else {
            throw new Error("Could not find interface for interface realization: " + interfaceRealization.child + " -> " + interfaceRealization.parent);
        }
    }
    for (let usage of usages) {
        const source = components.get(usage.sourceId);
        const target = interfaces.get(usage.targetId);
        if (source && target) {
            source.addUses(target);
        } else {
            throw new Error("Could not find source or target for usage: " + usage.sourceId + " -> " + usage.targetId);
        }
    }
    return new UMLModel(Array.from(components.values()), Array.from(interfaces.values()));
}