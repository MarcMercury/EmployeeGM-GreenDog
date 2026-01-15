<template>
  <div class="med-ops-partners-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Med Ops Partners</h1>
        <p class="text-body-1 text-grey-darken-1">
          Equipment vendors, software providers, labs, and supply chain partners
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn-toggle v-model="showInactive" density="compact" variant="outlined">
          <v-btn :value="false">Active Only</v-btn>
          <v-btn :value="true">Show All</v-btn>
        </v-btn-toggle>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openAddDialog"
        >
          Add Partner
        </v-btn>
      </div>
    </div>

    <!-- Search and Filters -->
    <v-card rounded="lg" class="mb-4" variant="outlined">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search partners..."
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="categoryFilter"
              :items="categories"
              label="Category"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-btn-toggle v-model="viewMode" mandatory density="compact">
              <v-btn value="grid" icon="mdi-view-grid" />
              <v-btn value="list" icon="mdi-view-list" />
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Empty State -->
    <v-card v-else-if="filteredPartners.length === 0" rounded="lg" class="pa-8 text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-factory</v-icon>
      <h3 class="text-h6 mb-2">No Partners Found</h3>
      <p class="text-body-2 text-grey mb-4">
        {{ partners.length === 0 ? 'Get started by adding your first partner.' : 'No partners match your current filters.' }}
      </p>
      <v-btn v-if="partners.length === 0" color="primary" prepend-icon="mdi-plus" @click="openAddDialog">
        Add Partner
      </v-btn>
    </v-card>

    <!-- Grid View -->
    <v-row v-else-if="viewMode === 'grid'">
      <v-col v-for="partner in filteredPartners" :key="partner.id" cols="12" sm="6" md="4" lg="3">
        <v-card rounded="lg" class="h-100 partner-card" :class="{ 'inactive-card': partner.status !== 'active' }" @click="openPartner(partner)">
          <div class="pa-4 text-center">
            <v-avatar size="64" :color="partner.color || 'primary'" class="mb-3">
              <v-icon size="32" color="white">{{ partner.icon || 'mdi-factory' }}</v-icon>
            </v-avatar>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ partner.name }}</h3>
            <div class="d-flex justify-center gap-1 mb-2">
              <v-chip size="x-small" variant="tonal" color="primary">
                {{ partner.category || 'Other' }}
              </v-chip>
              <v-chip v-if="partner.status !== 'active'" size="x-small" variant="flat" color="warning">
                {{ partner.status }}
              </v-chip>
            </div>
            <p class="text-body-2 text-grey text-truncate">{{ partner.description }}</p>
          </div>
          <v-divider />
          <v-card-actions class="justify-center">
            <v-btn variant="text" size="small" prepend-icon="mdi-phone" @click.stop="callPartner(partner)">
              Contact
            </v-btn>
            <v-btn variant="text" size="small" prepend-icon="mdi-pencil" @click.stop="openEditDialog(partner)">
              Edit
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- List View -->
    <v-card v-else rounded="lg">
      <v-data-table
        :headers="tableHeaders"
        :items="filteredPartners"
        :search="search"
        hover
        @click:row="(_: any, { item }: { item: any }) => openPartner(item)"
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center gap-3">
            <v-avatar :color="item.color || 'primary'" size="36">
              <v-icon size="18" color="white">{{ item.icon || 'mdi-factory' }}</v-icon>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-grey">{{ item.category || 'Other' }}</div>
            </div>
          </div>
        </template>
        <template #item.status="{ item }">
          <v-chip 
            :color="item.status === 'active' ? 'success' : item.status === 'inactive' ? 'grey' : 'warning'" 
            size="small" 
            variant="flat"
          >
            {{ item.status }}
          </v-chip>
        </template>
        <template #item.contact="{ item }">
          <div class="text-body-2">{{ item.contact_name }}</div>
          <div class="text-caption text-grey">{{ item.phone }}</div>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click.stop="openEditDialog(item)" />
          <v-btn icon="mdi-phone" size="small" variant="text" @click.stop="callPartner(item)" />
          <v-btn icon="mdi-email" size="small" variant="text" @click.stop="emailPartner(item)" />
          <v-btn icon="mdi-web" size="small" variant="text" @click.stop="visitWebsite(item)" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Partner Detail Dialog -->
    <v-dialog v-model="partnerDialog" max-width="900" scrollable>
      <v-card v-if="selectedPartner">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-3">
            <v-avatar :color="selectedPartner.color || 'primary'" size="48">
              <v-icon size="24" color="white">{{ selectedPartner.icon || 'mdi-factory' }}</v-icon>
            </v-avatar>
            <div>
              <div class="text-h6">{{ selectedPartner.name }}</div>
              <div class="d-flex align-center gap-2">
                <v-chip size="x-small" variant="tonal">{{ selectedPartner.category }}</v-chip>
                <v-chip v-if="selectedPartner.last_contact_date" size="x-small" variant="outlined" color="info">
                  Last Contact: {{ formatDate(selectedPartner.last_contact_date) }}
                </v-chip>
              </div>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="partnerDialog = false" />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text style="max-height: 70vh;">
          <v-tabs v-model="detailTab" color="primary" class="mb-4">
            <v-tab value="overview">Overview</v-tab>
            <v-tab value="contacts">Primary Contacts</v-tab>
            <v-tab value="notes">Notes & Activity</v-tab>
            <v-tab value="revenue">Revenue</v-tab>
          </v-tabs>

          <v-window v-model="detailTab">
            <!-- Overview Tab -->
            <v-window-item value="overview">
              <div class="mb-4">{{ selectedPartner.description }}</div>
              
              <v-list density="compact" class="bg-transparent">
                <v-list-item v-if="selectedPartner.contact_name">
                  <template #prepend>
                    <v-icon>mdi-account</v-icon>
                  </template>
                  <v-list-item-title>{{ selectedPartner.contact_name }}</v-list-item-title>
                  <v-list-item-subtitle>Primary Contact</v-list-item-subtitle>
                </v-list-item>
                
                <v-list-item v-if="selectedPartner.phone">
                  <template #prepend>
                    <v-icon>mdi-phone</v-icon>
                  </template>
                  <v-list-item-title>{{ selectedPartner.phone }}</v-list-item-title>
                  <v-list-item-subtitle>Phone</v-list-item-subtitle>
                </v-list-item>
                
                <v-list-item v-if="selectedPartner.email">
                  <template #prepend>
                    <v-icon>mdi-email</v-icon>
                  </template>
                  <v-list-item-title>{{ selectedPartner.email }}</v-list-item-title>
                  <v-list-item-subtitle>Email</v-list-item-subtitle>
                </v-list-item>
                
                <v-list-item v-if="selectedPartner.website">
                  <template #prepend>
                    <v-icon>mdi-web</v-icon>
                  </template>
                  <v-list-item-title>{{ selectedPartner.website }}</v-list-item-title>
                  <v-list-item-subtitle>Website</v-list-item-subtitle>
                </v-list-item>
                
                <v-list-item v-if="selectedPartner.address">
                  <template #prepend>
                    <v-icon>mdi-map-marker</v-icon>
                  </template>
                  <v-list-item-title>{{ selectedPartner.address }}</v-list-item-title>
                  <v-list-item-subtitle>Address</v-list-item-subtitle>
                </v-list-item>
              </v-list>

              <v-divider class="my-4" />

              <div class="text-subtitle-2 mb-2">Products & Services</div>
              <v-chip-group>
                <v-chip v-for="product in selectedPartner.products" :key="product" size="small" variant="outlined">
                  {{ product }}
                </v-chip>
              </v-chip-group>
            </v-window-item>

            <!-- Primary Contacts Tab -->
            <v-window-item value="contacts">
              <div class="d-flex justify-space-between align-center mb-4">
                <div class="text-subtitle-1 font-weight-medium">Key People at {{ selectedPartner.name }}</div>
                <v-btn size="small" color="primary" prepend-icon="mdi-plus" @click="openAddContactDialog">
                  Add Contact
                </v-btn>
              </div>

              <v-alert v-if="partnerContacts.length === 0" type="info" variant="tonal" class="mb-4">
                No contacts added yet. Add key people you work with at this partner.
              </v-alert>

              <v-card v-for="contact in partnerContacts" :key="contact.id" variant="outlined" class="mb-3">
                <v-card-text class="pb-2">
                  <div class="d-flex justify-space-between align-start">
                    <div>
                      <div class="d-flex align-center gap-2">
                        <span class="font-weight-medium">{{ contact.name }}</span>
                        <v-chip v-if="contact.is_primary" size="x-small" color="primary" variant="flat">Primary</v-chip>
                      </div>
                      <div class="text-body-2 text-grey">{{ contact.title }}</div>
                    </div>
                    <v-menu>
                      <template #activator="{ props }">
                        <v-btn icon="mdi-dots-vertical" size="small" variant="text" v-bind="props" />
                      </template>
                      <v-list density="compact">
                        <v-list-item prepend-icon="mdi-pencil" @click="openEditContactDialog(contact)">
                          <v-list-item-title>Edit</v-list-item-title>
                        </v-list-item>
                        <v-list-item prepend-icon="mdi-star" @click="setAsPrimaryContact(contact)" :disabled="contact.is_primary">
                          <v-list-item-title>Set as Primary</v-list-item-title>
                        </v-list-item>
                        <v-list-item prepend-icon="mdi-delete" class="text-error" @click="deleteContact(contact)">
                          <v-list-item-title>Delete</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </div>
                  <div class="d-flex gap-4 mt-2 text-body-2">
                    <span v-if="contact.email"><v-icon size="14" class="mr-1">mdi-email</v-icon>{{ contact.email }}</span>
                    <span v-if="contact.phone"><v-icon size="14" class="mr-1">mdi-phone</v-icon>{{ contact.phone }}</span>
                    <span v-if="contact.preferred_contact_method">
                      <v-icon size="14" class="mr-1">mdi-message</v-icon>Prefers {{ contact.preferred_contact_method }}
                    </span>
                  </div>
                  <div v-if="contact.relationship_notes" class="text-body-2 text-grey mt-2">
                    {{ contact.relationship_notes }}
                  </div>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Notes & Activity Tab -->
            <v-window-item value="notes">
              <div class="d-flex justify-space-between align-center mb-4">
                <div class="text-subtitle-1 font-weight-medium">Activity Log</div>
                <v-btn size="small" color="primary" prepend-icon="mdi-plus" @click="showAddNoteDialog = true">
                  Add Note
                </v-btn>
              </div>

              <v-alert v-if="partnerNotes.length === 0" type="info" variant="tonal" class="mb-4">
                No notes or activity logged yet. Add a note to track interactions with this partner.
              </v-alert>

              <v-timeline density="compact" side="end">
                <v-timeline-item
                  v-for="note in partnerNotes"
                  :key="note.id"
                  :dot-color="getVisitTypeColor(note.visit_type)"
                  size="small"
                >
                  <template #opposite>
                    <div class="text-caption text-grey">{{ formatDate(note.visit_date) }}</div>
                  </template>
                  <v-card variant="outlined" class="mb-2">
                    <v-card-text class="py-2">
                      <div class="d-flex justify-space-between align-center mb-1">
                        <div class="d-flex align-center gap-2">
                          <v-chip size="x-small" :color="getVisitTypeColor(note.visit_type)" variant="flat">
                            {{ note.visit_type }}
                          </v-chip>
                          <span v-if="note.contacted_person" class="text-body-2">with {{ note.contacted_person }}</span>
                        </div>
                      </div>
                      <div class="text-body-2">{{ note.summary }}</div>
                      <div v-if="note.outcome" class="text-body-2 mt-1">
                        <strong>Outcome:</strong> {{ note.outcome }}
                      </div>
                      <div v-if="note.next_steps" class="text-body-2 mt-1 text-primary">
                        <strong>Next Steps:</strong> {{ note.next_steps }}
                      </div>
                    </v-card-text>
                  </v-card>
                </v-timeline-item>
              </v-timeline>
            </v-window-item>

            <!-- Revenue Tab -->
            <v-window-item value="revenue">
              <v-row>
                <v-col cols="12" md="4">
                  <v-card variant="tonal" color="success" class="text-center pa-4">
                    <div class="text-overline">Monthly Average</div>
                    <div class="text-h4 font-weight-bold">${{ formatCurrency(selectedPartner.average_monthly_revenue) }}</div>
                  </v-card>
                </v-col>
                <v-col cols="12" md="4">
                  <v-card variant="tonal" color="primary" class="text-center pa-4">
                    <div class="text-overline">Year to Date</div>
                    <div class="text-h4 font-weight-bold">${{ formatCurrency(selectedPartner.revenue_ytd) }}</div>
                  </v-card>
                </v-col>
                <v-col cols="12" md="4">
                  <v-card variant="tonal" color="info" class="text-center pa-4">
                    <div class="text-overline">Last Year Total</div>
                    <div class="text-h4 font-weight-bold">${{ formatCurrency(selectedPartner.revenue_last_year) }}</div>
                  </v-card>
                </v-col>
              </v-row>

              <v-card variant="outlined" class="mt-4">
                <v-card-title class="text-subtitle-1">Update Revenue</v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="revenueForm.average_monthly_revenue"
                        label="Monthly Average ($)"
                        type="number"
                        variant="outlined"
                        density="compact"
                        prefix="$"
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="revenueForm.revenue_ytd"
                        label="Year to Date ($)"
                        type="number"
                        variant="outlined"
                        density="compact"
                        prefix="$"
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="revenueForm.revenue_last_year"
                        label="Last Year Total ($)"
                        type="number"
                        variant="outlined"
                        density="compact"
                        prefix="$"
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
                <v-card-actions>
                  <v-spacer />
                  <v-btn color="primary" :loading="savingRevenue" @click="saveRevenue">
                    Save Revenue
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-window-item>
          </v-window>
        </v-card-text>
        
        <v-card-actions>
          <v-btn variant="text" prepend-icon="mdi-pencil" @click="openEditDialog(selectedPartner)">Edit Partner</v-btn>
          <v-spacer />
          <v-btn color="primary" prepend-icon="mdi-phone" @click="callPartner(selectedPartner)">
            Call
          </v-btn>
          <v-btn color="primary" variant="outlined" prepend-icon="mdi-email" @click="emailPartner(selectedPartner)">
            Email
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Contact Dialog -->
    <v-dialog v-model="showContactDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editingContact ? 'Edit Contact' : 'Add Contact' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="contactForm.name"
            label="Name *"
            variant="outlined"
            density="compact"
            :rules="[v => !!v || 'Required']"
            class="mb-3"
          />
          <v-text-field
            v-model="contactForm.title"
            label="Title/Role"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="contactForm.email"
                label="Email"
                type="email"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="contactForm.phone"
                label="Phone"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
          <v-select
            v-model="contactForm.preferred_contact_method"
            :items="contactMethods"
            label="Preferred Contact Method"
            variant="outlined"
            density="compact"
            class="mt-3"
          />
          <v-textarea
            v-model="contactForm.relationship_notes"
            label="Relationship Notes"
            variant="outlined"
            density="compact"
            rows="2"
            class="mt-3"
            placeholder="How do you know this person? Any special notes about working with them?"
          />
          <v-checkbox
            v-model="contactForm.is_primary"
            label="Primary Contact"
            density="compact"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showContactDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingContact" @click="saveContact">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Note Dialog -->
    <v-dialog v-model="showAddNoteDialog" max-width="500">
      <v-card>
        <v-card-title>Add Activity Note</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <v-select
                v-model="noteForm.visit_type"
                :items="visitTypes"
                label="Type"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="noteForm.visit_date"
                label="Date"
                type="date"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
          <v-autocomplete
            v-model="noteForm.contacted_person"
            :items="partnerContactNames"
            label="Who did you speak with?"
            variant="outlined"
            density="compact"
            clearable
            class="mt-3"
          />
          <v-textarea
            v-model="noteForm.summary"
            label="Summary *"
            variant="outlined"
            density="compact"
            rows="3"
            class="mt-3"
            :rules="[v => !!v || 'Required']"
          />
          <v-textarea
            v-model="noteForm.outcome"
            label="Outcome"
            variant="outlined"
            density="compact"
            rows="2"
            class="mt-3"
          />
          <v-textarea
            v-model="noteForm.next_steps"
            label="Next Steps"
            variant="outlined"
            density="compact"
            rows="2"
            class="mt-3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddNoteDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingNote" @click="saveNote">Add Note</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Partner Dialog -->
    <v-dialog v-model="showPartnerForm" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>{{ isEditing ? 'Edit Partner' : 'Add New Partner' }}</span>
          <v-btn icon="mdi-close" variant="text" @click="closeFormDialog" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-form ref="formRef">
            <v-row>
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="partnerForm.name"
                  label="Company Name *"
                  variant="outlined"
                  :rules="[v => !!v || 'Required']"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="partnerForm.status"
                  :items="statusOptions"
                  label="Status"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
            
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="partnerForm.category"
                  :items="categories"
                  label="Category"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerForm.website"
                  label="Website"
                  variant="outlined"
                  density="compact"
                  placeholder="www.example.com"
                />
              </v-col>
            </v-row>

            <v-textarea
              v-model="partnerForm.description"
              label="Description"
              variant="outlined"
              rows="2"
              density="compact"
              class="mb-2"
            />

            <v-divider class="my-3" />
            <div class="text-subtitle-2 mb-2">Primary Contact</div>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerForm.contact_name"
                  label="Contact Name"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerForm.phone"
                  label="Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerForm.email"
                  label="Email"
                  type="email"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerForm.address"
                  label="Address"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-divider class="my-3" />
            <div class="text-subtitle-2 mb-2">Display Options</div>

            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="partnerForm.icon"
                  :items="iconOptions"
                  label="Icon"
                  variant="outlined"
                  density="compact"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-icon>{{ item.value }}</v-icon>
                      </template>
                    </v-list-item>
                  </template>
                  <template #selection="{ item }">
                    <v-icon class="mr-2">{{ item.value }}</v-icon>
                    {{ item.title }}
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="partnerForm.color"
                  :items="colorOptions"
                  label="Color"
                  variant="outlined"
                  density="compact"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-avatar :color="item.value" size="24" />
                      </template>
                    </v-list-item>
                  </template>
                  <template #selection="{ item }">
                    <v-avatar :color="item.value" size="20" class="mr-2" />
                    {{ item.title }}
                  </template>
                </v-select>
              </v-col>
            </v-row>

            <v-combobox
              v-model="partnerForm.products"
              label="Products & Services"
              variant="outlined"
              density="compact"
              chips
              multiple
              closable-chips
              hint="Press Enter to add items"
              persistent-hint
            />
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-btn 
            v-if="isEditing" 
            color="error" 
            variant="text" 
            prepend-icon="mdi-delete"
            @click="confirmDelete"
          >
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="closeFormDialog">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="savePartner">
            {{ isEditing ? 'Save Changes' : 'Add Partner' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Delete Partner?</v-card-title>
        <v-card-text>
          <p>Are you sure you want to delete <strong>{{ partnerForm.name }}</strong>?</p>
          <p class="text-caption text-grey mt-2">
            This action cannot be undone. Consider disabling the partner instead if you may need this record later.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="showDeleteConfirm = false">Cancel</v-btn>
          <v-spacer />
          <v-btn 
            color="warning" 
            variant="tonal"
            @click="disablePartner"
          >
            Disable Instead
          </v-btn>
          <v-btn 
            color="error" 
            :loading="deleting"
            @click="deletePartner"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '~/composables/useToast'
import { useUserStore } from '~/stores/user'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({
  title: 'Med Ops Partners'
})

const supabase = useSupabaseClient()
const { showSuccess, showError } = useToast()
const userStore = useUserStore()

// State
const search = ref('')
const categoryFilter = ref<string | null>(null)
const viewMode = ref('grid')
const partnerDialog = ref(false)
const showPartnerForm = ref(false)
const showDeleteConfirm = ref(false)
const showInactive = ref(false)
const selectedPartner = ref<any>(null)
const formRef = ref()
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const loading = ref(true)
const detailTab = ref('overview')

// Partner Contacts
const showContactDialog = ref(false)
const editingContact = ref<any>(null)
const savingContact = ref(false)
const partnerContacts = ref<any[]>([])

const contactForm = reactive({
  name: '',
  title: '',
  email: '',
  phone: '',
  is_primary: false,
  relationship_notes: '',
  preferred_contact_method: 'email'
})

const contactMethods = [
  { title: 'Email', value: 'email' },
  { title: 'Phone', value: 'phone' },
  { title: 'Text', value: 'text' },
  { title: 'In Person', value: 'in_person' }
]

// Partner Notes
const showAddNoteDialog = ref(false)
const savingNote = ref(false)
const partnerNotes = ref<any[]>([])

const noteForm = reactive({
  visit_type: 'phone',
  visit_date: new Date().toISOString().split('T')[0],
  contacted_person: '',
  summary: '',
  outcome: '',
  next_steps: ''
})

const visitTypes = [
  { title: 'Phone Call', value: 'phone' },
  { title: 'In Person', value: 'in_person' },
  { title: 'Video Call', value: 'video' },
  { title: 'Email', value: 'email' }
]

// Revenue
const savingRevenue = ref(false)
const revenueForm = reactive({
  average_monthly_revenue: 0,
  revenue_ytd: 0,
  revenue_last_year: 0
})

// Form state
const partnerForm = reactive({
  id: '',
  name: '',
  category: 'Other',
  contact_name: '',
  phone: '',
  email: '',
  website: '',
  description: '',
  address: '',
  status: 'active',
  icon: 'mdi-factory',
  color: 'grey',
  products: [] as string[]
})

const categories = [
  'Practice Management Software',
  'Diagnostics & Reference Labs',
  'Distributors',
  'Equipment & Hardware',
  'Pharmacy & Compounding',
  'Client Communication & Payment',
  'Other'
]

const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Pending', value: 'pending' }
]

const iconOptions = [
  { title: 'Factory', value: 'mdi-factory' },
  { title: 'Flask', value: 'mdi-flask' },
  { title: 'Pill', value: 'mdi-pill' },
  { title: 'Radiology', value: 'mdi-radiology-box' },
  { title: 'Medical Bag', value: 'mdi-medical-bag' },
  { title: 'Gas Cylinder', value: 'mdi-gas-cylinder' },
  { title: 'Tooth', value: 'mdi-tooth' },
  { title: 'Test Tube', value: 'mdi-test-tube' },
  { title: 'Heart Pulse', value: 'mdi-heart-pulse' },
  { title: 'Hospital', value: 'mdi-hospital-building' },
  { title: 'Needle', value: 'mdi-needle' },
  { title: 'Microscope', value: 'mdi-microscope' }
]

const colorOptions = [
  { title: 'Grey', value: 'grey' },
  { title: 'Blue', value: 'blue' },
  { title: 'Green', value: 'green' },
  { title: 'Purple', value: 'purple' },
  { title: 'Teal', value: 'teal' },
  { title: 'Orange', value: 'orange' },
  { title: 'Cyan', value: 'cyan' },
  { title: 'Red', value: 'red' },
  { title: 'Pink', value: 'pink' },
  { title: 'Indigo', value: 'indigo' }
]

const tableHeaders = [
  { title: 'Partner', key: 'name' },
  { title: 'Status', key: 'status' },
  { title: 'Contact', key: 'contact' },
  { title: 'Email', key: 'email' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

// Partners from database
const partners = ref<any[]>([])

// Load partners from database
async function loadPartners() {
  loading.value = true
  try {
    const { data, error } = await (supabase as any)
      .from('med_ops_partners')
      .select('*')
      .order('name')
    
    if (error) throw error
    // Map fields for compatibility with template
    partners.value = (data || []).map((p: any) => ({
      ...p,
      status: p.is_active ? 'active' : 'inactive',
      phone: p.contact_phone,
      email: p.contact_email,
      average_monthly_revenue: p.average_monthly_spend,
      revenue_ytd: p.spend_ytd,
      revenue_last_year: p.spend_last_year
    }))
  } catch (err: any) {
    showError('Failed to load partners: ' + err.message)
    console.error('Error loading partners:', err)
  } finally {
    loading.value = false
  }
}

// Load on mount
onMounted(() => {
  loadPartners()
})

// Computed
const filteredPartners = computed(() => {
  return partners.value.filter(p => {
    const matchesSearch = !search.value || 
      p.name.toLowerCase().includes(search.value.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.value.toLowerCase())
    const matchesCategory = !categoryFilter.value || p.category === categoryFilter.value
    const matchesStatus = showInactive.value || p.is_active !== false
    return matchesSearch && matchesCategory && matchesStatus
  })
})

const partnerContactNames = computed(() => {
  return partnerContacts.value.map(c => c.name)
})

// Watch for partner dialog opening to load related data
watch(partnerDialog, async (open) => {
  if (open && selectedPartner.value) {
    detailTab.value = 'overview'
    await Promise.all([
      loadPartnerContacts(),
      loadPartnerNotes()
    ])
    // Initialize revenue form
    revenueForm.average_monthly_revenue = selectedPartner.value.average_monthly_revenue || 0
    revenueForm.revenue_ytd = selectedPartner.value.revenue_ytd || 0
    revenueForm.revenue_last_year = selectedPartner.value.revenue_last_year || 0
  }
})

// Helper functions
function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return '0'
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function getVisitTypeColor(type: string) {
  const colors: Record<string, string> = {
    phone: 'blue',
    in_person: 'green',
    video: 'purple',
    email: 'orange'
  }
  return colors[type] || 'grey'
}

// Partner Contacts functions
async function loadPartnerContacts() {
  if (!selectedPartner.value?.id) return
  try {
    const { data, error } = await (supabase as any)
      .from('med_ops_partner_contacts')
      .select('*')
      .eq('partner_id', selectedPartner.value.id)
      .order('is_primary', { ascending: false })
      .order('name')
    
    if (error) throw error
    partnerContacts.value = data || []
  } catch (err: any) {
    console.error('Error loading contacts:', err)
  }
}

function resetContactForm() {
  Object.assign(contactForm, {
    name: '',
    title: '',
    email: '',
    phone: '',
    is_primary: false,
    relationship_notes: '',
    preferred_contact_method: 'email'
  })
  editingContact.value = null
}

function openAddContactDialog() {
  resetContactForm()
  showContactDialog.value = true
}

function openEditContactDialog(contact: any) {
  editingContact.value = contact
  Object.assign(contactForm, {
    name: contact.name || '',
    title: contact.title || '',
    email: contact.email || '',
    phone: contact.phone || '',
    is_primary: contact.is_primary || false,
    relationship_notes: contact.relationship_notes || '',
    preferred_contact_method: contact.preferred_contact_method || 'email'
  })
  showContactDialog.value = true
}

async function saveContact() {
  if (!contactForm.name) {
    showError('Contact name is required')
    return
  }
  
  savingContact.value = true
  try {
    const contactData = {
      partner_id: selectedPartner.value.id,
      name: contactForm.name,
      title: contactForm.title || null,
      email: contactForm.email || null,
      phone: contactForm.phone || null,
      is_primary: contactForm.is_primary,
      relationship_notes: contactForm.relationship_notes || null,
      preferred_contact_method: contactForm.preferred_contact_method
    }

    if (editingContact.value) {
      const { error } = await (supabase as any)
        .from('med_ops_partner_contacts')
        .update(contactData)
        .eq('id', editingContact.value.id)
      
      if (error) throw error
      showSuccess('Contact updated')
    } else {
      const { error } = await (supabase as any)
        .from('med_ops_partner_contacts')
        .insert(contactData)
      
      if (error) throw error
      showSuccess('Contact added')
    }

    showContactDialog.value = false
    resetContactForm()
    await loadPartnerContacts()
  } catch (err: any) {
    showError('Failed to save contact: ' + err.message)
  } finally {
    savingContact.value = false
  }
}

async function setAsPrimaryContact(contact: any) {
  try {
    // First, unset all others
    await (supabase as any)
      .from('med_ops_partner_contacts')
      .update({ is_primary: false })
      .eq('partner_id', selectedPartner.value.id)
    
    // Then set this one as primary
    const { error } = await (supabase as any)
      .from('med_ops_partner_contacts')
      .update({ is_primary: true })
      .eq('id', contact.id)
    
    if (error) throw error
    showSuccess('Primary contact updated')
    await loadPartnerContacts()
  } catch (err: any) {
    showError('Failed to update primary contact: ' + err.message)
  }
}

async function deleteContact(contact: any) {
  if (!confirm('Delete this contact?')) return
  
  try {
    const { error } = await (supabase as any)
      .from('med_ops_partner_contacts')
      .delete()
      .eq('id', contact.id)
    
    if (error) throw error
    showSuccess('Contact deleted')
    await loadPartnerContacts()
  } catch (err: any) {
    showError('Failed to delete contact: ' + err.message)
  }
}

// Partner Notes functions
async function loadPartnerNotes() {
  if (!selectedPartner.value?.id) return
  try {
    const { data, error } = await (supabase as any)
      .from('med_ops_partner_notes')
      .select('*')
      .eq('partner_id', selectedPartner.value.id)
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (error) throw error
    partnerNotes.value = data || []
  } catch (err: any) {
    console.error('Error loading notes:', err)
  }
}

function resetNoteForm() {
  Object.assign(noteForm, {
    visit_type: 'phone',
    visit_date: new Date().toISOString().split('T')[0],
    contacted_person: '',
    summary: '',
    outcome: '',
    next_steps: ''
  })
}

async function saveNote() {
  if (!noteForm.summary) {
    showError('Summary is required')
    return
  }
  
  savingNote.value = true
  try {
    const noteData = {
      partner_id: selectedPartner.value.id,
      visit_type: noteForm.visit_type,
      visit_date: noteForm.visit_date,
      contacted_person: noteForm.contacted_person || null,
      summary: noteForm.summary,
      outcome: noteForm.outcome || null,
      next_steps: noteForm.next_steps || null,
      created_by: userStore.employee?.id || null
    }

    const { error } = await (supabase as any)
      .from('med_ops_partner_notes')
      .insert(noteData)
    
    if (error) throw error
    
    showSuccess('Note added - Last contact date updated')
    showAddNoteDialog.value = false
    resetNoteForm()
    await loadPartnerNotes()
    // Reload partner to get updated last_contact_date
    await loadPartners()
    // Update selected partner
    selectedPartner.value = partners.value.find(p => p.id === selectedPartner.value.id)
  } catch (err: any) {
    showError('Failed to save note: ' + err.message)
  } finally {
    savingNote.value = false
  }
}

// Revenue functions
async function saveRevenue() {
  savingRevenue.value = true
  try {
    const { error } = await (supabase as any)
      .from('med_ops_partners')
      .update({
        average_monthly_spend: revenueForm.average_monthly_revenue || 0,
        spend_ytd: revenueForm.revenue_ytd || 0,
        spend_last_year: revenueForm.revenue_last_year || 0
      })
      .eq('id', selectedPartner.value.id)
    
    if (error) throw error
    showSuccess('Spend data updated')
    await loadPartners()
    selectedPartner.value = partners.value.find(p => p.id === selectedPartner.value.id)
  } catch (err: any) {
    showError('Failed to save spend data: ' + err.message)
  } finally {
    savingRevenue.value = false
  }
}

// Form helpers
function resetForm() {
  Object.assign(partnerForm, {
    id: '',
    name: '',
    category: 'Other',
    contact_name: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    address: '',
    status: 'active',
    icon: 'mdi-factory',
    color: 'grey',
    products: []
  })
}

function openAddDialog() {
  resetForm()
  isEditing.value = false
  showPartnerForm.value = true
}

function openEditDialog(partner: any) {
  Object.assign(partnerForm, {
    id: partner.id,
    name: partner.name || '',
    category: partner.category || 'Other',
    contact_name: partner.contact_name || '',
    phone: partner.phone || '',
    email: partner.email || '',
    website: partner.website || '',
    description: partner.description || '',
    address: partner.address || '',
    status: partner.status || 'active',
    icon: partner.icon || 'mdi-factory',
    color: partner.color || 'grey',
    products: partner.products || []
  })
  isEditing.value = true
  partnerDialog.value = false
  showPartnerForm.value = true
}

function closeFormDialog() {
  showPartnerForm.value = false
  resetForm()
}

// Methods
function openPartner(partner: any) {
  selectedPartner.value = partner
  partnerDialog.value = true
}

function callPartner(partner: any) {
  if (partner?.phone) {
    window.open(`tel:${partner.phone}`, '_self')
  }
}

function emailPartner(partner: any) {
  if (partner?.email) {
    window.open(`mailto:${partner.email}`, '_blank')
  }
}

function visitWebsite(partner: any) {
  if (partner?.website) {
    const url = partner.website.startsWith('http') ? partner.website : `https://${partner.website}`
    window.open(url, '_blank')
  }
}

async function savePartner() {
  const { valid } = await formRef.value?.validate()
  if (!valid) return

  saving.value = true
  try {
    const partnerData = {
      name: partnerForm.name,
      category: partnerForm.category,
      contact_name: partnerForm.contact_name || null,
      contact_phone: partnerForm.phone || null,
      contact_email: partnerForm.email || null,
      website: partnerForm.website || null,
      description: partnerForm.description || null,
      address: partnerForm.address || null,
      is_active: partnerForm.status === 'active',
      icon: partnerForm.icon,
      color: partnerForm.color,
      products: partnerForm.products
    }

    if (isEditing.value) {
      // Update existing partner
      const { error } = await (supabase as any)
        .from('med_ops_partners')
        .update(partnerData)
        .eq('id', partnerForm.id)
      
      if (error) throw error
      showSuccess('Partner updated successfully')
    } else {
      // Create new partner
      const { error } = await (supabase as any)
        .from('med_ops_partners')
        .insert(partnerData)
      
      if (error) throw error
      showSuccess('Partner added successfully')
    }

    closeFormDialog()
    await loadPartners()
  } catch (err: any) {
    showError('Failed to save partner: ' + err.message)
    console.error('Error saving partner:', err)
  } finally {
    saving.value = false
  }
}

function confirmDelete() {
  showDeleteConfirm.value = true
}

async function deletePartner() {
  deleting.value = true
  try {
    const { error } = await (supabase as any)
      .from('med_ops_partners')
      .delete()
      .eq('id', partnerForm.id)
    
    if (error) throw error
    
    showSuccess('Partner deleted successfully')
    showDeleteConfirm.value = false
    closeFormDialog()
    await loadPartners()
  } catch (err: any) {
    showError('Failed to delete partner: ' + err.message)
    console.error('Error deleting partner:', err)
  } finally {
    deleting.value = false
  }
}

async function disablePartner() {
  deleting.value = true
  try {
    const { error } = await (supabase as any)
      .from('med_ops_partners')
      .update({ is_active: false })
      .eq('id', partnerForm.id)
    
    if (error) throw error
    
    showSuccess('Partner disabled successfully')
    showDeleteConfirm.value = false
    closeFormDialog()
    await loadPartners()
  } catch (err: any) {
    showError('Failed to disable partner: ' + err.message)
    console.error('Error disabling partner:', err)
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.med-ops-partners-page {
  max-width: 1400px;
}

.partner-card {
  cursor: pointer;
  transition: all 0.2s;
}

.partner-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.inactive-card {
  opacity: 0.7;
}
</style>
