$FileName = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd_HH-mm-ss") + ".json"

firestore-export --accountCredentials ../../../Others/Keys/AdminSDK_Key1.json --backupFile ../../../@Backups/Database/$FileName