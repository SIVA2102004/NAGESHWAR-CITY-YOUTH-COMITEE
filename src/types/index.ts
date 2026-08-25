// ============================================================
// Core Types for Ganesh Chanda Pro
// ============================================================

export type UserRole   = 'admin' | 'volunteer' | 'member'
export type UserStatus = 'active' | 'pending' | 'blocked'

export interface AppUser {
  uid:           string
  name:          string
  email:         string
  mobile:        string
  role:          UserRole
  status:        UserStatus
  festivalId:    string
  isSuperAdmin?: boolean
  departmentId?: string
  departmentName?: string
  volunteerId?:  string
  volunteerName?: string
  inviteCodeUsed?: string
  createdAt:     Date
  updatedAt:     Date
  createdBy?:    string
  profileImage?: string
  address?:      string
}

export interface Festival {
  id:            string
  name:          string
  committeeName: string
  festivalYear:  string
  address?:      string
  contactNumber?: string
  email?:        string
  targetAmount:  number
  logo?:         string
  upiId?:        string
  upiPayeeName?: string
  createdAt:     Date
  createdBy:     string
}

export interface CommitteeSummary {
  festival:        Festival
  totalCollection: number
  totalExpenses:   number
  netBalance:      number
  donorCount:      number
  volunteerCount:  number
  adminCount:      number
}

export interface Department {
  id:          string
  name:        string
  description?: string
  status:      'active' | 'inactive'
  festivalId:  string
  createdBy:   string
  createdAt:   Date
  updatedAt:   Date
}

export type InviteCodeType   = 'ADMIN_INVITE' | 'VOLUNTEER_INVITE' | 'MEMBER_INVITE'
export type InviteCodeStatus = 'active' | 'expired' | 'disabled' | 'exhausted'

export interface InviteCode {
  id:             string
  code:           string
  type:           InviteCodeType
  festivalId:     string
  departmentId?:  string
  departmentName?: string
  createdBy:      string
  createdByName:  string
  createdAt:      Date
  expiresAt?:     Date
  maxUses:        number
  usedCount:      number
  status:         InviteCodeStatus
}

export type PaymentMethod = 'Cash' | 'Online' | 'UPI' | 'Cheque'
export type PaymentStatus = 'Paid' | 'Pending' | 'Partial'

export interface Contribution {
  id:              string
  festivalId:      string
  contributorName: string
  mobile:          string
  houseNumber?:    string
  amount:          number
  paymentMethod:   PaymentMethod
  paymentStatus:   PaymentStatus
  collectedBy:     string
  collectedByUid:  string
  departmentId:    string
  departmentName:  string
  notes?:          string
  receiptNumber:   string
  createdAt:       Date
  updatedAt:       Date
  createdBy:       string
}

export type ExpenseCategory =
  | 'Pandal' | 'Decoration' | 'Prasad' | 'Idol'
  | 'Lighting' | 'Sound' | 'Cultural Program'
  | 'Cleaning' | 'Security' | 'Transportation' | 'Other'

export interface Expense {
  id:            string
  festivalId:    string
  title:         string
  category:      ExpenseCategory
  amount:        number
  description?:  string
  paymentMethod: PaymentMethod
  date:          Date
  addedBy:       string
  addedByUid:    string
  billUrl?:      string
  billName?:     string
  createdAt:     Date
  updatedAt:     Date
}

export interface ActivityLog {
  id:          string
  festivalId:  string
  userId:      string
  userName:    string
  role:        UserRole
  action:      string
  entityType:  string
  entityId?:   string
  description: string
  timestamp:   Date
}

export interface Notification {
  id:           string
  festivalId:   string
  targetRole?:  UserRole
  targetUserId?: string
  title:        string
  message:      string
  read:         boolean
  createdAt:    Date
}

export interface Announcement {
  id:          string
  festivalId:  string
  title:       string
  content:     string
  status:      'published' | 'draft'
  createdBy:   string
  createdByName: string
  createdAt:   Date
  updatedAt:   Date
}

// ============================================================
// Dashboard stat types
// ============================================================
export interface DashboardStats {
  totalCollection: number
  totalExpenses:   number
  balance:         number
  contributors:    number
  volunteers:      number
  members:         number
  departments:     number
  paidCount:       number
  pendingCount:    number
  partialCount:    number
  targetAmount:    number
}

export interface ChartDataPoint {
  name:  string
  value: number
  color?: string
}
