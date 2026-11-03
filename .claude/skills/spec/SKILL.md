---
name: spec
description: Write a requirements-first feature spec in docs/specs/<feature>/, with requirements, design and tasks files.
argument-hint: "[feature-name]"
disable-model-invocation: true
---

Write a spec for `$ARGUMENTS` in `docs/specs/$ARGUMENTS/`. Use `docs/specs/bac-graph/` as the model for format and level of detail.

1. Read the code the feature touches. Then interview the user about anything the code can't answer, such as behaviour, edge cases and what is out of scope. Keep going until the answers add up to a spec.
2. Write `requirements.md`: user stories with numbered, testable acceptance criteria. Stop for the user's review.
3. Write `design.md`: the flow, components, data model changes and correctness properties, using real file and function names from the code. Stop for the user's review.
4. Write `tasks.md`: a numbered checkbox list in implementation order, with tests as explicit tasks.

Don't implement anything. When the spec is done, suggest starting a fresh session to build from it, and tick the `tasks.md` boxes during that build.

`docs/specs/` is gitignored by default. Tell the user this, and that committing the spec needs a `!docs/specs/<feature>/` line in `.gitignore`.
