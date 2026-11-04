#!/usr/bin/env python3
"""Builds backend/cmd/seed/beers.json from crawled brewery feeds and curated lists.

Usage: build.py <crawl_dir,crawl_dir,...> <breweries.json> <out.json> [--scan scan_dir] [--report report.json]

Only listings stating a single unambiguous ABV are accepted: the app uses ABV for
BAC estimates, so a beer without a trustworthy one is left out rather than guessed.
Existing IDs are kept, because drink logs and favourites reference them.
"""
import argparse
import collections
import glob
import html
import json
import os
import re
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))

ABV = re.compile(
    r"(\d{1,2}(?:\.\d{1,2})?)\s*%\s*(?:abv|alc\b|alc/|alc\.|alcohol|a\.b\.v)"
    r"|(?:\babv|\balc(?:ohol)?(?:\s*(?:by|/)\s*vol(?:ume)?\.?)?)\s*[:\-–=]?\s*(?:of\s+)?(\d{1,2}(?:\.\d{1,2})?)\s*%",
    re.I,
)
# Not a beer you can log a drink of.
NOT_BEER = re.compile(
    r"\b(dog brew|rare tawny|t-?shirts?|tee|tees|singlet|hoodie|hoody|jumper|crew\s?neck|sweater|jacket|hats?|caps?|beanie|bucket hat"
    r"|stubby holders?|stubbie|coolers?|cooler bag|tote|bags?|socks?|shorts|apparel|merch|merchandise|clothing|sticker"
    r"|glass|glasses|glassware|schooner glass|pint glass|tulip|tumbler|coaster|bottle opener|opener|growler|squealer|flagon"
    r"|keg|kegs|tap handle|gift ?cards?|gift ?vouchers?|voucher|gift box|gift pack|gift set|subscription|club membership|membership"
    r"|tours?|tasting|tickets?|event|experience|booking|deposit|shipping|delivery|donation|carbon offset|poster|print|towel|apron|candle"
    r"|mixed|mixer|mix pack|mixpack|mix|variety|festival pack|imperial pack|non alc pack|six pack|sampler|sample pack|taster|bundle|advent|discovery pack|dozen mix|collection pack"
    r"|gin|vodka|whisky|whiskey|rum|tequila|liqueur|spirit|spirits|wine|shiraz|chardonnay|seltzer|hard soda|hard lemonade|lemonade|rtd|cocktail"
    r"|riesling|semillon|merlot|malbec|cabernet|sauvignon|pinot|tempranillo|verdelho|prosecco|ros[eé]|sangiovese|grenache|viognier|moscato"
    r"|soda|hop water|sparkling water|mead|vermouth|trade|chuhai|hyoketsu|kombucha|hot sauce|sauce|chilli|chocolate bar|coffee beans|cleaning|fee|malt extract|homebrew kit|brew kit|recipe kit|yeast|hops pack)\b",
    re.I,
)
# These words also name barrel-aged beers and beers with odd names ("Rum Barrel Stout", "Hat Lifter Stout").
AMBIGUOUS = re.compile(r"(?i)\b(gin|rum|whisky|whiskey|wine|hats?|bags?|caps?|tours?|event|experience|print|fee|trade|keg|kegs|coffee beans|tasting|taster|mix|mixer|spirit|spirits|chilli|sauce|coolers?|cooler|tulip|delivery)\b")
STYLE = re.compile(r"(?i)\b(ipa|xpa|neipa|dipa|ale|lager|stout|pilsner|pilsener|pils|porter|sour|saison|gose|bock|weizen|hefeweizen|witbier|wit|helles|kolsch|k[oö]lsch|dunkel|barleywine|barley wine|wheatwine|tripel|dubbel|quad|lambic|radler|ginger beer)\b")
RESELLERS = {"yeah drinks"}  # Sells other breweries' beers, so its name isn't the brewery.
# Their own terms forbid scraping, beyond the template wording most Shopify stores carry.
# Template-clause and unknown-terms sites are crawled: the owner's decision, 2026-11-04.
EXCLUDED_SITES = {
    "goulburnbrewery.com", "heapsnormal.com", "onedropbrewingco.com.au", "rustypennybrewing.com.au", "shedshakerbrewing.com",
    "smileybrewing.com.au", "freshwaterbrewing.com.au", "bonza.com.au", "goodfolk.co", "lasirene.com.au",
    "pacificocean.com.au", "spinifexbrewery.com.au", "sundowner.co",
}
# Not a brewery's own site, so nothing there can be read as its range.
NOT_BREWERY_SITES = {"facebook.com", "m.facebook.com", "instagram.com", "bne.com.au", "linktr.ee", "untappd.com", "wikipedia.org",
                     # Guessed domains that turned out to be unrelated businesses.
                     "4hearts.com.au", "atomic.com", "dingo.com.au", "district.com.au", "heroesvillains.com", "purplemango.co", "social.au", "earlybird.com", "bigdrop.beer", "baladin.com"}


def site_blocked(root):
    host = root.split("//")[-1].split("/")[0].lower().removeprefix("www.")
    return host in EXCLUDED_SITES or host in NOT_BREWERY_SITES


# Open Brewery DB points these names at another brewery's site, so go by the site.
SITE_BREWERY = {
    "mountainculture.com.au": "Mountain Culture Beer Co",
    "www.woopibrewingco.com.au": "Woopi Brewing Co",
    "www.tarbarrel.com.au": "Tar Barrel Brewery",
    "www.localbrewing.co": "Local Brewing Co",
    "www.twobays.beer": "Two Bays Brewing Co",
    "coopers.com.au": "Coopers",
}
TYPE_BEERISH = re.compile(r"beer|ale|lager|ipa|stout|porter|sour|pilsner|pils|cider|can|bottle|carton|pack|case|small batch|core|limited|seasonal", re.I)
# Packaging noise in product titles.
PACK = re.compile(
    r"(?ix)\s*[-–|,(]?\s*("
    r"\d+\s*(?:x|×)\s*\d+\s*m?l|\d+\s*m?l\b|\d+(?:\.\d+)?\s*l\b|\d+\s*(?:pack|pk|cans?|bottles?)\b"
    r"|\d+\s*-\s*pack|(?:carton|case|slab|4-?pack|6-?pack|16-?pack|24-?pack)\b(?:\s+of\s+\d+)?"
    r"|(?:cans?|bottles?|singles?)\b(?=\s*[)\-–|]|\s*$)|\b(?:online\s+only|new\s+release|limited\s+release|sold\s+out|pre-?order)\b"
    r")\s*\)?"
)
TITLE_ABV = re.compile(r"\(?\b(\d{1,2}(?:\.\d{1,2})?)\s*%\s*\)?")
STOP_BREWERY = re.compile(r"(?i)\b(brewing|brewery|brewers?|beer|beers|company|co|pty|ltd|the|bros|brewhouse|brew|and)\b")


def clean_text(s):
    s = html.unescape(s or "")
    s = re.sub(r"(?is)<(script|style).*?</\1>", " ", s)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"['’.]", "", s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def key(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = s.replace("&", " and ")
    s = re.sub(r"['’.]", "", s)
    return " ".join(w for w in re.sub(r"[^a-z0-9]+", " ", s).split() if w != "and")


def brewery_key(s):
    return " ".join(STOP_BREWERY.sub(" ", key(s)).split()) or key(s)


def distinct_abv(text):
    return sorted({float(a or b) for a, b in ABV.findall(text)})


# Things a percentage in a blurb can be other than strength.
NOT_STRENGTH = re.compile(r"(?i)\s*(off|discount|of\b|malt|wheat|oats?|rye|proceeds|profit|donat|recycl|juice|fruit|lactose|barley|hops?|cashback|extra|more|less)")


def bare_abvs(body):
    """Bare percentages plausible as strength, as in "German Pils | 5.1%"."""
    found = set()
    for m in re.finditer(r"(?<![\d.])(\d{1,2}(?:\.\d{1,2})?)\s*%", body):
        if not NOT_STRENGTH.match(body[m.end():m.end() + 12]) and 0 < float(m.group(1)) <= 20:
            found.add(float(m.group(1)))
    return found


def listing_abvs(listing, extra_pages):
    """ABVs a listing states. A bare "5.0%" counts in a title, and in a body that gives no labelled ABV."""
    title = clean_text(listing["title"])
    body = clean_text(listing["body"])
    text = body + " " + title + " " + listing["tags"] + " " + extra_pages.get(listing["handle"], "")
    found = set(distinct_abv(text)) | {float(v) for v in TITLE_ABV.findall(title)}
    return found or bare_abvs(body)


def tidy_brewery(name):
    return re.sub(r"\s+", " ", name).strip().rstrip(".")


def tidy_name(title, brewery):
    name = TITLE_ABV.sub("", clean_text(title))
    # "Pale Ale – ABV 30 IBU" is left when the percentage goes, and the rest is stats.
    name = re.sub(r"(?i)\s*[-–|<:(*]*\s*\babv\b.*$", "", name)
    name = re.sub(r"(?i)\s*\b\d+x\d+x\d+\s*ml\b|\s*long neck\b|\s*\b(pack or|bottle \d+m|\d+m)\s*$", "", name)
    name = re.sub(r"(?i)\s*\((in tank|seasonal release|limited edition|limited release)[^)]*\)|^(sale\s*)?//\s*|^beer:\s*", "", name)
    for _ in range(3):
        name = PACK.sub("", name)
    name = re.sub(r"(?i)\s+(carton\b.*|bottles|cans|cube)$", "", name)
    name = re.sub(r"\s*[-–|:,(]\s*$", "", name).strip()
    name = re.sub(r"\(\s*\)", "", name).strip()
    # "Beerfarm Asam Boi Gose" -> "Asam Boi Gose", unless that leaves nothing.
    bk = brewery_key(brewery)
    words = name.split()
    for n in range(min(4, len(words) - 1), 0, -1):
        prefix = " ".join(words[:n])
        if brewery_key(prefix) == bk and bk:
            name = " ".join(words[n:]).lstrip("-–|: ")
            break
    name = re.sub(r"(?i)[\s\-–|]*\b\d+\s*ibus?\b.*$|\s*-\s*keg\)?$", "", name)
    if name.islower():
        name = name.title()
    if name.isupper() and len(name) > 4:
        name = " ".join(w.capitalize() if not re.search(r"\d", w) and w not in ("IPA", "XPA", "NEIPA", "DIPA", "ESB", "APA") else w for w in name.split())
    name = re.sub(r"\b(ipa|xpa|neipa|dipa|apa|esb|wcipa)\b", lambda m: m.group().upper(), name, flags=re.I)
    return re.sub(r"\s+", " ", name).strip(" -–|:/")


def shopify_listing(p):
    return {
        "title": p.get("title") or "",
        "vendor": p.get("vendor") or "",
        "type": p.get("product_type") or "",
        "tags": " ".join(p["tags"]) if isinstance(p.get("tags"), list) else (p.get("tags") or ""),
        "body": p.get("body_html") or "",
        "image": ((p.get("images") or [{}])[0] or {}).get("src") or "",
        "handle": p.get("handle") or "",
    }


def woo_listing(p):
    return {
        "title": p.get("name") or "",
        "vendor": "",
        "type": " ".join(c.get("name", "") for c in p.get("categories") or []),
        "tags": " ".join(t.get("name", "") for t in p.get("tags") or []),
        "body": (p.get("description") or "") + " " + (p.get("short_description") or ""),
        "image": ((p.get("images") or [{}])[0] or {}).get("src") or "",
        "handle": p.get("slug") or "",
    }


ALCOHOL_FREE = re.compile(r"(?i)zero|cero|non.?alc|free|0\.0")
# Headings on brewery sites that sit above a beer's stats but aren't its name.
NOT_SCANNED_NAME = re.compile(r"(?i)^(tap \d+\b.*|ales?|beers?|sours?|.*\bbeers|.*\breleases|i'm under 18|no food van.*|vote now.*|filters|explore the range|wheats|rockyridgebrewing|beacon great beer|a\$.*|shopping basket|\d+ sour)$|^personalised\b")


def not_beer_name(title):
    # Blank out the ambiguous words when a beer style vouches for them, then see what's left.
    return bool(NOT_BEER.search(AMBIGUOUS.sub(" ", title) if STYLE.search(title) else title))


def classify(listing):
    """Returns a rejection reason, or None for a beer."""
    title = clean_text(listing["title"])
    if not_beer_name(title):
        return "not-beer-title"
    t = listing["type"]
    if t and NOT_BEER.search(t) and not TYPE_BEERISH.search(t):
        return "not-beer-type"
    return None


def thumb(url):
    if not url:
        return ""
    if "cdn.shopify.com" in url or "/cdn/shop/" in url:
        return url + ("&" if "?" in url else "?") + "width=200"
    return url


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("crawl_dir")
    ap.add_argument("breweries")
    ap.add_argument("out")
    ap.add_argument("--report")
    ap.add_argument("--scan")
    args = ap.parse_args()

    crawl_dirs = args.crawl_dir.split(",")
    stores = {}
    for d in crawl_dirs:
        for r in json.load(open(os.path.join(d, "crawl.json"))):
            if r.get("root"):
                stores[re.sub(r"[^a-z0-9]+", "-", r["root"].split("//")[1].lower())] = r

    existing = json.load(open(os.path.join(HERE, "existing.json")))
    curated = json.load(open(os.path.join(HERE, "curated.json")))
    aliases = json.load(open(os.path.join(HERE, "brewery_aliases.json")))
    canon = {brewery_key(k): v for k, v in aliases.items()}

    def brewery_name(b):
        return canon.get(brewery_key(b), tidy_brewery(b))

    stats = collections.Counter()
    rejected = collections.defaultdict(list)
    found = []
    for path in sorted(p for d in crawl_dirs for p in glob.glob(os.path.join(d, "raw", "*.json"))):
        store = stores.get(os.path.basename(path)[:-5])
        if not store or site_blocked(store["root"]):
            continue
        items = json.load(open(path))
        listings = [(woo_listing if store["kind"] == "woo" else shopify_listing)(p) for p in items]
        vendors = collections.Counter(brewery_key(l["vendor"]) for l in listings if l["vendor"])
        store_bk = brewery_key(SITE_BREWERY.get(store["root"].split("//")[1], store["name"]))
        if key(store["name"]) in RESELLERS:
            continue
        resells = len(vendors) >= 5
        pages_path = os.path.join(os.path.dirname(os.path.dirname(path)), "pages", os.path.basename(path))
        extra_pages = json.load(open(pages_path)) if os.path.exists(pages_path) else {}
        # A value in most of a store's listings comes from its footer or shipping blurb.
        stated = [listing_abvs(l, extra_pages) for l in listings]
        stated = [a for a in stated if a]
        seen = collections.Counter(a for abvs in stated for a in abvs)
        boilerplate = {a for a, n in seen.items() if len(stated) >= 8 and n >= 0.6 * len(stated)}
        for l in listings:
            stats["listings"] += 1
            title = clean_text(l["title"])
            if resells and brewery_key(l["vendor"]) != store_bk:
                stats["resold"] += 1
                continue
            reason = classify(l)
            if reason:
                stats[reason] += 1
                continue
            found_abvs = listing_abvs(l, extra_pages)
            abvs = sorted(found_abvs - boilerplate if len(found_abvs) > 1 else found_abvs)
            if not abvs:
                stats["no-abv"] += 1
                rejected["no-abv"].append([store["name"], title])
                continue
            if len(abvs) > 1:
                stats["ambiguous-abv"] += 1
                rejected["ambiguous-abv"].append([store["name"], title, abvs])
                continue
            abv = abvs[0]
            if abv > 20 or (abv < 0.5 and not ALCOHOL_FREE.search(title)):
                stats["implausible-abv"] += 1
                continue
            brewery = brewery_name(SITE_BREWERY.get(store["root"].split("//")[1], store["name"]))
            name = tidy_name(title, brewery)
            if not name or not re.search(r"[A-Za-z]", name) or NOT_SCANNED_NAME.search(name):
                stats["empty-name"] += 1
                continue
            if key(name) in ("beer", "lager", "ale"):
                name = title
            found.append({"name": name, "brewery": brewery, "abv": abv, "image": thumb(l["image"]), "rank": 0, "src": store["root"]})

    for path in sorted(glob.glob(os.path.join(args.scan or "", "*.json"))) if args.scan else []:
        site = json.load(open(path))
        if site_blocked(site["root"]):
            continue
        brewery = brewery_name(SITE_BREWERY.get(site["root"].split("//")[1], site["name"]))
        # The same strength on nearly every beer means it came from the page, not the beers.
        strengths = collections.Counter(s["abv"] for s in site["beers"])
        if len(site["beers"]) >= 8 and strengths.most_common(1)[0][1] >= 0.8 * len(site["beers"]):
            stats["scanned-boilerplate"] += len(site["beers"])
            continue
        for s in site["beers"]:
            name = tidy_name(s["name"], brewery)
            if not name or NOT_SCANNED_NAME.search(name) or not re.fullmatch(r"[\x00-ɏ‐-™◦ ]+", name):
                continue
            # A stated 0% counts only on a beer that says it's alcohol free.
            if re.search(r"[A-Za-z]", name) and s["abv"] <= 20 and (s["abv"] >= 0.5 or ALCOHOL_FREE.search(name)):
                stats["scanned"] += 1
                found.append({"name": name, "brewery": brewery, "abv": s["abv"], "image": s.get("image", ""), "rank": 0, "src": site["root"]})

    # Precedence on clashes: curated (checked by hand) > crawled (the brewer's own words) > the old list.
    merged, conflicted = {}, set()
    for b in existing:
        # Some original rows have no name because the brewery field holds the beer ("Heineken").
        b = {**b, "name": b["name"].strip() or b["brewery"]}
        if not_beer_name(b["name"]):
            rejected["existing-dropped"].append([b["id"], b["brewery"], b["name"]])
            continue
        # Tidying can empty a name like "Heineken Beer", and the original is better than nothing.
        name = tidy_name(b["name"], brewery_name(b["brewery"])) or b["name"]
        b = {**b, "brewery": brewery_name(b["brewery"]), "name": name, "rank": b.get("rank", 0), "keep_id": b["id"]}
        merged[(brewery_key(b["brewery"]), key(b["name"]))] = b
    for b in found:
        k = (brewery_key(b["brewery"]), key(b["name"]))
        old = merged.get(k)
        if old and old.get("src") and abs(old["abv"] - b["abv"]) > 0.001:
            stats["conflict-between-listings"] += 1
            rejected["conflict"].append([b["brewery"], b["name"], old["abv"], b["abv"]])
            conflicted.add(k)
        if old:
            if not old.get("src"):
                if abs(old["abv"] - b["abv"]) > 0.05:
                    rejected["abv-corrected"].append([b["brewery"], b["name"], old["abv"], b["abv"]])
                merged[k] = {**old, "name": b["name"], "brewery": b["brewery"], "abv": b["abv"], "image": old["image"] or b["image"], "src": b["src"]}
            continue
        merged[k] = b
    for k in conflicted:
        del merged[k]
    for b in curated:
        k = (brewery_key(b["brewery"]), key(b["name"]))
        # The owner's rule: a drink with no ABV we can source doesn't go in.
        if b.get("source") == "unchecked":
            continue
        old = merged.get(k)
        if old and abs(old["abv"] - b["abv"]) > 0.05:
            rejected["abv-corrected"].append([b["brewery"], b["name"], old["abv"], b["abv"]])
        merged[k] = {**(old or {"image": ""}), **b, "brewery": brewery_name(b["brewery"]), "image": b.get("image") or (old or {}).get("image", ""), "src": b["source"]}

    # Rows only the original hand-written list vouches for have no known ABV.
    for k, b in list(merged.items()):
        if not b.get("src"):
            stats["no-known-abv"] += 1
            rejected["no-known-abv"].append([b["brewery"], b["name"], b["abv"]])
            del merged[k]

    # "XXXX Gold" and "Gold" from the same brewery at the same strength are one beer.
    def same_beer(b):
        brewery_words = set(key(b["brewery"]).split())
        return brewery_key(b["brewery"]), b["abv"], frozenset(set(key(b["name"]).split()) - brewery_words - {"beer", "can", "cans", "bottle", "bottles", "longneck"})

    kept = {}
    for b in sorted(merged.values(), key=lambda b: (-b.get("rank", 0), not b.get("keep_id"), -len(b["name"]))):
        k = same_beer(b)
        if k in kept:
            stats["duplicate-names"] += 1
            kept[k]["image"] = kept[k].get("image") or b.get("image") or ""
        else:
            kept[k] = b
    merged = kept

    out, used = [], set()
    for b in sorted(merged.values(), key=lambda b: (b["brewery"].lower(), b["name"].lower())):
        id_ = b.get("keep_id") or (slug(b["brewery"]) + "-" + slug(b["name"]))
        base, n = id_, 2
        while id_ in used:
            id_, n = f"{base}-{n}", n + 1
        used.add(id_)
        out.append({"id": id_, "name": b["name"], "brewery": b["brewery"], "abv": round(b["abv"], 2), "image": b.get("image") or "", "rank": b.get("rank", 0)})

    with open(args.out, "w") as f:
        f.write("[\n" + ",\n".join(json.dumps(b, ensure_ascii=False) for b in out) + "\n]\n")

    stats["catalogue"] = len(out)
    stats["with-image"] = sum(1 for b in out if b["image"])
    stats["breweries"] = len({b["brewery"] for b in out})
    print(json.dumps(stats, indent=1, sort_keys=True))
    if args.report:
        json.dump(rejected, open(args.report, "w"), indent=0, ensure_ascii=False)


if __name__ == "__main__":
    main()
