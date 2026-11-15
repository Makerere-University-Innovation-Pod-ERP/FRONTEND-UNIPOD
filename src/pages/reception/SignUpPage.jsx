import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, UserPlus } from 'lucide-react';
import { createSession } from '@/lib/auth';
import { backendApi } from '@/services/backend-api';
import './reception.css';

const UNIPOD_RULES_VERSION = '2026-1';

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
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number.'),
    password: z.string().min(12, 'Password must be at least 12 characters.').max(72, 'Password must be no more than 72 characters.'),
    confirmPassword: z.string(),
    studentNumber: z.string().trim(),
    course: z.string().trim(),
    organisationName: z.string().trim(),
    contactPerson: z.string().trim(),
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
    accountKind: values.type.toUpperCase(),
    fullName: values.fullName,
    phone: values.phone,
    email: values.email,
    password: values.password,
    rulesAccepted: values.acceptedGeneralRules,
    rulesVersion: UNIPOD_RULES_VERSION,
  };
  if (values.type === 'student') {
    Object.assign(body, {
      studentNumber: values.studentNumber,
      course: values.course,
      universityEmail: values.email,
    });
  }
  if (values.type === 'organisation') {
    Object.assign(body, {
      organisationName: values.organisationName,
      ...(values.contactPerson ? { contactPerson: values.contactPerson } : {}),
      ...(values.mouReference ? { mouReference: values.mouReference } : {}),
    });
  }
  return body;
}

function FieldError({ error }) {
  return error ? <p className="api-error" role="alert">{error.message}</p> : null;
}

export function SignUpPage({ onBackToSignIn, onLogin }) {
  const [serverError, setServerError] = useState('');
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    trigger,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      type: 'student',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      studentNumber: '',
      course: '',
      organisationName: '',
      contactPerson: '',
      mouReference: '',
      acceptedGeneralRules: false,
    },
  });
  const type = useWatch({ control, name: 'type' });

  async function continueToAccountDetails() {
    const valid = await trigger(['type', 'fullName', 'email', 'phone']);
    if (valid) {
      clearErrors();
      setServerError('');
      setStep(2);
    }
  }

  function returnToContactDetails() {
    clearErrors();
    setServerError('');
    setStep(1);
  }

  function handleFormKeyDown(event) {
    if (
      step === 1
      && event.key === 'Enter'
      && event.target instanceof HTMLInputElement
      && event.target.type !== 'radio'
    ) {
      event.preventDefault();
      void continueToAccountDetails();
    }
  }

  function handleFormSubmit(event) {
    if (step === 1) {
      event.preventDefault();
      void continueToAccountDetails();
      return;
    }
    void handleSubmit(onSubmit)(event);
  }

  async function onSubmit(values) {
    setServerError('');
    try {
      const session = createSession(await backendApi.signup(toRequestBody(values)));
      onLogin(session);
    } catch (reason) {
      setServerError(reason instanceof Error ? reason.message : 'Could not create the account.');
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-card signup-card">
          <div className="login-brand">
            <img src="/mak-crest.png" alt="Makerere University" className="brand-crest" />
            <div><b>MUTIC ERP</b><small>Makerere University</small></div>
          </div>

          <p className="eyebrow">CREATE AN ACCOUNT</p>
          <h1>Sign up to submit ideas.</h1>
          <p className="login-intro">A couple of quick steps and you’ll be ready to submit your ideas.</p>

          <ol className="signup-progress" aria-label="Sign-up progress">
            <li className={step === 1 ? 'is-current' : 'is-complete'} aria-current={step === 1 ? 'step' : undefined}>
              <span className="signup-progress-number">{step === 1 ? '1' : '✓'}</span>
              <span><b>Your details</b><small>About you</small></span>
            </li>
            <li className={step === 2 ? 'is-current' : ''} aria-current={step === 2 ? 'step' : undefined}>
              <span className="signup-progress-number">2</span>
              <span><b>Finish signup</b><small>Account security</small></span>
            </li>
          </ol>

          <form
            className="api-form signup-form"
            autoComplete="on"
            onKeyDown={handleFormKeyDown}
            onSubmit={handleFormSubmit}
            noValidate
          >
            {step === 1 ? (
              <>
                <fieldset className="reception-fieldset signup-account-types">
                  <legend>I am signing up as</legend>
                  {SUBMITTER_TYPES.map((option) => (
                    <label
                      key={option.value}
                      className={`checklist-item reception-choice${type === option.value ? ' is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        {...register('type', { onChange: () => clearErrors() })}
                      />
                      <span className="checklist-item-body"><b>{option.label}</b><small>{option.hint}</small></span>
                    </label>
                  ))}
                </fieldset>

                <label htmlFor="signup-name">Full name</label>
                <input id="signup-name" autoComplete="name" {...register('fullName')} />
                <FieldError error={errors.fullName} />

                <label htmlFor="signup-email">{type === 'student' ? 'University email' : 'Email address'}</label>
                <input id="signup-email" type="email" autoComplete="email" {...register('email')} />
                <FieldError error={errors.email} />
                {type === 'student' && <small className="signup-field-hint">We’ll use this as your sign-in and university email.</small>}

                <label htmlFor="signup-phone">Phone number</label>
                <input id="signup-phone" type="tel" autoComplete="tel" {...register('phone')} />
                <FieldError error={errors.phone} />
                <div className="signup-actions">
                  <button type="button" className="btn btn-outline" onClick={onBackToSignIn}>
                    <ArrowLeft size={15} />Back to sign in
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => void continueToAccountDetails()}>
                    Continue<ArrowRight size={15} />
                  </button>
                </div>
              </>
            ) : (
              <>
                {type === 'student' && (
                  <>
                    <div className="signup-section-heading">
                      <b>Student details</b>
                      <small>We need these to set up your submitter profile.</small>
                    </div>
                    <label htmlFor="signup-student-number">Student number</label>
                    <input id="signup-student-number" autoComplete="on" {...register('studentNumber')} />
                    <FieldError error={errors.studentNumber} />

                    <label htmlFor="signup-course">Course</label>
                    <input id="signup-course" autoComplete="on" {...register('course')} />
                    <FieldError error={errors.course} />
                  </>
                )}

                {type === 'organisation' && (
                  <>
                    <div className="signup-section-heading">
                      <b>Organisation details</b>
                      <small>Tell us a little about your organisation.</small>
                    </div>
                    <label htmlFor="signup-organisation">Organisation name</label>
                    <input id="signup-organisation" autoComplete="organization" {...register('organisationName')} />
                    <FieldError error={errors.organisationName} />

                    <label htmlFor="signup-contact-person">Contact person <span>(optional)</span></label>
                    <input id="signup-contact-person" autoComplete="name" {...register('contactPerson')} />

                    <label htmlFor="signup-mou">MoU reference <span>(optional)</span></label>
                    <input id="signup-mou" {...register('mouReference')} />
                  </>
                )}

                <div className="signup-section-heading">
                  <b>Secure your account</b>
                  <small>Use at least 12 characters for your password.</small>
                </div>
                <label htmlFor="signup-password">Password</label>
                <div className="password-input-wrap">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('password')}
                  />
                  <button
                    className="password-visibility-toggle"
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <FieldError error={errors.password} />

                <label htmlFor="signup-confirm">Confirm password</label>
                <div className="password-input-wrap">
                  <input
                    id="signup-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                  />
                  <button
                    className="password-visibility-toggle"
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    aria-pressed={showConfirmPassword}
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <FieldError error={errors.confirmPassword} />

                <label className="checklist-item reception-choice signup-rules">
                  <input type="checkbox" {...register('acceptedGeneralRules')} />
                  <span className="checklist-item-body">I have read and accept the UniPod general rules.</span>
                </label>
                <FieldError error={errors.acceptedGeneralRules} />

                {serverError && <div className="api-error" role="alert">{serverError}</div>}

                <div className="signup-actions">
                  <button type="button" className="btn btn-outline" onClick={returnToContactDetails}>
                    <ArrowLeft size={15} />Back
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <LoaderCircle className="spin" size={16} /> : <UserPlus size={15} />}
                    {isSubmitting ? 'Creating account…' : 'Create account'}
                  </button>
                </div>
              </>
            )}
          </form>
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
