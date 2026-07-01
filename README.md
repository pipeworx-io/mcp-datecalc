# mcp-datecalc

Date calculator MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1156+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `date_diff` | Compute the difference between two dates/times (UTC). Returns the signed difference in ms, seconds, minutes, hours, days and weeks, plus a human-readable summary. Accepts ISO-8601 (e.g. "2026-01-01" or "2026-01-01T12:00:00Z"). |
| `add_duration` | Add (or subtract, with negatives) a duration to a date and return the new UTC date/time. Provide any of years/months/weeks/days/hours/minutes/seconds. |
| `date_info` | Calendar facts about a date (UTC): weekday, day-of-year, ISO week number, quarter, whether the year is a leap year, and days in that month. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "datecalc": {
      "url": "https://gateway.pipeworx.io/datecalc/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1156+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Datecalc data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [All tools and guides](https://github.com/pipeworx-io/examples)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
