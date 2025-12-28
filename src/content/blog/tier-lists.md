---
title: "Tier Lists: Methodology and How to Use Them"
description: "Understanding the simulation-based tier lists and what they can (and can't) tell you about building teams"
date: "2025-12-27"
author: "Araiak"
tags: ["guide", "tier-list", "analysis"]
---

## TL;DR

- Tiers measure **individual card strength in isolation**, not team synergy
- Use tiers to identify strong cards, then build synergies around them
- The +/-X% on card portraits shows performance vs baseline (comparable across roles)
- Diversify your buffs: damage + crit rate + crit damage beats stacking one stat

---

Tier lists are useful for getting started and level-setting expectations, but they have limits. A team of MLB cards with good synergy can clear all event content regardless of tier rankings. For competitive World Boss and Challenge rankings, you'll need to dig deeper into team composition yourself.

These tier lists answer one specific question: **how strong is this card in isolation?** This helps identify solid cards, but won't tell you if a card improves your specific team. Understanding synergies and availability requires more nuanced analysis that goes beyond what a simulation can measure.

## Methodology

We take a standard looking team of low tier max limit broken and level 90 cards, we strip their abilities and set them to always match your type (Divina, Anima, Phantasma). We force conditional abilities to be on like :card[1498], the test assumes that one of the Five Swords under Heaven is on the team or for :card[616] we have an elf on the team. Leaders go in the leader slot. We swap Melee for Melee, Ranged for Ranged, and Healer for Healer. Assists go on a melee in defensive tests and a ranged on offensive tests. This is to ensure that we paint each card in its best light, if you can't meet these conditions they will be weaker. The team that supports them is:

- :card[6]
- :card[6]
- :card[230]
- :card[266]
- :card[266]

These are older cards with lower stats.

Then we run some simulations, first is a 5 wave simulation, second is a 1 wave simulation, and last is a defensive simulation. In the offensive simulations we measure the total damage done. In the defensive simulation we have the enemy do 10% more damage every 10s until the team wipes and measures the time. We also measure the individual damage done in the 1 wave simulation for our greedy attacker tier.

The goal here is we can measure in isolation what the relative team value of each card is with the same baseline team. Now this isn't by any means perfect, you have one monster's worth of buffs and basically no real synergies. Teams that do the most damage thrive on synergies and multiplicative buffs like damage * crit * crit damage, etc.

Basically the goal with this tier list is if you were to grab 5 S-tier monsters you would probably have a good team, you might not have a great team, but none of those monsters would be bad, they just may not synergize with one another.

## Cards That May Be Under/Overweight

Some cards may be under/overweight because the supporting team in the simulation uses baseline cards with minimal synergies.

**Healer skills are underweight.** The simulation uses AUTO logic, which deprioritizes heals and buffs behind damage skills. More significantly, the game has a hidden energy system where units build energy through auto attacks or heals before triggering their skills. Healers typically have higher speed, which means they generate energy slower relative to their attack frequency and use their skills less often in AUTO mode. You can observe this in long fights using AUTO - healers frequently show lower skill usage counts because they're not triggering skills as often. Manual play that prioritizes healer skills would show better results than the simulation suggests.

For example :card[549] is probably underweight here because adding base stats to weak monsters makes them less weak, but the effect doesn't get the multiplicative effect from other boosts in your team. :card[1307] and :card[1494] are probably underweight because there aren't any synergistic boosts for these cards to benefit from. :card[580] or any card with XP, drop rate, soulstones are underweight because these aren't measured in any way by the simulation. DoTs are probably overweight because these aren't fully implemented, but these aren't very strong in simulation or in game so this may not be super relevant. CC effects also are not fully implemented, they are all implemented as a generic stun, but these again are only relevant in the defensive sim and not super impactful.

## How to Use This List as a New Player

If you are a new player and you are looking for how to use this list, my suggestion would be, try to get a high tier greedy attacker or pick one you have in your friends list, and then start trying to build around that monster in the same attribute. You want "strong" monsters, so ones that have higher ratings, but you want to diversify the kinds of buffs they give to the team. Try to get damage boosts, crit boosts, crit damage boosts, etc. If you get 5 cards that all increase damage your team will be good, but it won't be as good as a team that spreads damage, crit rate, crit damage, attack speed, and skill damage boosts across the team in the right ratios. The tier list doesn't take into account these synergies, availability, etc. But if you have gotten that far you don't need a tier list telling you how to build your team!

The simulation isn't perfect - it's roughly 80% accurate. The remaining 20% involves edge cases and complex interactions that require significantly more work to model. For most team-building decisions, this level of accuracy is sufficient.

## Tier Definitions

Here are the tiers for each test, these are based on the mean and standard deviation meaning that cards that scored high showed significant value over the average card:

| Tier | Z-score | Meaning                           |
|------|---------|-----------------------------------|
| S+   | >= 3.0  | Elite outliers (3+ SD above mean) |
| S    | >= 2.0  | Exceptional (2-3 SD above mean)   |
| A    | >= 1.0  | Good (1-2 SD above mean)          |
| B    | >= 0.0  | Average (within 1 SD)             |
| C    | >= -1.0 | Below average                     |
| D    | < -1.0  | Poor                              |

## Understanding the Different Tier Types

**Role-Normalized Tiers (5-Round, 1-Round, Defense, Overall):** These tiers compare cards within their own role. A B-tier Melee is compared only to other Melee cards, not to Ranged or Healers. This makes the tiers useful for answering "is this card good for its role?" but means an S-tier Healer isn't directly comparable to an S-tier Ranged. However, the +/-X% shown on card portraits represents performance vs the baseline team, so you can compare that number across roles to see relative impact.

**Globally-Normalized Tier (Individual DPS):** This tier compares all damage dealers (Melee and Ranged) against each other globally. It answers "who does the most damage regardless of role?" Healers and Assists are excluded since they aren't meant to be damage dealers.

**Reserve Tier:** This measures how much a card contributes when placed in the reserve slot (passive abilities only). It's role-normalized and helps you pick strong reserve supports.

Overall score takes a p-normalization of those scores, the goal of this is to highlight cards that are exceptional in one or more of the tests. Some of the super defensive cards will probably have higher tiers than people expect! I think that is ok, the best use of the tier ratings are to look at the categories based on what your team needs. If you are having trouble surviving in story or challenge look at the defensive, if you need something that contributes a lot of damage in longer fights look at 5-round.

---

*Check out the [Tier Lists](/en/tiers) page to see the full rankings!*
