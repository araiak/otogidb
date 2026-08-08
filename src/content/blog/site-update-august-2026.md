---
title: "Site Update — August 2026"
description: "Filter cards by event, smarter search, and a batch of event data cleanup"
date: "2026-08-08"
author: "Araiak"
tags: ["announcement", "update"]
---

<div data-lang="en">

I had some time off for summer break and used a chunk of it to do cleanup I'd been putting
off. Most of this update is about **events** — being able to find cards by the event they
came from, and fixing a batch of cases where that information was wrong or missing.

---

## Filter Cards by Event

There's a new **Event** dropdown in the card table toolbar. Pick one or more events and the
table shows only cards from them.

It currently covers **55 events and 563 cards**, sorted newest first so recent events are at
the top. The list is long enough that the dropdown has its own search box — type "halloween"
or "anniversary" and it'll narrow down.

One thing worth knowing: this isn't just ranking rewards. It includes helper cards, event
gacha cards, and cards that were only ever available from an event exchange shop. If a card
was obtainable during an event, the goal is for it to show up there.

---

## Search Got Smarter

The search box now looks at two things it didn't before.

**Skill and ability tags.** Searching "Wave Start", "DMG Boost", or "Stun" now finds cards.
Previously "AoE" returned literally nothing, because tags weren't searchable at all — which
was a bit silly given there's a whole filter for them.

**Event names.** Typing "anniversary" or "christmas" now surfaces cards from those events.

Worth saying how I think about the two tools, since they overlap now. **Search is the quick
and dirty option** — you want to eyeball a handful of cards, you half-remember a name, you're
curious what's tagged "Wave Start". It's fuzzy on purpose and will happily show you things
that are only roughly relevant.

**The filters are for pinpointing an exact set.** If you need every Divina healer with an AoE
skill that isn't currently available, that's a filter job, and it'll give you precisely that
set with nothing extra.

So broad search terms like "DMG" still match most of the table — most cards do in fact deal
damage — and that's working as intended rather than something to fix. Reach for the dropdowns
when you want exact.

---

## Clear Filters Button

This one actually landed a few weeks back and I never wrote it up, so in case you missed it:
there's a **Clear filters** button in the toolbar.

It resets every filter, the search box, and the sort order in one click. It greys out when
there's nothing to clear, so you can tell at a glance whether anything is still applied. Your
LB0/MLB and Show Bugs preferences are left alone, since those are display settings rather
than filters.

I added it because I got tired of reloading the page to start over, which is a fairly good
sign that anyone else using the table was doing the same thing.

---

## Event Data Cleanup

This is the part that was genuinely broken, so I'll just describe it plainly.

This site is a for-fun project. There are no ads, nothing is monetised, and it's maintained
in whatever spare time I have — so things do slip through, and they sometimes sit broken for
a while before I notice. Several of these were only on my radar because people mentioned them
in the various community Discords. Thank you for that, sincerely. It's genuinely the main way
I find out something's wrong.

Some of this gets cross-checked against the
[Otogi: Spirit Agents Wikia](https://otogi.fandom.com/wiki/Otogi:_Spirit_Agents_Wikia), which
has been an invaluable second opinion — particularly for older events, where it's often the
better record of what actually happened. Thank you to the people who maintain it; a lot of
what's here would be guesswork without that work.

What's fixed:

- **New event cards didn't show their event right away.** A card released alongside a new
  event would show no event on its page until the *following* site update — sometimes days
  later. It's now correct straight away.

- **39 cards had no event attached at all.** Event associations are worked out partly from
  timing, and the main signal used to be a card's banner lining up with when an event ran.
  For these cards there was no banner period to match against — either they really were
  exchange-only, or that information just isn't available to me, which is common for older
  events. Either way the only remaining clue was their event exchange window, and nothing was
  looking at it. :card[551], :card[552], :card[553] and :card[554] from the 2nd anniversary
  event were all in this group.

- **Card pages and filtering disagreed.** Cards like :card[613] correctly showed
  "Two Santas" on their own page, but didn't appear when you filtered for that event. Those
  now agree with each other.

- **Blank event names on stage drops.** 36 stage drop entries — the cards you earn for
  clearing particular stages during an event — were showing a blank event name instead of
  naming the event they came from.

---

## Availability Accuracy

Cards joining the standard gacha pool were staying marked unavailable past their release
date. The cause was that the site only recalculated availability when its own data refreshed
— so a card scheduled to become available on a Friday might sit there looking unavailable
until the next refresh came around.

That check now happens in your browser against your own clock, so a card becomes available on
the day it's supposed to, with nothing needing to update behind the scenes.

Related: an unreleased pool card used to show the tooltip "can be pulled from any banner at
any time" while simultaneously showing as unavailable, which was justifiably confusing. It now
reads "can be pulled from any banner at any time **from Aug 15, 2026**".

---

## Spirit Is Now the Default Look

New visitors now get the **Spirit** styling instead of Classic. If you've already picked a
style, nothing changes for you — your preference is remembered. The toggle is still up in the
header if you want to switch either way.

---

## A Note on Privacy

Another cleanup item from the same stretch: **the fonts are now self-hosted.**

The site used to reference Google Fonts. In practice your browser wasn't actually talking to
Google, because Cloudflare rewrites those requests at the edge and serves the fonts itself —
so no visitor IP was reaching Google under normal operation.

But that's a guarantee I was renting from someone else. It held only as long as the rewrite
kept working, and if it ever silently stopped — misconfiguration, a setting change, a feature
being retired — requests would quietly start going to Google and nothing on my end would tell
me. That's not a thing I want a privacy promise resting on.

So the font files are now served from Cloudflare, which already hosts the site itself. That's
the point: it isn't an extra party in the chain, it's the same one that served you this page.
There's no Google reference left to rewrite, so there's no failure mode where one quietly
comes back. I've left a comment in the code explaining why, so I don't casually undo it later.
It also dropped about 460KB of font CSS that the edge rewriting was injecting into every page.

To be straight about what's *not* gone: the site does use PostHog to count page views, so
that's one third-party request. There are no ads, no tracking cookies, no session recording,
and nothing is stored on your device for analytics. If your browser sends a **Do Not Track**
signal, the script exits before it makes any network request at all — not "collects less",
but doesn't run.

I'd rather say that plainly than claim the site talks to nobody.

Privacy is something I actually care about, which is why there's a
[privacy page](/en/privacy) at all — whether a hobby site like this one is legally required to
have one depends on where you (and I) happen to be, and I didn't want to work that out first.
It's there because I think you should be able to know exactly
what a site is doing with your data rather than having to assume, and writing it down keeps
me honest about it too.

The other half of that is being checkable. The site's source is linked at the bottom of every
page, so nearly all of this is verifiable rather than something you have to take my word for:
you can see there's no Google Fonts reference, read what the analytics is configured to
collect, and confirm the Do Not Track check happens before any network call. If you find
somewhere the code and the policy disagree, that's a bug and I want to hear about it.

---

## There Are Probably Still Bugs

Worth setting expectations here.

A fair amount of the event information isn't stated outright anywhere — some of it is worked
out from timing, like matching a card's banner or exchange window against when an event ran.
That works well in general, but it means some cards are probably attributed to the **wrong**
event, or missing one they should have.

The new event filter is likely to make those stand out for the first time, simply because
nobody could see this data grouped together before. If you spot a card filed under an event it
clearly doesn't belong to, or an event that's obviously missing cards you remember, please say
something in the Discords. Concrete examples ("card X should be event Y") are ideal and take
me very little time to act on.

---

## TL;DR

- New **Event filter** in the card table — 55 events, 563 cards, newest first, searchable
- Search now matches **skill/ability tags** and **event names**
- **Clear filters** button resets everything in one click (added a while ago, never announced)
- Fixed 39 cards that had no event attached, plus blank event names on stage drops
- New event cards now show their event immediately instead of one update late
- Standard pool cards now become available on their actual release date
- **Spirit** is now the default styling for new visitors
- **Fonts are self-hosted** — no Google reference left at all, so no rewrite to depend on
- Event attributions are partly inferred — please report anything that looks wrong

</div>
