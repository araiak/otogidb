---
title: "Known Game Bugs"
description: "Introducing the known bugs feature - what it is, how to use it, and a note on reporting and perspective"
date: "2026-03-13"
author: "Araiak"
tags: ["announcement", "bugs"]
---

I've added a known bugs feature to the site. This is a quick post to explain what it is, how it works, and what to expect from it.

---

## What It Is

The site now tracks bugs I've found in the game data — things that don't add up between what a card's description says and what the underlying data actually does. Some of these are based on player observations, and some were found during data analysis that most players wouldn't have a way to spot.

There are currently **51 open bugs** tracked across the database. They fall into two categories:

- **Red** — gameplay-impacting. The card actually behaves differently than described in a way that affects how you'd use it. Examples: wrong targeting, wrong stat values, abilities that don't stack but don't say so, cards that close to melee range despite being ranged type.
- **Yellow** — description mismatch. The number or effect in the description doesn't match the data, but the practical impact is smaller. Think "description says 25%, data says 20%."

The distinction is a bit arbitrary, and reasonable people could disagree on some categorizations. I've tried to draw the line at whether it meaningfully changes how you'd play or value the card.

This list isn't exhaustive — it's just what's come out of more systematic data searches and things I've become aware of, mostly through the community. There are almost certainly bugs I haven't found or haven't gotten to yet.

---

## It's Opt-In

This feature is **disabled by default**. Some players don't want this information — and that's completely fine. To enable it:

- **Main page**: check the "Show Bugs" checkbox. This saves the setting globally.
- **Search/cards page**: cards with known bugs get a small indicator. Click through to the card page for the full details.

I'll be including bug information in future auction posts where it's relevant — if a card you're being asked to invest mochi in has a known bug, that's something you should know before spending. Where I can, I'll drop data notes in blog posts behind spoiler tags so they're there if you want them without getting in the way, but I can't guarantee that's consistent across older posts, or that I won't miss something in the commentary.

---

## On Reporting Bugs

If you want to report a bug, I hang out on Otogi Leaks Discord and a few of the other common ones — if you open a discussion there I'll probably see it and look into it if I have time.

Please don't report these to the developers unless you've verified them yourself. Before reporting:

1. **You need to own the card** — you can't test what you can't use.
2. **Validate the bug** — actually confirm it behaves the way the report describes.

The developers are maintaining a live game with monthly events, which is a lot of work. Getting flooded with 50 unvalidated bug reports — many of which may turn out to be minor or intentional — is not a fun day. If you've tested something and you're confident it's wrong, that report is worth making. If you're going off what you read here, please do your own testing first.

---

## On the Bugs Themselves

A lot of these look embarrassing on paper, but creating bug-free game content is genuinely hard, especially at this scale. Otogi has a massive card roster with complex stat interactions, and the developers are clearly a fairly small team putting out a new event every single month. That's impressive.

It's also pretty clear from the data that the development team's primary language isn't English — which means English descriptions are probably the last thing getting reviewed before a patch ships. Most of the "visual" bugs are exactly that kind of issue: a localized description that's slightly off from the underlying data.

Don't pile on the devs over this. They're doing a lot with limited resources and the game is in a good place.

---

## TL;DR

- Bugs are opt-in via the "Show Bugs" checkbox
- Red = gameplay impact, Yellow = description mismatch
- Validate bugs yourself before reporting them to the developers
- The devs are doing a good job — these things happen
