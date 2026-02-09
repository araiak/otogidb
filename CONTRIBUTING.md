# Contributing to OtogiDB

Thank you for your interest in contributing to OtogiDB! This guide covers how to submit blog posts, the review process, and important licensing information.

## Important: Data Files

**Do not modify files in the `public/data/` directory.** These files are managed by proprietary automation that extracts data directly from the game client.

If you find incorrect data or missing information:
- Open an issue on [GitHub](https://github.com/araiak/otogidb/issues)
- Describe the problem and provide screenshots if possible
- We will investigate and update the automation as needed

Pull requests that modify `public/data/` files will be rejected.

## Blog Post Contributions

We welcome blog posts about Otogi Spirit Agents including:

- Card analysis and reviews
- Team building guides
- Event strategies
- Tier lists
- Game mechanics explanations
- New player guides

### Creating a Blog Post

1. **Fork the repository** on GitHub: https://github.com/araiak/otogidb

2. **Create a new Markdown file** in `src/content/blog/` with a descriptive filename:
   - Use lowercase with hyphens: `my-post-title.md`
   - Example: `january-2026-tower-guide.md`

3. **Add the required frontmatter** at the top of your file:

```markdown
---
title: "Your Post Title"
description: "A brief description of your post (shown in previews)"
date: "2025-01-15"
author: "Your Name"
tags: ["guide", "analysis"]
---

Your content starts here...
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | The post title (keep it concise) |
| `description` | Yes | Brief summary for previews and SEO |
| `date` | Yes | Publication date in YYYY-MM-DD format |
| `author` | Yes | Your name or handle |
| `tags` | Yes | Array of relevant tags (see below) |

### Available Tags

- `guide` - How-to guides and tutorials
- `analysis` - Card or team analysis
- `auction` - Auction analysis
- `events` - Event-specific content
- `gacha` - Gacha card analysis
- `exchange` - Exchange card analysis
- `team-building` - Team composition advice
- `announcement` - Site announcements

### Using Card References

Reference cards in your posts using the `:card[id]` syntax:

```markdown
:card[689] is one of the strongest Divina assists.
Compare it to :card[707] for longer content.
```

This creates hoverable links that show card previews. You can use:
- Card ID: `:card[689]`
- Card name: `:card[Nue]`

### Using Card List Blocks

Display a grid of specific cards by ID using the `:list[ids]` syntax:

```markdown
My favorite cards:

:list[10001,10002,10003]
```

This renders a grid showing the specified cards in order, with hover/tap popups. Unlike `:filter`, this shows exact cards you specify rather than matching a query.

**Use cases:**
- Recommended cards for specific content
- Cards to prioritize from an event
- Example team alternatives
- Any curated list of specific cards

Cards are displayed in the order you specify them.

### Using Filter Blocks

Display a grid of cards matching specific criteria using the `:filter["query"]` syntax:

```markdown
Cards with DMG Boost that activate at wave start:

:filter["?ability=DMG Boost,Wave Start"]

All 5-star Divina healers:

:filter["?attribute=Divina&type=Healer&rarity=5"]
```

This renders a visual grid of matching cards with hover popups, similar to the "Synergy Partners" section on card detail pages.

#### Supported Filter Parameters

The filter block supports all parameters from the [Cards page](/cards). You can build and test your filter on the Cards page, then copy the URL query parameters directly into a filter block.

| Parameter | Description | Example |
|-----------|-------------|---------|
| `q` | Text search on card name | `?q=Nue` |
| `ability` | Ability tags (comma-separated, ALL must exist on ONE ability) | `?ability=DMG Boost,Wave Start` |
| `skill` | Skill tags (comma-separated, ALL must exist on the skill) | `?skill=DMG,AoE` |
| `attr` | Card attribute(s) | `?attr=Divina,Phantasma` |
| `type` | Card type(s) | `?type=Healer,Assist` |
| `rarity` | Star rarity (1-5) | `?rarity=4,5` |
| `bond` | Bond type(s) | `?bond=Attack,Skill` |
| `source` | Acquisition source(s) | `?source=gacha,auction` |
| `available` | Currently obtainable (1 or true) | `?available=1` |
| `npc` | Show NPC/enemy cards (1 = show, omit = hide) | `?npc=1` |

**Source values:** `gacha`, `event`, `exchange`, `auction`, `daily`

**Bond values:** `Attack`, `Skill`, `HP`

**Skill tag examples:** `DMG`, `Heal`, `Buff`, `Debuff`, `Single`, `Multi`, `AoE`, `Stun`, `Poison`, `Burn`, `Freeze`, `Sleep`, `Silence`

**Ability tag examples:** `DMG Boost`, `Crit Rate`, `Crit DMG`, `Skill DMG`, `Max HP`, `DMG Reduction`, `Wave Start`, `Team`, `Divina`, `Anima`, `Phantasma`

**Combining filters:** Use `&` to combine multiple parameters. All conditions must match (AND logic).

```markdown
5-star event cards with AoE damage skills:

:filter["?rarity=5&source=event&skill=DMG,AoE"]

Phantasma healers with Max HP boost at wave start:

:filter["?attr=Phantasma&type=Healer&ability=Max HP,Wave Start"]
```

**Tip:** Go to the [Cards page](/cards), set your filters, then click "Share" to copy the URL. The query string (everything after `?`) can be used directly in a filter block.

### Using Team Blocks

Display a team composition with main team and optional reserve using the `:team["query"]` syntax:

```markdown
### My Anima Team

:team["req=583,583&opt=671,712,586"]:reserve["req=744&opt=634"]
```

This renders a visual team widget showing:
- Main team cards with required cards marked with a star badge
- Optional reserve section (if specified)
- Hover/tap popups with full card details

#### Team Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `req` | Required card IDs (comma-separated) | `req=583,583` |
| `opt` | Optional card IDs (comma-separated) | `opt=671,712,586` |

**Syntax variations:**

```markdown
Main team only:
:team["req=583&opt=671,712"]

Main team with reserve:
:team["req=583&opt=671,712"]:reserve["req=744&opt=634"]

Reserve with only optional cards:
:team["req=583&opt=671"]:reserve["opt=634,208"]
```

Required cards are displayed with a gold star badge to indicate they are essential to the team composition.

### Submitting Your Post

1. **Commit your changes** to your fork
2. **Create a Pull Request** to the `dev` branch (not `main`)
3. **Fill out the PR description** with:
   - Brief summary of your post
   - Any specific feedback you'd like

**Note:** We merge `dev` to `main` periodically. Your post will go live after the next merge to `main`.

## Review Process

All submissions go through a review process before publication:

### What We Check

- **Accuracy**: Card stats, skill descriptions, and game mechanics should be correct
- **Quality**: Posts should be well-written and provide value to readers
- **Formatting**: Proper Markdown formatting and frontmatter
- **Tone**: Respectful and constructive content

### Moderation Guidelines

We reserve the right to:

- Request changes before merging
- Edit posts for clarity, grammar, or formatting
- Decline posts that don't meet our standards
- Remove published content that violates guidelines

### Content Expectations

**Do:**
- Share your honest opinions and analysis
- Provide context for your recommendations
- Be respectful of different playstyles
- Credit sources when referencing others' work

**Don't:**
- Post misleading or intentionally incorrect information
- Include personal attacks or harassment
- Promote cheating, hacking, or exploits
- Include NSFW content
- Spam or self-promote excessively

## Licensing

**Important:** By submitting content to OtogiDB, you agree to the following:

### MIT License

All contributions to this repository, including blog posts, are licensed under the [MIT License](LICENSE). This means:

- Your content can be freely used, modified, and distributed by anyone
- You are granting these rights irrevocably
- You retain no exclusive rights to the submitted content
- The content may be edited, reformatted, or removed at the maintainers' discretion

### What This Means For You

By submitting a pull request, you confirm that:

1. You are the original author of the content, or have permission to submit it
2. You understand and accept the MIT License terms
3. Your content can be freely copied, modified, and redistributed by anyone under MIT

**Important:** While we will honor requests to remove your content from this repository, once published under MIT license, we cannot control if others have already copied or reused it. The MIT license is irrevocable for copies already distributed.

If you are not comfortable with these terms, please do not submit content to this repository.

## Questions?

- Open an issue on [GitHub](https://github.com/araiak/otogidb/issues)
- Check existing blog posts for examples of formatting and style

Thank you for contributing to the Otogi Spirit Agents community!
