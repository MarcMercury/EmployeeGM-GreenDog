import type { OrgChartEmployee, OrgChartNode } from '~/utils/orgChart'
import { buildOrgTree, countTreeNodes, getTreeDepth } from '~/utils/orgChart'

export function useOrgChart() {
  const supabase = useSupabaseClient()
  
  // Fetch employees with org chart data
  const { data: employees, pending, error, refresh } = useAsyncData<OrgChartEmployee[]>(
    'org-chart-employees',
    async () => {
      // First try the view (if migration has been run)
      const { data: viewData, error: viewError } = await supabase
        .from('employee_locations_view')
        .select('*')
      
      if (!viewError && viewData) {
        return viewData as OrgChartEmployee[]
      }
      
      // Fallback: Query employees directly with joins
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          manager_employee_id,
          location_id,
          department_id,
          employment_status,
          position:job_positions(id, title),
          department:departments(id, name),
          primary_location:locations(id, name),
          profile:profiles(avatar_url)
        `)
        .eq('employment_status', 'active')
      
      if (error) {
        console.error('Error fetching org chart data:', error)
        throw error
      }
      
      // Transform to OrgChartEmployee format
      return (data || []).map((emp: any) => ({
        id: emp.id,
        employee_id: emp.id,
        first_name: emp.first_name || '',
        last_name: emp.last_name || '',
        full_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        job_title: emp.position?.title || null,
        department_name: emp.department?.name || null,
        department_id: emp.department_id,
        manager_employee_id: emp.manager_employee_id,
        primary_location_id: emp.location_id,
        primary_location_name: emp.primary_location?.name || null,
        assigned_locations: emp.primary_location ? [{
          id: emp.location_id,
          name: emp.primary_location.name,
          is_primary: true
        }] : [],
        avatar_url: emp.profile?.avatar_url || null
      }))
    },
    {
      default: () => [],
      watch: false
    }
  )
  
  // Build the tree from employees
  const orgTree = computed<OrgChartNode[]>(() => {
    if (!employees.value || employees.value.length === 0) {
      return []
    }
    return buildOrgTree(employees.value)
  })
  
  // Stats
  const totalEmployees = computed(() => countTreeNodes(orgTree.value))
  const treeDepth = computed(() => getTreeDepth(orgTree.value))
  const rootNodes = computed(() => orgTree.value.length)
  
  // Department colors for visual distinction
  const departmentColors: Record<string, string> = {
    'Veterinary Medicine': '#4CAF50',
    'Veterinary': '#4CAF50',
    'Surgery': '#2196F3',
    'Dental': '#9C27B0',
    'Administration': '#FF9800',
    'Reception': '#00BCD4',
    'Technicians': '#E91E63',
    'Management': '#673AB7',
    'Operations': '#795548',
    'Marketing': '#FF5722',
    'default': '#607D8B'
  }
  
  function getDepartmentColor(departmentName: string | null): string {
    if (!departmentName) return departmentColors.default
    
    // Try exact match first
    if (departmentColors[departmentName]) {
      return departmentColors[departmentName]
    }
    
    // Try partial match
    for (const [key, color] of Object.entries(departmentColors)) {
      if (departmentName.toLowerCase().includes(key.toLowerCase())) {
        return color
      }
    }
    
    return departmentColors.default
  }
  
  // Search/filter functionality
  const searchQuery = ref('')
  
  const filteredTree = computed<OrgChartNode[]>(() => {
    if (!searchQuery.value.trim()) {
      return orgTree.value
    }
    
    const query = searchQuery.value.toLowerCase()
    
    // Filter function that preserves tree structure
    function filterNodes(nodes: OrgChartNode[]): OrgChartNode[] {
      return nodes.reduce<OrgChartNode[]>((acc, node) => {
        const matchesSearch = 
          node.full_name.toLowerCase().includes(query) ||
          (node.job_title?.toLowerCase().includes(query) ?? false) ||
          (node.department_name?.toLowerCase().includes(query) ?? false) ||
          (node.primary_location_name?.toLowerCase().includes(query) ?? false)
        
        const filteredChildren = filterNodes(node.children)
        
        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren,
            isExpanded: true // Auto-expand when searching
          })
        }
        
        return acc
      }, [])
    }
    
    return filterNodes(orgTree.value)
  })
  
  // Toggle expand/collapse for a node
  function toggleNode(employeeId: string) {
    function toggle(nodes: OrgChartNode[]): boolean {
      for (const node of nodes) {
        if (node.employee_id === employeeId) {
          node.isExpanded = !node.isExpanded
          return true
        }
        if (node.children.length > 0 && toggle(node.children)) {
          return true
        }
      }
      return false
    }
    toggle(orgTree.value)
  }
  
  // Expand/collapse all
  function expandAll() {
    function setExpanded(nodes: OrgChartNode[], expanded: boolean) {
      nodes.forEach(node => {
        node.isExpanded = expanded
        if (node.children.length > 0) {
          setExpanded(node.children, expanded)
        }
      })
    }
    setExpanded(orgTree.value, true)
  }
  
  function collapseAll() {
    function setExpanded(nodes: OrgChartNode[], expanded: boolean) {
      nodes.forEach(node => {
        node.isExpanded = expanded
        if (node.children.length > 0) {
          setExpanded(node.children, expanded)
        }
      })
    }
    setExpanded(orgTree.value, false)
  }
  
  return {
    // Data
    employees,
    orgTree,
    filteredTree,
    
    // Loading state
    pending,
    error,
    refresh,
    
    // Stats
    totalEmployees,
    treeDepth,
    rootNodes,
    
    // Search
    searchQuery,
    
    // Actions
    toggleNode,
    expandAll,
    collapseAll,
    
    // Helpers
    getDepartmentColor
  }
}
