# Embedding the schedule on another site

The public schedule can be dropped into any website — a Squarespace, Wix,
WordPress, or hand-coded page — with a single `<iframe>`.

## Quick embed

Copy this snippet into your site, replacing the `src` with your own Studio
Roxx URL:

```html
<iframe
  src="https://YOUR-STUDIO.com/?embed=1"
  title="Class schedule"
  loading="lazy"
  style="width:100%; min-height: 900px; border: 0;"
  allow="fullscreen"
></iframe>
```

The `?embed=1` query flag hides the site header and disables the booking
button — visitors can browse the calendar and expand class details, but the
"Hold to reserve" flow directs them to open the full studio site to book.

## Sizing tips

- Use a min-height around 900px on desktop; the iframe body scrolls inside
  itself, so a fixed frame height feels natural.
- On mobile, drop it into a full-width container and let the internal layout
  handle the small screen — no extra work needed.

## Customization

Change your studio branding (name, tagline, primary color, logo) in
**Admin -> Settings**. All updates flow into the embedded schedule
automatically — there's no build step or embed to update.
