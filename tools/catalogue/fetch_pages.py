#!/usr/bin/env python3
"""Second crawl pass: for beers whose feed states no ABV, read the product page.

Usage: fetch_pages.py <crawl_dir>

Keeps an ABV only when the page states exactly one, because product pages also
show related beers. Writes <crawl_dir>/pages/<store>.json mapping handle to "ABV n%".
"""
import concurrent.futures as cf
import html
import json
import os
import re
import sys
import time

import build
from crawl import allowed, fetch, rules


def page_abv(page):
    text = re.sub(r"(?is)<(script|style).*?</\1>", " ", page)
    abvs = build.distinct_abv(build.clean_text(text))
    return abvs[0] if len(abvs) == 1 else None


def scan(crawl_dir, store):
    key = re.sub(r"[^a-z0-9]+", "-", store["root"].split("//")[1].lower())
    if build.site_blocked(store["root"]):
        return 0, 0
    raw = os.path.join(crawl_dir, "raw", key + ".json")
    out_path = os.path.join(crawl_dir, "pages", key + ".json")
    if not os.path.exists(raw) or os.path.exists(out_path):
        return 0, 0
    to_listing = build.woo_listing if store["kind"] == "woo" else build.shopify_listing
    prefix = "/product/" if store["kind"] == "woo" else "/products/"
    rs, delay = rules(store["root"])
    delay = min(max(delay, 1.5), 15)
    found, tried = {}, 0
    for listing in map(to_listing, json.load(open(raw))):
        if build.classify(listing) or build.listing_abvs(listing, {}) or not listing["handle"]:
            continue
        path = prefix + listing["handle"]
        if not allowed(rs, path):
            continue
        tried += 1
        try:
            abv = page_abv(fetch(store["root"] + path).decode("utf8", "ignore"))
        except Exception:
            abv = None
        if abv is not None:
            found[listing["handle"]] = f"ABV {abv}%"
        time.sleep(delay)
    with open(out_path, "w") as f:
        json.dump(found, f)
    print(store["name"], tried, len(found), flush=True)
    return tried, len(found)


def main():
    crawl_dir = sys.argv[1]
    os.makedirs(os.path.join(crawl_dir, "pages"), exist_ok=True)
    stores = [s for s in json.load(open(os.path.join(crawl_dir, "crawl.json"))) if s.get("root") and s.get("kind") in ("shopify", "woo")]
    with cf.ThreadPoolExecutor(6) as ex:
        results = list(ex.map(lambda s: scan(crawl_dir, s), stores))
    print("DONE tried", sum(r[0] for r in results), "found", sum(r[1] for r in results))


if __name__ == "__main__":
    main()
