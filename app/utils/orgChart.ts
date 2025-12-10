// Types for Org Chart
export interface OrgChartEmployee {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  full_name: string
  job_title: string | null
  department_name: string | null
  department_id: string | null
  manager_employee_id: string | null
  primary_location_id: string | null
  primary_location_name: string | null
  assigned_locations: Array<{
    id: string
    name: string
    is_primary: boolean
  }>
  avatar_url?: string | null
}

export interface OrgChartNode extends OrgChartEmployee {
  children: OrgChartNode[]
  level: number
  isExpanded: boolean
}

/**
 * Transforms a flat array of employees into a nested tree structure
 * based on the manager_employee_id (reports_to) relationship
 */
export function buildOrgTree(employees: OrgChartEmployee[]): OrgChartNode[] {
  // Create a map for quick lookup
  const employeeMap = new Map<string, OrgChartNode>()
  
  // Initialize all employees as nodes
  employees.forEach(emp => {
    employeeMap.set(emp.employee_id, {
      ...emp,
      children: [],
      level: 0,
      isExpanded: true
    })
  })
  
  const roots: OrgChartNode[] = []
  
  // Build the tree
  employees.forEach(emp => {
    const node = employeeMap.get(emp.employee_id)!
    
    if (!emp.manager_employee_id) {
      // This is a root node (no manager)
      roots.push(node)
    } else {
      // Find parent and add as child
      const parent = employeeMap.get(emp.manager_employee_id)
      if (parent) {
        parent.children.push(node)
      } else {
        // Manager not found in the list, treat as root
        roots.push(node)
      }
    }
  })
  
  // Set levels recursively
  function setLevels(nodes: OrgChartNode[], level: number) {
    nodes.forEach(node => {
      node.level = level
      if (node.children.length > 0) {
        setLevels(node.children, level + 1)
      }
    })
  }
  
  setLevels(roots, 0)
  
  // Sort children by name at each level
  function sortChildren(nodes: OrgChartNode[]) {
    nodes.sort((a, b) => a.full_name.localeCompare(b.full_name))
    nodes.forEach(node => {
      if (node.children.length > 0) {
        sortChildren(node.children)
      }
    })
  }
  
  sortChildren(roots)
  
  return roots
}

/**
 * Flattens the tree back to an array (useful for search/filter)
 */
export function flattenOrgTree(nodes: OrgChartNode[]): OrgChartNode[] {
  const result: OrgChartNode[] = []
  
  function traverse(nodeList: OrgChartNode[]) {
    nodeList.forEach(node => {
      result.push(node)
      if (node.children.length > 0) {
        traverse(node.children)
      }
    })
  }
  
  traverse(nodes)
  return result
}

/**
 * Counts total employees in tree
 */
export function countTreeNodes(nodes: OrgChartNode[]): number {
  let count = 0
  
  function traverse(nodeList: OrgChartNode[]) {
    nodeList.forEach(node => {
      count++
      if (node.children.length > 0) {
        traverse(node.children)
      }
    })
  }
  
  traverse(nodes)
  return count
}

/**
 * Gets the maximum depth of the tree
 */
export function getTreeDepth(nodes: OrgChartNode[]): number {
  let maxDepth = 0
  
  function traverse(nodeList: OrgChartNode[], depth: number) {
    nodeList.forEach(node => {
      maxDepth = Math.max(maxDepth, depth)
      if (node.children.length > 0) {
        traverse(node.children, depth + 1)
      }
    })
  }
  
  traverse(nodes, 1)
  return maxDepth
}

/**
 * Finds a node by employee ID
 */
export function findNodeById(nodes: OrgChartNode[], employeeId: string): OrgChartNode | null {
  for (const node of nodes) {
    if (node.employee_id === employeeId) {
      return node
    }
    if (node.children.length > 0) {
      const found = findNodeById(node.children, employeeId)
      if (found) return found
    }
  }
  return null
}

/**
 * Gets all ancestors of a node (for highlighting path)
 */
export function getAncestorIds(nodes: OrgChartNode[], employeeId: string): string[] {
  const ancestors: string[] = []
  
  function findPath(nodeList: OrgChartNode[], targetId: string, path: string[]): boolean {
    for (const node of nodeList) {
      if (node.employee_id === targetId) {
        ancestors.push(...path)
        return true
      }
      if (node.children.length > 0) {
        if (findPath(node.children, targetId, [...path, node.employee_id])) {
          return true
        }
      }
    }
    return false
  }
  
  findPath(nodes, employeeId, [])
  return ancestors
}
