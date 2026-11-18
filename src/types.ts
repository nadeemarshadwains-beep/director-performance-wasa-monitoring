export type Role = "admin" | "director";
export type ReportStatus = "draft" | "submitted" | "returned" | "approved";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  director_id: string | null;
}

export interface Director {
  id: string;
  full_name: string;
  email: string;
  auth_user_id: string | null;
  is_active: boolean;
}

export interface Wasa {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
}

export interface Assignment {
  id: string;
  director_id: string;
  wasa_id: string;
  valid_from: string;
  valid_to: string | null;
}

export interface MonthlyReport {
  id: string;
  wasa_id: string;
  director_id: string;
  report_year: number;
  report_month: number;
  status: ReportStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  monthly_demand: number;
  monthly_collection: number;
  outstanding_current_demand: number;
  recovery_percentage: number | null;
  opening_arrears: number;
  additional_arrears: number;
  arrears_recovered: number;
  approved_adjustments: number;
  closing_arrears: number;
  opening_surveys: number;
  new_surveys: number;
  corrected_surveys: number;
  removed_surveys: number;
  closing_surveys: number;
  opening_water_connections: number;
  new_water_connections: number;
  removed_water_connections: number;
  closing_water_connections: number;
  water_connections_net_change: number;
  opening_sewer_connections: number;
  new_sewer_connections: number;
  removed_sewer_connections: number;
  closing_sewer_connections: number;
  sewer_connections_net_change: number;
  created_at: string;
}

export interface FieldVisit {
  id: string;
  director_id: string;
  wasa_id: string;
  visit_date: string;
  location: string;
  purpose: string;
  activities_performed: string;
  issues_identified: string | null;
  instructions_given: string | null;
  progress_achieved: string | null;
  pending_actions: string | null;
  responsible_officer: string | null;
  expected_completion_date: string | null;
  remarks: string | null;
  attachment_path: string | null;
  created_at: string;
}

export interface PerformanceTarget {
  id: string;
  metric: string;
  period_type: "monthly" | "annual";
  period_year: number;
  period_month: number | null;
  director_id: string | null;
  wasa_id: string | null;
  target_value: number;
}
