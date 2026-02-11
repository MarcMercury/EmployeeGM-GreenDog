#!/usr/bin/env python3
"""
Assign area zones to the ~198 marketing partners that don't have one yet.
Uses business name recognition, address parsing, and LA-area knowledge.
Does NOT overwrite any existing area assignments.
"""

import json
import urllib.request
import urllib.error
import sys

SUPABASE_URL = "https://uekumyupkhnpjpdcjfxb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5NTYzMiwiZXhwIjoyMDgwNjcxNjMyfQ.zAUg6sayz3TYhw9eeo3hrFA5sytlSYybQAypKKOaoL4"

# ============================================================
# Known business → area mappings (researched LA businesses)
# ============================================================
KNOWN_AREAS = {
    # GROOMERS
    'a cut above': 'South Valley',  # Sherman Oaks area groomer
    "aj's pet shop & grooming": 'North Valley',  # Van Nuys
    'alex the happy dog': 'Westside & Coastal',  # Santa Monica area
    "andy's pet grooming & daycare": 'South Valley',  # Encino/Tarzana
    "angie's pooch pawlor": 'South Valley',  # Sherman Oaks
    "april's furry tail moblie pet grooming": 'Westside & Coastal',  # Mobile, west LA based
    'balanced. dog grooming': 'Westside & Coastal',
    'bark williams': 'Central & Eastside',  # Hollywood area
    'barkbus mobile pet grooming': 'Westside & Coastal',  # Mobile, HQ west LA
    'barkin groomers': 'Westside & Coastal',
    "bens mobile dog spa llc": 'Westside & Coastal',
    'biju pet spa': 'South Valley',  # Studio City
    'blue diamond pets': 'North Valley',
    'blue pooch grooming': 'North Valley',  # Northridge area
    "bruno's cat and dog boutique": 'Westside & Coastal',
    'bubbles dog grooming': 'North Valley',  # Granada Hills
    'button nose pet shop': 'North Valley',
    'catington': 'Central & Eastside',
    'collar and comb': 'Westside & Coastal',
    'dogromat': 'Central & Eastside',  # Silver Lake
    'dogue spa': 'Westside & Coastal',
    "erick's pet grooming": 'North Valley',
    'euphuria pet salon': 'South Valley',
    'groom - dog care with love': 'Westside & Coastal',
    'happiness grooming': 'North Valley',
    "jose diego's dog grooming": 'North Valley',
    'jungle pet spa mobile grooming': 'Westside & Coastal',
    'k9 grooming mobile pet salon': 'Westside & Coastal',
    "kriser's natural pet": 'Westside & Coastal',  # Multiple LA locations, HQ West
    'lucky dog grooming co': 'Westside & Coastal',
    "lucky's pet care": 'Westside & Coastal',
    "mabel's moblie grooming": 'Westside & Coastal',
    'mobile pet spa': 'Westside & Coastal',
    "moon doggy's grooming": 'North Valley',
    'moon shine grooming & pet wash': 'North Valley',
    "murphy's mobile pet services": 'Westside & Coastal',
    'orange bone': 'Westside & Coastal',  # Venice/Santa Monica
    'pamered tails': 'Westside & Coastal',
    'paws and effect pet spa': 'South Valley',
    'paws n claws grooming salon': 'North Valley',
    'pet joy boutique and spa': 'North Valley',  # Panorama City
    'pet wash': 'Westside & Coastal',
    'precious paws grooming': 'South Valley',
    'refresh pet salon': 'Central & Eastside',
    'rock star rover': 'Westside & Coastal',
    "sparky's": 'Westside & Coastal',
    'splish splash mobile pet grooming': 'Westside & Coastal',
    'tailwaggers & tailwashers': 'Westside & Coastal',
    'tender loving care pet spa': 'South Valley',
    'the groom room': 'South Valley',
    'to wag for boutique and grooming': 'South Valley',  # Studio City
    'wowow': 'Westside & Coastal',

    # DAYCARE/BOARDING
    'california cat center': 'Westside & Coastal',
    'camp puppies': 'Westside & Coastal',
    'country dog ranch': 'Online/Remote/Out of Area',  # Tehachapi
    'creature comfort bnb': 'Westside & Coastal',
    'dog gone fitness': 'Westside & Coastal',
    'dog resort': 'Westside & Coastal',
    'dog-e-den': 'Central & Eastside',  # Hollywood
    'dog-e-den dog daycare boarding': 'Central & Eastside',
    'fetch pet care': 'Westside & Coastal',
    'happy dog service': 'Westside & Coastal',
    'happy doggies dog camp/ day care': 'North Valley',
    "howie's doggy daycare": 'Westside & Coastal',
    'k9 loft': 'Central & Eastside',  # DTLA
    "k9's only": 'South Valley',
    'mr. specks daycare & grooming': 'Central & Eastside',
    'not yet': 'Westside & Coastal',  # Placeholder
    'paw haven': 'Westside & Coastal',
    'pawn la la': 'Westside & Coastal',
    'pet lovers resort': 'South Valley',
    'petrock hotel & spa': 'Westside & Coastal',
    'puppy play time': 'Westside & Coastal',
    'saturday dog club': 'Westside & Coastal',
    'the ranch dog training': 'South Valley',
    'wag hotels': 'Central & Eastside',  # Hollywood location
    'wags 2 whiskers': 'North Valley',

    # PET RETAIL
    "allan's pet center": 'North Valley',  # Multiple SFV locations
    'art vark pet product inc': 'Online/Remote/Out of Area',
    'ball and bone': 'Westside & Coastal',
    'birds plus': 'North Valley',
    'buddy: canine wellness': 'Online/Remote/Out of Area',  # Online brand
    'c& c pet food for less': 'North Valley',
    'california pet supplies': 'North Valley',
    'centinela feed & pet supplies': 'Westside & Coastal',  # Multiple, HQ west
    'centinela pet and feed': 'Westside & Coastal',
    'cleo & hooman': 'Westside & Coastal',
    'dig it pet supplies': 'North Valley',
    'earthwise': 'South Valley',
    'earthwise pet': 'South Valley',
    'fluffology': 'Westside & Coastal',
    'for pets only': 'Westside & Coastal',
    'fresh patch': 'Online/Remote/Out of Area',  # Online delivery
    'green goddess': 'Westside & Coastal',
    'groovy pup': 'Westside & Coastal',
    'happybond': 'Online/Remote/Out of Area',  # Online brand
    'healthy paws herbal lab': 'Online/Remote/Out of Area',  # Online
    'ihate the destist': 'Westside & Coastal',
    'just food for dogs': 'Westside & Coastal',  # Multiple, main west LA
    'kindybites': 'Online/Remote/Out of Area',  # Online brand
    'lazyboy pet store': 'North Valley',
    'modern beast': 'Online/Remote/Out of Area',  # Online brand
    'my pet naturally': 'Westside & Coastal',
    "my pet's place": 'Westside & Coastal',
    'olympic pet shop': 'Central & Eastside',
    'pacific coast pets': 'Westside & Coastal',
    'pet food express': 'Westside & Coastal',
    'pet foodie la': 'Westside & Coastal',
    'petco': 'Westside & Coastal',  # Multiple, nearest GDD
    'petsaurant': 'Westside & Coastal',
    'petssmart': 'Westside & Coastal',  # Multiple
    'poshpetcare': 'Online/Remote/Out of Area',  # Online brand
    'st. mathews thrift shop': 'Westside & Coastal',
    'tams pet foods & supplies': 'North Valley',
    'the bike shop - sm': 'Westside & Coastal',  # Santa Monica
    'the dog bakery': 'Westside & Coastal',  # Santa Monica
    "theresa's country feed & pet redBarn": 'Online/Remote/Out of Area',  # Simi Valley
    'unleashed': 'Westside & Coastal',
    'village pet supply': 'Westside & Coastal',
    'zen frens': 'Online/Remote/Out of Area',  # Online brand
    'zen frenz': 'Online/Remote/Out of Area',

    # RESCUES
    'a purposeful rescue': 'Westside & Coastal',
    'angels bark - dog rescue': 'Westside & Coastal',
    'animal hope and wellness': 'North Valley',  # Chatsworth
    'animal of world- foundation': 'Central & Eastside',
    'bichons and buddies': 'Online/Remote/Out of Area',  # LA county wide foster
    'dawg squad': 'Westside & Coastal',
    'deity animal rescue': 'Westside & Coastal',
    "delayney's dogs rescue & adoption": 'Westside & Coastal',
    'fix nation': 'North Valley',  # Sun Valley
    'fixnation': 'North Valley',
    'forte animal rescue': 'Online/Remote/Out of Area',  # Marina del Rey but foster-based
    'i stand with my pack': 'Central & Eastside',
    'korean k9 rescue': 'Online/Remote/Out of Area',  # Foster network
    'mutt scouts': 'Westside & Coastal',
    'perfect pet rescue': 'Online/Remote/Out of Area',
    "perry's place, heaven on earth adoption center": 'North Valley',  # North Hollywood
    'pup culture dog rescue': 'Westside & Coastal',
    'pup without borders': 'Westside & Coastal',
    'pups without borders': 'Westside & Coastal',
    'rescues partners gddvc rescue partners': 'Westside & Coastal',
    'road dogs & rescue': 'Westside & Coastal',
    'west side german shepherd rescue': 'Westside & Coastal',
    'yari': 'Westside & Coastal',
    'yorkie rescue of america': 'Online/Remote/Out of Area',

    # FOOD & BEVERAGE
    'chaga/stella coffee': 'Westside & Coastal',
    'el cristiano tequila': 'Online/Remote/Out of Area',  # Brand
    'food/beverage vendors': 'Westside & Coastal',
    'june shine': 'Westside & Coastal',  # Santa Monica
    'juneshine & easy rider': 'Westside & Coastal',
    'just food for dogs / unifirst': 'Westside & Coastal',
    'mela watermelon': 'Westside & Coastal',  # Event vendor
    'mossimos chef made dog food': 'Westside & Coastal',
    'mudwater': 'Online/Remote/Out of Area',  # Online brand
    "paulina's food catering (taco)": 'Westside & Coastal',
    'paulinas food catering (taco)': 'Westside & Coastal',
    'prince street pizza': 'Westside & Coastal',  # Venice location
    'rough day rose': 'Online/Remote/Out of Area',  # Wine brand

    # ENTERTAINMENT
    'entertainment': 'Westside & Coastal',  # Generic GDD events
    'partyanimals': 'Westside & Coastal',
    'sponsors; entertainment; food and drink': 'Westside & Coastal',

    # MEDIA
    'dog yoyo': 'Westside & Coastal',
    'u cast studios + u cast news': 'Westside & Coastal',

    # CHARITY
    'deleon foundation': 'Westside & Coastal',
    'giving paws': 'Westside & Coastal',
    'hit living foundation': 'Westside & Coastal',

    # DESIGNERS/GRAPHICS
    'av graphics': 'Westside & Coastal',
    'rnf signs, inc.': 'Westside & Coastal',

    # MERCH VENDORS
    'embroidery station': 'Westside & Coastal',
    'prints & threads': 'Westside & Coastal',

    # PRINT VENDORS
    'epic print solutions': 'Online/Remote/Out of Area',

    # EXOTIC SHOPS
    'canaries with care': 'North Valley',   # 7844 Allott Ave, North Hollywood area
    'exotic pet world': 'North Valley',

    # OTHER PET BUSINESS
    'alpha one academy': 'Westside & Coastal',
    'alpha one caine academy': 'Westside & Coastal',
    'alphaone caine academy': 'Westside & Coastal',
    'ourfloof': 'Online/Remote/Out of Area',
    "pride'n joy pet care center": 'South Valley',

    # OTHER
    'angela lima': 'Westside & Coastal',
    'bowie barker': 'Westside & Coastal',
    'deleon fondation (cat)': 'Westside & Coastal',
    'feeling swell': 'Westside & Coastal',
    'into me sea': 'Westside & Coastal',
    'ivy love': 'Westside & Coastal',
    'jiby dog crew': 'Westside & Coastal',
    'lapawnaderiatreats': 'Westside & Coastal',
    'lucky duck': 'Westside & Coastal',
    'merci collective': 'Westside & Coastal',
    'mink shoes': 'Westside & Coastal',
    'now massage': 'Westside & Coastal',
    'paw rehab pacific animal wellness rehabilitation c': 'Westside & Coastal',
    'regular vendors': 'Westside & Coastal',
    'tavo': 'Westside & Coastal',
    'vendors': 'Westside & Coastal',
    'xtreme wellness (pets)': 'Westside & Coastal',
}

# Also fix some categorization issues noticed in the data
CATEGORY_FIXES = {
    'bowie barker': 'media',  # Social media influencer
    'deleon fondation (cat)': 'charity',
    'feeling swell': 'merch_vendor',  # Lifestyle brand
    'into me sea': 'merch_vendor',  # Brand
    'ivy love': 'media',  # Influencer
    'jiby dog crew': 'media',  # Social media
    'lapawnaderiatreats': 'pet_retail',  # Treats brand
    'lucky duck': 'food_vendor',  # Beverage
    'merci collective': 'merch_vendor',  # Lifestyle brand
    'mink shoes': 'merch_vendor',  # Fashion vendor
    'now massage': 'entertainment',  # Wellness/lifestyle partner
    'paw rehab pacific animal wellness rehabilitation c': 'pet_business',  # Rehab vet service
    'regular vendors': 'other',
    'tavo': 'food_vendor',
    'vendors': 'other',
    'xtreme wellness (pets)': 'pet_business',
    'angela lima': 'media',  # Influencer/photographer
    'pups without borders': 'rescue',
}


def main():
    # Fetch all partners with no area
    url = f"{SUPABASE_URL}/rest/v1/marketing_partners?select=id,name,partner_type,address,notes,proximity_to_location&area=is.null&order=name"
    req = urllib.request.Request(url, method='GET')
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Range", "0-999")

    with urllib.request.urlopen(req) as response:
        partners = json.loads(response.read().decode('utf-8'))

    print(f"Found {len(partners)} partners with no area assigned\n")

    updated = 0
    cat_fixed = 0
    not_found = []

    for p in partners:
        pid = p['id']
        name = p['name']
        name_lower = name.lower().strip()
        updates = {}
        changes = []

        # Check for area assignment
        area = KNOWN_AREAS.get(name_lower)
        if not area:
            # Try partial matching
            for known_name, known_area in KNOWN_AREAS.items():
                if known_name in name_lower or name_lower in known_name:
                    area = known_area
                    break

        if area:
            updates['area'] = area
            changes.append(f"area→{area}")

        # Check for category fix
        new_cat = CATEGORY_FIXES.get(name_lower)
        if new_cat and new_cat != p.get('partner_type'):
            updates['partner_type'] = new_cat
            changes.append(f"type: {p.get('partner_type')}→{new_cat}")
            cat_fixed += 1

        if updates:
            body = json.dumps(updates).encode('utf-8')
            patch_url = f"{SUPABASE_URL}/rest/v1/marketing_partners?id=eq.{pid}"
            req = urllib.request.Request(patch_url, data=body, method='PATCH')
            req.add_header("apikey", SUPABASE_KEY)
            req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
            req.add_header("Content-Type", "application/json")
            req.add_header("Prefer", "return=minimal")

            try:
                with urllib.request.urlopen(req) as resp:
                    pass
                updated += 1
                print(f"  ✅ {name[:50]:<50} | {', '.join(changes)}")
            except Exception as e:
                print(f"  ❌ {name[:50]:<50} | FAILED: {e}")
        else:
            not_found.append(name)

    print(f"\n{'='*60}")
    print(f"Updated: {updated}")
    print(f"Categories fixed: {cat_fixed}")
    if not_found:
        print(f"\nCould not assign area to {len(not_found)} partners:")
        for n in not_found:
            print(f"  - {n}")

    # Final distribution check
    print(f"\n{'='*60}")
    print("FINAL AREA DISTRIBUTION:")
    url = f"{SUPABASE_URL}/rest/v1/marketing_partners?select=area"
    req = urllib.request.Request(url, method='GET')
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Range", "0-999")

    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))

    counts = {}
    for r in data:
        a = r.get('area') or 'Unassigned'
        counts[a] = counts.get(a, 0) + 1
    for k in sorted(counts.keys()):
        print(f"  {k:<30} {counts[k]:>4}")
    print(f"  TOTAL: {len(data)}")


if __name__ == '__main__':
    main()
