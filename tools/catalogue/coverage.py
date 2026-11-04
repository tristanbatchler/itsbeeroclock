#!/usr/bin/env python3
"""Measures the catalogue against independent lists it wasn't built from.

Usage: coverage.py <beers.json> <aiba.json> <bws_sitemap.xml>

aiba.json holds Australian International Beer Awards entries. The BWS sitemap gives
names of what a big retailer sells. Both are only compared with, never copied in.
"""
import collections
import json
import re
import sys

from build import brewery_key, key

STATES = re.compile(r"\s+(new south wales|victoria|queensland|south australia|western australia|tasmania|northern territory|australian capital territory)$", re.I)
NOISE = {"beer", "brewing", "brewery", "the", "co", "company", "can", "cans", "bottle", "bottles", "stubbies", "ml", "pack", "lager", "ale"}


def words(s):
    return {w for w in key(s).split() if w not in NOISE and not re.fullmatch(r"\d+(ml|l)?|\d+x\d+ml", w)}


def main():
    beers = json.load(open(sys.argv[1]))
    by_brewery = collections.defaultdict(list)
    for b in beers:
        by_brewery[brewery_key(b["brewery"])].append(words(b["name"]))

    def find_brewery(name):
        k = brewery_key(STATES.sub("", name))
        if k in by_brewery:
            return k
        for other in by_brewery:
            if len(other) > 4 and (other in k or k in other):
                return other
        return None

    entries = json.load(open(sys.argv[2]))
    missing_breweries = collections.Counter()
    known = hit = 0
    misses = []
    for e in entries:
        k = find_brewery(e["brewery"])
        if not k:
            missing_breweries[STATES.sub("", e["brewery"])] += 1
            continue
        known += 1
        want = words(e["name"]) - words(e["brewery"])
        if want and any(want <= have or (have and have <= want and len(have) >= 2) for have in by_brewery[k]):
            hit += 1
        else:
            misses.append((e["brewery"], e["name"]))
    print(f"Award entries: {hit}/{len(entries)} = {hit / len(entries):.0%} found; {known} at a known brewery; {len(missing_breweries)} of {len({e['brewery'] for e in entries})} breweries absent")
    print("Biggest absent breweries:", missing_breweries.most_common(40))

    every = [w | words(b) for b, ws in by_brewery.items() for w in ws]
    locs = re.findall(r"<loc>[^<]*/product/\d+/([^<]+)</loc>", open(sys.argv[3]).read())
    beerish = [l for l in locs if re.search(r"(-can|-cans|-bottle|-bottles|-stubbies|-longneck|-lager|-ale|-ipa|-beer|-stout|-pilsner|-xpa)(-|$)", l) and not re.search(r"cider|seltzer|vodka|gin-|rum|whisk|bourbon|wine|soda|spritz|pre-mix|cruiser|smirnoff|canadian-club|jim-beam|jack-daniel|mixed|tonic", l)]
    found = sum(1 for l in beerish if (w := words(l.replace("-", " "))) and any(h and h <= w for h in every))
    print(f"BWS beer listings: {found}/{len(beerish)} = {found / len(beerish):.0%}")


if __name__ == "__main__":
    main()
