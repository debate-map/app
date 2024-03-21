#!env python3
import os
import sys
from subprocess import run
from json import dumps

CONTEXT = os.environ['CONTEXT'] or 'dm-local'
vname = sys.argv[1]

patch = dumps(dict(spec=dict(claimRef=None)))
run(["kubectl", "patch", "persistentVolume", vname, "-p", patch, "--context", CONTEXT], check=True)
r = run(["kubectl", "get", "persistentVolume", vname, "-o", "yaml", "--context", CONTEXT], capture_output=True, text=True, check=True)
print(r.stdout)
