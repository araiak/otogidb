---
title: "Site Update — March 2026"
description: "LB0/MLB stat toggle, card page improvements, and a note on the language situation"
date: "2026-03-21"
author: "Araiak"
tags: ["announcement", "update"]
---

<div data-lang="en">

A couple of things landed this week worth writing up — a new stats feature, and an honest note about where things stand with language support.

---

## LB0 / MLB Stats Toggle

The card table now has a toggle in the toolbar that lets you switch between **LB0** and **MLB** stats.

**LB0** is what the card looks like at its max level with no limit breaks applied — essentially what you'd see if you pulled the card and levelled it to cap without any copies. **MLB** (Max Limit Break, or LB4) is the card fully limit broken, which requires 5 copies.

Previously the table was showing LB0 ATK and HP but MLB skill values, which wasn't consistent. The toggle defaults to MLB since that's the end state most players are optimising toward, but you can switch to LB0 if that's more relevant to where you are.

A few specifics:

- **ATK and HP** in the table update with the toggle. The sort order updates too.
- **Skill descriptions** show values at the selected level — so if a skill deals 10,000 DMG at LB0 and 13,000 at MLB, switching the toggle changes which number you see in the description.
- **Hover popups** match the toggle state automatically.
- **Card detail pages** now show MLB as the primary (bold) stat, with LB0 and Base listed below it. Skill descriptions on detail pages were already showing MLB values, so this makes the page consistent.
- Your toggle preference is saved to your browser and persists across sessions.

The MLB formula is: `round(base + (lb0_max − base) × (mlb_level − 1) / (lb0_level − 1))`, applied to each rarity's level range (5★: 70→90, 4★: 60→80, etc.). This matches what the game displays in the card profile screen.

---

## Maintenance — Language Support Changes

This is the less fun part of the post.

The site used to generate a full set of static pages for every supported language — English, Japanese, Korean, Spanish, Simplified Chinese, and Traditional Chinese. That's roughly **900 cards × 6 languages = 5,400+ card pages**, plus all the other pages on top. We hit the build limits on the free hosting tier, which was causing builds to fail.

To fix this, I've reduced the static page generation back to English only. Language switching now works dynamically — when you change language, the page content updates in your browser rather than loading a separate URL.

**What this means in practice:**

- Card names, descriptions, and skill text will still translate when you switch language, for cards where the translation data exists.
- The URL structure is English-only (`/en/cards/...`). Language-specific URLs are gone.  Maybe someday they can make a return.
- Blog posts and guides are English-first. Translations where they exist will still display, but new posts are likely to be English only until I have a better solution.
- Search and filtering work in English.

I'll be honest about what I can't fix: English is going to work better, faster, and have more complete information than other languages. That's a consequence of the free tier limits and the scale of the site, and I don't see a realistic path to full parity without either paying for hosting or dramatically cutting the card database — neither of which I want to do.

I'll do my best to make non-English use as good as I can within those constraints, and I'll revisit this if a better option appears. But I'd rather be upfront about it than pretend the experience is equal when it isn't.

If you run into specific breakage or missing translations that would be easy to fix, let me know on Discord (Otogi Leaks or similar).

---

## TL;DR

- New LB0/MLB toggle in the card table — defaults to MLB, saves your preference
- Card detail pages now show MLB as the primary stat value
- Hover popups respect the toggle
- Static pages reduced to English only due to build limits — language switching is now dynamic
- English will generally work better than other languages; I'll do what I can but can't guarantee equal coverage

</div>

<div data-lang="ja">

今週いくつかのアップデートがありましたので、まとめてお知らせします。

---

## LB0 / MLB ステータス切り替え

カードテーブルのツールバーに、**LB0** と **MLB** のステータスを切り替えるトグルが追加されました。

**LB0** は限界突破なしでレベル上限まで育てた状態のステータスです。**MLB**（最大限界突破 / LB4）は5枚使って完全に限界突破した状態です。

以前はATK/HPがLB0でスキル値がMLBという不一致な表示でしたが、今回修正されました。デフォルトはMLB表示です。

ホバーポップアップとカード詳細ページも同様に更新されています。

---

## メンテナンス — 言語サポートの変更

> **重要なお知らせ**

以前はすべての対応言語（英語・日本語・韓国語・スペイン語・簡体字・繁体字）のページを静的に生成していましたが、**900枚 × 6言語 = 5,400以上のページ**となり、無料ホスティングのビルド制限に達してビルドが失敗するようになりました。

これを解決するため、静的ページ生成を英語のみに戻しました。言語切り替えは動的に行われるようになり、URLは英語統一（`/en/cards/...`）となります。言語別URLはなくなりました。いつか復活できれば良いと思っています。カード名や説明文の翻訳データがある場合は引き続き表示されますが、英語が最も完全で高速に動作します。

この制限については率直にお伝えします。無料プランの制限とサイトの規模から、英語以外の言語では同等の体験を提供することが現実的に難しい状況です。できる限り改善に努めますが、現状では英語での利用が最もスムーズです。

ご不便をおかけして申し訳ありません。Discordでご意見・ご指摘をお待ちしています。

</div>

<div data-lang="ko">

이번 주 몇 가지 업데이트가 있었습니다.

---

## LB0 / MLB 스탯 토글

카드 테이블에 **LB0**와 **MLB** 스탯을 전환하는 토글이 추가되었습니다.

**LB0**은 한계돌파 없이 최대 레벨까지 육성한 상태이고, **MLB**는 5장으로 완전 한계돌파한 상태입니다. 기본값은 MLB이며, 설정은 브라우저에 저장됩니다. 호버 팝업과 카드 상세 페이지도 동일하게 업데이트되었습니다.

---

## 유지보수 — 언어 지원 변경

> **중요 공지**

이전에는 모든 지원 언어(영어·일어·한국어·스페인어·중국어 간체·번체)의 정적 페이지를 생성했지만, **900장 × 6개 언어 = 5,400개 이상의 페이지**로 인해 무료 호스팅의 빌드 한계에 도달했습니다.

이를 해결하기 위해 정적 페이지 생성을 영어 전용으로 줄였습니다. 언어 전환은 동적으로 작동하며 URL은 영어로 통일됩니다(`/en/cards/...`). 언어별 URL은 사라졌지만, 언젠가 돌아올 수 있기를 바랍니다. 번역 데이터가 있는 카드의 이름과 설명은 계속 표시되지만, 영어가 가장 완전하고 빠르게 작동합니다.

솔직히 말씀드리면, 무료 플랜의 제한으로 인해 영어 이외의 언어에서 동등한 경험을 제공하기가 현실적으로 어렵습니다. 최선을 다하겠지만 현재로서는 영어 사용이 가장 원활합니다. 불편을 드려 죄송합니다.

</div>

<div data-lang="zh-cn">

本周有几项更新值得说明。

---

## LB0 / MLB 属性切换

卡牌列表工具栏新增了 **LB0** 与 **MLB** 属性的切换开关。

**LB0** 为未突破时满级属性，**MLB** 为完全突破（需5张）后的属性。默认显示MLB，设置保存在浏览器中。悬停弹窗与卡牌详情页也已同步更新。

---

## 维护公告 — 语言支持变更

> **重要通知**

此前网站为所有支持语言（英、日、韩、西、简体、繁体）生成静态页面，**900张卡 × 6种语言 = 超过5,400个页面**，导致免费托管的构建限制被触及，构建失败。

为解决此问题，静态页面生成已回退为仅英语。语言切换改为动态方式，URL统一为英语（`/en/cards/...`）。语言专属URL已移除，希望有一天能够恢复。有翻译数据的卡牌名称和说明仍会正常显示，但英语版本最为完整且速度最快。

坦白说，受限于免费方案的限制，为非英语语言提供同等体验目前并不现实。我会尽力在条件允许的范围内改善，但就目前而言，英语使用体验是最好的。对此带来的不便深感抱歉。

</div>

<div data-lang="zh-tw">

本週有幾項更新值得說明。

---

## LB0 / MLB 屬性切換

卡牌列表工具列新增了 **LB0** 與 **MLB** 屬性的切換開關。

**LB0** 為未突破時滿級屬性，**MLB** 為完全突破（需5張）後的屬性。預設顯示MLB，設定儲存於瀏覽器中。懸停彈窗與卡牌詳情頁也已同步更新。

---

## 維護公告 — 語言支援變更

> **重要通知**

此前網站為所有支援語言（英、日、韓、西、簡體、繁體）生成靜態頁面，**900張卡 × 6種語言 = 超過5,400個頁面**，導致免費託管的建置限制被觸及，建置失敗。

為解決此問題，靜態頁面生成已回退為僅英語。語言切換改為動態方式，URL統一為英語（`/en/cards/...`）。語言專屬URL已移除，希望有一天能夠恢復。有翻譯資料的卡牌名稱和說明仍會正常顯示，但英語版本最為完整且速度最快。

坦白說，受限於免費方案的限制，為非英語語言提供同等體驗目前並不實際。我會盡力在條件允許的範圍內改善，但就目前而言，英語使用體驗是最好的。對此帶來的不便深感抱歉。

</div>

<div data-lang="es">

Esta semana han llegado un par de actualizaciones que vale la pena explicar.

---

## Toggle LB0 / MLB

La tabla de cartas ahora tiene un toggle en la barra de herramientas para cambiar entre estadísticas **LB0** y **MLB**.

**LB0** es la carta al nivel máximo sin límites rotos aplicados. **MLB** (Límite Roto Máximo, LB4) requiere 5 copias. El toggle está en MLB por defecto y guarda tu preferencia en el navegador. Los popups al pasar el cursor y las páginas de detalle de cartas también se han actualizado.

---

## Mantenimiento — Cambios en el Soporte de Idiomas

> **Aviso importante**

Antes el sitio generaba páginas estáticas para todos los idiomas (inglés, japonés, coreano, español, chino simplificado y tradicional) — roughly **900 cartas × 6 idiomas = más de 5.400 páginas**. Esto hizo que se alcanzara el límite de construcción del alojamiento gratuito, causando fallos en las compilaciones.

Para solucionarlo, la generación de páginas estáticas se ha reducido solo a inglés. El cambio de idioma ahora funciona dinámicamente. La estructura de URLs es solo en inglés (`/en/cards/...`). Las URLs específicas por idioma han desaparecido. Quizás algún día puedan volver. Los nombres de cartas y descripciones con datos de traducción seguirán mostrándose, pero el inglés tendrá la cobertura más completa y será más rápido.

Siendo honesto: dadas las limitaciones del plan gratuito, no es realista ofrecer una experiencia igual en todos los idiomas. Haré lo que pueda dentro de esas limitaciones, pero actualmente el inglés funciona mejor. Pido disculpas por las molestias.

</div>
