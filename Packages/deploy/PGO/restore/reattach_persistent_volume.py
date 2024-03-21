#!env python3
import os
from subprocess import run
from time import sleep
from json import loads, dumps

CONTEXT = os.environ['CONTEXT'] or 'dm-local'

r = run(["kubectl", "get", "--namespace", "postgres-operator", "persistentVolumeClaim", "debate-map-repo1", "-o", "json", "--context", CONTEXT], capture_output=True, text=True, check=True)
vci = loads(r.stdout)
uid = vci['metadata']['uid']
rversion = vci['metadata']['resourceVersion']
vname = vci['spec']['volumeName']
patch = dumps(dict(spec=dict(claimRef=dict(uid=uid, resourceVersion=str(rversion)))))
run(["kubectl", "patch", "persistentVolume", vname, "-p", patch, "--context", CONTEXT], check=True)
# TODO: replace with
# kubectl wait --namespace postgres-operator --for jsonpath='{.status.phase}'=Bound persistentvolumeclaim/debate-map-repo1
while True:
  r = run(["kubectl", "get", "--namespace", "postgres-operator", "persistentVolumeClaim", "debate-map-repo1", "-o", "json", "--context", CONTEXT], capture_output=True, text=True, check=True)
  vci = loads(r.stdout)
  if vci['status']['phase'] == 'Bound':
    break
  sleep(1)

r = run(["kubectl", "get", "persistentVolume", vname, "-o", "yaml", "--context", CONTEXT], capture_output=True, text=True, check=True)
print(r.stdout)
