/**
 * Shared rules display/acceptance component (Assignment 12). A plain
 * controlled component — no form-library assumption — so it drops into
 * whichever convention the calling form already uses (plain useState in
 * NewSubmissionPage.jsx, react-hook-form elsewhere).
 *
 * `rules` is the already-fetched, already-filtered list the caller wants
 * shown (e.g. published GENERAL rules, or GENERAL + a specific SECTOR's
 * rules) — this component does no fetching or scope logic of its own.
 *
 * In edit mode, only rules with `mustAccept: true` get a checkbox; the rest
 * are shown as reference. `value` is the array of accepted rule ids;
 * `onChange` receives the next array. `allMustAcceptAccepted(rules, value)`
 * is exported so callers can derive their own submit-gating boolean.
 */
export function allMustAcceptAccepted(rules, value) {
  return rules.filter((rule) => rule.mustAccept).every((rule) => value.includes(rule.id));
}

export function RulesAcceptance({ rules, value = [], onChange, readOnly = false }) {
  if (rules.length === 0) {
    return <p className="live-empty">No rules are published for this request yet.</p>;
  }

  function toggle(ruleId, checked) {
    onChange(checked ? [...value, ruleId] : value.filter((id) => id !== ruleId));
  }

  return (
    <ul className="rules-acceptance-list">
      {rules.map((rule) => (
        <li key={rule.id} className="rules-acceptance-item">
          <b>{rule.title}</b>
          <p>{rule.body}</p>
          {!readOnly && rule.mustAccept && (
            <label className="management-checkbox">
              <input type="checkbox" checked={value.includes(rule.id)} onChange={(event) => toggle(rule.id, event.target.checked)} />
              I have read and accept this rule.
            </label>
          )}
        </li>
      ))}
    </ul>
  );
}
