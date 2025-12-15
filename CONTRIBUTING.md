# Contributing to OtogiDB

Thank you for your interest in contributing to OtogiDB! This guide covers how to submit blog posts, the review process, and important licensing information.

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
- `tier-list` - Tier rankings
- `team-building` - Team composition advice
- `event` - Event-specific content
- `announcement` - Site announcements
- `christmas`, `halloween`, etc. - Seasonal content
- `auction` - Auction analysis

### Using Card References

Reference cards in your posts using the `:card[id]` syntax:

```markdown
:card[689] is one of the strongest Divina assists.
Compare it to :card[707] for longer content.
```

This creates hoverable links that show card previews. You can use:
- Card ID: `:card[689]`
- Card name: `:card[Nue]`

### Submitting Your Post

1. **Commit your changes** to your fork
2. **Create a Pull Request** to the `main` branch
3. **Fill out the PR description** with:
   - Brief summary of your post
   - Any specific feedback you'd like

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
3. You are giving up exclusive rights to your submitted content
4. You will not make copyright claims against OtogiDB or its users for the submitted content

If you are not comfortable with these terms, please do not submit content to this repository.

## Questions?

- Open an issue on [GitHub](https://github.com/araiak/otogidb/issues)
- Check existing blog posts for examples of formatting and style

Thank you for contributing to the Otogi Spirit Agents community!
