interface Element { GetParents(topDown?: boolean): HTMLElement[]; }
Element.prototype._AddItem("GetParents", function(this: HTMLElement, topDown = false) {
	let result = [] as HTMLElement[];
	let currentParent = this.parentElement;
	while (currentParent) {
		result.push(currentParent);
		currentParent = currentParent.parentElement;
	}
	if (topDown) result.reverse();
	return result;
});
interface Element { GetSelfAndParents(topDown?: boolean): HTMLElement[]; }
Element.prototype._AddItem("GetSelfAndParents", function(this: HTMLElement, topDown = false) {
	let result = this.GetParents(topDown);
	return topDown ? result.concat([this]) : [this].concat(result);
});

interface Element { $(queryStr: string): HTMLElement[]; }
Element.prototype._AddItem("$", function(this: Element, queryStr: string): HTMLElement[] {
	return this.querySelectorAll(queryStr).ToArray();
});