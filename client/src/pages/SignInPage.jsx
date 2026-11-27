import { useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { homeForRole } from '../auth/roles.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { SessionLoadingPage } from './SessionPages.jsx';

function pathFromState(state) {
  const from = state?.from;
  if (!from || typeof from !== 'object' || typeof from.pathname !== 'string') {
    return null;
  }
  if (from.pathname === '/sign-in') {
    return null;
  }
  return `${from.pathname}${from.search || ''}${from.hash || ''}`;
}

export function SignInPage() {
  const { status, user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  usePageTitle(status === 'loading' ? 'Đang kiểm tra phiên đăng nhập' : 'Đăng nhập');

  const [values, setValues] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const intendedPath = pathFromState(location.state);

  if (status === 'loading') {
    return <SessionLoadingPage />;
  }

  if (user) {
    return <Navigate to={intendedPath || homeForRole(user.role)} replace />;
  }

  function updateField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function validate() {
    const nextErrors = {};
    const email = values.email.trim();

    if (!email) {
      nextErrors.email = 'Vui lòng nhập email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Email không đúng định dạng.';
    }

    if (!values.password) {
      nextErrors.password = 'Vui lòng nhập mật khẩu.';
    }

    setFieldErrors(nextErrors);

    if (nextErrors.email) {
      emailRef.current?.focus();
      return false;
    }
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return false;
    }
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (submitting || !validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const nextUser = await login(values.email.trim(), values.password);
      navigate(intendedPath || homeForRole(nextUser.role), { replace: true });
    } catch (error) {
      const details = error.details;
      if (error.status === 400 && details && typeof details === 'object') {
        const nextErrors = {};
        if (typeof details.email === 'string') {
          nextErrors.email = details.email;
        }
        if (typeof details.password === 'string') {
          nextErrors.password = details.password;
        }
        setFieldErrors(nextErrors);
        if (nextErrors.email) {
          emailRef.current?.focus();
        } else if (nextErrors.password) {
          passwordRef.current?.focus();
        }
      }

      setFormError(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <div className="auth-layout">
        <section className="auth-card" aria-labelledby="sign-in-heading">
          <p className="eyebrow">C2 · Đăng nhập</p>
          <h1 id="sign-in-heading">Đăng nhập ClubFlow</h1>
          <p className="muted">
            Dùng tài khoản được cấp trước. ClubFlow không có đăng ký, khôi phục mật khẩu
            hoặc đăng nhập bằng tài khoản trường.
          </p>

          {formError ? (
            <div className="alert alert-error" role="alert">
              {formError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(event) => updateField('email', event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email ? (
                <p className="field-error" id="email-error">{fieldErrors.email}</p>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor="password">Mật khẩu</label>
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={values.password}
                onChange={(event) => updateField('password', event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              {fieldErrors.password ? (
                <p className="field-error" id="password-error">{fieldErrors.password}</p>
              ) : null}
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>
        </section>

        <aside className="auth-help" aria-labelledby="demo-heading">
          <h2 id="demo-heading">Tài khoản demo</h2>
          <p>
            Dùng một trong các tài khoản demo của môn học: Executive, Applicant và
            Interviewer. Danh sách email và mật khẩu nằm trong <code>FRONTEND.md</code>.
          </p>
          <p className="muted">
            Mỗi vai trò chỉ thấy màn hình của mình. Sau khi đăng nhập, ClubFlow đưa bạn về
            trang chính tương ứng hoặc trở lại trang bạn vừa mở.
          </p>
        </aside>
      </div>
    </AppLayout>
  );
}
