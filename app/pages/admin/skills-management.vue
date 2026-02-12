<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Skills Management</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage the skill library, edit employee proficiency, and track organization-wide skill health
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          v-if="activeTab === 'library'"
          color="primary"
          prepend-icon="mdi-plus"
          @click="showAddDialog = true"
        >
          Add Skill
        </v-btn>
        <v-btn
          v-if="activeTab === 'analytics'"
          color="primary"
          variant="outlined"
          prepend-icon="mdi-download"
          @click="exportReport"
        >
          Export Report
        </v-btn>
      </div>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" color="primary" class="mb-6">
      <v-tab value="library" prepend-icon="mdi-bookshelf">
        Skill Library
      </v-tab>
      <v-tab value="employees" prepend-icon="mdi-account-edit">
        Employee Skills
      </v-tab>
      <v-tab value="analytics" prepend-icon="mdi-chart-bar">
        Analytics
      </v-tab>
    </v-tabs>

    <!-- ===================== TAB 1: SKILL LIBRARY ===================== -->
    <v-tabs-window v-model="activeTab">
      <v-tabs-window-item value="library">
        <!-- Skill Level Legend (Collapsible) -->
        <v-card rounded="lg" class="mb-6">
          <v-card-title class="text-subtitle-1 d-flex align-center gap-2 cursor-pointer" @click="showLegend = !showLegend">
            <v-icon>mdi-information-outline</v-icon>
            Skill Rating Definitions (0-5 Scoring Model)
            <v-spacer />
            <v-icon>{{ showLegend ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </v-card-title>
          <v-expand-transition>
            <v-card-text v-show="showLegend">
              <v-row>
                <v-col v-for="level in levelDescriptions" :key="level.value" cols="12" sm="6" md="4" lg="2">
                  <div class="d-flex align-center gap-2">
                    <v-avatar :color="level.color" size="32">
                      <span class="text-white font-weight-bold">{{ level.value }}</span>
                    </v-avatar>
                    <div>
                      <div class="font-weight-medium text-body-2">{{ level.label }}</div>
                      <div class="text-caption text-grey">{{ level.description }}</div>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-expand-transition>
        </v-card>

        <!-- Stats Row -->
        <UiStatsRow
          :stats="[
            { value: skills.length, label: 'Total Skills', color: 'primary', icon: 'mdi-lightbulb' },
            { value: categoryCount, label: 'Categories', color: 'info', icon: 'mdi-view-grid' },
            { value: coreSkillsCount, label: 'Core Skills', color: 'success', icon: 'mdi-star' },
            { value: totalAssignments, label: 'Total Assignments', color: 'warning', icon: 'mdi-account-group' }
          ]"
          layout="4-col"
          tile-size="tall"
        />

        <!-- Loading State -->
        <template v-if="loading">
          <v-row>
            <v-col cols="12" md="4">
              <v-card rounded="lg" height="400">
                <v-card-text>
                  <div class="skeleton-pulse mb-4" style="width: 100%; height: 40px; border-radius: 4px;"></div>
                  <div v-for="i in 6" :key="i" class="skeleton-pulse mb-2" style="width: 100%; height: 48px; border-radius: 4px;"></div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="8">
              <v-card rounded="lg" height="400">
                <v-card-text class="d-flex align-center justify-center h-100">
                  <div class="text-center">
                    <div class="skeleton-pulse mx-auto mb-4" style="width: 64px; height: 64px; border-radius: 50%;"></div>
                    <div class="skeleton-pulse mx-auto" style="width: 200px; height: 20px; border-radius: 4px;"></div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </template>

        <!-- Content: Two-Pane Layout -->
        <template v-else>
          <v-row>
            <!-- Left Pane: Categories & Skills List -->
            <v-col cols="12" md="4">
              <v-card rounded="lg" class="h-100">
                <v-card-title class="d-flex align-center gap-2">
                  <v-icon>mdi-view-list</v-icon>
                  Skill Library
                </v-card-title>
                
                <!-- Search -->
                <div class="px-4 pb-2">
                  <v-text-field
                    v-model="librarySearchQuery"
                    prepend-inner-icon="mdi-magnify"
                    placeholder="Search skills..."
                    variant="outlined"
                    density="compact"
                    hide-details
                    clearable
                  />
                </div>

                <v-divider />

                <!-- Skills List by Category -->
                <div style="max-height: 500px; overflow-y: auto;">
                  <v-expansion-panels v-model="expandedCategory" variant="accordion">
                    <v-expansion-panel
                      v-for="category in filteredLibraryCategories"
                      :key="category.name"
                      :value="category.name"
                    >
                      <v-expansion-panel-title>
                        <div class="d-flex align-center gap-2">
                          <v-icon :color="getCategoryColor(category.name)" size="20">
                            {{ getCategoryIcon(category.name) }}
                          </v-icon>
                          <span class="font-weight-medium">{{ category.name }}</span>
                          <v-chip size="x-small" variant="flat" color="grey-lighten-3">
                            {{ category.skills.length }}
                          </v-chip>
                        </div>
                      </v-expansion-panel-title>
                      <v-expansion-panel-text>
                        <v-list density="compact" class="py-0">
                          <v-list-item
                            v-for="skill in category.skills"
                            :key="skill.id"
                            :active="selectedSkill?.id === skill.id"
                            @click="selectSkill(skill)"
                            class="rounded mb-1"
                          >
                            <v-list-item-title>{{ skill.name }}</v-list-item-title>
                            <template #append>
                              <v-chip size="x-small" variant="text" color="grey">
                                {{ skill.employee_count || 0 }} users
                              </v-chip>
                            </template>
                          </v-list-item>
                        </v-list>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>

                  <!-- Empty Search Results -->
                  <div v-if="librarySearchQuery && filteredLibraryCategories.length === 0" class="text-center py-8">
                    <v-icon size="48" color="grey-lighten-1">mdi-magnify-close</v-icon>
                    <p class="text-body-2 text-grey mt-2">No skills matching "{{ librarySearchQuery }}"</p>
                  </div>

                  <!-- Empty State -->
                  <div v-if="!librarySearchQuery && skills.length === 0" class="text-center py-8">
                    <v-icon size="48" color="grey-lighten-1">mdi-lightbulb-off</v-icon>
                    <p class="text-body-2 text-grey mt-2">No skills defined yet</p>
                    <v-btn color="primary" size="small" class="mt-2" @click="showAddDialog = true">
                      Add First Skill
                    </v-btn>
                  </div>
                </div>
              </v-card>
            </v-col>

            <!-- Right Pane: Skill Details / Editor -->
            <v-col cols="12" md="8">
              <v-card rounded="lg" class="h-100">
                <!-- No Selection State -->
                <template v-if="!selectedSkill">
                  <v-card-text class="d-flex align-center justify-center h-100">
                    <div class="text-center py-12">
                      <v-icon size="64" color="grey-lighten-1">mdi-cursor-default-click</v-icon>
                      <h3 class="text-h6 mt-4">Select a Skill</h3>
                      <p class="text-grey">Choose a skill from the list to view or edit details</p>
                    </div>
                  </v-card-text>
                </template>

                <!-- Skill Editor -->
                <template v-else>
                  <v-card-title class="d-flex align-center justify-space-between">
                    <span class="d-flex align-center gap-2">
                      <v-icon :color="getCategoryColor(selectedSkill.category)">
                        {{ getCategoryIcon(selectedSkill.category) }}
                      </v-icon>
                      Edit Skill
                    </span>
                    <v-btn
                      icon="mdi-close"
                      variant="text"
                      size="small"
                      @click="selectedSkill = null"
                    />
                  </v-card-title>
                  <v-divider />

                  <v-card-text>
                    <v-form ref="editFormRef" @submit.prevent="saveSkill">
                      <v-text-field
                        v-model="editForm.name"
                        label="Skill Name"
                        variant="outlined"
                        :rules="[v => !!v || 'Name is required']"
                        class="mb-4"
                      />

                      <v-select
                        v-model="editForm.category"
                        :items="categoryOptions"
                        label="Category"
                        variant="outlined"
                        class="mb-4"
                      />

                      <v-textarea
                        v-model="editForm.description"
                        label="Description"
                        variant="outlined"
                        rows="3"
                        class="mb-4"
                        placeholder="Describe what this skill entails and how proficiency is measured..."
                      />

                      <v-switch
                        v-model="editForm.is_core"
                        label="Core Skill (required for all employees)"
                        color="primary"
                        hide-details
                        class="mb-4"
                      />

                      <!-- Skill Stats -->
                      <v-card variant="outlined" rounded="lg" class="mb-4">
                        <v-card-title class="text-body-1">
                          <v-icon start size="20">mdi-chart-bar</v-icon>
                          Usage Stats
                        </v-card-title>
                        <v-card-text>
                          <v-row dense>
                            <v-col cols="6">
                              <div class="text-h5 font-weight-bold text-primary">
                                {{ selectedSkill.employee_count || 0 }}
                              </div>
                              <div class="text-caption text-grey">Employees with skill</div>
                            </v-col>
                            <v-col cols="6">
                              <div class="text-h5 font-weight-bold text-success">
                                {{ selectedSkill.avg_level?.toFixed(1) || '0.0' }}
                              </div>
                              <div class="text-caption text-grey">Avg. Level</div>
                            </v-col>
                          </v-row>
                        </v-card-text>
                      </v-card>

                      <!-- Level Descriptions (from library page) -->
                      <v-card variant="outlined" rounded="lg" class="mb-4">
                        <v-card-title class="text-body-1 d-flex align-center">
                          <v-icon start size="20">mdi-school</v-icon>
                          Level Progression
                          <v-spacer />
                          <v-btn
                            variant="text"
                            size="small"
                            @click="showLevelProgression = !showLevelProgression"
                          >
                            {{ showLevelProgression ? 'Hide' : 'Show' }}
                          </v-btn>
                        </v-card-title>
                        <v-expand-transition>
                          <v-card-text v-show="showLevelProgression">
                            <v-timeline side="end" density="compact">
                              <v-timeline-item
                                v-for="level in [0, 1, 2, 3, 4, 5]"
                                :key="level"
                                :dot-color="getLevelColor(level)"
                                size="small"
                              >
                                <template #opposite>
                                  <div class="d-flex align-center">
                                    <v-avatar :color="getLevelColor(level)" size="28" class="mr-2">
                                      <span class="font-weight-bold text-caption">{{ level }}</span>
                                    </v-avatar>
                                    <span class="font-weight-bold text-body-2">{{ getLevelLabel(level) }}</span>
                                  </div>
                                </template>
                                <v-card variant="tonal" :color="getLevelColor(level)" class="pa-2">
                                  <p class="text-body-2 mb-0">
                                    {{ getSkillLevelDescription(selectedSkill, level) }}
                                  </p>
                                </v-card>
                              </v-timeline-item>
                            </v-timeline>
                          </v-card-text>
                        </v-expand-transition>
                      </v-card>

                      <!-- ====== Position Requirements (Skill → Position mapping) ====== -->
                      <v-card variant="outlined" rounded="lg" class="mb-4">
                        <v-card-title class="text-body-1 d-flex align-center">
                          <v-icon start size="20" color="deep-purple">mdi-briefcase-check</v-icon>
                          Position Requirements
                          <v-spacer />
                          <v-chip size="x-small" variant="flat" color="deep-purple-lighten-4" class="ml-2">
                            {{ positionAssignments.length }} position{{ positionAssignments.length !== 1 ? 's' : '' }}
                          </v-chip>
                        </v-card-title>
                        <v-card-text>
                          <p class="text-caption text-grey mb-3">
                            Assign this skill to positions and set the expected proficiency level. This drives skill gap analysis for employees and AI agent assessments.
                          </p>

                          <!-- Loading -->
                          <div v-if="loadingPositionAssignments" class="text-center py-4">
                            <v-progress-circular indeterminate size="24" color="deep-purple" />
                            <span class="ml-2 text-body-2 text-grey">Loading position assignments...</span>
                          </div>

                          <!-- Current assignments -->
                          <template v-else>
                            <v-table v-if="positionAssignments.length > 0" density="compact" class="mb-4">
                              <thead>
                                <tr>
                                  <th class="text-left">Position</th>
                                  <th class="text-center" style="width: 200px;">Expected Level</th>
                                  <th class="text-center" style="width: 140px;">Importance</th>
                                  <th class="text-center" style="width: 60px;">Source</th>
                                  <th class="text-center" style="width: 80px;"></th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr v-for="pa in positionAssignments" :key="pa.id">
                                  <td>
                                    <span class="font-weight-medium">{{ pa.position_title }}</span>
                                  </td>
                                  <td class="text-center">
                                    <v-btn-toggle
                                      :model-value="pa.expected_level"
                                      mandatory
                                      density="compact"
                                      :color="getRatingColor(pa.expected_level)"
                                      @update:model-value="(val: number) => updatePositionAssignment(pa, 'expected_level', val)"
                                    >
                                      <v-btn :value="1" size="x-small">1</v-btn>
                                      <v-btn :value="2" size="x-small">2</v-btn>
                                      <v-btn :value="3" size="x-small">3</v-btn>
                                      <v-btn :value="4" size="x-small">4</v-btn>
                                      <v-btn :value="5" size="x-small">5</v-btn>
                                    </v-btn-toggle>
                                  </td>
                                  <td class="text-center">
                                    <v-select
                                      :model-value="pa.importance"
                                      :items="importanceOptions"
                                      density="compact"
                                      variant="plain"
                                      hide-details
                                      @update:model-value="(val: string) => updatePositionAssignment(pa, 'importance', val)"
                                    >
                                      <template #selection="{ item }">
                                        <v-chip size="x-small" :color="getImportanceColor(item.value as string)" variant="flat">
                                          {{ item.title }}
                                        </v-chip>
                                      </template>
                                    </v-select>
                                  </td>
                                  <td class="text-center">
                                    <v-tooltip :text="pa.source === 'agent' ? 'Set by AI Agent' : 'Manually assigned'" location="top">
                                      <template #activator="{ props }">
                                        <v-icon v-bind="props" size="18" :color="pa.source === 'agent' ? 'deep-purple' : 'grey'">
                                          {{ pa.source === 'agent' ? 'mdi-robot' : 'mdi-account' }}
                                        </v-icon>
                                      </template>
                                    </v-tooltip>
                                  </td>
                                  <td class="text-center">
                                    <v-btn
                                      icon="mdi-close"
                                      variant="text"
                                      size="x-small"
                                      color="error"
                                      :loading="pa._deleting"
                                      @click="removePositionAssignment(pa)"
                                    />
                                  </td>
                                </tr>
                              </tbody>
                            </v-table>

                            <div v-else class="text-center py-3">
                              <v-icon size="32" color="grey-lighten-1">mdi-briefcase-off-outline</v-icon>
                              <p class="text-caption text-grey mt-1 mb-0">Not assigned to any positions yet</p>
                            </div>

                            <!-- Add position assignment -->
                            <v-divider v-if="positionAssignments.length > 0" class="my-3" />
                            <div class="d-flex align-center gap-2">
                              <v-autocomplete
                                v-model="newPositionId"
                                :items="availablePositionsForSkill"
                                item-title="title"
                                item-value="id"
                                label="Add to position..."
                                variant="outlined"
                                density="compact"
                                hide-details
                                clearable
                                style="flex: 1;"
                                prepend-inner-icon="mdi-briefcase-plus"
                                no-data-text="All positions already assigned"
                              />
                              <v-select
                                v-model="newPositionLevel"
                                :items="[1, 2, 3, 4, 5]"
                                label="Level"
                                variant="outlined"
                                density="compact"
                                hide-details
                                style="max-width: 90px;"
                              />
                              <v-select
                                v-model="newPositionImportance"
                                :items="importanceOptions"
                                label="Importance"
                                variant="outlined"
                                density="compact"
                                hide-details
                                style="max-width: 150px;"
                              />
                              <v-btn
                                color="deep-purple"
                                variant="tonal"
                                :disabled="!newPositionId"
                                :loading="addingPositionAssignment"
                                @click="addPositionAssignment"
                                icon="mdi-plus"
                                size="small"
                              />
                            </div>
                          </template>
                        </v-card-text>
                      </v-card>

                      <div class="d-flex justify-space-between">
                        <v-btn
                          color="error"
                          variant="outlined"
                          prepend-icon="mdi-delete"
                          @click="confirmDelete"
                        >
                          Delete
                        </v-btn>
                        <v-btn
                          color="primary"
                          type="submit"
                          :loading="saving"
                        >
                          Save Changes
                        </v-btn>
                      </div>
                    </v-form>
                  </v-card-text>
                </template>
              </v-card>
            </v-col>
          </v-row>
        </template>
      </v-tabs-window-item>

      <!-- ===================== TAB 2: EMPLOYEE SKILLS ===================== -->
      <v-tabs-window-item value="employees">
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center gap-2">
            <v-icon color="primary">mdi-account-edit</v-icon>
            Edit Employee Skills
          </v-card-title>
          <v-divider />
          <v-card-text>
            <!-- Employee Search -->
            <v-autocomplete
              v-model="selectedEmployeeId"
              :items="employeeList"
              item-title="full_name"
              item-value="id"
              label="Search Employee"
              placeholder="Start typing to search..."
              prepend-inner-icon="mdi-account-search"
              variant="outlined"
              density="comfortable"
              clearable
              hide-details
              class="mb-4"
              @update:model-value="loadEmployeeSkills"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props">
                  <template #prepend>
                    <v-avatar size="32" color="primary">
                      <v-img v-if="item.raw.avatar_url" :src="item.raw.avatar_url" />
                      <span v-else class="text-white text-body-2">
                        {{ item.raw.first_name?.[0] }}{{ item.raw.last_name?.[0] }}
                      </span>
                    </v-avatar>
                  </template>
                  <v-list-item-subtitle v-if="item.raw.position">
                    {{ item.raw.position }}
                  </v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-autocomplete>

            <!-- Skills Rating Table -->
            <template v-if="selectedEmployeeId">
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="text-subtitle-1 font-weight-medium">
                  Skills for {{ selectedEmployeeName }}
                  <span v-if="filteredEmployeeSkills.length !== employeeSkillRatings.length" class="text-caption text-grey ml-2">
                    ({{ filteredEmployeeSkills.length }} of {{ employeeSkillRatings.length }})
                  </span>
                </div>
                <div class="d-flex align-center gap-2">
                  <v-select
                    v-model="empSelectedCategory"
                    :items="availableCategories"
                    label="Category"
                    variant="outlined"
                    density="compact"
                    hide-details
                    clearable
                    style="min-width: 180px"
                    prepend-inner-icon="mdi-filter-variant"
                  />
                  <v-text-field
                    v-model="skillSearchQuery"
                    prepend-inner-icon="mdi-magnify"
                    placeholder="Filter skills..."
                    variant="outlined"
                    density="compact"
                    hide-details
                    clearable
                    style="max-width: 250px"
                  />
                  <v-btn
                    v-if="hasUnsavedChanges"
                    color="primary"
                    prepend-icon="mdi-content-save-all"
                    :loading="savingAll"
                    @click="saveAllChanges"
                  >
                    Save All
                  </v-btn>
                </div>
              </div>

              <v-table density="compact">
                <thead>
                  <tr>
                    <th class="text-left">Skill</th>
                    <th class="text-left">Category</th>
                    <th class="text-center" style="width: 280px;">Rating</th>
                    <th class="text-center" style="width: 120px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="skillRating in filteredEmployeeSkills" :key="skillRating.skill_id">
                    <td>
                      <div class="font-weight-medium">{{ skillRating.skill_name }}</div>
                      <div v-if="skillRating.skill_description" class="text-caption text-grey">
                        {{ skillRating.skill_description }}
                      </div>
                    </td>
                    <td>
                      <v-chip size="small" variant="tonal" :color="getCategoryColor(skillRating.category)">
                        {{ skillRating.category }}
                      </v-chip>
                    </td>
                    <td class="text-center">
                      <v-btn-toggle 
                        v-model="skillRating.level" 
                        mandatory 
                        density="compact"
                        :color="getRatingColor(skillRating.level)"
                        @update:model-value="markDirty(skillRating)"
                      >
                        <v-btn :value="0" size="small">0</v-btn>
                        <v-btn :value="1" size="small">1</v-btn>
                        <v-btn :value="2" size="small">2</v-btn>
                        <v-btn :value="3" size="small">3</v-btn>
                        <v-btn :value="4" size="small">4</v-btn>
                        <v-btn :value="5" size="small">5</v-btn>
                      </v-btn-toggle>
                    </td>
                    <td class="text-center">
                      <v-btn
                        v-if="skillRating.isDirty"
                        color="primary"
                        size="small"
                        variant="tonal"
                        :loading="skillRating.saving"
                        @click="saveSkillRating(skillRating)"
                      >
                        Save
                      </v-btn>
                      <v-icon v-else-if="skillRating.saving" color="primary" size="small">
                        mdi-loading mdi-spin
                      </v-icon>
                      <v-icon v-else color="success" size="small">mdi-check-circle</v-icon>
                    </td>
                  </tr>
                </tbody>
              </v-table>
              
              <div v-if="filteredEmployeeSkills.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-magnify-close</v-icon>
                <p class="text-body-2 text-grey mt-2">No skills matching your search</p>
              </div>
            </template>

            <!-- No Employee Selected -->
            <div v-else class="text-center py-8">
              <v-icon size="48" color="grey-lighten-1">mdi-account-search</v-icon>
              <p class="text-body-1 text-grey mt-2">Search for an employee to view and edit their skills</p>
            </div>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>

      <!-- ===================== TAB 3: ANALYTICS ===================== -->
      <v-tabs-window-item value="analytics">
        <!-- Loading State -->
        <template v-if="loading">
          <v-row class="mb-6">
            <v-col v-for="i in 4" :key="i" cols="12" sm="6" md="3">
              <v-card rounded="lg">
                <v-card-text>
                  <div class="skeleton-pulse mb-2" style="width: 40%; height: 12px; border-radius: 4px;"></div>
                  <div class="skeleton-pulse" style="width: 60%; height: 32px; border-radius: 4px;"></div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </template>

        <template v-else>
          <!-- Top-Level Health Metrics -->
          <UiStatsRow
            :stats="[
              { value: totalEmployees, label: 'Total Employees', color: 'primary', icon: 'mdi-account-group' },
              { value: totalSkillsCount, label: 'Skills in Library', color: 'info', icon: 'mdi-lightbulb' },
              { value: averageSkillLevel.toFixed(1), label: 'Avg. Skill Level', color: 'success', icon: 'mdi-chart-line', format: 'none' },
              { value: skillCoverage + '%', label: 'Skill Coverage', color: coverageColor, icon: 'mdi-percent', format: 'none' }
            ]"
            layout="4-col"
            tile-size="tall"
          />

          <!-- Skill Level Distribution -->
          <v-row class="mt-4">
            <v-col cols="12" md="6">
              <v-card rounded="lg">
                <v-card-title>
                  <v-icon start color="primary">mdi-chart-bar</v-icon>
                  Skill Level Distribution
                </v-card-title>
                <v-card-text>
                  <div v-for="level in skillLevelDistribution" :key="level.level" class="mb-3">
                    <div class="d-flex align-center justify-space-between mb-1">
                      <span class="text-body-2 font-weight-medium">Level {{ level.level }} — {{ level.label }}</span>
                      <span class="text-body-2 text-grey">{{ level.count }} ({{ level.percentage }}%)</span>
                    </div>
                    <v-progress-linear
                      :model-value="level.percentage"
                      :color="level.color"
                      rounded
                      height="8"
                    />
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="6">
              <v-card rounded="lg">
                <v-card-title>
                  <v-icon start color="primary">mdi-view-grid</v-icon>
                  Category Performance
                </v-card-title>
                <v-card-text>
                  <v-list density="compact">
                    <v-list-item v-for="cat in categoryStats" :key="cat.name">
                      <template #prepend>
                        <v-icon :color="getCategoryColor(cat.name)" size="20">
                          {{ getCategoryIcon(cat.name) }}
                        </v-icon>
                      </template>
                      <v-list-item-title>{{ cat.name }}</v-list-item-title>
                      <v-list-item-subtitle>{{ cat.skillCount }} skills</v-list-item-subtitle>
                      <template #append>
                        <v-chip size="small" :color="cat.avgLevel >= 3 ? 'success' : cat.avgLevel >= 2 ? 'warning' : 'error'" variant="flat">
                          {{ cat.avgLevel.toFixed(1) }} avg
                        </v-chip>
                      </template>
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </template>
      </v-tabs-window-item>
    </v-tabs-window>

    <!-- Add Skill Dialog -->
    <v-dialog v-model="showAddDialog" max-width="500">
      <v-card>
        <v-card-title>
          <v-icon start color="primary">mdi-plus-circle</v-icon>
          Add New Skill
        </v-card-title>
        <v-card-text>
          <v-form ref="addFormRef">
            <v-text-field
              v-model="newSkill.name"
              label="Skill Name"
              variant="outlined"
              class="mb-4"
              placeholder="e.g., Customer Service"
              :rules="[v => !!v || 'Skill name is required']"
            />
            <v-select
              v-model="newSkill.category"
              :items="categoryOptions"
              label="Category"
              variant="outlined"
              class="mb-4"
            />
            <v-textarea
              v-model="newSkill.description"
              label="Description"
              variant="outlined"
              rows="3"
              placeholder="Describe what this skill entails..."
            />
            <v-switch
              v-model="newSkill.is_core"
              label="Core Skill (required for all employees)"
              color="primary"
              hide-details
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeAddDialog">Cancel</v-btn>
          <v-btn color="primary" :loading="creating" @click="createSkill">
            Create Skill
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="error">mdi-alert</v-icon>
          Delete Skill
        </v-card-title>
        <v-card-text>
          <p>Are you sure you want to delete <strong>{{ selectedSkill?.name }}</strong>?</p>
          <v-alert v-if="selectedSkill?.employee_count" type="warning" variant="tonal" density="compact" class="mt-2">
            This skill is assigned to {{ selectedSkill.employee_count }} employee(s). Their skill records will be removed.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="deleteSkill">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { Skill, SkillRating, SkillLibraryItem } from '~/types/skill.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

const client = useSupabaseClient()
const toast = useToast()
const route = useRoute()

// =================== Shared State ===================
const loading = ref(true)
const activeTab = ref((route.query.tab as string) || 'library')
const skills = ref<Skill[]>([])
const skillLibrary = ref<any[]>([])
const employees = ref<any[]>([])
const employeeSkills = ref<any[]>([])

// =================== Tab 1: Library State ===================
const saving = ref(false)
const creating = ref(false)
const deleting = ref(false)
const librarySearchQuery = ref('')
const selectedSkill = ref<Skill | null>(null)
const expandedCategory = ref<string | null>(null)
const showAddDialog = ref(false)
const showDeleteDialog = ref(false)
const showLegend = ref(false)
const showLevelProgression = ref(false)

// =================== Position Requirements State ===================
interface PositionAssignment {
  id: string
  job_position_id: string
  skill_id: string
  expected_level: number
  importance: string
  source: string
  notes: string | null
  position_title: string
  _deleting?: boolean
  _saving?: boolean
}

const positionAssignments = ref<PositionAssignment[]>([])
const allPositions = ref<{ id: string; title: string }[]>([])
const loadingPositionAssignments = ref(false)
const addingPositionAssignment = ref(false)
const newPositionId = ref<string | null>(null)
const newPositionLevel = ref(3)
const newPositionImportance = ref('required')
const importanceOptions = [
  { title: 'Required', value: 'required' },
  { title: 'Recommended', value: 'recommended' },
  { title: 'Optional', value: 'optional' }
]

const categoryOptions = ['Technical', 'Service', 'Leadership', 'Communication', 'Safety', 'Equipment', 'Clinical Skills', 'Administrative', 'Anesthesia', 'Animal Care', 'Client Service', 'Creative / Marketing', 'Dentistry', 'Diagnostics & Imaging', 'Emergency', 'Emergency & Critical Care', 'Facilities Skills', 'Financial Skills', 'HR / People Ops', 'Imaging', 'Inventory Skills', 'Leadership Skills', 'Pharmacy Skills', 'Soft Skills', 'Specialty Medicine', 'Surgery', 'Technology Skills', 'Wellness', 'Other']

const newSkill = ref({
  name: '',
  category: 'Technical',
  description: '',
  is_core: false
})

const editForm = ref({
  name: '',
  category: '',
  description: '',
  is_core: false
})

const editFormRef = ref()
const addFormRef = ref()

// =================== Tab 2: Employee Skills State ===================
const selectedEmployeeId = ref<string | null>(null)
const skillSearchQuery = ref('')
const empSelectedCategory = ref<string | null>(null)
const employeeSkillRatings = ref<SkillRating[]>([])
const savingAll = ref(false)

// =================== Shared Constants ===================
const levelDescriptions = [
  { value: 0, label: 'Untrained', description: 'No exposure or awareness', color: 'grey' },
  { value: 1, label: 'Novice', description: 'Knows theory, observes', color: 'blue-grey' },
  { value: 2, label: 'Apprentice', description: 'Performs with supervision', color: 'blue' },
  { value: 3, label: 'Professional', description: 'Works independently', color: 'teal' },
  { value: 4, label: 'Advanced', description: 'Handles complex cases', color: 'green' },
  { value: 5, label: 'Mentor', description: 'Teaches and certifies', color: 'amber-darken-2' }
]

// =================== Watchers ===================
watch(selectedSkill, (skill) => {
  if (skill) {
    editForm.value = {
      name: skill.name,
      category: skill.category,
      description: skill.description || '',
      is_core: skill.is_core || false
    }
    showLevelProgression.value = false
    loadPositionAssignments(skill.id)
  } else {
    positionAssignments.value = []
  }
})

// Sync tab to URL without full navigation
watch(activeTab, (tab) => {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState({}, '', url.toString())
  }
})

// =================== Library Tab Computed ===================
const categoryCount = computed(() => {
  const cats = new Set(skills.value.map(s => s.category))
  return cats.size
})

const coreSkillsCount = computed(() => {
  return skills.value.filter(s => s.is_core).length
})

const totalAssignments = computed(() => {
  return skills.value.reduce((sum, s) => sum + (s.employee_count || 0), 0)
})

const skillsByCategory = computed(() => {
  const categories: Record<string, Skill[]> = {}
  
  skills.value.forEach(skill => {
    const category = skill.category || 'Other'
    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push(skill)
  })
  
  return Object.entries(categories)
    .map(([name, catSkills]) => ({
      name,
      skills: catSkills.sort((a, b) => a.name.localeCompare(b.name))
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const filteredLibraryCategories = computed(() => {
  if (!librarySearchQuery.value) return skillsByCategory.value
  
  const query = librarySearchQuery.value.toLowerCase()
  return skillsByCategory.value
    .map(category => ({
      ...category,
      skills: category.skills.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
      )
    }))
    .filter(category => category.skills.length > 0)
})

// =================== Employee Tab Computed ===================
const employeeList = computed(() => 
  employees.value.map((e: any) => ({
    id: e.id,
    full_name: `${e.first_name} ${e.last_name}`,
    first_name: e.first_name,
    last_name: e.last_name,
    position: '',
    avatar_url: null
  }))
)

const selectedEmployeeName = computed(() => {
  const emp = employeeList.value.find(e => e.id === selectedEmployeeId.value)
  return emp?.full_name || ''
})

const availableCategories = computed(() => {
  const categories = new Set(employeeSkillRatings.value.map(s => s.category))
  return Array.from(categories).sort()
})

const filteredEmployeeSkills = computed(() => {
  let filtered = employeeSkillRatings.value
  
  if (empSelectedCategory.value) {
    filtered = filtered.filter(s => s.category === empSelectedCategory.value)
  }
  
  if (skillSearchQuery.value) {
    const search = skillSearchQuery.value.toLowerCase()
    filtered = filtered.filter(s => 
      s.skill_name.toLowerCase().includes(search) ||
      s.category.toLowerCase().includes(search)
    )
  }
  
  return filtered
})

const hasUnsavedChanges = computed(() => {
  return employeeSkillRatings.value.some(s => s.isDirty)
})

// =================== Analytics Tab Computed ===================
const totalEmployees = computed(() => employees.value.length)
const totalSkillsCount = computed(() => skillLibrary.value.length)

const averageSkillLevel = computed(() => {
  if (employeeSkills.value.length === 0) return 0
  const total = employeeSkills.value.reduce((sum: number, es: any) => sum + es.level, 0)
  return total / employeeSkills.value.length
})

const skillCoverage = computed(() => {
  if (totalSkillsCount.value === 0 || totalEmployees.value === 0) return 0
  const uniqueSkillsWithEmployees = new Set(employeeSkills.value.map((es: any) => es.skill_id)).size
  return Math.round((uniqueSkillsWithEmployees / totalSkillsCount.value) * 100)
})

const coverageColor = computed(() => {
  if (skillCoverage.value >= 80) return 'success'
  if (skillCoverage.value >= 50) return 'warning'
  return 'error'
})

const skillLevelDistribution = computed(() => {
  const levels = [
    { level: 5, label: 'Expert', color: 'success', count: 0 },
    { level: 4, label: 'Advanced', color: 'teal', count: 0 },
    { level: 3, label: 'Intermediate', color: 'warning', count: 0 },
    { level: 2, label: 'Beginner', color: 'orange', count: 0 },
    { level: 1, label: 'Novice', color: 'grey', count: 0 }
  ]
  
  employeeSkills.value.forEach((es: any) => {
    const levelObj = levels.find(l => l.level === es.level)
    if (levelObj) levelObj.count++
  })
  
  const total = employeeSkills.value.length || 1
  return levels.map(l => ({
    ...l,
    percentage: Math.round((l.count / total) * 100)
  }))
})

const categoryStats = computed(() => {
  const categories: Record<string, { skills: Set<string>; levels: number[] }> = {}
  
  employeeSkills.value.forEach((es: any) => {
    const skill = skillLibrary.value.find((s: any) => s.id === es.skill_id)
    if (!skill) return
    
    const category = skill.category || 'Other'
    if (!categories[category]) {
      categories[category] = { skills: new Set(), levels: [] }
    }
    categories[category].skills.add(skill.id)
    categories[category].levels.push(es.level)
  })
  
  return Object.entries(categories)
    .map(([name, data]) => ({
      name,
      skillCount: data.skills.size,
      avgLevel: data.levels.reduce((a, b) => a + b, 0) / data.levels.length
    }))
    .sort((a, b) => b.avgLevel - a.avgLevel)
})

// =================== Shared Methods ===================
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Technical': 'mdi-wrench',
    'Service': 'mdi-account-heart',
    'Leadership': 'mdi-account-star',
    'Communication': 'mdi-message',
    'Safety': 'mdi-shield-check',
    'Equipment': 'mdi-tools',
    'Clinical Skills': 'mdi-stethoscope',
    'Administrative': 'mdi-file-document',
    'Anesthesia': 'mdi-needle',
    'Animal Care': 'mdi-paw',
    'Client Service': 'mdi-account-heart',
    'Creative / Marketing': 'mdi-palette',
    'Dentistry': 'mdi-tooth',
    'Diagnostics & Imaging': 'mdi-microscope',
    'Emergency': 'mdi-ambulance',
    'Emergency & Critical Care': 'mdi-hospital-box',
    'Facilities Skills': 'mdi-home-city',
    'Financial Skills': 'mdi-currency-usd',
    'HR / People Ops': 'mdi-account-group',
    'Imaging': 'mdi-radioactive',
    'Inventory Skills': 'mdi-package-variant',
    'Leadership Skills': 'mdi-account-star',
    'Pharmacy Skills': 'mdi-pill',
    'Soft Skills': 'mdi-hand-heart',
    'Specialty Medicine': 'mdi-medical-bag',
    'Surgery': 'mdi-content-cut',
    'Technology Skills': 'mdi-laptop',
    'Wellness': 'mdi-heart-pulse',
    'Other': 'mdi-star'
  }
  return icons[category] || 'mdi-star'
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Technical': 'blue',
    'Service': 'pink',
    'Leadership': 'purple',
    'Communication': 'teal',
    'Safety': 'orange',
    'Equipment': 'brown',
    'Clinical Skills': 'blue',
    'Administrative': 'grey-darken-1',
    'Anesthesia': 'purple',
    'Animal Care': 'orange',
    'Client Service': 'pink',
    'Creative / Marketing': 'deep-purple',
    'Dentistry': 'cyan',
    'Diagnostics & Imaging': 'indigo',
    'Emergency': 'red',
    'Emergency & Critical Care': 'red-darken-3',
    'Facilities Skills': 'brown',
    'Financial Skills': 'green-darken-2',
    'HR / People Ops': 'teal',
    'Imaging': 'light-blue',
    'Inventory Skills': 'amber',
    'Leadership Skills': 'deep-orange',
    'Pharmacy Skills': 'lime-darken-2',
    'Soft Skills': 'pink-lighten-2',
    'Specialty Medicine': 'indigo-darken-2',
    'Surgery': 'blue-grey-darken-2',
    'Technology Skills': 'cyan-darken-2',
    'Wellness': 'light-green',
    'Other': 'grey'
  }
  return colors[category] || 'primary'
}

function getLevelLabel(level: number): string {
  return levelDescriptions.find(l => l.value === level)?.label || 'Unknown'
}

function getLevelColor(level: number): string {
  return levelDescriptions.find(l => l.value === level)?.color || 'grey'
}

function getRatingColor(level: number): string {
  const colors: Record<number, string> = {
    0: 'grey',
    1: 'red-lighten-2',
    2: 'orange',
    3: 'blue',
    4: 'teal',
    5: 'green'
  }
  return colors[level] || 'grey'
}

function getSkillLevelDescription(skill: Skill | SkillLibraryItem | null, level: number): string {
  if ((skill as any)?.level_descriptions && (skill as any).level_descriptions[String(level)]) {
    return (skill as any).level_descriptions[String(level)]
  }
  const genericDescriptions: Record<number, string> = {
    0: 'No training or exposure to this skill.',
    1: 'Basic awareness and understanding of concepts. Observes others performing.',
    2: 'Can perform basic tasks with supervision and guidance.',
    3: 'Performs independently with standard cases. Reliable and consistent.',
    4: 'Handles complex or difficult cases. Troubleshoots problems.',
    5: 'Expert level. Teaches and mentors others. Creates protocols and standards.'
  }
  return genericDescriptions[level] || 'No description available.'
}

// =================== Library Methods ===================
// =================== Position Requirements Computed ===================
const availablePositionsForSkill = computed(() => {
  const assignedIds = new Set(positionAssignments.value.map(pa => pa.job_position_id))
  return allPositions.value.filter(p => !assignedIds.has(p.id))
})

function getImportanceColor(importance: string): string {
  switch (importance) {
    case 'required': return 'error'
    case 'recommended': return 'warning'
    case 'optional': return 'info'
    default: return 'grey'
  }
}

// =================== Position Requirements Methods ===================
const loadPositionAssignments = async (skillId: string) => {
  loadingPositionAssignments.value = true
  try {
    const { data, error } = await client
      .from('role_skill_expectations')
      .select('id, job_position_id, skill_id, expected_level, importance, source, notes')
      .eq('skill_id', skillId)
      .order('expected_level', { ascending: false })

    if (error) throw error

    // Resolve position titles
    const positionIds = (data || []).map((d: any) => d.job_position_id)
    let positionMap: Record<string, string> = {}
    if (positionIds.length > 0) {
      const { data: positions } = await client
        .from('job_positions')
        .select('id, title')
        .in('id', positionIds)
      positionMap = Object.fromEntries((positions || []).map((p: any) => [p.id, p.title]))
    }

    positionAssignments.value = (data || []).map((d: any) => ({
      ...d,
      position_title: positionMap[d.job_position_id] || 'Unknown Position',
      _deleting: false,
      _saving: false
    }))
  } catch (err) {
    console.error('Error loading position assignments:', err)
    toast.error('Failed to load position assignments')
  } finally {
    loadingPositionAssignments.value = false
  }
}

const addPositionAssignment = async () => {
  if (!newPositionId.value || !selectedSkill.value) return

  addingPositionAssignment.value = true
  try {
    const { error } = await client
      .from('role_skill_expectations')
      .insert({
        job_position_id: newPositionId.value,
        skill_id: selectedSkill.value.id,
        expected_level: newPositionLevel.value,
        importance: newPositionImportance.value,
        source: 'manual'
      })

    if (error) throw error

    toast.success('Position requirement added')
    newPositionId.value = null
    newPositionLevel.value = 3
    newPositionImportance.value = 'required'
    await loadPositionAssignments(selectedSkill.value.id)
  } catch (err: any) {
    console.error('Error adding position assignment:', err)
    if (err.code === '23505') {
      toast.error('This skill is already assigned to that position')
    } else {
      toast.error('Failed to add position requirement')
    }
  } finally {
    addingPositionAssignment.value = false
  }
}

const updatePositionAssignment = async (pa: PositionAssignment, field: string, value: any) => {
  const oldValue = (pa as any)[field];
  (pa as any)[field] = value
  pa._saving = true
  try {
    const update: Record<string, any> = { [field]: value, source: 'manual', updated_at: new Date().toISOString() }
    const { error } = await client
      .from('role_skill_expectations')
      .update(update)
      .eq('id', pa.id)
    if (error) throw error
    toast.success(`Updated ${pa.position_title}: ${field === 'expected_level' ? 'Level ' + value : value}`)
  } catch (err) {
    console.error('Error updating position assignment:', err);
    (pa as any)[field] = oldValue
    toast.error('Failed to update position requirement')
  } finally {
    pa._saving = false
  }
}

const removePositionAssignment = async (pa: PositionAssignment) => {
  pa._deleting = true
  try {
    const { error } = await client
      .from('role_skill_expectations')
      .delete()
      .eq('id', pa.id)
    if (error) throw error
    positionAssignments.value = positionAssignments.value.filter(p => p.id !== pa.id)
    toast.success(`Removed ${pa.position_title} requirement`)
  } catch (err) {
    console.error('Error removing position assignment:', err)
    toast.error('Failed to remove position requirement')
  } finally {
    pa._deleting = false
  }
}

// =================== Library Methods ===================
const selectSkill = (skill: Skill) => {
  selectedSkill.value = skill
}

const fetchSkills = async () => {
  try {
    const { data, error } = await client
      .from('skill_library')
      .select('*')
      .order('name')
    
    if (error) throw error
    
    const { data: skillStats } = await client
      .from('employee_skills')
      .select('skill_id, level')
    
    const statsMap: Record<string, { count: number; total: number }> = {}
    skillStats?.forEach((stat: any) => {
      if (!statsMap[stat.skill_id]) {
        statsMap[stat.skill_id] = { count: 0, total: 0 }
      }
      statsMap[stat.skill_id].count++
      statsMap[stat.skill_id].total += stat.level
    })
    
    skills.value = (data || []).map((skill: any) => ({
      ...skill,
      employee_count: statsMap[skill.id]?.count || 0,
      avg_level: statsMap[skill.id] 
        ? statsMap[skill.id].total / statsMap[skill.id].count 
        : 0
    }))
  } catch (error) {
    console.error('Error fetching skills:', error)
    toast.error('Failed to load skills')
  }
}

const createSkill = async () => {
  const { valid } = await addFormRef.value?.validate()
  if (!valid) return
  
  creating.value = true
  try {
    const { error } = await client
      .from('skill_library')
      .insert({
        name: newSkill.value.name,
        category: newSkill.value.category,
        description: newSkill.value.description || null,
        is_core: newSkill.value.is_core
      } as any)
    
    if (error) throw error
    
    toast.success('Skill created successfully')
    closeAddDialog()
    await fetchSkills()
  } catch (error: any) {
    console.error('Error creating skill:', error)
    if (error.code === '23505') {
      toast.error('A skill with this name already exists in this category')
    } else {
      toast.error('Failed to create skill')
    }
  } finally {
    creating.value = false
  }
}

const closeAddDialog = () => {
  showAddDialog.value = false
  newSkill.value = { name: '', category: 'Technical', description: '', is_core: false }
}

const saveSkill = async () => {
  const { valid } = await editFormRef.value?.validate()
  if (!valid || !selectedSkill.value) return
  
  saving.value = true
  try {
    const { error } = await client
      .from('skill_library')
      .update({
        name: editForm.value.name,
        category: editForm.value.category,
        description: editForm.value.description || null,
        is_core: editForm.value.is_core
      } as any)
      .eq('id', selectedSkill.value.id)
    
    if (error) throw error
    
    toast.success('Skill updated successfully')
    await fetchSkills()
    
    selectedSkill.value = skills.value.find(s => s.id === selectedSkill.value?.id) || null
  } catch (error: any) {
    console.error('Error saving skill:', error)
    if (error.code === '23505') {
      toast.error('A skill with this name already exists in this category')
    } else {
      toast.error('Failed to save skill')
    }
  } finally {
    saving.value = false
  }
}

const confirmDelete = () => {
  showDeleteDialog.value = true
}

const deleteSkill = async () => {
  if (!selectedSkill.value) return
  
  deleting.value = true
  try {
    const { error } = await client
      .from('skill_library')
      .delete()
      .eq('id', selectedSkill.value.id)
    
    if (error) throw error
    
    toast.success('Skill deleted successfully')
    showDeleteDialog.value = false
    selectedSkill.value = null
    await fetchSkills()
  } catch (error) {
    console.error('Error deleting skill:', error)
    toast.error('Failed to delete skill')
  } finally {
    deleting.value = false
  }
}

// =================== Employee Skills Methods ===================
const loadEmployeeSkills = async () => {
  if (!selectedEmployeeId.value) {
    employeeSkillRatings.value = []
    return
  }

  try {
    const { data: empSkills, error } = await client
      .from('employee_skills')
      .select('skill_id, level')
      .eq('employee_id', selectedEmployeeId.value)

    if (error) throw error

    const existingSkillsMap = new Map(
      (empSkills || []).map((es: any) => [es.skill_id, es.level])
    )

    employeeSkillRatings.value = skillLibrary.value.map((skill: any) => {
      const existingLevel = existingSkillsMap.get(skill.id) ?? 0
      return {
        skill_id: skill.id,
        skill_name: skill.name,
        skill_description: skill.description || undefined,
        category: skill.category,
        level: existingLevel,
        originalLevel: existingLevel,
        isDirty: false,
        saving: false
      }
    }).sort((a: SkillRating, b: SkillRating) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category)
      return a.skill_name.localeCompare(b.skill_name)
    })
  } catch (err) {
    console.error('Error loading employee skills:', err)
    toast.error('Failed to load employee skills')
  }
}

const markDirty = (skillRating: SkillRating) => {
  skillRating.isDirty = skillRating.level !== skillRating.originalLevel
}

const saveSkillRating = async (skillRating: SkillRating) => {
  if (!selectedEmployeeId.value) return

  skillRating.saving = true
  try {
    const { data: existing, error: checkError } = await client
      .from('employee_skills')
      .select('id')
      .eq('employee_id', selectedEmployeeId.value)
      .eq('skill_id', skillRating.skill_id)
      .maybeSingle()

    if (checkError) throw checkError

    let saveError

    if (existing?.id) {
      const { error } = await client
        .from('employee_skills')
        .update({ level: skillRating.level })
        .eq('id', existing.id)
      saveError = error
    } else {
      const { error } = await client
        .from('employee_skills')
        .insert({
          employee_id: selectedEmployeeId.value,
          skill_id: skillRating.skill_id,
          level: skillRating.level
        })
      saveError = error
    }

    if (saveError) throw saveError

    skillRating.originalLevel = skillRating.level
    skillRating.isDirty = false
    toast.success(`Saved ${skillRating.skill_name}: Level ${skillRating.level}`)
    
    // Refresh analytics data in background
    await fetchAnalyticsData()
  } catch (err: any) {
    console.error('Error saving skill rating:', err)
    toast.error(err?.message || 'Failed to save skill rating')
  } finally {
    skillRating.saving = false
  }
}

const saveAllChanges = async () => {
  const dirtySkills = employeeSkillRatings.value.filter(s => s.isDirty)
  if (dirtySkills.length === 0) return

  savingAll.value = true
  try {
    await Promise.all(dirtySkills.map(s => saveSkillRating(s)))
    toast.success(`Saved ${dirtySkills.length} skill rating(s)`)
  } catch (err) {
    console.error('Error saving all changes:', err)
  } finally {
    savingAll.value = false
  }
}

// =================== Analytics Methods ===================
const exportReport = () => {
  const lines = [
    'Skill Stats Report',
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    'Summary',
    `Total Employees,${totalEmployees.value}`,
    `Total Skills,${totalSkillsCount.value}`,
    `Average Skill Level,${averageSkillLevel.value.toFixed(2)}`,
    `Skill Coverage,${skillCoverage.value}%`
  ]
  
  const csv = lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `skill-stats-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  
  toast.success('Report exported successfully')
}

// =================== Data Fetching ===================
const fetchAnalyticsData = async () => {
  try {
    const [empRes, skillRes, esRes] = await Promise.all([
      client.from('employees').select('id, first_name, last_name'),
      client.from('skill_library').select('id, name, category, description, level_descriptions'),
      client.from('employee_skills').select('employee_id, skill_id, level')
    ])
    
    employees.value = empRes.data || []
    skillLibrary.value = skillRes.data || []
    employeeSkills.value = esRes.data || []
  } catch (error) {
    console.error('Error fetching analytics data:', error)
    toast.error('Failed to load data')
  }
}

const fetchPositions = async () => {
  try {
    const { data, error } = await client
      .from('job_positions')
      .select('id, title')
      .order('title')
    if (error) throw error
    allPositions.value = data || []
  } catch (err) {
    console.error('Error fetching positions:', err)
  }
}

const fetchAllData = async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchSkills(),
      fetchAnalyticsData(),
      fetchPositions()
    ])
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAllData()
})
</script>

<style scoped>
.skeleton-pulse {
  background: linear-gradient(
    90deg,
    rgba(var(--v-theme-surface-variant), 0.3) 0%,
    rgba(var(--v-theme-surface-variant), 0.5) 50%,
    rgba(var(--v-theme-surface-variant), 0.3) 100%
  );
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.cursor-pointer {
  cursor: pointer;
}

.v-timeline-item :deep(.v-timeline-item__body) {
  width: 100%;
}
</style>
