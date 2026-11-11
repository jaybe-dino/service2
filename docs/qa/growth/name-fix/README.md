# Growth application name regression

## Cause and scope

The Growth 02 form posted `manager` to `/api/launch-batch/inquiry`, whose validator read `name`. A populated Korean name therefore passed browser validation but failed server validation. `batch2` and `program` use `/apply` with its existing `manager` contract and were not changed.

## Fix

- Growth sends canonical `name`.
- Inquiry validation accepts a string `manager` only if canonical `name` is nullish, keeping already-open/cached pages working.
- The Growth script URL is versioned again.
- No pricing, application data, permissions, CRM/email delivery or other forms were changed.

## Verification

- `node --test tests/growth-application.test.cjs`: 9/9 passed, including old/new payload compatibility, missing/blank names, field validation, retry receipt stability, one mocked insert, and unchanged batch2/program pricing.
- `node --check public/growth/app.js`: passed.
- TypeScript `tsc --noEmit`: passed.
- Next.js production build: passed.
- Changed-file ESLint: zero errors, one existing unused catch variable warning in Growth app.js.
- Repository-wide source lint: 12 errors and 25 warnings in the broader repository; not a clean global lint pass. Existing CommonJS worker scripts account for the errors. A raw unscoped lint also scans generated `.next` output, producing additional generated-code noise.
- Headless Chromium at 390×844: 8 checks passed. All external requests blocked; `/api/launch-batch/inquiry` intercepted with synthetic error/success responses. Checked whitespace rejection, Korean name payload, duplicate submit suppression, values preserved after server error, same request ID on retry, success message/reset, and no JavaScript errors.
- `mobile-success-mocked.png` is a mocked browser result, not evidence of a live database submission.

No real customer or test application was submitted to production and no outbound customer email was sent.
