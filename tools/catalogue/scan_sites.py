#!/usr/bin/env python3
"""Reads beers off brewery sites with no shop feed, by way of their sitemaps.

Usage: scan_sites.py <targets.json> <out_dir>

targets.json lists {"name", "root"}. A beer is a heading followed by exactly one ABV
before the next heading, which handles both one-beer pages and pages listing a range.
Honours robots.txt. Finished sites are skipped, so it can be re-run.
"""
import concurrent.futures as cf
import html
import json
import os
import re
import sys
import time
import urllib.parse

import build
from crawl import allowed, get, rules

PAGE = re.compile(r"(?i)beer|brew|product|lager|ale\b|ales|range|tap|menu|shop|stout|ipa|core|drink|our-|seasonal|limited")
TOKEN = re.compile(r"(?is)<h([1-4])\b[^>]*>(.*?)</h\1>|<(?:script|style)\b.*?</(?:script|style)>")
GENERIC = re.compile(r"(?i)^(abv$|ibu$|our |the |all |view |shop |buy |find |more |about |contact |menu|home|beers?$|core|range|seasonal|limited|on tap|what|where|join|subscribe|sign|related|you may|recommended|follow|news|location|opening|hours|food|cart|search|welcome|new |upcoming|products?$)")
NOT_A_BEER = re.compile(r"(?i)^(from the|become|warm up|always|tap beer|branded|get |try |check|book|visit|meet |introducing|grab|limited release|this |come |when |why |how |happy |celebrat)|\bstein\b|\bcash in\b|!$|\?$")
NOT_HEADING = re.compile(r"(?i)^(a?\$\s*\d|shopping (basket|cart)$|similar items$)")
MAX_PAGES = 120


def beers_on_page(page):
    """(name, abv) pairs: each heading with the ABVs in the text up to the next heading."""
    marks = [(m.start(), m.end(), build.clean_text(m.group(2))) for m in TOKEN.finditer(page) if m.group(1)]
    # On a Square product page a price is the next heading, and the ABV comes after it.
    marks = [m for m in marks if not NOT_HEADING.search(m[2])]
    pairs = []
    for i, (_, end, heading) in enumerate(marks):
        stop = marks[i + 1][0] if i + 1 < len(marks) else min(end + 3000, len(page))
        text = build.clean_text(page[end:stop])[:1500]
        abvs = set(build.distinct_abv(text)) or set(build.distinct_abv(heading)) or build.bare_abvs(heading) or build.bare_abvs(text[:200])
        # "Session Ale - 3.8% - 16 IBU": what follows the strength is stats.
        name = re.split(r"\s*[-–|:(]?\s*\d{1,2}(?:\.\d+)?\s*%", build.TITLE_ABV.sub("", heading))[0].strip()
        wordy = len(name.split()) > 5 and not build.STYLE.search(name)
        if len(abvs) == 1 and 2 < len(name) < 70 and not wordy and not GENERIC.match(name) and not NOT_A_BEER.search(name) and not build.not_beer_name(name):
            pairs.append((name, abvs.pop()))
    return pairs


def image_of(page):
    m = re.search(r'(?i)<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', page)
    return html.unescape(m.group(1)) if m else ""


def scan(target, out_dir):
    root = target["root"]
    if build.site_blocked(root):
        return 0
    out = os.path.join(out_dir, re.sub(r"[^a-z0-9]+", "-", root.split("//")[1].lower()) + ".json")
    if os.path.exists(out):
        return 0
    result = {"name": target["name"], "root": root, "beers": [], "pages": 0}
    try:
        rs, delay = rules(root)
        delay = min(max(delay, 1.5), 15)
        queue, urls, seen = [root + p for p in ("/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml")], [], set()
        while queue and len(seen) < 25:
            s = queue.pop(0)
            if s in seen:
                continue
            seen.add(s)
            try:
                x = get(s, 15).decode("utf8", "ignore")
            except Exception:
                continue
            for u in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", x):
                (queue if re.search(r"\.xml(\?|$)", u) else urls).append(u)
        wanted = [u for u in urls if PAGE.search(urllib.parse.urlsplit(u).path)]
        wanted = list(dict.fromkeys([root + "/"] + [root + p for p in ("/beers", "/beer", "/our-beers", "/our-beer", "/the-beers", "/range")] + wanted))
        found = {}
        for u in wanted[:MAX_PAGES]:
            if not allowed(rs, urllib.parse.urlsplit(u).path or "/"):
                continue
            try:
                page = get(u, 20).decode("utf8", "ignore")
            except Exception:
                continue
            result["pages"] += 1
            pairs = beers_on_page(page)
            for name, abv in pairs:
                k = build.key(name)
                if k in found and found[k]["abv"] != abv:
                    found[k]["conflict"] = True
                found.setdefault(k, {"name": name, "abv": abv, "image": image_of(page) if len(pairs) == 1 else "", "url": u})
            time.sleep(delay)
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
    with cf.ThreadPoolExecutor(8) as ex:
        total = sum(ex.map(lambda t: scan(t, sys.argv[2]), targets))
    print("DONE", total)


if __name__ == "__main__":
    main()
