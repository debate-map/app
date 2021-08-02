# Access policies

## Overview

To be written. For now, see [the proposal](https://debatemap.app/feedback/proposals/sTggOxurTaGShH97_QGwBg) and [the class](https://github.com/debate-map/app/blob/master/Packages/common/Source/DB/accessPolicies/%40AccessPolicy.ts).

Some brief notes:
* The access restrictions do not apply to the server itself, of course; it can access anything for its internal use. However, care should be taken so that that "internal use" doesn't "leak" sensitive information to the caller. (For example, let's say someone searches for all nodes with a given substring in its title, and the server omits an entry due to lacking permissions: if the paging system were to then be "missing" a slot in the first page, this would "leak" that someone made a node with that substring but hid the current user from accessing it [with the creator possibly identifiable based on context]. To resolve this, the server should make sure to not leave "gaps" after entry-removal.)
* The "access policy" system is applied using PostgreSQL row-level-security (RLS) [well not yet, but it will be]. However, this makes optimization (ie. batching) of live-queries more difficult; because of that, the access-policy system is kept simple for access-restrictions, so that the set of variable-combinations is small enough to still make "pools" that can batch among themselves. (users who are specifically included/excluded by a given access-policy do not batch with anyone; this should be okay, since this will apply to a very small percentage of users)

## Baking

To improve performance (and make it easier for the live-query system to detect permission changes), the access policies are not "used directly" for controlling access. Instead, an access-policy's settings are "baked into" special columns within the rows that they apply to.

Specifically, this field/column:
* c_accessFlags

Order of application (strongest [ie. first checked for] is last): c_accessFlags.base_grant, c_accessFlags.base_deny, c_accessFlags.user_grant_USERX, c_accessFlags.user_deny_USERX

This "baking" process occurs:
* When a row is first created.
* When an access-policy is modified. (the server searches for all rows affected, updating their baked columns)

## Tables using access-policies

Tables where row-access is controlled (at least in part) by own-field access-policies (`row -> refToAccessPolicy [check access through c_accessFlags cache-field]`):
* terms
* medias
* maps
* nodes
* nodeRatings (must pass own policy + node's policy)

Tables where row-access is based on other factors (eg. using other-table access-policies: `row -> refToOtherTableRow -> otherTableRow [verify by attempting other-table-row access]`):
* commandRuns (must have "public_base:true" + must pass policy of associated map/node/etc.)
* mapNodeEdits (must pass node's policy)
* nodeChildLinks (must pass policy of parent and child, denying if either denies)
* nodePhrasings (must pass node's policy)
* nodeRevisions (must pass node's policy)
* nodeTags (must pass policies of all referenced nodes)
* userHiddens: (each user can only access their own row)