import { AssertValidate } from "mobx-firelink";
export function ValidateDBData(data) {
    function ValidateCollection(collection, itemType) {
        (collection || {}).VValues().forEach(entry => {
            AssertValidate(itemType, entry, `${itemType} invalid`);
        });
    }
    ValidateCollection(data.images, "Image");
    ValidateCollection(data.layers, "Layer");
    ValidateCollection(data.maps, "Map");
    ValidateCollection(data.nodes, "MapNode");
    ValidateCollection(data.nodePhrasings, "MapNodePhrasing");
    ValidateCollection(data.nodeRevisions, "MapNodeRevision");
    ValidateCollection(data.terms, "Term");
    ValidateCollection(data.timelines, "Timeline");
    ValidateCollection(data.timelineSteps, "TimelineStep");
}
