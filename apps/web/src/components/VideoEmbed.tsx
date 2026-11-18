import { useState } from "react";
import { Play } from "lucide-react";
import { tx } from "../i18n";

/**
 * YouTube video that loads only when the viewer presses play.
 *
 * An embedded player downloads about 500 kB of Google JavaScript and sends the
 * visitor's IP to Google as soon as it renders, even with youtube-nocookie and
 * loading="lazy" (phones load lazy iframes well before they scroll into view).
 * Until the click, nothing is requested from YouTube: zero tracking, and the
 * resources page stays light.
 */
export function VideoEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <button type="button" className="video-facade" onClick={() => setPlaying(true)}>
      <span className="video-facade-play" aria-hidden="true">
        <Play />
      </span>
      <span className="video-facade-label">{tx("Play video")}</span>
      <span className="sr-only">{title}</span>
      <span className="video-facade-note">{tx("Loads YouTube")}</span>
    </button>
  );
}
