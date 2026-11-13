import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, UserCheck, UserPlus } from 'lucide-react';
import { useFindOrCreateWalkInAccount } from '@/hooks/useReception';
import { NewSubmissionPage } from '@/pages/NewSubmissionPage';
import { ErrorBanner } from './shared';
import { useSignOutOn401 } from './helpers';
import './reception.css';

/**
 * Assisted (walk-in) submission (Assignment 3 - Peter Arnold Mukasa).
 *
 * Step 1: who is the walk-in? Find their account by email, or create a minimal one.
 * Step 2: Wasswa's 5-step submit form (Assignment 4), shown "on behalf of" that person.
 * The walk-in stays the owner (submitterId); the receptionist is recorded as assisting.
 *
 * MOCK ONLY for the account step - see QUESTIONS.md, Questions 6 and 9.
 */

const PERSON_TYPES = [
  { value: 'student', label: 'Student' },
  { value: 'public', label: 'Member of the public' },
  { value: 'organisation', label: 'Organisation' },
];

const walkInSchema = z.object({
  type: z.enum(['student', 'public', 'organisation']),
  fullName: z.string().trim().min(1, "Enter the person's full name."),
  email: z.string().trim().email('Enter a valid email address.'),
});

export function WalkInSubmissionPage({ token, onUnauthorized }) {
  const [person, setPerson] = useState(null);
  const findOrCreate = useFindOrCreateWalkInAccount(token);
  useSignOutOn401(findOrCreate.error, onUnauthorized);

  if (person) {
    return (
      <>
        <div className="live-page" style={{ paddingBottom: 0 }}>
          <section className="live-panel" role="status" aria-label="Walk-in account">
            <p>
              {person.existing ? <UserCheck size={15} /> : <UserPlus size={15} />}{' '}
              <b>{person.existing ? 'Existing account found' : 'Minimal account created'}</b> for {person.fullName} ({person.email}).{' '}
              <button type="button" className="btn btn-outline" onClick={() => setPerson(null)}>Change person</button>
            </p>
          </section>
        </div>
        <NewSubmissionPage
          token={token}
          onUnauthorized={onUnauthorized}
          onBehalfOf={{ submitterId: person.submitterId, name: person.fullName, email: person.email }}
          confirmationPath="/reception/walk-in/confirmation"
          cancelPath="/reception/home"
        />
      </>
    );
  }

  return <WhoIsTheWalkIn findOrCreate={findOrCreate} onFound={setPerson} />;
}

function WhoIsTheWalkIn({ findOrCreate, onFound }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(walkInSchema),
    defaultValues: { type: 'student', fullName: '', email: '' },
  });

  function onSubmit(values) {
    findOrCreate.mutate(values, { onSuccess: onFound });
  }

  return (
    <div className="live-page page-enter">
      <Link className="btn btn-outline" to="/reception/home"><ArrowLeft size={15} />Back to reception home</Link>
      <div className="live-page-heading">
        <div>
          <p className="eyebrow">RECEPTION · WALK-IN SUBMISSION</p>
          <h1>Help a walk-in submit a brief</h1>
          <p>First tell us who you are helping. If they don't have an account yet, a minimal one is created for them.</p>
        </div>
      </div>
      <section className="live-panel" aria-labelledby="walk-in-heading">
        <div className="live-panel-heading"><div><p className="eyebrow">STEP 1 OF 2</p><h2 id="walk-in-heading">Who is the walk-in?</h2></div></div>
        <form className="api-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <fieldset className="reception-fieldset">
            <legend>The person is a</legend>
            {PERSON_TYPES.map((option) => (
              <label key={option.value} className="checklist-item reception-choice">
                <input type="radio" value={option.value} {...register('type')} />
                <span className="checklist-item-body">{option.label}</span>
              </label>
            ))}
          </fieldset>

          <label htmlFor="walk-in-name">Full name</label>
          <input id="walk-in-name" {...register('fullName')} />
          {errors.fullName && <p className="api-error" role="alert">{errors.fullName.message}</p>}

          <label htmlFor="walk-in-email">Email address</label>
          <input id="walk-in-email" type="email" {...register('email')} />
          {errors.email && <p className="api-error" role="alert">{errors.email.message}</p>}

          <ErrorBanner error={findOrCreate.error} fallback="Could not find or create the account." />
          <div className="action-row">
            <button type="submit" className="btn btn-primary" disabled={findOrCreate.isPending}>
              {findOrCreate.isPending ? 'Checking…' : 'Continue to the brief form'}<ArrowRight size={15} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
