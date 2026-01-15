<template>
  <div class="growth-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">My Growth</h1>
        <p class="text-body-2 text-grey-darken-1">Track your skills, goals, reviews, and mentorship progress</p>
      </div>
      <!-- Quick actions based on active tab -->
      <div v-if="mainTab === 'goals'" class="d-flex gap-2">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateGoalDialog = true">
          New Goal
        </v-btn>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 50vh;">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <template v-else>
      <!-- Main Tab Navigation -->
      <v-tabs v-model="mainTab" color="primary" class="mb-6" grow>
        <v-tab value="growth">
          <v-icon start>mdi-chart-line</v-icon>
          Skills & Mentorship
        </v-tab>
        <v-tab value="goals">
          <v-icon start>mdi-flag</v-icon>
          My Goals
          <v-badge v-if="atRiskGoalsCount > 0" :content="atRiskGoalsCount" color="error" inline class="ml-2" />
        </v-tab>
        <v-tab value="reviews">
          <v-icon start>mdi-clipboard-check</v-icon>
          My Reviews
          <v-badge v-if="pendingReviewsCount > 0" :content="pendingReviewsCount" color="warning" inline class="ml-2" />
        </v-tab>
      </v-tabs>

      <v-window v-model="mainTab">
        <!-- ========================================== -->
        <!-- TAB 1: Skills & Mentorship -->
        <!-- ========================================== -->
        <v-window-item value="growth">
          <v-row>
            <!-- Column 1: The Mirror (Stats & Skills) - 40% -->
            <v-col cols="12" md="5">
              <!-- Player Card Header -->
              <v-card rounded="lg" class="mb-4 player-card">
                <div class="player-card-header pa-4 text-center">
                  <v-avatar size="80" :color="currentEmployee?.avatar_url ? undefined : 'primary'" class="mb-3 elevation-4">
                    <v-img v-if="currentEmployee?.avatar_url" :src="currentEmployee.avatar_url" />
                    <span v-else class="text-h4 text-white font-weight-bold">{{ currentEmployee?.initials || '?' }}</span>
                  </v-avatar>
                  <h2 class="text-h6 font-weight-bold mb-1">{{ currentEmployee?.full_name || 'Employee' }}</h2>
                  <p class="text-body-2 text-grey mb-3">{{ currentEmployee?.position?.title || 'Team Member' }}</p>
                  
                  <!-- XP Progress Bar -->
                  <div class="xp-bar-container mx-auto" style="max-width: 250px;">
                    <div class="d-flex justify-space-between text-caption mb-1">
                      <span>Level {{ currentLevel }}</span>
                      <span>{{ totalPoints }} / {{ nextLevelPoints }} XP</span>
                    </div>
                    <v-progress-linear
                      :model-value="levelProgress"
                      color="primary"
                      height="8"
                      rounded
                    />
                    <p class="text-caption text-grey mt-1">{{ pointsToNextLevel }} XP to Level {{ currentLevel + 1 }}</p>
                  </div>
                </div>
              </v-card>

              <!-- Skill Hexagon (Radar Chart) -->
              <v-card rounded="lg" class="mb-4">
                <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
                  <v-icon start color="primary">mdi-radar</v-icon>
                  Skill Hexagon
                </v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <SkillHexagon 
                      v-if="skillCategories.length > 0"
                      :categories="skillCategories" 
                      :size="300"
                    />
                    <div v-else class="text-center py-8">
                      <v-icon size="48" color="grey-lighten-1">mdi-chart-radar</v-icon>
                      <p class="text-grey mt-2">No skills recorded yet</p>
                      <v-btn color="primary" variant="tonal" size="small" class="mt-2" to="/people/my-skills">
                        Add Skills
                      </v-btn>
                    </div>
                  </ClientOnly>
                </v-card-text>
              </v-card>

              <!-- Skill Gaps (To-Do List) -->
              <v-card rounded="lg">
                <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center">
                  <v-icon start color="warning">mdi-target</v-icon>
                  Skill Gaps
                  <v-spacer />
                  <v-chip size="x-small" color="warning" variant="tonal">{{ skillGaps.length }} areas</v-chip>
                </v-card-title>
                <v-divider />
                <v-list v-if="skillGaps.length > 0" density="compact" class="pa-0">
                  <v-list-item 
                    v-for="gap in skillGaps" 
                    :key="gap.id"
                    :class="{ 'bg-primary-lighten-5': selectedGap?.id === gap.id }"
                    @click="selectGap(gap)"
                  >
                    <template #prepend>
                      <v-icon size="20" :color="gap.is_goal ? 'success' : 'warning'">
                        {{ gap.is_goal ? 'mdi-flag' : 'mdi-arrow-up-bold' }}
                      </v-icon>
                    </template>
                    <v-list-item-title class="text-body-2">{{ gap.skill_name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      <div class="d-flex align-center gap-1">
                        <v-rating
                          :model-value="gap.rating"
                          readonly
                          density="compact"
                          size="12"
                          color="amber"
                          active-color="amber"
                        />
                        <span class="text-caption">({{ gap.rating }}/5)</span>
                      </div>
                    </v-list-item-subtitle>
                    <template #append>
                      <v-btn 
                        size="x-small" 
                        variant="tonal" 
                        color="primary"
                        @click.stop="findMentorForSkill(gap)"
                      >
                        Find Mentor
                      </v-btn>
                    </template>
                  </v-list-item>
                </v-list>
                <div v-else class="text-center py-8">
                  <v-icon size="48" color="success">mdi-check-circle</v-icon>
                  <p class="text-grey mt-2">All skills are looking great!</p>
                </div>
              </v-card>
            </v-col>

            <!-- Column 2: The Network (Mentorship Hub) - 60% -->
            <v-col cols="12" md="7">
              <v-card rounded="lg">
                <v-tabs v-model="mentorshipTab" color="primary" grow>
                  <v-tab value="find">
                    <v-icon start size="18">mdi-account-search</v-icon>
                    Find a Mentor
                  </v-tab>
                  <v-tab value="active">
                    <v-icon start size="18">mdi-account-group</v-icon>
                    My Mentorships
                    <v-badge 
                      v-if="pendingMentorshipRequests > 0" 
                      :content="pendingMentorshipRequests" 
                      color="warning" 
                      inline 
                      class="ml-2"
                    />
                  </v-tab>
                </v-tabs>

                <v-window v-model="mentorshipTab">
                  <!-- Find a Mentor Tab -->
                  <v-window-item value="find">
                    <div class="pa-4">
                      <!-- Filter by skill gap -->
                      <v-select
                        v-model="selectedSkillFilter"
                        :items="skillFilterOptions"
                        label="Filter by skill I want to learn"
                        variant="outlined"
                        density="compact"
                        clearable
                        class="mb-4"
                      />

                      <!-- Mentor Cards -->
                      <div v-if="filteredMentors.length === 0" class="text-center py-8">
                        <v-icon size="48" color="grey-lighten-1">mdi-account-search</v-icon>
                        <p class="text-grey mt-2">
                          {{ selectedSkillFilter ? 'No mentors found for this skill' : 'Select a skill to find mentors' }}
                        </p>
                      </div>

                      <v-row v-else>
                        <v-col 
                          v-for="mentor in filteredMentors" 
                          :key="mentor.id"
                          cols="12"
                          sm="6"
                        >
                          <v-card variant="outlined" rounded="lg" class="mentor-card">
                            <v-card-text class="text-center pb-2">
                              <v-avatar size="56" :color="mentor.avatar_url ? undefined : 'secondary'" class="mb-2">
                                <v-img v-if="mentor.avatar_url" :src="mentor.avatar_url" />
                                <span v-else class="text-white font-weight-bold">{{ mentor.initials }}</span>
                              </v-avatar>
                              <h4 class="text-subtitle-2 font-weight-bold">{{ mentor.full_name }}</h4>
                              <p class="text-caption text-grey mb-2">{{ mentor.position?.title || 'Team Member' }}</p>
                              
                              <!-- Skills they can teach -->
                              <div class="d-flex flex-wrap gap-1 justify-center mb-2">
                                <v-chip 
                                  v-for="skill in mentor.teachable_skills.slice(0, 3)" 
                                  :key="skill.skill_id"
                                  size="x-small"
                                  color="success"
                                  variant="tonal"
                                >
                                  {{ skill.skill_name }} ({{ skill.rating }})
                                </v-chip>
                              </div>
                            </v-card-text>
                            <v-card-actions class="pa-3 pt-0">
                              <v-btn 
                                block 
                                color="primary" 
                                variant="tonal"
                                size="small"
                                :loading="requestingMentor === mentor.id"
                                :disabled="hasRequestedMentor(mentor.id)"
                                @click="requestMentorship(mentor)"
                              >
                                <v-icon start size="16">mdi-account-plus</v-icon>
                                {{ hasRequestedMentor(mentor.id) ? 'Requested' : 'Request Mentorship' }}
                              </v-btn>
                            </v-card-actions>
                          </v-card>
                        </v-col>
                      </v-row>
                    </div>
                  </v-window-item>

                  <!-- My Mentorships Tab -->
                  <v-window-item value="active">
                    <div class="pa-4">
                      <!-- Learning (I am the Mentee) -->
                      <h4 class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center">
                        <v-icon start color="info">mdi-school</v-icon>
                        Learning From Others
                      </h4>
                      
                      <div v-if="learningMentorships.length === 0" class="text-center py-4 mb-4 bg-grey-lighten-5 rounded-lg">
                        <p class="text-grey mb-0">No active mentorships. Find a mentor above!</p>
                      </div>
                      
                      <v-list v-else density="compact" class="mb-4">
                        <v-list-item v-for="rel in learningMentorships" :key="rel.id">
                          <template #prepend>
                            <v-avatar size="36" color="secondary">
                              <span class="text-white text-caption">{{ rel.mentor_initials }}</span>
                            </v-avatar>
                          </template>
                          <v-list-item-title class="text-body-2">{{ rel.mentor_name }}</v-list-item-title>
                          <v-list-item-subtitle>{{ rel.skill_name }}</v-list-item-subtitle>
                          <template #append>
                            <v-chip :color="getMentorshipStatusColor(rel.status)" size="x-small">
                              {{ rel.status }}
                            </v-chip>
                          </template>
                        </v-list-item>
                      </v-list>

                      <v-divider class="my-4" />

                      <!-- Teaching (I am the Mentor) -->
                      <h4 class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center">
                        <v-icon start color="success">mdi-teach</v-icon>
                        Teaching Others
                        <v-badge 
                          v-if="pendingTeachingRequests.length > 0" 
                          :content="pendingTeachingRequests.length" 
                          color="warning" 
                          inline 
                          class="ml-2"
                        />
                      </h4>
                      
                      <div v-if="teachingMentorships.length === 0" class="text-center py-4 bg-grey-lighten-5 rounded-lg">
                        <p class="text-grey mb-0">No teaching relationships yet</p>
                      </div>
                      
                      <v-list v-else density="compact">
                        <v-list-item v-for="rel in teachingMentorships" :key="rel.id">
                          <template #prepend>
                            <v-avatar size="36" color="primary">
                              <span class="text-white text-caption">{{ rel.mentee_initials }}</span>
                            </v-avatar>
                          </template>
                          <v-list-item-title class="text-body-2">{{ rel.mentee_name }}</v-list-item-title>
                          <v-list-item-subtitle>Wants to learn: {{ rel.skill_name }}</v-list-item-subtitle>
                          <template #append>
                            <div v-if="rel.status === 'pending'" class="d-flex gap-1">
                              <v-btn 
                                size="x-small" 
                                color="success" 
                                variant="flat"
                                :loading="processingRequest === rel.id"
                                @click="handleMentorshipRequest(rel, 'accept')"
                              >
                                Accept
                              </v-btn>
                              <v-btn 
                                size="x-small" 
                                color="error" 
                                variant="outlined"
                                :loading="processingRequest === rel.id"
                                @click="handleMentorshipRequest(rel, 'decline')"
                              >
                                Decline
                              </v-btn>
                            </div>
                            <v-chip v-else :color="getMentorshipStatusColor(rel.status)" size="x-small">
                              {{ rel.status }}
                            </v-chip>
                          </template>
                        </v-list-item>
                      </v-list>
                    </div>
                  </v-window-item>
                </v-window>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- ========================================== -->
        <!-- TAB 2: My Goals -->
        <!-- ========================================== -->
        <v-window-item value="goals">
          <!-- Stats Cards -->
          <v-row class="mb-6">
            <v-col cols="6" sm="3">
              <v-card variant="tonal" color="primary" class="text-center pa-4">
                <div class="text-h4 font-weight-bold">{{ activeGoals.length }}</div>
                <div class="text-caption">Active Goals</div>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card variant="tonal" color="success" class="text-center pa-4">
                <div class="text-h4 font-weight-bold">{{ onTrackCount }}</div>
                <div class="text-caption">On Track</div>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card variant="tonal" color="error" class="text-center pa-4">
                <div class="text-h4 font-weight-bold">{{ atRiskGoalsCount }}</div>
                <div class="text-caption">At Risk</div>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card variant="tonal" color="grey" class="text-center pa-4">
                <div class="text-h4 font-weight-bold">{{ completedGoals.length }}</div>
                <div class="text-caption">Completed</div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Filter Tabs -->
          <v-tabs v-model="goalTab" color="primary" class="mb-4">
            <v-tab value="active">Active</v-tab>
            <v-tab value="completed">Completed</v-tab>
            <v-tab value="all">All Goals</v-tab>
          </v-tabs>

          <!-- Empty State -->
          <v-card v-if="filteredGoals.length === 0" class="text-center pa-8">
            <v-icon size="64" color="grey-lighten-1">mdi-flag-outline</v-icon>
            <h3 class="text-h6 mt-4">No goals yet</h3>
            <p class="text-body-2 text-grey">Create your first goal to start tracking progress</p>
            <v-btn color="primary" class="mt-4" @click="showCreateGoalDialog = true">
              <v-icon start>mdi-plus</v-icon>
              Create Goal
            </v-btn>
          </v-card>

          <!-- Goals List -->
          <v-card v-else>
            <v-list lines="three">
              <template v-for="(goal, index) in filteredGoals" :key="goal.id">
                <v-list-item @click="openGoal(goal)" class="goal-item py-4">
                  <template #prepend>
                    <v-avatar :color="getGoalStatusColor(goal)" size="40">
                      <v-icon color="white" size="20">
                        {{ getGoalStatusIcon(goal) }}
                      </v-icon>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="text-subtitle-1 font-weight-medium mb-1">
                    {{ goal.title }}
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    <div class="d-flex align-center gap-2 mb-2">
                      <v-chip
                        :color="getGoalRiskColor(goal)"
                        size="x-small"
                        variant="tonal"
                      >
                        {{ getGoalRiskLabel(goal) }}
                      </v-chip>
                      <v-chip
                        v-if="goal.target_date"
                        size="x-small"
                        variant="outlined"
                      >
                        <v-icon start size="12">mdi-calendar</v-icon>
                        {{ formatDate(goal.target_date) }}
                      </v-chip>
                      <v-chip
                        :color="getVisibilityColor(goal.visibility)"
                        size="x-small"
                        variant="tonal"
                      >
                        {{ goal.visibility }}
                      </v-chip>
                    </div>
                    <p class="text-truncate" style="max-width: 500px;">
                      {{ goal.description }}
                    </p>
                  </v-list-item-subtitle>

                  <template #append>
                    <div class="d-flex align-center gap-4">
                      <!-- Progress Circle -->
                      <div class="text-center">
                        <v-progress-circular
                          :model-value="goal.progress_percent"
                          :color="getGoalProgressColor(goal)"
                          :size="56"
                          :width="6"
                        >
                          <span class="text-caption font-weight-bold">
                            {{ Math.round(goal.progress_percent) }}%
                          </span>
                        </v-progress-circular>
                      </div>
                      <v-btn
                        icon="mdi-chevron-right"
                        variant="text"
                        size="small"
                      />
                    </div>
                  </template>
                </v-list-item>

                <v-divider v-if="index < filteredGoals.length - 1" />
              </template>
            </v-list>
          </v-card>
        </v-window-item>

        <!-- ========================================== -->
        <!-- TAB 3: My Reviews -->
        <!-- ========================================== -->
        <v-window-item value="reviews">
          <!-- Tabs for My Reviews / Team Reviews -->
          <v-tabs v-model="reviewTab" color="primary" class="mb-4">
            <v-tab value="my-reviews">My Reviews</v-tab>
            <v-tab v-if="hasDirectReports || isAdmin" value="team-reviews">
              Team Reviews
              <v-badge
                v-if="pendingTeamReviewsCount > 0"
                :content="pendingTeamReviewsCount"
                color="error"
                inline
                class="ml-2"
              />
            </v-tab>
          </v-tabs>

          <v-window v-model="reviewTab">
            <!-- My Reviews Tab -->
            <v-window-item value="my-reviews">
              <!-- Request Review Button -->
              <div class="d-flex justify-end mb-4">
                <v-btn 
                  color="primary" 
                  prepend-icon="mdi-clipboard-plus"
                  @click="showRequestReviewDialog = true"
                >
                  Request Review
                </v-btn>
              </div>

              <v-card v-if="myReviews.length === 0" class="text-center pa-8">
                <v-icon size="64" color="grey-lighten-1">mdi-clipboard-text-outline</v-icon>
                <h3 class="text-h6 mt-4">No Active Reviews</h3>
                <p class="text-body-2 text-grey">
                  You'll see your performance reviews here when a cycle begins
                </p>
                <p class="text-body-2 text-grey mt-2">
                  Ready for a performance check-in? Click "Request Review" above to start a self-assessment.
                </p>
              </v-card>

              <v-row v-else>
                <v-col
                  v-for="review in myReviews"
                  :key="review.id"
                  cols="12"
                  md="6"
                >
                  <v-card class="review-card" @click="openReview(review, 'employee')">
                    <v-card-title class="d-flex align-center">
                      <v-avatar
                        :color="getReviewStageColor(review.current_stage)"
                        size="40"
                        class="mr-3"
                      >
                        <v-icon color="white" size="20">
                          {{ getReviewStageIcon(review.current_stage) }}
                        </v-icon>
                      </v-avatar>
                      <div>
                        <div class="text-subtitle-1">
                          {{ review.cycle?.name || 'Performance Review' }}
                        </div>
                        <div class="text-caption text-grey">
                          {{ getReviewStageLabel(review.current_stage) }}
                        </div>
                      </div>
                    </v-card-title>

                    <v-card-text>
                      <v-progress-linear
                        :model-value="getReviewProgress(review)"
                        color="primary"
                        height="8"
                        rounded
                        class="mb-2"
                      />
                      <div class="d-flex justify-space-between text-caption">
                        <span>{{ getReviewProgress(review) }}% Complete</span>
                        <span v-if="review.cycle?.due_date">
                          Due {{ formatDate(review.cycle.due_date) }}
                        </span>
                      </div>
                    </v-card-text>

                    <v-card-actions>
                      <v-chip
                        :color="getReviewStatusColor(review.status)"
                        size="small"
                        variant="tonal"
                      >
                        {{ review.status }}
                      </v-chip>
                      <v-spacer />
                      <v-btn
                        color="primary"
                        variant="text"
                        append-icon="mdi-chevron-right"
                      >
                        {{ review.current_stage === 'self_review' ? 'Continue' : 'View' }}
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Team Reviews Tab (Manager View) -->
            <v-window-item value="team-reviews">
              <v-card v-if="directReportReviews.length === 0" class="text-center pa-8">
                <v-icon size="64" color="grey-lighten-1">mdi-account-group-outline</v-icon>
                <h3 class="text-h6 mt-4">No Team Reviews</h3>
                <p class="text-body-2 text-grey">
                  Your direct reports' reviews will appear here
                </p>
              </v-card>

              <v-list v-else lines="two">
                <v-list-item
                  v-for="review in directReportReviews"
                  :key="review.id"
                  @click="openReview(review, 'manager')"
                  class="review-list-item mb-2"
                >
                  <template #prepend>
                    <v-avatar color="primary" size="48">
                      <span class="text-subtitle-2">
                        {{ getInitials(review.employee) }}
                      </span>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-medium">
                    {{ getFullName(review.employee) }}
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    {{ review.employee?.position_title || 'Team Member' }}
                    <v-chip
                      :color="getReviewStageColor(review.current_stage)"
                      size="x-small"
                      variant="tonal"
                      class="ml-2"
                    >
                      {{ getReviewStageLabel(review.current_stage) }}
                    </v-chip>
                  </v-list-item-subtitle>

                  <template #append>
                    <div class="d-flex align-center gap-2">
                      <v-chip
                        v-if="reviewNeedsAction(review)"
                        color="warning"
                        size="small"
                        variant="elevated"
                      >
                        Action Required
                      </v-chip>
                      <v-btn icon="mdi-chevron-right" variant="text" size="small" />
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </v-window-item>
          </v-window>
        </v-window-item>
      </v-window>
    </template>

    <!-- Create Goal Dialog -->
    <v-dialog v-model="showCreateGoalDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-flag-plus</v-icon>
          Create New Goal
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-model="newGoal.title"
            label="Goal Title"
            placeholder="What do you want to achieve?"
            variant="outlined"
            :rules="[v => !!v || 'Title is required']"
            class="mb-4"
          />

          <v-textarea
            v-model="newGoal.description"
            label="Description"
            placeholder="Describe your goal and key results..."
            variant="outlined"
            rows="3"
            class="mb-4"
          />

          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="newGoal.start_date"
                label="Start Date"
                type="date"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="newGoal.target_date"
                label="Target Date"
                type="date"
                variant="outlined"
              />
            </v-col>
          </v-row>

          <v-select
            v-model="newGoal.visibility"
            :items="visibilityOptions"
            label="Visibility"
            variant="outlined"
            class="mb-4"
          />

          <v-select
            v-model="newGoal.aligns_to_goal_id"
            :items="alignmentOptions"
            item-title="title"
            item-value="id"
            label="Aligns to (optional)"
            variant="outlined"
            clearable
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCreateGoalDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="creatingGoal"
            :disabled="!newGoal.title"
            @click="createGoal"
          >
            Create Goal
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Goal Progress Modal -->
    <GoalProgressModal
      v-model="showGoalProgressModal"
      :goal="selectedGoal"
      @updated="onGoalUpdated"
    />

    <!-- Review Detail Dialog -->
    <ReviewDetailDialog
      v-model="showReviewDialog"
      :review="selectedReview"
      :view-mode="reviewViewMode"
      @close="closeReview"
      @updated="onReviewUpdated"
    />

    <!-- Request Review Dialog -->
    <v-dialog v-model="showRequestReviewDialog" max-width="700" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary">mdi-clipboard-plus</v-icon>
          Request Performance Review
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="showRequestReviewDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-alert type="info" variant="tonal" class="mb-6">
            <strong>Self-Assessment Request</strong><br>
            This will notify your manager that you'd like a performance review. 
            Please indicate what topics and skills you'd like to discuss.
          </v-alert>

          <!-- Topics to Cover -->
          <div class="mb-6">
            <div class="text-subtitle-2 font-weight-bold mb-2">Topics You'd Like to Discuss</div>
            <v-combobox
              v-model="reviewRequest.topics"
              :items="reviewTopicSuggestions"
              label="Select or type topics"
              multiple
              chips
              closable-chips
              variant="outlined"
              density="comfortable"
              hint="Select from suggestions or type your own topics"
              persistent-hint
            />
          </div>

          <!-- Skill Categories to Review -->
          <div class="mb-6">
            <div class="text-subtitle-2 font-weight-bold mb-2">Skill Categories to Review</div>
            <v-select
              v-model="reviewRequest.skillCategories"
              :items="skillCategoryOptions"
              label="Select skill categories"
              multiple
              chips
              closable-chips
              variant="outlined"
              density="comfortable"
              hint="Choose general skill areas you'd like assessed"
              persistent-hint
            />
          </div>

          <!-- Specific Skills Write-In -->
          <div class="mb-6">
            <div class="text-subtitle-2 font-weight-bold mb-2">Specific Skills (Optional)</div>
            <v-text-field
              v-model="reviewRequest.specificSkills"
              label="Enter specific skills"
              variant="outlined"
              density="comfortable"
              hint="List any specific skills not covered by categories above"
              persistent-hint
            />
          </div>

          <!-- Additional Notes -->
          <div class="mb-4">
            <div class="text-subtitle-2 font-weight-bold mb-2">Additional Notes (Optional)</div>
            <v-textarea
              v-model="reviewRequest.notes"
              label="Any additional context for your manager..."
              variant="outlined"
              rows="3"
              counter="500"
              maxlength="500"
            />
          </div>

          <!-- Due Date Preference -->
          <div>
            <div class="text-subtitle-2 font-weight-bold mb-2">Preferred Due Date (Optional)</div>
            <v-text-field
              v-model="reviewRequest.dueDate"
              type="date"
              variant="outlined"
              density="comfortable"
              :min="minReviewDate"
              hint="When would you like to complete this review by?"
              persistent-hint
            />
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showRequestReviewDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            :loading="submittingReviewRequest"
            :disabled="reviewRequest.topics.length === 0"
            @click="submitReviewRequest"
          >
            <v-icon start>mdi-send</v-icon>
            Submit Request
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import SkillHexagon from '~/components/skill/SkillHexagon.vue'
import GoalProgressModal from '~/components/performance/GoalProgressModal.vue'
import ReviewDetailDialog from '~/components/performance/ReviewDetailDialog.vue'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({
  title: 'My Growth'
})

const client = useSupabaseClient()
const authStore = useAuthStore()
const performanceStore = usePerformanceStore()
const route = useRoute()
const { employees, isAdmin } = useAppData()

// ============================================
// STATE
// ============================================
const loading = ref(true)

// Handle query param for initial tab (from redirects)
const getInitialTab = () => {
  const tabParam = route.query.tab as string
  if (tabParam === 'goals') return 'goals'
  if (tabParam === 'reviews') return 'reviews'
  return 'growth'
}
const mainTab = ref(getInitialTab())
const mentorshipTab = ref('find')
const goalTab = ref('active')
const reviewTab = ref('my-reviews')

// Skills & Mentorship state
const currentEmployee = ref<any>(null)
const mySkills = ref<any[]>([])
const mentorshipRequests = ref<any[]>([])
const selectedGap = ref<any>(null)
const selectedSkillFilter = ref<string | null>(null)
const requestingMentor = ref<string | null>(null)
const processingRequest = ref<string | null>(null)
const totalPoints = ref(0)
const currentLevel = ref(1)

// Goals state
const showCreateGoalDialog = ref(false)
const showGoalProgressModal = ref(false)
const selectedGoal = ref<any>(null)
const creatingGoal = ref(false)
const newGoal = ref({
  title: '',
  description: '',
  start_date: '',
  target_date: '',
  visibility: 'private' as const,
  aligns_to_goal_id: null as string | null
})

// Reviews state
const showReviewDialog = ref(false)
const selectedReview = ref<any>(null)
const reviewViewMode = ref<'employee' | 'manager'>('employee')

// Review Request state
const showRequestReviewDialog = ref(false)
const submittingReviewRequest = ref(false)
const reviewRequest = reactive({
  topics: [] as string[],
  skillCategories: [] as string[],
  specificSkills: '',
  notes: '',
  dueDate: ''
})

// Review topic suggestions
const reviewTopicSuggestions = [
  'Career Growth & Development',
  'Role & Responsibilities',
  'Work-Life Balance',
  'Training & Education Needs',
  'Team Collaboration',
  'Communication Skills',
  'Technical Skills Assessment',
  'Goal Setting & Alignment',
  'Compensation Discussion',
  'Promotion Readiness',
  'Project Feedback',
  'Manager Support & Feedback'
]

// Snackbar
const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// ============================================
// COMPUTED - Skills & Mentorship
// ============================================
const nextLevelPoints = computed(() => currentLevel.value * 100)
const levelProgress = computed(() => (totalPoints.value % 100))
const pointsToNextLevel = computed(() => nextLevelPoints.value - (totalPoints.value % 100))

const skillCategories = computed(() => {
  if (!mySkills.value.length) return []
  
  const categoryMap = new Map<string, { total: number; count: number }>()
  
  mySkills.value.forEach((skill: any) => {
    const cat = skill.category || 'General'
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { total: 0, count: 0 })
    }
    const current = categoryMap.get(cat)!
    current.total += skill.rating || 0
    current.count++
  })
  
  return Array.from(categoryMap.entries()).map(([name, data]) => ({
    category: name,
    value: data.total / data.count,
    fullMark: 5
  }))
})

const skillGaps = computed(() => {
  return mySkills.value.filter(s => s.is_goal || s.rating < 3)
})

const skillFilterOptions = computed(() => {
  return skillGaps.value.map(s => ({
    title: s.skill_name,
    value: s.skill_id
  }))
})

const filteredMentors = computed(() => {
  if (!selectedSkillFilter.value) return []
  
  const skillId = selectedSkillFilter.value
  const myEmployeeId = currentEmployee.value?.id
  
  return employees.value
    .filter(emp => emp.id !== myEmployeeId)
    .map(emp => {
      const teachableSkills = (emp.skills || []).filter((s: any) => s.rating >= 4)
      const matchingSkill = teachableSkills.find((s: any) => s.skill_id === skillId)
      
      return {
        ...emp,
        initials: `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`,
        full_name: `${emp.first_name} ${emp.last_name}`,
        teachable_skills: teachableSkills.map((s: any) => ({
          skill_id: s.skill_id,
          skill_name: s.skill?.name || s.skill_name,
          rating: s.rating
        })),
        matchingSkill
      }
    })
    .filter(emp => emp.matchingSkill)
})

const pendingMentorshipRequests = computed(() => {
  return mentorshipRequests.value.filter(r => 
    r.status === 'pending' && r.mentor_id === currentEmployee.value?.id
  ).length
})

const learningMentorships = computed(() => {
  return mentorshipRequests.value
    .filter(r => r.mentee_id === currentEmployee.value?.id)
    .map(r => ({
      ...r,
      mentor_name: r.mentor?.full_name || 'Unknown',
      mentor_initials: `${r.mentor?.first_name?.[0] || ''}${r.mentor?.last_name?.[0] || ''}`,
      skill_name: r.skill?.name || 'Unknown Skill'
    }))
})

const teachingMentorships = computed(() => {
  return mentorshipRequests.value
    .filter(r => r.mentor_id === currentEmployee.value?.id)
    .map(r => ({
      ...r,
      mentee_name: r.mentee?.full_name || 'Unknown',
      mentee_initials: `${r.mentee?.first_name?.[0] || ''}${r.mentee?.last_name?.[0] || ''}`,
      skill_name: r.skill?.name || 'Unknown Skill'
    }))
})

const pendingTeachingRequests = computed(() => {
  return teachingMentorships.value.filter(r => r.status === 'pending')
})

// ============================================
// COMPUTED - Goals
// ============================================
const activeGoals = computed(() => performanceStore.activeGoals)
const completedGoals = computed(() => performanceStore.completedGoals)
const onTrackCount = computed(() => performanceStore.onTrackGoals.length)
const atRiskGoalsCount = computed(() => performanceStore.atRiskGoals.length)

const filteredGoals = computed(() => {
  switch (goalTab.value) {
    case 'active':
      return activeGoals.value
    case 'completed':
      return completedGoals.value
    default:
      return performanceStore.goals
  }
})

const alignmentOptions = computed(() => {
  return performanceStore.goals.filter(g => 
    g.visibility !== 'private' && g.status === 'active'
  )
})

const visibilityOptions = [
  { title: 'Private (Only me)', value: 'private' },
  { title: 'Team (My team)', value: 'team' },
  { title: 'Company (Everyone)', value: 'company' }
]

// ============================================
// COMPUTED - Reviews
// ============================================
const myReviews = computed(() => performanceStore.myReviews)
const directReportReviews = computed(() => performanceStore.directReportReviews)
const hasDirectReports = computed(() => directReportReviews.value.length > 0)
const pendingReviewsCount = computed(() => {
  return myReviews.value.filter(r => r.status === 'in_progress' || r.current_stage === 'self_review').length
})
const pendingTeamReviewsCount = computed(() => {
  return directReportReviews.value.filter(r => r.current_stage === 'manager_review').length
})

// Skill category options for review selection - matches veterinary taxonomy from migration 126
const skillCategoryOptions = [
  'Clinical',
  'Surgical',
  'Anesthesia',
  'Dentistry',
  'Pharmacy',
  'Emergency',
  'Imaging',
  'Animal Care',
  'Nutrition',
  'Client Services',
  'Administrative',
  'Safety & Compliance',
  'Specialized',
  'Species Expertise'
]

// Min date for review request (today)
const minReviewDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

// ============================================
// METHODS - Utility
// ============================================
function showNotification(message: string, color = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// ============================================
// METHODS - Mentorship
// ============================================
function getMentorshipStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'warning'
    case 'active': return 'success'
    case 'completed': return 'info'
    case 'declined': return 'error'
    default: return 'grey'
  }
}

function selectGap(gap: any) {
  selectedGap.value = gap
  selectedSkillFilter.value = gap.skill_id
  mentorshipTab.value = 'find'
}

function findMentorForSkill(skill: any) {
  selectedSkillFilter.value = skill.skill_id
  mentorshipTab.value = 'find'
}

function hasRequestedMentor(mentorId: string): boolean {
  return mentorshipRequests.value.some(r => 
    r.mentor_id === mentorId && 
    r.mentee_id === currentEmployee.value?.id &&
    r.skill_id === selectedSkillFilter.value
  )
}

async function requestMentorship(mentor: any) {
  if (!selectedSkillFilter.value || !currentEmployee.value) return
  
  requestingMentor.value = mentor.id
  try {
    const { error } = await (client as any)
      .from('mentorship_requests')
      .insert({
        mentee_id: currentEmployee.value.id,
        mentor_id: mentor.id,
        skill_id: selectedSkillFilter.value,
        status: 'pending'
      })
    
    if (error) throw error
    
    showNotification(`Mentorship request sent to ${mentor.full_name}!`)
    await fetchMentorshipRequests()
  } catch (err: any) {
    showNotification(err.message || 'Failed to send request', 'error')
  } finally {
    requestingMentor.value = null
  }
}

async function handleMentorshipRequest(request: any, action: 'accept' | 'decline') {
  processingRequest.value = request.id
  try {
    const newStatus = action === 'accept' ? 'active' : 'declined'
    
    const { error } = await (client as any)
      .from('mentorship_requests')
      .update({ status: newStatus })
      .eq('id', request.id)
    
    if (error) throw error
    
    showNotification(`Request ${action === 'accept' ? 'accepted' : 'declined'}`)
    await fetchMentorshipRequests()
  } catch (err: any) {
    showNotification(err.message || 'Failed to process request', 'error')
  } finally {
    processingRequest.value = null
  }
}

// ============================================
// METHODS - Goals
// ============================================
function getGoalStatusColor(goal: any): string {
  switch (goal.status) {
    case 'completed': return 'success'
    case 'active': return 'primary'
    case 'on_hold': return 'warning'
    case 'cancelled': return 'grey'
    default: return 'grey'
  }
}

function getGoalStatusIcon(goal: any): string {
  switch (goal.status) {
    case 'completed': return 'mdi-check'
    case 'active': return 'mdi-flag'
    case 'on_hold': return 'mdi-pause'
    case 'cancelled': return 'mdi-close'
    default: return 'mdi-flag-outline'
  }
}

function getGoalRiskColor(goal: any): string {
  if (goal.status !== 'active') return 'grey'
  if (!goal.target_date) return 'success'
  
  const now = new Date()
  const target = new Date(goal.target_date)
  const start = goal.start_date ? new Date(goal.start_date) : new Date(goal.created_at)
  const totalDays = (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const daysElapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const expectedProgress = Math.min((daysElapsed / totalDays) * 100, 100)
  
  if (goal.progress_percent >= expectedProgress - 10) return 'success'
  if (goal.progress_percent >= expectedProgress - 25) return 'warning'
  return 'error'
}

function getGoalRiskLabel(goal: any): string {
  if (goal.status === 'completed') return 'Completed'
  if (goal.status !== 'active') return goal.status
  
  const color = getGoalRiskColor(goal)
  if (color === 'success') return 'On Track'
  if (color === 'warning') return 'Behind'
  return 'At Risk'
}

function getGoalProgressColor(goal: any): string {
  if (goal.progress_percent >= 100) return 'success'
  return getGoalRiskColor(goal)
}

function getVisibilityColor(visibility: string): string {
  switch (visibility) {
    case 'company': return 'primary'
    case 'team': return 'info'
    default: return 'grey'
  }
}

function openGoal(goal: any) {
  selectedGoal.value = goal
  showGoalProgressModal.value = true
}

function onGoalUpdated() {
  performanceStore.fetchGoals()
}

async function createGoal() {
  if (!newGoal.value.title) return
  
  creatingGoal.value = true
  try {
    await performanceStore.createGoal({
      title: newGoal.value.title,
      description: newGoal.value.description || null,
      start_date: newGoal.value.start_date || null,
      target_date: newGoal.value.target_date || null,
      visibility: newGoal.value.visibility,
      aligns_to_goal_id: newGoal.value.aligns_to_goal_id
    })
    
    showCreateGoalDialog.value = false
    newGoal.value = {
      title: '',
      description: '',
      start_date: '',
      target_date: '',
      visibility: 'private',
      aligns_to_goal_id: null
    }
    showNotification('Goal created successfully!')
  } catch (err: any) {
    showNotification(err.message || 'Failed to create goal', 'error')
  } finally {
    creatingGoal.value = false
  }
}

// ============================================
// METHODS - Reviews
// ============================================
function getReviewStageColor(stage: string | null): string {
  switch (stage) {
    case 'self_review': return 'info'
    case 'manager_review': return 'warning'
    case 'calibration': return 'purple'
    case 'delivery': return 'success'
    case 'acknowledged': return 'grey'
    default: return 'grey'
  }
}

function getReviewStageIcon(stage: string | null): string {
  switch (stage) {
    case 'self_review': return 'mdi-account-edit'
    case 'manager_review': return 'mdi-clipboard-check'
    case 'calibration': return 'mdi-scale-balance'
    case 'delivery': return 'mdi-send'
    case 'acknowledged': return 'mdi-check-all'
    default: return 'mdi-file-document'
  }
}

function getReviewStageLabel(stage: string | null): string {
  switch (stage) {
    case 'self_review': return 'Self Review'
    case 'manager_review': return 'Manager Review'
    case 'calibration': return 'Calibration'
    case 'delivery': return 'Pending Acknowledgment'
    case 'acknowledged': return 'Completed'
    default: return 'Draft'
  }
}

function getReviewStatusColor(status: string): string {
  switch (status) {
    case 'in_progress': return 'info'
    case 'submitted': return 'success'
    case 'completed': return 'grey'
    default: return 'grey'
  }
}

function getReviewProgress(review: any): number {
  switch (review.current_stage) {
    case 'self_review': return 20
    case 'manager_review': return 50
    case 'calibration': return 70
    case 'delivery': return 90
    case 'acknowledged': return 100
    default: return 0
  }
}

function reviewNeedsAction(review: any): boolean {
  return review.current_stage === 'manager_review'
}

function getInitials(employee: any): string {
  if (!employee) return '?'
  return `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`
}

function getFullName(employee: any): string {
  if (!employee) return 'Unknown'
  return `${employee.first_name} ${employee.last_name}`
}

function openReview(review: any, mode: 'employee' | 'manager') {
  selectedReview.value = review
  reviewViewMode.value = mode
  showReviewDialog.value = true
}

function closeReview() {
  showReviewDialog.value = false
  selectedReview.value = null
}

function onReviewUpdated() {
  performanceStore.fetchMyReviews()
}

// Submit review request to database
async function submitReviewRequest() {
  if (reviewRequest.topics.length === 0) {
    showNotification('Please select at least one topic to discuss', 'error')
    return
  }

  submittingReviewRequest.value = true
  try {
    const employeeId = currentEmployee.value?.id
    if (!employeeId) {
      throw new Error('Could not identify current employee')
    }

    // Combine skill categories and specific skills into notes/metadata
    const skillsInfo = [
      ...reviewRequest.skillCategories,
      reviewRequest.specificSkills ? `Other: ${reviewRequest.specificSkills}` : ''
    ].filter(Boolean)

    const { error } = await client
      .from('review_requests')
      .insert({
        employee_id: employeeId,
        request_type: 'self_initiated',
        topics: reviewRequest.topics,
        skill_categories: reviewRequest.skillCategories.length > 0 ? reviewRequest.skillCategories : null,
        notes: [reviewRequest.notes, reviewRequest.specificSkills ? `Specific skills: ${reviewRequest.specificSkills}` : ''].filter(Boolean).join('\n') || null,
        due_date: reviewRequest.dueDate || null,
        status: 'pending'
      })

    if (error) throw error

    // Reset form
    reviewRequest.topics = []
    reviewRequest.skillCategories = []
    reviewRequest.specificSkills = ''
    reviewRequest.notes = ''
    reviewRequest.dueDate = ''
    
    showRequestReviewDialog.value = false
    showNotification('Review request submitted! Your manager will be notified.', 'success')
  } catch (err: any) {
    console.error('Error submitting review request:', err)
    showNotification(err.message || 'Failed to submit review request', 'error')
  } finally {
    submittingReviewRequest.value = false
  }
}

// ============================================
// DATA FETCHING
// ============================================
async function fetchCurrentEmployee() {
  try {
    const profileId = authStore.profile?.id
    if (!profileId) return
    
    const { data: employee } = await client
      .from('employees')
      .select(`
        *,
        position:job_positions(id, title),
        department:departments(id, name)
      `)
      .eq('profile_id', profileId)
      .single()
    
    if (employee) {
      const emp = employee as any
      emp.full_name = `${emp.first_name} ${emp.last_name}`
      emp.initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`
      currentEmployee.value = emp
    }
  } catch (err) {
    console.error('Error fetching current employee:', err)
  }
}

async function fetchMySkills() {
  if (!currentEmployee.value) return
  
  try {
    const { data } = await client
      .from('employee_skills')
      .select(`
        id,
        rating,
        is_goal,
        skill_id,
        skill:skill_library(id, name, category)
      `)
      .eq('employee_id', currentEmployee.value.id)
    
    mySkills.value = (data || []).map((s: any) => ({
      ...s,
      skill_name: s.skill?.name,
      category: s.skill?.category
    }))
  } catch (err) {
    console.error('Error fetching skills:', err)
  }
}

async function fetchPoints() {
  if (!currentEmployee.value) return
  
  try {
    const { data } = await client
      .from('points_log')
      .select('points')
      .eq('employee_id', currentEmployee.value.id)
    
    totalPoints.value = (data || []).reduce((sum: number, p: any) => sum + (p.points || 0), 0)
    currentLevel.value = Math.floor(totalPoints.value / 100) + 1
  } catch (err) {
    console.error('Error fetching points:', err)
  }
}

async function fetchMentorshipRequests() {
  if (!currentEmployee.value) return
  
  try {
    const { data } = await (client as any)
      .from('mentorship_requests')
      .select(`
        *,
        mentor:employees!mentorship_requests_mentor_id_fkey(id, first_name, last_name),
        mentee:employees!mentorship_requests_mentee_id_fkey(id, first_name, last_name),
        skill:skill_library(id, name)
      `)
      .or(`mentee_id.eq.${currentEmployee.value.id},mentor_id.eq.${currentEmployee.value.id}`)
    
    mentorshipRequests.value = (data || []).map((r: any) => ({
      ...r,
      mentor: r.mentor ? { ...r.mentor, full_name: `${r.mentor.first_name} ${r.mentor.last_name}` } : null,
      mentee: r.mentee ? { ...r.mentee, full_name: `${r.mentee.first_name} ${r.mentee.last_name}` } : null
    }))
  } catch (err) {
    console.error('Error fetching mentorship requests:', err)
  }
}

// ============================================
// LIFECYCLE
// ============================================
onMounted(async () => {
  loading.value = true
  try {
    await fetchCurrentEmployee()
    await Promise.all([
      fetchMySkills(),
      fetchPoints(),
      fetchMentorshipRequests(),
      performanceStore.fetchGoals(),
      performanceStore.fetchMyReviews()
    ])
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.growth-page {
  min-height: 100%;
}

.player-card-header {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1) 0%, rgba(var(--v-theme-primary), 0.05) 100%);
}

.mentor-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.mentor-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.goal-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.goal-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.review-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.review-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.review-list-item {
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 8px;
}

.review-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}
</style>
