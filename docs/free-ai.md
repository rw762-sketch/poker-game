# Optional free API bots

The hosted multiplayer Worker can use Groq's `openai/gpt-oss-20b` model for AI
seats. Solo, direct PeerJS games, and the local Node server retain the built-in
mathematical bots. This is an experimental language-model player, not AGI or a
claim of improved poker strength.

1. Create your own account at https://console.groq.com/ and keep the **Free** plan.
   Do not upgrade or add billing for this integration.
2. Create an API key and configure `GROQ_API_KEY` as a **secret runtime environment
   variable** on the hosted Site. Do not paste keys into chat, frontend code,
   Git, or the hosting manifest. A local `.env.local` file is ignored by Git but
   does not by itself configure the hosted runtime.
3. Deploy the Worker and create a server multiplayer room, add AI seats, and deal.
   Without the secret, existing bots continue to work normally.

Requests originate from the game server. The provider receives only the bot's
own hole cards and public betting/board information, with anonymous inferred
opponent ranges. It receives no human hole cards, names, deck, or session tokens.
Keys never enter browser responses or public assets.

To conserve the free allowance, this application makes at most **100 attempts
per UTC day across the whole site**, at least ten seconds apart. Other turns
use the existing adaptive math AI. These limits do not replace the provider's
account limits and do not guarantee zero charges on an upgraded paid account.
Requests have a six-second timeout. Errors, rate limits, malformed responses,
and illegal moves fall back to math AI. A lost worker cannot block a bot turn
for more than the nine-second API window (plus the next client poll).

Each attempt is reserved atomically before contacting Groq. Duplicate polls
cannot duplicate that attempt, and a late response cannot play on a new turn.
Only legal actions are applied by the authoritative poker engine.

Provider documentation:
- https://console.groq.com/docs/quickstart
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/billing-faqs
- https://console.groq.com/docs/structured-outputs

An actual successful provider response must be verified after secret setup;
mocked tests alone do not establish a live API connection.
