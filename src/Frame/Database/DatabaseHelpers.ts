let {dbRootVersion} = require("../../../config/DBVersion");
export function DBPath(path: string) {
	return `v${dbRootVersion}/` + path;
}

//interface Object { Ref: ()=>firebase.Database; }
declare global { class FirebaseDatabase_Extensions {
	Ref: (path?: string)=>firebase.DatabaseReference;
}}
Object.prototype._AddFunction_Inline = function Ref(path = "") {
	let finalPath = DBPath(path);
	return this.ref(finalPath);
}