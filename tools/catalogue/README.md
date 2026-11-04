# Beer catalogue tools

Builds `backend/cmd/seed/beers.json`, which `cmd/seed` loads. Python 3 standard library only.

    crawl.py <dir> <probe.json>   # read breweries' public shop feeds into <dir>/raw (about 30 min)
    fetch_pages.py <dir>          # read product pages for beers whose feed has no ABV (slow, resumable)
    scan_sites.py <targets> <dir> # read beers off sites with no shop feed, by way of their sitemaps
    render_sites.py <targets> <dir> # the same for sites that need JavaScript (needs playwright, unlike the rest)
    discover.py <names> <out>     # guess domains for breweries known only by name; review the result before crawling
    make_curated.py               # regenerate curated.json from its hand-kept list
    cross_check.py <wd> <off>     # compare unchecked ABVs with Wikidata and Open Food Facts
    build.py <dir,dir> <breweries.json> ../../backend/cmd/seed/beers.json --scan <scan_dir> --report report.json

- `existing.json` is the original hand-written list. Its IDs stay on any beer that remains, because drink logs and favourites reference them, but a row only it vouches for is dropped.
- Every beer needs a known ABV: a brewer's stated one, or a sourced row in `curated.json`. Rows marked `unchecked` there are skipped.
- Images are links to breweries' own sites for now. The plan is to serve them ourselves eventually.
- A crawled beer needs one unambiguous stated ABV, or it's left out.
- Never add Untappd (its API terms ban building a beer database), The Crafty Pint without its written approval (its terms limit use to non-commercial or personal and prohibit copying), retailers whose terms forbid copying, or Open Food Facts data (its licence is share-alike). IndieBeer's robots.txt blocks Claude crawlers.
