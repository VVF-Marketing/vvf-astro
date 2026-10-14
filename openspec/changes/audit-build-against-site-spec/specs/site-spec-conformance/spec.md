## Purpose

Keeps the build measurable against, and brought up to, the VVF website specification that Paula Inc. maintains on Google Drive. Every check in the spec gets a traceable result. Clear gaps are fixed. Unclear ones go to the client as decision questions with options, on the Basecamp card that asked for the audit.

## ADDED Requirements

### Requirement: Every spec check has one registered verification
The project SHALL keep a registry of every numbered check in the VVF website specification. That covers the "Checks" lists in sections 2.8, 3.4, 4.5, 5.9, 6.4, each page in section 7 and 8.9, plus the content checks in 4.4.

Each entry SHALL be keyed by section and check number (for example `7.8-3`). It SHALL record:
- the spec version it was read from;
- a short label of our own;
- how the check is verified: an automated test, a manual step with written instructions, or blocked with a stated reason.

The spec is confidential and the repository is public. So the spec document, its check wording, the coverage map and the generated report SHALL NOT be committed. They live in a gitignored local folder and are shared only on the Basecamp card.

#### Scenario: Registry covers the whole spec
- **WHEN** the registry is compared with the check lists of the spec version it names
- **THEN** every numbered check appears exactly once, and no entry refers to a check the spec does not contain

#### Scenario: Nothing confidential is committed
- **WHEN** the audit's files are staged for a commit
- **THEN** the spec document, the coverage map and the report are ignored by git, and the committed registry and tests hold only check ids, our own labels and assertions about the site's behaviour

#### Scenario: A check cannot run locally
- **WHEN** a check depends on something a local build doesn't have, such as a Donorbox test gift, GA4 traffic, a delivered email, a deployed domain or an online validator
- **THEN** its entry is marked manual or blocked, with the reason and the steps to run it once that thing is available, and it is never reported as passed

### Requirement: Conformance suite runs against the production build in both languages
The automated checks SHALL run against the production server build (not the dev server), with the project's seed data. Every page-level check SHALL run once for the English path and once for the `/es` path. A check passes only when it passes in both languages. Each test SHALL be named with its check id, so a result maps straight back to the spec.

#### Scenario: Check passes in English only
- **WHEN** a page-level check passes on `/contact` but fails on `/es/contact`
- **THEN** the check is reported as failed, and the failure names the Spanish path

#### Scenario: Re-running after a fix
- **WHEN** a contributor fixes a failing check and runs the conformance suite again
- **THEN** the check's result changes to pass without any edit to the suite or the registry

### Requirement: Failing checks stay out of CI, passing checks guard against regressions
The conformance suite SHALL also run on its own, through its own command. A check that fails SHALL NOT run in `npm run test:e2e` or the CI test job, because it describes known work, not a regression. Once a check passes in both languages, it SHALL be marked conformant and SHALL run in the CI end-to-end job from then on.

#### Scenario: Existing E2E run while checks still fail
- **WHEN** `npm run test:e2e` runs and some conformance checks still fail
- **THEN** only the conformant checks run with the existing tests, and none of the failing ones do

#### Scenario: A fixed check later breaks
- **WHEN** a check marked conformant starts failing because of a later change
- **THEN** the CI end-to-end job fails and names the check id

### Requirement: Results are reported per check as pass, fail or blocked
Running the audit SHALL produce a report that lists every registered check with its status: pass, fail, blocked or manual-pending. Each fail SHALL name its section and check number, the language or languages it fails in, and what the build does instead. The report SHALL state the spec version, the commit audited and the date.

#### Scenario: A failing check in the report
- **WHEN** check 2.8-7 fails because `/venezuela-earthquake-relief` answers with a redirect
- **THEN** the report lists "2.8, check 7" as failed and says the path redirects, with the status code and the target

#### Scenario: Report totals
- **WHEN** the report is generated
- **THEN** it shows the number of checks that pass, fail, are blocked and are manual-pending, per section and overall, and the totals add up to the number of checks in the registry

### Requirement: Every failure is triaged as straightforward or needs decision
Each failed check SHALL be sorted into one of two groups and SHALL keep a one-line reason for its group.
- **Straightforward:** the spec states the target clearly and the fix needs no outside input. These are fixed without asking.
- **Needs decision:** a failure goes here when at least one of these is true:
  - the spec is ambiguous or silent on the point;
  - the spec contradicts an earlier decision recorded in an existing project spec or a client review;
  - the fix depends on access, an account or a choice nobody has made yet (production host, Donorbox settings, Figma or M.O. documents, a mail provider, analytics outside production);
  - the fix would delete or irreversibly change content or data beyond what the spec states.

#### Scenario: Clear spec, no outside input
- **WHEN** a check fails because a page lacks the `noindex` the spec requires
- **THEN** it is triaged straightforward and fixed without a question

#### Scenario: Spec contradicts an earlier decision
- **WHEN** the spec says child profiles are listed in the sitemap, but the project earlier decided to leave them out
- **THEN** the check is triaged needs decision, and the earlier decision is cited in its reason

### Requirement: Decisions are asked with feasible options and a recommendation
Every needs-decision item SHALL go to Enrique on the linked Basecamp card. Each one SHALL give:
- its section and check id;
- what the spec asks and what blocks a direct fix;
- two or three workable options, each with its trade-offs (cost, effort, risk, what changes for visitors or editors);
- our recommended option.

Nothing SHALL be built for an item until it is answered. The answer and the chosen option SHALL be recorded alongside the item. The chosen option is then built and verified like any other fix.

#### Scenario: Item awaiting an answer
- **WHEN** a decision question has been posted and not answered
- **THEN** its checks stay reported as blocked with the question reference, and no code for it is merged

#### Scenario: Answer chooses an option
- **WHEN** Enrique picks an option
- **THEN** the choice is recorded with the date, and the item is fixed to that option until its checks pass, or until the agreed outcome holds when the option is to keep the build as it is

### Requirement: A fix is done only when its checks pass and the project stays coherent
A fix SHALL count as done only when all of these hold:
- its conformance checks pass in English and Spanish;
- the existing unit, Storybook and end-to-end tests still pass, with tests that asserted old behaviour updated in the same batch;
- every existing project spec whose requirement the fix changes has a delta spec in this change describing the new behaviour.

Changes to public URLs SHALL keep every old URL working through a single permanent redirect, as spec 2.6 requires. Changes to CMS collections SHALL migrate existing content, including editors' edits, without loss.

#### Scenario: Route moved
- **WHEN** `/events` moves to `/events-and-campaigns`
- **THEN** `/events` and `/es/events` answer one 301 to the new paths, the `front-end` delta spec states the new route, and the existing end-to-end tests pass

#### Scenario: Collection restructured
- **WHEN** a collection is reshaped to its Appendix B type
- **THEN** every published item is present after migration in both languages with its field values carried over, and an empty Spanish field is reported as a gap rather than filled from English

### Requirement: Spec coverage is mapped section by section
Before the checks run, the project SHALL keep a coverage map for spec sections 1 to 8 and Appendix B. For each subsection, the map SHALL say whether the build covers it, partly covers it, does not build it yet, or conflicts with it, and SHALL point to the files or collections involved. Sections the spec marks as not settled (5.8 row 8 and section 9) SHALL be listed as out of scope, not as gaps.

#### Scenario: Conflict between spec and build
- **WHEN** the build does something the spec contradicts, for example a path that must return 200 redirects instead
- **THEN** the map marks that subsection as conflicting and names the spec rule and the build's behaviour, since the spec wins

### Requirement: Questions, results and outcomes go back to the Basecamp card
The linked Basecamp card SHALL receive three comments:
1. **Step 1 questions**, before the checks run. They cover the unclear points found while mapping coverage, each with its spec section number, and with options and a recommendation where the answer could go more than one way.
2. **The Step 2 report:** totals, every failed check by section and check number with its triage group, the blocked checks with their reasons, and the decision questions.
3. **A closing summary**, once the fixes land: what was fixed, what was decided, and what remains blocked or out of scope.

#### Scenario: Step 2 waits for answers
- **WHEN** the questions comment has been posted and Enrique has not answered yet
- **THEN** checks whose result depends on an unanswered question are marked blocked, with the question's section number, and are not counted as pass or fail, while every other check runs and straightforward fixes proceed
