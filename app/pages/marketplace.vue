<template>
  <div>
    <v-container fluid class="pa-6">
      <!-- Header with Wallet Widget -->
      <v-row align="center" class="mb-6">
        <v-col cols="12" md="8">
          <div class="d-flex align-center gap-3">
            <v-icon size="48" color="amber-darken-2">mdi-bone</v-icon>
            <div>
              <h1 class="text-h4 font-weight-bold">Green Dog Marketplace</h1>
              <p class="text-subtitle-1 text-grey">Complete tasks, earn Bones, claim rewards!</p>
            </div>
          </div>
        </v-col>
        <v-col cols="12" md="4">
          <!-- Wallet Widget -->
          <v-card class="wallet-widget" color="amber-darken-1" theme="dark">
            <v-card-text class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-overline mb-1">Your Balance</div>
                <div class="text-h3 font-weight-black">
                  {{ wallet?.current_balance || 0 }}
                  <v-icon size="32" class="ml-1">mdi-bone</v-icon>
                </div>
              </div>
              <div class="text-right">
                <div class="text-caption">Lifetime: {{ wallet?.lifetime_earned || 0 }} earned</div>
                <div class="text-caption">{{ wallet?.lifetime_spent || 0 }} spent</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Admin Quick Actions -->
      <v-row v-if="isAdmin" class="mb-4">
        <v-col cols="12">
          <v-card variant="outlined" class="border-primary">
            <v-card-text class="d-flex flex-wrap align-center gap-3">
              <v-chip color="primary" variant="flat" size="small">
                <v-icon start>mdi-shield-crown</v-icon>
                Admin Controls
              </v-chip>
              <v-btn size="small" color="success" variant="tonal" @click="openGigDialog()">
                <v-icon start>mdi-plus</v-icon> New Gig
              </v-btn>
              <v-btn size="small" color="purple" variant="tonal" @click="openRewardDialog()">
                <v-icon start>mdi-plus</v-icon> New Reward
              </v-btn>
              <v-btn size="small" color="warning" variant="tonal" @click="viewRedemptions">
                <v-icon start>mdi-clipboard-check</v-icon>
                Pending Redemptions ({{ pendingRedemptionsCount }})
              </v-btn>
              <v-btn size="small" color="info" variant="tonal" @click="viewReviewGigs">
                <v-icon start>mdi-eye-check</v-icon>
                Review Submissions ({{ reviewingGigsCount }})
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Main Tabs -->
      <v-tabs v-model="activeTab" color="primary" class="mb-4">
        <v-tab value="gigs">
          <v-icon start>mdi-briefcase-check</v-icon>
          Bounty Board
        </v-tab>
        <v-tab value="rewards">
          <v-icon start>mdi-gift</v-icon>
          Prize Shop
        </v-tab>
        <v-tab value="my-activity">
          <v-icon start>mdi-history</v-icon>
          My Activity
        </v-tab>
        <v-tab v-if="isAdmin" value="admin">
          <v-icon start>mdi-cog</v-icon>
          Admin
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <!-- TAB 1: Bounty Board (Gigs) -->
        <v-window-item value="gigs">
          <!-- Filters -->
          <v-row class="mb-4">
            <v-col cols="12" sm="4">
              <v-select
                v-model="gigFilter.status"
                :items="gigStatusOptions"
                label="Status"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-select
                v-model="gigFilter.category"
                :items="gigCategories"
                label="Category"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-select
                v-model="gigFilter.difficulty"
                :items="difficultyOptions"
                label="Difficulty"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
          </v-row>

          <!-- Gig Grid -->
          <v-row v-if="filteredGigs.length">
            <v-col
              v-for="gig in filteredGigs"
              :key="gig.id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <v-card
                :class="getGigCardClass(gig)"
                class="gig-card h-100"
                @click="openGigDetail(gig)"
              >
                <!-- Status Banner -->
                <div
                  v-if="gig.status !== 'open'"
                  class="gig-status-banner pa-2 text-center text-caption font-weight-bold"
                  :class="getStatusBannerClass(gig.status)"
                >
                  {{ getStatusLabel(gig.status) }}
                  <span v-if="gig.claimed_employee">
                    - {{ gig.claimed_employee.first_name }}
                  </span>
                </div>

                <v-card-text>
                  <!-- Timer for Claimed Gigs -->
                  <div
                    v-if="gig.status === 'claimed' && gig.claimed_at"
                    class="gig-timer mb-2 text-center"
                    :class="{ 'text-error': getTimeRemaining(gig).urgent }"
                  >
                    <v-icon size="small" class="mr-1">mdi-timer</v-icon>
                    {{ getTimeRemaining(gig).display }}
                  </div>

                  <!-- Icon and Difficulty -->
                  <div class="d-flex align-center justify-space-between mb-2">
                    <v-icon :color="getDifficultyColor(gig.difficulty)" size="32">
                      {{ gig.icon || 'mdi-star' }}
                    </v-icon>
                    <v-chip
                      :color="getDifficultyColor(gig.difficulty)"
                      size="x-small"
                      variant="tonal"
                    >
                      {{ gig.difficulty }}
                    </v-chip>
                  </div>

                  <!-- Title -->
                  <h3 class="text-subtitle-1 font-weight-bold mb-1 text-truncate-2">
                    {{ gig.title }}
                  </h3>

                  <!-- Category -->
                  <v-chip
                    v-if="gig.category"
                    size="x-small"
                    variant="outlined"
                    class="mb-2"
                  >
                    {{ gig.category }}
                  </v-chip>

                  <!-- Bounty Value -->
                  <div class="d-flex align-center justify-space-between mt-auto">
                    <div class="bounty-value">
                      <span class="text-h6 font-weight-black text-amber-darken-2">
                        +{{ gig.bounty_value }}
                      </span>
                      <v-icon color="amber-darken-2" size="18" class="ml-1">mdi-bone</v-icon>
                    </div>
                    <div class="text-caption text-grey">
                      <v-icon size="12">mdi-clock</v-icon>
                      {{ gig.duration_minutes }}m
                    </div>
                  </div>

                  <!-- Penalty Warning -->
                  <div v-if="gig.flake_penalty > 0" class="text-caption text-error mt-1">
                    <v-icon size="12">mdi-alert</v-icon>
                    -{{ gig.flake_penalty }} if failed
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Empty State -->
          <v-card v-else variant="outlined" class="pa-8 text-center">
            <v-icon size="64" color="grey-lighten-1">mdi-briefcase-off</v-icon>
            <h3 class="text-h6 mt-4">No gigs available</h3>
            <p class="text-grey">Check back later for new opportunities!</p>
          </v-card>
        </v-window-item>

        <!-- TAB 2: Prize Shop (Rewards) -->
        <v-window-item value="rewards">
          <v-row v-if="rewards.length">
            <v-col
              v-for="reward in rewards"
              :key="reward.id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <v-card class="reward-card h-100" :class="{ 'opacity-50': reward.stock_quantity === 0 }">
                <v-card-text class="text-center">
                  <!-- Icon -->
                  <v-icon :color="canAfford(reward) ? 'purple' : 'grey'" size="56">
                    {{ reward.icon || 'mdi-gift' }}
                  </v-icon>

                  <!-- Title -->
                  <h3 class="text-subtitle-1 font-weight-bold mt-2 mb-1">
                    {{ reward.title }}
                  </h3>

                  <!-- Description -->
                  <p class="text-caption text-grey mb-2 text-truncate-2">
                    {{ reward.description }}
                  </p>

                  <!-- Stock -->
                  <v-chip
                    v-if="reward.stock_quantity !== null"
                    size="x-small"
                    :color="reward.stock_quantity > 0 ? 'success' : 'error'"
                    variant="tonal"
                    class="mb-2"
                  >
                    {{ reward.stock_quantity > 0 ? `${reward.stock_quantity} left` : 'Sold out' }}
                  </v-chip>
                  <v-chip v-else size="x-small" color="info" variant="tonal" class="mb-2">
                    Unlimited
                  </v-chip>

                  <!-- Cost -->
                  <div class="reward-cost my-2">
                    <span class="text-h5 font-weight-black" :class="canAfford(reward) ? 'text-purple' : 'text-grey'">
                      {{ reward.cost }}
                    </span>
                    <v-icon :color="canAfford(reward) ? 'amber-darken-2' : 'grey'" size="20" class="ml-1">
                      mdi-bone
                    </v-icon>
                  </div>
                </v-card-text>

                <v-card-actions class="justify-center pb-4">
                  <v-btn
                    :color="canAfford(reward) && reward.stock_quantity !== 0 ? 'purple' : 'grey'"
                    :disabled="!canAfford(reward) || reward.stock_quantity === 0"
                    variant="flat"
                    @click="purchaseReward(reward)"
                  >
                    <v-icon start>mdi-cart</v-icon>
                    {{ reward.stock_quantity === 0 ? 'Sold Out' : (canAfford(reward) ? 'Buy Now' : 'Not Enough Bones') }}
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>

          <!-- Empty State -->
          <v-card v-else variant="outlined" class="pa-8 text-center">
            <v-icon size="64" color="grey-lighten-1">mdi-store-off</v-icon>
            <h3 class="text-h6 mt-4">No rewards available</h3>
            <p class="text-grey">Check back later for new prizes!</p>
          </v-card>
        </v-window-item>

        <!-- TAB 3: My Activity -->
        <v-window-item value="my-activity">
          <v-row>
            <!-- My Active Gigs -->
            <v-col cols="12" md="6">
              <v-card>
                <v-card-title class="d-flex align-center">
                  <v-icon start color="primary">mdi-briefcase-clock</v-icon>
                  My Active Gigs
                </v-card-title>
                <v-divider />
                <v-list v-if="myActiveGigs.length" density="compact">
                  <v-list-item
                    v-for="gig in myActiveGigs"
                    :key="gig.id"
                    @click="openGigDetail(gig)"
                  >
                    <template #prepend>
                      <v-icon :color="getDifficultyColor(gig.difficulty)">{{ gig.icon }}</v-icon>
                    </template>
                    <v-list-item-title>{{ gig.title }}</v-list-item-title>
                    <v-list-item-subtitle>
                      <span :class="{ 'text-error': getTimeRemaining(gig).urgent }">
                        {{ getTimeRemaining(gig).display }}
                      </span>
                    </v-list-item-subtitle>
                    <template #append>
                      <v-chip size="x-small" :color="getStatusColor(gig.status)">
                        {{ gig.status }}
                      </v-chip>
                    </template>
                  </v-list-item>
                </v-list>
                <v-card-text v-else class="text-center text-grey">
                  No active gigs. Claim one from the Bounty Board!
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Transaction History -->
            <v-col cols="12" md="6">
              <v-card>
                <v-card-title class="d-flex align-center">
                  <v-icon start color="primary">mdi-history</v-icon>
                  Recent Transactions
                </v-card-title>
                <v-divider />
                <v-list v-if="transactions.length" density="compact">
                  <v-list-item v-for="tx in transactions.slice(0, 10)" :key="tx.id">
                    <template #prepend>
                      <v-icon :color="tx.amount > 0 ? 'success' : 'error'">
                        {{ tx.amount > 0 ? 'mdi-plus-circle' : 'mdi-minus-circle' }}
                      </v-icon>
                    </template>
                    <v-list-item-title>{{ tx.description }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ formatDate(tx.created_at) }}
                    </v-list-item-subtitle>
                    <template #append>
                      <span :class="tx.amount > 0 ? 'text-success' : 'text-error'" class="font-weight-bold">
                        {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}
                      </span>
                    </template>
                  </v-list-item>
                </v-list>
                <v-card-text v-else class="text-center text-grey">
                  No transactions yet
                </v-card-text>
              </v-card>
            </v-col>

            <!-- My Redemptions -->
            <v-col cols="12">
              <v-card>
                <v-card-title class="d-flex align-center">
                  <v-icon start color="purple">mdi-gift-open</v-icon>
                  My Redemptions
                </v-card-title>
                <v-divider />
                <v-data-table
                  v-if="myRedemptions.length"
                  :items="myRedemptions"
                  :headers="redemptionHeaders"
                  density="compact"
                >
                  <template #item.reward="{ item }">
                    <div class="d-flex align-center gap-2">
                      <v-icon size="small">{{ item.reward?.icon }}</v-icon>
                      {{ item.reward?.title }}
                    </div>
                  </template>
                  <template #item.status="{ item }">
                    <v-chip size="x-small" :color="getRedemptionStatusColor(item.status)">
                      {{ item.status }}
                    </v-chip>
                  </template>
                  <template #item.created_at="{ item }">
                    {{ formatDate(item.created_at) }}
                  </template>
                </v-data-table>
                <v-card-text v-else class="text-center text-grey">
                  No redemptions yet. Visit the Prize Shop!
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- TAB 4: Admin -->
        <v-window-item v-if="isAdmin" value="admin">
          <v-tabs v-model="adminSubTab" class="mb-4">
            <v-tab value="all-gigs">All Gigs</v-tab>
            <v-tab value="reviews">Review Queue</v-tab>
            <v-tab value="all-rewards">All Rewards</v-tab>
            <v-tab value="redemptions">Redemptions</v-tab>
          </v-tabs>

          <v-window v-model="adminSubTab">
            <!-- All Gigs Management -->
            <v-window-item value="all-gigs">
              <v-data-table
                :items="allGigs"
                :headers="gigAdminHeaders"
                density="compact"
              >
                <template #item.title="{ item }">
                  <div class="d-flex align-center gap-2">
                    <v-icon size="small">{{ item.icon }}</v-icon>
                    {{ item.title }}
                  </div>
                </template>
                <template #item.status="{ item }">
                  <v-chip size="x-small" :color="getStatusColor(item.status)">
                    {{ item.status }}
                  </v-chip>
                </template>
                <template #item.bounty_value="{ item }">
                  <span class="font-weight-bold text-amber-darken-2">
                    {{ item.bounty_value }}
                  </span>
                </template>
                <template #item.actions="{ item }">
                  <v-btn size="x-small" icon variant="text" @click="openGigDialog(item)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn size="x-small" icon variant="text" color="error" @click="deleteGig(item)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-data-table>
            </v-window-item>

            <!-- Review Queue -->
            <v-window-item value="reviews">
              <v-row v-if="reviewingGigs.length">
                <v-col v-for="gig in reviewingGigs" :key="gig.id" cols="12" md="6">
                  <v-card class="border-warning">
                    <v-card-title class="d-flex align-center">
                      <v-icon start>{{ gig.icon }}</v-icon>
                      {{ gig.title }}
                    </v-card-title>
                    <v-card-subtitle>
                      Submitted by: {{ gig.claimed_employee?.first_name }} {{ gig.claimed_employee?.last_name }}
                    </v-card-subtitle>
                    <v-card-text>
                      <div v-if="gig.proof_url" class="mb-2">
                        <strong>Proof:</strong>
                        <a :href="gig.proof_url" target="_blank">{{ gig.proof_url }}</a>
                      </div>
                      <div v-if="gig.proof_notes" class="mb-2">
                        <strong>Notes:</strong> {{ gig.proof_notes }}
                      </div>
                      <div class="text-h6 text-amber-darken-2">
                        Bounty: +{{ gig.bounty_value }} Bones
                      </div>
                    </v-card-text>
                    <v-card-actions>
                      <v-btn color="success" @click="approveGig(gig, true)">
                        <v-icon start>mdi-check</v-icon> Approve
                      </v-btn>
                      <v-btn color="error" variant="outlined" @click="approveGig(gig, false)">
                        <v-icon start>mdi-close</v-icon> Reject
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
              <v-card v-else variant="outlined" class="pa-8 text-center">
                <v-icon size="64" color="grey-lighten-1">mdi-check-all</v-icon>
                <h3 class="text-h6 mt-4">No submissions to review</h3>
              </v-card>
            </v-window-item>

            <!-- All Rewards Management -->
            <v-window-item value="all-rewards">
              <v-data-table
                :items="allRewards"
                :headers="rewardAdminHeaders"
                density="compact"
              >
                <template #item.title="{ item }">
                  <div class="d-flex align-center gap-2">
                    <v-icon size="small">{{ item.icon }}</v-icon>
                    {{ item.title }}
                  </div>
                </template>
                <template #item.is_active="{ item }">
                  <v-chip size="x-small" :color="item.is_active ? 'success' : 'grey'">
                    {{ item.is_active ? 'Active' : 'Inactive' }}
                  </v-chip>
                </template>
                <template #item.cost="{ item }">
                  <span class="font-weight-bold text-purple">{{ item.cost }}</span>
                </template>
                <template #item.actions="{ item }">
                  <v-btn size="x-small" icon variant="text" @click="openRewardDialog(item)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                </template>
              </v-data-table>
            </v-window-item>

            <!-- Redemptions Management -->
            <v-window-item value="redemptions">
              <v-data-table
                :items="allRedemptions"
                :headers="adminRedemptionHeaders"
                density="compact"
              >
                <template #item.employee="{ item }">
                  {{ item.employee?.first_name }} {{ item.employee?.last_name }}
                </template>
                <template #item.reward="{ item }">
                  <div class="d-flex align-center gap-2">
                    <v-icon size="small">{{ item.reward?.icon }}</v-icon>
                    {{ item.reward?.title }}
                  </div>
                </template>
                <template #item.status="{ item }">
                  <v-chip size="x-small" :color="getRedemptionStatusColor(item.status)">
                    {{ item.status }}
                  </v-chip>
                </template>
                <template #item.created_at="{ item }">
                  {{ formatDate(item.created_at) }}
                </template>
                <template #item.actions="{ item }">
                  <template v-if="item.status === 'pending' || item.status === 'approved'">
                    <v-btn size="x-small" color="success" variant="text" @click="fulfillRedemption(item, 'fulfill')">
                      Fulfill
                    </v-btn>
                    <v-btn size="x-small" color="error" variant="text" @click="fulfillRedemption(item, 'deny')">
                      Deny
                    </v-btn>
                  </template>
                  <span v-else class="text-caption text-grey">—</span>
                </template>
              </v-data-table>
            </v-window-item>
          </v-window>
        </v-window-item>
      </v-window>
    </v-container>

    <!-- Gig Detail Dialog -->
    <v-dialog v-model="showGigDetail" max-width="600">
      <v-card v-if="selectedGig">
        <v-toolbar :color="getDifficultyColor(selectedGig.difficulty)" dark>
          <v-icon class="ml-4">{{ selectedGig.icon }}</v-icon>
          <v-toolbar-title class="ml-2">{{ selectedGig.title }}</v-toolbar-title>
          <v-spacer />
          <v-btn icon @click="showGigDetail = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <v-card-text class="pa-4">
          <!-- Timer for claimed gigs -->
          <v-alert
            v-if="selectedGig.status === 'claimed' && selectedGig.claimed_at"
            :color="getTimeRemaining(selectedGig).urgent ? 'error' : 'warning'"
            variant="tonal"
            class="mb-4"
          >
            <div class="d-flex align-center justify-space-between">
              <div>
                <v-icon start>mdi-timer</v-icon>
                Time Remaining: <strong>{{ getTimeRemaining(selectedGig).display }}</strong>
              </div>
            </div>
          </v-alert>

          <!-- Rejection reason if any -->
          <v-alert
            v-if="selectedGig.rejection_reason"
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            <strong>Previous submission rejected:</strong> {{ selectedGig.rejection_reason }}
          </v-alert>

          <p class="mb-4">{{ selectedGig.description }}</p>

          <v-row>
            <v-col cols="6">
              <div class="text-overline">Bounty</div>
              <div class="text-h4 font-weight-bold text-amber-darken-2">
                +{{ selectedGig.bounty_value }}
                <v-icon color="amber-darken-2">mdi-bone</v-icon>
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-overline">Time Limit</div>
              <div class="text-h6">{{ selectedGig.duration_minutes }} minutes</div>
            </v-col>
          </v-row>

          <v-alert
            v-if="selectedGig.flake_penalty > 0"
            type="error"
            variant="tonal"
            class="mt-4"
            density="compact"
          >
            <v-icon start>mdi-alert</v-icon>
            <strong>Warning:</strong> Failing to complete will cost you {{ selectedGig.flake_penalty }} Bones!
          </v-alert>

          <!-- Proof submission for claimed gigs -->
          <div v-if="selectedGig.status === 'claimed' && isMyGig(selectedGig)" class="mt-4">
            <v-divider class="my-4" />
            <h4 class="text-subtitle-1 font-weight-bold mb-2">Submit Your Work</h4>
            <v-text-field
              v-model="proofUrl"
              label="Proof URL (optional)"
              placeholder="Link to screenshot, document, etc."
              variant="outlined"
              density="compact"
            />
            <v-textarea
              v-model="proofNotes"
              label="Notes"
              placeholder="Describe what you did..."
              variant="outlined"
              density="compact"
              rows="2"
            />
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showGigDetail = false">Close</v-btn>
          <v-spacer />

          <!-- Actions based on status -->
          <template v-if="selectedGig.status === 'open'">
            <v-btn color="success" variant="flat" @click="claimGig(selectedGig)">
              <v-icon start>mdi-hand-back-right</v-icon>
              Claim This Gig
            </v-btn>
          </template>

          <template v-else-if="selectedGig.status === 'claimed' && isMyGig(selectedGig)">
            <v-btn color="error" variant="outlined" @click="abandonGig(selectedGig)">
              <v-icon start>mdi-flag-remove</v-icon>
              Abandon
            </v-btn>
            <v-btn color="success" variant="flat" @click="submitGig(selectedGig)">
              <v-icon start>mdi-check</v-icon>
              Submit for Review
            </v-btn>
          </template>

          <template v-else-if="selectedGig.status === 'reviewing'">
            <v-chip color="info">Awaiting Review</v-chip>
          </template>

          <template v-else-if="selectedGig.status === 'completed'">
            <v-chip color="success">Completed!</v-chip>
          </template>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create/Edit Gig Dialog -->
    <v-dialog v-model="showGigFormDialog" max-width="600">
      <v-card>
        <v-toolbar color="primary" dark>
          <v-toolbar-title>{{ editingGig ? 'Edit Gig' : 'Create New Gig' }}</v-toolbar-title>
          <v-spacer />
          <v-btn icon @click="showGigFormDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <v-card-text class="pa-4">
          <v-text-field
            v-model="gigForm.title"
            label="Title *"
            variant="outlined"
            density="compact"
            class="mb-2"
          />
          <v-textarea
            v-model="gigForm.description"
            label="Description"
            variant="outlined"
            density="compact"
            rows="3"
            class="mb-2"
          />
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="gigForm.bounty_value"
                label="Bounty (Bones) *"
                type="number"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="gigForm.duration_minutes"
                label="Time Limit (minutes) *"
                type="number"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="gigForm.flake_penalty"
                label="Flake Penalty"
                type="number"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="gigForm.difficulty"
                :items="difficultyOptions"
                label="Difficulty"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-combobox
                v-model="gigForm.category"
                :items="gigCategories"
                label="Category"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="gigForm.icon"
                label="Icon (mdi-*)"
                variant="outlined"
                density="compact"
                placeholder="mdi-star"
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showGigFormDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="saveGig" :loading="saving">
            {{ editingGig ? 'Save Changes' : 'Create Gig' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create/Edit Reward Dialog -->
    <v-dialog v-model="showRewardFormDialog" max-width="600">
      <v-card>
        <v-toolbar color="purple" dark>
          <v-toolbar-title>{{ editingReward ? 'Edit Reward' : 'Create New Reward' }}</v-toolbar-title>
          <v-spacer />
          <v-btn icon @click="showRewardFormDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <v-card-text class="pa-4">
          <v-text-field
            v-model="rewardForm.title"
            label="Title *"
            variant="outlined"
            density="compact"
            class="mb-2"
          />
          <v-textarea
            v-model="rewardForm.description"
            label="Description"
            variant="outlined"
            density="compact"
            rows="2"
            class="mb-2"
          />
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="rewardForm.cost"
                label="Cost (Bones) *"
                type="number"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="rewardForm.stock_quantity"
                label="Stock (leave empty for unlimited)"
                type="number"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="rewardForm.icon"
                label="Icon (mdi-*)"
                variant="outlined"
                density="compact"
                placeholder="mdi-gift"
              />
            </v-col>
            <v-col cols="6">
              <v-combobox
                v-model="rewardForm.category"
                :items="rewardCategories"
                label="Category"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
          <v-switch
            v-model="rewardForm.is_active"
            label="Active"
            color="success"
            hide-details
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showRewardFormDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="purple" variant="flat" @click="saveReward" :loading="saving">
            {{ editingReward ? 'Save Changes' : 'Create Reward' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Purchase Confirmation Dialog -->
    <v-dialog v-model="showPurchaseConfirm" max-width="400">
      <v-card v-if="purchasingReward">
        <v-card-title class="text-center pt-6">
          <v-icon size="64" color="purple">{{ purchasingReward.icon }}</v-icon>
        </v-card-title>
        <v-card-text class="text-center">
          <h3 class="text-h6 mb-2">Purchase {{ purchasingReward.title }}?</h3>
          <p class="text-grey mb-4">{{ purchasingReward.description }}</p>
          <div class="text-h4 font-weight-bold text-purple">
            {{ purchasingReward.cost }}
            <v-icon color="amber-darken-2">mdi-bone</v-icon>
          </div>
          <p class="text-caption text-grey mt-2">
            Your balance after: {{ (wallet?.current_balance || 0) - purchasingReward.cost }} Bones
          </p>
        </v-card-text>
        <v-card-actions class="justify-center pb-6">
          <v-btn variant="text" @click="showPurchaseConfirm = false">Cancel</v-btn>
          <v-btn color="purple" variant="flat" @click="confirmPurchase" :loading="saving">
            Confirm Purchase
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

definePageMeta({
  layout: 'default',
  middleware: ['super-admin-only'] // Super admin only for now
})

const { showSuccess, showError } = useToast()

// State
const activeTab = ref('gigs')
const adminSubTab = ref('all-gigs')
const loading = ref(false)
const saving = ref(false)

// Data
const wallet = ref<any>(null)
const employeeId = ref<string | null>(null)
const gigs = ref<any[]>([])
const allGigs = ref<any[]>([])
const rewards = ref<any[]>([])
const allRewards = ref<any[]>([])
const transactions = ref<any[]>([])
const myRedemptions = ref<any[]>([])
const allRedemptions = ref<any[]>([])

// Filters
const gigFilter = ref({
  status: null as string | null,
  category: null as string | null,
  difficulty: null as string | null
})

// Dialogs
const showGigDetail = ref(false)
const selectedGig = ref<any>(null)
const showGigFormDialog = ref(false)
const editingGig = ref<any>(null)
const showRewardFormDialog = ref(false)
const editingReward = ref<any>(null)
const showPurchaseConfirm = ref(false)
const purchasingReward = ref<any>(null)

// Form data
const gigForm = ref({
  title: '',
  description: '',
  bounty_value: 50,
  duration_minutes: 60,
  flake_penalty: 0,
  category: '',
  difficulty: 'medium',
  icon: 'mdi-star'
})

const rewardForm = ref({
  title: '',
  description: '',
  cost: 100,
  stock_quantity: null as number | null,
  icon: 'mdi-gift',
  category: '',
  is_active: true
})

const proofUrl = ref('')
const proofNotes = ref('')

// Options
const gigStatusOptions = [
  { title: 'Open', value: 'open' },
  { title: 'Claimed', value: 'claimed' },
  { title: 'Reviewing', value: 'reviewing' },
  { title: 'Completed', value: 'completed' }
]

const difficultyOptions = [
  { title: 'Easy', value: 'easy' },
  { title: 'Medium', value: 'medium' },
  { title: 'Hard', value: 'hard' },
  { title: 'Legendary', value: 'legendary' }
]

const gigCategories = ['Training', 'Coverage', 'Cleaning', 'Admin', 'Customer Service', 'Special Project']
const rewardCategories = ['Time Off', 'Food & Drinks', 'Swag', 'Experiences', 'Recognition']

// Table headers
const redemptionHeaders = [
  { title: 'Reward', key: 'reward' },
  { title: 'Cost', key: 'cost_paid' },
  { title: 'Status', key: 'status' },
  { title: 'Date', key: 'created_at' }
]

const gigAdminHeaders = [
  { title: 'Title', key: 'title' },
  { title: 'Status', key: 'status' },
  { title: 'Bounty', key: 'bounty_value' },
  { title: 'Difficulty', key: 'difficulty' },
  { title: 'Duration', key: 'duration_minutes' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const rewardAdminHeaders = [
  { title: 'Title', key: 'title' },
  { title: 'Cost', key: 'cost' },
  { title: 'Stock', key: 'stock_quantity' },
  { title: 'Status', key: 'is_active' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const adminRedemptionHeaders = [
  { title: 'Employee', key: 'employee' },
  { title: 'Reward', key: 'reward' },
  { title: 'Cost', key: 'cost_paid' },
  { title: 'Status', key: 'status' },
  { title: 'Date', key: 'created_at' },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Computed
const isAdmin = computed(() => {
  // For now, if they can see this page, they're an admin
  return true
})

const filteredGigs = computed(() => {
  return gigs.value.filter(gig => {
    if (gigFilter.value.status && gig.status !== gigFilter.value.status) return false
    if (gigFilter.value.category && gig.category !== gigFilter.value.category) return false
    if (gigFilter.value.difficulty && gig.difficulty !== gigFilter.value.difficulty) return false
    return true
  })
})

const myActiveGigs = computed(() => {
  return gigs.value.filter(gig =>
    gig.claimed_by === employeeId.value &&
    ['claimed', 'reviewing'].includes(gig.status)
  )
})

const reviewingGigs = computed(() => {
  return allGigs.value.filter(gig => gig.status === 'reviewing')
})

const reviewingGigsCount = computed(() => reviewingGigs.value.length)

const pendingRedemptionsCount = computed(() => {
  return allRedemptions.value.filter(r => r.status === 'pending').length
})

// Methods
const fetchData = async () => {
  loading.value = true
  try {
    // Fetch wallet
    const walletRes = await $fetch('/api/marketplace/wallet')
    wallet.value = walletRes.wallet
    employeeId.value = walletRes.employeeId

    // Fetch gigs
    const gigsRes = await $fetch('/api/marketplace/gigs')
    gigs.value = gigsRes.gigs || []

    // Fetch all gigs for admin
    const allGigsRes = await $fetch('/api/marketplace/gigs', {
      query: { includeCompleted: 'true' }
    })
    allGigs.value = allGigsRes.gigs || []

    // Fetch rewards
    const rewardsRes = await $fetch('/api/marketplace/rewards')
    rewards.value = rewardsRes.rewards || []

    // Fetch all rewards for admin
    const allRewardsRes = await $fetch('/api/marketplace/rewards', {
      query: { includeInactive: 'true' }
    })
    allRewards.value = allRewardsRes.rewards || []

    // Fetch transactions
    const txRes = await $fetch('/api/marketplace/transactions')
    transactions.value = txRes.transactions || []

    // Fetch redemptions
    const redemptionsRes = await $fetch('/api/marketplace/redemptions')
    myRedemptions.value = redemptionsRes.redemptions || []
    allRedemptions.value = redemptionsRes.redemptions || []

    // Check for expired gigs
    await $fetch('/api/marketplace/check-expired', { method: 'POST' })
  } catch (err: any) {
    console.error('Failed to load marketplace data:', err)
  } finally {
    loading.value = false
  }
}

const canAfford = (reward: any) => {
  return (wallet.value?.current_balance || 0) >= reward.cost
}

const isMyGig = (gig: any) => {
  return gig.claimed_by === employeeId.value
}

const getTimeRemaining = (gig: any) => {
  if (!gig.claimed_at) return { display: 'N/A', urgent: false }

  const claimed = new Date(gig.claimed_at)
  const deadline = new Date(claimed.getTime() + gig.duration_minutes * 60 * 1000)
  const now = new Date()
  const remaining = deadline.getTime() - now.getTime()

  if (remaining <= 0) {
    return { display: 'EXPIRED', urgent: true }
  }

  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)

  return {
    display: `${mins}m ${secs}s`,
    urgent: mins < 10
  }
}

const getDifficultyColor = (difficulty: string) => {
  const colors: Record<string, string> = {
    easy: 'green',
    medium: 'blue',
    hard: 'orange',
    legendary: 'purple'
  }
  return colors[difficulty] || 'grey'
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    open: 'success',
    claimed: 'warning',
    reviewing: 'info',
    completed: 'primary',
    expired: 'error'
  }
  return colors[status] || 'grey'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    open: 'Available',
    claimed: 'In Progress',
    reviewing: 'Under Review',
    completed: 'Completed',
    expired: 'Expired'
  }
  return labels[status] || status
}

const getStatusBannerClass = (status: string) => {
  const classes: Record<string, string> = {
    claimed: 'bg-warning text-white',
    reviewing: 'bg-info text-white',
    completed: 'bg-success text-white',
    expired: 'bg-error text-white'
  }
  return classes[status] || ''
}

const getGigCardClass = (gig: any) => {
  if (gig.status === 'claimed' && gig.claimed_at) {
    const remaining = getTimeRemaining(gig)
    if (remaining.urgent) return 'border-error'
  }
  return ''
}

const getRedemptionStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'warning',
    approved: 'info',
    fulfilled: 'success',
    denied: 'error',
    refunded: 'grey'
  }
  return colors[status] || 'grey'
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// Gig Actions
const openGigDetail = (gig: any) => {
  selectedGig.value = gig
  proofUrl.value = ''
  proofNotes.value = ''
  showGigDetail.value = true
}

const claimGig = async (gig: any) => {
  try {
    saving.value = true
    await $fetch(`/api/marketplace/gigs/${gig.id}/claim`, { method: 'POST' })
    showSuccess('Gig claimed! Get to work!')
    showGigDetail.value = false
    await fetchData()
  } catch (err: any) {
    showError(err.data?.message || 'Failed to claim gig')
  } finally {
    saving.value = false
  }
}

const submitGig = async (gig: any) => {
  try {
    saving.value = true
    await $fetch(`/api/marketplace/gigs/${gig.id}/submit`, {
      method: 'POST',
      body: {
        proof_url: proofUrl.value,
        proof_notes: proofNotes.value
      }
    })
    showSuccess('Submitted for review!')
    showGigDetail.value = false
    await fetchData()
  } catch (err: any) {
    showError(err.data?.message || 'Failed to submit')
  } finally {
    saving.value = false
  }
}

const abandonGig = async (gig: any) => {
  if (!confirm(`Are you sure? You may lose ${gig.flake_penalty} Bones.`)) return

  try {
    saving.value = true
    const result = await $fetch(`/api/marketplace/gigs/${gig.id}/abandon`, { method: 'POST' })
    if (result.penaltyApplied > 0) {
      showError(`Gig abandoned. You lost ${result.penaltyApplied} Bones.`)
    } else {
      showSuccess('Gig abandoned')
    }
    showGigDetail.value = false
    await fetchData()
  } catch (err: any) {
    showError(err.data?.message || 'Failed to abandon gig')
  } finally {
    saving.value = false
  }
}

const approveGig = async (gig: any, approved: boolean) => {
  try {
    saving.value = true
    const result = await $fetch(`/api/marketplace/gigs/${gig.id}/approve`, {
      method: 'POST',
      body: { approved }
    })
    if (approved) {
      showSuccess(`Approved! ${result.pointsAwarded} Bones awarded.`)
    } else {
      showSuccess('Submission rejected')
    }
    await fetchData()
  } catch (err: any) {
    showError(err.data?.message || 'Failed to process')
  } finally {
    saving.value = false
  }
}

// Gig Form
const openGigDialog = (gig?: any) => {
  if (gig) {
    editingGig.value = gig
    gigForm.value = {
      title: gig.title,
      description: gig.description || '',
      bounty_value: gig.bounty_value,
      duration_minutes: gig.duration_minutes,
      flake_penalty: gig.flake_penalty,
      category: gig.category || '',
      difficulty: gig.difficulty,
      icon: gig.icon || 'mdi-star'
    }
  } else {
    editingGig.value = null
    gigForm.value = {
      title: '',
      description: '',
      bounty_value: 50,
      duration_minutes: 60,
      flake_penalty: 0,
      category: '',
      difficulty: 'medium',
      icon: 'mdi-star'
    }
  }
  showGigFormDialog.value = true
}

const saveGig = async () => {
  if (!gigForm.value.title || !gigForm.value.bounty_value) {
    showError('Title and bounty are required')
    return
  }

  try {
    saving.value = true
    if (editingGig.value) {
      await $fetch(`/api/marketplace/gigs/${editingGig.value.id}`, {
        method: 'PATCH',
        body: gigForm.value
      })
      showSuccess('Gig updated')
    } else {
      await $fetch('/api/marketplace/gigs', {
        method: 'POST',
        body: gigForm.value
      })
      showSuccess('Gig created')
    }
    showGigFormDialog.value = false
    await fetchData()
  } catch (err: any) {
    showError(err.data?.message || 'Failed to save gig')
  } finally {
    saving.value = false
  }
}

const deleteGig = async (gig: any) => {
  if (!confirm('Delete this gig?')) return

  try {
    await $fetch(`/api/marketplace/gigs/${gig.id}`, { method: 'DELETE' })
    showSuccess('Gig deleted')
    await fetchData()
  } catch (err: any) {
    showError(err.data?.message || 'Failed to delete')
  }
}

// Reward Actions
const openRewardDialog = (reward?: any) => {
  if (reward) {
    editingReward.value = reward
    rewardForm.value = {
      title: reward.title,
      description: reward.description || '',
      cost: reward.cost,
      stock_quantity: reward.stock_quantity,
      icon: reward.icon || 'mdi-gift',
      category: reward.category || '',
      is_active: reward.is_active
    }
  } else {
    editingReward.value = null
    rewardForm.value = {
      title: '',
      description: '',
      cost: 100,
      stock_quantity: null,
      icon: 'mdi-gift',
      category: '',
      is_active: true
    }
  }
  showRewardFormDialog.value = true
}

const saveReward = async () => {
  if (!rewardForm.value.title || !rewardForm.value.cost) {
    showError('Title and cost are required')
    return
  }

  try {
    saving.value = true
    if (editingReward.value) {
      await $fetch(`/api/marketplace/rewards/${editingReward.value.id}`, {
        method: 'PATCH',
        body: rewardForm.value
      })
      showSuccess('Reward updated')
    } else {
      await $fetch('/api/marketplace/rewards', {
        method: 'POST',
        body: rewardForm.value
      })
      showSuccess('Reward created')
    }
    showRewardFormDialog.value = false
    await fetchData()
  } catch (err: any) {
    showError(err.data?.message || 'Failed to save reward')
  } finally {
    saving.value = false
  }
}

const purchaseReward = (reward: any) => {
  purchasingReward.value = reward
  showPurchaseConfirm.value = true
}

const confirmPurchase = async () => {
  if (!purchasingReward.value) return

  try {
    saving.value = true
    const result = await $fetch(`/api/marketplace/rewards/${purchasingReward.value.id}/purchase`, {
      method: 'POST'
    })
    showSuccess(`Purchased ${purchasingReward.value.title}! New balance: ${result.newBalance} Bones`)
    showPurchaseConfirm.value = false
    purchasingReward.value = null
    await fetchData()
  } catch (err: any) {
    showError(err.data?.message || 'Purchase failed')
  } finally {
    saving.value = false
  }
}

const fulfillRedemption = async (redemption: any, action: string) => {
  try {
    saving.value = true
    await $fetch(`/api/marketplace/redemptions/${redemption.id}/fulfill`, {
      method: 'POST',
      body: { action }
    })
    showSuccess(action === 'fulfill' ? 'Redemption fulfilled!' : 'Redemption denied and refunded')
    await fetchData()
  } catch (err: any) {
    showError(err.data?.message || 'Failed to process')
  } finally {
    saving.value = false
  }
}

const viewRedemptions = () => {
  activeTab.value = 'admin'
  adminSubTab.value = 'redemptions'
}

const viewReviewGigs = () => {
  activeTab.value = 'admin'
  adminSubTab.value = 'reviews'
}

// Timer refresh
let timerInterval: ReturnType<typeof setInterval>

onMounted(() => {
  fetchData()
  // Refresh timers every second for claimed gigs
  timerInterval = setInterval(() => {
    // Force reactivity update for timers
    gigs.value = [...gigs.value]
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<style scoped>
.wallet-widget {
  border-radius: 12px;
}

.gig-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.gig-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.gig-status-banner {
  margin: -16px -16px 12px -16px;
}

.gig-timer {
  font-family: monospace;
  font-size: 1.1rem;
  font-weight: bold;
}

.reward-card {
  transition: transform 0.2s;
}

.reward-card:hover {
  transform: translateY(-2px);
}

.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.border-error {
  border: 2px solid rgb(var(--v-theme-error)) !important;
  animation: pulse-error 1s infinite;
}

@keyframes pulse-error {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--v-theme-error), 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(var(--v-theme-error), 0); }
}

.border-warning {
  border: 2px solid rgb(var(--v-theme-warning)) !important;
}
</style>
