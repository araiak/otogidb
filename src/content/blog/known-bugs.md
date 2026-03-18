---
title: "Known Game Bugs"
description: "Introducing the known bugs feature - what it is, how to use it, and a note on reporting and perspective"
date: "2026-03-13"
author: "Araiak"
tags: ["announcement", "bugs"]
---

<div data-lang="en">

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

</div>

<div data-lang="ja">

サイトに「既知のバグ」機能を追加しました。何ができるのか、どう機能するのか、何が期待できるのかを簡単にご説明します。

> **注意：** バグ分析は英語のカード説明文に基づいています。バグ表示機能を有効にした場合、カードページのバグ詳細は英語のみで表示されます。

---

## これは何？

サイトでゲームデータから見つかったバグを追跡するようになりました——カードの説明文に書かれていることと、実際のデータが一致しないものです。プレイヤーの観察から見えてきたものもあれば、一般プレイヤーには気づきにくいデータ分析の過程で発見したものもあります。

現在データベースには**51件のオープンバグ**が追跡されています。2つのカテゴリに分かれます：

- **赤**——ゲームプレイに影響あり。説明と実際の動作が異なり、カードの使い方や評価に関わるもの。例：誤ったターゲット指定、誤ったステータス値、スタックしないのに記載がないアビリティ、遠距離タイプなのに近距離まで接近するカードなど。
- **黄色**——説明文の不一致。説明の数値や効果が実際のデータと異なるが、実際への影響は小さいもの。「説明には25%と書いてあるがデータでは20%」といったケースです。

この区分けはやや恣意的で、人によって意見が分かれることもあるかもしれません。プレイや評価に実際に影響するかどうかを判断基準としています。

このリストは網羅的ではなく、体系的なデータ検索や主にコミュニティを通じて把握したものです。まだ見つかっていないバグも確実に存在します。

---

## オプトイン制

この機能は**デフォルトで無効**になっています。この情報を見たくないプレイヤーもいて、それは全く問題ありません。有効にするには：

- **メインページ**：「バグを表示」チェックボックスにチェックを入れる。設定はグローバルに保存されます。
- **検索/カードページ**：既知バグのあるカードに小さなインジケーターが表示されます。カードページをクリックすると詳細が確認できます。

今後のオークション投稿では、関連するバグ情報を含める予定です——もちを投資する前に知っておくべきバグがあれば、そのことをお伝えします。できる限りブログ投稿内でスポイラータグ付きのデータメモとして記載しますが、古い投稿での一貫性や解説での見落としを保証することはできません。

---

## バグ報告について

バグを報告したい場合は、Otogi Leaks Discordや他の一般的なサーバーにいますので、そこでディスカッションを開いていただければ時間があれば確認・調査します。

**自分で検証してから**でないと、開発者への報告はしないでください。報告前に：

1. **カードを所持していること**——使えないものはテストできません。
2. **バグを検証すること**——実際に報告内容通りの動作をしているか確認してください。

開発者は毎月イベントがある生きたゲームを維持しており、それは非常に大変な作業です。マイナーまたは意図的なものも多い検証されていないバグ報告が50件届いても、嬉しい状況ではありません。自分でテストして間違いだと確信した場合、その報告には価値があります。ここで読んだ内容を元にしているだけなら、まず自分でテストしてください。

---

## バグそのものについて

紙面上では恥ずかしそうに見えるものが多いですが、バグのないゲームコンテンツを作るのはこの規模では本当に難しいです。Otogiは複雑なステータス相互作用を持つ膨大なカードプールを誇り、開発チームは明らかに小規模で毎月新しいイベントを出し続けています。それは素晴らしいことです。

データから見ても、開発チームの主言語は英語ではない可能性が高く——英語の説明文はパッチリリース前に最後に確認される項目かもしれません。「視覚的な」バグのほとんどはまさにその類いの問題で、実際のデータからわずかにずれたローカライズされた説明文です。

このことで開発者を責めないでください。彼らは限られたリソースで多くのことをやり遂げており、ゲームは良い状態にあります。

---

## まとめ

- バグは「バグを表示」チェックボックスからオプトイン
- 赤＝ゲームプレイに影響、黄色＝説明文の不一致
- 開発者に報告する前に自分で検証を
- 開発者はよくやっています——こういうことは起こるものです

</div>

<div data-lang="ko">

사이트에 알려진 버그 기능을 추가했습니다. 이 기능이 무엇인지, 어떻게 작동하는지, 무엇을 기대할 수 있는지 간단히 설명하는 글입니다.

> **참고:** 버그 분석은 영어 카드 설명을 기반으로 합니다. 버그 표시 기능을 활성화하면 카드 페이지의 버그 세부 정보는 영어로만 표시됩니다.

---

## 이게 뭔가요

이제 사이트에서 게임 데이터에서 발견한 버그를 추적합니다——카드 설명에 나와 있는 것과 실제 데이터가 일치하지 않는 경우입니다. 일부는 플레이어 관찰에서 나온 것이고, 일부는 대부분의 플레이어가 발견하기 어려운 데이터 분석 과정에서 발견된 것입니다.

현재 데이터베이스에는 **51개의 오픈 버그**가 추적되고 있습니다. 두 가지 카테고리로 나뉩니다:

- **빨간색**——게임플레이에 영향. 설명과 다르게 실제로 작동하여 카드 활용 방식에 영향을 주는 경우. 예: 잘못된 타게팅, 잘못된 스탯 수치, 중첩되지 않지만 그렇게 안 써있는 능력, 원거리 타입임에도 근접 거리로 접근하는 카드.
- **노란색**——설명 불일치. 설명의 수치나 효과가 데이터와 다르지만 실제 영향은 작은 경우. "설명엔 25%, 데이터엔 20%" 같은 케이스입니다.

이 구분은 다소 임의적이고 일부 분류에 대해 의견이 다를 수 있습니다. 카드를 실제로 어떻게 플레이하거나 평가하는지에 의미 있는 차이를 만드는지를 기준으로 하려 했습니다.

이 목록은 전수 조사가 아닙니다——보다 체계적인 데이터 검색과 주로 커뮤니티를 통해 인지하게 된 것들입니다. 아직 발견하지 못했거나 확인하지 못한 버그가 분명히 더 있습니다.

---

## 옵트인 방식

이 기능은 **기본적으로 비활성화**되어 있습니다. 이 정보를 원하지 않는 플레이어도 있으며, 그건 완전히 괜찮습니다. 활성화하려면:

- **메인 페이지**: "버그 표시" 체크박스를 체크하세요. 이 설정은 전역으로 저장됩니다.
- **검색/카드 페이지**: 알려진 버그가 있는 카드에 작은 표시가 붙습니다. 카드 페이지로 들어가면 전체 세부 정보를 확인할 수 있습니다.

앞으로 관련 버그 정보를 향후 옥션 포스트에 포함할 예정입니다——모찌를 투자하려는 카드에 알려진 버그가 있다면, 소비 전에 알아야 할 정보입니다. 가능하면 블로그 포스트에 스포일러 태그 뒤에 데이터 메모를 남기겠지만, 오래된 포스트에서의 일관성이나 해설에서 무언가를 놓치지 않을 것을 보장할 수는 없습니다.

---

## 버그 신고에 대하여

버그를 신고하고 싶다면, Otogi Leaks Discord나 다른 일반적인 서버에 있으니 거기서 토론을 열어주시면 시간이 날 때 확인하고 조사해 보겠습니다.

**직접 검증하기 전에** 개발자에게 이것들을 신고하지 마세요. 신고 전에:

1. **카드를 소유해야 합니다**——쓸 수 없는 것은 테스트할 수 없습니다.
2. **버그를 검증하세요**——실제로 신고 내용대로 동작하는지 확인하세요.

개발자들은 매달 이벤트가 있는 라이브 게임을 유지하고 있으며, 이는 상당한 작업량입니다. 사소하거나 의도적인 것으로 밝혀질 수도 있는 50개의 검증되지 않은 버그 신고가 쏟아지는 것은 즐거운 상황이 아닙니다. 직접 테스트해서 잘못됐다고 확신한다면, 그 신고는 가치 있습니다. 여기서 읽은 것을 기반으로 한다면, 먼저 직접 테스트해 주세요.

---

## 버그 자체에 대하여

종이 위에서 보면 민망해 보이는 것들이 많지만, 이 규모에서 버그 없는 게임 콘텐츠를 만드는 것은 정말 어렵습니다. Otogi는 복잡한 스탯 상호작용을 가진 방대한 카드 목록을 보유하고 있으며, 개발자들은 분명 소규모 팀으로 매달 새 이벤트를 출시하고 있습니다. 그건 인상적입니다.

데이터에서도 개발팀의 주언어가 영어가 아닐 가능성이 높다는 것을 알 수 있습니다——영어 설명은 아마 패치 출시 전 가장 마지막에 검토되는 항목일 것입니다. 대부분의 "시각적" 버그는 정확히 그런 문제입니다: 실제 데이터에서 약간 벗어난 현지화된 설명문.

이것 때문에 개발자를 비난하지 마세요. 그들은 제한된 자원으로 많은 것을 하고 있으며 게임은 좋은 상태에 있습니다.

---

## 요약

- 버그는 "버그 표시" 체크박스를 통해 옵트인
- 빨간색 = 게임플레이 영향, 노란색 = 설명 불일치
- 개발자에게 신고하기 전에 직접 버그를 검증하세요
- 개발자들은 잘 하고 있습니다——이런 일은 생기기 마련입니다

</div>

<div data-lang="zh-cn">

我在网站上添加了已知漏洞功能。这篇文章简要说明它是什么、如何运作，以及可以期待什么。

> **注意：** 漏洞分析基于英文卡牌描述。启用漏洞显示功能后，卡牌页面上的漏洞详情仅以英文显示。

---

## 这是什么

网站现在会追踪我在游戏数据中发现的漏洞——即卡牌描述与底层数据实际效果不一致的情况。其中一些来源于玩家的观察，另一些则是在数据分析过程中发现的，大多数玩家没有办法自己发现这些问题。

目前数据库中追踪了**51个未解决漏洞**，分为两类：

- **红色**——影响游戏玩法。卡牌的实际表现与描述不同，会影响你的使用方式。例如：错误的目标选择、错误的属性数值、不叠加但没有说明的能力、属于远程类型却跑到近战距离的卡牌等。
- **黄色**——描述不符。描述中的数字或效果与数据不匹配，但实际影响较小。比如"描述写25%，数据实际是20%"。

这个区分有些主观，合理的人对某些分类可能会有不同意见。我尽量以是否实质影响你的玩法或对卡牌的评价为判断标准。

这份列表并不全面——它只是来自更系统性的数据搜索以及主要通过社区了解到的情况。几乎可以肯定还有我尚未发现或尚未整理的漏洞。

---

## 选择性启用

此功能**默认关闭**。有些玩家不希望看到这些信息——这完全没问题。要启用它：

- **主页面**：勾选"显示漏洞"复选框，该设置将全局保存。
- **搜索/卡牌页面**：有已知漏洞的卡牌会有小标记。点击进入卡牌页面可查看完整详情。

我会在未来的拍卖文章中纳入相关的漏洞信息——如果你被要求投入饼的卡牌有已知漏洞，在消费前你应该知道这一点。我会尽量在博客文章中用剧透标签标注数据备注，让需要的人能看到而不影响阅读，但我无法保证旧文章的一致性，也无法保证解说中不会有所遗漏。

---

## 关于漏洞报告

如果你想报告漏洞，我在Otogi Leaks Discord和其他一些常见的服务器上都有——在那里开个讨论帖，我有时间的话应该能看到并调查。

**在自己验证之前**，请不要将这些漏洞报告给开发者。报告前需要：

1. **你需要拥有这张卡**——你无法测试自己不能使用的东西。
2. **验证漏洞**——实际确认其行为符合报告所描述的方式。

开发者在维护一个每月都有活动的线上游戏，这是大量工作。收到50份未经验证的漏洞报告——其中许多可能是小问题或本就是有意为之——不是愉快的一天。如果你测试过并确信有问题，那份报告是值得提交的。如果只是基于你在这里读到的内容，请先自己测试。

---

## 关于漏洞本身

很多漏洞看起来很尴尬，但在这个规模下制作无漏洞的游戏内容确实很难。Otogi拥有庞大的卡牌阵容和复杂的属性交互，开发团队显然是一个规模较小的团队，每个月都在推出新活动。这是令人印象深刻的。

从数据中也可以看出，开发团队的主要语言可能不是英文——这意味着英文描述很可能是补丁发布前最后才被审查的内容。大多数"视觉"漏洞恰恰是这类问题：与底层数据略有偏差的本地化描述。

不要因此攻击开发者。他们用有限的资源做了很多事，游戏处于良好状态。

---

## 总结

- 漏洞通过"显示漏洞"复选框选择性启用
- 红色 = 影响游戏玩法，黄色 = 描述不符
- 向开发者报告前请自行验证漏洞
- 开发者做得很好——这种事情难免发生

</div>

<div data-lang="zh-tw">

我在網站上添加了已知漏洞功能。這篇文章簡要說明它是什麼、如何運作，以及可以期待什麼。

> **注意：** 漏洞分析基於英文卡牌描述。啟用漏洞顯示功能後，卡牌頁面上的漏洞詳情僅以英文顯示。

---

## 這是什麼

網站現在會追蹤我在遊戲資料中發現的漏洞——即卡牌描述與底層資料實際效果不一致的情況。其中一些來源於玩家的觀察，另一些則是在資料分析過程中發現的，大多數玩家沒有辦法自己發現這些問題。

目前資料庫中追蹤了**51個未解決漏洞**，分為兩類：

- **紅色**——影響遊戲玩法。卡牌的實際表現與描述不同，會影響你的使用方式。例如：錯誤的目標選擇、錯誤的屬性數值、不疊加但沒有說明的能力、屬於遠程類型卻跑到近戰距離的卡牌等。
- **黃色**——描述不符。描述中的數字或效果與資料不匹配，但實際影響較小。比如「描述寫25%，資料實際是20%」。

這個區分有些主觀，合理的人對某些分類可能會有不同意見。我盡量以是否實質影響你的玩法或對卡牌的評價為判斷標準。

這份列表並不全面——它只是來自更系統性的資料搜索以及主要通過社群了解到的情況。幾乎可以肯定還有我尚未發現或尚未整理的漏洞。

---

## 選擇性啟用

此功能**預設關閉**。有些玩家不希望看到這些資訊——這完全沒問題。要啟用它：

- **主頁面**：勾選「顯示漏洞」核取方塊，該設定將全域儲存。
- **搜尋/卡牌頁面**：有已知漏洞的卡牌會有小標記。點擊進入卡牌頁面可查看完整詳情。

我會在未來的拍賣文章中納入相關的漏洞資訊——如果你被要求投入餅的卡牌有已知漏洞，在消費前你應該知道這一點。我會盡量在部落格文章中用劇透標籤標註資料備注，讓需要的人能看到而不影響閱讀，但我無法保證舊文章的一致性，也無法保證解說中不會有所遺漏。

---

## 關於漏洞報告

如果你想報告漏洞，我在Otogi Leaks Discord和其他一些常見的伺服器上都有——在那裡開個討論串，我有時間的話應該能看到並調查。

**在自己驗證之前**，請不要將這些漏洞報告給開發者。報告前需要：

1. **你需要擁有這張卡**——你無法測試自己不能使用的東西。
2. **驗證漏洞**——實際確認其行為符合報告所描述的方式。

開發者在維護一個每月都有活動的線上遊戲，這是大量工作。收到50份未經驗證的漏洞報告——其中許多可能是小問題或本就是有意為之——不是愉快的一天。如果你測試過並確信有問題，那份報告是值得提交的。如果只是基於你在這裡讀到的內容，請先自己測試。

---

## 關於漏洞本身

很多漏洞看起來很尷尬，但在這個規模下製作無漏洞的遊戲內容確實很難。Otogi擁有龐大的卡牌陣容和複雜的屬性交互，開發團隊顯然是一個規模較小的團隊，每個月都在推出新活動。這是令人印象深刻的。

從資料中也可以看出，開發團隊的主要語言可能不是英文——這意味著英文描述很可能是修補程式發布前最後才被審查的內容。大多數「視覺」漏洞恰恰是這類問題：與底層資料略有偏差的本地化描述。

不要因此攻擊開發者。他們用有限的資源做了很多事，遊戲處於良好狀態。

---

## 總結

- 漏洞通過「顯示漏洞」核取方塊選擇性啟用
- 紅色 = 影響遊戲玩法，黃色 = 描述不符
- 向開發者報告前請自行驗證漏洞
- 開發者做得很好——這種事情難免發生

</div>

<div data-lang="es">

He añadido una función de errores conocidos al sitio. Esta es una publicación rápida para explicar qué es, cómo funciona y qué esperar de ella.

> **Nota:** El análisis de errores se basa en las descripciones de cartas en inglés. Cuando la función está activada, los detalles de los errores en las páginas de cartas aparecen solo en inglés.

---

## Qué Es

El sitio ahora rastrea errores que he encontrado en los datos del juego——cosas que no cuadran entre lo que dice la descripción de una carta y lo que los datos subyacentes realmente hacen. Algunos se basan en observaciones de jugadores, y otros se encontraron durante análisis de datos que la mayoría de los jugadores no tendrían forma de detectar.

Actualmente hay **51 errores abiertos** rastreados en la base de datos. Caen en dos categorías:

- **Rojo** — con impacto en el gameplay. La carta se comporta realmente diferente a lo descrito de una manera que afecta cómo la usarías. Ejemplos: apuntado incorrecto, valores de estadísticas incorrectos, habilidades que no se acumulan pero no lo dicen, cartas que se acercan al rango cuerpo a cuerpo a pesar de ser tipo a distancia.
- **Amarillo** — discrepancia en la descripción. El número o efecto en la descripción no coincide con los datos, pero el impacto práctico es menor. Como "la descripción dice 25%, los datos dicen 20%."

La distinción es algo arbitraria, y personas razonables podrían no estar de acuerdo con algunas clasificaciones. He intentado trazar la línea en si cambia significativamente cómo jugarías o valorarías la carta.

Esta lista no es exhaustiva——es solo lo que ha salido de búsquedas de datos más sistemáticas y cosas de las que me he enterado principalmente a través de la comunidad. Es casi seguro que hay errores que aún no he encontrado o a los que no he llegado.

---

## Es Opcional

Esta función está **desactivada por defecto**. Algunos jugadores no quieren esta información——y eso está completamente bien. Para activarla:

- **Página principal**: marca la casilla "Mostrar Errores". Esto guarda la configuración globalmente.
- **Página de búsqueda/cartas**: las cartas con errores conocidos obtienen un pequeño indicador. Haz clic en la página de la carta para ver los detalles completos.

Incluiré información sobre errores en futuros posts de subastas donde sea relevante——si una carta en la que te piden invertir mochi tiene un error conocido, eso es algo que deberías saber antes de gastar. Donde pueda, dejaré notas de datos en los posts del blog detrás de etiquetas de spoiler para que estén disponibles si las quieres sin interferir, pero no puedo garantizar que sea consistente en posts más antiguos, o que no se me escape algo en el comentario.

---

## Sobre Reportar Errores

Si quieres reportar un error, estoy en el Discord de Otogi Leaks y algunos de los otros comunes——si abres una discusión allí probablemente lo vea y lo investigue si tengo tiempo.

Por favor no reportes estos a los desarrolladores a menos que los hayas verificado tú mismo. Antes de reportar:

1. **Necesitas poseer la carta** — no puedes probar lo que no puedes usar.
2. **Valida el error** — confirma realmente que se comporta de la manera que describe el reporte.

Los desarrolladores están manteniendo un juego en vivo con eventos mensuales, lo cual es mucho trabajo. Recibir una avalancha de 50 reportes de errores no validados——muchos de los cuales pueden resultar ser menores o intencionales——no es un buen día. Si has probado algo y estás seguro de que está mal, ese reporte vale la pena hacerlo. Si te basas en lo que leíste aquí, por favor haz tus propias pruebas primero.

---

## Sobre los Errores en Sí

Muchos de estos parecen vergonzosos en papel, pero crear contenido de juego sin errores es genuinamente difícil, especialmente a esta escala. Otogi tiene un enorme roster de cartas con interacciones de estadísticas complejas, y los desarrolladores son claramente un equipo bastante pequeño que saca un nuevo evento cada mes. Eso es impresionante.

También es bastante claro a partir de los datos que el idioma principal del equipo de desarrollo no es el inglés——lo que significa que las descripciones en inglés son probablemente lo último que se revisa antes de que salga un parche. La mayoría de los errores "visuales" son exactamente ese tipo de problema: una descripción localizada que se desvía ligeramente de los datos subyacentes.

No os cebéis con los devs por esto. Están haciendo mucho con recursos limitados y el juego está en buen lugar.

---

## TL;DR

- Los errores son opcionales a través de la casilla "Mostrar Errores"
- Rojo = impacto en gameplay, Amarillo = discrepancia en descripción
- Valida los errores tú mismo antes de reportarlos a los desarrolladores
- Los devs están haciendo un buen trabajo——estas cosas pasan

</div>
