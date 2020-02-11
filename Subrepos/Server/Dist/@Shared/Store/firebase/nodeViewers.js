"use strict";
/* import { CachedTransform } from 'js-vextensions';
import {GetData} from 'vwebapp-framework';
import { ViewerSet } from './nodeViewers/@ViewerSet';

export function GetNodeViewerSet(nodeID: string) {
    if (nodeID == null) return null;
    return GetData('nodeViewers', nodeID) as ViewerSet;
}
export function GetNodeViewers(nodeID: string) {
    const viewerSet = GetNodeViewerSet(nodeID);
    return CachedTransform('GetNodeViewers', [nodeID], { viewerSet }, () => (viewerSet ? viewerSet.VKeys() : []));
} */ 
