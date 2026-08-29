#!/usr/bin/env python3
from pathlib import Path
import http.server,socketserver,threading,urllib.request,time,os,json
ROOT=Path(__file__).resolve().parents[1]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def main():
    old=os.getcwd();os.chdir(ROOT)
    try:
        with socketserver.TCPServer(('127.0.0.1',0),Q) as srv:
            port=srv.server_address[1];th=threading.Thread(target=srv.serve_forever,daemon=True);th.start();time.sleep(.05)
            checks={
                '/':['AI systems,','site.webmanifest','Skip to main content'],
                '/about/':['We build systems that can be explored','og:description'],
                '/contact/':['Bring the problem, constraints','annapurnaagenticsolutions@zohomail.in'],
                '/explore.html':['Six worlds. One connected field.','mobile-navigation'],
                '/lab.html':['Change an input. Watch the system reorganize.'],
                '/evidence.html':['Marketing claims should','Evidence &amp; history'],
                '/data/public-links.json':['post_publish_http_gate_required','verified_public'],
                '/site.webmanifest':['Annapurna Agentic Solutions','assets/favicon.svg'],
                '/assets/favicon.svg':['<svg','linearGradient'],
                '/llms.txt':['Trust policy','Evidence page'],
                '/sitemap.xml':['<lastmod>2026-08-29</lastmod>'],
                '/robots.txt':['Sitemap: https://annapurnaagenticsolutions.github.io/annapurna-portal/sitemap.xml'],
            }
            for route,markers in checks.items():
                with urllib.request.urlopen(f'http://127.0.0.1:{port}{route}',timeout=3) as r:
                    body=r.read().decode('utf-8');assert r.status==200,(route,r.status)
                    for marker in markers:assert marker in body,(route,marker)
            srv.shutdown();th.join(timeout=2)
    finally:os.chdir(old)
    print('PASS v4.3 local HTTP production surface')
    return 0
if __name__=='__main__':raise SystemExit(main())
