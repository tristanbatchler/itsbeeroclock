#!/usr/bin/env python3
"""Finds websites for breweries known only by name, by trying likely domains.

Usage: discover.py <names.json> <out.json> [known_roots.json]

A domain counts only if its page title or heading names the brewery, so a parked
domain or a namesake elsewhere doesn't get crawled as that brewery.
"""
import concurrent.futures as cf
import json
import re
import socket
import sys

import build
from crawl import get

SUFFIXES = ["", "brewing", "brewery", "beer", "brewingco", "brewingcompany", "brew", "beerco", "brewers", "ales"]
TLDS = [".com.au", ".beer", ".com", ".au", ".co"]


def stem(name):
    return re.sub(r"[^a-z0-9]", "", build.brewery_key(name))


def identifies(page, name):
    head = " ".join(re.findall(r"(?is)<title>(.*?)</title>|<h1[^>]*>(.*?)</h1>", page[:300000]).__iter__().__next__()) if re.search(r"(?is)<title>|<h1", page[:300000]) else ""
    words = [w for w in build.brewery_key(name).split() if len(w) > 2]
    text = re.sub(r"[^a-z0-9 ]", " ", build.clean_text(head).lower())
    # The name alone isn't enough: district.com.au is a furniture shop.
    return bool(words) and all(w in text for w in words) and bool(re.search(r"(?i)\bbrew|\bbeers?\b", page[:300000]))


def resolve(name):
    s = stem(name)
    if len(s) < 3:
        return None
    for suffix in SUFFIXES:
        for tld in TLDS:
            host = s + suffix + tld
            for candidate in (host, "www." + host):
                if build.site_blocked("https://" + candidate):
                    continue
                try:
                    socket.gethostbyname(candidate)
                except OSError:
                    continue
                try:
                    page = get("https://" + candidate + "/", 12).decode("utf8", "ignore")
                except Exception:
                    continue
                if identifies(page, name):
                    return {"name": name, "url": "https://" + candidate + "/"}
    return None


def main():
    names = json.load(open(sys.argv[1]))
    with cf.ThreadPoolExecutor(16) as ex:
        found = [r for r in ex.map(resolve, names) if r]
    json.dump(found, open(sys.argv[2], "w"), indent=0, ensure_ascii=False)
    print(f"found {len(found)} of {len(names)}")
    print("not found:", [n for n in names if n not in {f['name'] for f in found}])


if __name__ == "__main__":
    main()
