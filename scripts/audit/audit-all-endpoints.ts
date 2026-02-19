#!/usr/bin/env node

/**
 * Comprehensive Endpoint Audit Script
 * Scans all Vue/TS files for API calls and verifies endpoints exist
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

interface ApiCall {
  endpoint: string
  file: string
  line: number
  context: string
  method?: string
}

interface EndpointAnalysis {
  endpoint: string
  exists: boolean
  actualFile?: string
  calls: ApiCall[]
}

// Find all $fetch calls with their endpoints
function extractApiCalls(content: string, filePath: string): ApiCall[] {
  const calls: ApiCall[] = []
  const lines = content.split('\n')
  
  lines.forEach((line, index) => {
    // Simple pattern to find $fetch with /api/
    if (!line.includes('$fetch') || !line.includes('/api')) {
      return
    }
    
    // Extract endpoints using a simpler approach
    const apiMatches = line.match(/[`'"]([^`'"]*\/api[^`'"]*)[`'"]/g)
    if (apiMatches) {
      apiMatches.forEach(match => {
        let endpoint = match.slice(1, -1) // Remove quotes
        
        // Remove query params and variables for comparison
        endpoint = endpoint.split('?')[0]
        endpoint = endpoint.split('#')[0]
        endpoint = endpoint.replace(/\${[^}]+}/g, '[param]')
        endpoint = endpoint.replace(/\${\w+}/g, '[param]')
        
        // Skip duplicates in same call
        if (!calls.find(c => c.endpoint === endpoint && c.line === index + 1)) {
          calls.push({
            endpoint,
            file: filePath,
            line: index + 1,
            context: line.trim(),
            method: line.includes("method: 'POST'") || line.includes('method: "POST"') ? 'POST' : 
                   line.includes("method: 'PUT'") || line.includes('method: "PUT"') ? 'PUT' :
                   line.includes("method: 'DELETE'") || line.includes('method: "DELETE"') ? 'DELETE' : 'GET'
          })
        }
      })
    }
  })
  
  return calls
}

// Get all API endpoint files
function getApiEndpoints(): string[] {
  const apiDir = path.join(rootDir, 'server', 'api')
  const endpoints: string[] = []
  
  function walkDir(dir: string) {
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const full = path.join(dir, file)
      if (fs.statSync(full).isDirectory()) {
        walkDir(full)
      } else if (file.endsWith('.ts')) {
        // Convert file path to API endpoint path
        let apiPath = full.replace(apiDir, '')
            .replace(/\\/g, '/')
            .replace(/\.ts$/, '')
            .replace(/index$/, '')
            .replace(/\.(get|post|put|delete|patch)$/, '')
        
        // Remove trailing slash
        if (apiPath.endsWith('/')) apiPath = apiPath.slice(0, -1)
        
        endpoints.push('/api' + apiPath)
      }
    })
  }
  
  walkDir(apiDir)
  return endpoints
}

// Find all Vue and TS files
function findAllFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = []
  const files = fs.readdirSync(dir, { withFileTypes: true })
  
  files.forEach(file => {
    const full = path.join(dir, file.name)
    if (file.isDirectory() && !['node_modules', '.nuxt', 'dist'].includes(file.name)) {
      results.push(...findAllFiles(full, pattern))
    } else if (pattern.test(file.name)) {
      results.push(full)
    }
  })
  
  return results
}

// Main audit
async function auditEndpoints() {
  console.log('🔍 Starting comprehensive endpoint audit...\n')
  
  const vueFiles = findAllFiles(path.join(rootDir, 'app'), /\.(vue|ts)$/)
  const serverFiles = findAllFiles(path.join(rootDir, 'server'), /\.(ts)$/)
  
  const allApiCalls: ApiCall[] = []
  
  // Extract API calls from Vue files
  vueFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8')
    const calls = extractApiCalls(content, file.replace(rootDir, ''))
    allApiCalls.push(...calls)
  })
  
  // Extract API calls from server files
  serverFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8')
    const calls = extractApiCalls(content, file.replace(rootDir, ''))
    allApiCalls.push(...calls)
  })
  
  const existingEndpoints = getApiEndpoints()
  
  // Group calls by endpoint
  const endpointMap = new Map<string, ApiCall[]>()
  allApiCalls.forEach(call => {
    if (!endpointMap.has(call.endpoint)) {
      endpointMap.set(call.endpoint, [])
    }
    endpointMap.get(call.endpoint)!.push(call)
  })
  
  // Analyze which endpoints are missing
  const missing: EndpointAnalysis[] = []
  const existing: EndpointAnalysis[] = []
  
  endpointMap.forEach((calls, endpoint) => {
    // Check for exact match
    const exactMatch = existingEndpoints.find(e => e === endpoint)
    // Check for match with [id] or [param]
    const paramMatch = existingEndpoints.find(e => 
      e === endpoint ||
      e.replace(/\[.*?\]/g, '[param]') === endpoint.replace(/\[.*?\]/g, '[param]')
    )
    
    if (exactMatch || paramMatch) {
      existing.push({
        endpoint,
        exists: true,
        actualFile: exactMatch || paramMatch,
        calls
      })
    } else {
      missing.push({
        endpoint,
        exists: false,
        calls
      })
    }
  })
  
  // Report
  console.log(`📊 AUDIT RESULTS`)
  console.log(`├─ Total API calls found: ${allApiCalls.length}`)
  console.log(`├─ Unique endpoints called: ${endpointMap.size}`)
  console.log(`├─ Endpoints that exist: ${existing.length}`)
  console.log(`└─ MISSING ENDPOINTS: ${missing.length}\n`)
  
  if (missing.length > 0) {
    console.log('❌ MISSING ENDPOINTS (CRITICAL ISSUES):\n')
    missing.forEach(item => {
      console.log(`📍 ${item.endpoint}`)
      console.log(`   Called from: ${item.calls.length} location(s)`)
      item.calls.slice(0, 3).forEach(call => {
        console.log(`   └─ ${call.file}:${call.line} [${call.method || 'GET'}]`)
      })
      if (item.calls.length > 3) {
        console.log(`   └─ ... and ${item.calls.length - 3} more`)
      }
      console.log()
    })
  }
  
  // Write detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalApiCalls: allApiCalls.length,
      uniqueEndpoints: endpointMap.size,
      existingEndpoints: existing.length,
      missingEndpoints: missing.length,
    },
    missing: missing.map(m => ({
      endpoint: m.endpoint,
      callCount: m.calls.length,
      calledFrom: m.calls.map(c => ({
        file: c.file,
        line: c.line,
        method: c.method,
        context: c.context.substring(0, 100)
      }))
    })),
    existing: existing.map(e => ({
      endpoint: e.endpoint,
      callCount: e.calls.length,
      actualFile: e.actualFile
    }))
  }
  
  fs.writeFileSync(
    path.join(rootDir, 'audit-endpoints-report.json'),
    JSON.stringify(report, null, 2)
  )
  
  console.log(`\n✅ Full report saved to: audit-endpoints-report.json`)
  
  return missing.length === 0
}

auditEndpoints().then(success => {
  process.exit(success ? 0 : 1)
}).catch(err => {
  console.error('❌ Audit failed:', err)
  process.exit(1)
})
