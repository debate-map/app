import { Command } from "mobx-firelink";
import { MapNode } from "../Store/firebase/nodes/@MapNode";
import { MapNodeRevision } from "../Store/firebase/nodes/@MapNodeRevision";
/** Returned terms are all lowercase. */
export declare function GetSearchTerms(str: string): string[];
/** Returned terms are all lowercase. */
export declare function GetSearchTerms_Advanced(str: string, separateTermsWithWildcard?: boolean): {
    wholeTerms: string[];
    partialTerms: string[];
};
export declare class AddNodeRevision extends Command<{
    mapID: string;
    revision: MapNodeRevision;
}, number> {
    revisionID: string;
    node_oldData: MapNode;
    Validate(): void;
    GetDBUpdates(): {};
}
