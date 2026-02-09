<template>
  <div class="course-creator">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <v-btn icon="mdi-arrow-left" variant="text" size="small" aria-label="Go back" @click="navigateTo('/academy/course-manager')" />
          <h1 class="text-h4 font-weight-bold">Course Creator</h1>
        </div>
        <p class="text-body-1 text-grey-darken-1 ml-10">
          {{ isEditing ? 'Edit your course content' : 'Build a new training course' }}
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-chip v-if="course.id" :color="course.is_published ? 'success' : 'warning'" variant="flat">
          {{ course.is_published ? 'Published' : 'Draft' }}
        </v-chip>
        <v-btn
          v-if="course.id && !course.is_published && currentStep === 4"
          color="success"
          variant="flat"
          prepend-icon="mdi-publish"
          @click="publishCourse"
          :loading="publishing"
        >
          Publish Course
        </v-btn>
      </div>
    </div>

    <!-- Stepper Progress -->
    <v-card rounded="xl" class="mb-6">
      <v-card-text class="pa-4">
        <v-stepper 
          v-model="currentStep" 
          :items="stepItems"
          alt-labels
          flat
          hide-actions
          class="bg-transparent"
        >
          <template #[`item.1`]>
            <!-- Step 1: Course Identity -->
            <div class="pa-4">
              <h2 class="text-h5 font-weight-bold mb-4">📝 Course Identity</h2>
              <p class="text-body-2 text-grey mb-6">Define the basic information for your course</p>
              
              <v-row>
                <v-col cols="12" md="8">
                  <v-text-field
                    v-model="course.title"
                    label="Course Title *"
                    placeholder="e.g., IV Placement Fundamentals"
                    variant="outlined"
                    :rules="[v => !!v || 'Title is required']"
                    class="mb-4"
                  />
                  
                  <v-textarea
                    v-model="course.description"
                    label="Description"
                    placeholder="What will learners gain from this course?"
                    variant="outlined"
                    rows="4"
                    class="mb-4"
                  />
                  
                  <v-row>
                    <v-col cols="12" sm="6">
                      <v-autocomplete
                        v-model="course.skill_id"
                        :items="skills"
                        item-title="name"
                        item-value="id"
                        label="Linked Skill (for V3 Auto-Verification)"
                        placeholder="Search skills..."
                        variant="outlined"
                        clearable
                        :loading="loadingSkills"
                      >
                        <template #item="{ item, props }">
                          <v-list-item v-bind="props">
                            <template #prepend>
                              <v-chip size="x-small" color="primary" variant="tonal">
                                {{ item.raw.category }}
                              </v-chip>
                            </template>
                          </v-list-item>
                        </template>
                      </v-autocomplete>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model.number="course.est_minutes"
                        label="Estimated Duration (minutes)"
                        type="number"
                        min="1"
                        variant="outlined"
                        prepend-inner-icon="mdi-clock-outline"
                      />
                    </v-col>
                  </v-row>
                </v-col>
                
                <v-col cols="12" md="4">
                  <v-card variant="outlined" rounded="lg" class="text-center pa-6">
                    <div v-if="course.cover_image_url" class="mb-4">
                      <v-img
                        :src="course.cover_image_url"
                        height="150"
                        cover
                        rounded="lg"
                      />
                    </div>
                    <div v-else class="cover-placeholder mb-4">
                      <v-icon size="64" color="grey-lighten-1">mdi-image-plus</v-icon>
                    </div>
                    <v-btn
                      variant="outlined"
                      size="small"
                      prepend-icon="mdi-upload"
                      @click="uploadCoverImage"
                    >
                      Upload Cover Image
                    </v-btn>
                    <input
                      ref="coverInput"
                      type="file"
                      accept="image/*"
                      hidden
                      @change="handleCoverUpload"
                    />
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </template>
          
          <template #[`item.2`]>
            <!-- Step 2: Curriculum Builder -->
            <div class="pa-4">
              <div class="d-flex align-center justify-space-between mb-4">
                <div>
                  <h2 class="text-h5 font-weight-bold">📚 Curriculum Builder</h2>
                  <p class="text-body-2 text-grey">Add learning modules to your course</p>
                </div>
                <div class="d-flex gap-2">
                  <v-btn
                    color="red"
                    variant="tonal"
                    prepend-icon="mdi-youtube"
                    @click="openModuleModal('video')"
                  >
                    Add Video
                  </v-btn>
                  <v-btn
                    color="orange"
                    variant="tonal"
                    prepend-icon="mdi-file-pdf-box"
                    @click="openModuleModal('pdf')"
                  >
                    Add PDF
                  </v-btn>
                  <v-btn
                    color="blue"
                    variant="tonal"
                    prepend-icon="mdi-text-box"
                    @click="openModuleModal('rich_text')"
                  >
                    Add Text
                  </v-btn>
                  <v-btn
                    color="purple"
                    variant="tonal"
                    prepend-icon="mdi-web"
                    @click="openModuleModal('embed')"
                  >
                    Add Embed
                  </v-btn>
                </div>
              </div>
              
              <!-- Modules List -->
              <v-card v-if="modules.length === 0" variant="outlined" rounded="lg" class="text-center py-12">
                <v-icon size="64" color="grey-lighten-1">mdi-book-open-blank-variant</v-icon>
                <h3 class="text-h6 mt-4">No modules yet</h3>
                <p class="text-grey">Click the buttons above to add your first learning module</p>
              </v-card>
              
              <draggable
                v-else
                v-model="modules"
                item-key="id"
                handle=".drag-handle"
                @end="reorderModules"
              >
                <template #item="{ element, index }">
                  <v-card 
                    class="mb-3 module-card" 
                    rounded="lg"
                    :class="{ 'border-primary': element.editing }"
                  >
                    <v-card-text class="d-flex align-center gap-3">
                      <v-icon class="drag-handle cursor-grab" color="grey">mdi-drag</v-icon>
                      
                      <v-avatar :color="getModuleColor(element.module_type)" size="40">
                        <v-icon color="white">{{ getModuleIcon(element.module_type) }}</v-icon>
                      </v-avatar>
                      
                      <div class="flex-grow-1">
                        <div class="d-flex align-center gap-2">
                          <span class="text-caption text-grey">{{ index + 1 }}.</span>
                          <span class="font-weight-medium">{{ element.title }}</span>
                          <v-chip size="x-small" :color="getModuleColor(element.module_type)" variant="tonal">
                            {{ element.module_type }}
                          </v-chip>
                        </div>
                        <div class="text-caption text-grey">
                          {{ getModulePreview(element) }}
                        </div>
                      </div>
                      
                      <div class="d-flex gap-1">
                        <v-btn icon="mdi-pencil" size="small" variant="text" aria-label="Edit" @click="editModule(element)" />
                        <v-btn icon="mdi-delete" size="small" variant="text" color="error" aria-label="Delete" @click="deleteModule(element)" />
                      </div>
                    </v-card-text>
                  </v-card>
                </template>
              </draggable>
            </div>
          </template>
          
          <template #[`item.3`]>
            <!-- Step 3: Quiz Builder -->
            <div class="pa-4">
              <div class="d-flex align-center justify-space-between mb-4">
                <div>
                  <h2 class="text-h5 font-weight-bold">❓ Quiz Builder</h2>
                  <p class="text-body-2 text-grey">Create assessment questions for your course</p>
                </div>
                <v-btn
                  color="primary"
                  variant="flat"
                  prepend-icon="mdi-plus"
                  @click="addQuestion"
                >
                  Add Question
                </v-btn>
              </div>
              
              <!-- Questions List -->
              <v-card v-if="questions.length === 0" variant="outlined" rounded="lg" class="text-center py-12">
                <v-icon size="64" color="grey-lighten-1">mdi-help-circle-outline</v-icon>
                <h3 class="text-h6 mt-4">No quiz questions yet</h3>
                <p class="text-grey">Add questions to test learner comprehension</p>
                <v-btn color="primary" variant="tonal" class="mt-4" @click="addQuestion">
                  Add First Question
                </v-btn>
              </v-card>
              
              <div v-else class="questions-list">
                <v-card
                  v-for="(question, qIndex) in questions"
                  :key="question.id || qIndex"
                  class="mb-4 question-card"
                  rounded="lg"
                >
                  <v-card-text>
                    <div class="d-flex align-center gap-3 mb-4">
                      <v-avatar color="primary" size="32">
                        <span class="text-white font-weight-bold">{{ qIndex + 1 }}</span>
                      </v-avatar>
                      <v-text-field
                        v-model="question.question_text"
                        label="Question"
                        placeholder="Enter your question..."
                        variant="outlined"
                        density="compact"
                        hide-details
                        class="flex-grow-1"
                      />
                      <v-btn
                        icon="mdi-delete"
                        size="small"
                        variant="text"
                        color="error"
                        @click="deleteQuestion(qIndex)"
                      />
                    </div>
                    
                    <!-- Options -->
                    <div class="options-list ml-10">
                      <div
                        v-for="(option, oIndex) in question.options"
                        :key="oIndex"
                        class="d-flex align-center gap-2 mb-2"
                      >
                        <v-radio
                          :model-value="getCorrectOptionIndex(question)"
                          :value="oIndex"
                          color="success"
                          hide-details
                          @update:model-value="setCorrectOption(question, oIndex)"
                        />
                        <v-text-field
                          v-model="option.option_text"
                          :label="`Option ${String.fromCharCode(65 + oIndex)}`"
                          variant="outlined"
                          density="compact"
                          hide-details
                          class="flex-grow-1"
                        />
                        <v-btn
                          v-if="question.options.length > 2"
                          icon="mdi-close"
                          size="x-small"
                          variant="text"
                          @click="removeOption(question, oIndex)"
                        />
                      </div>
                      
                      <v-btn
                        v-if="question.options.length < 6"
                        variant="text"
                        size="small"
                        prepend-icon="mdi-plus"
                        color="primary"
                        class="mt-2"
                        @click="addOption(question)"
                      >
                        Add Option
                      </v-btn>
                      
                      <div v-if="!hasCorrectOption(question)" class="text-caption text-error mt-2">
                        ⚠️ Please select the correct answer
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </div>
          </template>
          
          <template #[`item.4`]>
            <!-- Step 4: Assignment -->
            <div class="pa-4">
              <h2 class="text-h5 font-weight-bold mb-4">🎯 Course Assignment</h2>
              <p class="text-body-2 text-grey mb-6">Who should take this course?</p>
              
              <v-row>
                <v-col cols="12" md="8">
                  <v-card variant="outlined" rounded="lg" class="mb-4">
                    <v-card-text>
                      <v-radio-group v-model="assignmentType" class="mt-0">
                        <v-radio value="none" color="grey">
                          <template #label>
                            <div>
                              <div class="font-weight-medium">Don't Assign Yet</div>
                              <div class="text-caption text-grey">Save as draft and assign later</div>
                            </div>
                          </template>
                        </v-radio>
                        
                        <v-radio value="everyone" color="primary" class="mt-4">
                          <template #label>
                            <div>
                              <div class="font-weight-medium">Everyone</div>
                              <div class="text-caption text-grey">Assign to all active employees</div>
                            </div>
                          </template>
                        </v-radio>
                        
                        <v-radio value="department" color="blue" class="mt-4">
                          <template #label>
                            <div>
                              <div class="font-weight-medium">Specific Department</div>
                              <div class="text-caption text-grey">Target a specific team</div>
                            </div>
                          </template>
                        </v-radio>
                        
                        <v-radio 
                          value="smart" 
                          color="success" 
                          class="mt-4"
                          :disabled="!course.skill_id"
                        >
                          <template #label>
                            <div>
                              <div class="d-flex align-center gap-2">
                                <span class="font-weight-medium">🧠 Smart Assign (Skill Gap)</span>
                                <v-chip size="x-small" color="success" variant="flat">AI</v-chip>
                              </div>
                              <div class="text-caption text-grey">
                                {{ course.skill_id 
                                  ? `Assign to users with ${getSkillName(course.skill_id)} rating < 3` 
                                  : 'Requires linked skill in Step 1' 
                                }}
                              </div>
                            </div>
                          </template>
                        </v-radio>
                      </v-radio-group>
                      
                      <!-- Department Selector -->
                      <v-select
                        v-if="assignmentType === 'department'"
                        v-model="selectedDepartment"
                        :items="departments"
                        label="Select Department"
                        variant="outlined"
                        class="mt-4"
                      />
                      
                      <!-- Due Date -->
                      <v-text-field
                        v-if="assignmentType !== 'none'"
                        v-model="dueDays"
                        label="Days Until Due"
                        type="number"
                        min="1"
                        variant="outlined"
                        class="mt-4"
                        hint="Number of days from assignment"
                        persistent-hint
                      />
                    </v-card-text>
                  </v-card>
                </v-col>
                
                <v-col cols="12" md="4">
                  <!-- Course Summary Card -->
                  <v-card rounded="lg" color="grey-lighten-4">
                    <v-card-title class="text-subtitle-1 font-weight-bold">
                      📋 Course Summary
                    </v-card-title>
                    <v-card-text>
                      <v-list density="compact" class="bg-transparent">
                        <v-list-item>
                          <template #prepend>
                            <v-icon size="18" color="primary">mdi-book</v-icon>
                          </template>
                          <v-list-item-title>{{ course.title || 'Untitled' }}</v-list-item-title>
                        </v-list-item>
                        <v-list-item>
                          <template #prepend>
                            <v-icon size="18" color="blue">mdi-clock</v-icon>
                          </template>
                          <v-list-item-title>{{ course.est_minutes }} minutes</v-list-item-title>
                        </v-list-item>
                        <v-list-item>
                          <template #prepend>
                            <v-icon size="18" color="orange">mdi-view-list</v-icon>
                          </template>
                          <v-list-item-title>{{ modules.length }} modules</v-list-item-title>
                        </v-list-item>
                        <v-list-item>
                          <template #prepend>
                            <v-icon size="18" color="green">mdi-help-circle</v-icon>
                          </template>
                          <v-list-item-title>{{ questions.length }} quiz questions</v-list-item-title>
                        </v-list-item>
                        <v-list-item v-if="course.skill_id">
                          <template #prepend>
                            <v-icon size="18" color="purple">mdi-star</v-icon>
                          </template>
                          <v-list-item-title>{{ getSkillName(course.skill_id) }}</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </template>
        </v-stepper>
        
        <!-- Navigation Buttons -->
        <v-divider class="my-4" />
        <div class="d-flex justify-space-between">
          <v-btn
            v-if="currentStep > 1"
            variant="outlined"
            @click="currentStep--"
          >
            <v-icon start>mdi-chevron-left</v-icon>
            Previous
          </v-btn>
          <v-spacer v-else />
          
          <div class="d-flex gap-2">
            <v-btn
              variant="text"
              @click="saveDraft"
              :loading="saving"
            >
              Save Draft
            </v-btn>
            
            <v-btn
              v-if="currentStep < 4"
              color="primary"
              @click="nextStep"
              :loading="saving"
              :disabled="!canProceed"
            >
              {{ currentStep === 1 && !course.id ? 'Create & Continue' : 'Next' }}
              <v-icon end>mdi-chevron-right</v-icon>
            </v-btn>
            
            <v-btn
              v-else
              color="success"
              @click="finishCourse"
              :loading="saving"
            >
              <v-icon start>mdi-check</v-icon>
              {{ assignmentType === 'none' ? 'Save Course' : 'Save & Assign' }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
    
    <!-- Module Modal -->
    <v-dialog v-model="moduleModal" max-width="600" persistent>
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center gap-2">
          <v-avatar :color="getModuleColor(moduleForm.module_type)" size="36">
            <v-icon color="white" size="20">{{ getModuleIcon(moduleForm.module_type) }}</v-icon>
          </v-avatar>
          {{ editingModule ? 'Edit' : 'Add' }} {{ moduleForm.module_type?.replace('_', ' ') }} Module
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" aria-label="Close" @click="moduleModal = false" />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text class="pa-4">
          <v-text-field
            v-model="moduleForm.title"
            label="Module Title *"
            placeholder="e.g., Introduction Video"
            variant="outlined"
            class="mb-4"
          />
          
          <!-- Video Input -->
          <template v-if="moduleForm.module_type === 'video'">
            <v-text-field
              v-model="moduleForm.content_payload.url"
              label="YouTube URL *"
              placeholder="https://www.youtube.com/watch?v=..."
              variant="outlined"
              prepend-inner-icon="mdi-youtube"
            />
            <v-select
              v-model="moduleForm.content_payload.provider"
              :items="['youtube', 'vimeo', 'other']"
              label="Video Provider"
              variant="outlined"
              class="mt-4"
            />
          </template>
          
          <!-- PDF Input -->
          <template v-else-if="moduleForm.module_type === 'pdf'">
            <v-file-input
              v-model="pdfFile"
              label="Upload PDF"
              accept=".pdf"
              variant="outlined"
              prepend-icon="mdi-file-pdf-box"
              @change="handlePdfUpload"
            />
            <v-text-field
              v-if="moduleForm.content_payload.path"
              :model-value="moduleForm.content_payload.path"
              label="PDF Path"
              variant="outlined"
              readonly
              class="mt-4"
            />
          </template>
          
          <!-- Rich Text Input -->
          <template v-else-if="moduleForm.module_type === 'rich_text'">
            <v-textarea
              v-model="moduleForm.content_payload.html"
              label="Content (HTML supported)"
              placeholder="<p>Enter your content here...</p>"
              variant="outlined"
              rows="8"
            />
          </template>
          
          <!-- Embed Input -->
          <template v-else-if="moduleForm.module_type === 'embed'">
            <v-text-field
              v-model="moduleForm.content_payload.url"
              label="Embed URL *"
              placeholder="https://..."
              variant="outlined"
              prepend-inner-icon="mdi-web"
            />
            <v-select
              v-model="moduleForm.content_payload.type"
              :items="['iframe', 'oembed', 'custom']"
              label="Embed Type"
              variant="outlined"
              class="mt-4"
            />
          </template>
          
          <v-text-field
            v-model.number="moduleForm.est_minutes"
            label="Estimated Minutes"
            type="number"
            min="1"
            variant="outlined"
            class="mt-4"
          />
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="moduleModal = false">Cancel</v-btn>
          <v-btn
            color="primary"
            @click="saveModule"
            :loading="savingModule"
          >
            {{ editingModule ? 'Update' : 'Add' }} Module
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Success Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
// Dynamic import for SSR compatibility
const draggable = defineAsyncComponent(() => import('vuedraggable'))

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'gdu']
})

useHead({
  title: 'Course Creator'
})

// Use any type to bypass strict typing for new tables not in generated types
const supabase = useSupabaseClient() as any
const route = useRoute()
const { currentUserProfile } = useAppData()

// Step configuration
const stepItems = [
  { title: 'Identity', value: 1 },
  { title: 'Curriculum', value: 2 },
  { title: 'Quiz', value: 3 },
  { title: 'Assign', value: 4 }
]

const currentStep = ref(1)
const isEditing = computed(() => !!route.query.id)

// Course state
const course = ref({
  id: null as string | null,
  title: '',
  description: '',
  cover_image_url: '',
  skill_id: null as string | null,
  est_minutes: 15,
  is_published: false
})

// Module state
const modules = ref<any[]>([])
const moduleModal = ref(false)
const editingModule = ref<any>(null)
const moduleForm = ref({
  id: null as string | null,
  module_type: 'video' as string,
  title: '',
  content_payload: {} as any,
  est_minutes: 5,
  order_index: 0
})
const pdfFile = ref<File | null>(null)
const savingModule = ref(false)

// Question state
const questions = ref<any[]>([])

// Assignment state
const assignmentType = ref('none')
const selectedDepartment = ref('')
const dueDays = ref(30)
const departments = ref<string[]>([])

// Skills for dropdown
const skills = ref<any[]>([])
const loadingSkills = ref(false)

// UI state
const saving = ref(false)
const publishing = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const coverInput = ref<HTMLInputElement | null>(null)

// Computed
const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return !!course.value.title
  }
  return true
})

// Methods
const showMessage = (text: string, color = 'success') => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

const fetchSkills = async () => {
  loadingSkills.value = true
  try {
    const { data } = await supabase
      .from('skills')
      .select('id, name, category')
      .order('category')
      .order('name')
    skills.value = data || []
  } catch (err) {
    console.error('Error fetching skills:', err)
  } finally {
    loadingSkills.value = false
  }
}

const fetchDepartments = async () => {
  try {
    const { data } = await supabase
      .from('employees')
      .select('department')
      .not('department', 'is', null)
    
    const deptList = data as Array<{ department: string }> || []
    const unique = [...new Set(deptList.map(e => e.department).filter(Boolean))]
    departments.value = unique
  } catch (err) {
    console.error('Error fetching departments:', err)
  }
}

const getSkillName = (skillId: string) => {
  return skills.value.find(s => s.id === skillId)?.name || 'Unknown'
}

// Step 1: Course Identity
const uploadCoverImage = () => {
  coverInput.value?.click()
}

const handleCoverUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  try {
    const fileName = `covers/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('course-assets')
      .upload(fileName, file)
    
    if (error) throw error
    
    const { data: urlData } = supabase.storage
      .from('course-assets')
      .getPublicUrl(fileName)
    
    course.value.cover_image_url = urlData.publicUrl
    showMessage('Cover image uploaded!')
  } catch (err) {
    console.error('Upload error:', err)
    showMessage('Failed to upload image', 'error')
  }
}

const saveCourseIdentity = async () => {
  saving.value = true
  try {
    if (course.value.id) {
      // Update existing
      const { error } = await supabase
        .from('courses')
        .update({
          title: course.value.title,
          description: course.value.description,
          cover_image_url: course.value.cover_image_url,
          skill_id: course.value.skill_id,
          est_minutes: course.value.est_minutes
        })
        .eq('id', course.value.id)
      
      if (error) throw error
    } else {
      // Create new (Draft Mode)
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: course.value.title,
          description: course.value.description,
          cover_image_url: course.value.cover_image_url,
          skill_id: course.value.skill_id,
          est_minutes: course.value.est_minutes,
          created_by: currentUserProfile.value?.id,
          is_published: false
        })
        .select()
        .single()
      
      if (error) throw error
      course.value.id = data.id
    }
    
    showMessage('Course saved!')
    return true
  } catch (err) {
    console.error('Error saving course:', err)
    showMessage('Failed to save course', 'error')
    return false
  } finally {
    saving.value = false
  }
}

// Step 2: Modules
const getModuleIcon = (type: string) => {
  const icons: Record<string, string> = {
    video: 'mdi-play-circle',
    pdf: 'mdi-file-pdf-box',
    rich_text: 'mdi-text-box',
    embed: 'mdi-web',
    quiz: 'mdi-help-circle'
  }
  return icons[type] || 'mdi-file'
}

const getModuleColor = (type: string) => {
  const colors: Record<string, string> = {
    video: 'red',
    pdf: 'orange',
    rich_text: 'blue',
    embed: 'purple',
    quiz: 'green'
  }
  return colors[type] || 'grey'
}

const getModulePreview = (module: any) => {
  if (module.module_type === 'video') {
    return module.content_payload?.url || 'No URL set'
  }
  if (module.module_type === 'pdf') {
    return module.content_payload?.path || 'No file uploaded'
  }
  if (module.module_type === 'rich_text') {
    const text = module.content_payload?.html || ''
    return text.replace(/<[^>]*>/g, '').substring(0, 50) + '...'
  }
  return `${module.est_minutes} min`
}

const openModuleModal = (type: string) => {
  editingModule.value = null
  moduleForm.value = {
    id: null,
    module_type: type,
    title: '',
    content_payload: type === 'video' ? { provider: 'youtube', url: '' } : {},
    est_minutes: 5,
    order_index: modules.value.length
  }
  pdfFile.value = null
  moduleModal.value = true
}

const editModule = (module: any) => {
  editingModule.value = module
  moduleForm.value = { ...module, content_payload: { ...module.content_payload } }
  moduleModal.value = true
}

const handlePdfUpload = async () => {
  // Handle v-file-input which returns an array in Vuetify 3
  const fileInput = pdfFile.value
  const file = Array.isArray(fileInput) ? fileInput[0] : fileInput
  
  if (!file) return
  
  try {
    const fileName = `pdfs/${Date.now()}-${file.name}`
    const { error } = await supabase.storage
      .from('course-assets')
      .upload(fileName, file)
    
    if (error) throw error
    
    moduleForm.value.content_payload.path = fileName
    showMessage('PDF uploaded!')
  } catch (err) {
    console.error('PDF upload error:', err)
    showMessage('Failed to upload PDF', 'error')
  }
}

const saveModule = async () => {
  if (!course.value.id) {
    showMessage('Please save course identity first', 'error')
    return
  }
  
  savingModule.value = true
  try {
    const moduleData = {
      course_id: course.value.id,
      module_type: moduleForm.value.module_type,
      title: moduleForm.value.title,
      content_payload: moduleForm.value.content_payload,
      est_minutes: moduleForm.value.est_minutes,
      order_index: moduleForm.value.order_index
    }
    
    if (editingModule.value) {
      const { error } = await supabase
        .from('course_modules')
        .update(moduleData)
        .eq('id', editingModule.value.id)
      
      if (error) throw error
      
      const idx = modules.value.findIndex(m => m.id === editingModule.value.id)
      if (idx >= 0) {
        modules.value[idx] = { ...modules.value[idx], ...moduleData }
      }
    } else {
      const { data, error } = await supabase
        .from('course_modules')
        .insert(moduleData)
        .select()
        .single()
      
      if (error) throw error
      modules.value.push(data)
    }
    
    moduleModal.value = false
    showMessage('Module saved!')
  } catch (err) {
    console.error('Error saving module:', err)
    showMessage('Failed to save module', 'error')
  } finally {
    savingModule.value = false
  }
}

const deleteModule = async (module: any) => {
  if (!confirm('Delete this module?')) return
  
  try {
    const { error } = await supabase
      .from('course_modules')
      .delete()
      .eq('id', module.id)
    
    if (error) throw error
    
    modules.value = modules.value.filter(m => m.id !== module.id)
    showMessage('Module deleted')
  } catch (err) {
    console.error('Error deleting module:', err)
    showMessage('Failed to delete module', 'error')
  }
}

const reorderModules = async () => {
  try {
    for (let i = 0; i < modules.value.length; i++) {
      await supabase
        .from('course_modules')
        .update({ order_index: i })
        .eq('id', modules.value[i].id)
    }
  } catch (err) {
    console.error('Error reordering:', err)
  }
}

// Step 3: Quiz
const addQuestion = () => {
  questions.value.push({
    id: `temp-${Date.now()}`,
    question_text: '',
    order_index: questions.value.length,
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false }
    ]
  })
}

const deleteQuestion = (index: number) => {
  questions.value.splice(index, 1)
}

const addOption = (question: any) => {
  question.options.push({ option_text: '', is_correct: false })
}

const removeOption = (question: any, index: number) => {
  question.options.splice(index, 1)
}

const getCorrectOptionIndex = (question: any) => {
  return question.options.findIndex((o: any) => o.is_correct)
}

const setCorrectOption = (question: any, index: number) => {
  question.options.forEach((o: any, i: number) => {
    o.is_correct = i === index
  })
}

const hasCorrectOption = (question: any) => {
  return question.options.some((o: any) => o.is_correct)
}

const saveQuiz = async () => {
  if (!course.value.id) return
  
  try {
    // Delete existing questions for this course
    await supabase
      .from('quiz_questions')
      .delete()
      .eq('course_id', course.value.id)
    
    // Insert new questions and options
    for (const question of questions.value) {
      const { data: qData, error: qError } = await supabase
        .from('quiz_questions')
        .insert({
          course_id: course.value.id,
          question_text: question.question_text,
          order_index: question.order_index
        })
        .select()
        .single()
      
      if (qError) throw qError
      
      // Insert options
      for (const option of question.options) {
        await supabase
          .from('quiz_options')
          .insert({
            question_id: qData.id,
            option_text: option.option_text,
            is_correct: option.is_correct
          })
      }
    }
    
    showMessage('Quiz saved!')
  } catch (err) {
    console.error('Error saving quiz:', err)
    showMessage('Failed to save quiz', 'error')
  }
}

// Step 4: Assignment
const assignCourse = async () => {
  if (!course.value.id || assignmentType.value === 'none') return 0
  
  try {
    let assignedCount = 0
    
    if (assignmentType.value === 'everyone') {
      const { data } = await supabase.rpc('assign_course_to_all', {
        p_course_id: course.value.id,
        p_due_days: dueDays.value,
        p_assigned_by: currentUserProfile.value?.id
      })
      assignedCount = data || 0
    } else if (assignmentType.value === 'department') {
      const { data } = await supabase.rpc('assign_course_to_department', {
        p_course_id: course.value.id,
        p_department: selectedDepartment.value,
        p_due_days: dueDays.value,
        p_assigned_by: currentUserProfile.value?.id
      })
      assignedCount = data || 0
    } else if (assignmentType.value === 'smart') {
      const { data } = await supabase.rpc('smart_assign_course', {
        p_course_id: course.value.id,
        p_skill_threshold: 3,
        p_due_days: dueDays.value,
        p_assigned_by: currentUserProfile.value?.id
      })
      assignedCount = data || 0
    }
    
    return assignedCount
  } catch (err) {
    console.error('Error assigning course:', err)
    return 0
  }
}

// Navigation
const nextStep = async () => {
  if (currentStep.value === 1) {
    const saved = await saveCourseIdentity()
    if (!saved) return
  }
  
  if (currentStep.value === 3) {
    await saveQuiz()
  }
  
  currentStep.value++
}

const saveDraft = async () => {
  if (currentStep.value === 1) {
    await saveCourseIdentity()
  } else if (currentStep.value === 3) {
    await saveQuiz()
  }
}

const finishCourse = async () => {
  saving.value = true
  try {
    // Save quiz first
    await saveQuiz()
    
    // Assign if needed
    const assignedCount = await assignCourse()
    
    if (assignedCount > 0) {
      showMessage(`Course saved! Assigned to ${assignedCount} users.`)
    } else {
      showMessage('Course saved!')
    }
    
    // Navigate back to academy
    setTimeout(() => {
      navigateTo('/academy')
    }, 1500)
  } catch (err) {
    console.error('Error finishing course:', err)
    showMessage('Error saving course', 'error')
  } finally {
    saving.value = false
  }
}

const publishCourse = async () => {
  if (!course.value.id) return
  
  publishing.value = true
  try {
    const { error } = await supabase
      .from('courses')
      .update({ is_published: true })
      .eq('id', course.value.id)
    
    if (error) throw error
    
    course.value.is_published = true
    showMessage('Course published!')
  } catch (err) {
    console.error('Error publishing:', err)
    showMessage('Failed to publish', 'error')
  } finally {
    publishing.value = false
  }
}

// Load existing course if editing
const loadCourse = async () => {
  const courseId = route.query.id as string
  if (!courseId) return
  
  try {
    // Load course
    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()
    
    if (courseData) {
      course.value = courseData
    }
    
    // Load modules
    const { data: modulesData } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index')
    
    modules.value = modulesData || []
    
    // Load questions with options
    const { data: questionsData } = await supabase
      .from('quiz_questions')
      .select('*, quiz_options(*)')
      .eq('course_id', courseId)
      .order('order_index')
    
    const questionsList = questionsData as Array<any> || []
    questions.value = questionsList.map(q => ({
      ...q,
      options: q.quiz_options || []
    }))
  } catch (err) {
    console.error('Error loading course:', err)
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchSkills(),
    fetchDepartments(),
    loadCourse()
  ])
})
</script>

<style scoped>
.course-creator {
  max-width: 1200px;
  margin: 0 auto;
}

.cover-placeholder {
  height: 150px;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.module-card {
  transition: all 0.2s ease;
}

.module-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.drag-handle {
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.question-card {
  border-left: 4px solid rgb(var(--v-theme-primary));
}
</style>
