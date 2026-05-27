import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateInviteParams {
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  location: string;
  description: string;
  category: string;
  hostName: string;
  dressCode?: string;
  tone?: "formal" | "casual" | "fun" | "elegant";
}

export async function generateInviteText(params: GenerateInviteParams): Promise<string> {
  const { eventTitle, eventDate, eventTime, location, description, category, hostName, dressCode, tone = "elegant" } = params;

  const toneGuide = {
    formal: "formal and professional, suitable for corporate events",
    casual: "warm, friendly and conversational",
    fun: "energetic, playful and exciting with appropriate emojis",
    elegant: "sophisticated, refined and beautifully crafted",
  };

  const prompt = `You are an expert event invitation copywriter. Create a beautiful, compelling event invitation.

Event Details:
- Title: ${eventTitle}
- Type: ${category}
- Host: ${hostName}
- Date: ${eventDate}
- Time: ${eventTime}
- Location: ${location}
- Description: ${description}
${dressCode ? `- Dress Code: ${dressCode}` : ""}
- Tone: ${toneGuide[tone]}

Write a compelling invitation text that:
1. Opens with an engaging hook
2. Clearly communicates the event details
3. Creates excitement and anticipation
4. Has a warm, personal closing
5. Is between 150-250 words
6. Does NOT include RSVP instructions (those are handled separately)

Return only the invitation text, no additional commentary.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type === "text") {
    return content.text;
  }
  throw new Error("Unexpected response format from AI");
}

interface GenerateSubjectParams {
  eventTitle: string;
  category: string;
  hostName: string;
}

export async function generateEmailSubject(params: GenerateSubjectParams): Promise<string> {
  const { eventTitle, category, hostName } = params;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `Create a compelling email subject line for an event invitation. Event: "${eventTitle}", Type: ${category}, Host: ${hostName}. Return only the subject line, max 60 characters.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type === "text") return content.text.trim();
  return `You're Invited: ${eventTitle}`;
}
