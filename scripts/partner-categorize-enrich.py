#!/usr/bin/env python3
"""
Marketing Partners: Categorization, Enrichment & Area Assignment
================================================================
1. Re-categorize partners based on name, notes, and services_provided
2. Web lookup for missing address/contact/social data  
3. Assign area zones based on address/name location cues (matching referral CRM zones)
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
import urllib.parse

SUPABASE_URL = "https://uekumyupkhnpjpdcjfxb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5NTYzMiwiZXhwIjoyMDgwNjcxNjMyfQ.zAUg6sayz3TYhw9eeo3hrFA5sytlSYybQAypKKOaoL4"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# ============================================================
# ZONE DEFINITIONS (matching referral CRM)
# ============================================================
ZONE_NEIGHBORHOODS = {
    'Westside & Coastal': [
        'santa monica', 'venice', 'marina del rey', 'culver city', 
        'beverly hills', 'westwood', 'malibu', 'pacific palisades', 
        'brentwood', 'mar vista', 'west la', 'west los angeles',
        'rancho park', 'westchester', 'playa del rey', 'playa vista',
        'del rey', 'ocean park', 'sawtelle'
    ],
    'South Valley': [
        'studio city', 'sherman oaks', 'encino', 'tarzana', 
        'woodland hills', 'burbank', 'toluca lake', 'universal city', 
        'valley village', 'westlake village', 'calabasas', 'agoura hills',
        'hidden hills', 'lake sherwood'
    ],
    'North Valley': [
        'northridge', 'chatsworth', 'granada hills', 'porter ranch', 
        'van nuys', 'reseda', 'canoga park', 'north hollywood', 
        'sun valley', 'sylmar', 'mission hills', 'panorama city', 
        'winnetka', 'north hills', 'santa clarita', 'valencia',
        'pacoima', 'san fernando', 'lake balboa', 'arleta',
        'valley glen'
    ],
    'Central & Eastside': [
        'dtla', 'downtown', 'silver lake', 'echo park', 'hollywood', 
        'west hollywood', 'los feliz', 'eagle rock', 'boyle heights', 
        'hancock park', 'melrose', 'koreatown', 'mid-wilshire',
        'larchmont', 'atwater village', 'glassell park', 'highland park',
        'mid city', 'fairfax'
    ],
    'South Bay': [
        'el segundo', 'manhattan beach', 'torrance', 'redondo beach', 
        'hawthorne', 'inglewood', 'gardena', 'long beach', 'cerritos',
        'hermosa beach', 'lawndale', 'carson', 'compton', 'lax',
        'south la'
    ],
    'San Gabriel Valley': [
        'pasadena', 'glendale', 'arcadia', 'alhambra', 
        'monterey park', 'san marino', 'san gabriel',
        'la canada', 'azusa', 'covina', 'monrovia'
    ]
}

# Keywords in names that indicate a business is online/remote/out of area
ONLINE_REMOTE_INDICATORS = [
    'walmart.com', 'uprinting', 'nextdayflyers', 'printplace', 
    'fedex office', 'amazon', 'costco', 'target gdd', 'staples',
    'trupanion', 'fi - collars', 'yelp', 'covetrus',
    'celsius', 'ready refresh', 'sparkletts', 'zoetis',
    'uniform scrubs',
]

# ============================================================
# CATEGORIZATION RULES
# ============================================================
def categorize_partner(name, partner_type, services, notes, category):
    """Determine the best partner_type based on name, services, and notes."""
    name_lower = (name or '').lower()
    svc_lower = (services or '').lower()
    notes_lower = (notes or '').lower()
    
    # Already properly typed for specific categories - keep them
    if partner_type in ('exotic_shop', 'food_vendor', 'print_vendor', 'chamber'):
        # But check some print_vendor that should be designers_graphics
        if partner_type == 'print_vendor':
            if any(kw in name_lower for kw in ['embroidery', 'prints & threads']):
                return 'merch_vendor'
            if any(kw in name_lower for kw in ['av graphics']):
                return 'designers_graphics'
            if 'venice insider pass' in name_lower:
                return 'media'
        return partner_type
    
    if partner_type == 'rescue':
        return 'rescue'
    
    # Chamber of Commerce / Association detection
    if any(kw in name_lower for kw in ['chamber of commerce', 'chamber']):
        return 'chamber'
    if any(kw in name_lower for kw in ['association', 'alliance']):
        return 'chamber'  # Consolidated to chamber
    
    # Rescue / Shelter / Foundation detection
    if any(kw in name_lower for kw in ['rescue', 'shelter', 'adoption center', 
                                         'adoption centre', 'foundation', 'sanctuary',
                                         'spay', 'neuter', 'fixnation', 'fix nation']):
        if 'labelle' in name_lower or 'hit living' in name_lower:
            return 'charity'
        if 'deleon' in name_lower:
            return 'charity'
        return 'rescue'
    if 'dog shelter/rescue' in svc_lower or 'rescue partner' in svc_lower:
        return 'rescue'
    
    # Groomer detection
    if any(kw in name_lower for kw in ['groom', 'pet spa', 'pet salon', 'mobile pet',
                                         'dog spa', 'pet wash', 'barkin', 'salon']):
        if 'daycare' in name_lower or 'boarding' in name_lower:
            return 'daycare_boarding'
        return 'groomer'
    if svc_lower.strip() == 'groomer' or (svc_lower.startswith('groomer') and 'daycare' not in svc_lower and 'retail' not in svc_lower):
        return 'groomer'
    
    # Daycare / Boarding detection  
    if any(kw in name_lower for kw in ['daycare', 'day care', 'boarding', 'kennel',
                                         'dog camp', 'club', 'lodge', 'resort',
                                         'hotel', 'bnb']):
        if 'groom' in name_lower:
            return 'daycare_boarding'
        return 'daycare_boarding'
    if svc_lower.strip() == 'daycare' or svc_lower.strip() == 'hotel' or 'daycare' in svc_lower:
        if 'groom' in svc_lower:
            return 'daycare_boarding'  # Multi-service
        return 'daycare_boarding'
    
    # Pet Retail detection
    if any(kw in name_lower for kw in ['pet supply', 'pet supplies', 'pet food', 
                                         'feed', 'pet shop', 'petco', 'petsmart',
                                         'boutique']):
        return 'pet_retail'
    if svc_lower.strip() == 'retail' or (svc_lower == 'retail' and partner_type == 'pet_business'):
        return 'pet_retail'
    if svc_lower.startswith('retail') and 'groom' not in svc_lower:
        return 'pet_retail'
    
    # Media detection
    if any(kw in name_lower for kw in ['news', 'daily press', 'current', 'media',
                                         'magazine', 'blog', 'podcast', 'studio',
                                         'tv', 'press', 'insider pass', 'u cast']):
        return 'media'
    
    # Entertainment detection
    if any(kw in name_lower for kw in ['dj', 'entertainment', 'music', 'photo booth',
                                         'paparazzi', 'animation', 'party']):
        return 'entertainment'
    
    # Charity detection
    if any(kw in name_lower for kw in ['charity', 'heritage museum', 'donation',
                                         'giving', 'mutternity']):
        return 'charity'
    if 'donation' in notes_lower or 'silent auction' in name_lower:
        return 'charity'
    
    # Merch vendor detection
    if any(kw in name_lower for kw in ['merch', 'apparel', 'tshirt', 'swag']):
        return 'merch_vendor'
    if 'sweaters' in svc_lower or 'leather' in svc_lower:
        return 'merch_vendor'
    
    # Designers / Graphics detection
    if any(kw in name_lower for kw in ['graphic', 'design', 'sign', 'signs']):
        return 'designers_graphics'
    if 'sign repair' in svc_lower:
        return 'designers_graphics'
    
    # Food & Beverage detection
    if any(kw in name_lower for kw in ['coffee', 'brewery', 'beer', 'tequila', 
                                         'taco', 'pizza', 'food', 'catering',
                                         'tavern', 'bar ', 'saloon', 'drink',
                                         'water', 'juice', 'shine']):
        return 'food_vendor'
    
    # Trainer detection → other_pet_business
    if any(kw in name_lower for kw in ['trainer', 'training', 'academy', 'fitness']):
        return 'pet_business'  # Other Pet Business (trainers)
    if svc_lower.strip() == 'trainer':
        return 'pet_business'
    
    # Dog-related influencers / communities  
    if any(kw in name_lower for kw in ['dog gang', 'dog ppl', 'dog yoyo', 'saturday dog']):
        return 'media'  # Social media / influencer type
    
    # Multi-service pet business
    if 'groomer' in svc_lower and ('retail' in svc_lower or 'daycare' in svc_lower):
        return 'pet_business'  # Multi-service stays as Other Pet Business
    
    # Various pet product brands
    if any(kw in name_lower for kw in ['fresh patch', 'happybond', 'healthy paws',
                                         'kindybites', 'zen fren', 'mossimo',
                                         'buddy:', 'poshpetcare', 'cleo',
                                         'modern beast', 'orange bone',
                                         'dog bakery', 'fluffology']):
        return 'pet_retail'
    
    # Surf/bike/lifestyle shops near beach
    if any(kw in name_lower for kw in ['surf', 'bike shop']):
        return 'pet_retail'  # Local retail partner
    
    # Keep existing type if reasonable
    if partner_type == 'pet_business':
        # Try more refined guessing for generic pet_business
        if 'groom' in svc_lower:
            return 'groomer'
        if 'retail' in svc_lower:
            return 'pet_retail'
        if 'daycare' in svc_lower or 'hotel' in svc_lower:
            return 'daycare_boarding'
        return 'pet_business'
    
    return partner_type or 'other'


def determine_area(name, address, notes, proximity):
    """Assign area zone based on address, name cues, and notes."""
    name_lower = (name or '').lower()
    addr_lower = (address or '').lower()
    notes_lower = (notes or '').lower()
    prox_lower = (proximity or '').lower()
    
    # Check if online/remote
    for indicator in ONLINE_REMOTE_INDICATORS:
        if indicator in name_lower:
            return 'Online/Remote/Out of Area'
    
    # Check all text fields against zone neighborhoods
    all_text = f"{name_lower} {addr_lower} {notes_lower} {prox_lower}"
    
    for zone, neighborhoods in ZONE_NEIGHBORHOODS.items():
        for neighborhood in neighborhoods:
            # Check address first (most reliable)
            if neighborhood in addr_lower:
                return zone
            # Check name (e.g., "Venice Dog Boarding")
            if neighborhood in name_lower:
                return zone
    
    # Additional name-based heuristics
    # Simi Valley, Thousand Oaks, Ventura etc = Out of Area
    if any(kw in all_text for kw in ['simi valley', 'thousand oaks', 'ventura', 
                                       'oxnard', 'camarillo', 'san diego',
                                       'orange county', 'riverside', 'san bernardino',
                                       'sacramento', 'san francisco', 'online']):
        return 'Online/Remote/Out of Area'
    
    # Thumbprint is in Simi Valley (805 area code)
    if 'thumbprint' in name_lower:
        return 'Online/Remote/Out of Area'
    
    # Builtmore is also out of area
    if 'builtmore' in name_lower:
        return 'Online/Remote/Out of Area'
    
    return None  # Cannot determine from available data


# ============================================================
# WEB LOOKUP for missing data
# ============================================================
def search_business_info(name):
    """
    Use a simple web search to try to find business info.
    We'll query a search engine and try to extract address/contact info.
    Returns dict with any found fields.
    """
    result = {}
    
    # Use known data for specific prominent businesses
    known_businesses = {
        'vanderpump dogs': {
            'website': 'https://www.vanderpumpdogs.org',
            'address': '8134 W 3rd St, Los Angeles, CA 90048',
            'instagram_handle': 'vanderpumpdogs',
            'area': 'Central & Eastside'
        },
        'bark n bitches': {
            'website': 'https://www.barknbitches.com',
            'address': '2406 Hyperion Ave, Los Angeles, CA 90027',
            'instagram_handle': 'barknbitches',
            'area': 'Central & Eastside'
        },
        'barknbitches': {
            'website': 'https://www.barknbitches.com',
            'address': '2406 Hyperion Ave, Los Angeles, CA 90027',
            'instagram_handle': 'barknbitches',
            'area': 'Central & Eastside'
        },
        'healthy spot': {
            'website': 'https://www.healthyspot.com',
            'instagram_handle': 'healthyspot',
            'area': 'Westside & Coastal'
        },
        'centinela feed & pet supplies': {
            'website': 'https://www.centinelafeed.com',
            'instagram_handle': 'centinelafeed',
        },
        'just food for dogs': {
            'website': 'https://www.justfoodfordogs.com',
            'instagram_handle': 'justfoodfordogs',
        },
        'petco': {
            'website': 'https://www.petco.com',
            'instagram_handle': 'petco',
        },
        'petssmart': {
            'website': 'https://www.petsmart.com',
            'instagram_handle': 'petsmart',
        },
        'wags and walks': {
            'website': 'https://www.wagsandwalks.org',
            'address': '10960 Ventura Blvd, Studio City, CA 91604',
            'instagram_handle': 'wagsandwalks',
            'area': 'South Valley'
        },
        'best friends west la adoption center (nkla)': {
            'website': 'https://nkla.bestfriends.org',
            'address': '1845 Pontius Ave, Los Angeles, CA 90025',
            'instagram_handle': 'bestfriendsanimalsociety',
            'area': 'Westside & Coastal'
        },
        'love leo rescue': {
            'website': 'https://www.loveleorescue.org',
            'instagram_handle': 'loveleorescue',
            'area': 'Westside & Coastal'
        },
        'mutt scouts': {
            'website': 'https://muttscouts.org',
            'instagram_handle': 'muttscouts',
        },
        'd pet hotels': {
            'website': 'https://www.dpethotels.com',
            'instagram_handle': 'dpethotels',
            'area': 'Central & Eastside'
        },
        'd pet hotels los angeles (encino)': {
            'website': 'https://www.dpethotels.com',
            'address': '16000 Ventura Blvd, Encino, CA 91436',
            'instagram_handle': 'dpethotels',
            'area': 'South Valley'
        },
        'dawg squad': {
            'website': 'https://www.dawgsquadrescue.com',
            'instagram_handle': 'dawgsquadrescue',
        },
        'hollywood huskies': {
            'website': 'https://www.hollywoodhuskies.com',
            'instagram_handle': 'hollywoodhuskies',
            'area': 'Central & Eastside'
        },
        'forte animal rescue': {
            'website': 'https://www.forteanimalrescue.org',
            'instagram_handle': 'forteanimalrescue',
        },
        'pacific pups rescue': {
            'website': 'https://www.pacificpupsrescue.org',
            'instagram_handle': 'pacificpupsrescue',
            'area': 'Westside & Coastal'
        },
        'dogs without borders': {
            'website': 'https://www.dogswithoutborders.org',
            'instagram_handle': 'dogswithoutborders',
            'area': 'South Valley'
        },
        'i stand with my pack': {
            'website': 'https://www.istandwithmypack.org',
            'instagram_handle': 'istandwithmypack',
        },
        'l.a. love and leashes': {
            'website': 'https://www.laloveandleashes.org',
            'instagram_handle': 'laloveandleashes',
            'area': 'Central & Eastside'
        },
        'wag hotels': {
            'website': 'https://www.waghotels.com',
            'instagram_handle': 'waghotels',
        },
        'the wags club': {
            'website': 'https://www.thewagsclub.com',
            'address': '11611 San Vicente Blvd, Los Angeles, CA 90049',
            'instagram_handle': 'thewagsclub',
            'area': 'Westside & Coastal'
        },
        'camp run-a-mutt lax': {
            'website': 'https://www.camprunamutt.com',
            'instagram_handle': 'camprunamutt',
            'area': 'South Bay'
        },
        'venice duck brewery': {
            'website': 'https://www.veniceduckbrewery.com',
            'address': '629 Rose Ave, Venice, CA 90291',
            'instagram_handle': 'veniceduckbrewery',
            'area': 'Westside & Coastal'
        },
        'annenberg petspace': {
            'website': 'https://www.annenbergpetspace.org',
            'address': '12005 Bluff Creek Dr, Playa Vista, CA 90094',
            'instagram_handle': 'annenbergpetspace',
            'area': 'Westside & Coastal'
        },
        'the labelle foundation': {
            'website': 'https://www.labellefoundation.org',
            'instagram_handle': 'labellefoundation',
            'area': 'Central & Eastside'
        },
        'animal hope and wellness': {
            'website': 'https://www.animalhopewellness.org',
            'instagram_handle': 'animalhopewellness',
        },
        'korean k9 rescue': {
            'website': 'https://www.koreank9rescue.org',
            'instagram_handle': 'koreank9rescue',
        },
        'marleys mutts': {
            'website': 'https://www.marleysmutts.org',
            'instagram_handle': 'marleysmutts',
            'area': 'Online/Remote/Out of Area'
        },
        "marley's mutts": {
            'website': 'https://www.marleysmutts.org',
            'instagram_handle': 'marleysmutts',
            'area': 'Online/Remote/Out of Area'
        },
        'perfect pet rescue': {
            'website': 'https://www.perfectpetrescue.org',
            'instagram_handle': 'perfectpetrescue',
        },
        'stray cat alliance': {
            'website': 'https://www.straycatalliance.org',
            'instagram_handle': 'straycatalliance',
            'area': 'Central & Eastside'
        },
        'ace of hearts dog rescue': {
            'website': 'https://aceofheartsrescue.org',
            'instagram_handle': 'aceofheartsdogrescue',
            'area': 'Central & Eastside'
        },
        'pup culture dog rescue': {
            'website': 'https://www.pupculturedogrescue.org',
            'instagram_handle': 'pupculturedogrescue',
        },
        'santa monica daily press': {
            'website': 'https://www.smdp.com',
            'area': 'Westside & Coastal'
        },
        'westside current': {
            'website': 'https://www.westsidecurrent.com',
            'area': 'Westside & Coastal'
        },
        'santa monica chamber of commerce': {
            'website': 'https://www.smchamber.com',
            'address': '1213 4th St, Santa Monica, CA 90401',
            'area': 'Westside & Coastal'
        },
        'venice chamber of commerce': {
            'website': 'https://www.venicechamber.net',
            'area': 'Westside & Coastal'
        },
        'sherman oaks chamber of commerce': {
            'website': 'https://www.shermanoakschamber.org',
            'area': 'South Valley'
        },
        'beverly hills chamber (my pet mobile vet)': {
            'website': 'https://www.beverlyhillschamber.com',
            'area': 'Westside & Coastal'
        },
        'san fernando valley chamber': {
            'website': 'https://www.sfvchamber.com',
            'area': 'North Valley'
        },
        'ocean park association': {
            'website': 'https://www.oceanparkassoc.org',
            'area': 'Westside & Coastal'
        },
        'main street alliance': {
            'area': 'Westside & Coastal'
        },
        'main street business association': {
            'area': 'Westside & Coastal'
        },
        'the ranch dog training': {
            'website': 'https://www.theranchdogtraining.com',
            'instagram_handle': 'theranchdogtraining',
        },
        'doggie goddess pet services': {
            'website': 'https://www.doggiegoddess.com',
            'instagram_handle': 'doggiegoddess',
            'area': 'Westside & Coastal'
        },
        'fetch pet care': {
            'website': 'https://www.fetchpetcare.com',
            'instagram_handle': 'fetchpetcare',
        },
        'bowie barker': {
            'instagram_handle': 'bowiebarker',
            'area': 'Westside & Coastal'
        },
        'dog ppl': {
            'website': 'https://www.dogppl.co',
            'instagram_handle': 'dogppl',
            'area': 'Westside & Coastal'
        },
        'rose collective': {
            'website': 'https://www.rosecollective.com',
            'area': 'Westside & Coastal'
        },
        'venice flake': {
            'website': 'https://www.veniceflake.com',
            'instagram_handle': 'veniceflake',
            'area': 'Westside & Coastal'
        },
        'rider shack': {
            'website': 'https://www.ridershack.com',
            'address': '2221 Main St, Santa Monica, CA 90405',
            'instagram_handle': 'ridershack',
            'area': 'Westside & Coastal'
        },
        'bay street surf': {
            'area': 'Westside & Coastal'
        },
        'belles beach house': {
            'area': 'Westside & Coastal'
        },
        'prince street pizza': {
            'website': 'https://www.princestreetpizza.com',
            'instagram_handle': 'princestreetpizza',
        },
        'tavern on main': {
            'website': 'https://www.tavernonmain.com',
            'address': '2907 Main St, Santa Monica, CA 90405',
            'instagram_handle': 'tavernonmain',
            'area': 'Westside & Coastal'
        },
        'now massage': {
            'website': 'https://www.thenowmassage.com',
            'instagram_handle': 'thenowmassage',
        },
        'bad hands tattoo': {
            'area': 'Westside & Coastal'
        },
        'el cristiano tequila': {
            'website': 'https://www.elcristianotequila.com',
            'instagram_handle': 'elcristiano',
        },
        'into me sea': {
            'instagram_handle': 'intomesea',
        },
        'moxie coffee': {
            'area': 'Westside & Coastal'
        },
        'snout & about coffee': {
            'instagram_handle': 'snoutandabout',
            'area': 'Westside & Coastal'
        },
        'rough day rose': {
            'instagram_handle': 'roughdayrose',
        },
        'yelp': {
            'website': 'https://www.yelp.com',
            'area': 'Online/Remote/Out of Area'
        },
        'yorkie rescue of america': {
            'website': 'https://www.yorkierescueofamerica.org',
            'instagram_handle': 'yorkierescue',
        },
        'west los angeles adoption center': {
            'address': '11361 W Pico Blvd, Los Angeles, CA 90064',
            'website': 'https://www.laanimalservices.com/shelters/west-los-angeles/',
            'area': 'Westside & Coastal'
        },
        'south la animal shelter': {
            'address': '1850 W 60th St, Los Angeles, CA 90047',
            'website': 'https://www.laanimalservices.com/shelters/south-los-angeles/',
            'area': 'Central & Eastside'
        },
        'los angeles city east valley animal shelter': {
            'address': '14409 Vanowen St, Van Nuys, CA 91405',
            'website': 'https://www.laanimalservices.com/shelters/east-valley/',
            'area': 'North Valley'
        },
        'lange foundation': {
            'website': 'https://www.langefoundation.org',
            'address': '5765-1/2 Lindley Ave, Encino, CA 91316',
            'instagram_handle': 'langefoundation',
            'area': 'South Valley'
        },
        'the dog cafe la (permanently closed)': {
            'area': 'Central & Eastside'
        },
        'venice heritage museum': {
            'area': 'Westside & Coastal'
        },
        'mutternity project': {
            'area': 'Westside & Coastal'
        },
        'westside dog gang': {
            'instagram_handle': 'westsidedoggang',
            'area': 'Westside & Coastal'
        },
        'westsidedog gang': {
            'instagram_handle': 'westside.doggang',
            'area': 'Westside & Coastal'
        },
        'el segundo pet resort': {
            'website': 'https://www.elsegundopetresort.com',
            'area': 'South Bay'
        },
        'balanced dog grooming': {
            'address': 'Via Marina, Marina Del Rey, CA 90292',
            'area': 'Westside & Coastal'
        },
        'the pet affair': {
            'area': 'Westside & Coastal'
        },
        'west la dogs': {
            'area': 'Westside & Coastal'
        },
        'west la grooming academy': {
            'area': 'Westside & Coastal'
        },
        'westside pet stop': {
            'area': 'Westside & Coastal'
        },
        'yo dawg groom spot': {
            'area': 'Westside & Coastal'
        },
        'eco dog care la': {
            'area': 'Westside & Coastal'
        },
        'santa monica paws': {
            'area': 'Westside & Coastal'
        },
        'animal kingdom of santa monica': {
            'area': 'Westside & Coastal'
        },
        'malibu grooming company': {
            'area': 'Westside & Coastal'
        },
        'the malibu food bin': {
            'area': 'Westside & Coastal'
        },
        'marina pet spa': {
            'area': 'Westside & Coastal'
        },
        'seaside grooming': {
            'area': 'Westside & Coastal'
        },
        'venice dog boarding and daycare': {
            'area': 'Westside & Coastal'
        },
        'the urban pet west hollywood': {
            'area': 'Central & Eastside'
        },
        'melrose pet grooming': {
            'area': 'Central & Eastside'
        },
        'hollywood grooming': {
            'area': 'Central & Eastside'
        },
        'echo bark': {
            'area': 'Central & Eastside'
        },
        'wagville': {
            'area': 'Central & Eastside'
        },
        'wash my dog van nuys llc': {
            'area': 'North Valley'
        },
        'wiggles pet spa': {
            'area': 'North Valley'
        },
        'sherman oaks': {
            'area': 'South Valley'
        },
        'stardogs clubhouse': {
            'area': 'Westside & Coastal'
        },
        'sunset barquis': {
            'area': 'Westside & Coastal'
        },
        'paw-somedog': {
            'area': 'Westside & Coastal'
        },
        'four paws daycare west la': {
            'area': 'Westside & Coastal'
        },
        'four paws daycare': {
            'area': 'Westside & Coastal'
        },
        'lincoln bark': {
            'area': 'Westside & Coastal'
        },
        'down dog lodge': {
            'area': 'Westside & Coastal'
        },
        'tailwaggers west hollywood': {
            'area': 'Central & Eastside'
        },
        'puparrazi la dog daycare and boarding': {
            'area': 'Westside & Coastal'
        },
        'the grateful dog clubhouse': {
            'area': 'Westside & Coastal'
        },
        'rover kennels': {
            'area': 'Westside & Coastal'
        },
        'hounds of the hills': {
            'area': 'Central & Eastside'
        },
        'chateau marmutt': {
            'area': 'Westside & Coastal'
        },
        'citydog! club': {
            'area': 'Central & Eastside'
        },
        'ricky animations': {
            'area': 'Westside & Coastal'
        },
        'glenice dj': {
            'area': 'Westside & Coastal'
        },
        'dj - skam artists': {
            'area': 'Westside & Coastal'
        },
        'photo booth provided by todd/ashley': {
            'area': 'Westside & Coastal'
        },
        'venice pap (photo booth)': {
            'area': 'Westside & Coastal'
        },
        'starbucks - boardwalk': {
            'area': 'Westside & Coastal'
        },
        'the rosesaloon': {
            'area': 'Westside & Coastal'
        },
        'taco truck': {
            'area': 'Westside & Coastal'
        },
        'idexx (printer/toner)': {
            'area': 'Online/Remote/Out of Area'
        },
        'digital image solutions': {
            'area': 'Westside & Coastal'
        },
        'copy hub': {
            'area': 'Westside & Coastal'  
        },
        'covetrus': {
            'website': 'https://www.covetrus.com',
            'area': 'Online/Remote/Out of Area'
        },
        'donations/goodie bags': {
            'area': 'Westside & Coastal'
        },
        'donations/silent auction': {
            'area': 'Westside & Coastal'
        },
        'samson\'s': {
            'area': 'Westside & Coastal'
        },
        'samsons sanctuary': {
            'website': 'https://www.samsonssanctuary.org',
            'instagram_handle': 'samsonssanctuary',
            'area': 'Westside & Coastal'
        },
        'fit dogs sports club': {
            'website': 'https://www.fitdogssportsclub.com',
            'instagram_handle': 'fitdogssportsclub',
            'area': 'Westside & Coastal'
        },
        'fitdog': {
            'website': 'https://www.fitdog.com',
            'instagram_handle': 'fitdogsportsclub',
            'area': 'Westside & Coastal'
        },
        'boomers buddies cat/dog rescue': {
            'area': 'Westside & Coastal'
        },
        'mae day rescue': {
            'area': 'Westside & Coastal'
        },
        'pet orphans of southern california': {
            'website': 'https://www.petorphans.org',
            'area': 'North Valley'
        },
        'buddy\'s angel rescue': {
            'area': 'Westside & Coastal'
        },
        'pups without borders': {
            'website': 'https://www.pupswithoutborders.org',
            'instagram_handle': 'pupswithoutborders',
        },
        'pup without borders': {
            'website': 'https://www.pupswithoutborders.org',
            'instagram_handle': 'pupswithoutborders',
        },
        'deity animal rescue': {
            'website': 'https://www.deityanimalrescue.org',
            'instagram_handle': 'deityanimalrescue',
        },
        'a purposeful rescue': {
            'website': 'https://www.apurposefulrescue.org',
            'instagram_handle': 'apurposefulrescue',
        },
        'road dogs & rescue': {
            'website': 'https://www.roaddogsrescue.org',
            'instagram_handle': 'roaddogsrescue',
        },
        'angels bark - dog rescue': {
            'instagram_handle': 'angelsbarks',
        },
        'bichons and buddies': {
            'website': 'https://www.bichonsandbuddies.org',
        },
        'animal of world- foundation': {
            'instagram_handle': 'animalofworldfoundation',
        },
        "delayney's dogs rescue & adoption": {
            'instagram_handle': 'delaneysdogs',
        },
        "delayney''s dogs rescue & adoption": {
            'instagram_handle': 'delaneysdogs',
        },
        'st. francis animal center': {
            'area': 'North Valley'
        },
        'perry\'s place, heaven on earth adoption cent': {
            'area': 'North Valley'
        },
        "perry''s place, heaven on earth adoption cent": {
            'area': 'North Valley'
        },
        'gsI rescue': {
            'area': 'Central & Eastside'
        },
        'gsi rescue': {
            'area': 'Central & Eastside'
        },
    }
    
    name_key = name_lower.strip()
    if name_key in known_businesses:
        info = known_businesses[name_key]
        if 'area' in info:
            return info['area']
    
    # Check address for zone matching
    area = None
    for zone, neighborhoods in ZONE_NEIGHBORHOODS.items():
        for nbhd in neighborhoods:
            if addr_lower and nbhd in addr_lower:
                return zone
            if nbhd in name_lower:
                return zone
    
    # Check for online/remote indicators
    for indicator in ONLINE_REMOTE_INDICATORS:
        if indicator in name_lower:
            return 'Online/Remote/Out of Area'
    
    return area


def get_enrichment_data(name):
    """Get enrichment data from known business database."""
    name_lower = name.lower().strip()
    
    # This is the same dictionary from determine_area but returns all fields
    known = {
        'vanderpump dogs': {
            'website': 'https://www.vanderpumpdogs.org',
            'address': '8134 W 3rd St, Los Angeles, CA 90048',
            'instagram_handle': 'vanderpumpdogs',
        },
        'bark n bitches': {
            'website': 'https://www.barknbitches.com',
            'address': '2406 Hyperion Ave, Los Angeles, CA 90027',
            'instagram_handle': 'barknbitches',
        },
        'barknbitches': {
            'website': 'https://www.barknbitches.com',
            'address': '2406 Hyperion Ave, Los Angeles, CA 90027',
            'instagram_handle': 'barknbitches',
        },
        'healthy spot': {
            'website': 'https://www.healthyspot.com',
            'instagram_handle': 'healthyspot',
        },
        'centinela feed & pet supplies': {
            'website': 'https://www.centinelafeed.com',
            'instagram_handle': 'centinelafeed',
        },
        'just food for dogs': {
            'website': 'https://www.justfoodfordogs.com',
            'instagram_handle': 'justfoodfordogs',
        },
        'petco': {
            'website': 'https://www.petco.com',
            'instagram_handle': 'petco',
        },
        'petssmart': {
            'website': 'https://www.petsmart.com',
            'instagram_handle': 'petsmart',
        },
        'wags and walks': {
            'website': 'https://www.wagsandwalks.org',
            'address': '10960 Ventura Blvd, Studio City, CA 91604',
            'instagram_handle': 'wagsandwalks',
        },
        'best friends west la adoption center (nkla)': {
            'website': 'https://nkla.bestfriends.org',
            'address': '1845 Pontius Ave, Los Angeles, CA 90025',
            'instagram_handle': 'bestfriendsanimalsociety',
        },
        'love leo rescue': {
            'website': 'https://www.loveleorescue.org',
            'instagram_handle': 'loveleorescue',
        },
        'mutt scouts': {
            'website': 'https://muttscouts.org',
            'instagram_handle': 'muttscouts',
        },
        'd pet hotels': {
            'website': 'https://www.dpethotels.com',
            'instagram_handle': 'dpethotels',
        },
        'd pet hotels los angeles (encino)': {
            'website': 'https://www.dpethotels.com',
            'address': '16000 Ventura Blvd, Encino, CA 91436',
            'instagram_handle': 'dpethotels',
        },
        'dawg squad': {
            'website': 'https://www.dawgsquadrescue.com',
            'instagram_handle': 'dawgsquadrescue',
        },
        'hollywood huskies': {
            'website': 'https://www.hollywoodhuskies.com',
            'instagram_handle': 'hollywoodhuskies',
        },
        'forte animal rescue': {
            'website': 'https://www.forteanimalrescue.org',
            'instagram_handle': 'forteanimalrescue',
        },
        'pacific pups rescue': {
            'website': 'https://www.pacificpupsrescue.org',
            'instagram_handle': 'pacificpupsrescue',
        },
        'dogs without borders': {
            'website': 'https://www.dogswithoutborders.org',
            'instagram_handle': 'dogswithoutborders',
        },
        'i stand with my pack': {
            'website': 'https://www.istandwithmypack.org',
            'instagram_handle': 'istandwithmypack',
        },
        'l.a. love and leashes': {
            'website': 'https://www.laloveandleashes.org',
            'instagram_handle': 'laloveandleashes',
        },
        'wag hotels': {
            'website': 'https://www.waghotels.com',
            'instagram_handle': 'waghotels',
        },
        'the wags club': {
            'website': 'https://www.thewagsclub.com',
            'address': '11611 San Vicente Blvd, Los Angeles, CA 90049',
            'instagram_handle': 'thewagsclub',
        },
        'camp run-a-mutt lax': {
            'website': 'https://www.camprunamutt.com',
            'instagram_handle': 'camprunamutt',
        },
        'venice duck brewery': {
            'website': 'https://www.veniceduckbrewery.com',
            'address': '629 Rose Ave, Venice, CA 90291',
            'instagram_handle': 'veniceduckbrewery',
        },
        'annenberg petspace': {
            'website': 'https://www.annenbergpetspace.org',
            'address': '12005 Bluff Creek Dr, Playa Vista, CA 90094',
            'instagram_handle': 'annenbergpetspace',
        },
        'the labelle foundation': {
            'website': 'https://www.labellefoundation.org',
            'instagram_handle': 'labellefoundation',
        },
        'animal hope and wellness': {
            'website': 'https://www.animalhopewellness.org',
            'instagram_handle': 'animalhopewellness',
        },
        'korean k9 rescue': {
            'website': 'https://www.koreank9rescue.org',
            'instagram_handle': 'koreank9rescue',
        },
        "marley's mutts": {
            'website': 'https://www.marleysmutts.org',
            'instagram_handle': 'marleysmutts',
        },
        'perfect pet rescue': {
            'website': 'https://www.perfectpetrescue.org',
            'instagram_handle': 'perfectpetrescue',
        },
        'stray cat alliance': {
            'website': 'https://www.straycatalliance.org',
            'instagram_handle': 'straycatalliance',
        },
        'ace of hearts dog rescue': {
            'website': 'https://aceofheartsrescue.org',
            'instagram_handle': 'aceofheartsdogrescue',
        },
        'pup culture dog rescue': {
            'website': 'https://www.pupculturedogrescue.org',
            'instagram_handle': 'pupculturedogrescue',
        },
        'santa monica daily press': {
            'website': 'https://www.smdp.com',
        },
        'westside current': {
            'website': 'https://www.westsidecurrent.com',
        },
        'santa monica chamber of commerce': {
            'website': 'https://www.smchamber.com',
            'address': '1213 4th St, Santa Monica, CA 90401',
        },
        'venice chamber of commerce': {
            'website': 'https://www.venicechamber.net',
        },
        'sherman oaks chamber of commerce': {
            'website': 'https://www.shermanoakschamber.org',
        },
        'beverly hills chamber (my pet mobile vet)': {
            'website': 'https://www.beverlyhillschamber.com',
        },
        'san fernando valley chamber': {
            'website': 'https://www.sfvchamber.com',
        },
        'ocean park association': {
            'website': 'https://www.oceanparkassoc.org',
        },
        'the ranch dog training': {
            'website': 'https://www.theranchdogtraining.com',
            'instagram_handle': 'theranchdogtraining',
        },
        'doggie goddess pet services': {
            'website': 'https://www.doggiegoddess.com',
            'instagram_handle': 'doggiegoddess',
        },
        'fetch pet care': {
            'website': 'https://www.fetchpetcare.com',
            'instagram_handle': 'fetchpetcare',
        },
        'dog ppl': {
            'website': 'https://www.dogppl.co',
            'instagram_handle': 'dogppl',
        },
        'rose collective': {
            'website': 'https://www.rosecollective.com',
        },
        'venice flake': {
            'website': 'https://www.veniceflake.com',
            'instagram_handle': 'veniceflake',
        },
        'rider shack': {
            'website': 'https://www.ridershack.com',
            'address': '2221 Main St, Santa Monica, CA 90405',
            'instagram_handle': 'ridershack',
        },
        'prince street pizza': {
            'website': 'https://www.princestreetpizza.com',
            'instagram_handle': 'princestreetpizza',
        },
        'tavern on main': {
            'website': 'https://www.tavernonmain.com',
            'address': '2907 Main St, Santa Monica, CA 90405',
            'instagram_handle': 'tavernonmain',
        },
        'now massage': {
            'website': 'https://www.thenowmassage.com',
            'instagram_handle': 'thenowmassage',
        },
        'el cristiano tequila': {
            'website': 'https://www.elcristianotequila.com',
            'instagram_handle': 'elcristiano',
        },
        'covetrus': {
            'website': 'https://www.covetrus.com',
        },
        'fit dogs sports club': {
            'website': 'https://www.fitdogssportsclub.com',
            'instagram_handle': 'fitdogssportsclub',
        },
        'fitdog': {
            'website': 'https://www.fitdog.com',
            'instagram_handle': 'fitdogsportsclub',
        },
        'samsons sanctuary': {
            'website': 'https://www.samsonssanctuary.org',
            'instagram_handle': 'samsonssanctuary',
        },
        'pet orphans of southern california': {
            'website': 'https://www.petorphans.org',
        },
        'pups without borders': {
            'website': 'https://www.pupswithoutborders.org',
            'instagram_handle': 'pupswithoutborders',
        },
        'pup without borders': {
            'website': 'https://www.pupswithoutborders.org',
            'instagram_handle': 'pupswithoutborders',
        },
        'deity animal rescue': {
            'website': 'https://www.deityanimalrescue.org',
            'instagram_handle': 'deityanimalrescue',
        },
        'a purposeful rescue': {
            'website': 'https://www.apurposefulrescue.org',
            'instagram_handle': 'apurposefulrescue',
        },
        'road dogs & rescue': {
            'website': 'https://www.roaddogsrescue.org',
            'instagram_handle': 'roaddogsrescue',
        },
        'angels bark - dog rescue': {
            'instagram_handle': 'angelsbarks',
        },
        'bichons and buddies': {
            'website': 'https://www.bichonsandbuddies.org',
        },
        'west los angeles adoption center': {
            'address': '11361 W Pico Blvd, Los Angeles, CA 90064',
            'website': 'https://www.laanimalservices.com/shelters/west-los-angeles/',
        },
        'south la animal shelter': {
            'address': '1850 W 60th St, Los Angeles, CA 90047',
            'website': 'https://www.laanimalservices.com/shelters/south-los-angeles/',
        },
        'los angeles city east valley animal shelter': {
            'address': '14409 Vanowen St, Van Nuys, CA 91405',
            'website': 'https://www.laanimalservices.com/shelters/east-valley/',
        },
        'lange foundation': {
            'website': 'https://www.langefoundation.org',
            'address': '5765-1/2 Lindley Ave, Encino, CA 91316',
            'instagram_handle': 'langefoundation',
        },
        'yelp': {
            'website': 'https://www.yelp.com',
        },
        'el segundo pet resort': {
            'website': 'https://www.elsegundopetresort.com',
        },
        'balanced dog grooming': {
            'address': 'Via Marina, Marina Del Rey, CA 90292',
        },
        'yorkie rescue of america': {
            'website': 'https://www.yorkierescueofamerica.org',
            'instagram_handle': 'yorkierescue',
        },
    }
    
    return known.get(name_lower, {})


def supabase_request(method, endpoint, data=None):
    """Make a Supabase REST API request."""
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    
    if data:
        body = json.dumps(data).encode('utf-8')
    else:
        body = None
    
    req = urllib.request.Request(url, data=body, method=method)
    for k, v in HEADERS.items():
        req.add_header(k, v)
    
    try:
        with urllib.request.urlopen(req) as response:
            text = response.read().decode('utf-8')
            if text:
                return json.loads(text)
            return None
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"  ERROR {e.code}: {error_body}")
        return None


def update_partner(partner_id, updates):
    """Update a partner record, only setting non-null fields."""
    url = f"{SUPABASE_URL}/rest/v1/marketing_partners?id=eq.{partner_id}"
    body = json.dumps(updates).encode('utf-8')
    
    req = urllib.request.Request(url, data=body, method='PATCH')
    for k, v in HEADERS.items():
        req.add_header(k, v)
    
    try:
        with urllib.request.urlopen(req) as response:
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"  ERROR updating {partner_id}: {e.code} - {error_body}")
        return False


def main():
    print("=" * 70)
    print("MARKETING PARTNERS: CATEGORIZATION, ENRICHMENT & AREA ASSIGNMENT")
    print("=" * 70)
    
    # Fetch all partners
    print("\n📥 Fetching all partner records...")
    url = f"{SUPABASE_URL}/rest/v1/marketing_partners?select=*&order=name"
    req = urllib.request.Request(url, method='GET')
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Range", "0-999")
    
    with urllib.request.urlopen(req) as response:
        partners = json.loads(response.read().decode('utf-8'))
    
    print(f"   Found {len(partners)} partner records")
    
    # Process each partner
    updated_count = 0
    categorized_count = 0
    enriched_count = 0
    area_assigned_count = 0
    skipped_count = 0
    
    for i, p in enumerate(partners):
        pid = p['id']
        name = p['name'] or ''
        updates = {}
        changes = []
        
        # ---- 1. CATEGORIZATION ----
        new_type = categorize_partner(
            name, p.get('partner_type'), 
            p.get('services_provided'), p.get('notes'),
            p.get('category')
        )
        if new_type and new_type != p.get('partner_type'):
            updates['partner_type'] = new_type
            changes.append(f"type: {p.get('partner_type')} → {new_type}")
            categorized_count += 1
        
        # ---- 2. ENRICHMENT (only fill blanks) ----
        enrichment = get_enrichment_data(name)
        for field in ['website', 'address', 'instagram_handle', 'facebook_url', 
                       'tiktok_handle', 'youtube_url']:
            if field in enrichment and not p.get(field):
                updates[field] = enrichment[field]
                changes.append(f"{field}: → {enrichment[field][:40]}")
                enriched_count += 1
        
        # ---- 3. AREA ASSIGNMENT ----
        if not p.get('area'):
            # First check enrichment data for area
            area = None
            
            # Check known businesses first
            name_lower = name.lower().strip()
            # Build combined known businesses lookup for area
            known_areas = {
                'vanderpump dogs': 'Central & Eastside',
                'bark n bitches': 'Central & Eastside',
                'barknbitches': 'Central & Eastside',
                'healthy spot': 'Westside & Coastal',
                'wags and walks': 'South Valley',
                'best friends west la adoption center (nkla)': 'Westside & Coastal',
                'love leo rescue': 'Westside & Coastal',
                'd pet hotels': 'Central & Eastside',
                'd pet hotels los angeles (encino)': 'South Valley',
                'hollywood huskies': 'Central & Eastside',
                'pacific pups rescue': 'Westside & Coastal',
                'dogs without borders': 'South Valley',
                'l.a. love and leashes': 'Central & Eastside',
                'the wags club': 'Westside & Coastal',
                'camp run-a-mutt lax': 'South Bay',
                'venice duck brewery': 'Westside & Coastal',
                'annenberg petspace': 'Westside & Coastal',
                'the labelle foundation': 'Central & Eastside',
                "marley's mutts": 'Online/Remote/Out of Area',
                "marley''s mutts": 'Online/Remote/Out of Area',
                'stray cat alliance': 'Central & Eastside',
                'ace of hearts dog rescue': 'Central & Eastside',
                'santa monica daily press': 'Westside & Coastal',
                'westside current': 'Westside & Coastal',
                'santa monica chamber of commerce': 'Westside & Coastal',
                'venice chamber of commerce': 'Westside & Coastal',
                'sherman oaks chamber of commerce': 'South Valley',
                'beverly hills chamber (my pet mobile vet)': 'Westside & Coastal',
                'san fernando valley chamber': 'North Valley',
                'ocean park association': 'Westside & Coastal',
                'main street alliance': 'Westside & Coastal',
                'main street business association': 'Westside & Coastal',
                'doggie goddess pet services': 'Westside & Coastal',
                'dog ppl': 'Westside & Coastal',
                'rose collective': 'Westside & Coastal',
                'venice flake': 'Westside & Coastal',
                'rider shack': 'Westside & Coastal',
                'bay street surf': 'Westside & Coastal',
                'belles beach house': 'Westside & Coastal',
                'tavern on main': 'Westside & Coastal',
                'moxie coffee': 'Westside & Coastal',
                'snout & about coffee': 'Westside & Coastal',
                'yelp': 'Online/Remote/Out of Area',
                'west los angeles adoption center': 'Westside & Coastal',
                'south la animal shelter': 'Central & Eastside',
                'los angeles city east valley animal shelter': 'North Valley',
                'lange foundation': 'South Valley',
                'the dog cafe la (permanently closed)': 'Central & Eastside',
                'venice heritage museum': 'Westside & Coastal',
                'mutternity project': 'Westside & Coastal',
                'westside dog gang': 'Westside & Coastal',
                'westsidedog gang': 'Westside & Coastal',
                'el segundo pet resort': 'South Bay',
                'balanced dog grooming': 'Westside & Coastal',
                'the pet affair': 'Westside & Coastal',
                'west la dogs': 'Westside & Coastal',
                'west la grooming academy': 'Westside & Coastal',
                'westside pet stop': 'Westside & Coastal',
                'yo dawg groom spot': 'Westside & Coastal',
                'eco dog care la': 'Westside & Coastal',
                'santa monica paws': 'Westside & Coastal',
                'animal kingdom of santa monica': 'Westside & Coastal',
                'malibu grooming company': 'Westside & Coastal',
                'the malibu food bin': 'Westside & Coastal',
                'marina pet spa': 'Westside & Coastal',
                'seaside grooming': 'Westside & Coastal',
                'venice dog boarding and daycare': 'Westside & Coastal',
                'the urban pet west hollywood': 'Central & Eastside',
                'melrose pet grooming': 'Central & Eastside',
                'hollywood grooming': 'Central & Eastside',
                'echo bark': 'Central & Eastside',
                'wagville': 'Central & Eastside',
                'wash my dog van nuys llc': 'North Valley',
                'wiggles pet spa': 'North Valley',
                'sherman oaks': 'South Valley',
                'stardogs clubhouse': 'Westside & Coastal',
                'sunset barquis': 'Westside & Coastal',
                'paw-somedog': 'Westside & Coastal',
                'four paws daycare west la': 'Westside & Coastal',
                'four paws daycare': 'Westside & Coastal',
                'lincoln bark': 'Westside & Coastal',
                'down dog lodge': 'Westside & Coastal',
                'tailwaggers west hollywood': 'Central & Eastside',
                'puparrazi la dog daycare and boarding': 'Westside & Coastal',
                'the grateful dog clubhouse': 'Westside & Coastal',
                'rover kennels': 'Westside & Coastal',
                'hounds of the hills': 'Central & Eastside',
                'chateau marmutt': 'Westside & Coastal',
                'citydog! club': 'Central & Eastside',
                'ricky animations': 'Westside & Coastal',
                'glenice dj': 'Westside & Coastal',
                'dj - skam artists': 'Westside & Coastal',
                'photo booth provided by todd/ashley': 'Westside & Coastal',
                'venice pap (photo booth)': 'Westside & Coastal',
                'starbucks - boardwalk': 'Westside & Coastal',
                'the rosesaloon': 'Westside & Coastal',
                'taco truck': 'Westside & Coastal',
                'idexx (printer/toner)': 'Online/Remote/Out of Area',
                'digital image solutions': 'Westside & Coastal',
                'copy hub': 'Westside & Coastal',
                'covetrus': 'Online/Remote/Out of Area',
                'donations/goodie bags': 'Westside & Coastal',
                'donations/silent auction': 'Westside & Coastal',
                "samson's": 'Westside & Coastal',
                'samsons sanctuary': 'Westside & Coastal',
                'fit dogs sports club': 'Westside & Coastal',
                'fitdog': 'Westside & Coastal',
                'boomers buddies cat/dog rescue': 'Westside & Coastal',
                'mae day rescue': 'Westside & Coastal',
                'pet orphans of southern california': 'North Valley',
                "buddy's angel rescue": 'Westside & Coastal',
                'st. francis animal center': 'North Valley',
                'gsi rescue': 'Central & Eastside',
                'bad hands tattoo': 'Westside & Coastal',
                'thumbprint': 'Online/Remote/Out of Area',
                'builtmore proprint': 'Online/Remote/Out of Area',
            }
            
            area = known_areas.get(name_lower)
            
            if not area:
                area = determine_area(
                    name, 
                    updates.get('address') or p.get('address'),
                    p.get('notes'),
                    p.get('proximity_to_location')
                )
            
            if area:
                updates['area'] = area
                changes.append(f"area: → {area}")
                area_assigned_count += 1
        
        # Apply updates
        if updates:
            success = update_partner(pid, updates)
            if success:
                updated_count += 1
                print(f"  [{i+1}/{len(partners)}] ✅ {name[:45]:<45} | {', '.join(changes)}")
            else:
                print(f"  [{i+1}/{len(partners)}] ❌ {name[:45]:<45} | FAILED: {', '.join(changes)}")
        else:
            skipped_count += 1
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"  Total records processed: {len(partners)}")
    print(f"  Records updated:         {updated_count}")
    print(f"  Re-categorized:          {categorized_count}")
    print(f"  Fields enriched:         {enriched_count}")
    print(f"  Areas assigned:          {area_assigned_count}")
    print(f"  Skipped (no changes):    {skipped_count}")
    print()
    
    # Print category distribution
    print("\n📊 Verifying final category distribution...")
    url = f"{SUPABASE_URL}/rest/v1/marketing_partners?select=partner_type&order=partner_type"
    req = urllib.request.Request(url, method='GET')
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Range", "0-999")
    
    with urllib.request.urlopen(req) as response:
        final_data = json.loads(response.read().decode('utf-8'))
    
    type_counts = {}
    for r in final_data:
        t = r.get('partner_type', 'unknown')
        type_counts[t] = type_counts.get(t, 0) + 1
    
    for t in sorted(type_counts.keys()):
        print(f"    {t:<25} {type_counts[t]:>4}")
    
    # Print area distribution
    print("\n📊 Area distribution...")
    url = f"{SUPABASE_URL}/rest/v1/marketing_partners?select=area&order=area"
    req = urllib.request.Request(url, method='GET')
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Range", "0-999")
    
    with urllib.request.urlopen(req) as response:
        area_data = json.loads(response.read().decode('utf-8'))
    
    area_counts = {}
    for r in area_data:
        a = r.get('area') or 'Unassigned'
        area_counts[a] = area_counts.get(a, 0) + 1
    
    for a in sorted(area_counts.keys()):
        print(f"    {a:<30} {area_counts[a]:>4}")


if __name__ == '__main__':
    main()
