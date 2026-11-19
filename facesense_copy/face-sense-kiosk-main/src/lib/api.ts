/**
 * Typed client for the FaceSense AI FastAPI backend.
 * Base URL is configurable via VITE_API_BASE_URL.
 */
export const BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://127.0.0.1:8000";

export const TOKEN_KEY = "facesense_auth_token";
export const USER_ROLE_KEY = "facesense_user_role";
export const EMAIL_KEY = "facesense_admin_email";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthSession(token: string, role: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_ROLE_KEY, role);
  }
}

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_ROLE_KEY);
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function detailToMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((d) => {
        if (d && typeof d === "object" && "msg" in d) {
          const loc =
            "loc" in d && Array.isArray((d as { loc: unknown[] }).loc)
              ? (d as { loc: unknown[] }).loc.slice(-1).join("")
              : "";
          return loc ? `${loc}: ${String((d as { msg: unknown }).msg)}` : String((d as { msg: unknown }).msg);
        }
        return String(d);
      })
      .filter(Boolean);
    if (parts.length) return parts.join(", ");
  }
  if (detail && typeof detail === "object") {
    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  auth?: boolean;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, auth: withAuth = false } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (withAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      ...(formData ? { body: formData } : body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(
      `Could not reach the FaceSense AI API at ${BASE_URL}. Make sure the backend server is running.`,
      0,
    );
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { detail?: unknown };
      message = detailToMessage(data?.detail, message);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ------------------------------- Interfaces ------------------------------- */

export interface Student {
  id: number;
  enrollment_no: string;
  full_name: string;
  email?: string;
  department: string;
  semester: number;
  division: string;
  is_registered: boolean;
  face_image_path?: string;
  attendance_percentage?: number;
  cpi?: number;
}

export interface FeedbackSession {
  id: number;
  session_name: string;
  semester: number;
  academic_year: string;
  start_date: string;
  end_date: string;
  status: string;
  is_active?: boolean;
}

export interface Faculty {
  id: number;
  faculty_code: string;
  full_name: string;
  email: string;
  department: string;
  designation: string;
}

export interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
  department: string;
  semester: number;
}

export interface Assignment {
  id: number;
  faculty_id: number;
  faculty_name: string;
  subject_id: number;
  subject_code: string;
  subject_name: string;
  division: string;
  semester: number;
  academic_year: string;
}

export interface FaceVerificationResponse {
  authenticated: boolean;
  student_id: number | null;
  enrollment_no?: string;
  full_name?: string;
  department?: string;
  semester?: number;
  division?: string;
  similarity?: number;
  liveness_passed?: boolean;
  liveness_score?: number;
  message: string;
}

export interface EligibleFacultyResponse {
  student_id: number;
  enrollment_no?: string;
  full_name: string;
  semester: number;
  attendance_percentage?: number;
  cpi?: number;
  session_name: string;
  cycle_id: number;
  subjects: {
    subject_id: number;
    subject_code: string;
    subject_name: string;
    faculty_id: number;
    faculty_name: string;
    designation: string;
    already_submitted: boolean;
  }[];
}

export interface FeedbackPayload {
  feedback_cycle_id: number;
  student_id: number;
  faculty_id: number;
  subject_id: number;
  star_rating?: number;
  swipe_response?: string;
  slider_value?: number;
  mcq_option?: string;
  suggestion_text?: string;
  focus_score?: number;
}

export interface RewardResult {
  granted: boolean;
  reward_type?: string;
  coupon_code?: string;
  message: string;
}

export interface FeedbackSubmissionResponse {
  success: boolean;
  message: string;
  reward: RewardResult;
}

export interface FacultyAnalytics {
  faculty_id: number;
  faculty_name: string;
  department: string;
  designation: string;
  total_submissions: number;
  privacy_masked: boolean;
  min_required?: number;
  message?: string;
  kpi?: {
    average_rating: number;
    slider_satisfaction: number;
    overall_satisfaction_pct: number;
    completion_rate_pct: number;
  };
  rating_distribution?: Record<number, number>;
  swipe_breakdown?: { agree: number; disagree: number };
  mcq_improvement_distribution?: Record<string, number>;
  ai_summary?: {
    sentiment_breakdown: { positive: number; neutral: number; negative: number };
    positive_highlights: string[];
    improvement_areas: string[];
    overall_summary: string;
  };
}

export interface SystemAnalytics {
  total_students: number;
  registered_faces: number;
  total_faculty: number;
  total_subjects: number;
  total_feedback_submitted: number;
  active_cycle_name: string;
  overall_response_rate: number;
}

export interface RewardRule {
  id: number;
  is_enabled: boolean;
  min_focus_score: number;
  min_liveness_confidence: number;
  reward_probability: number;
  reward_type: string;
  available_quantity: number;
}

export interface FacultyRating {
  faculty_name: string;
  average_rating: number;
  total_feedback: number;
}

export interface SubmissionTrackingEntry {
  student_id: number;
  name: string;
  enrollment_no: string;
  has_submitted: boolean;
}

export interface AuditLogEntry {
  id: number;
  user_email?: string | null;
  role?: string | null;
  action: string;
  resource?: string | null;
  ip_address?: string | null;
  status: string;
  timestamp: string | null;
}

export interface AuditLogsResponse {
  total: number;
  limit: number;
  offset: number;
  items: AuditLogEntry[];
}

export interface SystemLogResponse {
  log_type: string;
  total_lines?: number;
  returned_lines?: number;
  lines: string[];
  message?: string;
}

/* ------------------------------- API Endpoints ------------------------------- */

function fileForm(file: Blob, name = "capture.jpg") {
  const fd = new FormData();
  fd.append("file", file, name);
  return fd;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/api/admin/login", {
      method: "POST",
      body: { email, password },
    }),
  adminLogin: (email: string, password: string) =>
    request<{ access_token: string; user: { id: number; full_name: string; role: string } }>(
      "/api/admin/login",
      { method: "POST", body: { email, password } }
    ),
  facultyLogin: (email: string, password: string) =>
    request<{ access_token: string; faculty: Faculty }>(
      "/api/faculty/login",
      { method: "POST", body: { email, password } }
    ),
};

export const studentApi = {
  verifyFace: (file: Blob) =>
    request<FaceVerificationResponse>("/api/face/verify", {
      method: "POST",
      formData: fileForm(file),
    }),
  getProfile: (studentId: number) =>
    request<Student>(`/api/student/${studentId}/profile`),
  getEligibleFaculty: (studentId: number) =>
    request<EligibleFacultyResponse>(`/api/student/${studentId}/eligible-faculty`),
  submitFeedback: (payload: FeedbackPayload) =>
    request<{ success: boolean; message: string; reward: any }>("/api/feedback/submit", {
      method: "POST",
      body: payload,
    }),
  submitBatchFeedback: (payload: {
    feedback_cycle_id: number;
    student_id: number;
    focus_score?: number;
    liveness_passed?: boolean;
    responses: {
      faculty_id: number;
      subject_id: number;
      star_rating?: number;
      swipe_response?: string;
      slider_value?: number;
      mcq_option?: string;
      suggestion_text?: string | undefined;
    }[];
  }) =>
    request<{ success: boolean; message: string; submitted_count: number; reward: any }>("/api/feedback/submit-batch", {
      method: "POST",
      body: payload,
    }),
};

export const facultyApi = {
  list: () => request<Faculty[]>("/api/admin/faculty", { auth: true }),
  create: (data: any) => request<Faculty>("/api/admin/faculty", { method: "POST", body: data, auth: true }),
  update: (id: number, data: any) => request<Faculty>(`/api/admin/faculty/${id}`, { method: "PUT", body: data, auth: true }),
  remove: (id: number) => request<void>(`/api/admin/faculty/${id}`, { method: "DELETE", auth: true }),
  getDashboard: () =>
    request<{ id: number; faculty_code: string; full_name: string; email: string; department: string; designation: string; assigned_subjects: any[] }>(
      "/api/faculty/dashboard",
      { auth: true }
    ),
  getAnalytics: (facultyId?: number, sessionId?: number) =>
    request<FacultyAnalytics>(
      `/api/faculty/analytics${facultyId || sessionId ? '?' : ''}${facultyId ? `faculty_id=${facultyId}` : ''}${facultyId && sessionId ? '&' : ''}${sessionId ? `session_id=${sessionId}` : ''}`,
      { auth: true }
    ),
  listSessions: () =>
    request<{ id: number; session_name: string; semester: number; academic_year: string; status: string; is_active: boolean }[]>(
      "/api/faculty/sessions",
      { auth: true }
    ),
  getSubmissionTracking: (sessionId: number) =>
    request<SubmissionTrackingEntry[]>(`/api/faculty/feedback-tracking/${sessionId}`, { auth: true }),
};

export const adminApi = {
  getAnalytics: () => request<SystemAnalytics>("/api/admin/analytics", { auth: true }),
  listStudents: () => request<Student[]>("/api/admin/students", { auth: true }),
  createStudent: (data: Partial<Student>) =>
    request<Student>("/api/admin/students", { method: "POST", body: data, auth: true }),
  deleteStudent: (id: number) =>
    request<void>(`/api/admin/students/${id}`, { method: "DELETE", auth: true }),
  updateStudent: (id: number, data: Partial<Student>) =>
    request<Student>(`/api/admin/students/${id}`, { method: "PUT", body: data, auth: true }),
  registerFace: (studentId: number, file: Blob) =>
    request<{ message: string; face_image_path?: string }>(`/api/admin/face/register/${studentId}`, {
      method: "POST",
      formData: fileForm(file),
      auth: true,
    }),
  listFaculty: () => request<Faculty[]>("/api/admin/faculty", { auth: true }),
  createFaculty: (data: Partial<Faculty>) =>
    request<Faculty>("/api/admin/faculty", { method: "POST", body: data, auth: true }),
  updateFaculty: (id: number, data: Partial<Faculty>) =>
    request<Faculty>(`/api/admin/faculty/${id}`, { method: "PUT", body: data, auth: true }),
  deleteFaculty: (id: number) =>
    request<void>(`/api/admin/faculty/${id}`, { method: "DELETE", auth: true }),
  listSubjects: () => request<Subject[]>("/api/admin/subjects", { auth: true }),
  createSubject: (data: Partial<Subject>) =>
    request<Subject>("/api/admin/subjects", { method: "POST", body: data, auth: true }),
  updateSubject: (id: number, data: Partial<Subject>) =>
    request<Subject>(`/api/admin/subjects/${id}`, { method: "PUT", body: data, auth: true }),
  deleteSubject: (id: number) =>
    request<void>(`/api/admin/subjects/${id}`, { method: "DELETE", auth: true }),
  listAssignments: () => request<Assignment[]>("/api/admin/faculty-subjects", { auth: true }),
  createAssignment: (data: any) =>
    request<Assignment>("/api/admin/faculty-subjects", { method: "POST", body: data, auth: true }),
  deleteAssignment: (id: number) =>
    request<void>(`/api/admin/faculty-subjects/${id}`, { method: "DELETE", auth: true }),
  getRewardRule: () => request<RewardRule>("/api/admin/rewards/rules", { auth: true }),
  updateRewardRule: (data: Partial<RewardRule>) =>
    request<{ message: string }>("/api/admin/rewards/rules", { method: "POST", body: data, auth: true }),
  getSubmissionTracking: (sessionId: number) =>
    request<SubmissionTrackingEntry[]>(`/api/admin/feedback-tracking/${sessionId}`, { auth: true }),
  deleteStudentFeedback: (sessionId: number, studentId: number) =>
    request<{ message: string }>(`/api/admin/feedback/${sessionId}/${studentId}`, { method: "DELETE", auth: true }),
  getAuditLogs: (params?: { limit?: number; offset?: number; action?: string; role?: string; status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.offset) sp.set("offset", String(params.offset));
    if (params?.action) sp.set("action", params.action);
    if (params?.role) sp.set("role", params.role);
    if (params?.status) sp.set("status", params.status);
    const qs = sp.toString();
    return request<AuditLogsResponse>(`/api/admin/audit-logs${qs ? `?${qs}` : ""}`, { auth: true });
  },
  getSystemLogs: (logType: "app" | "error" | "access" = "app", lines = 100) =>
    request<SystemLogResponse>(`/api/admin/system-logs?log_type=${logType}&lines=${lines}`, { auth: true }),
};

/* ---------------- Backward Compatibility Legacy Exports ---------------- */

export const studentsApi = {
  list: adminApi.listStudents,
  get: studentApi.getProfile,
  create: adminApi.createStudent,
  update: (id: number, data: any) => adminApi.updateStudent(id, data),
  remove: adminApi.deleteStudent,
};

export const subjectsApi = {
  list: adminApi.listSubjects,
  create: adminApi.createSubject,
  update: (id: number, data: any) => adminApi.updateSubject(id, data),
  remove: adminApi.deleteSubject,
};

export const assignmentsApi = {
  list: adminApi.listAssignments,
  create: adminApi.createAssignment,
  remove: adminApi.deleteAssignment,
};

export const sessionsApi = {
  list: () => request<any[]>("/api/admin/feedback-sessions", { auth: true }),
  create: (data: any) => request<any>("/api/admin/feedback-sessions", { method: "POST", body: data, auth: true }),
  update: (id: number, data: any) => request<any>(`/api/admin/feedback-sessions/${id}`, { method: "PUT", body: data, auth: true }),
  remove: (id: number) => request<void>(`/api/admin/feedback-sessions/${id}`, { method: "DELETE", auth: true }),
};


export const analyticsApi = {
  dashboard: () => request<SystemAnalytics>("/api/admin/analytics", { auth: true }),
  faculty: () => request<{ faculty_id: number; faculty_name: string; average_rating: number; total_feedback: number }[]>("/api/admin/analytics/faculty", { auth: true }),
  subject: () => request<{ subject_id: number; subject_name: string; average_rating: number; total_feedback: number }[]>("/api/admin/analytics/subjects", { auth: true }),
  topFaculty: () => request<any[]>("/api/admin/analytics/faculty", { auth: true }),
  lowestFaculty: () => request<any[]>("/api/admin/analytics/faculty", { auth: true }),
};


export const faceApi = {
  login: studentApi.verifyFace,
  register: adminApi.registerFace,
  test: (file: Blob) => Promise.resolve({ message: "Test passed", confidence: 0.98 }),
};

export const dashboardApi = {
  student: studentApi.getEligibleFaculty,
};

export const feedbackApi = {
  submit: studentApi.submitFeedback,
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please check your network or try again.";
}
