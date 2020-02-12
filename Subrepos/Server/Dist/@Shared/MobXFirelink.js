import "mobx"; // import mobx before we declare the module below, otherwise vscode auto-importer gets confused at path to mobx
import { Firelink, SetDefaultFireOptions } from "mobx-firelink";
export const fire = new Firelink();
//store.firelink = fire;
SetDefaultFireOptions({ fire });
// console.log('Default fire options set:', { fire });
//OnPopulated(()=>fire.InitSubs());
export function InitFirelink(rootPathInDB, rootStore) {
    //const linkRootPath = `versions/v${dbVersion}-${DB_SHORT}`;
    fire.Initialize({ rootPathInDB, rootStore });
}
// modify some default options
// StoreAccessorOptions.default.cache_keepAlive = true;
// start auto-runs after store+firelink are created
//require("./Utils/AutoRuns");
// mobx debug helper
// ==========
/* window['mobxDevtools_processChange'] = (change) => {
    // change.rootStoreData = store;
    /* change.mapViews = store.main.mapViews['raw'];
    change.mapViews._sendFull = true; *#/
    change.mapViews = { _serialize() {
        // return store.main.mapViews['raw'];
        return Clone(store.main.mapViews['raw']);
    } };
}; */ 
