#!/usr/bin/env python3
"""Compares curated.json's unchecked ABVs against Wikidata and Open Food Facts.

Usage: cross_check.py <wikidata.json> <off_beers.jsonl>

Only a check: nothing here is copied into the catalogue. Prints each unchecked beer
with the values those sources give, or "no data" when neither knows it.
"""
import json
import statistics
import sys

from build import key


def main():
    refs = {}
    for x in json.load(open(sys.argv[1]))["results"]["bindings"]:
        if "abv" in x:
            try:
                refs.setdefault(key(x["bLabel"]["value"]), []).append(float(x["abv"]["value"]))
            except ValueError:
                pass
    for line in open(sys.argv[2]):
        x = json.loads(line)
        try:
            abv = float(x.get("alcohol_100g") or "")
        except ValueError:
            continue
        for n in {key(x.get("product_name") or ""), key((x.get("brands") or "") + " " + (x.get("product_name") or ""))}:
            refs.setdefault(n, []).append(abv)

    for r in json.load(open("curated.json")):
        if r["source"] != "unchecked":
            continue
        name = key(r["name"])
        full = key(r["brewery"] + " " + r["name"])
        vals = refs.get(name if len(name.split()) > 1 or r["name"] == r["brewery"] else full, []) or refs.get(full, [])
        if not vals:
            print(f"NODATA  {r['brewery']} | {r['name']} | {r['abv']}")
            continue
        med = statistics.median(vals)
        flag = "OK     " if abs(med - r["abv"]) <= 0.2 else "DIFFERS"
        print(f"{flag} {r['brewery']} | {r['name']} | mine {r['abv']} | refs median {med} n={len(vals)}")


if __name__ == "__main__":
    main()
