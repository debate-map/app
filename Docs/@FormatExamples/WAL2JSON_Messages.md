Postgres logical-decoding message examples, when using the `wal2json` output plugin. Further examples can be seen here: https://github.com/eulerto/wal2json.

```
row addition
==========
{"change":[
    {
        "kind":"insert",
        "schema":"app",
        "table":"globalData",
        "columnnames":["extras","id"],
        "columntypes":["jsonb","text"],
        "columnvalues":[
            "{\"dbReadOnly\": false, \"dbReadOnly_message\": \"test1\"}",
            "main2"
        ]
    }
]}

row change
==========
{"change": [
    {
        "kind":"update",
        "schema":"app",
        "table":"globalData",
        "columnnames":["extras","id"],
        "columntypes":["jsonb","text"],
        "columnvalues":[
            "{\"dbReadOnly\": false, \"dbReadOnly_message\": \"test123\"}",
            "main"
        ],
        "oldkeys":{
            "keynames":["id"],
            "keytypes":["text"],
            "keyvalues":["main"]
        }
    }
]}

row deletion (regular mode)
==========
{"change":[
    {
        "kind":"delete",
        "schema":"app",
        "table":"globalData",
        "oldkeys":{
            "keynames":["id"],
            "keytypes":["text"],
            "keyvalues":["main2"]
        }
    }
]}
```