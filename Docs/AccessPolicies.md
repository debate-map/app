# Access policies

## Overview

To be written. For now, see [the proposal](https://debatemap.app/feedback/proposals/sTggOxurTaGShH97_QGwBg) and [the class](https://github.com/debate-map/app/blob/master/Packages/common/Source/DB/accessPolicies/%40AccessPolicy.ts).

## Baking

To improve performance (and make it easier for the live-query system to detect permission changes), the access policies are not "used directly" for controlling access. Instead, an access-policy's settings are "baked" into special columns within the rows that they apply to.

Specifically, these two fields/columns:
* c_groupAccess
* c_userAccess

Order of application (strongest last): c_groupAccess.GROUPX_grant, c_groupAccess.GROUPX_deny, c_userAccess.USERX_grant, c_userAccess.USERX_deny

This "baking" process occurs:
* When a row is first created.
* When an access-policy is modified. (the server searches for all rows affected, updating their baked columns)

## Tables using access-policies

The below is the list of tables where row-access is controlled by access-policies:
* medias
* maps
* mapNodeEdits (uses access-policy of node)
* nodes
* nodeRatings
* nodeRevisions
* nodeChildLinks (uses access-policy of parent and child, denying if either denies)
* nodeTags (uses access-policy of referenced nodes, denying if any denies)

## Other access restrictions

While access-policies are the main way that row access is controlled, there are some others as well:
* userHiddens: Each user can only access their own row. (other than the server itself of course; it can access anything for its internal use)