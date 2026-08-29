#!/usr/bin/env python3
from pathlib import Path
import http.server,socketserver,threading,urllib.request,time
ROOT=Path(__file__).resolve().parents[1]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def main():
    import os
    old=os.getcwd(); os.chdir(ROOT)
    try:
        with socketserver.TCPServer(('127.0.0.1',0),Q) as srv:
            port=srv.server_address[1]; th=threading.Thread(target=srv.serve_forever,daemon=True); th.start(); time.sleep(.05)
            checks={
                '/':['AI systems,','Explore the ecosystem'],
                '/about/':['We build systems that can be explored','See the live surface. Inspect the source.'],
                '/contact/':['Bring the problem, constraints','annapurnaagenticsolutions@zohomail.in'],
                '/explore.html':['Six worlds. One connected field.'],
                '/lab.html':['Change an input. Watch the system reorganize.'],
                '/evidence.html':['Marketing claims should','evidence path'],
                '/data/public-links.json':['annapurnaagenticsolutions','open-enterprise-agentops-mesh'],
            }
            for route,markers in checks.items():
                with urllib.request.urlopen(f'http://127.0.0.1:{port}{route}',timeout=3) as r:
                    body=r.read().decode('utf-8'); assert r.status==200
                    for marker in markers: assert marker in body,(route,marker)
            srv.shutdown(); th.join(timeout=2)
    finally: os.chdir(old)
    print('PASS v4.2 local HTTP surface')
    return 0
if __name__=='__main__': raise SystemExit(main())
