---
title: "Challenge Mode: Pushing to Level 100"
description: "A guide to building teams for Endless/Challenge mode, covering key abilities and card recommendations for high floor progression"
date: "2025-12-16"
author: "Araiak"
tags: ["guide"]
---

<div data-lang="en">

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

</div>

<div data-lang="ja">

フレンドリストにMLBの秋の名月を持っているプレイヤーを発見し、エンドレス/チャレンジモードでレベル100達成のランについて考えていました。現在の私の限界はレベル90ですが、これはチームを完全に最適化していない状態です。チャレンジの現状や、押し上げに適したチームについて簡単なガイドがあると役立つかもしれないと思いました。

これはエンドレスモードの最適な方法ではないことに注意してください。最適なのは、7〜10分で33/34ポイントを3回稼ぐことです。フルランは何時間もかかり、SPが上限を超えることもあります。いずれにせよ、公開ランキングをもとに、ランの主要な目標を確認していきましょう。公開ランキングは順番通りなので、下の方のランがより最近のものであり、最初の方のランはエンドレスをクリアできた最初期のチームです。

## タワースケーリング

| 階層 | HP倍率 | ATK倍率 | スキル倍率 | シールド |
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

ボスにはさらに追加の倍率があります。

## チーム構成の基本

ほとんどのチームはヒーラー2体、キャリー1〜2体、タンク1体という構成で動きます。

エンドレスをクリアまたは押し上げるために必要な3つの主要な能力要件があります：
- **ウェーブ開始時のダメージ+**
- **ウェーブ開始時の最大HP+**
- **もう少しの防御力+**（これはさまざまな選択肢があります）

ウェーブごとのクリ率やウェーブごとのクリダメなど、あると便利な能力も存在します。これらはクリア速度を上げてリスクを下げるものですが、ウェーブごとのダメージだけでダメージ上限に達するため必須ではありません。ただし、クリ率は強く推奨されます。クリ率がないと、スキルダメージまたはチームのスキルダメージを自己強化できるユニットが必要になるか、長丁場のランになります。

その理由は明らかです。ランを崩す要因は、一般的に1体のキャラクターへの大きなクリットや短時間での複数クリットによってフロントラインやヒーラーが撃破されることです。失敗するその他の理由としては、終盤のラウンドで敵ヒーラーの回復を上回るダメージを出せなくなること、またはユニットがCC中に撃破されることなどが挙げられます。

最大HPブースターと進行ダメージ能力をそろえたら、レベル100を生き延びられるまで生存性を最大限に高めることを優先し、その後は追加の絆スロットを活用してダメージの上昇速度を上げていきましょう。

## 役割別の主要カード

これらのニッチをカバーするために必要なカードを特定しましょう。関連する能力が解放済みであることを前提とします。

### ウェーブ開始時のダメージ+

#### チームブースト

:filter["?ability=DMG+Boost%2CTeam%2CWave+Start"]

:card[744]はAnima遠距離ユニットで、無条件でウェーブごとにダメージを15%増加させ、スタンダードガチャプールで入手可能です。Anima以外のチームでもリザーブとして優秀な選択肢であり、基礎スキルダメージが低いためAnima チームでもリザーブに置く方が優れている場合があります。

:card[740]はPhantasma遠距離で、ウェーブごとにPhantasmaのダメージを10%増加させます。強力なユニット本体、強力なスキル、高いATK、そしてコアとなる能力を持つため、Phantasmaチームでは非常に優秀な選択肢です。入手不可です。

#### 進行ダメージアシスト

:filter["?type=Assist&ability=DMG+Boost%2CWave+Start"]

:card[728]はMLBでダメージとクリダメの両方をブーストするため、ダメージブースターの不足を補ったり、クリア速度を上げる手段として活用できます。

*注意：:card[744]または:card[740]を持っている場合は、防御面のアシストを中心に強化するとよいでしょう。*

### ウェーブ開始時の最大HP+

:filter["?ability=Wave+Start%2CMax+HP"]

:card[2373]はPhantasmaヒーラーで、ウェーブごとにPhantasmaの最大HPを4%ブーストします。スタンダードプールで入手可能です。

:card[583]はAnimaヒーラーで、ウェーブごとにAnimaの最大HPを2%ブーストし、さらにDRも持つため便利です。スタンダードプールで入手可能です。

:card[599]はPhantasma近接ユニットで、ウェーブごとにPhantasmaの最大HPを2%ブーストします。スタンダードプールで入手可能です。

:card[658]はDivina遠距離ユニットで、ウェーブごとにDivinaの最大HPを2%ブーストします。入手不可です。

### 防御オプション+

#### デバッファー

##### ATK速度ダウン

:filter["?ability=Wave+Start%2CSlow"]

##### ダメージダウン

:filter["?ability=Wave+Start%2CEnemy+DMG+Down"]

#### バッファー（ダメージ軽減）

##### Divina

:filter["?ability=DMG+Reduction%2CDivina"]

##### Anima

:filter["?ability=DMG+Reduction%2CAnima"]

##### Phantasma

:filter["?ability=DMG+Reduction%2CPhantasma"]

### ウェーブ開始時のクリ率+

#### Divina

:filter["?ability=Crit+Rate%2CDivina%2CWave+Start"]

:card[1494]はDivinaのリザーブで、ウェーブ14までにクリ率を100%に引き上げ、クリア時間を短縮します。入手不可です。

#### Phantasma

:filter["?ability=Crit+Rate%2CWave+Start%2CPhantasma"]

:card[1307]はPhantasmaのリザーブで、ウェーブ10までにクリ率を100%に引き上げ、クリア時間を大幅に短縮します。入手不可です。

#### Anima

:filter["?ability=Crit+Rate%2CWave+Start%2CAnima"]

## 追加の推奨事項

進行スキルのAoEアタッカーもいると便利です。小型の敵を倒すことで、後半のウェーブにおけるリスクが大幅に減少します。

:filter["?skill=DMG%2CAoE&ability=Wave+Start%2CSkill+DMG"]
:filter["?skill=DMG%2CMulti&ability=Wave+Start%2CSkill+DMG"]

## サンプルチーム

現在入手可能なカード、またはヘルパー1体のみに依存するチームをいくつか組んでみましょう。これらは理想的なチームではありませんが、レベル90以上に到達できるはずです。すでに持っている限定カードや今後のカード（例：:card[1437]）を追加したり、防御面のアシストを使用することで、これらのチームはさらに高い階層まで到達できます。「必須」と記されていないカードは非常に柔軟に入れ替え可能です。

### Animaチーム

:team["req=583,583&opt=671,712,586"]:reserve["req=744&opt=634"]

*注意：:card[583]が2枚必要です。1枚はlv. 85、もう1枚はlv. 70（MLBからの封印）。1枚は別のヒーラーのためにリザーブに移動することも可能です。*

### Phantasmaチーム

:team["req=2373,740&opt=526,603,628"]:reserve["opt=634,208"]

*注意：:card[740]は強く推奨されます。一般的には入手不可ですが、フレンドから借りることができる場合が多いです！代替としてリザーブに:card[744]を使用する方法もあります。*

---

*このガイドは高階層への押し上げに焦点を当てています。SP効率を最大化するには、33〜34ポイントの短いランの方が効率的です。好きなスタイルでプレイしてください！*

</div>

<div data-lang="ko">

오늘 친구 목록에서 MLB 추수달을 가진 플레이어를 발견했고, 엔드리스/챌린지 모드에서 레벨 100 달성을 위한 공략을 해볼까 생각하고 있었습니다. 현재 제 한계는 레벨 90이지만, 팀을 완전히 최적화하지 않은 상태입니다. 챌린지의 현황이나 고층 공략을 위한 좋은 팀 구성에 대해 간단한 가이드가 도움이 될 것 같다고 생각했습니다.

이것이 엔드리스 모드의 최적 방법은 아닐 수 있다는 점을 염두에 두세요. 최적은 7~10분 안에 33/34포인트를 3회 반복하는 것입니다. 풀 런은 몇 시간이 걸릴 수 있으며 SP가 초과될 수도 있습니다. 어쨌든, 공개 랭킹을 기반으로 런의 핵심 목표를 살펴봅시다. 공개 랭킹은 순서대로 표시되므로, 하단의 런은 더 최근 것이고 상단의 초기 런은 엔드리스를 처음 클리어한 팀들입니다.

## 타워 스케일링

| 층 | HP 배율 | ATK 배율 | 스킬 배율 | 실드 |
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

보스에게는 추가 배율이 적용됩니다.

## 팀 구성 기본

대부분의 팀은 힐러 2명, 캐리 1~2명, 탱커 1명으로 구성됩니다.

엔드리스를 클리어하거나 고층을 공략하기 위해 필요한 세 가지 핵심 능력 요건이 있습니다:
- **웨이브 시작 시 +피해량**
- **웨이브 시작 시 +최대 HP**
- **+약간의 방어력** (다양한 옵션 존재)

웨이브당 치명타율 또는 웨이브당 치명타 피해처럼 있으면 좋은 능력들도 있습니다. 이런 능력들은 각 층에서 소요되는 시간을 줄여 클리어 속도를 높이고 위험을 낮춰주지만, 웨이브당 피해량만으로도 피해 상한에 도달할 수 있으므로 필수는 아닙니다. 치명타율은 강력히 권장됩니다 — 없다면 스킬 피해 또는 팀 스킬 피해를 자체 강화하는 유닛이 있어야 할 수 있으며, 그렇지 않으면 런이 매우 오래 걸릴 수 있습니다.

그 이유는 꽤 명확합니다: 런을 망치는 주요 원인은 일반적으로 단일 캐릭터에게 짧은 시간 내에 발생하는 큰 치명타 또는 연속 치명타로 인한 전열이나 힐러의 붕괴입니다. 그 외 실패 원인으로는 후반 라운드에서 적 힐러의 회복을 돌파하지 못하거나, CC 중에 유닛이 쓰러지는 경우가 있습니다.

최대 HP 강화 능력과 누적 피해 능력을 확보했다면, 레벨 100을 버틸 수 있을 때까지 생존력에 최대한 집중하고, 이후에는 추가 결속 슬롯으로 피해 증가를 쌓아 속도를 높이세요.

## 역할별 핵심 카드

이러한 역할을 담당하는 필수 카드를 살펴봅시다. 해당 능력이 해금된 것을 전제로 합니다.

### 웨이브 시작 시 +피해량

#### 팀 강화

:filter["?ability=DMG+Boost%2CTeam%2CWave+Start"]

:card[744]는 Anima 원거리 유닛으로, 조건 없이 웨이브당 피해량 15%를 증가시키며 일반 가챠 풀에서 입수 가능합니다. Anima가 아닌 팀에서도 리저브로 훌륭한 선택이며, 기본 스킬 피해가 낮아 Anima 팀에서도 리저브로 활용하는 것이 더 나을 수 있습니다.

:card[740]는 Phantasma 원거리 유닛으로, Phantasma 피해량을 웨이브당 10% 증가시키며 강력한 유닛 자체 성능, 강한 스킬, 높은 ATK, 그리고 핵심 능력을 갖춰 Phantasma 팀에 탁월한 선택입니다. 입수 불가입니다.

#### 누적 피해 어시스트

:filter["?type=Assist&ability=DMG+Boost%2CWave+Start"]

:card[728]는 MLB 시 피해량과 치명타 피해를 모두 강화하므로, 피해 강화 유닛이 부족할 때 대체재로 활용하거나 클리어 속도를 높이는 데 사용할 수 있습니다.

*참고：:card[744] 또는 :card[740]이 있다면 방어 어시스트에 주로 집중하는 것이 좋습니다.*

### 웨이브 시작 시 +최대 HP

:filter["?ability=Wave+Start%2CMax+HP"]

:card[2373]는 Phantasma 힐러로, Phantasma 최대 HP를 웨이브당 4% 증가시킵니다. 일반 가챠 풀에서 입수 가능합니다.

:card[583]는 Anima 힐러로, Anima 최대 HP를 웨이브당 2% 증가시키며 추가로 DR 효과도 있어 유용합니다. 일반 가챠 풀에서 입수 가능합니다.

:card[599]는 Phantasma 근거리 유닛으로, Phantasma 최대 HP를 웨이브당 2% 증가시킵니다. 일반 가챠 풀에서 입수 가능합니다.

:card[658]는 Divina 원거리 유닛으로, Divina 최대 HP를 웨이브당 2% 증가시킵니다. 입수 불가입니다.

### +방어 옵션

#### 디버퍼

##### 공격 속도 감소

:filter["?ability=Wave+Start%2CSlow"]

##### 피해량 감소

:filter["?ability=Wave+Start%2CEnemy+DMG+Down"]

#### 버퍼 (피해 감소)

##### Divina

:filter["?ability=DMG+Reduction%2CDivina"]

##### Anima

:filter["?ability=DMG+Reduction%2CAnima"]

##### Phantasma

:filter["?ability=DMG+Reduction%2CPhantasma"]

### 웨이브 시작 시 +치명타율

#### Divina

:filter["?ability=Crit+Rate%2CDivina%2CWave+Start"]

:card[1494]는 Divina 리저브 유닛으로, 14웨이브까지 치명타율을 100%로 끌어올려 클리어 시간을 단축합니다. 입수 불가입니다.

#### Phantasma

:filter["?ability=Crit+Rate%2CWave+Start%2CPhantasma"]

:card[1307]는 Phantasma 리저브 유닛으로, 10웨이브까지 치명타율을 100%로 끌어올려 클리어 시간을 크게 단축합니다. 입수 불가입니다.

#### Anima

:filter["?ability=Crit+Rate%2CWave+Start%2CAnima"]

## 추가 권장 사항

후반 웨이브에서 소형 적을 처치하면 위험이 크게 줄어들기 때문에, 누적 스킬 AoE 공격 유닛을 보유하는 것도 좋습니다.

:filter["?skill=DMG%2CAoE&ability=Wave+Start%2CSkill+DMG"]
:filter["?skill=DMG%2CMulti&ability=Wave+Start%2CSkill+DMG"]

## 샘플 팀

현재 입수 가능하거나 단 한 명의 헬퍼에만 의존하는 카드를 중심으로 몇 가지 팀을 구성해 봅시다. 이상적인 팀은 아니지만 레벨 90 이상은 충분히 달성할 수 있으며, 이미 보유한 한정 카드를 추가하거나 미래 카드(예: :card[1437])를 활용하거나 방어 어시스트를 사용하면 훨씬 더 높은 층까지 공략할 수 있습니다. 필수 표시가 없는 카드는 매우 유동적으로 교체 가능합니다.

### Anima 팀

:team["req=583,583&opt=671,712,586"]:reserve["req=744&opt=634"]

*참고：:card[583] 두 장이 필요합니다 — 한 장은 lv. 85, 다른 한 장은 lv. 70(MLB 봉인)으로. 한 장은 다른 힐러를 위해 리저브로 이동할 수 있습니다.*

### Phantasma 팀

:team["req=2373,740&opt=526,603,628"]:reserve["opt=634,208"]

*참고：:card[740]은 강력히 권장되며, 일반적으로 입수 불가이지만 친구에게서 빌리는 것은 꽤 흔한 일입니다! 대안으로는 리저브에 :card[744]를 사용하세요.*

---

*이 가이드는 고층 공략에 초점을 맞추고 있습니다. 최적의 SP 파밍을 원한다면 33~34포인트의 단거리 런이 더 효율적입니다. 원하는 방식으로 즐기세요!*

</div>

<div data-lang="zh-cn">

我今天注意到好友列表里有人拥有满破的丰收月，于是开始考虑在无尽模式/挑战模式中冲到100层。我目前的极限是90层，但这是在没有完全优化队伍的情况下达成的。我想这对某些人来说也许会有帮助——来简单介绍一下挑战模式的当前状态，以及什么样的队伍适合用来冲层。

请注意，这可能并非无尽模式的最优打法。最优方式是进去刷33/34分，3次仅需7-10分钟。完整一轮可能需要数小时，而且可能会让你的SP溢出。不管怎样，我们来根据公开排名梳理一下一轮完整挑战的核心目标。请注意公开排名是按顺序排列的，越靠后的记录越新，越靠前的是最早能完成无尽的队伍。

## 塔层倍率

| 楼层 | HP倍率 | ATK倍率 | 技能倍率 | 护盾 |
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

Boss还有额外倍率加成。

## 队伍构成基础

大多数队伍采用2名治疗者、1-2个输出位，以及某种形式的坦克。

你会发现，要完成或持续推进无尽模式，有三个关键能力需求：
- **每波次开始时+伤害**
- **每波次开始时+最大HP**
- **+一些额外防御**（多种选项可用）

还有一些加分项，例如每波次的暴击率或暴击伤害加成。这些能缩短清层时间，减少在每层停留的时间，从而降低风险，但并非必需——单靠每波次伤害加成就能达到伤害上限。强烈推荐加暴击率——没有的话，你可能需要某个能自身或团队技能伤害加成的单位，否则一轮会打得相当漫长。

原因显而易见：导致挑战失败的主要原因通常是大暴击，或在短时间内对单一角色发生多次暴击，导致你的前排或治疗者倒下。其他可能失败的原因还包括：在后期无法快速消耗敌方治疗者的回复量，或者单位在CC期间倒地。

一旦你的最大HP加成和进阶伤害能力都到位了，接下来要优先堆叠尽可能多的生存能力，直到能撑过100层，之后再利用额外的羁绊槽位增加更多的伤害递增来加快速度。

## 各职能关键卡牌

我们来梳理一下覆盖这些职能所需的关键卡牌。以下假设相关能力已解锁。

### 每波次开始时+伤害

#### 团队加成

:filter["?ability=DMG+Boost%2CTeam%2CWave+Start"]

:card[744] 是一名Anima远程单位，无条件每波次提升15%伤害，可在常驻池获取。即使对非Anima队伍，她作为后备也是极佳选择；即便是Anima队伍，由于她的基础技能伤害较低，放后备可能也比上场更好。

:card[740] 是一名Phantasma远程单位，每波次提升Phantasma伤害10%，对于Phantasma队伍是极佳之选——他本身实力强劲，技能强力，ATK高，加之该能力使他成为核心。他目前不可获取。

#### 进阶伤害辅助

:filter["?type=Assist&ability=DMG+Boost%2CWave+Start"]

:card[728] 在MLB时同时提升伤害和暴击伤害，可以弥补伤害加成单位的不足，或用来提升清层速度。

*注意：如果你已有 :card[744] 或 :card[740]，应将重心放在防御型辅助上。*

### 每波次开始时+最大HP

:filter["?ability=Wave+Start%2CMax+HP"]

:card[2373] 是一名Phantasma治疗者，每波次提升Phantasma最大HP 4%。可在常驻池获取。

:card[583] 是一名Anima治疗者，每波次提升Anima最大HP 2%，并附带额外DR加成，非常实用。可在常驻池获取。

:card[599] 是一名Phantasma近战单位，每波次提升Phantasma最大HP 2%。可在常驻池获取。

:card[658] 是一名Divina远程单位，每波次提升Divina最大HP 2%。他目前不可获取。

### +防御选项

#### 减益类

##### 攻击速度降低

:filter["?ability=Wave+Start%2CSlow"]

##### 伤害降低

:filter["?ability=Wave+Start%2CEnemy+DMG+Down"]

#### 增益类（伤害减免）

##### Divina

:filter["?ability=DMG+Reduction%2CDivina"]

##### Anima

:filter["?ability=DMG+Reduction%2CAnima"]

##### Phantasma

:filter["?ability=DMG+Reduction%2CPhantasma"]

### 每波次开始时+暴击率

#### Divina

:filter["?ability=Crit+Rate%2CDivina%2CWave+Start"]

:card[1494] 是一名Divina后备单位，到第14波次时可将暴击率提升至100%，从而缩短清层时间。她目前不可获取。

#### Phantasma

:filter["?ability=Crit+Rate%2CWave+Start%2CPhantasma"]

:card[1307] 是一名Phantasma后备单位，到第10波次时可将暴击率提升至100%，大幅缩短清层时间。她目前不可获取。

#### Anima

:filter["?ability=Crit+Rate%2CWave+Start%2CAnima"]

## 额外推荐

拥有一些渐进式技能AoE攻击单位也很有帮助，因为在后期波次中消灭小怪能大幅降低风险。

:filter["?skill=DMG%2CAoE&ability=Wave+Start%2CSkill+DMG"]
:filter["?skill=DMG%2CMulti&ability=Wave+Start%2CSkill+DMG"]

## 示例队伍

下面我们来组几支以当前可获取卡牌为主，或仅依赖单张助手的队伍。这些并非理想队伍，但应该能够达到90层以上。加入一些你已有的限定卡，或未来的卡牌（例如 :card[1437]），或使用防御型辅助，应能让这些队伍走得更远。未标注为必选的卡牌具有较高灵活性。

### Anima队伍

:team["req=583,583&opt=671,712,586"]:reserve["req=744&opt=634"]

*注意：需要两张 :card[583]——一张lv. 85，一张lv. 70（MLB封印所得）。其中一张可移至后备替换为其他治疗者。*

### Phantasma队伍

:team["req=2373,740&opt=526,603,628"]:reserve["opt=634,208"]

*注意：强烈推荐 :card[740]，虽然通常不可获取，但从好友处借用还是相当常见的！替代方案是将 :card[744] 放入后备。*

---

*本指南专注于冲高层。如需最优SP刷取，短局刷33-34分更为高效。按你喜欢的方式玩吧！*

</div>

<div data-lang="zh-tw">

我今天注意到朋友清單中有人擁有MLB的豐收月，便一直在考慮在無盡模式/挑戰模式中挑戰100層。我目前的上限是90層，但這是在未完全優化隊伍的情況下達成的。我認為或許能提供一份關於挑戰現況的快速指南，或者說明什麼樣的隊伍適合推關，對某些玩家會有所幫助。

請記住，這可能不是進行無盡模式的最佳方式。最佳方式是進入後，在7至10分鐘內三次取得33/34點。完整跑一局會花費數小時，且可能會讓你的SP溢出。不管如何，讓我們根據公開排名來了解一局的關鍵目標。請注意，公開排名是按順序排列的，較靠後的紀錄較新，較早的紀錄則是最初能夠完成無盡模式的隊伍之一。

## 塔層縮放

| 樓層 | HP倍率 | ATK倍率 | 技能倍率 | 護盾 |
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

首領有額外的倍率加成。

## 隊伍組成基礎

大多數隊伍的配置為2名治療者、1至2名輸出位，以及某種形式的坦克。

你會發現完成或推進無盡模式有三項關鍵能力需求：
- **波次開始時提升傷害**
- **波次開始時提升最大HP**
- **額外的一點防禦力**（有多種選擇）

其他加分能力包括每波次提升暴擊率或暴擊傷害。這些能力可以加快清關速度，並透過減少每層消耗的時間來降低風險，但並非必需，因為單憑每波次的傷害提升就能達到傷害上限。強烈建議提升暴擊率——若沒有暴擊率加成，你可能需要某個能自我提升技能傷害或提升隊伍技能傷害的角色，否則將會是一場漫長的挑戰。

原因很明顯：通常導致挑戰失敗的原因，是對單一角色造成大型暴擊或在短時間內連續多次暴擊，擊潰你的前排或治療者。其他可能失敗的原因包括：在後期回合中無法消耗掉敵方治療者的回復量，或是角色在CC期間倒下。

一旦你配置好最大HP加成和持續傷害能力，就應該盡可能地將資源投入生存能力，直到能夠撐過100層；之後再利用額外的羈絆槽位增加更多傷害爬升速度。

## 關鍵角色分類

讓我們來找出涵蓋這些定位的必要角色。以下假設他們已解鎖相關能力。

### 波次開始時提升傷害

#### 隊伍加成

:filter["?ability=DMG+Boost%2CTeam%2CWave+Start"]

:card[744] 是一名Anima遠程角色，能無條件地每波次提升15%傷害，且可在常駐池中取得。她即使對非Anima隊伍來說也是備用的好選擇，甚至對Anima隊伍而言放在備用位可能也更好，因為她的基礎技能傷害較低。

:card[740] 是一名Phantasma遠程角色，能每波次提升Phantasma傷害10%，對於Phantasma隊伍而言是絕佳選擇——他本身就是強力角色，技能出色、ATK高，加上這項能力使他成為核心成員。他目前無法取得。

#### 進階傷害輔助

:filter["?type=Assist&ability=DMG+Boost%2CWave+Start"]

:card[728] 在MLB時同時提升傷害和暴擊傷害，可作為缺乏傷害加成者的替代方案，或用來加快清關速度。

*注意：若你擁有 :card[744] 或 :card[740]，應將重心放在防禦型輔助上。*

### 波次開始時提升最大HP

:filter["?ability=Wave+Start%2CMax+HP"]

:card[2373] 是一名Phantasma治療者，能每波次提升Phantasma最大HP 4%。可在常駐池中取得。

:card[583] 是一名Anima治療者，能每波次提升Anima最大HP 2%，並附帶額外DR，相當實用。可在常駐池中取得。

:card[599] 是一名Phantasma近戰角色，能每波次提升Phantasma最大HP 2%。可在常駐池中取得。

:card[658] 是一名Divina遠程角色，能每波次提升Divina最大HP 2%。他目前無法取得。

### 防禦選項

#### 削弱型

##### 攻擊速度降低

:filter["?ability=Wave+Start%2CSlow"]

##### 傷害降低

:filter["?ability=Wave+Start%2CEnemy+DMG+Down"]

#### 增益型（傷害減免）

##### Divina

:filter["?ability=DMG+Reduction%2CDivina"]

##### Anima

:filter["?ability=DMG+Reduction%2CAnima"]

##### Phantasma

:filter["?ability=DMG+Reduction%2CPhantasma"]

### 波次開始時提升暴擊率

#### Divina

:filter["?ability=Crit+Rate%2CDivina%2CWave+Start"]

:card[1494] 是一名Divina備用角色，能在第14波次前將暴擊率提升至100%，縮短清關時間。她目前無法取得。

#### Phantasma

:filter["?ability=Crit+Rate%2CWave+Start%2CPhantasma"]

:card[1307] 是一名Phantasma備用角色，能在第10波次前將暴擊率提升至100%，大幅縮短清關時間。她目前無法取得。

#### Anima

:filter["?ability=Crit+Rate%2CWave+Start%2CAnima"]

## 額外建議

擁有一些具有漸進式技能AoE攻擊的角色也很有幫助，因為消滅較小的敵人能在後期波次中大幅降低風險。

:filter["?skill=DMG%2CAoE&ability=Wave+Start%2CSkill+DMG"]
:filter["?skill=DMG%2CMulti&ability=Wave+Start%2CSkill+DMG"]

## 範例隊伍

那麼，讓我們來組建幾支以目前可取得的角色為主，或僅依賴單一助手的隊伍。這些並不是理想隊伍，但應該能夠達到90層以上；加入你已擁有的限定角色、未來角色（例如 :card[1437]），或使用防禦型輔助，應能讓這些隊伍走得更遠。未標記為必需的角色具有很高的靈活性。

### Anima隊伍

:team["req=583,583&opt=671,712,586"]:reserve["req=744&opt=634"]

*注意：需要兩張 :card[583]——一張在lv. 85，一張在lv. 70（MLB的封印版）。其中一張可移至備用位替換為其他治療者。*

### Phantasma隊伍

:team["req=2373,740&opt=526,603,628"]:reserve["opt=634,208"]

*注意：強烈推薦 :card[740]，雖然一般無法取得，但向朋友借用相當常見！替代方案是將 :card[744] 放入備用位。*

---

*本指南專注於推進高樓層。若要最佳化SP農場效率，跑33至34點的短局更為高效。按照你喜歡的方式遊玩吧！*

</div>

<div data-lang="es">

Vi hoy que tengo a un Harvest Moon con MLB en mi lista de amigos y había estado pensando en hacer una corrida para llegar al nivel 100 en modo Endless/modo Desafío. Mi límite actual es el nivel 90, pero esto es sin optimizar completamente mi equipo. Pensé que podría ser útil para algunos tener una guía rápida sobre el estado actual del modo Desafío, o qué hace a un buen equipo para avanzar.

Ten en cuenta que probablemente esta no es la forma óptima de hacer el modo Endless. Lo óptimo es entrar, hacer 33/34 puntos 3 veces en 7-10 minutos. Una corrida completa va a tomar horas y puede que supere tu límite de SP. En cualquier caso, repasemos los objetivos clave para una corrida basándonos en los rankings públicos. Ten en cuenta que los rankings públicos están en orden, por lo que las corridas más bajas son más recientes y las más antiguas fueron algunos de los primeros equipos capaces de hacer el modo Endless.

## Escalado de la Torre

| Piso | Multiplicador de HP | Multiplicador de ATK | Multiplicador de Habilidad | Escudo |
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

Los jefes tienen multiplicadores adicionales.

## Fundamentos de Composición de Equipo

La mayoría de los equipos usan 2 sanadores, 1-2 carries y 1 tanque de algún tipo.

Notarás tres requisitos clave de habilidades para terminar o avanzar en el modo Endless:
- **+daño al inicio de la oleada**
- **+HP máximo al inicio de la oleada**
- **+un poco más de defensa** (varias opciones para esto)

Hay otras habilidades convenientes, como tasa de crítico por oleada o daño crítico por oleada. Estas aumentan la velocidad de limpieza y reducen el riesgo al disminuir el tiempo en cada piso, pero no son obligatorias ya que alcanzarás el límite de daño solo con daño por oleada. La tasa de crítico es muy recomendable — sin ella, puede que quieras alguna unidad que potencie su propio daño de habilidad o el daño de habilidad del equipo, o te espera una corrida larga.

La razón es bastante clara: lo que arruina las corridas generalmente son críticos grandes o múltiples críticos en una ventana pequeña contra un solo personaje, rompiendo tu línea frontal o sanador. Otras razones por las que podrías fallar incluyen no poder superar la curación de los sanadores enemigos en rondas avanzadas, o tener unidades que caigan durante un CC.

Una vez que tengas tus potenciadores de HP máximo y las habilidades de daño progresivo cubiertas, lo ideal es invertir todo lo que puedas en supervivencia hasta poder sobrevivir el nivel 100, y luego acumular cualquier slot de vínculo adicional para agregar más rampa de daño y avanzar más rápido.

## Cartas Clave por Rol

Identifiquemos las cartas necesarias que cubren estos nichos. Esto asume que tienen las habilidades relevantes desbloqueadas.

### +Daño al Inicio de la Oleada

#### Potenciadores de Equipo

:filter["?ability=DMG+Boost%2CTeam%2CWave+Start"]

:card[744] es una unidad a distancia Anima que aumenta el daño un 15% por oleada de forma incondicional y está disponible en el pool estándar de gacha. Es una excelente opción para la reserva incluso en equipos que no son Anima, y puede ser mejor en reserva incluso para equipos Anima debido a su bajo daño de habilidad base.

:card[740] es una unidad a distancia Phantasma que aumenta el daño Phantasma un 10% por oleada y es una excelente opción para equipos Phantasma por ser una unidad fuerte por sí mismo con una habilidad poderosa, alto ataque y la habilidad que lo hace esencial. No está disponible.

#### Asistentes de Daño Progresivo

:filter["?type=Assist&ability=DMG+Boost%2CWave+Start"]

:card[728] potencia tanto el daño como el daño crítico con MLB, por lo que puede ser un sustituto ante la falta de potenciadores de daño, o una forma de aumentar la velocidad de limpieza.

*Nota: Si tienes :card[744] o :card[740], deberías enfocarte principalmente en asistentes defensivos.*

### +HP Máximo al Inicio de la Oleada

:filter["?ability=Wave+Start%2CMax+HP"]

:card[2373] es una sanadora Phantasma que aumenta el HP máximo Phantasma un 4% por oleada. Disponible en el pool estándar.

:card[583] es una sanadora Anima que aumenta el HP máximo Anima un 2% por oleada, con una reducción de daño adicional que es conveniente. Disponible en el pool estándar.

:card[599] es una unidad cuerpo a cuerpo Phantasma que aumenta el HP máximo Phantasma un 2% por oleada. Disponible en el pool estándar.

:card[658] es una unidad a distancia Divina que aumenta el HP máximo Divina un 2% por oleada. No está disponible.

### +Opciones Defensivas

#### Debufferos

##### Reducción de Velocidad de Ataque

:filter["?ability=Wave+Start%2CSlow"]

##### Reducción de Daño Enemigo

:filter["?ability=Wave+Start%2CEnemy+DMG+Down"]

#### Bufferos (Reducción de Daño)

##### Divina

:filter["?ability=DMG+Reduction%2CDivina"]

##### Anima

:filter["?ability=DMG+Reduction%2CAnima"]

##### Phantasma

:filter["?ability=DMG+Reduction%2CPhantasma"]

### +Tasa de Crítico al Inicio de la Oleada

#### Divina

:filter["?ability=Crit+Rate%2CDivina%2CWave+Start"]

:card[1494] es una reserva Divina que elevará la tasa de crítico al 100% para la oleada 14, reduciendo el tiempo de limpieza. No está disponible.

#### Phantasma

:filter["?ability=Crit+Rate%2CWave+Start%2CPhantasma"]

:card[1307] es una reserva Phantasma que elevará la tasa de crítico al 100% para la oleada 10, reduciendo significativamente el tiempo de limpieza. No está disponible.

#### Anima

:filter["?ability=Crit+Rate%2CWave+Start%2CAnima"]

## Recomendaciones Adicionales

También puede ser conveniente tener algunos atacantes AoE de habilidad progresiva, ya que eliminar a los enemigos más pequeños reduce bastante el riesgo en oleadas avanzadas.

:filter["?skill=DMG%2CAoE&ability=Wave+Start%2CSkill+DMG"]
:filter["?skill=DMG%2CMulti&ability=Wave+Start%2CSkill+DMG"]

## Equipos de Ejemplo

Armemos algunos equipos enfocados en cartas que están disponibles ahora, o que solo dependen de un único ayudante. Estos no son equipos ideales, pero deberían poder llegar al nivel 90+; agregar algunas cartas limitadas que ya tengas o futuras (p. ej. :card[1437]) o usar asistentes defensivos debería permitir que estos equipos lleguen bastante lejos. Las cartas que no están marcadas como requeridas son muy flexibles.

### Equipo Anima

:team["req=583,583&opt=671,712,586"]:reserve["req=744&opt=634"]

*Nota: Se requieren dos copias de :card[583] — una en lv. 85 y otra en lv. 70 (sello de MLB). Una puede moverse a la reserva por otro sanador.*

### Equipo Phantasma

:team["req=2373,740&opt=526,603,628"]:reserve["opt=634,208"]

*Nota: :card[740] es muy recomendado y aunque no está disponible en general, ¡es bastante común pedirlo prestado a un amigo! La alternativa es :card[744] en la reserva.*

---

*Esta guía se enfoca en avanzar a pisos altos. Para un farming óptimo de SP, corridas cortas de 33-34 puntos son más eficientes. ¡Juega como más te guste!*

</div>
