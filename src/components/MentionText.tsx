interface MentionTextProps {
  html: string | null | undefined;
  style?: React.CSSProperties;
}

function parseCaption(html: string): React.ReactNode[] {
  // Convert <br> variants to newline placeholder
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Extract @username from anchor tags before stripping
  text = text.replace(/<a[^>]*href=["'][^"']*\/profile\/([^"'/?]+)["'][^>]*>([^<]*)<\/a>/gi, '@$1');
  text = text.replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1');
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Split on @username tokens and newlines
  const parts = text.split(/(@\S+|\n)/g);
  const nodes: React.ReactNode[] = [];

  parts.forEach((part, i) => {
    if (part === '\n') {
      nodes.push(<br key={i} />);
    } else if (part.startsWith('@') && part.length > 1) {
      nodes.push(
        <span key={i} style={{ color: '#7c8fde', fontWeight: 500 }}>{part}</span>
      );
    } else if (part) {
      nodes.push(part);
    }
  });

  return nodes;
}

export default function MentionText({ html, style }: MentionTextProps) {
  if (!html) return null;
  return (
    <p style={{ fontSize: 13, color: '#c0c0c0', lineHeight: 1.5, margin: 0, ...style }}>
      {parseCaption(html)}
    </p>
  );
}
