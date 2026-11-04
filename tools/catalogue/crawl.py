#!/usr/bin/env python3
"""Polite crawl of breweries' public store feeds.

Usage: crawl.py <crawl_dir> <breweries.json>

Honours robots.txt and Retry-After, and gives up on a site that refuses.
"""
from build import site_blocked
import json,sys,time,re,os,urllib.request,urllib.parse,urllib.error,concurrent.futures as cf,collections
UA='itsbeeroclock-catalogue-research/0.1 (batchlertristan@gmail.com)'
D=None
def get(u,t=20):
    r=urllib.request.Request(u,headers={'User-Agent':UA,'Accept':'application/json,*/*'})
    with urllib.request.urlopen(r,timeout=t) as f: return f.read(8000000)
def rules(root):
    try: txt=get(root+'/robots.txt',10).decode('utf8','ignore')
    except Exception: return [],0
    groups=[];cur=None;last=False
    for l in txt.splitlines():
        l=l.split('#')[0].strip()
        if ':' not in l: continue
        k,v=[x.strip() for x in l.split(':',1)];k=k.lower()
        if k=='user-agent':
            if not last: cur={'ua':[],'r':[],'d':0};groups.append(cur)
            cur['ua'].append(v.lower());last=True
        elif cur is not None:
            last=False
            if k in('allow','disallow') and v: cur['r'].append((k,v))
            elif k=='crawl-delay':
                try: cur['d']=float(v)
                except: pass
    g=[x for x in groups if '*' in x['ua'] or 'itsbeeroclock-catalogue-research' in x['ua']]
    return [r for x in g for r in x['r']],max([x['d'] for x in g] or [0])
def allowed(rs,path):
    best=('allow',-1)
    for k,v in rs:
        rx=re.escape(v).replace(r'\*','.*'); rx=rx[:-2]+'$' if rx.endswith(r'\$') else rx
        if re.match(rx,path) and len(v)>best[1]: best=(k,len(v))
    return best[0]=='allow'
def fetch(u):
    for i in range(4):
        try: return get(u)
        except urllib.error.HTTPError as e:
            if e.code==429 and i<3:
                try: w=float(e.headers.get('Retry-After') or 0)
                except: w=0
                time.sleep(min(max(w,20*(i+1)),120)); continue
            raise
def crawl(b):
    u=b.get('url');r={'name':b['name'],'url':u,'kind':'none','n':0}
    if not u or site_blocked(u): return r
    s=urllib.parse.urlsplit(u);root=f'{s.scheme}://{s.netloc}';r['root']=root
    try:
        rs,delay=rules(root);delay=min(max(delay,1.5),15)
        items=[]
        if allowed(rs,'/products.json?limit=250&page=1'):
            try:
                p=1
                while p<=40:
                    d=json.loads(fetch(f'{root}/products.json?limit=250&page={p}')).get('products',[])
                    if not d: break
                    items+=d;p+=1;time.sleep(delay)
                if items: r['kind']='shopify'
            except json.JSONDecodeError: pass
            except urllib.error.HTTPError as e: r['err']=e.code
        else: r['err']='robots'
        if not items and allowed(rs,'/wp-json/wc/store/v1/products?per_page=100&page=1'):
            try:
                p=1
                while p<=40:
                    d=json.loads(fetch(f'{root}/wp-json/wc/store/v1/products?per_page=100&page={p}'))
                    if not d: break
                    items+=d;p+=1;time.sleep(delay)
                if items: r['kind']='woo'
            except urllib.error.HTTPError as e:
                if e.code==400 and items: r['kind']='woo'
                else: r['err']=e.code
            except json.JSONDecodeError: pass
        r['n']=len(items)
        if items: json.dump(items,open(f"{D}/raw/{re.sub(r'[^a-z0-9]+','-',s.netloc.lower())}.json",'w'))
    except Exception as e: r['err']=type(e).__name__
    print(r['kind'],r['n'],r['name'],r.get('err',''),flush=True)
    return r
def main():
    global D
    D=sys.argv[1]; os.makedirs(D+'/raw',exist_ok=True)
    bs=json.load(open(sys.argv[2]))
    seen=set();q=[]
    for b in bs:
        h=urllib.parse.urlsplit(b.get('url') or '').netloc
        if h and h in seen: continue
        seen.add(h);q.append(b)
    with cf.ThreadPoolExecutor(3) as ex: res=list(ex.map(crawl,q))
    json.dump(res,open(D+'/crawl.json','w'),indent=0)
    print('DONE',collections.Counter(x['kind'] for x in res),sum(x['n'] for x in res))

if __name__=='__main__':
    main()
