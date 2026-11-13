# Advisr

A demo student-advising booking app.

## Demo sign-in

| Role | Password / code |
| --- | --- |
| Student | `1234` |
| Advisor | `12345` |
| Administrator | `123456` |

Choose an advisor profile when signing in as an advisor.

## Features

- Students can book, view, and cancel advising meetings.
- Advisors can manage weekly availability and time off, review meetings, and cancel upcoming meetings with a reason.
- Students see advisor cancellation reasons on their next sign-in and can dismiss the notices.
- Administrators can view advisor schedules and appointments, and report completed and canceled meetings by day, week, month, and year.
- Student resources, FAQs, and appearance themes are available in the dashboard.

## Run locally

From `StudentAdvisingBooking/`, install dependencies and start the Node server:

```sh
npm ci
npm start
```

Open [http://localhost:3000/?access=advisr-private-link-2026](http://localhost:3000/?access=advisr-private-link-2026). The `access` query parameter is required to enable sign-in.

## Email notifications

Email delivery requires SMTP settings in a `.env` file:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=advising@example.com
```

`SMTP_PASS` is required by the server. `EMAIL_FROM` is optional and defaults to `SMTP_USER`.

## Demo limitations

Bookings, schedules, cancellations, dismissal choices, and themes are saved in the current browser and are not shared across browsers or devices. Sign-in codes and the access link are client-side demo gates, not secure authentication. Do not use real or sensitive student information.

The GitHub Pages workflow serves the static app. Email delivery requires the Node server and is not available from the static Pages deployment.
