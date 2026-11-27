export const ROLES = Object.freeze({
  APPLICANT: 'APPLICANT',
  EXECUTIVE: 'EXECUTIVE',
  INTERVIEWER: 'INTERVIEWER',
});

export const ROLE_LABEL = Object.freeze({
  [ROLES.APPLICANT]: 'Ứng viên',
  [ROLES.EXECUTIVE]: 'Ban tổ chức',
  [ROLES.INTERVIEWER]: 'Người phỏng vấn',
});

/**
 * The home screen for each role. The paths match the route map in
 * FRONTEND.md and are replaced by the real C6/C7/C10 screens later.
 */
export const ROLE_HOME = Object.freeze({
  [ROLES.APPLICANT]: '/my-applications',
  [ROLES.EXECUTIVE]: '/exec/applications',
  [ROLES.INTERVIEWER]: '/interviewer/interviews',
});

export function homeForRole(role) {
  return ROLE_HOME[role] || '/';
}
