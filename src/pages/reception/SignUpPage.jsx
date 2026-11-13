import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CircleCheck, LoaderCircle, UserPlus } from 'lucide-react';
import { receptionApi } from '@/services/reception';
import './reception.css';

/**
 * Sign up (Assignment 3 - Peter Arnold Mukasa) - MOCK ONLY.
 * The deployed backend has public registration disabled (QUESTIONS.md, Question 1),
 * so App.jsx only shows this screen when VITE_ENABLE_MOCKS=true.
 *
 * Fields come from the assignment doc: student number / course / university email
 * for students; organisation name / MoU reference for organisations; and the
 * general-rules accept tick-box for everyone.
 */

const SUBMITTER_TYPES = [
  { value: 'student', label: 'Student', hint: 'A Makerere student with a project' },
  { value: 'public', label: 'Member of the public', hint: 'An individual innovator' },
  { value: 'organisation', label: 'Organisation', hint: 'A company or group' },
];

const signUpSchema = z
  .object({
    type: z.enum(['student', 'public', 'organisation']),
    fullName: z.string().trim().min(1, 'Enter your full name.'),
    email: z.string().trim().email('Enter a valid email address.'),
    password: z.string().min(1, 'Choose a password.'),
    confirmPassword: z.string(),
    studentNumber: z.string().trim(),
    course: z.string().trim(),
    organisationName: z.string().trim(),
    mouReference: z.string().trim(),
    acceptedGeneralRules: z.boolean(),
  })
  .superRefine((values, context) => {
    const require = (field, message) => {
      if (!values[field]) context.addIssue({ code: 'custom', path: [field], message });
    };
    if (values.type === 'student') {
      require('studentNumber', 'Enter your student number.');
      require('course', 'Enter your course.');
    }
    if (values.type === 'organisation') {
      require('organisationName', 'Enter the organisation name.');
    }
    if (values.password !== values.confirmPassword) {
      context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'The passwords do not match.' });
    }
    if (!values.acceptedGeneralRules) {
      context.addIssue({ code: 'custom', path: ['acceptedGeneralRules'], message: 'Accept the UniPod general rules to continue.' });
    }
  });

/** Only sends the fields that belong to the chosen type (e.g. no student fields for the public). */
function toRequestBody(values) {
  const body = {
    type: values.type,
    fullName: values.fullName,
    email: values.email,
    password: values.password,
    acceptedGeneralRules: values.acceptedGeneralRules,
  };
  if (values.type === 'student') Object.assign(body, { studentNumber: values.studentNumber, course: values.course });
  if (values.type === 'organisation') Object.assign(body, { organisationName: values.organisationName, mouReference: values.mouReference });
  return body;
}

function FieldError({ error }) {
  return error ? <p className="api-error" role="alert">{error.message}</p> : null;
}

export function SignUpPage({ onBackToSignIn }) {
  const [serverError, setServerError] = useState('');
  const [createdEmail, setCreatedEmail] = useState('');
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      type: 'student',
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      studentNumber: '',
      course: '',
      organisationName: '',
      mouReference: '',
      acceptedGeneralRules: false,
    },
  });
  const type = useWatch({ control, name: 'type' });

  async function onSubmit(values) {
    setServerError('');
    try {
      const result = await receptionApi.signUp(toRequestBody(values));
      setCreatedEmail(result.email);
    } catch (reason) {
      setServerError(reason instanceof Error ? reason.message : 'Could not create the account.');
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-card">
          <div className="login-brand">
            <img src="/mak-crest.png" alt="Makerere University" className="brand-crest" />
            <div><b>MUTIC ERP</b><small>Makerere University</small></div>
          </div>

          {createdEmail ? (
            <div role="status">
              <p className="eyebrow">ACCOUNT CREATED</p>
              <h1><CircleCheck size={22} /> You're signed up.</h1>
              <p className="login-intro">Your account for <b>{createdEmail}</b> is ready. Sign in to submit your first brief.</p>
              <button type="button" className="btn btn-primary login-submit" onClick={onBackToSignIn}>Go to sign in</button>
            </div>
          ) : (
            <>
              <p className="eyebrow">CREATE AN ACCOUNT</p>
              <h1>Sign up to submit ideas.</h1>
              <p className="login-intro">Practice mode: this creates a test account only (mock data).</p>

              <form className="api-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <fieldset className="reception-fieldset">
                  <legend>I am signing up as</legend>
                  {SUBMITTER_TYPES.map((option) => (
                    <label key={option.value} className="checklist-item reception-choice">
                      <input type="radio" value={option.value} {...register('type')} />
                      <span className="checklist-item-body"><b>{option.label}</b> <small>{option.hint}</small></span>
                    </label>
                  ))}
                </fieldset>

                <label htmlFor="signup-name">Full name</label>
                <input id="signup-name" autoComplete="name" {...register('fullName')} />
                <FieldError error={errors.fullName} />

                <label htmlFor="signup-email">{type === 'student' ? 'University email' : 'Email address'}</label>
                <input id="signup-email" type="email" autoComplete="email" {...register('email')} />
                <FieldError error={errors.email} />

                {type === 'student' && (
                  <>
                    <label htmlFor="signup-student-number">Student number</label>
                    <input id="signup-student-number" {...register('studentNumber')} />
                    <FieldError error={errors.studentNumber} />

                    <label htmlFor="signup-course">Course</label>
                    <input id="signup-course" {...register('course')} />
                    <FieldError error={errors.course} />
                  </>
                )}

                {type === 'organisation' && (
                  <>
                    <label htmlFor="signup-organisation">Organisation name</label>
                    <input id="signup-organisation" autoComplete="organization" {...register('organisationName')} />
                    <FieldError error={errors.organisationName} />

                    <label htmlFor="signup-mou">MoU reference (if you have one)</label>
                    <input id="signup-mou" {...register('mouReference')} />
                  </>
                )}

                <label htmlFor="signup-password">Password</label>
                <input id="signup-password" type="password" autoComplete="new-password" {...register('password')} />
                <FieldError error={errors.password} />

                <label htmlFor="signup-confirm">Confirm password</label>
                <input id="signup-confirm" type="password" autoComplete="new-password" {...register('confirmPassword')} />
                <FieldError error={errors.confirmPassword} />

                <label className="checklist-item reception-choice">
                  <input type="checkbox" {...register('acceptedGeneralRules')} />
                  <span className="checklist-item-body">I have read and accept the UniPod general rules.</span>
                </label>
                <FieldError error={errors.acceptedGeneralRules} />

                {serverError && <div className="api-error" role="alert">{serverError}</div>}

                <button className="btn btn-primary login-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <LoaderCircle className="spin" size={16} /> : <UserPlus size={15} />}
                  {isSubmitting ? 'Creating account…' : 'Create account'}
                </button>
              </form>
              <button type="button" className="btn btn-outline" onClick={onBackToSignIn}><ArrowLeft size={15} />Back to sign in</button>
            </>
          )}
        </div>
      </section>
      <aside className="login-hero" aria-hidden="true">
        <img src="/login-hero.jpg" alt="" />
        <div className="login-hero-caption">
          <p className="eyebrow">MUTIC · UNIPOD</p>
          <p>Where Makerere innovators turn ideas into working prototypes.</p>
        </div>
      </aside>
    </main>
  );
}
