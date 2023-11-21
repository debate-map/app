Postgres logical-decoding message examples, when using the built-in `pgoutput` output plugin.

```
Begin(BeginBody { final_lsn: 2164309296, timestamp: 753897556779557, xid: 826 })

Relation(RelationBody {
	rel_id: 17007,
	namespace: b"app",
	name: b"nodeRevisions",
	replica_identity: Default,
	columns: [
		Column { flags: 1, name: b"id", type_id: 25, type_modifier: -1 },
		Column { flags: 0, name: b"node", type_id: 25, type_modifier: -1 },
		Column { flags: 0, name: b"creator", type_id: 25, type_modifier: -1 },
		Column { flags: 0, name: b"createdAt", type_id: 20, type_modifier: -1 },
		Column { flags: 0, name: b"phrasing", type_id: 3802, type_modifier: -1 },
		Column { flags: 0, name: b"displayDetails", type_id: 3802, type_modifier: -1 },
		Column { flags: 0, name: b"attachments", type_id: 3802, type_modifier: -1 },
		Column { flags: 0, name: b"replacedBy", type_id: 25, type_modifier: -1 },
		Column { flags: 0, name: b"c_accessPolicyTargets", type_id: 1009, type_modifier: -1 }
	]
})

InsertBody {
	rel_id: 17007,
	tuple: Tuple([
		Text(b"2vwuTwDjTvG-bUMprKooaw"),
		Text(b"WpDD_48nTyeoAXjSY2EuCQ"),
		Text(b"NIGSZFmwRkyB3J7KYzsMtQ"),
		Text(b"1700582356697"),
		Text(b"{\"note\": null, \"terms\": [], \"text_base\": \"Test123\", \"text_negation\": null, \"text_question\": null, \"text_narrative\": null}"),
		Null,
		Text(b"[]"),
		Null,
		Text(b"{cPxSgc5rT0SIdU23rVhx6Q:nodes}")
	])
}

UpdateBody {
	rel_id: 17007, old_tuple: None, key_tuple: None,
	new_tuple: Tuple([
		Text(b"VW3XQbvqRLaAtCIw2CB2Mw"),
		Text(b"WpDD_48nTyeoAXjSY2EuCQ"),
		Text(b"NIGSZFmwRkyB3J7KYzsMtQ"),
		Text(b"1700581732800"),
		Text(b"{\"note\": null, \"terms\": [], \"text_base\": \"Test12\", \"text_negation\": null, \"text_question\": null, \"text_narrative\": null}"),
		Null,
		Text(b"[]"),
		Text(b"2vwuTwDjTvG-bUMprKooaw"),
		Text(b"{cPxSgc5rT0SIdU23rVhx6Q:nodes}")
	])
}

DeleteBody {
	rel_id: 17007, old_tuple: None,
	key_tuple: Some(Tuple([
		Text(b"TkMgvzJVQBu8ePWEQl4Ugg"),
		Null,
		Null,
		Null,
		Null,
		Null,
		Null,
		Null,
		Null
	]))
}
```