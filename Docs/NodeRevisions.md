# Node revisions

## Overview

There are a few tables involved:
* [nodes](https://github.com/debate-map/app/tree/master/Packages/common/Source/DB/nodes/@MapNode.ts): These entries never change; they hold a node's static properties like its type, original creator, etc.
* [nodeRevisions](https://github.com/debate-map/app/tree/master/Packages/common/Source/DB/nodeRevisions/@MapNodeRevision.ts): These entries represent the history of "accepted drafts" for a node; the latest entries represents the "current state" of the node's details. (title, tags, etc.)
* [nodeDrafts](https://github.com/debate-map/app/tree/master/Packages/common/Source/DB/nodeDrafts/@MapNodeDraft.ts): These entries contain "proposed changes" for a node's details, like changing its title or adding a tag. Generally, these drafts will only change one or two properties at a time, in order to maximize the chance they'll be accepted.

## Acceptance process (planned)

The acceptance process for a draft depends a lot on the [reputation](https://github.com/debate-map/app/tree/master/Docs/UserReputation.md) of the users involved.

A draft is accepted (ie. added as the current "official revision") if:
TODO

A draft is rejected (ie. removed from the "pending drafts" list) if:
TODO

## Acceptance process (current)

Since the reputation system is not ready yet, we use a simpler acceptance/rejection process at the moment.

A draft is accepted (ie. added as the current "official revision") if:
* [draft creator is node creator] OR [draft creator is mod]

A draft is rejected (ie. removed from the "pending drafts" list) if:
* n/a (draft system not yet implemented)

## Todo list (old; rewrite and add to the above)

```
Steps:
1) [DONE] ms you can add/edit/delete phrasings, with natural phrasings having extra "description" field
2) ms you can vote on the quality of phrasings
3) ms mods can mark phrasings as "spam"/"not spam"
	[Later on, people will have way of contesting this, forcing their phrasing to stay visible. Super-mods/admins can override this though -- though this also sends it to neutrality portal.]
4) ms mods can mark phrasings as "superseded by..."/"not superseded" (its votes are then considered votes for the new version as well -- this allows fixing of typos and such)
	[Later on, people will have way of contesting this, forcing their phrasing to stay a distinct entry. Super-mods/admins can override this though -- though this also sends it to neutrality portal.]
5) ms a phrasing will have its editing/deleting disabled, once a certain number of people have voted/invested in it
6) ms highest-rated phrasing (that's evaluated as not-spam and not-superseded based on mod markings) has some way of automatically becoming the new node text/revision (some threshold + wait period)
```