/**
 * Update Marketing Inventory from CSV spreadsheet
 * 
 * Reads the "Marketing Spreadsheets.xlsx - Inventory.csv" file and:
 * 1. Updates quantities for existing items (matches by name)
 * 2. Inserts new items not already in the database
 * 3. Removes duplicate empty records
 * 4. Normalizes categories to valid UI values
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Valid categories for the UI
const VALID_CATEGORIES = ['apparel', 'emp_apparel', 'print', 'prize', 'product', 'supply', 'other']

// Map old/invalid categories to valid ones
const CATEGORY_MAP: Record<string, string> = {
  brochures: 'print',
  flyers: 'print',
  promotional_items: 'supply',
  supplies: 'supply',
}

interface CsvItem {
  item_name: string
  notes: string
  boxes_on_hand: number | null
  quantity_venice: number
  quantity_sherman_oaks: number
  quantity_valley: number
  reorder_point: number | null
  last_ordered: string | null
  category: string // will be assigned based on section
}

function parseNumber(val: string): number {
  if (!val || !val.trim()) return 0
  const cleaned = val.trim().replace(/,/g, '')
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? 0 : num
}

function parseBoxes(val: string): number | null {
  if (!val || !val.trim()) return null
  const cleaned = val.trim()
  // Handle "1/2 box" -> 0.5, "4 rolls" -> 4, "1 box" -> 1, etc.
  if (cleaned.includes('1/2')) return 1  // round up to 1
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? null : num
}

function parseDate(val: string): string | null {
  if (!val || !val.trim()) return null
  const cleaned = val.trim()
  // Try M/D/YYYY format
  const parts = cleaned.split('/')
  if (parts.length === 3) {
    const month = parts[0].padStart(2, '0')
    const day = parts[1].padStart(2, '0')
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
    return `${year}-${month}-${day}`
  }
  return null
}

function parseCsv(): CsvItem[] {
  const csvPath = path.join(__dirname, '..', 'public', 'Marketing Spreadsheets.xlsx - Inventory.csv')
  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n')
  
  const items: CsvItem[] = []
  let section = 1 // 1 = print materials, 2 = swag/promo
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // Detect section break (second header row)
    if (i > 0 && line.startsWith('Notes,Column 10,Item')) {
      section = 2
      continue
    }
    
    // Skip header rows
    if (line.startsWith('Notes,Contact,Item') || line.startsWith('Notes,Column 10,Item')) {
      continue
    }
    
    // Parse CSV (simple - handle quoted fields)
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(current)
        current = ''
      } else {
        current += char
      }
    }
    fields.push(current)
    
    // Section 1: Notes(0), Contact(1), Item(2), Boxes(3), Venice(4), ShermanOaks(5), Valley(6), ReorderPt(7), LastOrdered(8), Col10(9)
    // Section 2: Notes(0), Column10(1), Item(2), Boxes(3), Venice(4), ShermanOaks(5), Valley(6), ReorderPt(7), LastOrdered(8), ForAdopapalooza(9)
    
    const itemName = fields[2]?.trim()
    if (!itemName || itemName === 'Item') continue
    
    // Determine category based on item and section
    let category = section === 1 ? 'print' : 'supply'
    // Override for specific items
    const nameLower = itemName.toLowerCase()
    if (nameLower.includes('tote bag') || nameLower.includes('bandana') || nameLower.includes('beanie') || nameLower.includes('scrub cap') || nameLower.includes('hat')) {
      category = 'apparel'
    } else if (nameLower.includes('poop bag') || nameLower.includes('pen') || nameLower.includes('lanyard') || nameLower.includes('pin') || nameLower.includes('magnet') || nameLower.includes('pill organizer')) {
      category = 'prize'
    } else if (nameLower.includes('dental dust') || nameLower.includes('smile spray') && !nameLower.includes('card')) {
      category = 'product'
    } else if (nameLower.includes('note pad') || nameLower.includes('ticket')) {
      category = 'supply'
    }
    
    const item: CsvItem = {
      item_name: itemName,
      notes: fields[0]?.trim() || '',
      boxes_on_hand: parseBoxes(fields[3] || ''),
      quantity_venice: parseNumber(fields[4] || ''),
      quantity_sherman_oaks: parseNumber(fields[5] || ''),
      quantity_valley: parseNumber(fields[6] || ''),
      reorder_point: parseNumber(fields[7] || '') || null,
      last_ordered: parseDate(fields[8] || ''),
      category,
    }
    
    items.push(item)
  }
  
  return items
}

async function main() {
  console.log('=== Marketing Inventory Update from CSV ===\n')
  
  // 1. Parse CSV
  const csvItems = parseCsv()
  console.log(`Parsed ${csvItems.length} items from CSV:\n`)
  csvItems.forEach(item => {
    console.log(`  ${item.item_name}: V=${item.quantity_venice}, SO=${item.quantity_sherman_oaks}, Val=${item.quantity_valley}, Boxes=${item.boxes_on_hand}, Ordered=${item.last_ordered}, Notes="${item.notes}", Cat=${item.category}`)
  })
  
  // 2. Fetch all current inventory
  const { data: existing, error } = await supabase
    .from('marketing_inventory')
    .select('*')
    .order('item_name')
  
  if (error) {
    console.error('Failed to fetch inventory:', error)
    process.exit(1)
  }
  
  console.log(`\nFound ${existing.length} existing inventory records\n`)
  
  // 3. Build a map of existing items by normalized name
  const existingByName = new Map<string, typeof existing>()
  for (const item of existing) {
    const key = item.item_name.toLowerCase().trim()
    if (!existingByName.has(key)) existingByName.set(key, [])
    existingByName.get(key)!.push(item)
  }
  
  // 4. Process CSV items - update or insert
  let updated = 0
  let inserted = 0
  let duplicatesRemoved = 0
  
  for (const csvItem of csvItems) {
    const nameKey = csvItem.item_name.toLowerCase().trim()
    
    // Try exact match first, then fuzzy
    let matches = existingByName.get(nameKey)
    
    // Try alternate name matching for known variations
    if (!matches) {
      // "Urgen Care Flyers Venice" vs "Urgent Care Flyers Venice"
      for (const [key, items] of existingByName) {
        if (key.replace(/\s+/g, '').includes(nameKey.replace(/\s+/g, '')) ||
            nameKey.replace(/\s+/g, '').includes(key.replace(/\s+/g, ''))) {
          matches = items
          break
        }
      }
    }
    
    if (matches && matches.length > 0) {
      // Find the "best" record to keep (prefer one with data, or the first one)
      const hasData = matches.find(m => m.total_quantity > 0)
      const primary = hasData || matches[0]
      
      // Build update payload
      const updatePayload: Record<string, any> = {
        quantity_venice: csvItem.quantity_venice,
        quantity_sherman_oaks: csvItem.quantity_sherman_oaks,
        quantity_valley: csvItem.quantity_valley,
      }
      
      // Only update these if CSV has data
      if (csvItem.boxes_on_hand !== null) updatePayload.boxes_on_hand = csvItem.boxes_on_hand
      if (csvItem.last_ordered) updatePayload.last_ordered = csvItem.last_ordered
      if (csvItem.notes) updatePayload.notes = csvItem.notes
      
      // Normalize category if invalid
      const currentCat = primary.category
      if (!VALID_CATEGORIES.includes(currentCat)) {
        updatePayload.category = CATEGORY_MAP[currentCat] || csvItem.category
      }
      
      const { error: updateError } = await supabase
        .from('marketing_inventory')
        .update(updatePayload)
        .eq('id', primary.id)
      
      if (updateError) {
        console.error(`  ❌ Failed to update "${csvItem.item_name}":`, updateError.message)
      } else {
        console.log(`  ✅ Updated "${csvItem.item_name}" (id: ${primary.id}) — V:${csvItem.quantity_venice} SO:${csvItem.quantity_sherman_oaks} Val:${csvItem.quantity_valley}`)
        updated++
      }
      
      // Remove duplicate empty records for this item
      const duplicates = matches.filter(m => m.id !== primary.id)
      for (const dup of duplicates) {
        const { error: delError } = await supabase
          .from('marketing_inventory')
          .delete()
          .eq('id', dup.id)
        
        if (!delError) {
          console.log(`  🗑️  Removed duplicate "${dup.item_name}" (id: ${dup.id}, cat: ${dup.category}, total: ${dup.total_quantity})`)
          duplicatesRemoved++
        }
      }
    } else {
      // Insert new item
      const insertPayload = {
        item_name: csvItem.item_name,
        category: csvItem.category,
        quantity_venice: csvItem.quantity_venice,
        quantity_sherman_oaks: csvItem.quantity_sherman_oaks,
        quantity_valley: csvItem.quantity_valley,
        quantity_mpmv: 0,
        quantity_offsite: 0,
        boxes_on_hand: csvItem.boxes_on_hand,
        reorder_point: csvItem.reorder_point || 100,
        last_ordered: csvItem.last_ordered,
        notes: csvItem.notes || null,
      }
      
      const { error: insertError } = await supabase
        .from('marketing_inventory')
        .insert(insertPayload)
      
      if (insertError) {
        console.error(`  ❌ Failed to insert "${csvItem.item_name}":`, insertError.message)
      } else {
        console.log(`  ➕ Inserted "${csvItem.item_name}" — V:${csvItem.quantity_venice} SO:${csvItem.quantity_sherman_oaks} Val:${csvItem.quantity_valley}`)
        inserted++
      }
    }
  }
  
  // 5. Clean up the "Item" record (header row that was accidentally imported)
  const { error: cleanupError } = await supabase
    .from('marketing_inventory')
    .delete()
    .eq('item_name', 'Item')
  
  if (!cleanupError) {
    console.log('\n  🗑️  Cleaned up "Item" record (was imported header row)')
  }
  
  // 6. Normalize all remaining invalid categories
  console.log('\n--- Normalizing remaining categories ---')
  for (const [oldCat, newCat] of Object.entries(CATEGORY_MAP)) {
    const { data: toFix } = await supabase
      .from('marketing_inventory')
      .select('id, item_name')
      .eq('category', oldCat)
    
    if (toFix && toFix.length > 0) {
      const { error: catError } = await supabase
        .from('marketing_inventory')
        .update({ category: newCat })
        .eq('category', oldCat)
      
      if (!catError) {
        console.log(`  ✅ Normalized ${toFix.length} items from "${oldCat}" → "${newCat}"`)
      }
    }
  }
  
  console.log(`\n=== Summary ===`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Inserted: ${inserted}`)
  console.log(`  Duplicates removed: ${duplicatesRemoved}`)
  console.log(`  Done!`)
}

main().catch(console.error)
