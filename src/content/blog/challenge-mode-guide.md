---
title: "Challenge Mode: Pushing to Level 100"
description: "A guide to building teams for Endless/Challenge mode, covering key abilities and card recommendations for high floor progression"
date: "2025-12-16"
author: "Araiak"
tags: ["guide"]
---

I saw today that I have a MLB Harvest Moon on my friends list and had been thinking about doing a run for level 100 in Endless/Challenge mode. My current limit is level 90, but this is without fully optimizing my team. I thought maybe it would be helpful to some to have a quick guide on the current state of challenge, or what makes a good team for pushing.

Keep in mind this is probably not the optimal way to do Endless mode. Optimal is to get in, run 33/34 points 3x in 7-10 minutes. A full run is going to take hours and may overcap your SP. In any case, let's go over the key goals for a run based on the public rankings. Note that public rankings are in order, so lower runs are more modern and earlier runs were some of the first teams able to do Endless.

## Tower Scaling

| Floor | HP Multiplier | ATK Multiplier | Skill Multiplier | Shield |
|-------|---------------|----------------|------------------|--------|
| 1     | 1x            | 0.3x           | 0.1x             | 6%     |
| 10    | 10x           | 0.52x          | 0.16x            | 8.9%   |
| 20    | 22x           | 0.87x          | 0.24x            | 13.1%  |
| 30    | 44x           | 1.36x          | 0.36x            | 18.4%  |
| 40    | 99x           | 2.49x          | 0.62x            | 27.1%  |
| 50    | 191x          | 3.67x          | 1.02x            | 41.1%  |
| 60    | 354x          | 5.26x          | 1.42x            | 59.9%  |
| 70    | 623x          | 7.32x          | 1.82x            | 75% cap |
| 80    | 1,041x        | 9.90x          | 2.22x            | 75%    |
| 90    | 1,659x        | 13.03x         | 2.62x            | 75%    |
| 100   | 2,531x        | 16.71x         | 3.02x            | 75%    |

Bosses have additional multipliers.

## Team Composition Basics

Most teams run 2 healers, 1-2 carries, and 1 tank of some sort.

You will notice three key ability requirements to finish or push Endless:
- **+damage at the start of wave**
- **+maximum HP at the start of wave**
- **+a bit more defense** (various options for this)

There are other nice-to-have abilities like crit rate per wave or crit damage per wave. These increase clear speed and decrease risk by reducing time spent on each floor, but they aren't required as you will hit damage cap on damage per wave alone. Crit rate is highly recommended - without it you may want some unit that self-boosts its skill damage or team skill damage, or you're in for a long run.

The reason for this is pretty clear: the things that tank runs are generally large crits or multiple criticals in a small window to a single character, breaking your front line or healer. Other reasons you might fail include being unable to burn through enemy healers' healing in late rounds, or having units fall during CC.

Once you have your max HP boosters, and progression damage abilities covered you want to primary throw as much as you can at survivability, until you can live level 100, and then stack any additional bond slots to add more damage ramp to go faster.

## Key Cards by Role

Let's identify required cards that cover these niches. This assumes they have the relevant abilities unlocked.

### +Damage at the Start of Wave

#### Team Boosts

:filter["?ability=DMG+Boost%2CTeam%2CWave+Start"]

:card[744] is an Anima Ranged unit that increases damage 15% per wave unconditionally and is available in the standard gacha pool. She is a great choice for reserve even for non-Anima teams, and may be better in reserve even for Anima teams due to her low base skill damage.

:card[740] is a Phantasma Ranged that increases Phantasma damage 10% per wave and is an excellent choice for Phantasma teams due to being a strong unit by himself with a strong skill, high attack, and the ability making him core. He is not available.

#### Progressive Damage Assists

:filter["?type=Assist&ability=DMG+Boost%2CWave+Start"]

:card[728] boosts both damage and crit damage at MLB so he can be a stand-in for a lack of damage boosters, or a way to increase clear speed.

*Note: If you have :card[744] or :card[740] you should focus mostly on defensive assists.*

### +Maximum HP at Start of Wave

:filter["?ability=Wave+Start%2CMax+HP"]

:card[2373] is a Phantasma Healer that boosts Phantasma max HP 4% per wave. Available in the standard pool.

:card[583] is an Anima Healer that boosts Anima max HP 2% per wave, with an additional DR which is nice to have. Available in the standard pool.

:card[599] is a Phantasma Melee unit that boosts Phantasma max HP 2% per wave. Available in the standard pool.

:card[658] is a Divina Ranged unit that boosts Divina max HP 2% per wave. He is not available.

### +Defensive Options

#### Debuffers

##### Attack Speed Down

:filter["?ability=Wave+Start%2CSlow"]

##### Damage Down

:filter["?ability=Wave+Start%2CEnemy+DMG+Down"]

#### Buffers (Damage Reduction)

##### Divina

:filter["?ability=DMG+Reduction%2CDivina"]

##### Anima

:filter["?ability=DMG+Reduction%2CAnima"]

##### Phantasma

:filter["?ability=DMG+Reduction%2CPhantasma"]

### +Crit Rate at Start of Wave

#### Divina

:filter["?ability=Crit+Rate%2CDivina%2CWave+Start"]

:card[1494] is a Divina reserve that will boost crit rate to 100% by wave 14, reducing clear time. She is not available.

#### Phantasma

:filter["?ability=Crit+Rate%2CWave+Start%2CPhantasma"]

:card[1307] is a Phantasma reserve that will boost crit rate to 100% by wave 10, significantly reducing clear time. She is not available.

#### Anima

:filter["?ability=Crit+Rate%2CWave+Start%2CAnima"]

## Additional Recommendations

It can also be nice to have some progressive skill AoE attackers, as killing off the smaller enemies reduces your risk a lot in later waves.

:filter["?skill=DMG%2CAoE&ability=Wave+Start%2CSkill+DMG"]
:filter["?skill=DMG%2CMulti&ability=Wave+Start%2CSkill+DMG"]

## Sample Teams

So let's make a few teams focusing on cards that are available now, or only rely on a single helper.  These aren't ideal teams, but these should be able to hit level 90+, adding in some limited cards you already have or future (e.g. :card[1437]) or using defensive assists should enable these teams to go quite far.  Cards that are not marked required are very flexible.

### Anima Team

:team["req=583,583&opt=671,712,586"]:reserve["req=744&opt=634"]

*Note: Two copies of :card[583] are required - one at lv. 85, one at lv. 70 (seal from MLB).  One can be moved to reserve for a different healer.*

### Phantasma Team

:team["req=2373,740&opt=526,603,628"]:reserve["opt=634,208"]

*Note: :card[740] is highly recommended and while not generally available, is fairly common to borrow from a friend!  Alternative is :card[744] in reserve.*

---

*This guide focuses on pushing to high floors. For optimal SP farming, short runs of 33-34 points are more efficient. Play how you like!*
