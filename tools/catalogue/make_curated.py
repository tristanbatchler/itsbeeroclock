#!/usr/bin/env python3
"""Writes curated.json: beers the crawl can't reach, since big brewers don't run shops.

Each row is (brewery, name, abv, rank, source). Source says how far to trust the ABV:
  official   the brewer's own site or announcement
  secondary  Wikipedia or a retailer listing, not the brewer
  unchecked  from memory and awaiting a real source: see cross_check.py
"""
import json
import os

ROWS = []


def add(brewery, source, beers):
    for name, abv, rank in beers:
        ROWS.append({"brewery": brewery, "name": name, "abv": abv, "rank": rank, "source": source})


add("XXXX", "official", [("XXXX Gold", 3.5, 100), ("XXXX Bitter", 4.4, 80), ("XXXX Ultra Zero Carb", 3.8, 70), ("XXXX Ginger", 3.5, 50),
    ("Summer Bright Lager", 4.0, 60), ("Summer Bright Lime", 4.0, 40), ("Summer Bright Mango", 4.0, 40)])
add("XXXX", "secondary", [("XXXX Dry", 4.2, 60)])
add("Tooheys", "official", [("Tooheys New", 4.6, 90), ("Tooheys Extra Dry", 4.3, 70), ("Tooheys Old", 4.4, 60), ("Tooheys Ultra Zero Carb", 4.2, 40)])
add("Hahn", "official", [("Hahn SuperDry", 4.6, 85), ("Hahn SuperDry 3.5", 3.5, 60), ("Hahn SuperDry GF", 4.2, 30), ("Hahn Premium Light", 2.4, 50), ("Hahn Ultra Zero Carb", 4.2, 40)])
add("Little Creatures", "official", [("Pale Ale", 5.2, 70), ("Pacific Ale", 4.4, 50), ("Rogers' Amber Ale", 3.8, 40), ("Little Hazy Lager", 3.5, 40)])
add("Stone & Wood", "official", [("Pacific Ale", 4.4, 90), ("Hinterland Hazy Pale Ale", 5.2, 50), ("Big Pale Ale", 5.6, 30), ("Northern Rivers Lager", 4.0, 40),
    ("Easy Pale Ale", 3.5, 30), ("Citrus Radler", 4.0, 20), ("Peach Radler", 4.0, 20)])
add("Coopers", "official", [("Dry", 4.2, 50), ("Dry 3.5", 3.5, 40), ("Mild Ale", 3.5, 50), ("XPA", 5.2, 40), ("Pacific Pale Ale", 4.2, 40), ("Draught", 4.2, 30),
    ("Premium Light", 3.0, 30), ("Vintage Ale", 7.5, 20)])
add("Coopers", "unchecked", [("Original Pale Ale", 4.5, 90), ("Best Extra Stout", 6.3, 50)])
add("Coopers", "secondary", [("Sparkling Ale", 5.8, 70)])
add("Balter", "official", [("XPA", 5.0, 80), ("Captain Sensible", 3.5, 70), ("IPA", 6.8, 40), ("Cerveza", 4.0, 50), ("Hazy IPA", 6.0, 30), ("Light Pale Ale", 2.7, 30)])
add("Guinness", "official", [("Guinness Draught", 4.2, 75), ("Guinness Extra Stout", 4.2, 40), ("Guinness Foreign Extra Stout", 7.5, 30), ("Guinness Smooth", 4.5, 20),
    ("Guinness 0.0", 0.0, 30), ("Hop House 13", 4.1, 20), ("Guinness Nitro Cold Brew Coffee", 4.0, 10)])
add("Sapporo", "official", [("Premium Beer", 4.9, 50), ("Premium Black", 5.0, 15), ("Premium Light", 3.5, 15), ("Reserve", 5.0, 15), ("Premium Non-Alcoholic", 0.0, 15)])
add("Carlton & United Breweries", "secondary", [("Victoria Bitter", 4.9, 95), ("VB Gold", 3.5, 50), ("Melbourne Bitter", 4.6, 40), ("Abbotsford Invalid Stout", 5.2, 10),
    ("Sheaf Stout", 5.7, 15), ("Crown Lager", 4.9, 60), ("Crown Golden Ale", 4.5, 15), ("Foster's Lager", 4.9, 30), ("Resch's", 4.4, 25), ("Power's Ultra Smooth Lager", 4.0, 20),
    ("Richmond Lager", 4.4, 10)])
add("Carlton", "secondary", [("Carlton Draught", 4.6, 90), ("Carlton Dry", 4.5, 75), ("Carlton Cold", 3.5, 35), ("Carlton Black", 4.4, 15), ("Carlton Zero", 0.0, 40)])
add("Carlton", "unchecked", [("Carlton Mid", 3.5, 60)])  # Sources disagree: 3.0 on Wikipedia, 3.5 on Beer Menus.
add("Great Northern", "secondary", [("Super Crisp", 3.5, 100)])
add("Great Northern", "secondary", [("Original", 4.2, 70)])
add("Great Northern", "unchecked", [("Zero", 0.0, 30)])
add("Pure Blonde", "secondary", [("Ultra Low Carb Lager", 4.2, 60), ("Premium Mid", 3.0, 25)])
add("Cascade", "secondary", [("Premium Light", 2.4, 45), ("Pale Ale", 5.0, 30), ("Draught", 4.7, 15), ("Stout", 5.8, 15), ("Bitter", 4.4, 10)])
add("Matilda Bay", "secondary", [("Fat Yak", 4.7, 40), ("Lazy Yak", 4.2, 20), ("Wild Yak", 4.2, 15), ("Beez Neez", 4.7, 15), ("Dogbolter Dark Lager", 5.2, 10), ("Redback", 4.7, 10), ("Alpha Pale Ale", 5.2, 10)])
add("Iron Jack", "official", [("Crisp Australian Lager", 3.3, 40), ("Full Strength Lager", 4.0, 30)])
add("James Squire", "secondary", [("One Fifty Lashes", 4.2, 60)])
add("James Squire", "official", [("Alcoholic Ginger Beer", 4.0, 25)])
add("Steinlager", "official", [("Classic", 5.0, 25), ("Ultra Low Carb", 4.2, 15)])
add("West End", "unchecked", [("West End Draught", 4.5, 50), ("West End Gold", 3.5, 20)])
add("Emu", "secondary", [("Emu Export", 4.2, 45), ("Emu Bitter", 4.0, 25)])
add("Swan", "unchecked", [("Swan Draught", 4.5, 25), ("Swan Lager", 4.9, 10)])
add("J. Boag & Son", "unchecked", [("Boag's Premium Lager", 5.0, 40), ("Boag's Draught", 4.7, 25), ("Boag's Wizard Smith's Ale", 4.8, 10)])

add("Heineken", "unchecked", [("Heineken Lager", 5.0, 75), ("Heineken 0.0", 0.0, 40), ("Heineken Silver", 4.0, 20)])
add("Corona", "unchecked", [("Corona Cero", 0.0, 15)])
add("Corona", "secondary", [("Corona Extra", 4.5, 85)])
add("Asahi", "unchecked", [("Asahi Super Dry", 5.0, 75), ("Asahi Super Dry Zero", 0.0, 20)])
add("Peroni", "unchecked", [("Nastro Azzurro", 5.1, 70), ("Peroni Leggera", 3.5, 20), ("Peroni 0.0", 0.0, 15), ("Red", 4.7, 20)])
add("Stella Artois", "unchecked", [("Stella Artois", 5.0, 65)])
add("Kirin", "unchecked", [("Kirin Ichiban", 5.0, 45)])
add("Tiger", "secondary", [("Tiger Lager", 5.0, 35)])
add("Carlsberg", "unchecked", [("Carlsberg Pilsner", 5.0, 30)])
add("Beck's", "unchecked", [("Beck's", 5.0, 30)])
add("Budweiser", "secondary", [("Budweiser", 5.0, 35)])
add("Coors", "unchecked", [("Coors Banquet", 5.0, 15)])
add("Coors", "secondary", [("Coors Light", 4.2, 20)])
add("Miller", "unchecked", [("Miller Genuine Draft", 4.7, 15), ("Miller High Life", 4.6, 10)])
add("Birra Moretti", "secondary", [("L'Autentica", 4.6, 35)])
add("Pilsner Urquell", "secondary", [("Pilsner Urquell", 4.4, 30)])
add("Hoegaarden", "unchecked", [("Hoegaarden White", 4.9, 25)])
add("Leffe", "unchecked", [("Leffe Blonde", 6.6, 20), ("Leffe Brune", 6.5, 10)])
add("Duvel", "unchecked", [("Duvel", 8.5, 15)])
add("Chimay", "secondary", [("Chimay Red", 7.0, 10)])
add("Chimay", "secondary", [("Chimay Blue", 9.0, 10)])
add("Erdinger", "unchecked", [("Weissbier", 5.3, 20)])
add("Paulaner", "unchecked", [("Hefe-Weissbier", 5.5, 20)])
add("Weihenstephaner", "unchecked", [("Hefeweissbier", 5.4, 15)])
add("Franziskaner", "unchecked", [("Hefe-Weisse", 5.0, 10)])
add("Krombacher", "unchecked", [("Pils", 4.8, 10)])
add("Warsteiner", "unchecked", [("Premium Pilsener", 4.8, 10)])
add("Kronenbourg", "unchecked", [("1664", 5.0, 25), ("1664 Blanc", 5.0, 15)])
add("Tsingtao", "secondary", [("Tsingtao", 4.7, 25)])
add("Singha", "secondary", [("Singha", 5.0, 20)])
add("Chang", "unchecked", [("Chang Classic", 5.0, 20)])
add("Bintang", "secondary", [("Pilsener", 4.7, 30)])
add("San Miguel", "secondary", [("Pale Pilsen", 5.0, 20)])
add("Modelo", "unchecked", [("Especial", 4.5, 15), ("Negra", 5.4, 10)])
add("Sol", "unchecked", [("Sol", 4.5, 15)])
add("Tui", "unchecked", [("Tui East India Pale Ale", 4.0, 10)])
add("Speight's", "official", [("Gold Medal Ale", 4.0, 15)])
add("Sierra Nevada", "unchecked", [("Pale Ale", 5.6, 15)])
add("Lagunitas", "unchecked", [("IPA", 6.2, 15)])
add("Goose Island", "unchecked", [("Goose IPA", 5.9, 10)])
add("BrewDog", "unchecked", [("Punk IPA", 5.4, 20), ("Hazy Jane", 5.0, 10)])
# Sourced 2026-11-04: Wikipedia, trade press or Australian retailer listings, with no conflict between them.
add("Swan", "official", [("Swan Gold", 3.5, 30)])
add("Heineken", "secondary", [("Heineken Lager", 5.0, 70), ("Heineken Silver", 4.0, 40), ("Heineken 0.0", 0.0, 30)])
add("Peroni", "secondary", [("Nastro Azzurro 3.5%", 3.5, 30), ("Red", 4.7, 30)])
add("Asahi", "secondary", [("Asahi Super Dry 0.0", 0.0, 30)])
add("J. Boag & Son", "secondary", [("Boag's Premium Lager", 4.6, 50), ("Boag's Draught", 4.6, 40), ("Boag's Wizard Smith's Ale", 5.0, 10)])
add("West End", "secondary", [("West End Draught", 4.5, 50)])
add("Coopers", "secondary", [("Original Pale Ale", 4.5, 85), ("Best Extra Stout", 6.3, 60), ("Dark Ale", 4.5, 50)])
add("4 Pines", "secondary", [("Pacific Ale", 3.5, 60), ("Draught", 4.6, 40), ("Hefeweizen", 5.2, 30), ("Japanese Style Lager", 4.5, 30), ("Indian Summer Pale Ale", 4.2, 20)])

HERE = os.path.dirname(os.path.abspath(__file__))
ROWS += json.load(open(os.path.join(HERE, "feral.json")))  # Scraped from its beer pages: it has no shop feed.

with open(os.path.join(HERE, "curated.json"), "w") as f:
    f.write("[\n" + ",\n".join(json.dumps(r, ensure_ascii=False) for r in ROWS) + "\n]\n")
print(len(ROWS), "rows")
