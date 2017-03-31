import {VDF} from "./VDF";
import {List} from "./VDFExtras";

export class VDFType {
	propIncludeRegexL1: string;
	popOutL1: boolean;
	constructor(propIncludeRegexL1?: string, popOutL1?: boolean) {
		this.propIncludeRegexL1 = propIncludeRegexL1;
		this.popOutL1 = popOutL1;
	}

	AddDataOf(typeTag: VDFType) {
		if (typeTag.propIncludeRegexL1 != null)
			this.propIncludeRegexL1 = typeTag.propIncludeRegexL1;
		if (typeTag.popOutL1 != null)
			this.popOutL1 = typeTag.popOutL1;
	}
}
export class VDFTypeInfo {
	static Get(typeOrName: string | (new(..._)=>any)): VDFTypeInfo {
		//var type = type_orTypeName instanceof Function ? type_orTypeName : window[type_orTypeName];
		var typeName = typeOrName instanceof Function ? typeOrName.name : typeOrName;

		var typeNameBase = typeName.Contains("(") ? typeName.substr(0, typeName.indexOf("(")) : typeName;
		if (VDF.GetIsTypeAnonymous(typeNameBase)) {
			var result = new VDFTypeInfo();
			result.typeTag = new VDFType(VDF.PropRegex_Any);
			return result;
		}
		
		var typeBase = typeOrName instanceof Function ? typeOrName : window[typeNameBase];
        /*if (typeBase == null)
			throw new Error("Could not find constructor for type: " + typeNameBase);*/
        if (typeBase && !typeBase.hasOwnProperty("typeInfo")) {
            var result = new VDFTypeInfo();
            result.typeTag = new VDFType();
            var currentType = typeBase;
            while (currentType != null) {
				var currentTypeInfo = currentType.typeInfo;
                // inherit props from base-types' type-tags
                var typeTag2 = (currentTypeInfo || {}).typeTag;
                for (var key in typeTag2)
                    if (result.typeTag[key] == null)
                        result.typeTag[key] = typeTag2[key];
                // load prop-info from base-types
                if (currentTypeInfo)
                    for (var propName in currentTypeInfo.props)
                        result.props[propName] = currentTypeInfo.props[propName];
                currentType = currentType.prototype && currentType.prototype.__proto__ && currentType.prototype.__proto__.constructor;
            }
            typeBase.typeInfo = result;
        }
        return typeBase && typeBase.typeInfo;
	}

	props = {};
	//chainProps_cache = {}; // all props
	tags: List<any> = new List<any>();
	typeTag: VDFType;

	GetProp(propName: string): VDFPropInfo {
		if (!(propName in this.props))
			this.props[propName] = new VDFPropInfo(propName, null, []);
		return this.props[propName];
	}
}
export function TypeInfo(propIncludeRegexL1?: string, popOutL1?: boolean) {
	var typeTag = new VDFType(propIncludeRegexL1, popOutL1);
    return (type)=> {
		var name = type.name_fake || type.name;
		// maybe temp; auto-hoist to global right here
		if (window[name] == null)
			window[name] = type;
		//var typeInfo = VDFTypeInfo.Get(name);
		var typeInfo = VDFTypeInfo.Get(type);
		typeInfo.tags = new List<any>(null, typeTag);
		typeInfo.typeTag.AddDataOf(typeTag);
    };
};

export class VDFProp {
	includeL2: boolean;
	popOutL2: boolean;
	constructor(includeL2 = true, popOutL2?: boolean) {
		this.includeL2 = includeL2;
		this.popOutL2 = popOutL2;
	}
}
export class VDFPropInfo {
	name: string;
	typeName: string;
	tags = new List<any>();
	propTag: VDFProp;
	defaultValueTag: DefaultValue;
	
	constructor(propName: string, propTypeName: string, tags: any[]) {
		this.name = propName;
		this.typeName = propTypeName;
		this.tags = new List<any>();
		this.propTag = this.tags.FirstOrX(a=>a instanceof VDFProp);
		this.defaultValueTag = this.tags.FirstOrX(a=>a instanceof DefaultValue);
	}

	AddTags(...tags) {
		this.tags.AddRange(tags);
		this.propTag = this.tags.FirstOrX(a=>a instanceof VDFProp);
		this.defaultValueTag = this.tags.FirstOrX(a=>a instanceof DefaultValue);
	}

	ShouldValueBeSaved(val: any) {
		//if (this.defaultValueTag == null || this.defaultValueTag.defaultValue == D.NoDefault)
		if (this.defaultValueTag == null)
			return true;

		if (this.defaultValueTag.defaultValue == D.DefaultDefault) {
			if (val == null) // if null
				return false;
			if (val === false || val === 0) // if struct, and equal to struct's default value
				return true;
		}
		if (this.defaultValueTag.defaultValue == D.NullOrEmpty && val === null)
			return false;
		if (this.defaultValueTag.defaultValue == D.NullOrEmpty || this.defaultValueTag.defaultValue == D.Empty) {
			var typeName = VDF.GetTypeNameOfObject(val);
			if (typeName && typeName.StartsWith("List(") && val.length == 0) // if list, and empty
				return false;
			if (typeName == "string" && !val.length) // if string, and empty
				return false;
		}
		if (val === this.defaultValueTag.defaultValue)
			return false;

		return true;
	}
}
export function T(type: new(..._)=>any);
export function T(typeName: string);
export function T(typeGetterFunc: (_?)=>new(..._)=>any);
export function T(typeNameGetterFunc: (_?)=>string);
export function T(...args) {
    return (target, name)=> {
        //target.prototype[name].AddTags(new VDFPostDeserialize());
        //Prop(target, name, typeOrTypeName);
        //target.p(name, typeOrTypeName);
        var propInfo = VDFTypeInfo.Get(target.constructor).GetProp(name);
		if (typeof args[0] == "string") { // if type-name
			propInfo.typeName = args[0];
		} else if (args[0].name) { // if type/constructor
			let type = args[0];
			propInfo.typeName = type.name;
		} else { // if type/type-name getter-func
			//propInfo.typeName = func.toString().match(/return (\w+?);/)[1];
			let func = args[0];
			let typeOrName = func();
			propInfo.typeName = typeof typeOrName == "string" ? typeOrName : typeOrName.name;
		}
    };
}
export function P(includeL2 = true, popOutL2?: boolean): PropertyDecorator {
    return function(target, name) {
        var propInfo = VDFTypeInfo.Get(target.constructor as any).GetProp(name as string);
        propInfo.AddTags(new VDFProp(includeL2, popOutL2));
    };
};

export class DefaultValue {
	defaultValue;
	constructor(defaultValue = D.DefaultDefault) {
		this.defaultValue = defaultValue;
	}
}

interface DWrapper extends Function {
	(defaultValue?): (target, name)=>void;
	DefaultDefault; // i.e. the default value for the type (not the prop) ['false' for a bool, etc.]
	NullOrEmpty; // i.e. null, or an empty string or collection
	Empty; // i.e. an empty string or collection
}
export var D: DWrapper = function D(defaultValue?) {
	return (target, name)=> {
		var propInfo = VDFTypeInfo.Get(target.constructor).GetProp(name);
		propInfo.AddTags(new DefaultValue(defaultValue));
	};
} as any;
D.DefaultDefault = {};
D.NullOrEmpty = {};
D.Empty = {};

//export var D;
/*export let D = ()=> {
	let D_ = function(...args) {
		return (target, name)=> {
			var propInfo = VDFTypeInfo.Get(target.constructor).GetProp(name);
			propInfo.AddTags(new DefaultValue(...args));
		};
	};
	// copy D.NullOrEmpty and such
	for (var key in g.D)
		D_[key] = g.D[key];
	return D_;
};*/

export class VDFSerializeProp {}
export function _VDFSerializeProp() {
    return (target, name)=>target[name].AddTags(new VDFSerializeProp());
};
export class VDFDeserializeProp {}
export function _VDFDeserializeProp() {
    return (target, name)=>target[name].AddTags(new VDFDeserializeProp());
};

export class VDFPreSerialize {}
export function _VDFPreSerialize() {
    return (target, name)=>target[name].AddTags(new VDFPreSerialize());
};
export class VDFSerialize {}
export function _VDFSerialize() {
    return (target, name)=>target[name].AddTags(new VDFSerialize());
};
export class VDFPostSerialize {}
export function _VDFPostSerialize() {
    return (target, name)=>target[name].AddTags(new VDFPostSerialize());
};

export class VDFPreDeserialize {}
export function _VDFPreDeserialize() {
    return (target, name)=>target[name].AddTags(new VDFPreDeserialize());
};
export class VDFDeserialize {
	fromParent: boolean;
	constructor(fromParent = false) { this.fromParent = fromParent; }
}
export function _VDFDeserialize(fromParent = false) {
    return (target, name)=>target[name].AddTags(new VDFDeserialize(fromParent));
};
export class VDFPostDeserialize {}
export function _VDFPostDeserialize() {
    return (target, name)=>target[name].AddTags(new VDFPostDeserialize());
};


/*export class VDFMethodInfo {
	tags: any[];
	constructor(tags: any[]) { this.tags = tags; }
}*/