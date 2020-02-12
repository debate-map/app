# Note: Backups with pretty-printing are about twice as large as "flat" ones. (eg. 28mb vs 13mb)

$FileName = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd_HH-mm-ss") + ".json"

firestore-export --accountCredentials ../../../Others/Keys/AdminSDK_Key1.json --backupFile ../../../@Backups/Database/$FileName --prettyPrint