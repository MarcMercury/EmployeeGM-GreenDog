<template>
  <div class="invoice-analysis-page">
    <!-- Page Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Invoice Analysis</h1>
        <p class="text-subtitle-1 text-grey">
          Analyze invoice revenue, track trends, and uncover business insights from EzyVet billing data
        </p>
        <div v-if="stats.earliestDate && stats.latestDate" class="text-caption text-grey mt-1">
          <v-icon size="14" class="mr-1">mdi-database</v-icon>
          Data range: {{ formatDate(stats.earliestDate) }} — {{ formatDate(stats.latestDate) }}
          &nbsp;|&nbsp; {{ stats.totalUploads }} uploads &nbsp;|&nbsp; {{ formatNumber(stats.totalLines) }} invoice lines
        </div>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-history"
          @click="showHistory = true"
        >
          Analysis History
        </v-btn>
        <v-btn
          color="orange-darken-1"
          variant="outlined"
          prepend-icon="mdi-upload-multiple"
          @click="showUploadHistory = true"
        >
          Upload Log
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-upload"
          @click="showUploadDialog = true"
        >
          Upload Invoice Data
        </v-btn>
      </div>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar color="green-darken-1" size="48" class="mr-3">
              <v-icon color="white">mdi-currency-usd</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">${{ formatCurrency(stats.totalRevenue) }}</div>
              <div class="text-caption text-grey">Total Revenue (filtered)</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar color="blue-darken-1" size="48" class="mr-3">
              <v-icon color="white">mdi-receipt-text</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ formatNumber(stats.uniqueInvoices) }}</div>
              <div class="text-caption text-grey">Unique Invoices</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar color="purple-darken-1" size="48" class="mr-3">
              <v-icon color="white">mdi-account-group</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ formatNumber(stats.uniqueClients) }}</div>
              <div class="text-caption text-grey">Unique Clients</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar color="teal-darken-1" size="48" class="mr-3">
              <v-icon color="white">mdi-doctor</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ formatNumber(stats.uniqueStaff) }}</div>
              <div class="text-caption text-grey">Staff Members</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Secondary Stats Row -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar color="indigo-darken-1" size="48" class="mr-3">
              <v-icon color="white">mdi-file-document-multiple</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ avgLinesPerInvoice }}</div>
              <div class="text-caption text-grey">Avg Lines / Invoice</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar color="orange-darken-1" size="48" class="mr-3">
              <v-icon color="white">mdi-hospital-building</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ formatNumber(stats.uniqueDepartments) }}</div>
              <div class="text-caption text-grey">Locations</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-6" elevation="2">
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.location"
              :items="locationOptions"
              label="Location"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              prepend-inner-icon="mdi-hospital-building"
              @update:model-value="loadData"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="filters.startDate"
              type="date"
              label="From Date"
              variant="outlined"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-calendar-start"
              @update:model-value="loadData"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="filters.endDate"
              type="date"
              label="To Date"
              variant="outlined"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-calendar-end"
              @update:model-value="loadData"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="filters.department"
              :items="departmentOptions"
              label="Product Group"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              prepend-inner-icon="mdi-package-variant"
            />
          </v-col>
          <v-col cols="12" md="3" class="d-flex gap-2 align-center">
            <v-btn
              color="deep-purple"
              prepend-icon="mdi-brain"
              :loading="analyzing"
              :disabled="stats.totalLines === 0"
              @click="runAnalysis"
            >
              AI Analysis
            </v-btn>
            <v-btn
              color="primary"
              variant="outlined"
              prepend-icon="mdi-refresh"
              :loading="loading"
              @click="loadData"
            >
              Refresh
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              @click="resetFilters"
              :disabled="!hasActiveFilters"
            >
              Reset
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              color="primary"
              prepend-icon="mdi-download"
              @click="exportCSV"
              :disabled="stats.totalLines === 0"
            >
              Export
            </v-btn>
          </v-col>
        </v-row>

        <!-- Quick date presets -->
        <div class="d-flex gap-2 mt-3">
          <v-chip
            v-for="preset in datePresets"
            :key="preset.label"
            size="small"
            :color="isActivePreset(preset) ? 'primary' : 'default'"
            :variant="isActivePreset(preset) ? 'elevated' : 'outlined'"
            @click="applyPreset(preset)"
          >
            {{ preset.label }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-body-2 text-grey mt-4">Loading invoice data...</p>
    </div>

    <!-- No Data State -->
    <v-card v-else-if="stats.totalLines === 0" class="mb-6 pa-8 text-center" elevation="2">
      <v-icon size="72" color="grey-lighten-1" class="mb-4">mdi-receipt-text-outline</v-icon>
      <h3 class="text-h6 mb-2">No Invoice Data Yet</h3>
      <p class="text-body-2 text-grey mb-4">
        Upload an Invoice Lines report from EzyVet to get started. Each upload adds new data — duplicates are automatically skipped.
      </p>
      <v-btn color="primary" prepend-icon="mdi-upload" @click="showUploadDialog = true">
        Upload Invoice Lines
      </v-btn>
    </v-card>

    <!-- Main Content -->
    <template v-else>
      <!-- Charts Row 1: Revenue Trend + Department Breakdown -->
      <v-row class="mb-6">
        <v-col cols="12" md="7">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon start size="20">mdi-chart-line</v-icon>
              Revenue Trend ({{ periodLabel }})
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="area"
                  height="320"
                  :options="monthlyRevenueOptions"
                  :series="monthlyRevenueSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="5">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon start size="20">mdi-chart-donut</v-icon>
              Revenue by Department
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="donut"
                  height="320"
                  :options="departmentDonutOptions"
                  :series="departmentDonutSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Charts Row 2: Product Groups -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon start size="20">mdi-package-variant</v-icon>
              Top Product Groups by Revenue
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="bar"
                  height="320"
                  :options="productGroupOptions"
                  :series="productGroupSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Staff Performance Section -->
      <h2 class="text-h5 font-weight-bold mb-4">
        <v-icon start color="deep-purple">mdi-account-group</v-icon>
        Staff Performance
      </h2>
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon start size="20">mdi-account-cash</v-icon>
              Staff Member Revenue (Top 15)
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="bar"
                  height="400"
                  :options="staffRevenueOptions"
                  :series="staffRevenueSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon start size="20">mdi-account-tie</v-icon>
              Case Owner Revenue (Top 15)
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="bar"
                  height="400"
                  :options="caseOwnerRevenueOptions"
                  :series="caseOwnerRevenueSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Charts Row 3: Clients per Month + Invoice Volume -->
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon start size="20">mdi-account-multiple-plus</v-icon>
              Client Count ({{ periodLabel }})
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="bar"
                  height="280"
                  :options="monthlyClientOptions"
                  :series="monthlyClientSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon start size="20">mdi-file-document-multiple</v-icon>
              Invoice Volume ({{ periodLabel }})
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="line"
                  height="280"
                  :options="monthlyVolumeOptions"
                  :series="monthlyVolumeSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Invoice Revenue Trend -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon start size="20">mdi-chart-timeline-variant</v-icon>
              Avg Revenue per Invoice ({{ periodLabel }})
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="line"
                  height="320"
                  :options="invoiceRevenueTrendOptions"
                  :series="invoiceRevenueTrendSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- AI Analysis Results -->
      <template v-if="analysisResult">
        <h2 class="text-h5 font-weight-bold mb-4">
          <v-icon start color="deep-purple">mdi-brain</v-icon>
          AI Analysis Results
        </h2>

        <!-- Revenue Summary Card -->
        <v-card class="mb-4" elevation="2" v-if="analysisResult.revenueSummary">
          <v-card-title class="text-subtitle-1">
            <v-icon start size="20">mdi-cash-register</v-icon>
            Revenue Summary
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="4" md="2">
                <div class="text-caption text-grey">Total Revenue</div>
                <div class="text-h6 font-weight-bold">${{ formatCurrency(analysisResult.revenueSummary.totalRevenue) }}</div>
              </v-col>
              <v-col cols="12" sm="4" md="2">
                <div class="text-caption text-grey">Avg/Line</div>
                <div class="text-h6">${{ formatCurrency(analysisResult.revenueSummary.avgRevenuePerLine) }}</div>
              </v-col>
              <v-col cols="12" sm="4" md="2">
                <div class="text-caption text-grey">Avg/Invoice</div>
                <div class="text-h6">${{ formatCurrency(analysisResult.revenueSummary.avgRevenuePerInvoice) }}</div>
              </v-col>
              <v-col cols="12" sm="4" md="2">
                <div class="text-caption text-grey">Top Department</div>
                <div class="text-body-1 font-weight-bold">{{ analysisResult.revenueSummary.topDepartment }}</div>
              </v-col>
              <v-col cols="12" sm="4" md="2">
                <div class="text-caption text-grey">Top Product Group</div>
                <div class="text-body-1 font-weight-bold">{{ analysisResult.revenueSummary.topProductGroup }}</div>
              </v-col>
              <v-col cols="12" sm="4" md="2">
                <div class="text-caption text-grey">Growth</div>
                <v-chip
                  size="small"
                  :color="analysisResult.revenueSummary.growthIndicator === 'growing' ? 'success' : analysisResult.revenueSummary.growthIndicator === 'declining' ? 'error' : 'grey'"
                >
                  {{ analysisResult.revenueSummary.growthIndicator === 'growing' ? '↑ Growing' : analysisResult.revenueSummary.growthIndicator === 'declining' ? '↓ Declining' : '→ Stable' }}
                </v-chip>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Insights -->
        <v-row class="mb-4" v-if="analysisResult.insights?.length">
          <v-col cols="12" md="6">
            <v-card elevation="2" class="fill-height">
              <v-card-title class="text-subtitle-1">
                <v-icon start size="20" color="info">mdi-lightbulb</v-icon>
                Key Insights
                <v-spacer />
                <v-chip size="x-small" color="info" variant="tonal">{{ analysisResult.insights.length }}</v-chip>
              </v-card-title>
              <v-card-text style="max-height: 300px; overflow-y: auto;">
                <v-alert
                  v-for="(insight, i) in analysisResult.insights"
                  :key="i"
                  :type="insight.severity === 'warning' ? 'warning' : insight.severity === 'success' ? 'success' : 'info'"
                  variant="tonal"
                  class="mb-2"
                  density="compact"
                >
                  <div class="d-flex align-center gap-2">
                    <v-chip size="x-small" :color="insightTypeColor(insight.type)">{{ insight.type }}</v-chip>
                    {{ insight.message }}
                  </div>
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Recommendations -->
          <v-col cols="12" md="6" v-if="analysisResult.recommendations?.length">
            <v-card elevation="2" class="fill-height">
              <v-card-title class="text-subtitle-1">
                <v-icon start size="20" color="orange">mdi-star</v-icon>
                Recommendations
                <v-spacer />
                <v-chip size="x-small" color="orange" variant="tonal">{{ analysisResult.recommendations.length }}</v-chip>
              </v-card-title>
              <v-card-text style="max-height: 300px; overflow-y: auto;">
                <v-card
                  v-for="(rec, i) in analysisResult.recommendations"
                  :key="i"
                  variant="outlined"
                  class="mb-2 pa-3"
                >
                  <div class="d-flex align-center gap-2 mb-1">
                    <v-chip size="x-small" :color="rec.impact === 'high' ? 'error' : rec.impact === 'medium' ? 'warning' : 'grey'">
                      {{ rec.impact }}
                    </v-chip>
                    <v-chip size="x-small" :color="recCategoryColor(rec.category)" variant="tonal">
                      {{ rec.category }}
                    </v-chip>
                    <span class="text-subtitle-2 font-weight-bold">{{ rec.title }}</span>
                  </div>
                  <div class="text-caption">{{ rec.description }}</div>
                </v-card>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Top Products Table -->
        <v-card class="mb-6" elevation="2" v-if="analysisResult.topProducts?.length">
          <v-card-title class="text-subtitle-1">
            <v-icon start size="20">mdi-trophy</v-icon>
            Top Revenue Products
          </v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th class="text-right">Revenue</th>
                  <th class="text-right">Line Count</th>
                  <th class="text-right">% of Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(product, i) in analysisResult.topProducts.slice(0, 20)" :key="i">
                  <td>{{ i + 1 }}</td>
                  <td class="font-weight-medium">{{ product.name }}</td>
                  <td class="text-right">${{ formatCurrency(product.revenue) }}</td>
                  <td class="text-right">{{ product.count?.toLocaleString() }}</td>
                  <td class="text-right">{{ (product.percentOfTotal || 0).toFixed(1) }}%</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>

        <!-- Staff Performance Table -->
        <v-card class="mb-6" elevation="2" v-if="analysisResult.staffPerformance?.length">
          <v-card-title class="text-subtitle-1">
            <v-icon start size="20">mdi-account-group</v-icon>
            Staff Performance
          </v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th class="text-right">Revenue</th>
                  <th class="text-right">Invoice Lines</th>
                  <th class="text-right">Unique Clients</th>
                  <th class="text-right">Avg/Client</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(staff, i) in analysisResult.staffPerformance" :key="i">
                  <td class="font-weight-medium">{{ staff.name }}</td>
                  <td class="text-right">${{ formatCurrency(staff.revenue) }}</td>
                  <td class="text-right">{{ staff.lineCount?.toLocaleString() }}</td>
                  <td class="text-right">{{ staff.uniqueClients?.toLocaleString() }}</td>
                  <td class="text-right">${{ formatCurrency(staff.avgPerClient) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </template>
    </template>

    <!-- ============================== DIALOGS ============================== -->

    <!-- Upload Dialog -->
    <v-dialog v-model="showUploadDialog" max-width="700" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-upload</v-icon>
          Upload Invoice Lines
          <v-spacer />
          <v-btn icon variant="text" @click="showUploadDialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <strong>Add-To Upload:</strong> New invoice lines will be added to the existing dataset.
            Duplicate records (same Invoice # + Line Reference) are automatically skipped.
            Data older than 24 months is purged on each upload.
          </v-alert>

          <v-file-input
            v-model="uploadForm.file"
            label="Select Invoice Lines File"
            accept=".csv,.xls,.xlsx,.tsv"
            variant="outlined"
            density="compact"
            prepend-icon="mdi-file-delimited"
            :rules="[v => !!v || 'File is required']"
            @update:model-value="previewFile"
          />

          <!-- Preview -->
          <template v-if="csvPreview.rows.length">
            <div class="text-caption text-grey mb-1">
              Preview: {{ csvPreview.totalRows.toLocaleString() }} rows, {{ csvPreview.columns.length }} columns detected
            </div>
            <div style="max-height: 200px; overflow: auto;" class="mb-4">
              <v-table density="compact">
                <thead>
                  <tr>
                    <th v-for="col in csvPreview.columns.slice(0, 8)" :key="col" class="text-caption">{{ col }}</th>
                    <th v-if="csvPreview.columns.length > 8" class="text-caption">...</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in csvPreview.rows.slice(0, 5)" :key="i">
                    <td v-for="col in csvPreview.columns.slice(0, 8)" :key="col" class="text-caption" style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      {{ row[col] || '' }}
                    </td>
                    <td v-if="csvPreview.columns.length > 8" class="text-caption">...</td>
                  </tr>
                </tbody>
              </v-table>
            </div>

            <v-alert v-if="csvPreview.hasInvoiceCol && csvPreview.hasLineRefCol" type="success" variant="tonal" density="compact" class="mb-4">
              <v-icon start size="16">mdi-check-circle</v-icon>
              File format validated — Invoice and Line Reference columns detected for deduplication.
            </v-alert>
            <v-alert v-else type="warning" variant="tonal" density="compact" class="mb-4">
              <v-icon start size="16">mdi-alert</v-icon>
              Could not detect Invoice # or Line Reference columns. Deduplication may not work correctly.
            </v-alert>
          </template>

          <v-checkbox
            v-model="uploadForm.autoAnalyze"
            label="Run AI analysis after upload"
            density="compact"
            hide-details
            color="deep-purple"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showUploadDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="uploading"
            :disabled="!uploadForm.file"
            @click="uploadInvoiceData"
          >
            {{ uploadProgress || 'Upload & Process' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Analysis History Dialog -->
    <v-dialog v-model="showHistory" max-width="900">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-history</v-icon>
          Analysis History
          <v-spacer />
          <v-btn icon variant="text" @click="showHistory = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-data-table
            :headers="historyHeaders"
            :items="analysisHistory"
            density="compact"
            :items-per-page="10"
          >
            <template #item.status="{ item }">
              <v-chip
                size="x-small"
                :color="item.status === 'completed' ? 'success' : item.status === 'failed' ? 'error' : 'warning'"
              >{{ item.status }}</v-chip>
            </template>
            <template #item.total_revenue_analyzed="{ item }">
              ${{ formatCurrency(item.total_revenue_analyzed) }}
            </template>
            <template #item.created_at="{ item }">{{ formatDateTime(item.created_at) }}</template>
            <template #item.actions="{ item }">
              <v-btn
                v-if="item.status === 'completed'"
                size="small"
                variant="text"
                color="primary"
                @click="loadHistoricalAnalysis(item)"
              >View</v-btn>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Upload History Dialog -->
    <v-dialog v-model="showUploadHistory" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-upload-multiple</v-icon>
          Upload History
          <v-spacer />
          <v-btn icon variant="text" @click="showUploadHistory = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-data-table
            :headers="uploadHistoryHeaders"
            :items="uploadHistory"
            density="compact"
            :items-per-page="10"
          >
            <template #item.created_at="{ item }">{{ formatDateTime(item.created_at) }}</template>
            <template #item.inserted="{ item }">
              <v-chip size="x-small" color="success" variant="tonal">+{{ item.inserted }}</v-chip>
            </template>
            <template #item.duplicates_skipped="{ item }">
              <v-chip v-if="item.duplicates_skipped > 0" size="x-small" color="grey" variant="tonal">{{ item.duplicates_skipped }} skipped</v-chip>
              <span v-else class="text-caption text-grey">0</span>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="5000" location="top">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const supabase = useSupabaseClient()

// ── State ────────────────────────────────────────────────────────────────

const loading = ref(false)
const analyzing = ref(false)
const uploading = ref(false)
const uploadProgress = ref('')
const showUploadDialog = ref(false)
const showHistory = ref(false)
const showUploadHistory = ref(false)
const tableSearch = ref('')

const filters = reactive({
  location: null as string | null,
  startDate: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  department: null as string | null,
})

const uploadForm = reactive({
  file: null as File | null,
  autoAnalyze: false,
})

const csvPreview = reactive({
  columns: [] as string[],
  rows: [] as Record<string, string>[],
  totalRows: 0,
  hasInvoiceCol: false,
  hasLineRefCol: false,
})

const stats = reactive({
  totalLines: 0,
  totalRevenue: 0,
  uniqueInvoices: 0,
  uniqueClients: 0,
  uniqueStaff: 0,
  uniqueDepartments: 0,
  analysisRuns: 0,
  totalUploads: 0,
  earliestDate: null as string | null,
  latestDate: null as string | null,
})

const invoices = ref<any[]>([])
const analysisResult = ref<any>(null)
const analysisHistory = ref<any[]>([])
const uploadHistory = ref<any[]>([])
const locationOptions = ref<string[]>([])
const departmentOptions = ref<string[]>([])

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success',
})

// ── Date Presets ─────────────────────────────────────────────────────────

const datePresets = [
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'Last 6 Months', days: 180 },
  { label: 'Last 12 Months', days: 365 },
  { label: 'YTD', days: -1 }, // special
  { label: 'All Time', days: -2 }, // special
]

function isActivePreset(preset: { days: number }): boolean {
  if (preset.days === -2) return !filters.startDate || filters.startDate === '2020-01-01'
  if (preset.days === -1) {
    const ytdStart = new Date().getFullYear() + '-01-01'
    return filters.startDate === ytdStart
  }
  const expectedStart = new Date(Date.now() - preset.days * 86400000).toISOString().split('T')[0]
  return filters.startDate === expectedStart
}

function applyPreset(preset: { days: number }) {
  filters.endDate = new Date().toISOString().split('T')[0]
  if (preset.days === -2) {
    filters.startDate = '2020-01-01'
  } else if (preset.days === -1) {
    filters.startDate = new Date().getFullYear() + '-01-01'
  } else {
    filters.startDate = new Date(Date.now() - preset.days * 86400000).toISOString().split('T')[0]
  }
  loadData()
}

const hasActiveFilters = computed(() => {
  return !!filters.location || !!filters.department
})

function resetFilters() {
  filters.location = null
  filters.department = null
  filters.startDate = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
  filters.endDate = new Date().toISOString().split('T')[0]
  loadData()
}

// ── Date Watch (ensure charts refresh on date change) ────────────────────

watch(
  () => [filters.startDate, filters.endDate],
  () => { loadData() },
)

// ── Computed Stats ───────────────────────────────────────────────────────

const periodLabel = computed(() => {
  if (filters.startDate && filters.endDate) {
    return `${formatDate(filters.startDate)} – ${formatDate(filters.endDate)}`
  }
  return 'All Time'
})

const avgLinesPerInvoice = computed(() => {
  if (stats.uniqueInvoices === 0) return '0'
  return (stats.totalLines / stats.uniqueInvoices).toFixed(1)
})

// ── Table Headers ────────────────────────────────────────────────────────

const tableHeaders = [
  { title: 'Date', key: 'invoice_date', sortable: true },
  { title: 'Invoice #', key: 'invoice_number', sortable: true },
  { title: 'Product', key: 'product_name', sortable: true },
  { title: 'Department', key: 'department', sortable: true },
  { title: 'Product Group', key: 'product_group', sortable: true },
  { title: 'Staff', key: 'staff_member', sortable: true },
  { title: 'Std Price', key: 'standard_price', sortable: true },
  { title: 'Total Earned', key: 'total_earned', sortable: true },
  { title: 'Client', key: 'client_first_name', sortable: true },
  { title: 'Pet', key: 'pet_name', sortable: true },
]

const historyHeaders = [
  { title: 'Date', key: 'created_at', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Lines', key: 'total_lines_analyzed', sortable: true },
  { title: 'Revenue', key: 'total_revenue_analyzed', sortable: true },
  { title: 'Period', key: 'date_range_days' },
  { title: 'Model', key: 'ai_model' },
  { title: '', key: 'actions', sortable: false },
]

const uploadHistoryHeaders = [
  { title: 'Date', key: 'created_at', sortable: true },
  { title: 'File', key: 'file_name' },
  { title: 'Total Rows', key: 'total_rows', sortable: true },
  { title: 'Inserted', key: 'inserted', sortable: true },
  { title: 'Duplicates', key: 'duplicates_skipped', sortable: true },
  { title: 'Errors', key: 'errors' },
]

// ── Chart Computed ───────────────────────────────────────────────────────

const filteredInvoices = computed(() => {
  let list = invoices.value
  if (filters.department) {
    list = list.filter(inv => inv.product_group === filters.department)
  }
  return list
})

// Monthly revenue
const monthlyData = computed(() => {
  const monthMap: Record<string, { revenue: number; count: number; clients: Set<string>; invoices: Set<string> }> = {}
  for (const inv of filteredInvoices.value) {
    if (!inv.invoice_date) continue
    const monthKey = inv.invoice_date.substring(0, 7)
    if (!monthMap[monthKey]) monthMap[monthKey] = { revenue: 0, count: 0, clients: new Set(), invoices: new Set() }
    monthMap[monthKey].revenue += parseFloat(inv.total_earned) || 0
    monthMap[monthKey].count++
    if (inv.client_code) monthMap[monthKey].clients.add(inv.client_code)
    if (inv.invoice_number) monthMap[monthKey].invoices.add(inv.invoice_number)
  }
  return Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0]))
})

const monthlyRevenueSeries = computed(() => [{
  name: 'Revenue',
  data: monthlyData.value.map(([, d]) => Math.round(d.revenue * 100) / 100),
}])

const monthlyRevenueOptions = computed(() => ({
  chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#10B981'],
  fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } },
  stroke: { curve: 'smooth', width: 2 },
  xaxis: {
    categories: monthlyData.value.map(([m]) => m),
    labels: { rotate: -45, style: { fontSize: '10px' } },
  },
  yaxis: { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
  dataLabels: { enabled: false },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2 }) } },
}))

// Invoice Revenue Trend (avg revenue per invoice by month)
const invoiceRevenueTrendSeries = computed(() => [{
  name: 'Avg Revenue per Invoice',
  data: monthlyData.value.map(([, d]) => {
    const invoiceCount = d.invoices.size
    return invoiceCount > 0 ? Math.round((d.revenue / invoiceCount) * 100) / 100 : 0
  }),
}])

const invoiceRevenueTrendOptions = computed(() => ({
  chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#F97316'],
  stroke: { curve: 'smooth', width: 3 },
  markers: { size: 4 },
  xaxis: {
    categories: monthlyData.value.map(([m]) => m),
    labels: { rotate: -45, style: { fontSize: '10px' } },
  },
  yaxis: { title: { text: 'Avg Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(1) + 'k' } },
  dataLabels: { enabled: false },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2 }) } },
}))

// Department donut
const deptData = computed(() => {
  const map: Record<string, number> = {}
  for (const inv of filteredInvoices.value) {
    const dept = inv.department || 'Unknown'
    map[dept] = (map[dept] || 0) + (parseFloat(inv.total_earned) || 0)
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
})

const departmentDonutSeries = computed(() => deptData.value.map(([, v]) => Math.round(v * 100) / 100))
const departmentDonutOptions = computed(() => ({
  chart: { type: 'donut', fontFamily: 'inherit' },
  labels: deptData.value.map(([k]) => k),
  colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1'],
  legend: { position: 'bottom', fontSize: '11px' },
  dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString() } },
}))

// Product groups bar
const pgData = computed(() => {
  const map: Record<string, number> = {}
  for (const inv of filteredInvoices.value) {
    const pg = inv.product_group || 'Unknown'
    map[pg] = (map[pg] || 0) + (parseFloat(inv.total_earned) || 0)
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12)
})

const productGroupSeries = computed(() => [{ name: 'Revenue', data: pgData.value.map(([, v]) => Math.round(v * 100) / 100) }])
const productGroupOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#3B82F6'],
  xaxis: {
    categories: pgData.value.map(([k]) => k),
    labels: { rotate: -45, style: { fontSize: '10px' }, trim: true, maxHeight: 80 },
  },
  yaxis: { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
  plotOptions: { bar: { borderRadius: 4 } },
  dataLabels: { enabled: false },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString() } },
}))

// Staff revenue bar
const staffData = computed(() => {
  const map: Record<string, number> = {}
  for (const inv of filteredInvoices.value) {
    const staff = inv.staff_member
    if (!staff) continue
    map[staff] = (map[staff] || 0) + (parseFloat(inv.total_earned) || 0)
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 15)
})

const staffRevenueSeries = computed(() => [{ name: 'Revenue', data: staffData.value.map(([, v]) => Math.round(v * 100) / 100) }])
const staffRevenueOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#8B5CF6'],
  xaxis: {
    categories: staffData.value.map(([k]) => k),
    title: { text: 'Revenue ($)' },
    labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' },
  },
  yaxis: {
    labels: { style: { fontSize: '11px' }, maxWidth: 180 },
  },
  plotOptions: { bar: { borderRadius: 4, horizontal: true } },
  dataLabels: { enabled: false },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString() } },
}))

// Case Owner revenue bar
const caseOwnerData = computed(() => {
  const map: Record<string, number> = {}
  for (const inv of filteredInvoices.value) {
    const owner = inv.case_owner
    if (!owner) continue
    map[owner] = (map[owner] || 0) + (parseFloat(inv.total_earned) || 0)
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 15)
})

const caseOwnerRevenueSeries = computed(() => [{ name: 'Revenue', data: caseOwnerData.value.map(([, v]) => Math.round(v * 100) / 100) }])
const caseOwnerRevenueOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#EC4899'],
  xaxis: {
    categories: caseOwnerData.value.map(([k]) => k),
    title: { text: 'Revenue ($)' },
    labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' },
  },
  yaxis: {
    labels: { style: { fontSize: '11px' }, maxWidth: 180 },
  },
  plotOptions: { bar: { borderRadius: 4, horizontal: true } },
  dataLabels: { enabled: false },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString() } },
}))

// Monthly clients
const monthlyClientSeries = computed(() => [{
  name: 'Unique Clients',
  data: monthlyData.value.map(([, d]) => d.clients.size),
}])

const monthlyClientOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#F59E0B'],
  xaxis: {
    categories: monthlyData.value.map(([m]) => m),
    labels: { rotate: -45, style: { fontSize: '10px' } },
  },
  yaxis: { title: { text: 'Client Count' } },
  plotOptions: { bar: { borderRadius: 4 } },
  dataLabels: { enabled: true, style: { fontSize: '10px' } },
  tooltip: { theme: 'dark' },
}))

// Monthly invoice volume
const monthlyVolumeSeries = computed(() => [
  { name: 'Invoice Lines', data: monthlyData.value.map(([, d]) => d.count) },
  { name: 'Invoices', data: monthlyData.value.map(([, d]) => d.invoices.size) },
])

const monthlyVolumeOptions = computed(() => ({
  chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#06B6D4', '#EF4444'],
  stroke: { curve: 'smooth', width: [2, 2] },
  xaxis: {
    categories: monthlyData.value.map(([m]) => m),
    labels: { rotate: -45, style: { fontSize: '10px' } },
  },
  yaxis: { title: { text: 'Count' } },
  dataLabels: { enabled: false },
  tooltip: { theme: 'dark' },
  legend: { position: 'top' },
}))

// ── Helpers ──────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  return n?.toLocaleString() ?? '0'
}

function formatCurrency(n: number | string | null): string {
  if (n === null || n === undefined) return '0.00'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '0.00'
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function insightTypeColor(type: string): string {
  switch (type) {
    case 'trend': return 'blue'
    case 'opportunity': return 'amber'
    case 'concern': return 'red'
    case 'achievement': return 'green'
    default: return 'grey'
  }
}

function recCategoryColor(cat: string): string {
  switch (cat) {
    case 'revenue': return 'green'
    case 'efficiency': return 'blue'
    case 'growth': return 'purple'
    case 'cost': return 'orange'
    default: return 'grey'
  }
}

function showNotification(message: string, color = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

// ── Data Loading ─────────────────────────────────────────────────────────

async function loadData() {
  loading.value = true
  try {
    // Load filtered invoice lines
    let query = supabase
      .from('invoice_lines')
      .select('*')
      .order('invoice_date', { ascending: false })

    if (filters.startDate) query = query.gte('invoice_date', filters.startDate)
    if (filters.endDate) query = query.lte('invoice_date', filters.endDate)
    if (filters.location) query = query.eq('department', filters.location)

    const { data, error } = await query.limit(50000)
    if (error) throw error
    invoices.value = data || []

    // Compute stats from loaded data
    stats.totalLines = invoices.value.length
    stats.totalRevenue = invoices.value.reduce((sum, inv) => sum + (parseFloat(inv.total_earned) || 0), 0)
    stats.uniqueInvoices = new Set(invoices.value.map(inv => inv.invoice_number).filter(Boolean)).size
    stats.uniqueClients = new Set(invoices.value.map(inv => inv.client_code).filter(Boolean)).size
    stats.uniqueStaff = new Set(invoices.value.map(inv => inv.staff_member).filter(Boolean)).size
    stats.uniqueDepartments = new Set(invoices.value.map(inv => inv.department).filter(Boolean)).size

    // Populate filter options from data
    locationOptions.value = [...new Set(invoices.value.map(inv => inv.department).filter(Boolean))].sort()
    departmentOptions.value = [...new Set(invoices.value.map(inv => inv.product_group).filter(Boolean))].sort()

    // Date range
    const dates = invoices.value.map(inv => inv.invoice_date).filter(Boolean).sort()
    stats.earliestDate = dates[0] || null
    stats.latestDate = dates[dates.length - 1] || null

    // Analysis run count
    const { count: analysisCount } = await supabase
      .from('invoice_analysis_runs')
      .select('*', { count: 'exact', head: true })
    stats.analysisRuns = analysisCount || 0

    // Upload count
    const { count: uploadCount } = await supabase
      .from('invoice_upload_history')
      .select('*', { count: 'exact', head: true })
    stats.totalUploads = uploadCount || 0

    // Load latest completed analysis
    const { data: latestRun } = await supabase
      .from('invoice_analysis_runs')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestRun) {
      analysisResult.value = {
        revenueSummary: latestRun.revenue_summary,
        trendAnalysis: latestRun.trend_analysis,
        topProducts: latestRun.top_products,
        departmentBreakdown: latestRun.department_breakdown,
        staffPerformance: latestRun.staff_performance,
        insights: latestRun.insights,
        recommendations: latestRun.recommendations,
      }
    }

    // Load analysis history
    const { data: history } = await supabase
      .from('invoice_analysis_runs')
      .select('id, status, created_at, total_lines_analyzed, total_revenue_analyzed, date_range_days, ai_model')
      .order('created_at', { ascending: false })
      .limit(20)
    analysisHistory.value = history || []

    // Load upload history
    const { data: uploads } = await supabase
      .from('invoice_upload_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    uploadHistory.value = uploads || []
  } catch (err: any) {
    console.error('Failed to load invoice data:', err)
    showNotification('Failed to load data: ' + (err.message || 'Unknown error'), 'error')
  } finally {
    loading.value = false
  }
}

// ── CSV Parsing ──────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else if (ch === '\t' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function detectSeparator(text: string): string {
  const firstLine = text.split('\n')[0] || ''
  const tabs = (firstLine.match(/\t/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  return tabs > commas ? '\t' : ','
}

function previewFile(file: File | File[] | null) {
  csvPreview.columns = []
  csvPreview.rows = []
  csvPreview.totalRows = 0
  csvPreview.hasInvoiceCol = false
  csvPreview.hasLineRefCol = false

  const f = Array.isArray(file) ? file[0] : file
  if (!f) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (!text) return

    // Find the actual data header (skip EzyVet report metadata rows)
    const lines = text.split('\n').filter(l => l.trim())
    let headerIdx = 0

    // EzyVet Invoice Lines reports have metadata rows before the actual data
    // Look for a row that contains "Invoice" as a column header
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const cols = parseCSVLine(lines[i])
      if (cols.some(c => /^Invoice$/i.test(c.trim()) || /^Invoice Line Reference$/i.test(c.trim()))) {
        headerIdx = i
        break
      }
    }

    const headers = parseCSVLine(lines[headerIdx])
    csvPreview.columns = headers
    csvPreview.totalRows = lines.length - headerIdx - 1

    csvPreview.hasInvoiceCol = headers.some(h => /^Invoice$/i.test(h.trim()) || /invoice.?number/i.test(h.trim()))
    csvPreview.hasLineRefCol = headers.some(h => /Invoice Line Reference/i.test(h.trim()) || /line.?ref/i.test(h.trim()))

    for (let i = headerIdx + 1; i < Math.min(lines.length, headerIdx + 6); i++) {
      const values = parseCSVLine(lines[i])
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = values[idx] || '' })
      csvPreview.rows.push(row)
    }
  }
  reader.readAsText(f)
}

// ── Upload ───────────────────────────────────────────────────────────────

async function uploadInvoiceData() {
  if (!uploadForm.file) return
  uploading.value = true

  try {
    const text = await uploadForm.file.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) throw new Error('File must have a header row and at least one data row')

    // Find the actual data header (skip EzyVet report metadata rows)
    let headerIdx = 0
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const cols = parseCSVLine(lines[i])
      if (cols.some(c => /^Invoice$/i.test(c.trim()) || /^Invoice Line Reference$/i.test(c.trim()) || /^Invoice Line Date/i.test(c.trim()))) {
        headerIdx = i
        break
      }
    }

    const headers = parseCSVLine(lines[headerIdx])
    const rows: Record<string, any>[] = []
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length < 3) continue // skip empty/malformed rows
      const row: Record<string, any> = {}
      headers.forEach((h, idx) => { row[h.trim()] = values[idx] || '' })
      rows.push(row)
    }

    if (rows.length === 0) throw new Error('No data rows found after header')

    // Chunk large uploads to avoid 413 payload-too-large errors
    const UPLOAD_CHUNK_SIZE = 3000
    let totalInserted = 0
    let totalDuplicatesSkipped = 0
    let totalErrors = 0
    let totalPurged = 0
    const totalChunks = Math.ceil(rows.length / UPLOAD_CHUNK_SIZE)

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const start = chunkIdx * UPLOAD_CHUNK_SIZE
      const chunk = rows.slice(start, start + UPLOAD_CHUNK_SIZE)
      uploadProgress.value = totalChunks > 1
        ? `Uploading chunk ${chunkIdx + 1} of ${totalChunks} (${chunk.length} rows)...`
        : ''

      const result = await $fetch('/api/invoices/upload', {
        method: 'POST',
        body: {
          invoiceLines: chunk,
          fileName: uploadForm.file.name,
        },
      }) as any

      totalInserted += result.inserted || 0
      totalDuplicatesSkipped += result.duplicatesSkipped || 0
      totalErrors += result.errors || 0
      totalPurged += result.purged || 0
    }

    uploadProgress.value = ''
    showNotification(
      `Upload complete: ${totalInserted} new lines added, ${totalDuplicatesSkipped} duplicates skipped.${totalPurged ? ` ${totalPurged} old records purged.` : ''}`,
      'success'
    )

    showUploadDialog.value = false
    uploadForm.file = null
    csvPreview.columns = []
    csvPreview.rows = []

    await loadData()

    if (uploadForm.autoAnalyze && stats.totalLines > 0) {
      await runAnalysis()
    }
  } catch (err: any) {
    console.error('Upload failed:', err)
    showNotification('Upload failed: ' + (err.data?.message || err.message || 'Unknown error'), 'error')
  } finally {
    uploading.value = false
  }
}

// ── AI Analysis ──────────────────────────────────────────────────────────

async function runAnalysis() {
  analyzing.value = true
  try {
    const result = await $fetch('/api/invoices/analyze', {
      method: 'POST',
      body: {
        location: filters.location,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    }) as any

    analysisResult.value = result
    showNotification(`Analysis complete! ${result.totalLines?.toLocaleString()} lines analyzed. $${formatCurrency(result.totalRevenue)} total revenue.`)

    // Refresh history
    const { data: history } = await supabase
      .from('invoice_analysis_runs')
      .select('id, status, created_at, total_lines_analyzed, total_revenue_analyzed, date_range_days, ai_model')
      .order('created_at', { ascending: false })
      .limit(20)
    analysisHistory.value = history || []
    stats.analysisRuns = (history || []).length
  } catch (err: any) {
    console.error('Analysis failed:', err)
    showNotification('Analysis failed: ' + (err.data?.message || err.message || 'Unknown error'), 'error')
  } finally {
    analyzing.value = false
  }
}

function loadHistoricalAnalysis(run: any) {
  supabase
    .from('invoice_analysis_runs')
    .select('*')
    .eq('id', run.id)
    .single()
    .then(({ data }) => {
      if (data) {
        analysisResult.value = {
          revenueSummary: data.revenue_summary,
          trendAnalysis: data.trend_analysis,
          topProducts: data.top_products,
          departmentBreakdown: data.department_breakdown,
          staffPerformance: data.staff_performance,
          insights: data.insights,
          recommendations: data.recommendations,
        }
        showHistory.value = false
        showNotification('Loaded analysis from ' + formatDateTime(data.created_at))
      }
    })
}

// ── Export ────────────────────────────────────────────────────────────────

function exportCSV() {
  const headers = tableHeaders.map(h => h.title)
  const keys = tableHeaders.map(h => h.key)
  const csvRows = [headers.join(',')]

  for (const inv of filteredInvoices.value) {
    const row = keys.map(k => {
      const val = inv[k]
      if (val === null || val === undefined) return ''
      const str = String(val)
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
    })
    csvRows.push(row.join(','))
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invoice-analysis-${filters.startDate}-to-${filters.endDate}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Init ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.invoice-analysis-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
