#!/usr/bin/env python3
"""Reads beers off brewery sites that only show them once JavaScript has run.

Usage: render_sites.py <targets.json> <out_dir>

Same targets, output and politeness as scan_sites.py, but pages load in headless
Chromium, still identified by our user agent and limited by robots.txt. Needs the
playwright package. Finished sites with beers are skipped, so it can be re-run.
"""
import concurrent.futures as cf
import json
import os
import re
import sys
import time
import urllib.parse

from playwright.sync_api import sync_playwright

import build
from crawl import UA, allowed, get, rules
from scan_sites import MAX_PAGES, PAGE, beers_on_page, image_of

MAX_RENDERED = 40
PRODUCT = re.compile(r"(?i)/product/|/products/|/shop|/beer|/our-")


def sitemap_urls(root):
    urls = []
    for s in (root + "/sitemap.xml", root + "/sitemap_index.xml"):
        try:
            x = get(s, 15).decode("utf8", "ignore")
        except Exception:
            continue
        for u in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", x):
            if not re.search(r"\.xml(\?|$)", u) and PAGE.search(urllib.parse.urlsplit(u).path):
                urls.append(u)
    return urls[:MAX_PAGES]


def scan(target, out_dir):
    root = target["root"]
    out = os.path.join(out_dir, re.sub(r"[^a-z0-9]+", "-", root.split("//")[1].lower()) + ".json")
    if build.site_blocked(root):
        return 0
    if os.path.exists(out) and json.load(open(out))["beers"]:
        return 0
    result = {"name": target["name"], "root": root, "beers": [], "pages": 0, "rendered": True}
    try:
        rs, delay = rules(root)
        delay = min(max(delay, 1.5), 15)
        host = urllib.parse.urlsplit(root).netloc.removeprefix("www.")
        queue = list(dict.fromkeys([root + "/"] + sitemap_urls(root)))
        seen, found = set(), {}
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_context(user_agent=UA).new_page()
            page.route("**/*", lambda r: r.abort() if r.request.resource_type in ("image", "media", "font") else r.continue_())
            while queue and result["pages"] < MAX_RENDERED:
                u = queue.pop(0).split("#")[0]
                path = urllib.parse.urlsplit(u).path or "/"
                if u in seen or not allowed(rs, path):
                    continue
                seen.add(u)
                try:
                    page.goto(u, wait_until="load", timeout=25000)
                    page.wait_for_timeout(2500)
                    rendered = page.content()
                except Exception:
                    continue
                result["pages"] += 1
                pairs = beers_on_page(rendered)
                for name, abv in pairs:
                    k = build.key(name)
                    if k in found and found[k]["abv"] != abv:
                        found[k]["conflict"] = True
                    found.setdefault(k, {"name": name, "abv": abv, "image": image_of(rendered) if len(pairs) == 1 else "", "url": u})
                for link in re.findall(r'href="([^"#]+)"', rendered):
                    full = urllib.parse.urljoin(u, link)
                    if urllib.parse.urlsplit(full).netloc.removeprefix("www.") == host and PRODUCT.search(urllib.parse.urlsplit(full).path):
                        queue.append(full)
                time.sleep(delay)
            browser.close()
        result["beers"] = [b for b in found.values() if not b.get("conflict")]
    except Exception as e:
        result["error"] = type(e).__name__
    with open(out, "w") as f:
        json.dump(result, f, ensure_ascii=False)
    print(target["name"], result["pages"], len(result["beers"]), flush=True)
    return len(result["beers"])


def main():
    os.makedirs(sys.argv[2], exist_ok=True)
    targets = json.load(open(sys.argv[1]))
    with cf.ProcessPoolExecutor(4) as ex:
        total = sum(ex.map(scan, targets, [sys.argv[2]] * len(targets)))
    print("DONE", total)


if __name__ == "__main__":
    main()
