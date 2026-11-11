# Advisr — Student Advising Booking

A responsive student advising booking website. Choose an advisor and appointment time, add your details, and confirm a session. Bookings are saved in the current browser using local storage.

## Demo sign-in

- Student password: `1234`
- Advisor password: `12345`

Select an advisor profile when signing in as an advisor. These passwords are client-side demo gates only; do not use this static app for sensitive data or production authentication.

Advisor sign-ins are limited to the advisor dashboard. Advisors can manage weekly time slots and mark specific calendar dates as time off; those dates are removed from student booking availability.

Use the **Appearance** button in the header to choose a Burgundy, Ocean, Forest, or Violet theme. Each student or advisor profile has its own saved theme in the current browser, so one user’s choice does not affect another’s.

## Run locally

Open `index.html` in a browser, or start a static server from this directory:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

The project is static HTML, CSS, and JavaScript and does not require a build step or package installation.

## Azure Static Web Apps

The Azure build script copies the static site files into `dist/`:

```sh
npm run build:azure
```

In the Static Web Apps deployment workflow, set `app_location` to `/` and `output_location` to `dist`. The site remains a client-side app, so bookings and preferences continue to be stored in each visitor's browser.
