# Face Sense Kiosk

PROMPT START

Build a full frontend web application called FaceSense AI — a face-recognition-based student feedback and attendance/analytics system for a college. It connects to an existing FastAPI backend (already built, do not generate backend code — only call the REST API described below).

Tech stack (required)

React.js + TypeScript

Tailwind CSS

React Router for navigation

Axios (or fetch) for API calls, wrapped in a single src/lib/api.ts client with a configurable BASE_URL (use import.meta.env.VITE_API_BASE_URL, default to http://127.0.0.1:8000)

react-hook-form + zod for form validation

A toast/notification system for success & error states (e.g. sonner or shadcn toast)

shadcn/ui components for buttons, inputs, dialogs, tables, cards, tabs

recharts for analytics charts

Webcam access via navigator.mediaDevices.getUserMedia (no external face SDK needed — the backend does all AI processing; the frontend just captures a photo/blob and uploads it)

Overall product

FaceSense AI has two experiences:

Admin Panel (protected, JWT-based) — full CRUD management for students, faculty, subjects, faculty-subject assignments, and feedback sessions, plus an analytics dashboard.

Student Portal (public-facing kiosk-style flow) — a student logs in using their face (webcam capture, no password), lands on a personal dashboard showing their subjects/faculty for the active session, and submits feedback per subject/faculty with star ratings.

Design direction

Clean, modern, professional "EdTech / campus admin" aesthetic. Deep indigo/blue primary color with a soft neutral background, generous white space, rounded-xl cards with subtle shadows, clear typography hierarchy. Fully responsive (mobile-first for the student face-login/feedback flow since it may run on a tablet kiosk; desktop-optimized layout for the admin panel with a persistent left sidebar). Use skeleton loaders for async data and empty-state illustrations/messages where lists are empty. Use accessible focus states and proper form validation error messages.

APP STRUCTURE / ROUTES

Public / Student-facing

/ — Landing / Face Login screen: webcam view, "Scan Face to Login" button, captures a photo and POSTs to /login/face. On success, redirect to /student/:studentId/dashboard. On failure, show a clear error (face not recognized / no match / please register first) and allow retry.

/student/:studentId/dashboard — Student dashboard (see API GET /dashboard/student/{student_id}): show student's full name, semester, active session name, and a list of subject+faculty cards. Each card has a "Give Feedback" button that opens the feedback form (route or modal) for that subject/faculty pair within the active feedback session.

/student/:studentId/feedback/:subjectId/:facultyId — Feedback form: 5 star-rating inputs (Teaching, Communication, Punctuality, Behaviour, Knowledge — each 1–5 stars), an optional comments textarea, Submit button → POST /feedback/submit. Show a success screen/confetti-lite state after submission and a button to return to dashboard.

/register-face/:studentId — Face registration screen (used by admin/staff to enroll a student's face, or as a self-service step after a student is created): webcam capture or file upload, preview the captured image, "Register Face" button → POST /face/register/{student_id} (multipart/form-data, field name file). Show the returned confidence/enrollment info on success.

Admin (protected — require a valid JWT stored in localStorage; redirect to /admin/login if missing/expired)

/admin/login — Admin login form (email + password) → POST /admin/login, store access_token from response, redirect to /admin/dashboard.

/admin/dashboard — Analytics overview using GET /analytics/dashboard, GET /analytics/top-faculty, GET /analytics/lowest-faculty. Show summary stat cards (total students, feedback submitted, pending feedback, completion %) plus a bar/leaderboard chart of top & lowest rated faculty.

/admin/students — Table of all students (GET /students/) with search/filter by name or enrollment no, columns: enrollment no, full name, department, semester, registered (badge). Add/Edit via dialog form (POST /students/, PUT /students/{id}), Delete with confirm dialog (DELETE /students/{id}). Row action to jump to /register-face/:studentId.

/admin/faculty — Table of faculty (GET /faculty/), columns: full name, department, designation. Add/Edit dialog (POST /faculty/, PUT /faculty/{id}), Delete (DELETE /faculty/{id}).

/admin/subjects — Table of subjects (GET /subjects/), columns: subject code, subject name, semester. Add/Edit dialog (POST /subjects/, PUT /subjects/{id}), Delete (DELETE /subjects/{id}).

/admin/assignments — Faculty-Subject assignment table (GET /faculty-subjects/) showing faculty, subject, semester, division, academic year. Add dialog with selects populated from the faculty and subjects lists (POST /faculty-subjects/), Delete (DELETE /faculty-subjects/{assignment_id}).

/admin/sessions — Feedback session management table (GET /feedback-sessions/), columns: session name, semester, academic year, start date, end date, status (badge: draft/active/closed — render whatever string the API returns). Add/Edit dialog (POST /feedback-sessions/, PUT /feedback-sessions/{id}), Delete (DELETE /feedback-sessions/{id}).

/admin/analytics — Deeper analytics view combining GET /analytics/faculty (list, chart: avg rating per faculty) and GET /analytics/subject (list, chart: avg rating per subject).

Admin layout: persistent left sidebar with nav links (Dashboard, Students, Faculty, Subjects, Assignments, Sessions, Analytics, Logout), top bar showing logged-in admin email.

BACKEND API REFERENCE (exact — implement calls to match this precisely)

Base URL: configurable, default http://127.0.0.1:8000. No auth header is currently required on any endpoint except that the frontend should still attach Authorization: Bearer <token> on all /admin/*-protected pages' requests once logged in (send it on every admin-panel API call for forward compatibility, using the token from /admin/login).

Admin Auth

POST /admin/login

Body: { "email": string, "password": string }

Response: { "access_token": string, "token_type": "bearer" }

401 on invalid credentials — show inline error.

Students

POST /students/ — Body: { enrollment_no: string, full_name: string, department: string, semester: number } → Response adds id: number, is_registered: boolean

GET /students/ — Response: array of { id, enrollment_no, full_name, department, semester, is_registered }

GET /students/{student_id} — single student object as above

PUT /students/{student_id} — same body as create → returns updated student

DELETE /students/{student_id}

Faculty

POST /faculty/ — Body: { full_name: string, department: string, designation: string } → adds id: number

GET /faculty/ — array of faculty

GET /faculty/{faculty_id}

PUT /faculty/{faculty_id} — same body as create

DELETE /faculty/{faculty_id}

Subjects

POST /subjects/ — Body: { subject_code: string, subject_name: string, semester: number } → adds id: number

GET /subjects/ — array

GET /subjects/{subject_id}

PUT /subjects/{subject_id}

DELETE /subjects/{subject_id}

Faculty–Subject Assignments

POST /faculty-subjects/ — Body: { faculty_id: number, subject_id: number, semester: number, division: string, academic_year: string } → adds id: number

GET /faculty-subjects/ — array

DELETE /faculty-subjects/{assignment_id}

Feedback Sessions

POST /feedback-sessions/ — Body: { session_name: string, semester: number, academic_year: string, start_date: "YYYY-MM-DD", end_date: "YYYY-MM-DD", status: string } → adds id: number

GET /feedback-sessions/ — array

GET /feedback-sessions/{session_id}

PUT /feedback-sessions/{session_id}

DELETE /feedback-sessions/{session_id}

Face AI

POST /face/test — multipart/form-data, field file (image). Response: { message: string, confidence: number }. (Utility/debug endpoint — optional to expose in UI, e.g. as a hidden dev tool.)

POST /face/register/{student_id} — multipart/form-data, field file (image). Response: { message: string, student_id: number, enrollment_no: string }

Face Login

POST /login/face — multipart/form-data, field file (image captured from webcam). Response:

{  "authenticated": boolean,  "student_id": number | null,  "enrollment_no": string | null,  "full_name": string | null,  "similarity": number | null,  "message": string}


If authenticated is false, show message as the error and let the user retry. If true, redirect to that student's dashboard.

Student Dashboard

GET /dashboard/student/{student_id} — Response:

{  "student_id": number,  "full_name": string,  "semester": number,  "session_name": string,  "subjects": [    { "subject_id": number, "subject_name": string, "faculty_id": number, "faculty_name": string }  ]}


Feedback

POST /feedback/submit — Body:

{  "session_id": number,  "student_id": number,  "faculty_id": number,  "subject_id": number,  "teaching_rating": number,  "communication_rating": number,  "punctuality_rating": number,  "behaviour_rating": number,  "knowledge_rating": number,  "comments": string | null}


Ratings are integers 1–5 (render as 5-star inputs). comments is optional.

Analytics

GET /analytics/dashboard → { total_students: number, feedback_submitted: number, pending_feedback: number, completion_percentage: number }

GET /analytics/faculty → array of { faculty_name: string, average_rating: number, total_feedback: number }

GET /analytics/subject → array of { subject_name: string, average_rating: number, total_feedback: number }

GET /analytics/top-faculty → array of { faculty_name: string, average_rating: number, total_feedback: number }

GET /analytics/lowest-faculty → array of { faculty_name: string, average_rating: number, total_feedback: number }

IMPLEMENTATION NOTES

Create a typed API layer in src/lib/api.ts (or src/api/*.ts split by resource: students.ts, faculty.ts, subjects.ts, assignments.ts, sessions.ts, feedback.ts, analytics.ts, auth.ts, face.ts) with TypeScript interfaces matching the exact response shapes above.

Webcam capture: build one reusable <WebcamCapture /> component (video preview + "Capture" button that draws the current frame to a canvas, converts it to a Blob/File, and shows a retake option) used by both the face-login screen and the face-registration screen.

All mutating admin actions (create/update/delete) must show a toast on success/failure and optimistically refresh the relevant table/list.

Handle backend validation errors (FastAPI returns {"detail": ...} on 4xx/5xx) by surfacing detail in the toast/error message.

Store the admin JWT in localStorage under a clear key (e.g. facesense_admin_token); implement a simple auth context/hook (useAdminAuth) that reads it, exposes login, logout, and isAuthenticated, and guards all /admin/* routes.

Use environment variable VITE_API_BASE_URL for the backend URL so it's easy to point at a different host later.

Keep components small and organized under src/components/, src/pages/, src/layouts/ (e.g. AdminLayout, StudentLayout), src/hooks/, src/lib/.

Add loading skeletons for all list/table views and the student dashboard while data is fetching, and empty states ("No students yet — add one to get started") where lists are empty.

Do not implement any backend logic, database, or face-recognition ML in the frontend — it is purely a client of the documented REST API above.

PROMPT END

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/600fb1c9-c39e-4155-87eb-c5943350e055).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
