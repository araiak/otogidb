---
title: "Tier Lists: Methodology and How to Use Them"
description: "Understanding the simulation-based tier lists and what they can (and can't) tell you about building teams"
date: "2025-12-27"
author: "Araiak"
tags: ["guide", "tier-list", "analysis"]
---

Tier lists. So let's get it out of the way right up front. You don't need a tier list, a team of MLB monsters with any sort of synergy can beat all of the event content. World Boss and Challenge are specialized to the point tier lists are not going to get you to the top ranks, you are going to have to do some of that work yourself. The tier lists presented here are also intended to only answer one question, and that question does not align with how you get to the best team. You need a more subjective tier list to understand the intricacies of availability and synergies to get the best possible teams, and I'm not high enough ranked to give you that information accurately. This tier list just seeks to answer how strong this card is in isolation. That is helpful for getting started, it's helpful for level setting, but it won't tell you if a card is going to improve your team or not.

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

Some things also may be under/overweight because the supporting team in the sim is, well, kinda bad.

For example :card[549] is probably underweight here because adding base stats to weak monsters makes them less weak, but the effect doesn't get the multiplicative effect from other boosts in your team. :card[1307] and :card[1494] are probably underweight because there aren't any synergistic boosts for these cards to benefit from. :card[580] or any card with XP, drop rate, soulstones are underweight because these aren't measured in any way by the simulation. DoTs are probably overweight because these aren't fully implemented, but these aren't very strong in simulation or in game so this may not be super relevant. CC effects also are not fully implemented, they are all implemented as a generic stun, but these again are only relevant in the defensive sim and not super impactful.

## How to Use This List as a New Player

If you are a new player and you are looking for how to use this list, my suggestion would be, try to get a high tier greedy attacker or pick one you have in your friends list, and then start trying to build around that monster in the same attribute. You want "strong" monsters, so ones that have higher ratings, but you want to diversify the kinds of buffs they give to the team. Try to get damage boosts, crit boosts, crit damage boosts, etc. If you get 5 cards that all increase damage your team will be good, but it won't be as good as a team that spreads damage, crit rate, crit damage, attack speed, and skill damage boosts across the team in the right ratios. The tier list doesn't take into account these synergies, availability, etc. But if you have gotten that far you don't need a tier list telling you how to build your team!

I'll also add a note here, the sim isn't perfect. It is probably 80% accurate, but the last 20% is way more work and I think this looks accurate without your glasses on, so that might be as far as I get with it for a while.

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

Overall score takes a p-normalization of those scores, the goal of this is to highlight cards that are exceptional in one or more of the tests. Some of the super defensive cards will probably have higher tiers than people expect! I think that is ok, the best use of the tier ratings are to look at the categories based on what your team needs. If you are having trouble surviving in story or challenge look at the defensive, if you need something that contributes a lot of damage in longer fights look at 5-round.

---

*Check out the [Tier Lists](/en/tiers) page to see the full rankings!*
