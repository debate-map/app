import "mobx";
import { Firelink } from "mobx-firelink";
import { RootStoreShape } from "mobx-firelink/Dist/UserTypes";
import { FirebaseDBShape } from "./Store/firebase";
declare module "mobx-firelink/Dist/UserTypes" {
    interface DBShape extends FirebaseDBShape {
    }
}
export declare const fire: Firelink<RootStoreShape, FirebaseDBShape>;
export declare function InitFirelink(rootPathInDB: string, rootStore: any): void;
