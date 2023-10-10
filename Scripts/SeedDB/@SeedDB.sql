-- NOTE: DO NOT MANUALLY MODIFY THIS FILE, AS IT IS AUTO-GENERATED. (modify GenerateSeedDB.ts instead)

\set ON_ERROR_STOP 1
begin;

SET CONSTRAINTS ALL DEFERRED;

insert into "globalData" ("extras", "id") values ('{"dbReadOnly":false}', 'main');
insert into "users" ("displayName", "edits", "id", "joinDate", "lastEditAt", "permissionGroups", "photoURL") values ('[system]', 0, 'DM_SYSTEM_000000000001', 1673923730381, null, '{"basic":true,"verified":true,"mod":true,"admin":true}', null);
insert into "userHiddens" ("addToStream", "email", "extras", "id", "providerData") values (false, 'debatemap@gmail.com', '{}', 'DM_SYSTEM_000000000001', '[]');
insert into "accessPolicies" ("createdAt", "creator", "id", "name", "permissions", "permissions_userExtends") values (1673923730381, 'DM_SYSTEM_000000000001', 'cPxSgc5rT0SIdU23rVhx6Q', 'Public, ungoverned (standard)',
	'{
		"terms":{"access":true,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}},
		"medias":{"access":true,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}},
		"maps":{"access":true,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}},
		"nodes":{"access":true,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":0,"minApprovalPercent":0},"addPhrasing":{"minApprovals":0,"minApprovalPercent":0},"vote":{"minApprovals":0,"minApprovalPercent":0}},
		"nodeRatings":{"access":true,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}},
		"others":{"access":true,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}}
	}', '{}');
insert into "accessPolicies" ("createdAt", "creator", "id", "name", "permissions", "permissions_userExtends") values (1673923730382, 'DM_SYSTEM_000000000001', 'vsv5nIQDTki1St-isqxkEA', 'Public, governed (standard)',
	'{
		"terms":{"access":true,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}},
		"medias":{"access":true,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}},
		"maps":{"access":true,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}},
		"nodes":{"access":true,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":0,"minApprovalPercent":0}},
		"nodeRatings":{"access":true,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}},
		"others":{"access":true,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}}
	}', '{}');
insert into "accessPolicies" ("createdAt", "creator", "id", "name", "permissions", "permissions_userExtends") values (1673923730382, 'DM_SYSTEM_000000000001', 'luw6TeecS4SQ_lM6MjXPDg', 'Private, governed (standard)',
	'{
		"terms":{"access":false,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}},
		"medias":{"access":false,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}},
		"maps":{"access":false,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}},
		"nodes":{"access":false,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}},
		"nodeRatings":{"access":false,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}},
		"others":{"access":false,"modify":{"minApprovals":-1,"minApprovalPercent":-1},"delete":{"minApprovals":-1,"minApprovalPercent":-1},"addChild":{"minApprovals":-1,"minApprovalPercent":-1},"addPhrasing":{"minApprovals":-1,"minApprovalPercent":-1},"vote":{"minApprovals":-1,"minApprovalPercent":-1}}
	}', '{}');
insert into "maps" ("accessPolicy", "createdAt", "creator", "defaultExpandDepth", "editedAt", "editors", "edits", "extras", "id", "name", "rootNode") values ('vsv5nIQDTki1St-isqxkEA', 1673923730383, 'DM_SYSTEM_000000000001', 3, 1673923730383, '{}', 0, '{}', 'GLOBAL_MAP_00000000001', 'Global', 'GLOBAL_ROOT_0000000001');
insert into "nodes" ("accessPolicy", "c_currentRevision", "createdAt", "creator", "extras", "id", "rootNodeForMap", "type") values ('vsv5nIQDTki1St-isqxkEA', '9s0HXDo6Q6m6HfIBOz3FgA', 1673923730383, 'DM_SYSTEM_000000000001', '{}', 'GLOBAL_ROOT_0000000001', 'GLOBAL_MAP_00000000001', 'category');
insert into "nodeRevisions" ("attachments", "createdAt", "creator", "id", "node", "phrasing") values ('[]', 1673923730383, 'DM_SYSTEM_000000000001', '9s0HXDo6Q6m6HfIBOz3FgA', 'GLOBAL_ROOT_0000000001', '{"text_base":"Root","terms":[]}');

commit;