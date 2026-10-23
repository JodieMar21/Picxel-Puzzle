import { FormEvent, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/apiBase";

const TOPICS = [
  { value: "license", label: "License & billing" },
  { value: "technical", label: "Technical issue" },
  { value: "ipad", label: "iPad / desktop install" },
  { value: "feedback", label: "Product feedback" },
  { value: "other", label: "Something else" },
];

function topicFromQuery(value: string | null): string {
  if (!value) return "technical";
  return TOPICS.some((t) => t.value === value) ? value : "technical";
}

interface ContactFormProps {
  className?: string;
  compact?: boolean;
}

export default function ContactForm({ className, compact = false }: ContactFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("technical");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setTopic(topicFromQuery(params.get("topic")));
    const prefill = params.get("prefill");
    if (prefill) setMessage(prefill);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({
        title: "Almost there",
        description: "Please fill in name, email, and your message.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    const topicLabel = TOPICS.find((t) => t.value === topic)?.label ?? topic;

    try {
      const response = await fetch(apiUrl("/api/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          topic: topicLabel,
          message: message.trim(),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        delivered?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.message || "Failed to send message.");
      }

      toast({
        title: data.delivered === false ? "Message saved" : "Message sent",
        description:
          data.message ||
          "Thanks — your note was sent to jodie-mar@hotmail.com.",
      });
      setName("");
      setEmail("");
      setTopic("technical");
      setMessage("");
    } catch (error) {
      toast({
        title: "Couldn’t send",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={
        className ??
        "rounded-2xl border border-border bg-card/80 p-5 sm:p-7 shadow-sm space-y-5"
      }
    >
      <div className={`grid gap-4 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div className="space-y-2">
          <Label htmlFor="contact-name">Name</Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            disabled={sending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={sending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-topic">Topic</Label>
        <Select value={topic} onValueChange={setTopic} disabled={sending}>
          <SelectTrigger id="contact-topic">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOPICS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What happened, which platform (web / desktop / iPad), and what you already tried…"
          className="min-h-[140px] resize-y"
          disabled={sending}
        />
      </div>

      <Button type="submit" className="w-full sm:w-auto gap-2" disabled={sending}>
        <Send className="w-4 h-4" />
        {sending ? "Sending…" : "Send message"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Messages are delivered to <span className="font-medium">jodie-mar@hotmail.com</span>.
      </p>
    </form>
  );
}
