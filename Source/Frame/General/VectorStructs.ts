import {Global} from "../General/Globals_Free";
import {Assert} from "../General/Assert";
import {VDFNode} from "../Serialization/VDF/VDFNode";
import {_VDFSerialize, _VDFDeserialize} from "../Serialization/VDF/VDFTypeInfo";
import {IsNumber} from "../General/Types";

@Global
export class Vector2i {
	static get zero() { return new Vector2i(0, 0); }
	static get one() { return new Vector2i(1, 1); }
	
	constructor(x?: number, y?: number);
	constructor(pos: {x: number, y: number});
	constructor(pos: {left: number, top: number});
	constructor(...args) {
		var x: number, y: number;
		if (typeof args[0] == "number") [x, y] = args;
		else if (args[0].x != null) [x, y] = [args[0].x, args[0].y];
		else if (args[0].left != null) [x, y] = [args[0].left, args[0].top];

		this.x = x;
		this.y = y;
	}

	x: number;
	y: number;
    
	@_VDFDeserialize() Deserialize(node) {
		var strParts = node.primitiveValue.split(" ");
		this.x = parseInt(strParts[0]);
		this.y = parseInt(strParts[1]);
	}
	@_VDFSerialize() Serialize() { return new VDFNode(this.toString()); }
	toString() { return this.x + " " + this.y; }
    Equals(other) { return other && this.toString() == other.toString(); }

	NewX(xOrFunc) { return new Vector2i(xOrFunc instanceof Function ? xOrFunc(this.x) : xOrFunc, this.y); }
	NewY(yOrFunc) { return new Vector2i(this.x, yOrFunc instanceof Function ? yOrFunc(this.y) : yOrFunc); }

	Minus(other: Vector2i): Vector2i;
	Minus(otherX: number, otherY: number): Vector2i;
	Minus(...args) {
		var [x, y] = args[0] instanceof Vector2i ? [args[0].x, args[0].y] : args;
		return new Vector2i(this.x - x, this.y - y);
	}
	Plus(other: Vector2i): Vector2i;
	Plus(otherX: number, otherY: number): Vector2i;
	Plus(...args) {
		var [x, y] = args[0] instanceof Vector2i ? [args[0].x, args[0].y] : args;
		return new Vector2i(this.x + x, this.y + y);
	}
	Times(other: Vector2i): Vector2i;
	Times(other: number): Vector2i;
	Times(otherX: number, otherY: number): Vector2i;
    Times(...args) {
		var [x, y] = args[0] instanceof Vector2i ? [args[0].x, args[0].y] :
			args.length == 1 ? [args[0], args[0]] :
			args;
        return new Vector2i(this.x * x, this.y * y);
    }

	DistanceTo(other: Vector2i) {
		return Math.sqrt((other.x - this.x).ToPower(2) + (other.y - this.y).ToPower(2));
	}
}

@Global
export class VVector2 {
	static get zero() { return new VVector2(0, 0); }
	static get one() { return new VVector2(1, 1); }

	constructor(x = null, y = null) {
	    this.x = x != null ? x : 0;
		this.y = y != null ? y : 0;
	}

	x: number;
	y: number;

	@_VDFDeserialize() Deserialize(node) {
		var strParts = node.primitiveValue.split(" ");
		this.x = parseInt(strParts[0]);
		this.y = parseInt(strParts[1]);
	}
	@_VDFSerialize() Serialize() { return new VDFNode(this.toString()); }
	toString() { return this.x + " " + this.y; }

	NewX(xOrFunc) { return new VVector2(xOrFunc instanceof Function ? xOrFunc(this.x) : xOrFunc, this.y); }
	NewY(yOrFunc) { return new VVector2(this.x, yOrFunc instanceof Function ? yOrFunc(this.y) : yOrFunc); }

	Minus(arg1, arg2) {
		if (arg1 instanceof VVector2)
			return new VVector2(this.x - arg1.x, this.y - arg1.y);
		return new VVector2(this.x - arg1, this.y - arg2);
	}
	Plus(arg1, arg2) {
		if (arg1 instanceof VVector2)
			return new VVector2(this.x + arg1.x, this.y + arg1.y);
		return new VVector2(this.x + arg1, this.y + arg2);
	}
}

@Global
export class Vector3i {
	static get zero() { return new Vector3i(0, 0, 0); }
	static get one() { return new Vector3i(1, 1, 1); }

	constructor(x = null, y = null, z = null) {
        this.x = x != null ? x : 0;
		this.y = y != null ? y : 0;
		this.z = z != null ? z : 0;
    }

	x: number;
	y: number;
	z: number;

	@_VDFDeserialize() Deserialize(node) {
		var strParts = node.primitiveValue.split(" ");
		this.x = parseInt(strParts[0]);
		this.y = parseInt(strParts[1]);
		this.z = parseInt(strParts[2]);
	}
	//VDFSerialize() { return this.toString(); } //Swapped().toString(); }
	@_VDFSerialize() Serialize() { return new VDFNode(this.toString()); }
	toString() { return this.x + " " + this.y + " " + this.z; }

	NewX(xOrFunc) { return new Vector3i(xOrFunc instanceof Function ? xOrFunc(this.x) : xOrFunc, this.y, this.z); }
	NewY(yOrFunc) { return new Vector3i(this.x, yOrFunc instanceof Function ? yOrFunc(this.y) : yOrFunc, this.z); }
	NewZ(zOrFunc) { return new Vector3i(this.x, this.y, zOrFunc instanceof Function ? zOrFunc(this.z) : zOrFunc); }
}

@Global
export class VVector3 {
	static get zero() { return new VVector3(0, 0, 0); }
	static get one() { return new VVector3(1, 1, 1); }

	constructor(x = null, y = null, z = null) {
	    this.x = x != null ? x : 0;
		this.y = y != null ? y : 0;
		this.z = z != null ? z : 0;
	}

	x: number;
	y: number;
	z: number;

	@_VDFDeserialize() Deserialize(node) {
		var strParts = node.primitiveValue.split(" ");
		this.x = parseInt(strParts[0]);
		this.y = parseInt(strParts[1]);
		this.z = parseInt(strParts[2]);
		//this.Swap();
	}
	//VDFSerialize() { return this.toString(); }; //Swapped().toString(); };
	@_VDFSerialize() Serialize() { return new VDFNode(this.toString()); }
	toString = ()=> { return this.x + " " + this.y + " " + this.z; };

	NewX(xOrFunc) { return new VVector3(xOrFunc instanceof Function ? xOrFunc(this.x) : xOrFunc, this.y, this.z); }
	NewY(yOrFunc) { return new VVector3(this.x, yOrFunc instanceof Function ? yOrFunc(this.y) : yOrFunc, this.z); }
	NewZ(zOrFunc) { return new VVector3(this.x, this.y, zOrFunc instanceof Function ? zOrFunc(this.z) : zOrFunc); }

	Minus(arg1, arg2, arg3) {
		if (arg1 instanceof VVector3)
			return new VVector3(this.x - arg1.x, this.y - arg1.y, this.z - arg1.z);
		return new VVector3(this.x - arg1, this.y - arg2, this.z - arg3);
	}
	Plus(arg1, arg2, arg3) {
		if (arg1 instanceof VVector3)
			return new VVector3(this.x + arg1.x, this.y + arg1.y, this.z + arg1.z);
		return new VVector3(this.x + arg1, this.y + arg2, this.z + arg3);
	}
}

@Global
export class VRect {
	constructor(pos: Vector2i, size: Vector2i, y0IsBottom?: boolean);
	constructor(x: number, y: number, width: number, height: number, y0IsBottom?: boolean);
	constructor(...args) {
		let x: number, y: number, width: number, height: number, y0IsBottom: boolean;
		if (args.length == 2 || args.length == 3) [x, y, width, height, y0IsBottom] = [args[0].x, args[0].y, args[1].x, args[1].y, args[2]];
		else [x, y, width, height, y0IsBottom] = args;

	    this.x = x;
	    this.y = y;
	    this.width = width != null ? width : 0;
	    this.height = height != null ? height : 0;
	    this.y0IsBottom = y0IsBottom != null ? y0IsBottom : true;
	}

	x: number;
	y: number;
	width: number;
	height: number;
	y0IsBottom: boolean;

	get Left() { return this.x; }
	set Left(val) {
	    var oldRight = this.Right;
	    this.x = val;
	    this.Right = oldRight;
	}
	get Right() { return this.x + this.width; }
	set Right(val) { this.width = val - this.x; }
	get Bottom() { return this.y0IsBottom ? this.y : this.y + this.height; }
	set Bottom(val) { // assumes y0IsBottom
	    var oldTop = this.Top;
	    this.y = val;
	    this.Top = oldTop;
	}
	get Top() { return this.y0IsBottom ? this.y + this.height : this.y; }
	set Top(val) { // assumes y0IsBottom
	    this.height = val - this.y;
	}
	get Position() { return new Vector2i(this.x, this.y); }
	set Position(val: Vector2i) {
	    this.x = val.x;
	    this.y = val.y;
	}
	get Size() { return new Vector2i(this.width, this.height); }
	set Size(val: Vector2i) {
	    this.width = val.x;
	    this.height = val.y;
	}

	get Center() { return new Vector2i(this.x + (this.width / 2), this.y + (this.height / 2)); }

	@_VDFDeserialize() Deserialize(node) {
		var strParts = node.primitiveValue.split(" ");
		this.x = parseInt(strParts[0]);
		this.y = parseInt(strParts[1]);
		this.width = parseInt(strParts[2]);
		this.height = parseInt(strParts[3]);
	}
	@_VDFSerialize() Serialize() { return new VDFNode(this.toString()); }
	toString() { return this.x + " " + this.y + " " + this.width + " " + this.height; }

	Equals(other) {
		if (!(other instanceof VRect))
			return false;
		return this.toString() == other.toString();
	}

	NewX(valOrFunc) {
		return this.Clone().Init<VRect>({x: valOrFunc instanceof Function ? valOrFunc(this.x) : valOrFunc});
	}
	NewLeft(valOrFunc) {
		return this.Clone().Init<VRect>({Left: valOrFunc instanceof Function ? valOrFunc(this.Left) : valOrFunc});
	}
	NewRight(valOrFunc) {
		return this.Clone().Init<VRect>({Right: valOrFunc instanceof Function ? valOrFunc(this.Right) : valOrFunc});
	}
	NewY(valOrFunc) {
	    return this.Clone().Init<VRect>({y: valOrFunc instanceof Function ? valOrFunc(this.y) : valOrFunc});
	}
	NewBottom(valOrFunc) {
	    return this.Clone().Init<VRect>({Bottom: valOrFunc instanceof Function ? valOrFunc(this.Bottom) : valOrFunc});
	}
	NewTop(valOrFunc) {
	    return this.Clone().Init<VRect>({Top: valOrFunc instanceof Function ? valOrFunc(this.Top) : valOrFunc});
	}
	NewWidth(valOrFunc) {
	    return this.Clone().Init<VRect>({width: valOrFunc instanceof Function ? valOrFunc(this.width) : valOrFunc});
	}
	NewHeight(valOrFunc) {
	    return this.Clone().Init<VRect>({height: valOrFunc instanceof Function ? valOrFunc(this.height) : valOrFunc});
	}

	Grow(amountOnEachSide) {
	    return new VRect(this.x - amountOnEachSide, this.y - amountOnEachSide, this.width + (amountOnEachSide * 2), this.height + (amountOnEachSide * 2));
	}
	Encapsulating(rect: VRect) {
		var posX = Math.min(this.x, rect.x);
		var posY = Math.min(this.y, rect.y);
		return new VRect(posX, posY, Math.max(this.x + this.width, rect.x + rect.width) - posX, Math.max(this.y + this.height, rect.y + rect.height) - posY);
	}
	Encapsulate(rect: VRect) {
	    var oldRight = this.x + this.width;
	    var oldBottom = this.y + this.height;
		this.x = Math.min(this.x, rect.x);
		this.y = Math.min(this.y, rect.y);
	    this.width = Math.max(oldRight, rect.x + rect.width) - this.x;
	    this.height = Math.max(oldBottom, rect.y + rect.height) - this.y;
	}

	Intersects(other: VRect) {
	    return this.Right > other.x && this.x < other.Right && this.Top > other.Bottom && this.Bottom < other.Top;
	}

	Clone() {
	    return new VRect(this.x, this.y, this.width, this.height);
	}
}

@Global
export class VBounds {
	constructor(position, size) {
	    this.position = position;
		this.size = size;
	}
	position = null;
	size = null;

	@_VDFDeserialize() Deserialize(node) {
		var parts = node.primitiveValue.split("|");
		var posParts = parts[0].split(" ");
		this.position = new VVector3(parseFloat(posParts[0]), parseFloat(posParts[1]), parseFloat(posParts[2]));
		var sizeParts = parts[1].split(" ");
		this.size = new VVector3(parseFloat(sizeParts[0]), parseFloat(sizeParts[1]), parseFloat(sizeParts[2]));
	}
	@_VDFSerialize() Serialize() { return new VDFNode(this.toString()); }
	toString() { return this.position.x + " " + this.position.y + " " + this.position.z + "|" + this.size.x + " " + this.size.y + " " + this.size.z; }
}